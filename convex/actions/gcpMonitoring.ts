"use node";

/**
 * GCP Infrastructure Monitoring Action
 *
 * Calls GCP REST APIs (Cloud Run, Compute Engine, Cloud Monitoring)
 * using a service account key stored in env vars.
 * Runs in Node.js environment for google-auth-library.
 *
 * Monitors 3 Cloud Run services + 1 LiveKit VM in the administration-ga project.
 */
import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { GoogleAuth } from "google-auth-library";

// ─── Constants ───────────────────────────────────────────────
const PROJECT_ID = "administration-ga";
const REGION = "europe-west1";
const ZONE = "europe-west1-b";
const CLOUD_RUN_SERVICES = ["agent-web", "citizen-web", "backoffice-web"] as const;
const LIVEKIT_VM = "livekit-server";

// Cache TTL: 60 seconds
const CACHE_TTL_MS = 60_000;

// ─── Auth helper ─────────────────────────────────────────────

function getAuthClient() {
  const keyJson = process.env.GCP_MONITORING_SA_KEY;
  if (!keyJson) {
    throw new Error("GCP_MONITORING_SA_KEY environment variable is not set");
  }

  const credentials = JSON.parse(keyJson);
  return new GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
    ],
  });
}

async function fetchWithAuth(url: string): Promise<any> {
  const auth = getAuthClient();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GCP API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ─── Cloud Run Status ────────────────────────────────────────

async function fetchCloudRunStatusForService(serviceName: string) {
  const url = `https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/services/${serviceName}`;
  const data = await fetchWithAuth(url);

  const conditions = data.conditions || [];
  const terminalCondition = data.terminalCondition;

  const readyCondition = terminalCondition?.type === "Ready"
    ? terminalCondition
    : conditions.find((c: any) => c.type === "Ready");

  const isReady = readyCondition?.state === "CONDITION_SUCCEEDED"
    || readyCondition?.state === "True"
    || readyCondition?.status === "True"
    || (data.latestReadyRevision && !data.reconciling);

  return {
    name: serviceName,
    uri: data.uri || "",
    latestRevision: data.latestReadyRevision?.split("/").pop() || "unknown",
    isReady: !!isReady,
    conditions: conditions.map((c: any) => ({
      type: c.type,
      state: c.state,
      message: c.message || "",
    })),
    createTime: data.createTime,
    updateTime: data.updateTime,
    ingress: data.ingress || "",
    launchStage: data.launchStage || "",
  };
}

async function fetchAllCloudRunStatuses() {
  return Promise.all(
    CLOUD_RUN_SERVICES.map(async (s) => {
      try {
        return await fetchCloudRunStatusForService(s);
      } catch (err: any) {
        // Retourne un état dégradé si GCP refuse l'accès (403, 404, etc.)
        return {
          name: s,
          uri: "",
          latestRevision: "unknown",
          isReady: false,
          conditions: [],
          createTime: null,
          updateTime: null,
          ingress: "",
          launchStage: "",
          error: err?.message ?? String(err),
        };
      }
    }),
  );
}

// ─── Compute Engine VM Status ────────────────────────────────

async function fetchVmStatus() {
  const url = `https://compute.googleapis.com/compute/v1/projects/${PROJECT_ID}/zones/${ZONE}/instances/${LIVEKIT_VM}`;

  try {
    const data = await fetchWithAuth(url);

    const networkInterface = data.networkInterfaces?.[0];
    const externalIp =
      networkInterface?.accessConfigs?.[0]?.natIP || "No external IP";

    return {
      name: LIVEKIT_VM,
      status: data.status,
      machineType: data.machineType?.split("/").pop() || "unknown",
      zone: ZONE,
      externalIp,
      creationTimestamp: data.creationTimestamp,
      lastStartTimestamp: data.lastStartTimestamp || null,
      cpuPlatform: data.cpuPlatform || "",
      disks: (data.disks || []).map((d: any) => ({
        name: d.source?.split("/").pop() || "",
        sizeGb: d.diskSizeGb,
        type: d.type,
      })),
    };
  } catch (err: any) {
    // Graceful degradation — SA may lack compute.instances.get permission
    console.warn(`[GCP Monitoring] LiveKit VM fetch failed: ${err?.message ?? err}`);
    return {
      name: LIVEKIT_VM,
      status: "UNKNOWN",
      machineType: "unknown",
      zone: ZONE,
      externalIp: "",
      creationTimestamp: null,
      lastStartTimestamp: null,
      cpuPlatform: "",
      disks: [],
      error: err?.message ?? String(err),
    };
  }
}

// ─── Cloud Monitoring Metrics ────────────────────────────────

async function fetchTimeSeriesMetric(
  metricType: string,
  resourceType: string,
  extraFilter?: string,
  minutesAgo: number = 30,
  projectId: string = PROJECT_ID,
): Promise<any[]> {
  const endTime = new Date().toISOString();
  const startTime = new Date(
    Date.now() - minutesAgo * 60 * 1000,
  ).toISOString();

  let filter = `metric.type="${metricType}" AND resource.type="${resourceType}"`;
  if (extraFilter) {
    filter += ` AND ${extraFilter}`;
  }

  const params = new URLSearchParams({
    filter,
    "interval.startTime": startTime,
    "interval.endTime": endTime,
    "aggregation.alignmentPeriod": "300s",
    "aggregation.perSeriesAligner": "ALIGN_MEAN",
  });

  const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params}`;

  try {
    const data = await fetchWithAuth(url);
    return data.timeSeries || [];
  } catch {
    return [];
  }
}

function extractLatestValue(timeSeries: any[]): number | null {
  if (!timeSeries.length) return null;
  const points = timeSeries[0]?.points;
  if (!points?.length) return null;
  const val = points[0].value;
  return val.doubleValue ?? val.int64Value ?? val.distributionValue?.mean ?? null;
}

async function fetchCloudRunMetricsForService(serviceName: string) {
  const serviceFilter = `resource.labels.service_name="${serviceName}"`;

  const [requestCount, latencies, instanceCount, cpuUtilization, memoryUtilization] =
    await Promise.all([
      fetchTimeSeriesMetric("run.googleapis.com/request_count", "cloud_run_revision", serviceFilter),
      fetchTimeSeriesMetric("run.googleapis.com/request_latencies", "cloud_run_revision", serviceFilter),
      fetchTimeSeriesMetric("run.googleapis.com/container/instance_count", "cloud_run_revision", serviceFilter),
      fetchTimeSeriesMetric("run.googleapis.com/container/cpu/utilizations", "cloud_run_revision", serviceFilter),
      fetchTimeSeriesMetric("run.googleapis.com/container/memory/utilizations", "cloud_run_revision", serviceFilter),
    ]);

  return {
    requestCount: extractLatestValue(requestCount),
    latencyMs: extractLatestValue(latencies),
    instanceCount: extractLatestValue(instanceCount),
    cpuUtilization: extractLatestValue(cpuUtilization),
    memoryUtilization: extractLatestValue(memoryUtilization),
  };
}

async function fetchAllCloudRunMetrics() {
  const entries = await Promise.all(
    CLOUD_RUN_SERVICES.map(async (s) => [s, await fetchCloudRunMetricsForService(s)] as const),
  );
  return Object.fromEntries(entries) as Record<string, Awaited<ReturnType<typeof fetchCloudRunMetricsForService>>>;
}

async function fetchLivekitVmMetrics() {
  const instanceFilter = `resource.labels.instance_id != ""`;

  const [cpu, networkIn, networkOut, diskRead, uptime] = await Promise.all([
    fetchTimeSeriesMetric("compute.googleapis.com/instance/cpu/utilization", "gce_instance", instanceFilter, 30, PROJECT_ID),
    fetchTimeSeriesMetric("compute.googleapis.com/instance/network/received_bytes_count", "gce_instance", instanceFilter, 30, PROJECT_ID),
    fetchTimeSeriesMetric("compute.googleapis.com/instance/network/sent_bytes_count", "gce_instance", instanceFilter, 30, PROJECT_ID),
    fetchTimeSeriesMetric("compute.googleapis.com/instance/disk/read_bytes_count", "gce_instance", instanceFilter, 30, PROJECT_ID),
    fetchTimeSeriesMetric("compute.googleapis.com/instance/uptime", "gce_instance", instanceFilter, 30, PROJECT_ID),
  ]);

  return {
    cpuUtilization: extractLatestValue(cpu),
    networkInBytes: extractLatestValue(networkIn),
    networkOutBytes: extractLatestValue(networkOut),
    diskReadBytes: extractLatestValue(diskRead),
    uptimeSeconds: extractLatestValue(uptime),
  };
}

// ─── Public Action ───────────────────────────────────────────

/**
 * Fetch all GCP infrastructure health data.
 * Called from frontend, results are cached in Convex DB.
 */
export const fetchInfrastructureHealth = action({
  args: {},
  handler: async (ctx): Promise<Record<string, any>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }

    // Check cache freshness
    const cache: any = await ctx.runQuery(
      internal.functions.gcpMonitoring.getCachedData,
      { key: "infrastructure_health" },
    );

    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.data;
    }

    // Fetch all data in parallel — erreurs GCP gérées individuellement
    const [cloudRunStatuses, vmStatus, cloudRunMetricsMap, vmMetrics] =
      await Promise.all([
        fetchAllCloudRunStatuses(),
        fetchVmStatus(),
        fetchAllCloudRunMetrics(),
        fetchLivekitVmMetrics(),
      ]);

    // Merge status + metrics per service
    const cloudRunServices = cloudRunStatuses.map((status) => ({
      ...status,
      metrics: cloudRunMetricsMap[status.name] ?? {
        requestCount: null,
        latencyMs: null,
        instanceCount: null,
        cpuUtilization: null,
        memoryUtilization: null,
      },
    }));

    const result = {
      cloudRunServices,
      livekitVm: {
        ...vmStatus,
        metrics: vmMetrics,
      },
      fetchedAt: Date.now(),
    };

    // Update cache
    await ctx.runMutation(
      internal.functions.gcpMonitoring.updateCache,
      {
        key: "infrastructure_health",
        data: result,
      },
    );

    return result;
  },
});

// ─── Logs Action ─────────────────────────────────────────────

// Build Cloud Run service filter for all or a specific service
function buildCloudRunFilter(serviceName?: string): string {
  if (serviceName) {
    return `resource.type="cloud_run_revision" AND resource.labels.service_name="${serviceName}"`;
  }
  // All Cloud Run services
  const serviceConditions = CLOUD_RUN_SERVICES
    .map((s) => `resource.labels.service_name="${s}"`)
    .join(" OR ");
  return `resource.type="cloud_run_revision" AND (${serviceConditions})`;
}

/**
 * Fetch recent logs from Cloud Logging API.
 * Supports filtering by individual Cloud Run service, all Cloud Run, LiveKit VM, or all.
 */
export const fetchLogs = action({
  args: {
    service: v.union(
      v.literal("cloud_run"),
      v.literal("agent-web"),
      v.literal("citizen-web"),
      v.literal("backoffice-web"),
      v.literal("livekit_vm"),
      v.literal("all"),
    ),
    severity: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, { service, severity, pageSize }): Promise<Record<string, any>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }

    const limit = pageSize ?? 50;

    // Build resource filter based on service
    let resourceFilter = "";
    if (service === "cloud_run") {
      resourceFilter = buildCloudRunFilter();
    } else if (service === "agent-web" || service === "citizen-web" || service === "backoffice-web") {
      resourceFilter = buildCloudRunFilter(service);
    } else if (service === "livekit_vm") {
      resourceFilter = `resource.type="gce_instance"`;
    } else {
      // All: Cloud Run + Compute Engine
      resourceFilter = `(${buildCloudRunFilter()}) OR resource.type="gce_instance"`;
    }

    // Add severity filter
    let filter = resourceFilter;
    if (severity) {
      filter = `(${resourceFilter}) AND severity>=${severity}`;
    }

    const url = "https://logging.googleapis.com/v2/entries:list";
    const auth = getAuthClient();
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    const body = {
      resourceNames: [`projects/${PROJECT_ID}`],
      filter,
      orderBy: "timestamp desc",
      pageSize: limit,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Dégradation gracieuse — le SA n'a peut-être pas roles/logging.viewer
      console.warn(`[GCP Monitoring] Cloud Logging API error (${response.status}): ${errorText}`);
      return {
        entries: [],
        totalCount: 0,
        error: `Cloud Logging API error (${response.status}): Permission denied. Le service account a besoin du rôle "Logs Viewer" (roles/logging.viewer).`,
      };
    }

    const data = await response.json();
    const entries = (data.entries || []).map((entry: any) => ({
      timestamp: entry.timestamp,
      severity: entry.severity || "DEFAULT",
      resource: entry.resource?.type === "cloud_run_revision"
        ? (entry.resource?.labels?.service_name || "Cloud Run")
        : "LiveKit VM",
      logName: entry.logName?.split("/").pop() || "",
      message:
        entry.textPayload ||
        entry.jsonPayload?.message ||
        entry.jsonPayload?.msg ||
        (entry.jsonPayload ? JSON.stringify(entry.jsonPayload).slice(0, 300) : "") ||
        entry.protoPayload?.status?.message ||
        "(no message)",
      httpRequest: entry.httpRequest
        ? {
            method: entry.httpRequest.requestMethod,
            url: entry.httpRequest.requestUrl,
            status: entry.httpRequest.status,
            latency: entry.httpRequest.latency,
          }
        : null,
      insertId: entry.insertId,
    }));

    return { entries, totalCount: entries.length };
  },
});
