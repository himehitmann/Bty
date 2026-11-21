import type { Product } from "./model";

type Shade = readonly [id: string, name: string, barcode?: string, hex?: string, ingredients?: string];

function makeProduct(
  id: string,
  brand: string,
  name: string,
  manufacturerUrl: string,
  makeupKind: NonNullable<Product["makeupKind"]>,
  shades: readonly Shade[],
  options?: {
    directions?: string;
    directionsUrl?: string;
    ingredients?: string;
    paoMonths?: number;
    finish?: string;
    size?: string;
    makeupEffect?: Product["makeupEffect"];
  },
): Product {
  return {
    id: `manufacturer-${id}`,
    brand,
    name,
    category: "maquillage",
    ingredients: options?.ingredients ?? "",
    manufacturerUrl,
    source: "manufacturer",
    makeupKind,
    makeupEffect: options?.makeupEffect ?? "tinted",
    finish: options?.finish,
    size: options?.size,
    paoMonths: options?.paoMonths,
    usageInstructions: options?.directions
      ? { source: "manufacturer", url: options.directionsUrl ?? manufacturerUrl, text: options.directions }
      : undefined,
    variants: shades.map(([id, name, barcode, shadeHex, ingredients]) => ({
      id,
      name,
      barcode,
      shadeHex,
      shadeApproximate: shadeHex ? true : undefined,
      ingredients,
      sourceUrl: brand === "fwee" ? `${manufacturerUrl}?variant=${id}` : manufacturerUrl,
    })),
  };
}

const cashmereNudeInci = [
  "Dimethicone", "Cyclopentasiloxane", "Dimethicone/Vinyl Dimethicone Crosspolymer", "Dimethicone Crosspolymer",
  "Polyglyceryl-2 Triisostearate", "Isododecane", "Titanium Dioxide (CI 77891)", "Cyclohexasiloxane", "Pentylene Glycol",
  "PEG-10 Dimethicone", "Iron Oxides (CI 77491)", "Caprylyl Glycol", "Disteardimonium Hectorite", "Red 7 Lake (CI 15850)",
  "Tocopheryl Acetate", "Fragrance", "Iron Oxides (CI 77499)", "Propylene Carbonate", "Red 27 (CI 45410)",
  "Caprylic/Capric Triglyceride", "Helianthus Annuus (Sunflower) Seed Oil", "Calendula Officinalis Flower Oil",
  "Rosa Canina Fruit Extract", "Rose Extract",
].join(", ");

const daffodilInci = [
  "Dimethicone", "Cyclopentasiloxane", "Dimethicone Crosspolymer", "Dimethicone/Vinyl Dimethicone Crosspolymer",
  "Polyglyceryl-2 Triisostearate", "Isododecane", "Cyclohexasiloxane", "Titanium Dioxide", "Iron Oxide Red",
  "Iron Oxide Yellow", "1,2-Hexanediol", "Lithol Rubine BCA", "Disteardimonium Hectorite", "Phenoxyethanol",
  "PEG-10 Dimethicone", "Tocopheryl Acetate", "Propylene Carbonate", "Tetrachlorotetrabromofluorescein",
  "Caprylic/Capric Triglyceride", "Helianthus Annuus (Sunflower) Seed Oil", "Calendula Officinalis Flower Oil",
  "Rosa Canina Fruit Extract", "Rose Extract", "Coumarin",
].join(", ");

const mapleToastInci = [
  "Talc", "Silica", "Caprylic/Capric Triglyceride", "Magnesium Myristate", "Synthetic Fluorphlogopite",
  "Octyldodecyl Stearoyl Stearate", "Caprylyl Glycol", "Dipentaerythrityl Hexahydroxystearate/Hexastearate/Hexarosinate",
  "Diisostearyl Malate", "Triethoxycaprylylsilane", "Glyceryl Caprylate", "Ethylhexylglycerin",
  "Aluminum Hydroxide", "Tocopherol",
].join(", ") + ", [+/- May contain CI 77891 / Titanium Dioxide, CI 77491, CI 77492, CI 77499 / Iron Oxides, CI 77007 / Ultramarines, CI 19140 / Yellow 5 Lake]";

