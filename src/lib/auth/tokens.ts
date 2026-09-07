import { createHash, randomBytes } from "node:crypto";

export const normalizeEmail = (email: string) =>
  email.normalize("NFKC").trim().toLowerCase();

export const generateOpaqueToken = () => randomBytes(32).toString("base64url");

export const hashOpaqueToken = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex");
