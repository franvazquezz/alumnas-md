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
const adminStudentId = process.env.E2E_ADMIN_STUDENT_ID;

const hasCredentials = (
  credentials: Credentials,
): credentials is Required<Credentials> =>
  Boolean(credentials.email && credentials.password);

async function login(page: Page, credentials: Required<Credentials>) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(credentials.email);
  await page.getByLabel("Contraseña").fill(credentials.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });
}

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
    ).toBeVisible();
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
});