const puddingOhInci = [
  "Dimethicone", "Dimethicone Crosspolymer", "Tribehenin", "Diisostearyl Malate", "Titanium Dioxide (CI 77891)",
  "Synthetic Fluorphlogopite", "Cetyl PEG/PPG-10/1 Dimethicone", "Sorbitan Isostearate",
  "Vinyl Dimethicone/Methicone Silsesquioxane Crosspolymer", "Polyglyceryl-2 Triisostearate", "Polyhydroxystearic Acid",
  "Iron Oxides (CI 77492)", "Lecithin", "Red 7 Lake (CI 15850)", "Disteardimonium Hectorite", "Red 6 (CI 15850)",
  "Polyglyceryl-2 Diisostearate", "Ethylhexyl Palmitate", "Isopropyl Myristate", "Isostearic Acid",
  "Polyglyceryl-3 Polyricinoleate", "Triethyl Citrate", "Caprylyl Glycol", "Fragrance (Parfum)", "Glyceryl Caprylate",
  "Iron Oxides (CI 77499)", "Blue 1 Lake (CI 42090)", "Theobroma Cacao (Cocoa) Seed Butter", "Butylene Glycol",
  "Water", "Agave Tequilana Leaf Extract",
].join(", ");

const jellyHoneyPeachInci = [
  "Octyldodecanol", "Hydrogenated Polyisobutene", "Bis-Behenyl/Isostearyl/Phytosteryl Dimer Dilinoleyl Dimer Dilinoleate",
  "Polyglyceryl-2 Triisostearate", "Ethylcellulose", "Microcrystalline Wax", "Paraffin", "Synthetic Wax",
  "Phenoxyethanol", "Fragrance", "Titanium Dioxide (CI 77891)", "Yellow 6 Lake", "Red 7", "Red 6",
].join(", ");

