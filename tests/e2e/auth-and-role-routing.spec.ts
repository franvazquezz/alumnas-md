import { expect, type Page, test } from "@playwright/test";

type Credentials = {
  email?: string;
  password?: string;
};

const admin: Credentials = {
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
};
const student: Credentials = {
  email: process.env.E2E_STUDENT_EMAIL,
  password: process.env.E2E_STUDENT_PASSWORD,
};
const owner: Credentials = {
  email: process.env.E2E_OWNER_EMAIL,
  password: process.env.E2E_OWNER_PASSWORD,
};
const adminStudentId = process.env.E2E_ADMIN_STUDENT_ID;

const hasCredentials = (
  credentials: Credentials,
): credentials is Required<Credentials> =>
  Boolean(credentials.email && credentials.password);

if (
  process.env.CI &&
  (!hasCredentials(admin) ||
    !hasCredentials(student) ||
    !hasCredentials(owner) ||
    !adminStudentId)
) {
  throw new Error(
    "CI requiere las cuentas ADMIN, STUDENT y OWNER y E2E_ADMIN_STUDENT_ID; no se permite omitir cobertura de roles.",
  );
}

async function login(page: Page, credentials: Required<Credentials>) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(credentials.email);
  await page.getByLabel("Contraseña").fill(credentials.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });
}

const trpcInput = (input: unknown) =>
  encodeURIComponent(JSON.stringify({ json: input }));

test("expone salud de aplicación y correlación sin autenticación", async ({
  request,
}) => {
  const response = await request.get("/api/health", {
    headers: { "x-request-id": "e2e-health-check" },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["x-request-id"]).toBe("e2e-health-check");
  await expect(response.json()).resolves.toEqual({ status: "ok" });
});

test.describe("rutas privadas sin sesión", () => {
  for (const route of ["/", "/admin", "/students/1"]) {
    test(`${route} redirige al acceso`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login(?:\?|$)/);
      await expect(
        page.getByRole("heading", { name: "Iniciar sesión" }),
      ).toBeVisible();
    });
  }
});

