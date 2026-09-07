import { PrismaAdapter } from "@auth/prisma-adapter";
import { type MembershipRole } from "@prisma/client";
import { randomBytes } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";

import { acceptPendingInvitationByEmail } from "~/lib/auth/invitations";
import { hashPassword, verifyPassword } from "~/lib/auth/password";
import {
  clearAuthRateLimit,
  consumeAuthRateLimit,
  requestIp,
} from "~/lib/auth/rate-limit";
import { normalizeEmail } from "~/lib/auth/tokens";
import { db } from "~/server/db";

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const dummyPasswordHash = hashPassword(randomBytes(24).toString("base64url"));

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: false,
            authorization: { params: { prompt: "select_account" } },
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const email = normalizeEmail(parsed.data.email);
        const ip = requestIp(request);
        const limit = await consumeAuthRateLimit({
          scope: "login",
          identifiers: [ip, email],
          maxAttempts: 5,
          windowMs: 15 * 60 * 1000,
          blockMs: 15 * 60 * 1000,
        });
        if (!limit.allowed) return null;

        const user = await db.user.findUnique({
          where: { email },
          include: {
            passwordCredential: true,
            memberships: { take: 1 },
          },
        });
        const hash = user?.passwordCredential?.passwordHash
          ? Promise.resolve(user.passwordCredential.passwordHash)
          : dummyPasswordHash;
        const passwordMatches = await verifyPassword(
          parsed.data.password,
          await hash,
        );

        if (
          !user ||
          !passwordMatches ||
          !user.emailVerified ||
          user.memberships.length === 0
        ) {
          return null;
        }

        await clearAuthRateLimit("login", [ip, email]);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") return true;
      if (account?.provider !== "google" || profile?.email_verified !== true) {
        return false;
      }

      const email = user.email ? normalizeEmail(user.email) : null;
      if (!email) return false;

      const [existingUser, invitation] = await Promise.all([
        db.user.findUnique({
          where: { email },
          select: { memberships: { select: { id: true }, take: 1 } },
        }),
        db.invitation.findFirst({
          where: {
            email,
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        }),
      ]);

      return (
        Boolean(existingUser?.memberships.length ?? 0) || invitation !== null
      );
    },
    async jwt({ token, user, trigger, account }) {
      if ((trigger === "signIn" || trigger === "signUp") && user.id) {
        const membership = await db.membership.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
        });
        if (!membership) return null;

        const sessionToken = randomBytes(32).toString("base64url");
        await db.session.create({
          data: {
            sessionToken,
            userId: user.id,
            expires: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
          },
        });

        token.sub = user.id;
        token.sessionId = sessionToken;
        token.role = membership.role;
        token.studioId = membership.studioId;
        token.provider = account?.provider;
        return token;
      }

      if (!token.sub || typeof token.sessionId !== "string") return null;

      const session = await db.session.findUnique({
        where: { sessionToken: token.sessionId },
        include: {
          user: { include: { memberships: { take: 1 } } },
        },
      });

      if (
        !session ||
        session.expires <= new Date() ||
        session.user.memberships.length === 0
      ) {
        if (session) {
          await db.session.delete({ where: { id: session.id } });
        }
        return null;
      }

      const membership = session.user.memberships[0]!;
      token.role = membership.role;
      token.studioId = membership.studioId;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as MembershipRole | undefined;
        session.user.studioId =
          typeof token.studioId === "number" ? token.studioId : undefined;
      }
      session.sessionId =
        typeof token.sessionId === "string" ? token.sessionId : undefined;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      try {
        await acceptPendingInvitationByEmail(user.id, user.email);
        await db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      } catch (error) {
        await db.user.deleteMany({ where: { id: user.id } });
        throw error;
      }
    },
    async signOut(message) {
      if ("token" in message && typeof message.token?.sessionId === "string") {
        await db.session.deleteMany({
          where: { sessionToken: message.token.sessionId },
        });
      }
    },
  },
});
