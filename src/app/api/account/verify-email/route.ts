import { NextResponse } from "next/server";

import { consumeUserToken } from "~/lib/auth/user-tokens";
import { db } from "~/server/db";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const rawToken = requestUrl.searchParams.get("token");
  const destination = new URL("/login", requestUrl.origin);

  if (!rawToken) {
    destination.searchParams.set("verification", "invalid");
    return NextResponse.redirect(destination);
  }

  const token = await consumeUserToken(rawToken, "EMAIL_VERIFICATION");
  if (!token) {
    destination.searchParams.set("verification", "invalid");
    return NextResponse.redirect(destination);
  }

  await db.user.update({
    where: { id: token.userId },
    data: { emailVerified: new Date() },
  });
  destination.searchParams.set("verification", "success");
  return NextResponse.redirect(destination);
}
