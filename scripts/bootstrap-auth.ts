import { hashPassword } from "../src/lib/auth/password";
import { normalizeEmail } from "../src/lib/auth/tokens";
import { db } from "../src/server/db";

const email = process.env.OWNER_EMAIL;
const password = process.env.OWNER_PASSWORD;
const name = process.env.OWNER_NAME ?? "Administración MD Cerámica";

if (!email || !password || password.length < 12) {
  throw new Error(
    "Define OWNER_EMAIL y OWNER_PASSWORD (mínimo 12 caracteres) para crear la cuenta inicial.",
  );
}

const existingOwner = await db.membership.findFirst({
  where: { role: "OWNER" },
});
if (existingOwner) {
  throw new Error("Ya existe una cuenta OWNER; no se modificó la base.");
}

const studio = await db.studio.findUnique({ where: { slug: "md-ceramica" } });
if (!studio) {
  throw new Error(
    "No existe el taller inicial. Aplica primero las migraciones.",
  );
}

const passwordHash = await hashPassword(password);
await db.user.create({
  data: {
    email: normalizeEmail(email),
    emailVerified: new Date(),
    name,
    passwordCredential: { create: { passwordHash } },
    memberships: {
      create: { studioId: studio.id, role: "OWNER" },
    },
  },
});

console.info(`Cuenta OWNER creada para ${normalizeEmail(email)}.`);
await db.$disconnect();
