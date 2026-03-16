import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/whoop";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const errorDesc = req.nextUrl.searchParams.get("error_description");
  const errorHint = req.nextUrl.searchParams.get("error_hint");

  if (!code) {
    return NextResponse.json({ error: error || "No code provided", description: errorDesc, hint: errorHint }, { status: 400 });
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/whoop-callback`;
    await exchangeCode(code, redirectUri);
    return NextResponse.redirect(new URL("/#settings", req.nextUrl.origin));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
