import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkoutSlots } from "@/hooks/useWorkoutSlots";
import { SPLITS } from "@/lib/workout-shared";
import type { ExerciseSuggestion } from "@/lib/exercises";

const SUGGESTION: ExerciseSuggestion = {
  name: "Supino Reto", muscle: "Peitoral", group: "Peito",
  defaultSets: 3, defaultReps: 10, defaultWeight: 40, defaultRest: 90,
  tips: "",
};

const PPL_SPLIT = SPLITS.find(s => s.id === "ppl")!;
const CUSTOM_SPLIT = SPLITS.find(s => s.id === "custom")!;

describe("useWorkoutSlots", () => {
  it("inicia no passo 0, sem split nem slots", () => {
    const { result } = renderHook(() => useWorkoutSlots());
    expect(result.current.step).toBe(0);
    expect(result.current.selectedSplit).toBeNull();
    expect(result.current.slots).toEqual([]);
  });

  it("selectSplit popula slots a partir do split e avança para o passo 1", () => {
    const { result } = renderHook(() => useWorkoutSlots());

    act(() => result.current.selectSplit(PPL_SPLIT));

    expect(result.current.step).toBe(1);
    expect(result.current.selectedSplit?.id).toBe("ppl");
    expect(result.current.slots).toHaveLength(3); // Push/Pull/Legs
    expect(result.current.slots[0].label).toContain("Push");
  });

  it("split custom cria um único slot 'Treino A' vazio", () => {
    const { result } = renderHook(() => useWorkoutSlots());
    act(() => result.current.selectSplit(CUSTOM_SPLIT));

    expect(result.current.slots).toHaveLength(1);
    expect(result.current.slots[0].label).toBe("Treino A");
    expect(result.current.slots[0].groups).toEqual([]);
  });

  it("addCustomSlot adiciona um novo bloco nomeado sequencialmente", () => {
    const { result } = renderHook(() => useWorkoutSlots());
    act(() => result.current.selectSplit(CUSTOM_SPLIT));

    act(() => result.current.addCustomSlot());

    expect(result.current.slots).toHaveLength(2);
    expect(result.current.slots[1].label).toBe("Treino B");
  });

  it("toggleSlotDay adiciona e remove um dia do slot", () => {
    const { result } = renderHook(() => useWorkoutSlots());
    act(() => result.current.selectSplit(CUSTOM_SPLIT));
    const slotId = result.current.slots[0].id;

    act(() => result.current.toggleSlotDay(slotId, "Seg"));
    expect(result.current.slots[0].days).toEqual(["Seg"]);

    act(() => result.current.toggleSlotDay(slotId, "Seg"));
    expect(result.current.slots[0].days).toEqual([]);
  });

  it("removeSlot remove o bloco e ajusta activeSlotIdx", () => {
    const { result } = renderHook(() => useWorkoutSlots());
    act(() => result.current.selectSplit(PPL_SPLIT));
    const secondSlotId = result.current.slots[1].id;
    act(() => result.current.setActiveSlotIdx(2));

    act(() => result.current.removeSlot(secondSlotId));

    expect(result.current.slots).toHaveLength(2);
    expect(result.current.activeSlotIdx).toBe(1); // ajustado para não ficar fora dos limites
  });

  it("duplicateSlot cria uma cópia com sufixo numérico e sem dias", () => {
    const { result } = renderHook(() => useWorkoutSlots());
    act(() => result.current.selectSplit(CUSTOM_SPLIT));
    const slotId = result.current.slots[0].id;
    act(() => result.current.toggleSlotDay(slotId, "Seg"));

    act(() => result.current.duplicateSlot(slotId));

    expect(result.current.slots).toHaveLength(2);
    expect(result.current.slots[0].label).toBe("Treino A 1");
    expect(result.current.slots[1].label).toBe("Treino A 2");
    expect(result.current.slots[1].days).toEqual([]); // dias não são copiados
  });

  it("addExercise adiciona exercício apenas no slot ativo", () => {
    const { result } = renderHook(() => useWorkoutSlots());
    act(() => result.current.selectSplit(PPL_SPLIT));
    act(() => result.current.setActiveSlotIdx(1));

    act(() => result.current.addExercise(SUGGESTION));

    expect(result.current.slots[0].exercises).toHaveLength(0);
    expect(result.current.slots[1].exercises).toHaveLength(1);
    expect(result.current.slots[2].exercises).toHaveLength(0);
  });

  it("removeExercise, addSet e updateSet operam no slot ativo", () => {
    const { result } = renderHook(() => useWorkoutSlots());
    act(() => result.current.selectSplit(CUSTOM_SPLIT));
    act(() => result.current.addExercise(SUGGESTION));
    const exId = result.current.slots[0].exercises[0].id;

    act(() => result.current.addSet(exId));
    expect(result.current.slots[0].exercises[0].sets).toHaveLength(4);

    act(() => result.current.updateSet(exId, 0, "weight", 55));
    expect(result.current.slots[0].exercises[0].sets[0].weight).toBe(55);

    act(() => result.current.removeExercise(exId));
    expect(result.current.slots[0].exercises).toHaveLength(0);
  });
});
