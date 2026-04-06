module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/apps/users-web/src/app/api/auth/[...path]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "GET",
    ()=>GET,
    "PATCH",
    ()=>PATCH,
    "POST",
    ()=>POST,
    "PUT",
    ()=>PUT
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/server.js [app-route] (ecmascript)");
;
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL;
if (!CONVEX_SITE_URL) {
    console.error("missing envar CONVEX_SITE_URL");
}
const HOP_BY_HOP = new Set([
    "transfer-encoding",
    "connection",
    "keep-alive",
    "upgrade"
]);
async function proxyToConvex(req) {
    if (!CONVEX_SITE_URL) {
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "CONVEX_SITE_URL not configured"
        }, {
            status: 500
        });
    }
    const url = new URL(req.url);
    const targetUrl = `${CONVEX_SITE_URL}${url.pathname}${url.search}`;
    const proxyHeaders = {};
    req.headers.forEach((value, key)=>{
        if (!HOP_BY_HOP.has(key)) {
            proxyHeaders[key] = value;
        }
    });
    proxyHeaders["accept-encoding"] = "application/json";
    proxyHeaders["host"] = new URL(CONVEX_SITE_URL).host;
    try {
        const body = req.method !== "GET" && req.method !== "HEAD" ? await req.arrayBuffer() : undefined;
        const upstream = await fetch(targetUrl, {
            method: req.method,
            headers: proxyHeaders,
            redirect: "manual",
            body,
            // @ts-expect-error duplex required for streaming body
            duplex: "half"
        });
        const responseBody = await upstream.arrayBuffer();
        const headers = new Headers();
        // Forward response headers (skip hop-by-hop)
        upstream.headers.forEach((value, key)=>{
            const lk = key.toLowerCase();
            if (lk === "set-cookie" || HOP_BY_HOP.has(lk)) return;
            headers.set(key, value);
        });
        // Rewrite cookies for dev: strip __Secure- prefix and Secure flag
        const setCookies = upstream.headers.getSetCookie?.();
        if (setCookies && setCookies.length > 0) {
            const rewritten = setCookies.map((cookie)=>cookie.replaceAll("__Secure-", "").replace(/;\s*Secure/gi, ""));
            for (const cookie of rewritten){
                headers.append("set-cookie", cookie);
            }
        }
        return new __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](responseBody, {
            status: upstream.status,
            headers
        });
    } catch (error) {
        console.error("[auth] proxy error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal auth error"
        }, {
            status: 502
        });
    }
}
async function GET(req) {
    return proxyToConvex(req);
}
async function POST(req) {
    return proxyToConvex(req);
}
async function PUT(req) {
    return proxyToConvex(req);
}
async function PATCH(req) {
    return proxyToConvex(req);
}
async function DELETE(req) {
    return proxyToConvex(req);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__03awdk4._.js.map