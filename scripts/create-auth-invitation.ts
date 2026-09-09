import { sendAuthEmail } from "../src/lib/auth/email";
import { createInvitation } from "../src/lib/auth/invitations";
import { normalizeEmail } from "../src/lib/auth/tokens";
import { db } from "../src/server/db";

const email = process.env.INVITE_EMAIL;
const role = process.env.INVITE_ROLE ?? "STUDENT";
const studentId = process.env.INVITE_STUDENT_ID
  ? Number(process.env.INVITE_STUDENT_ID)
  : undefined;
const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

if (!email || !["OWNER", "ADMIN", "STUDENT"].includes(role)) {
  throw new Error(
    "Define INVITE_EMAIL e INVITE_ROLE (OWNER, ADMIN o STUDENT).",
  );
}
if (studentId !== undefined && !Number.isInteger(studentId)) {
  throw new Error("INVITE_STUDENT_ID debe ser un entero.");
}
if (role === "STUDENT" && studentId === undefined) {
  throw new Error("Las invitaciones STUDENT requieren INVITE_STUDENT_ID.");
}

const studioSlug = process.env.STUDIO_SLUG ?? "md-ceramica";
const studio = await db.studio.findUnique({ where: { slug: studioSlug } });
if (!studio) throw new Error("Aplica primero las migraciones.");

if (studentId !== undefined) {
  const student = await db.student.findFirst({
    where: { id: studentId, studioId: studio.id, userId: null },
  });
  if (!student)
    throw new Error("La ficha no existe o ya tiene una cuenta vinculada.");
}

const owner = await db.membership.findFirst({
  where: { studioId: studio.id, role: "OWNER" },
  select: { userId: true },
});
const { token } = await createInvitation({
  email,
  studioId: studio.id,
  role: role as "OWNER" | "ADMIN" | "STUDENT",
  studentId,
  invitedById: owner?.userId,
});
const inviteUrl = new URL(`/invite/${token}`, baseUrl).toString();

await sendAuthEmail({
  to: normalizeEmail(email),
  subject: `Invitación a ${studio.name}`,
  heading: `Te invitaron a ${studio.name}`,
  message: "Crea tu cuenta desde este enlace. La invitación vence en 48 horas.",
  actionLabel: "Crear cuenta",
  actionUrl: inviteUrl,
});

console.info(`Invitación creada para ${normalizeEmail(email)}.`);
await db.$disconnect();
