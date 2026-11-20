import { auth } from "@/lib/auth";

// Next.js 16's request-gating file (formerly middleware). Pages only; API
// routes authenticate themselves and answer 401 instead of redirecting.
export default auth((req) => {
  if (!req.auth) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api/|login|manifest.webmanifest|sw.js|icons/|_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png).*)",
  ],
};
