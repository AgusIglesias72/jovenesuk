import { test, expect } from "@playwright/test";

function codigoUnico() {
  const letras = Array.from({ length: 6 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  return `UK-2099-JUL-${letras}`;
}

test("crea un viaje y aparece en el listado", async ({ page }) => {
  const codigo = codigoUnico();

  await page.goto("/viajes/nuevo");
  await page.getByLabel("Código").fill(codigo);
  await page.getByLabel("Nombre").fill("Viaje de prueba E2E");
  await page.getByLabel("Fecha de inicio").fill("2027-02-02");
  await page.getByLabel("Fecha de fin").fill("2027-02-20");
  await page.getByLabel("Colegio destino").selectOption({ label: "London School of English" });
  await page.getByLabel("Curso").fill("General English");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/viajes$/);
  await expect(page.getByText(codigo)).toBeVisible();
});
