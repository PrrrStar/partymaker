import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  adminUnauthorizedResponse,
  isAdminAuthorized,
} from "@/server/admin-auth";

export function proxy(request: NextRequest) {
  return isAdminAuthorized(request)
    ? NextResponse.next()
    : adminUnauthorizedResponse();
}

export const config = {
  matcher: "/admin/:path*",
};
