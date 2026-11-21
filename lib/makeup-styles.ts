import type { PigmentLayer } from "./face-makeup";
import type { MakeupPlacement } from "./makeup-placements";
import type { StudioPlacementDetails } from "./studio-advanced";
import { studioToolsByArea, type StudioArea, type StudioLookSnapshot } from "./studio-looks";

export type GuideCopy = readonly [french: string, english: string, spanish: string, italian: string];
export type MakeupStylePreset = { name: string; snapshot: StudioLookSnapshot };
export type MakeupStyleCategory = "everyday" | "evening" | "creative";

type StyleLayer = {
  [Area in StudioArea]: {
    area: Area;
    tool: Exclude<(typeof studioToolsByArea)[Area][number], "setting-powder">;
    name: GuideCopy;
    hex: string;
    intensity: number;
    placement?: MakeupPlacement;
    details?: StudioPlacementDetails;
  }
}[StudioArea];

export type MakeupGuideStyle = {
  id: string;
  category: MakeupStyleCategory;
  name: GuideCopy;
  description: GuideCopy;
  steps: readonly GuideCopy[];
  backdrop: string;
  layers: readonly StyleLayer[];
  source: { publication: string; url: `https://${string}` };
};

type GuidePortrait = StudioLookSnapshot["portrait"];

export const guidePortraits: ReadonlyArray<{ label: GuideCopy; portrait: GuidePortrait }> = [
  { label: ["Très claire", "Very light", "Muy clara", "Molto chiara"], portrait: { skinTone: "#F5DCCB", hair: "#815343", iris: "#616D59", showHair: true } },
  { label: ["Claire", "Light", "Clara", "Chiara"], portrait: { skinTone: "#EBC4AD", hair: "#543439", iris: "#584773", showHair: true } },
  { label: ["Intermédiaire claire", "Light medium", "Media clara", "Media chiara"], portrait: { skinTone: "#D3A480", hair: "#443236", iris: "#6B513D", showHair: true } },
  { label: ["Intermédiaire profonde", "Medium deep", "Media oscura", "Media scura"], portrait: { skinTone: "#B77B58", hair: "#2B252D", iris: "#594134", showHair: true } },
  { label: ["Foncée", "Deep", "Oscura", "Scura"], portrait: { skinTone: "#8C5743", hair: "#28212D", iris: "#48362D", showHair: true } },
  { label: ["Très foncée", "Very deep", "Muy oscura", "Molto scura"], portrait: { skinTone: "#623F34", hair: "#211E29", iris: "#432A31", showHair: true } },
];

const names = {
  mutedRose: ["Rose doux", "Soft rose", "Rosa suave", "Rosa tenue"],
  espresso: ["Espresso", "Espresso", "Espresso", "Espresso"],
  hibiscus: ["Hibiscus", "Hibiscus", "Hibisco", "Ibisco"],
  petal: ["Pétale", "Petal", "Pétalo", "Petalo"],
  champagne: ["Champagne", "Champagne", "Champán", "Champagne"],
  cherry: ["Cerise", "Cherry", "Cereza", "Ciliegia"],
  cocoa: ["Cacao", "Cocoa", "Cacao", "Cacao"],
  rosewood: ["Bois de rose", "Rosewood", "Palo de rosa", "Legno di rosa"],
  peach: ["Pêche", "Peach", "Melocotón", "Pesca"],
  orchid: ["Orchidée", "Orchid", "Orquídea", "Orchidea"],
  plumInk: ["Encre prune", "Plum ink", "Tinta ciruela", "Inchiostro prugna"],
  berry: ["Baie sombre", "Deep berry", "Baya oscura", "Frutti di bosco scuri"],
  charcoal: ["Charbon", "Charcoal", "Carbón", "Carbone"],
  pinkBrown: ["Rose brun", "Rosy brown", "Rosa tostado", "Rosa bruno"],
  terracotta: ["Terracotta", "Terracotta", "Terracota", "Terracotta"],
  apricot: ["Abricot", "Apricot", "Albaricoque", "Albicocca"],
  caramel: ["Caramel", "Caramel", "Caramelo", "Caramello"],
  honey: ["Miel", "Honey", "Miel", "Miele"],
  cobalt: ["Cobalt", "Cobalt", "Cobalto", "Cobalto"],
  mauve: ["Mauve", "Mauve", "Malva", "Malva"],
} as const satisfies Record<string, GuideCopy>;

