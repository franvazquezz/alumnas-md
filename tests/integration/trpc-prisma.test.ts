import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("~/auth", () => ({ auth: vi.fn() }));

import { createCaller } from "~/server/api/root";
import { type createTRPCContext } from "~/server/api/trpc";
import { db } from "~/server/db";

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} para la prueba de integración.`);
  return value;
};

const assertDisposableDatabase = () => {
  const url = new URL(required("DATABASE_URL"));
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^\/mdceramica_e2e(?:_[a-z0-9_]+)?$/.test(url.pathname) ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Las pruebas de integración sólo pueden usar una base local mdceramica_e2e o mdceramica_e2e_* sin parámetros.",
    );
  }
};

async function callerFor(email: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { email },
    include: { memberships: { orderBy: { createdAt: "asc" } } },
  });
  const membership = user.memberships.find(
    (candidate) => candidate.studioId === user.activeStudioId,
  );

  const context: Context = {
    db,
    headers: new Headers({ "x-test-source": "integration" }),
    requestId: `integration-${user.id}`,
    session: {
      expires: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        isPlatformAdmin: user.isPlatformAdmin,
        role: membership?.role,
        studioId: membership?.studioId,
      },
    },
  };

  return { caller: createCaller(context), user, membership };
}

beforeAll(assertDisposableDatabase);
afterAll(() => db.$disconnect());

describe("tRPC + Prisma authorization", () => {
  it("scopes the ADMIN list to the active studio", async () => {
    const { caller, membership } = await callerFor(required("E2E_ADMIN_EMAIL"));
    const students = await caller.students.list();

    expect(students).toHaveLength(2);
    expect(
      await db.student.count({
        where: { studioId: membership?.studioId },
      }),
    ).toBe(students.length);
  });

  it("lets STUDENT read its linked record and hides another one", async () => {
    const { caller, user, membership } = await callerFor(
      required("E2E_STUDENT_EMAIL"),
    );
    const own = await db.student.findFirstOrThrow({
      where: { studioId: membership?.studioId, userId: user.id },
    });
    const other = await db.student.findFirstOrThrow({
      where: { studioId: membership?.studioId, userId: null },
    });

    await expect(caller.students.byId({ id: own.id })).resolves.toMatchObject({
      id: own.id,
      name: own.name,
    });
    await expect(caller.students.byId({ id: other.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects student mutations before touching Prisma", async () => {
    const { caller } = await callerFor(required("E2E_STUDENT_EMAIL"));
    await expect(
      caller.students.create({ name: "No autorizada" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.student.count({ where: { name: "No autorizada" } })).toBe(
      0,
    );
  });
});
