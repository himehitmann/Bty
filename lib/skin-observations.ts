import type { Preferences } from "./model";

export const routineFocusLabels: Record<NonNullable<Preferences["routineFocus"]>, [string, string]> = {
  simple: ["Garder peu d’étapes", "Keep the routine short"],
  comfort: ["Privilégier le confort", "Put comfort first"],
  shine: ["Suivre la brillance", "Keep track of shine"],
};
