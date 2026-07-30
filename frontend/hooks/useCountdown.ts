"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Cronómetro crescente (segundos), controlado manualmente por start/stop. */
export function useStopwatch() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (intervalRef.current) return; // já rodando — evita empilhar intervalos
    intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null; // senão start() depois de stop() nunca reinicia
  }, []);

  const reset = useCallback(() => setSeconds(0), []);

  useEffect(() => stop, [stop]);

  return { seconds, start, stop, reset, setSeconds };
}

/** Contagem regressiva (segundos), útil para timers de descanso entre séries. */
export function useCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(seconds);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev === null || prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const skip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(null);
  }, []);

  const addSeconds = useCallback((delta: number) => {
    setRemaining(prev => (prev ?? 0) + delta);
  }, []);

  useEffect(() => skip, [skip]);

  return { remaining, start, skip, addSeconds };
}
