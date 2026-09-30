import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { hashOpaqueToken } from "../src/lib/auth/tokens";

// Deliberately do not load .env files: fixtures require an explicit disposable DB.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Define DATABASE_URL para la base E2E.");
const url = new URL(databaseUrl);
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
  !/^\/mdceramica_e2e(?:_[a-z0-9_]+)?$/.test(url.pathname) ||
  url.search ||
  url.hash
) {
  throw new Error(
    "Las fixtures sólo se permiten en una base local mdceramica_e2e o mdceramica_e2e_* sin parámetros adicionales.",
  );
}

const accounts = await Promise.all(
  (["ADMIN", "STUDENT", "OWNER"] as const).map(async (role) => {
    const email = process.env[`E2E_${role}_EMAIL`];
    const password = process.env[`E2E_${role}_PASSWORD`];
    if (!email || !password || password.length < 12) {
      throw new Error(
        `Define E2E_${role}_EMAIL y E2E_${role}_PASSWORD (mínimo 12 caracteres).`,
      );
    }
    return {
      role,
      email: email.trim().toLowerCase(),
      passwordHash: await hashPassword(password),
    };
  }),
);
const studentId = Number(process.env.E2E_ADMIN_STUDENT_ID);
if (!Number.isSafeInteger(studentId) || studentId <= 0) {
  throw new Error("Define E2E_ADMIN_STUDENT_ID con un entero positivo.");
}
const invitedEmail = process.env.E2E_INVITED_EMAIL?.trim().toLowerCase();
const invitedPassword = process.env.E2E_INVITED_PASSWORD;
const invitationToken = process.env.E2E_INVITATION_TOKEN;
if (
  !invitedEmail ||
  !invitedPassword ||
  invitedPassword.length < 12 ||
  !invitationToken ||
  invitationToken.length < 32
) {
  throw new Error(
    "Define E2E_INVITED_EMAIL, E2E_INVITED_PASSWORD y E2E_INVITATION_TOKEN para probar invitaciones.",
  );
}
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
try {
  await db.$transaction(
    async (tx) => {
      if ((await tx.user.count()) || (await tx.student.count())) {
        throw new Error(
          "La base E2E ya contiene usuarios o alumnos; usa una base descartable nueva.",
        );
      }
      const studio = await tx.studio.create({
        data: {
          name: "Taller de prueba E2E",
          slug: "taller-e2e",
          shifts: {
            create: [
              { startTime: "10:00", label: "Mañana" },
              { startTime: "18:00", label: "Inactivo", isActive: false },
            ],
          },
        },
        include: { shifts: true },
      });
      let ownerId: string | undefined;
      for (const account of accounts) {
        const user = await tx.user.create({
          data: {
            email: account.email,
            name: `Cuenta ${account.role} E2E`,
            emailVerified: new Date(),
            activeStudioId: studio.id,
            isPlatformAdmin: account.role === "OWNER",
            passwordCredential: {
              create: { passwordHash: account.passwordHash },
            },
            memberships: {
              create: { studioId: studio.id, role: account.role },
            },
          },
        });
        if (account.role === "OWNER") ownerId = user.id;
        if (account.role === "STUDENT") {
          await tx.student.create({
            data: {
              id: studentId,
              studioId: studio.id,
              userId: user.id,
              name: "Alumna de prueba E2E",
              birthday: new Date("2000-05-12T00:00:00Z"),
              telephone: "3510000000",
              weekday: "MONDAY",
              shiftId: studio.shifts.find((shift) => shift.isActive)?.id,
              months: {
                create: {
                  year: 2026,
                  month: 9,
                  classes: {
                    create: {
                      className: "Clase de prueba E2E",
                      classDay: new Date("2026-09-07T00:00:00Z"),
                      assistance: true,
                      classPrice: "10000",
                      classPaymentStatus: "PAID",
                      charges: {
                        create: [
                          {
                            type: "OVEN",
                            description: "Pieza E2E",
                            price: "1500",
                            paymentStatus: "PENDING",
                          },
                          {
                            type: "MATERIAL",
                            description: "Arcilla E2E",
                            price: "2500",
                            paymentStatus: "PAID",
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          });
          await tx.student.create({
            data: {
              id: studentId + 1,
              studioId: studio.id,
              name: "Otra alumna aislada E2E",
              weekday: "TUESDAY",
              shiftId: studio.shifts.find((shift) => shift.isActive)?.id,
            },
          });
        }
      }
      if (!ownerId) throw new Error("No se pudo crear el OWNER E2E.");
      await tx.invitation.create({
        data: {
          email: invitedEmail,
          tokenHash: hashOpaqueToken(invitationToken),
          role: "STUDENT",
          studioId: studio.id,
          studentId: studentId + 1,
          invitedById: ownerId,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await tx.$executeRaw`SELECT setval(pg_get_serial_sequence('"Student"', 'id'), (SELECT MAX(id) FROM "Student"), true)`;
    },
    { timeout: 30_000 },
  );
  console.info(
    "Fixtures E2E creadas: OWNER, ADMIN, STUDENT, invitación, dos fichas aisladas, taller, turnos, clase y cargos.",
  );
} finally {
  await db.$disconnect();
}
