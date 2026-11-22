import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { LIVE_COOKIE } from "@/lib/live-session";

// Next.js 16's request-gating file (formerly middleware). Pages only; API
// routes authenticate themselves and answer 401.
//
// Anyone without a live session sees the decoy page at whatever URL they
// asked for: the request is rewritten to "/", whose layout renders the gate.
export default auth((req) => {
  const live = req.cookies.get(LIVE_COOKIE)?.value === "1";
  if ((!req.auth || !live) && req.nextUrl.pathname !== "/") {
    return NextResponse.rewrite(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api/|manifest.webmanifest|sw.js|icons/|_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png).*)",
  ],
};
