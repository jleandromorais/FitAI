import { test, expect } from "@playwright/test";

/**
 * Fluxo de autenticação ponta a ponta contra um backend real.
 * Requer backend + Postgres rodando — ver README (seção "Testes E2E").
 */
test.describe("Autenticação", () => {
  test("cria conta, faz login e acessa o dashboard", async ({ page }) => {
    const email = `e2e-${Date.now()}@test.com`;

    await page.goto("/login");
    await page.getByText("Criar conta").click();

    await page.getByPlaceholder("Seu nome completo").fill("Usuário E2E");
    await page.getByPlaceholder("seu@email.com").fill(email);
    await page.getByPlaceholder("••••••••").fill("senha123");
    await page.getByPlaceholder("Confirme sua senha").fill("senha123");
    await page.getByRole("button", { name: /criar conta/i }).click();

    await expect(page).toHaveURL("/");
  });

  test("bloqueia acesso ao dashboard sem login e redireciona para /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
