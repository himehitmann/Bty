"use client";

import { useEffect, useState } from "react";

export type MotionPreference = "system" | "reduce";

const motionKey = "navier-motion";

function readPreference(): MotionPreference {
  try {
    return localStorage.getItem(motionKey) === "reduce" ? "reduce" : "system";
  } catch {
    return "system";
  }
}

export function useMotionPreference() {
  const [preference, setPreference] = useState<MotionPreference>("system");

  useEffect(() => {
    setPreference(readPreference());

    function syncPreference(event: StorageEvent) {
      if (event.key === motionKey || event.key === null) setPreference(readPreference());
    }

    window.addEventListener("storage", syncPreference);
    return () => window.removeEventListener("storage", syncPreference);
  }, []);

  function changePreference(value: MotionPreference) {
    setPreference(value);
    try {
      localStorage.setItem(motionKey, value);
    } catch {
      // The new preference still applies for the current session.
    }
  }

  return [preference, changePreference] as const;
}
