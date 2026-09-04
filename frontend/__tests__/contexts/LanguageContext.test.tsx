import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";

function TestConsumer() {
  const { locale, setLocale, t } = useLanguage();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="treinos-label">{t.sidebar.treinos}</span>
      <button onClick={() => setLocale("en")}>EN</button>
      <button onClick={() => setLocale("pt-BR")}>PT</button>
    </div>
  );
}

describe("LanguageContext", () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => localStorageMock[key] ?? null,
      setItem: (key: string, value: string) => { localStorageMock[key] = value; },
      removeItem: (key: string) => { delete localStorageMock[key]; },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inicia em pt-BR quando localStorage está vazio", () => {
    render(<LanguageProvider><TestConsumer /></LanguageProvider>);
    expect(screen.getByTestId("locale").textContent).toBe("pt-BR");
    expect(screen.getByTestId("treinos-label").textContent).toBe("Treinos");
  });

  it("lê 'en' do localStorage na montagem", () => {
    localStorageMock["locale"] = "en";
    render(<LanguageProvider><TestConsumer /></LanguageProvider>);
    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("treinos-label").textContent).toBe("Workouts");
  });

  it("trata qualquer valor além de 'en' como pt-BR (default defensivo)", () => {
    localStorageMock["locale"] = "fr";
    render(<LanguageProvider><TestConsumer /></LanguageProvider>);
    expect(screen.getByTestId("locale").textContent).toBe("pt-BR");
  });

  it("setLocale atualiza o estado e persiste no localStorage", () => {
    render(<LanguageProvider><TestConsumer /></LanguageProvider>);

    act(() => screen.getByRole("button", { name: "EN" }).click());
    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("treinos-label").textContent).toBe("Workouts");
    expect(localStorageMock["locale"]).toBe("en");

    act(() => screen.getByRole("button", { name: "PT" }).click());
    expect(screen.getByTestId("locale").textContent).toBe("pt-BR");
    expect(localStorageMock["locale"]).toBe("pt-BR");
  });

  it("useLanguage fora de um LanguageProvider cai no default pt-BR (não quebra)", () => {
    render(<TestConsumer />);
    expect(screen.getByTestId("locale").textContent).toBe("pt-BR");
    expect(screen.getByTestId("treinos-label").textContent).toBe("Treinos");
  });
});