test.describe("experiencia ADMIN", () => {
  test.skip(
    !hasCredentials(admin),
    "Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD.",
  );

  test("abre sus paneles y no entra al portal STUDENT", async ({ page }) => {
    if (!hasCredentials(admin)) return;
    await login(page, admin);

    await expect(
      page.getByRole("heading", { name: "Panel de alumnos y clases" }),
    ).toBeVisible();
    await page.getByLabel("Buscar alumno").fill("sin-coincidencias-e2e");
    await expect(
      page.getByText("Sin coincidencias", { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByLabel("Buscar alumno").fill("");

    await page.getByRole("button", { name: "Mostrar formulario" }).click();
    await expect(page.getByLabel("Nombre completo")).toBeVisible();
    await expect(page.getByLabel("Día preferido")).toBeVisible();
    await expect(page.getByLabel("Horario")).toBeVisible();

    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Administración" }),
    ).toBeVisible();

    await page.goto("/mis-clases");
    await expect(page).toHaveURL("/");
  });

  test("muestra un error recuperable si falla el listado", async ({ page }) => {
    if (!hasCredentials(admin)) return;
    await login(page, admin);
    await page.route("**/api/trpc/**students.list**", (route) => route.abort());

    await page.reload();
    await expect(
      page.getByRole("alert").filter({
        hasText: "No pudimos cargar los alumnos",
      }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: "Reintentar" }),
    ).toBeVisible();
  });

  test("abre una ficha completa de estudiante", async ({ page }) => {
    test.skip(
      !adminStudentId,
      "Define E2E_ADMIN_STUDENT_ID con una ficha accesible para ADMIN.",
    );
    if (!hasCredentials(admin) || !adminStudentId) return;
    await login(page, admin);

    await page.goto(`/students/${adminStudentId}`);
    await expect(page.getByText("Detalles", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Clases del alumno" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Detalle de cada clase y sus cargos" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Editar alumno", exact: true })
      .click();
    const originalName = await page.getByLabel("Nombre completo").inputValue();
    await expect(page.getByLabel("Cumpleaños")).toBeVisible();
    await expect(page.getByLabel("Teléfono")).toBeVisible();
    await expect(page.getByLabel("Día preferido")).toBeVisible();
    await expect(page.getByLabel("Horario", { exact: true })).toBeVisible();
    await page.getByLabel("Nombre completo").fill("Borrador sin guardar");
    await page.getByRole("button", { name: "Ocultar edición" }).click();
    await page
      .getByRole("button", { name: "Editar alumno", exact: true })
      .click();
    await expect(page.getByLabel("Nombre completo")).toHaveValue(originalName);
    await page.screenshot({
      path: test.info().outputPath("student-edit.png"),
      fullPage: true,
    });
  });
});

test.describe("experiencia STUDENT", () => {
  test.skip(
    !hasCredentials(student),
    "Define E2E_STUDENT_EMAIL y E2E_STUDENT_PASSWORD.",
  );

  test("navega su portal y queda fuera de administración", async ({ page }) => {
    if (!hasCredentials(student)) return;
    await login(page, student);

    await expect(page).toHaveURL(/\/mi-cuenta$/);
    await expect(
      page.getByRole("heading", { name: "Mi cuenta" }),
    ).toBeVisible();

    await page.goto("/mis-clases");
    await expect(
      page.getByRole("heading", { name: "Mis clases" }),
    ).toBeVisible();

    await page.goto("/mis-pagos");
    await expect(
      page.getByRole("heading", { name: "Mis pagos" }),
    ).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/mi-cuenta$/);
  });

  test("no puede consultar la ficha de otra alumna por API", async ({
    page,
  }) => {
    test.skip(
      !adminStudentId,
      "Define E2E_ADMIN_STUDENT_ID para comprobar aislamiento.",
    );
    if (!hasCredentials(student) || !adminStudentId) return;
    await login(page, student);

    const ownResponse = await page.request.get(
      `/api/trpc/students.byId?input=${trpcInput({ id: Number(adminStudentId) })}`,
    );
    expect(ownResponse.status()).toBe(200);
    expect(await ownResponse.text()).toContain("Alumna de prueba E2E");

    const otherResponse = await page.request.get(
      `/api/trpc/students.byId?input=${trpcInput({ id: Number(adminStudentId) + 1 })}`,
      { headers: { "x-request-id": "e2e-student-isolation" } },
    );
    expect(otherResponse.status()).toBe(404);
    expect(otherResponse.headers()["x-request-id"]).toBe(
      "e2e-student-isolation",
    );
    expect(await otherResponse.text()).not.toContain("Otra alumna aislada E2E");
  });
});

test.describe("experiencia OWNER", () => {
  test.skip(
    !hasCredentials(owner),
    "Define E2E_OWNER_EMAIL y E2E_OWNER_PASSWORD.",
  );

  test("etiqueta los formularios de taller, turnos y asignaciones", async ({
    page,
  }) => {
    if (!hasCredentials(owner)) return;
    await login(page, owner);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Usuarios y asignaciones" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nombre del taller").first()).toBeVisible();
    await expect(
      page.getByLabel("Identificador del taller").first(),
    ).toBeVisible();
    await expect(page.getByLabel("Hora del nuevo turno")).toBeVisible();
    await expect(page.getByLabel("Nombre del usuario").first()).toBeVisible();
    await expect(page.getByLabel("Rol", { exact: true }).first()).toBeVisible();
    await page
      .getByLabel("Rol", { exact: true })
      .first()
      .selectOption("STUDENT");
    await expect(page.getByLabel("Ficha del alumno")).toBeVisible();
    // Check every visible control rather than only the fields named above.
    const controls = page.locator(
      "main input:visible, main select:visible, main textarea:visible, main button:visible",
    );
    for (const control of await controls.all()) {
      await expect(control).toHaveAccessibleName(/\S/);
    }
    await page.screenshot({
      path: test.info().outputPath("administration-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  });
});
