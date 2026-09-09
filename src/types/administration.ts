import { z } from "zod";

const numericId = z.coerce.number().int().positive();

export const timeInput = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm");

export const studioCreateInput = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  telephone: z.string().max(50).optional(),
});

export const studioUpdateInput = studioCreateInput.extend({
  id: numericId,
  slug: z.string().trim().min(2).max(100),
  isActive: z.boolean(),
});

export const shiftCreateInput = z.object({
  startTime: timeInput,
  label: z.string().max(80).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

export const shiftUpdateInput = shiftCreateInput.extend({
  id: numericId,
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
});

export const membershipInput = z.object({
  userId: z.string().min(1),
  studioId: numericId,
  role: z.enum(["OWNER", "ADMIN", "STUDENT"]),
  studentId: numericId.nullable().optional(),
});

export const userProfileInput = z.object({
  userId: z.string().min(1),
  name: z.string().max(120),
  isPlatformAdmin: z.boolean(),
});
