import { useCallback, useEffect, useRef, useState } from "react";

export function useTimedMessage(duration = 4000) {
  const [message, setMessageState] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setMessage = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setMessageState(text);

      if (text) {
        timer.current = setTimeout(() => {
          setMessageState("");
          timer.current = null;
        }, duration);
      }
    },
    [duration],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return [message, setMessage] as const;
}
