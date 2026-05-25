/**
 * Proxy Better Auth vers Convex pour TRAVAIL.GA.
 *
 * Forward toutes les requetes /api/auth/* vers CONVEX_SITE_URL et
 * reecrit les cookies Set-Cookie pour le contexte dev (strip __Secure-,
 * retire flag Secure). Pattern identique au proxy de pnpe.
 */
import { NextRequest, NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL;

if (!CONVEX_SITE_URL) {
  console.error("missing envar CONVEX_SITE_URL");
}

const HOP_BY_HOP = new Set([
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
]);

async function proxyToConvex(req: NextRequest): Promise<NextResponse> {
  if (!CONVEX_SITE_URL) {
    return NextResponse.json(
      { error: "CONVEX_SITE_URL not configured" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const targetUrl = `${CONVEX_SITE_URL}${url.pathname}${url.search}`;

  const proxyHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key)) {
      proxyHeaders[key] = value;
    }
  });
  proxyHeaders["accept-encoding"] = "application/json";
  proxyHeaders["host"] = new URL(CONVEX_SITE_URL).host;

  try {
    const body =
      req.method !== "GET" && req.method !== "HEAD"
        ? await req.arrayBuffer()
        : undefined;

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: proxyHeaders,
      redirect: "manual",
      body,
      // @ts-expect-error duplex required for streaming body
      duplex: "half",
    });

    const responseBody = await upstream.arrayBuffer();
    const headers = new Headers();

    upstream.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (lk === "set-cookie" || HOP_BY_HOP.has(lk)) return;
      headers.set(key, value);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setCookies = (upstream.headers as any).getSetCookie?.() as
      | string[]
      | undefined;
    if (setCookies && setCookies.length > 0) {
      const rewritten = setCookies.map((cookie: string) =>
        cookie.replaceAll("__Secure-", "").replace(/;\s*Secure/gi, ""),
      );
      for (const cookie of rewritten) {
        headers.append("set-cookie", cookie);
      }
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error("[auth] proxy error:", error);
    return NextResponse.json({ error: "Internal auth error" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  return proxyToConvex(req);
}
export async function POST(req: NextRequest) {
  return proxyToConvex(req);
}
export async function PUT(req: NextRequest) {
  return proxyToConvex(req);
}
export async function PATCH(req: NextRequest) {
  return proxyToConvex(req);
}
export async function DELETE(req: NextRequest) {
  return proxyToConvex(req);
}
