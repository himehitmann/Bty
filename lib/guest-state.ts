import { starterState, type Product, type Routine, type State } from "./model";

function isOriginalProduct(product: Product) {
  const original = starterState.products.find((entry) => entry.id === product.id);
  if (!original) return false;
  const previousNames: Record<string, string> = {
    "example-lipstick": "Rouge Velours",
    "example-cream": "Crème Nuage",
  };
  const namesMatch = product.name === original.name || product.name === previousNames[product.id];
  if (!namesMatch) return false;
  if (!product.makeupKind && !product.makeupEffect && !product.shadeHex &&
      product.id === "example-lipstick") {
    const { makeupKind: _kind, makeupEffect: _effect, shadeHex: _shade, ...beforeShade } = original;
    return equivalent(product, { ...beforeShade, name: product.name });
  }
  return equivalent(product, { ...original, name: product.name });
}

function equivalent(first: object, second: object) {
  function serialized(value: object) {
    return JSON.stringify(Object.fromEntries(
      Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)),
    ));
  }
  return serialized(first) === serialized(second);
}

function isOriginalRoutine(routine: Routine, originals: Set<string>) {
  const original = starterState.routines.find((entry) => entry.id === routine.id);
  if (!original || routine.name !== original.name || routine.period !== original.period) return false;
  const steps = original.steps.filter((step) => step.id !== "example-step-powder");
  const matches = [original.steps, steps].some((candidate) => candidate.length === routine.steps.length &&
    candidate.every((step, index) => equivalent(step, routine.steps[index])));
  return matches && routine.steps.every((step) => originals.has(step.productId));
}

export function withoutUnchangedExamples(state: State): State {
  const originals = new Set(state.products.filter(isOriginalProduct).map((product) => product.id));
  if (!originals.size) return state;
  const completed = new Set(state.completed.map((entry) => entry.routineId));
  const removedRoutines = new Set(state.routines.filter((routine) => !completed.has(routine.id) && isOriginalRoutine(routine, originals)).map((routine) => routine.id));
  const routines = state.routines.filter((routine) => !removedRoutines.has(routine.id));
  const used = new Set(routines.flatMap((routine) => routine.steps.map((step) => step.productId)));
  return {
    ...state,
    routines,
    products: state.products.filter((product) => !originals.has(product.id) || used.has(product.id)),
  };
}
