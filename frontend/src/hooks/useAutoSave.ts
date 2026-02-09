import { useCallback, useRef, useEffect } from 'react';

export function useAutoSave(
  saveFunction: () => Promise<void>,
  delay = 1000
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFunction);

  saveFnRef.current = saveFunction;

  const debouncedSave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        await saveFnRef.current();
      } catch {
        // Error handled by store
      }
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { debouncedSave };
}
