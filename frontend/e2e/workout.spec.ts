import { test, expect } from "@playwright/test";

/**
 * Fluxo de treinos ponta a ponta contra um backend real.
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

test.describe("Treinos", () => {
  test("navega até Treinos e abre o assistente de criação", async ({ page }) => {
    const email = `e2e-workout-${Date.now()}@test.com`;
    await login(page, email);

    await page.getByRole("link", { name: /treinos/i }).click();
    await expect(page).toHaveURL(/\/treinos/);

    await page.getByRole("button", { name: /novo treino/i }).click();
    await expect(page.getByText("Escolha como quer dividir")).toBeVisible();
  });

  test("navega até Evolução (progresso) para um usuário novo", async ({ page }) => {
    const email = `e2e-progress-${Date.now()}@test.com`;
    await login(page, email);

    await page.getByRole("link", { name: /evolução/i }).click();
    await expect(page).toHaveURL(/\/progresso/);
  });
});
