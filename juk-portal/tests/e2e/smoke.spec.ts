import { test, expect } from "@playwright/test";

test("el dashboard carga con la sesión de admin", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
});

test("navega por las secciones principales", async ({ page }) => {
  const secciones = [
    ["/colegios", "Colegios"],
    ["/viajes", "Viajes"],
    ["/alumnos", "Alumnos"],
    ["/group-leaders", "Group Leaders"],
    ["/usuarios", "Usuarios"],
  ] as const;

  for (const [path, heading] of secciones) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  }
});

test("una ruta inexistente muestra el 404 con marca", async ({ page }) => {
  await page.goto("/ruta-que-no-existe");
  await expect(page.getByText("Esta página no existe")).toBeVisible();
});

test("el alta de colegio valida los campos requeridos", async ({ page }) => {
  await page.goto("/colegios/nuevo");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Revisá los campos del formulario.")).toBeVisible();
  await expect(page.getByText("Ingresá el nombre del colegio")).toBeVisible();
});
