import { test, expect } from "@playwright/test";

/**
 * Fluxo do seletor de idioma ponta a ponta contra um backend real.
 * Requer backend + Postgres rodando — ver README (seção "Testes E2E").
 */
async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByText("Criar conta").click();
  await page.getByPlaceholder("Seu nome completo").fill("Usuário E2E");
  await page.getByPlaceholder("seu@email.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("senha123");
  await page.getByPlaceholder("Confirme sua senha").fill("senha123");
  await page.getByRole("button", { name: /criar conta/i }).click();
  await expect(page).toHaveURL("/");
}

test.describe("Seletor de idioma", () => {
  test("trocar para EN no Perfil atualiza a Sidebar e persiste após reload", async ({ page }) => {
    const email = `e2e-lang-${Date.now()}@test.com`;
    await login(page, email);

    await page.getByRole("link", { name: /perfil/i }).click();
    await expect(page).toHaveURL(/\/perfil/);

    await page.getByRole("button", { name: "EN" }).click();
    await expect(page.getByRole("button", { name: "EN" })).toHaveClass(/chip-accent/);

    // Sidebar reflete a troca imediatamente, sem precisar navegar.
    await expect(page.getByRole("link", { name: /Workouts/ })).toBeVisible();

    // Persiste entre reloads (localStorage), não só no estado em memória.
    await page.reload();
    await expect(page.getByRole("link", { name: /Workouts/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "EN" })).toHaveClass(/chip-accent/);

    // Voltar para PT também funciona e reflete de volta no português.
    await page.getByRole("button", { name: "PT" }).click();
    await expect(page.getByRole("link", { name: /Treinos/ })).toBeVisible();
  });
});