export const makeupGuideStyles: readonly MakeupGuideStyle[] = [
  {
    id: "clean",
    category: "everyday",
    name: ["Clean makeup", "Clean makeup", "Clean makeup", "Clean makeup"],
    description: [
      "Un teint en transparence, des joues légèrement rosées et des lèvres souples.",
      "A sheer base, a subtle flush and softly tinted lips.",
      "Una base ligera, un rubor sutil y labios suavemente teñidos.",
      "Una base leggera, un velo di fard e labbra delicatamente colorate.",
    ],
    steps: [
      ["Unifie le teint par touches là où tu le souhaites.", "Even out the base only where you want a little coverage.", "Unifica el tono solo donde quieras algo de cobertura.", "Uniforma il tono solo dove desideri un po’ di copertura."],
      ["Tapote un blush léger au centre des joues et estompe le contour.", "Tap a light blush onto the apples of the cheeks and blend the edges.", "Da toques de colorete suave en el centro de las mejillas y difumina los bordes.", "Picchietta un fard leggero al centro delle guance e sfuma i bordi."],
      ["Passe un baume teinté et sépare les cils si tu le souhaites.", "Finish with tinted balm and define the lashes if you like.", "Acaba con bálsamo con color y define las pestañas si quieres.", "Completa con un balsamo colorato e definisci le ciglia se vuoi."],
    ],
    backdrop: "#F4E5DF",
    layers: [
      { area: "joues", tool: "blush", name: names.mutedRose, hex: "#CF697D", intensity: 39, placement: "blush-apples" },
      { area: "yeux", tool: "mascara", name: names.espresso, hex: "#45302D", intensity: 58 },
      { area: "levres", tool: "lip", name: names.rosewood, hex: "#A84958", intensity: 39 },
    ],
    source: { publication: "Allure", url: "https://www.allure.com/gallery/natural-no-makeup-makeup-how-to" },
  },
  {
    id: "douyin",
    category: "creative",
    name: ["Douyin", "Douyin", "Douyin", "Douyin"],
    description: [
      "Une interprétation des looks partagés sur la plateforme chinoise Douyin, avec des joues hautes, des yeux lumineux et des lèvres dégradées.",
      "One interpretation of looks shared on the Chinese platform Douyin, with high blush, bright eyes and a diffused lip.",
      "Una interpretación de los looks compartidos en la plataforma china Douyin, con colorete alto, ojos luminosos y labios degradados.",
      "Un’interpretazione dei look condivisi sulla piattaforma cinese Douyin, con fard alto, occhi luminosi e labbra sfumate.",
    ],
    steps: [
      ["Dépose un rose vif haut sur les joues, puis fonds-le vers le bas.", "Place a lively pink high on the cheeks, then blend downwards.", "Aplica un rosa vivo en la parte alta de las mejillas y difumina hacia abajo.", "Applica un rosa vivace in alto sulle guance e sfuma verso il basso."],
      ["Illumine les paupières avec un fard clair et définis les cils par petites sections.", "Brighten the lids with a light shadow and define the lashes in small sections.", "Ilumina los párpados con sombra clara y define las pestañas en secciones pequeñas.", "Illumina le palpebre con un ombretto chiaro e definisci le ciglia a piccoli gruppi."],
      ["Concentre le rouge au centre des lèvres et tapote vers le contour.", "Concentrate colour at the centre of the lips and dab towards the edges.", "Concentra el color en el centro de los labios y extiéndelo a toques hacia los bordes.", "Concentra il colore al centro delle labbra e picchietta verso i bordi."],
    ],
    backdrop: "#F8DDEB",
    layers: [
      { area: "joues", tool: "blush", name: names.hibiscus, hex: "#EA487B", intensity: 88, placement: "blush-under-eyes" },
      { area: "joues", tool: "highlighter", name: names.petal, hex: "#FAD8DE", intensity: 51, placement: "highlight-center" },
      { area: "yeux", tool: "eyeshadow", name: names.champagne, hex: "#FFD1E0", intensity: 78, details: { shadow: { zone: "inner" } } },
      { area: "yeux", tool: "mascara", name: names.espresso, hex: "#36202A", intensity: 90 },
      { area: "levres", tool: "lip", name: names.cherry, hex: "#C32252", intensity: 86 },
    ],
    source: { publication: "Allure", url: "https://www.allure.com/story/douyin-makeup-trend" },
  },
  {
    id: "soft-glam",
    category: "evening",
    name: ["Soft glam", "Soft glam", "Soft glam", "Soft glam"],
    description: [
      "Un regard neutre et fondu avec des cils définis, des pommettes sculptées en douceur et une bouche bois de rose.",
      "Blended neutral eyes, defined lashes, softly sculpted cheekbones and a rosewood lip.",
      "Ojos neutros y difuminados, pestañas definidas, pómulos suaves y labios palo de rosa.",
      "Occhi neutri e sfumati, ciglia definite, zigomi delicatamente scolpiti e labbra legno di rosa.",
    ],
    steps: [
      ["Travaille une ombre douce sous les pommettes et estompe vers le haut.", "Add soft definition under the cheekbones and blend upwards.", "Define suavemente bajo los pómulos y difumina hacia arriba.", "Definisci delicatamente sotto gli zigomi e sfuma verso l’alto."],
      ["Fonds un fard brun neutre sur la paupière et définis les cils.", "Blend neutral brown shadow over the lids and define the lashes.", "Difumina una sombra marrón neutra sobre el párpado y define las pestañas.", "Sfuma un ombretto marrone neutro sulle palpebre e definisci le ciglia."],
      ["Ajoute du blush vers les tempes et un rouge bois de rose.", "Add blush towards the temples and finish with a rosewood lip.", "Aplica colorete hacia las sienes y termina con labios palo de rosa.", "Aggiungi fard verso le tempie e completa con labbra legno di rosa."],
    ],
    backdrop: "#EEDBD4",
    layers: [
      { area: "joues", tool: "contour", name: names.cocoa, hex: "#724039", intensity: 58, placement: "contour-cheeks" },
      { area: "joues", tool: "blush", name: names.peach, hex: "#C26367", intensity: 63, placement: "blush-lifted" },
      { area: "yeux", tool: "eyeshadow", name: names.cocoa, hex: "#92675B", intensity: 76, details: { shadow: { zone: "crease" } } },
      { area: "yeux", tool: "mascara", name: names.espresso, hex: "#352434", intensity: 95 },
      { area: "levres", tool: "lip", name: names.rosewood, hex: "#94505F", intensity: 74 },
    ],
    source: { publication: "Glamour", url: "https://www.glamour.com/story/soft-glam-makeup" },
  },
  {
    id: "party",
    category: "evening",
    name: ["Soirée / Party", "Party makeup", "Maquillaje de fiesta", "Trucco da festa"],
    description: [
      "Un look orchidée pour la soirée avec une touche de lumière et des lèvres baie.",
      "A party look in orchid tones with a touch of light and a berry lip.",
      "Un look de fiesta en tonos orquídea, con un toque de luz y labios baya.",
      "Un look da festa nei toni orchidea, con un punto luce e labbra color frutti di bosco.",
    ],
    steps: [
      ["Pose un fard violet nacré sur la paupière pour attirer la lumière.", "Place a pearly violet shadow on the lids to catch the light.", "Aplica sombra violeta perlada sobre el párpado para captar la luz.", "Applica un ombretto viola perlato sulle palpebre per catturare la luce."],
      ["Trace un liner prune au ras des cils et illumine les sommets des pommettes.", "Trace a plum liner along the lashes and highlight the tops of the cheeks.", "Traza delineador ciruela junto a las pestañas e ilumina la parte alta de los pómulos.", "Traccia un eyeliner prugna vicino alle ciglia e illumina la parte alta degli zigomi."],
      ["Applique une teinte baie sur les lèvres en modulant son intensité.", "Build a berry lip colour to the intensity you want.", "Modula la intensidad del color baya en los labios.", "Modula l’intensità del colore frutti di bosco sulle labbra."],
    ],
    backdrop: "#E9DCF7",
    layers: [
      { area: "joues", tool: "blush", name: names.mauve, hex: "#B45086", intensity: 61, placement: "blush-draped" },
      { area: "joues", tool: "highlighter", name: names.petal, hex: "#F5B9DF", intensity: 80, placement: "highlight-cheekbones" },
      { area: "yeux", tool: "eyeshadow", name: names.orchid, hex: "#9057D9", intensity: 100, details: { shadow: { zone: "lid" } } },
      { area: "yeux", tool: "eyeliner", name: names.plumInk, hex: "#4D1C59", intensity: 100, details: { liner: { style: "classic" } } },
      { area: "levres", tool: "lip", name: names.berry, hex: "#82144A", intensity: 92 },
    ],
    source: { publication: "British Vogue", url: "https://www.vogue.co.uk/beauty/article/party-make-up-expert-tips" },
  },
  {
    id: "smoky",
    category: "evening",
    name: ["Smoky eye", "Smoky eye", "Ojos ahumados", "Smoky eye"],
    description: [
      "Un regard intensifié par un dégradé charbon. La couleur part du ras des cils et se diffuse autour de l’œil.",
      "A charcoal haze that starts at the lash line and softens around the eye.",
      "Un ahumado carbón que nace junto a las pestañas y se difumina alrededor del ojo.",
      "Una sfumatura carbone che parte dall’attaccatura delle ciglia e si ammorbidisce intorno all’occhio.",
    ],
    steps: [
      ["Pose un crayon foncé au ras des cils et estompe le trait avec un petit pinceau.", "Apply a dark pencil at the lash line and soften it with a small brush.", "Aplica un lápiz oscuro junto a las pestañas y suavízalo con un pincel pequeño.", "Applica una matita scura all’attaccatura delle ciglia e ammorbidiscila con un pennello piccolo."],
      ["Superpose un fard charbon et diffuse progressivement ses bords.", "Layer charcoal shadow and gradually diffuse the edges.", "Superpón una sombra carbón y difumina los bordes poco a poco.", "Sovrapponi un ombretto carbone e sfuma i bordi gradualmente."],
      ["Termine par une bouche rose brun peu intense.", "Finish with a subdued rosy-brown lip.", "Termina con un rosa tostado discreto en los labios.", "Completa con un rosa bruno discreto sulle labbra."],
    ],
    backdrop: "#DCD9E8",
    layers: [
      { area: "yeux", tool: "eyeshadow", name: names.charcoal, hex: "#332D42", intensity: 100, details: { shadow: { zone: "whole" } } },
      { area: "yeux", tool: "eyeliner", name: names.plumInk, hex: "#211726", intensity: 100, details: { liner: { style: "classic" } } },
      { area: "yeux", tool: "mascara", name: names.charcoal, hex: "#231B2A", intensity: 95 },
      { area: "levres", tool: "lip", name: names.pinkBrown, hex: "#9D5862", intensity: 44 },
    ],
    source: { publication: "Allure", url: "https://www.allure.com/story/pro-tips-for-applying-smoky-under-eye-makeup" },
  },
  {
    id: "sun-kissed",
    category: "everyday",
    name: ["Effet soleil", "Sun-kissed makeup", "Efecto bronceado", "Effetto baciato dal sole"],
    description: [
      "Un voile chaud sur les parties saillantes du visage et une pointe d’abricot sur les joues et le nez.",
      "A warm veil across the high points of the face, with apricot on the cheeks and nose.",
      "Un velo cálido en los puntos altos del rostro, con albaricoque en mejillas y nariz.",
      "Un velo caldo sui punti alti del viso, con albicocca su guance e naso.",
    ],
    steps: [
      ["Balaie un bronzer chaud sur le haut du front, les pommettes et l’arête du nez.", "Sweep a warm bronzer across the upper forehead, cheekbones and bridge of the nose.", "Aplica bronceador cálido en la parte alta de la frente, los pómulos y el puente de la nariz.", "Sfuma un bronzer caldo sulla parte alta della fronte, sugli zigomi e sul ponte del naso."],
      ["Tapote un blush abricot sur les joues et fonds-le sur l’arête du nez.", "Tap apricot blush onto the cheeks and blend a little across the bridge.", "Da toques de colorete albaricoque en las mejillas y difumina un poco sobre el puente.", "Picchietta fard albicocca sulle guance e sfumane un po’ sul ponte del naso."],
      ["Ajoute un baume léger dans la même famille chaude.", "Add a sheer balm in the same warm colour family.", "Añade un bálsamo ligero de la misma familia cálida.", "Aggiungi un balsamo leggero della stessa famiglia calda."],
    ],
    backdrop: "#F8E3D0",
    layers: [
      { area: "joues", tool: "bronzer", name: names.terracotta, hex: "#9E4A31", intensity: 68, placement: "bronzer-sun" },
      { area: "joues", tool: "blush", name: names.apricot, hex: "#F38B69", intensity: 71, placement: "blush-sun-kissed" },
      { area: "levres", tool: "lip", name: names.apricot, hex: "#BD6449", intensity: 58 },
    ],
    source: { publication: "Allure", url: "https://www.allure.com/story/best-liquid-bronzer" },
  },
  {
    id: "latte",
    category: "everyday",
    name: ["Latte monochrome", "Monochrome latte", "Latte monocromático", "Latte monocromatico"],
    description: [
      "Des tons café et caramel repris sur les yeux, les joues et les lèvres.",
      "Coffee and caramel tones echoed across eyes, cheeks and lips.",
      "Tonos café y caramelo repetidos en ojos, mejillas y labios.",
      "Toni caffè e caramello ripresi su occhi, guance e labbra.",
    ],
    steps: [
      ["Choisis une famille de bruns chauds et varie la profondeur d’une zone à l’autre.", "Choose a warm brown family and vary its depth from one area to another.", "Elige una familia de marrones cálidos y varía su profundidad de una zona a otra.", "Scegli una famiglia di marroni caldi e varia la profondità da una zona all’altra."],
      ["Fonds un fard caramel sur les paupières et un bronzer brun sur les pommettes.", "Blend caramel shadow over the lids and brown bronzer along the cheekbones.", "Difumina sombra caramelo en los párpados y bronceador marrón en los pómulos.", "Sfuma ombretto caramello sulle palpebre e bronzer marrone sugli zigomi."],
      ["Termine par un rouge brun dans la même famille.", "Finish with a brown lip from the same colour family.", "Termina con labios marrones de la misma familia de color.", "Completa con labbra marroni della stessa famiglia cromatica."],
    ],
    backdrop: "#EADACA",
    layers: [
      { area: "joues", tool: "bronzer", name: names.cocoa, hex: "#885239", intensity: 72, placement: "bronzer-cheeks" },
      { area: "joues", tool: "blush", name: names.honey, hex: "#B17851", intensity: 54, placement: "blush-lifted" },
      { area: "yeux", tool: "eyeshadow", name: names.caramel, hex: "#B27449", intensity: 84, details: { shadow: { zone: "lid" } } },
      { area: "levres", tool: "lip", name: names.cocoa, hex: "#814A3B", intensity: 77 },
    ],
    source: { publication: "Vogue", url: "https://www.vogue.com/article/viral-latte-makeup-trend-bronzed-goddess-beauty" },
  },
  {
    id: "graphic",
    category: "creative",
    name: ["Liner graphique", "Graphic liner", "Delineado gráfico", "Eyeliner grafico"],
    description: [
      "Un trait cobalt qui prolonge le regard et devient l’accent du maquillage.",
      "A cobalt line extends the eye and becomes the focus of the look.",
      "Una línea cobalto alarga la mirada y se convierte en el punto focal del look.",
      "Un tratto cobalto allunga lo sguardo e diventa il punto focale del trucco.",
    ],
    steps: [
      ["Repère la direction du trait au coin externe, les yeux ouverts.", "Mark the direction at the outer corner while looking straight ahead.", "Marca la dirección en el extremo exterior con los ojos abiertos.", "Segna la direzione all’angolo esterno con gli occhi aperti."],
      ["Trace une ligne cobalt au ras des cils et étire une petite pointe.", "Trace cobalt along the lashes and extend a small wing.", "Traza una línea cobalto junto a las pestañas y alarga una punta.", "Traccia una linea cobalto all’attaccatura delle ciglia e allunga una piccola punta."],
      ["Garde une touche fine de rose sur les lèvres pour laisser le trait dominer.", "Keep a light touch of rose on the lips so the liner stays in focus.", "Pon un toque rosa suave en los labios para que el delineado destaque.", "Aggiungi un velo di rosa sulle labbra per lasciare l’eyeliner in primo piano."],
    ],
    backdrop: "#DEE7FF",
    layers: [
      { area: "yeux", tool: "eyeliner", name: names.cobalt, hex: "#1954D4", intensity: 100, details: { liner: { style: "graphic" } } },
      { area: "levres", tool: "lip", name: names.mutedRose, hex: "#BA687C", intensity: 40 },
    ],
    source: { publication: "Allure", url: "https://www.allure.com/story/winged-eyeliner-trends-instagram" },
  },
];

export function makeMakeupStyleExample(style: MakeupGuideStyle, portrait: GuidePortrait, language: number) {
  const snapshot: StudioLookSnapshot = { portrait, layers: {}, placements: {}, setting: null };
  const pigments: PigmentLayer[] = [];

  for (const layer of style.layers) {
    const { area, tool, hex, intensity, placement, details } = layer;
    const name = layer.name[language];
    snapshot.layers[area] = {
      ...snapshot.layers[area],
      [tool]: { name, hex, intensity, details },
    };
    if (placement) snapshot.placements[tool] = placement;
    pigments.push({
      effect: "tinted", kind: tool, hex, name, opacity: intensity / 100, placement, details,
      stepId: `${style.id}-${tool}`, productName: name, zone: area,
    });
  }

  return { preset: { name: style.name[language], snapshot } satisfies MakeupStylePreset, pigments };
}
