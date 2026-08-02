import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import RepCounter from "@/components/ui/RepCounter";

const REPS_PER_SET = 12;
const TICK_MS = 650;

function mockMatchMedia(matches: boolean) {
  const fn = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, "matchMedia", { writable: true, value: fn });
  return fn;
}

function dotClasses(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".rep-counter-dot")).map(el => el.className);
}

describe("RepCounter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("começa na repetição 01, série 1 de 4, com o primeiro dot como 'current'", () => {
    const { container } = render(<RepCounter />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText(/Série 1 de 4/)).toBeInTheDocument();
    expect(container.querySelector(".rep-counter")).toHaveAttribute("aria-hidden", "true");

    const dots = dotClasses(container);
    expect(dots).toHaveLength(4);
    expect(dots[0]).toContain("current");
    expect(dots.slice(1).every(c => !c.includes("current") && !c.includes("done"))).toBe(true);
  });

  it("não avança antes de 650ms, avança para 02 exatamente em 650ms", () => {
    render(<RepCounter />);
    act(() => vi.advanceTimersByTime(TICK_MS - 1));
    expect(screen.getByText("01")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("chega em 12 ainda na série 1, e só na próxima marca reinicia e avança de série", () => {
    render(<RepCounter />);
    act(() => vi.advanceTimersByTime(TICK_MS * (REPS_PER_SET - 1)));
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/Série 1 de 4/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(TICK_MS));
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText(/Série 2 de 4/)).toBeInTheDocument();
  });

  it("marca os dots das séries concluídas como 'done' e a atual como 'current'", () => {
    const { container } = render(<RepCounter />);
    act(() => vi.advanceTimersByTime(TICK_MS * REPS_PER_SET));

    const dots = dotClasses(container);
    expect(dots[0]).toContain("done");
    expect(dots[1]).toContain("current");
    expect(dots[2]).not.toContain("done");
    expect(dots[2]).not.toContain("current");
  });

  it("percorre as 4 séries com checkpoints intermediários, depois volta para a série 1 (loop)", () => {
    render(<RepCounter />);

    act(() => vi.advanceTimersByTime(TICK_MS * REPS_PER_SET));
    expect(screen.getByText(/Série 2 de 4/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(TICK_MS * REPS_PER_SET));
    expect(screen.getByText(/Série 3 de 4/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(TICK_MS * REPS_PER_SET));
    expect(screen.getByText(/Série 4 de 4/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(TICK_MS * REPS_PER_SET));
    expect(screen.getByText(/Série 1 de 4/)).toBeInTheDocument();
  });

  it("não inicia o intervalo quando prefers-reduced-motion está ativo", () => {
    const matchMediaMock = mockMatchMedia(true);
    render(<RepCounter />);

    expect(matchMediaMock).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");

    act(() => vi.advanceTimersByTime(TICK_MS * 5));
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText(/Série 1 de 4/)).toBeInTheDocument();
  });

  it("limpa o intervalo ao desmontar — sem updates ou warnings após unmount", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<RepCounter />);

    act(() => vi.advanceTimersByTime(TICK_MS * 2));
    unmount();
    act(() => vi.advanceTimersByTime(TICK_MS * 20));

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
