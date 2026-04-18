import { useEffect, useRef } from 'react';

/**
 * Ejecuta fn() cada intervalMs mientras el componente esté montado.
 * @param {() => void} fn
 * @param {number} intervalMs  Defecto: 4000
 * @param {boolean} enabled
 */
export function usePolling(fn, intervalMs = 4000, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => fnRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
