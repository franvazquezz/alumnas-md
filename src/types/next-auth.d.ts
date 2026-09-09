import { type DefaultSession } from "next-auth";
import { type MembershipRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    sessionId?: string;
    user: {
      id: string;
      role?: MembershipRole;
      studioId?: number;
      isPlatformAdmin?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionId?: string;
    role?: MembershipRole;
    studioId?: number;
    isPlatformAdmin?: boolean;
    provider?: string;
  }
}
