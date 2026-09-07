import { type AuthTokenType } from "@prisma/client";

import { db } from "~/server/db";
import { generateOpaqueToken, hashOpaqueToken } from "./tokens";

export async function createUserToken(
  userId: string,
  type: AuthTokenType,
  expiresInMs: number,
) {
  const token = generateOpaqueToken();

  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, type, consumedAt: null } }),
    db.authToken.create({
      data: {
        userId,
        type,
        tokenHash: hashOpaqueToken(token),
        expiresAt: new Date(Date.now() + expiresInMs),
      },
    }),
  ]);

  return token;
}

export async function consumeUserToken(rawToken: string, type: AuthTokenType) {
  return db.$transaction(async (tx) => {
    const token = await tx.authToken.findUnique({
      where: { tokenHash: hashOpaqueToken(rawToken) },
    });

    if (!token) return null;

    if (
      token.type !== type ||
      token.consumedAt ||
      token.expiresAt <= new Date()
    ) {
      return null;
    }

    const consumed = await tx.authToken.updateMany({
      where: { id: token.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    return consumed.count === 1 ? token : null;
  });
}
