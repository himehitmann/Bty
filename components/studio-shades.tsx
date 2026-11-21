import { useState, type CSSProperties } from "react";
import { useLocale } from "@/lib/i18n";
import type { Product } from "@/lib/model";
import type { StudioArea, StudioTool } from "@/lib/studio-looks";
import styles from "./makeup-studio.module.css";

export type ProductShade = {
  id: string;
  product: Product;
  label: string;
  group: "owned" | "trial";
  selection?: { area: StudioArea; tool: Exclude<StudioTool, "setting-powder"> };
  hex?: string;
  variantId?: string;
  approximate?: boolean;
};

export type Swatch = {
  id: string;
  label: string;
  hex: string;
  group: ProductShade["group"] | "palette" | "custom";
  approximate?: boolean;
  apply: () => void;
};

export function ProductShades({ choices, value, onSelect }: {
  choices: ProductShade[];
  value?: string;
  onSelect: (choice?: ProductShade) => void;
}) {
  const { t } = useLocale();
  const selected = choices.find((choice) => choice.id === value);
  const groups = [
    { id: "owned", label: t("Dans ma trousse", "In my makeup bag") },
    { id: "trial", label: t("À essayer", "To try") },
  ] as const;

  if (!choices.length) return <p className={styles.sourceHint}>{t("Les maquillages de ta trousse et ceux que tu essaies depuis le catalogue s’afficheront ici.", "Makeup in your bag and products you try from the catalogue appear here.")}</p>;

  return <fieldset className={styles.productShades}>
    <legend>{t("Produits de maquillage", "Makeup products")}</legend>
    <label>{t("Choisir un produit", "Choose a product")}
      <select value={selected?.id ?? ""} onChange={(event) => onSelect(choices.find((choice) => choice.id === event.target.value))}>
        <option value="">{t("Sans produit", "Without a product")}</option>
        {groups.map(({ id, label }) => {
          const options = choices.filter((choice) => choice.group === id);
          return options.length > 0 && <optgroup key={id} label={label}>
            {options.map((choice) => <option key={choice.id} value={choice.id}>
              {choice.label}{choice.product.brand && ` · ${choice.product.brand}`}
            </option>)}
          </optgroup>;
        })}
      </select>
    </label>
    {selected && (selected.hex ? <p className={styles.swatchLabel}>
      <span aria-hidden="true" style={{ backgroundColor: selected.hex }}/>{selected.hex.toUpperCase()}
      {selected.approximate && <small>{t("Aperçu approximatif", "Approximate preview")}</small>}
    </p> : <p className={styles.sourceHint}>
      {t("La source ne donne pas de couleur numérique. Choisis ta propre couleur ou prélève-la sur une photo.", "The source has no digital shade. Choose your own colour or sample it from a photo.")}
    </p>)}
  </fieldset>;
}

export function SwatchComparison({ choices, skinTone }: { choices: Swatch[]; skinTone: string }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [first, setFirst] = useState<string>();
  const [second, setSecond] = useState<string>();
  const left = choices.find(({ id }) => id === first) ?? choices[0];
  const right = choices.find(({ id }) => id === second) ?? choices.find(({ id }) => id !== left?.id);
  const groups = [
    { id: "owned", label: t("Dans ma trousse", "In my makeup bag") },
    { id: "trial", label: t("À essayer", "To try") },
    { id: "palette", label: t("Mes teintes enregistrées", "My saved shades") },
    { id: "custom", label: t("Couleur personnalisée", "Custom colour") },
  ] as const;
  const optionGroups = expanded ? groups.map(({ id, label }) => {
    const options = choices.filter((choice) => choice.group === id);
    return options.length > 0 && <optgroup key={id} label={label}>
      {options.map((choice) => <option key={choice.id} value={choice.id}>{choice.label} · {choice.hex.toUpperCase()}</option>)}
    </optgroup>;
  }) : [];

  return <details className={styles.swatchComparison} onToggle={(event) => setExpanded(event.currentTarget.open)}>
    <summary>{t("Comparer des teintes", "Compare shades")}</summary>
    {expanded && <>
      <p className={styles.sourceHint}>{t("Observe les couleurs côte à côte sur la carnation choisie. La lumière et la texture du produit changent le résultat réel.", "See colours side by side against the chosen skin tone. Lighting and product texture affect the actual result.")}</p>
      {!left ? <p className={styles.sourceHint}>{t("Choisis une couleur, ajoute une teinte depuis une photo ou essaie un produit avec une teinte disponible.", "Choose a colour, add a shade from a photo or try a product with an available shade.")}</p> :
        <div className={styles.swatchPair}>
          {[{ position: "A", shade: left, select: setFirst }, { position: "B", shade: right, select: setSecond }].map(({ position, shade, select }) =>
            <div key={position} className={styles.swatchCard}>
              <label>{t(`Teinte ${position}`, `Shade ${position}`)}
                <select value={shade?.id ?? ""} onChange={(event) => select(event.target.value)}>
                  <option value="" disabled>{t("Choisir une teinte", "Choose a shade")}</option>
                  {optionGroups}
                </select>
              </label>
              {shade && <>
                <div className={styles.onSkinSwatch} style={{ "--complexion": skinTone, "--swatch": shade.hex } as CSSProperties} aria-hidden="true"/>
                <p className={styles.swatchName}>{shade.label}</p>
                <p className={styles.swatchLabel}>{shade.hex.toUpperCase()}{shade.approximate && <small>{t("Aperçu approximatif", "Approximate preview")}</small>}</p>
                <button type="button" className="button button-secondary" onClick={shade.apply}>{t(`Appliquer ${position}`, `Apply ${position}`)}</button>
              </>}
            </div>
          )}
        </div>}
    </>}
  </details>;
}
