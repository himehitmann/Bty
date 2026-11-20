type PlacementCopy = readonly [french: string, english: string];

const placements = {
  blush: [
    { id: "blush-apples", label: ["Bombé des joues", "Apples of the cheeks"],
      description: ["Tapote la couleur au centre du bombé des joues, puis fonds les bords.", "Tap colour onto the apples of the cheeks and blend the edges."] },
    { id: "blush-lifted", label: ["Pommettes vers les tempes", "Lifted cheekbones"],
      description: ["Pose la couleur en haut des pommettes et étire-la vers les tempes.", "Sweep high along the cheekbones towards the temples."] },
    { id: "blush-sun-kissed", label: ["Joues et arête du nez", "Across cheeks and nose"],
      description: ["Relie les deux joues par un voile de couleur sur l’arête du nez.", "Connect the blush on both cheeks with a wash across the bridge of the nose."] },
    { id: "blush-under-eyes", label: ["Haut des joues sous les yeux", "Upper cheeks beneath the eyes"],
      description: ["Concentre la couleur juste sous les yeux, au haut des joues, puis estompe vers le bas.", "Concentrate colour on the upper cheeks just beneath the eyes and blend downwards."] },
    { id: "blush-draped", label: ["En C autour des tempes", "C-shaped temple draping"],
      description: ["Forme un C de la tempe au haut de la pommette pour encadrer le regard.", "Create a C from the temple down to the upper cheekbone to frame the eyes."] },
  ],
  contour: [
    { id: "contour-cheeks", label: ["Creux des joues", "Hollows of the cheeks"],
      description: ["Place l’ombre sous la pommette en partant près de l’oreille. Estompe vers le haut.", "Start near the ear and shade under the cheekbone. Blend upwards."] },
    { id: "contour-temples", label: ["Tempes et lisière du front", "Temples and hairline"],
      description: ["Dépose une ombre légère aux tempes et le long du haut du front.", "Add soft shadow at the temples and along the upper forehead."] },
    { id: "contour-jaw", label: ["Mâchoire", "Jawline"],
      description: ["Suis le bord de la mâchoire puis fonds la couleur vers le cou.", "Follow the jawline and blend down towards the neck."] },
    { id: "contour-nose", label: ["Côtés du nez", "Sides of the nose"],
      description: ["Trace deux ombres fines de part et d’autre de l’arête du nez, puis adoucis les bords.", "Place two soft lines on either side of the bridge and blend the edges."] },
    { id: "contour-complete", label: ["Contouring combiné", "Combined contour"],
      description: ["Combine les creux des joues, les tempes, la mâchoire et les côtés du nez.", "Combine the cheek hollows, temples, jawline and sides of the nose."] },
  ],
  bronzer: [
    { id: "bronzer-sun", label: ["Effet soleil", "Sun-kissed"],
      description: ["Réchauffe le haut du front, le dessus des pommettes et le dessus du nez.", "Warm the upper forehead, tops of the cheekbones and bridge of the nose."] },
    { id: "bronzer-three", label: ["Contour en 3", "Three shape"],
      description: ["Dessine un 3 de chaque côté, de la tempe à la pommette puis à la mâchoire.", "Sweep a 3 on each side from temple to cheekbone to jawline."] },
    { id: "bronzer-cheeks", label: ["Dessus des pommettes", "Tops of the cheekbones"],
      description: ["Balaie légèrement le dessus des pommettes pour réchauffer le teint.", "Sweep lightly over the tops of the cheekbones for warmth."] },
  ],
  highlighter: [
    { id: "highlight-cheekbones", label: ["Sommets des pommettes", "High points of the cheeks"],
      description: ["Dépose la lumière sur l’os de la pommette, au-dessus du blush.", "Place the highlight high on the cheekbone, above the blush."] },
    { id: "highlight-center", label: ["Nez et arc de Cupidon", "Nose and cupid’s bow"],
      description: ["Illumine l’arête et la pointe du nez ainsi que le creux au-dessus de la lèvre.", "Highlight the bridge and tip of the nose and the dip above the upper lip."] },
    { id: "highlight-points", label: ["Points de lumière combinés", "Combined high points"],
      description: ["Combine le haut des pommettes, l’arête du nez et l’arc de Cupidon.", "Combine the tops of the cheekbones, bridge of the nose and cupid’s bow."] },
  ],
  powder: [
    { id: "powder-tzone", label: ["Zone T", "T-zone"],
      description: ["Presse une fine couche sur le centre du front, le nez et le menton.", "Press a thin layer onto the centre of the forehead, nose and chin."] },
    { id: "powder-under-eyes", label: ["Sous les yeux", "Under the eyes"],
      description: ["Tapote un voile léger sur la zone où tu as posé ton anticernes.", "Tap a light veil over the area where you applied concealer."] },
    { id: "powder-center", label: ["Zone T et sous les yeux", "T-zone and under-eyes"],
      description: ["Fixe l’anticernes et la zone T, en laissant les joues libres.", "Set the concealer and T-zone, leaving the cheeks untouched."] },
    { id: "powder-full", label: ["Voile sur le visage", "Light veil over the face"],
      description: ["Balaie une couche fine de poudre sur les zones où le teint doit être fixé.", "Sweep a thin layer of powder over the areas where you want to set your base."] },
  ],
  concealer: [
    { id: "concealer-under-eyes", label: ["Sous les yeux", "Under the eyes"],
      description: ["Pose l’anticernes sur la zone d’ombre sous l’œil et fonds-le vers la joue.", "Place concealer on the shadow under the eye and blend it towards the cheek."] },
    { id: "concealer-center", label: ["Centre du visage", "Centre of the face"],
      description: ["Travaille par petites touches au centre du visage selon les zones à unifier.", "Apply small touches to the centre of the face wherever you want to even out the base."] },
    { id: "concealer-redness", label: ["Autour du nez et menton", "Around the nose and chin"],
      description: ["Pose une touche localisée près des ailes du nez et du menton, puis fonds les bords.", "Apply small amounts around the nostrils and chin, then blend the edges."] },
  ],
} as const;

export type MakeupPlacement = (typeof placements)[keyof typeof placements][number]["id"];
export type MakeupPlacementOption = { readonly id: MakeupPlacement; readonly label: PlacementCopy; readonly description: PlacementCopy };
export const makeupPlacementIds: MakeupPlacement[] = Object.values(placements).flatMap((options) => options.map(({ id }) => id));

export function getMakeupPlacements(kind: string | undefined): readonly MakeupPlacementOption[] {
  return kind && Object.hasOwn(placements, kind) ? placements[kind as keyof typeof placements] : [];
}

export function findMakeupPlacement(kind: string | undefined, id: unknown): MakeupPlacementOption | undefined {
  return getMakeupPlacements(kind).find((option) => option.id === id);
}
