import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExerciseRows } from "@/hooks/useExerciseRows";
import type { ExerciseSuggestion } from "@/lib/exercises";

const SUGGESTION: ExerciseSuggestion = {
  name: "Supino Reto", muscle: "Peitoral", group: "Peito",
  defaultSets: 3, defaultReps: 10, defaultWeight: 40, defaultRest: 90,
  tips: "Mantenha os ombros retraídos.",
};

describe("useExerciseRows", () => {
  it("inicia vazio por padrão", () => {
    const { result } = renderHook(() => useExerciseRows());
    expect(result.current.exercises).toEqual([]);
  });

  it("addExercise adiciona exercício com séries padrão da sugestão", () => {
    const { result } = renderHook(() => useExerciseRows());

    act(() => result.current.addExercise(SUGGESTION));

    expect(result.current.exercises).toHaveLength(1);
    expect(result.current.exercises[0].name).toBe("Supino Reto");
    expect(result.current.exercises[0].sets).toHaveLength(3);
    expect(result.current.exercises[0].sets[0]).toEqual({ reps: 10, weight: 40, rest: 90 });
  });

  it("addCustomExercise adiciona exercício com uma série default", () => {
    const { result } = renderHook(() => useExerciseRows());

    act(() => result.current.addCustomExercise("Flexão", "Peito"));

    expect(result.current.exercises).toHaveLength(1);
    expect(result.current.exercises[0]).toMatchObject({ name: "Flexão", muscle: "Peito", group: "Peito" });
    expect(result.current.exercises[0].sets).toHaveLength(1);
  });

  it("removeExercise remove pelo id", () => {
    const { result } = renderHook(() => useExerciseRows());
    act(() => result.current.addExercise(SUGGESTION));
    const id = result.current.exercises[0].id;

    act(() => result.current.removeExercise(id));

    expect(result.current.exercises).toHaveLength(0);
  });

  it("addSet duplica a última série do exercício", () => {
    const { result } = renderHook(() => useExerciseRows());
    act(() => result.current.addCustomExercise("Flexão", "Peito"));
    const id = result.current.exercises[0].id;

    act(() => result.current.addSet(id));

    expect(result.current.exercises[0].sets).toHaveLength(2);
  });

  it("removeSet remove a série pelo índice", () => {
    const { result } = renderHook(() => useExerciseRows());
    act(() => result.current.addExercise(SUGGESTION));
    const id = result.current.exercises[0].id;

    act(() => result.current.removeSet(id, 0));

    expect(result.current.exercises[0].sets).toHaveLength(2);
  });

  it("updateSet altera um campo de uma série específica sem afetar as demais", () => {
    const { result } = renderHook(() => useExerciseRows());
    act(() => result.current.addExercise(SUGGESTION));
    const id = result.current.exercises[0].id;

    act(() => result.current.updateSet(id, 1, "weight", 50));

    expect(result.current.exercises[0].sets[1].weight).toBe(50);
    expect(result.current.exercises[0].sets[0].weight).toBe(40);
  });
});
