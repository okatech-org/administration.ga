import { NextRequest, NextResponse } from "next/server"

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL

export async function POST(req: NextRequest) {
  if (!CONVEX_SITE_URL) {
    return NextResponse.json(
      { error: "CONVEX_SITE_URL not configured" },
      { status: 500 }
    )
  }

  try {
    const body = await req.text()

    const devRes = await fetch(`${CONVEX_SITE_URL}/dev/sign-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: req.headers.get("origin") || "https://localhost:3003",
      },
      body,
    })

    const responseBody = await devRes.text()
    return new NextResponse(responseBody, {
      status: devRes.status,
      headers: { "content-type": "application/json" },
    })
  } catch (error) {
    console.error("[dev/sign-in] proxy error:", error)
    return NextResponse.json({ error: "Proxy error" }, { status: 500 })
  }
}