// Names, shade identifiers and GTINs come from the linked official storefronts.
// 3CE and fwee Pudding Pot colours are published picker values. Jelly Pot colours
// approximate the centre of its digital swatches. Shade INCI belongs only to that shade.
export const otherKoreanMakeupCatalog: readonly Product[] = [
  makeProduct("3ce-velvet", "3CE", "Velvet Lip Tint",
    "https://www.3cecosmetics.com/all-products/lips/lip-tint/3ce-velvet-lip-tint", "lip", [
      ["ab6b3120-30ba-40f8-9ee5-0d701d28a3af", "Cashmere Nude", "8809664983863", "#b44d4d", cashmereNudeInci],
      ["a99e798f-9311-43cf-ad1c-409ce1880179", "DAFFODIL", "8809437396616", "#c33c32", daffodilInci],
      ["a9df07bd-6fbf-425b-9d8c-d7fbcb354c82", "Childlike", "8809437396593", "#e31b03"],
      ["a1dcf496-4b7e-45e9-9b5e-c6b9dde5487e", "Best Ever", "8809437396685", "#e40b23"],
      ["2fb57af0-d769-4176-80a3-c57107579f40", "Pink Break", "8809437396609", "#e44a61"],
      ["fd6bbaae-85ed-4442-81dd-d7977763044a", "Going Right", "8809437396623", "#d1534a"],
      ["d7e006f6-ca78-437e-b541-4f9468335f6e", "Private", "8809437396630", "#b60000"],
      ["ca658011-b10d-4720-a544-f59dd3b0047b", "New Nude", "8809437396654", "#d2735a"],
      ["ac557f26-d3e8-462e-b2a3-fd34e4a5b05b", "Taupe", "8809437396678", "#7d0d01"],
      ["c7538d67-a238-4589-a28b-33f45c2d5900", "Go Now", "8809437397514", "#cb758e"],
      ["a8f6d8bf-32d7-464b-af55-c6299b87ba5f", "Know Better", "8809437397521", "#a53456"],
      ["004a7453-88a0-4c2d-ad8d-aaf209034d0f", "Speak Up", "8809664980381", "#952517"],
      ["60e63c15-d403-4ac3-a6cf-f26b1d45d7cb", "Think Again", "8809664981449", "#d25a49"],
      ["35f36197-2563-432f-901f-28ef316706e1", "Bitter Hour", "8809664983894", "#732815"],
      ["1ec5a96c-0a4e-4ff1-9e21-4044a70733ae", "Definition", "8809664983870", "#701c1f"],
      ["84447661-4094-4504-ac1d-75bbd8fe310c", "Like Gentle", "8809664983856", "#c76959"],
      ["de122718-1921-46d9-82a0-5dcf39dbd26d", "Walk N Talk", "8809664983887", "#ae5742"],
      ["383549aa-8e16-4942-8da3-0675be66c051", "Cozy Crush", "8809939530358", "#b45d63"],
      ["309bc6b1-4d43-4659-8979-9468509b9570", "Fade In", "8809939530365", "#894753"],
    ], { finish: "Mat velouté", size: "4 g", directions: "Dépose une quantité adaptée sur les lèvres et répartis la couleur doucement." }),
  makeProduct("3ce-blush", "3CE", "Color Baker Face Blush",
    "https://www.3cecosmetics.com/all-products/cheeks/blush/3ce-color-baker-face-blush", "blush", [
      ["681f1553-5448-4760-916f-976e68bbef51", "MAPLE TOAST", "8809939537500", "#DEA097", mapleToastInci],
    ], { ingredients: mapleToastInci, paoMonths: 24, finish: "Poudré soyeux", size: "5,5 g",
      directions: "Prélève un peu de poudre au pinceau puis tapote le bombé des joues." }),
  makeProduct("fwee-pudding", "fwee", "Blurry Pudding Pot",
    "https://fwee.us/products/pudding-pot", "lip", [
      ["45907150307477", "ND01 Oh! (Cool Pink)", "8809652582481", "#ee92a4", puddingOhInci],
      ["45907150340245", "ND02 Like (Light Pink)", "8809652582498", "#fc9cb0"],
      ["45907150373013", "ND03 Without (Beige Pink)", "8809652582504", "#cf7f7d"],
      ["45907150405781", "ND04 My (Peachy Nude)", "8809652582511", "#e1867c"],
      ["45907150438549", "ND05 Be (Brownish Nude)", "8809652582528", "#d0785d"],
      ["45907150471317", "CR01 Dear (Coral Brown)", "8809652582535", "#d66a5a"],
      ["45907150504085", "CR02 Boy (Bright Coral)", "8809652582542", "#f66667"],
      ["45907150536853", "CR03 BFF (Pink Coral)", "8809652582559", "#f65571"],
      ["45907150569621", "CR04 Seventeen (Sunny Coral)", "8809652582566", "#df5f61"],
      ["45907150602389", "CR05 Girls (Coral Red)", "8809652582573", "#e13f40"],
      ["45907150635157", "PK01 Baby (Soft Pink)", "8809652582580", "#e17c8c"],
      ["45907150667925", "PK02 Skirt (Peachy Pink)", "8809652582597", "#eb6f71"],
      ["45907150700693", "PK03 Cherry (Vibrant Pink)", "8809652582603", "#e3587b"],
      ["45907150733461", "PK04 Crush (Vivid Pink)", "8809652582610", "#ce3f66"],
      ["45907150766229", "PK05 Sth (Dusty Pink)", "8809652582627", "#d06c78"],
      ["45907150798997", "RD01 D-day (Neon Red)", "8809652582634", "#fa444e"],
      ["45907150831765", "RD02 Mule (Pink Red)", "8809652582641", "#d7164c"],
      ["45907150864533", "RD03 Ambitious (Warm Red)", "8809652582658", "#c23631"],
      ["45907150897301", "RD04 Fav (Tanned Brown)", "8809652582665", "#a54037"],
      ["45907150930069", "RD05 Greedy (Plum Red)", "8809652582672", "#a32d4b"],
      ["45907150962837", "MV01 Chill'n (Rich Brown)", "8809652582689", "#a8504a"],
      ["45907150995605", "MV02 Hurt (Mauve Brown)", "8809652582696", "#c25d66"],
      ["45907151028373", "MV03 Baddie (Mauve Berry)", "8809652582702", "#af3955"],
      ["45907151061141", "MV04 Slayyy (Smoky Mauve)", "8809652582719", "#a55961"],
      ["45907151093909", "MV05 Boss (Deep Plum)", "8809652582726", "#74363e"],
      ["45907151126677", "RS01 Feel'n (Rose Beige)", "8809652582733", "#ca6859"],
      ["45907151159445", "RS02 Lyrics (Rose Brown)", "8809652582740", "#bb503e"],
      ["45907151192213", "RS03 Faded (Dusty Rose)", "8809652582757", "#bc6d6d"],
      ["45907151224981", "RS04 Memories (Deep Rose)", "8809652582764", "#c65353"],
      ["45907151257749", "RS05 Film (Rosy Mauve)", "8809652582771", "#ba505b"],
      ["45907151290517", "BS01 Cool (Lavender Pink)", "8809652585659", "#e4a8bf"],
      ["45907151323285", "BS02 Into (Nude Pink)", "8809652585666", "#e5a5aa"],
      ["45907151356053", "BS03 Bubble (Peony Pink)", "8809652585673", "#e97e99"],
      ["45907151388821", "BS04 Breeze (Berry Pink)", "8809652585680", "#e068a2"],
      ["45907151421589", "BS05 Wavy (Muted Pink)", "8809652585697", "#dd7284"],
    ], { finish: "Mat flouté",
      directions: "Tapote une petite quantité au centre des lèvres puis estompe vers les bords. Sur les joues, dépose par touches et estompe du bout des doigts ou avec un applicateur." }),
  makeProduct("fwee-jelly", "fwee", "Glowy Jelly Pot",
    "https://fwee.us/products/jelly-pot", "lip", [
      ["45907769753749", "JC01 Honey Peach (Vivid Coral)", "8809652585536", "#eb4253", jellyHoneyPeachInci],
      ["45907769786517", "JC02 Mellow Mango (Natural Coral)", "8809652585598", "#eb6579"],
      ["45907769819285", "JC03 Juicy Punch (Vivid Rose)", "8809652585734", "#e7577c"],
      ["45907769852053", "JP01 Sugar Coat (Coral Pink)", "8809652585543", "#f9678d"],
      ["45907769884821", "JP02 Lolly (Candy Pink)", "8809652585604", "#ea5587"],
      ["45907769917589", "JP03 Sweets (Bubblegum Pink)", "8809652585741", "#e778a3"],
      ["45907769950357", "JR01 Squeezed (Vibrant Red)", "8809652585550", "#d82a45"],
      ["45907769983125", "JR02 Sour Gummy (Berry Red)", "8809652585611", "#c91864"],
      ["45907770015893", "JR03 Cherryppo (Cherry Red)", "8809652585727", "#980842"],
      ["45907770048661", "JN01 Lavender Whip (Creamy Lavender)", "8809652585567", "#d98bb9"],
      ["45907770081429", "JN02 Milky (Creamy Pink)", "8809652585628", "#eb92b5"],
      ["45907770114197", "JN03 Custard (Warm Beige)", "8809652585758", "#e17273"],
      ["45907770146965", "JS01 Rosy Glaze (Dusty Rose)", "8809652585574", "#b85058"],
      ["45907770179733", "JS02 Caramelized (Rosy Brown)", "8809652585635", "#a84d49"],
      ["45907770212501", "JS03 Couverture (Berry Choco)", "8809652585765", "#832e38"],
      ["45907770245269", "JM01 Compote (Mauve Berry)", "8809652585581", "#b1395d"],
      ["45907770278037", "JM02 Berry Jam (Peony Pink)", "8809652585642", "#cd5380"],
      ["45907770310805", "JM03 Cream Tea (Muted Mauve)", "8809652585772", "#b96b7a"],
      ["45907770343573", "JH00 Sugar Powder (Shimmer Balm)", "8809652585789"],
    ], { finish: "Brillant effet gelée",
      directions: "Assouplis la surface du produit du bout du doigt ou avec un applicateur en silicone, puis tapote sur les lèvres ou les joues." }),
  makeProduct("hince-balm", "hince", "True Dimension Radiance Balm",
    "https://hince.co.kr/product/%ED%8A%B8%EB%A3%A8-%EB%94%94%EB%A9%98%EC%85%98-%EB%9E%98%EB%94%94%EC%96%B8%EC%8A%A4-%EB%B0%A4/776/", "highlighter", [
      ["P0000BDW00CY", "클리어"],
      ["P0000BDW00CZ", "라이트"],
      ["P0000BDW00DA", "텐더 룸"],
      ["P0000BDW00DB", "다운 레이"],
      ["P0000BDW00DC", "글리밍"],
      ["P0000BDW00DD", "쉘리 핑크"],
      ["P0000BDW00DE", "릴 모브"],
      ["P0000BDW00DF", "오드 로즈"],
      ["P0000BDW00DG", "비터 로즈"],
      ["P0000BDW00DH", "브론즈"],
      ["P0000BDW00DI", "하쉬"],
      ["P0000BDW00DJ", "(GLIT ANGEL) 프리징"],
    ], { makeupEffect: "unknown", finish: "Lumineux", size: "10 g", directionsUrl: "https://hince.jp/c/category/face/HC021",
      directions: "Étale une fine couche sur les zones à illuminer, par exemple les joues ou le contour des yeux." }),
  makeProduct("hince-tint", "hince", "Raw Glow Gel Tint",
    "https://hince.co.kr/product/%EB%A1%9C-%EA%B8%80%EB%A1%9C%EC%9A%B0-%EC%A0%A4-%ED%8B%B4%ED%8A%B8/1112/", "lip", [
      ["raw-glow-angelic", "(GLIT ANGEL) 엔젤릭"],
      ["raw-glow-44", "(이노마PICK/BASE) 44 크리미"],
      ["raw-glow-45", "(이노마PICK/WARM) 45 베이키"],
      ["raw-glow-46", "(이노마PICK/COOL) 46 칠리쉬"],
      ["raw-glow-01", "01 베어"],
      ["raw-glow-02", "02 로 로즈"],
      ["raw-glow-03", "03 로프리콧"],
      ["raw-glow-04", "04 피버"],
      ["raw-glow-05", "05 히비스커스"],
      ["raw-glow-06", "06 로 그레이프"],
      ["raw-glow-07", "07 칠"],
      ["raw-glow-08", "08 레어"],
      ["raw-glow-09", "09 로 라일락"],
      ["raw-glow-10", "10 로 체리"],
      ["raw-glow-11", "11 차이"],
      ["raw-glow-12", "12 로 휘그"],
      ["raw-glow-13", "13 핑크 페퍼"],
      ["raw-glow-14", "14 로 코코"],
      ["raw-glow-15", "15 바이트"],
      ["raw-glow-16", "16 로 베리"],
      ["raw-glow-17", "17 로 피치"],
      ["raw-glow-26", "26 로즈 프레소"],
      ["raw-glow-27", "27 얼루어 로즈"],
      ["raw-glow-31", "31 베이그"],
      ["raw-glow-32", "32 딤 얼루어"],
      ["raw-glow-33", "33 뎁스"],
      ["raw-glow-34", "34 오드 로즈"],
      ["raw-glow-39", "39 로젤"],
      ["raw-glow-40", "40 바닐라 빈"],
      ["raw-glow-41", "41 시나몬"],
    ]),
];
