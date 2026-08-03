import { auth } from "@/lib/auth";

// Next.js 16 renamed the `middleware` file convention to `proxy`; this is
// still the request-gating file, just relocated/renamed.
export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico|$).*)"],
};
