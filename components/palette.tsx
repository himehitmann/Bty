"use client";

import {
  Check,
  Copy,
  ImagePlus,
  Image as ImageIcon,
  Pencil,
  Pipette,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import type { PaletteColor } from "@/lib/model";
import styles from "./palette.module.css";

type PaletteProps = {
  colors: PaletteColor[];
  onChange: (recipe: (colors: PaletteColor[]) => PaletteColor[]) => boolean | void;
  onUpload?: (file: File) => Promise<{ path: string; url: string }>;
  onDiscardUpload?: (path: string) => Promise<void>;
  onResolvePhoto?: (path: string) => Promise<string>;
};

type Point = { x: number; y: number };
type Photo = { pixels: ImageData; suggestions: string[]; path?: string };

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxPhotoBytes = 8 * 1024 * 1024;
const maxPhotoSide = 960;
const maxColors = 200;

function colorHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function suggestColors({ data, width, height }: ImageData) {
  const buckets = new Map<number, { count: number; red: number; green: number; blue: number }>();
  const stride = Math.max(1, Math.floor(Math.sqrt(width * height / 14_000)));

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const offset = 4 * (y * width + x);
      if (data[offset + 3] < 192) continue;

      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const key = ((red >> 5) << 6) | ((green >> 5) << 3) | (blue >> 5);
      const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
      bucket.count += 1;
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
      buckets.set(key, bucket);
    }
  }

  const dominant = [...buckets.values()].sort((a, b) => b.count - a.count);
  const chosen: { red: number; green: number; blue: number }[] = [];
  for (const color of dominant) {
    const red = Math.round(color.red / color.count);
    const green = Math.round(color.green / color.count);
    const blue = Math.round(color.blue / color.count);
    const isDistinct = chosen.every((other) => Math.hypot(red - other.red, green - other.green, blue - other.blue) >= 42);
    if (isDistinct) chosen.push({ red, green, blue });
    if (chosen.length === 6) break;
  }

  return chosen.map(({ red, green, blue }) => colorHex(red, green, blue));
}

async function decodePhoto(file: Blob): Promise<Photo> {
  if (!allowedTypes.includes(file.type)) throw new Error("Choisis une image JPEG, PNG ou WebP.");
  if (file.size > maxPhotoBytes) throw new Error("Choisis une photo de moins de 8 Mo.");

  const url = URL.createObjectURL(file);
  const image = new window.Image();
  image.src = url;

  try {
    try {
      await image.decode();
    } catch {
      throw new Error("Cette photo n’a pas pu être ouverte.");
    }

    const { naturalWidth, naturalHeight } = image;
    if (!naturalWidth || !naturalHeight || naturalWidth * naturalHeight > 50_000_000) {
      throw new Error("Les dimensions de cette photo sont trop grandes.");
    }

    const scale = Math.min(1, maxPhotoSide / Math.max(naturalWidth, naturalHeight));
    const surface = document.createElement("canvas");
    surface.width = Math.max(1, Math.round(naturalWidth * scale));
    surface.height = Math.max(1, Math.round(naturalHeight * scale));
    const context = surface.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Le traitement d’image est indisponible sur ce navigateur.");

    context.drawImage(image, 0, 0, surface.width, surface.height);
    const pixels = context.getImageData(0, 0, surface.width, surface.height);
    return { pixels, suggestions: suggestColors(pixels) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encodePhoto({ pixels }: Photo): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("La photo n’a pas pu être préparée."));
  context.putImageData(pixels, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], "palette.png", { type: "image/png" }));
      else reject(new Error("La photo n’a pas pu être préparée."));
    }, "image/png");
  });
}

function boundedPoint(x: number, y: number, { width, height }: ImageData): Point {
  return {
    x: Math.min(width - 1, Math.max(0, Math.floor(x))),
    y: Math.min(height - 1, Math.max(0, Math.floor(y))),
  };
}

export function Palette({ colors, onChange, onUpload, onDiscardUpload, onResolvePhoto }: PaletteProps) {
  const uploader = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const photoTask = useRef<AbortController | null>(null);
  const focusPhoto = useRef(false);
  const savePending = useRef(false);
  const fileHelp = useId();
  const canvasHelp = useId();
  const nameId = useId();
  const editId = useId();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [savePhoto, setSavePhoto] = useState(true);
  const [editing, setEditing] = useState<PaletteColor | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => photoTask.current?.abort(), []);

  useEffect(() => {
    if (!photo || !canvas.current) return;
    canvas.current.getContext("2d")?.putImageData(photo.pixels, 0, 0);
    if (focusPhoto.current) {
      focusPhoto.current = false;
      canvas.current.focus();
    }
  }, [photo]);

  async function loadPhoto(source: File | string) {
    if (savePending.current) return;
    photoTask.current?.abort();
    const request = new AbortController();
    photoTask.current = request;
    setLoadingPhoto(true);
    setError("");
    setNotice("");

    try {
      let file: Blob;
      let path: string | undefined;

      if (typeof source === "string") {
        if (!onResolvePhoto) return;
        path = source;
        const url = await onResolvePhoto(path);
        const response = await fetch(url, { signal: request.signal, cache: "no-store", credentials: "omit" });
        if (!response.ok) throw new Error("La photo associée est indisponible.");
        file = await response.blob();
      } else {
        file = source;
      }

      const nextPhoto = await decodePhoto(file);
      if (request.signal.aborted) return;
      focusPhoto.current = typeof source === "string";
      setPhoto({ ...nextPhoto, path });
      setSelected(null);
      setCursor(null);
      setName("");
      setNotice("Photo prête. Choisis une couleur.");
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "La photo n’a pas pu être ouverte.");
    } finally {
      if (!request.signal.aborted) setLoadingPhoto(false);
    }
  }

  function pickPixel(point: Point) {
    if (!photo || saving || loadingPhoto) return;
    const { data, width } = photo.pixels;
    const index = 4 * (point.y * width + point.x);
    setCursor(point);
    setError("");

    if (data[index + 3] === 0) {
      setNotice("Ce pixel est transparent. Choisis une autre zone.");
      return;
    }

    const value = colorHex(data[index], data[index + 1], data[index + 2]);
    setSelected(value);
    setNotice(`Couleur sélectionnée ${value}.`);
  }

  function pickAtPointer(event: MouseEvent<HTMLCanvasElement>) {
    if (!photo) return;
    const { width, height } = photo.pixels;
    if (event.detail === 0) {
      pickPixel(cursor ?? boundedPoint(width / 2, height / 2, photo.pixels));
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    pickPixel(boundedPoint((event.clientX - bounds.left) * width / bounds.width, (event.clientY - bounds.top) * height / bounds.height, photo.pixels));
  }

  function moveCursor(event: KeyboardEvent<HTMLCanvasElement>) {
    if (!photo || saving || loadingPhoto) return;
    const { width, height } = photo.pixels;
    const position = cursor ?? boundedPoint(width / 2, height / 2, photo.pixels);
    const stepX = event.shiftKey ? 1 : Math.max(1, Math.round(width / 30));
    const stepY = event.shiftKey ? 1 : Math.max(1, Math.round(height / 30));

    switch (event.key) {
      case "ArrowUp":
        setCursor(boundedPoint(position.x, position.y - stepY, photo.pixels));
        break;
      case "ArrowDown":
        setCursor(boundedPoint(position.x, position.y + stepY, photo.pixels));
        break;
      case "ArrowLeft":
        setCursor(boundedPoint(position.x - stepX, position.y, photo.pixels));
        break;
      case "ArrowRight":
        setCursor(boundedPoint(position.x + stepX, position.y, photo.pixels));
        break;
      case "Enter":
      case " ":
        pickPixel(position);
        break;
      default:
        return;
    }

    event.preventDefault();
  }

  async function saveColor() {
    if (!selected || !photo || savePending.current || loadingPhoto || colors.length >= maxColors) return;
    savePending.current = true;
    setSaving(true);
    setError("");
    setNotice("");

    try {
      let photoPath = savePhoto && photo.path && colors.some((color) => color.photoPath === photo.path)
        ? photo.path : undefined;
      let uploadedPath: string | undefined;
      let photoFailed = false;

      if (onUpload && savePhoto && !photoPath) {
        try {
          const { path } = await onUpload(await encodePhoto(photo));
          photoPath = path;
          uploadedPath = path;
        } catch {
          photoFailed = true;
        }
      }

      const title = name.trim() || selected;
      const swatch = { id: crypto.randomUUID(), hex: selected, name: title, photoPath };
      if (onChange((existing) => [swatch, ...existing]) === false) {
        if (uploadedPath) void onDiscardUpload?.(uploadedPath).catch(() => {});
        setError("La teinte n’a pas pu être ajoutée.");
        return;
      }
      if (uploadedPath) setPhoto({ ...photo, path: uploadedPath });
      setName("");
      setNotice(`${title} a été ajoutée à tes teintes.`);
      if (photoFailed) setError("La teinte est enregistrée. La copie de la photo dans ton compte a échoué.");
    } catch {
      setError("L’enregistrement de la teinte a échoué. Réessaie.");
    } finally {
      savePending.current = false;
      setSaving(false);
    }
  }

  function removeColor(color: PaletteColor) {
    if (savePending.current) return;
    if (onChange((existing) => existing.filter((item) => item.id !== color.id)) === false) return;
    setEditing((active) => active?.id === color.id ? null : active);
    setError("");
    setNotice(`${color.name} a été retirée.`);

    const path = color.photoPath;
    if (path && !colors.some((item) => item.id !== color.id && item.photoPath === path)) {
      setPhoto((active) => active?.path === path ? { ...active, path: undefined } : active);
    }
  }

  async function copyColor(hex: string) {
    setNotice("");
    setError("");
    try {
      await navigator.clipboard.writeText(hex);
      setNotice(`Code ${hex} copié.`);
    } catch {
      setError(`La copie automatique a échoué. Le code est ${hex}.`);
    }
  }

  const interactionLocked = saving || loadingPhoto;

  return (
    <div className={styles.palette}>
      <input
        ref={uploader}
        type="file"
        accept={allowedTypes.join(",")}
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void loadPhoto(file);
        }}
      />

      <div className={styles.workspace}>
        <section className={styles.panel} aria-label="Photo à échantillonner">
          <div className={styles.panelHeader}>
            <h2>Photo de la palette</h2>
            {photo && (
              <button type="button" className="button button-secondary" disabled={interactionLocked} onClick={() => uploader.current?.click()}>
                <ImagePlus size={17} aria-hidden="true" /> Changer la photo
              </button>
            )}
          </div>

          <div
            className={`${styles.photoStage}${dragging ? ` ${styles.dragging}` : ""}`}
            aria-busy={loadingPhoto}
            onDragOver={(event) => {
              event.preventDefault();
              if (!interactionLocked) setDragging(true);
            }}
            onDragLeave={(event) => {
              if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file && !interactionLocked) void loadPhoto(file);
            }}
          >
            {photo ? (
              <div className={styles.canvasFrame} style={{ "--photo-ratio": photo.pixels.width / photo.pixels.height } as CSSProperties}>
                <canvas
                  ref={canvas}
                  width={photo.pixels.width}
                  height={photo.pixels.height}
                  className={styles.canvas}
                  role="button"
                  tabIndex={0}
                  aria-label="Pipette sur la photo"
                  aria-describedby={canvasHelp}
                  aria-disabled={interactionLocked}
                  onClick={pickAtPointer}
                  onKeyDown={moveCursor}
                  onFocus={() => setCursor((current) => current ?? boundedPoint(photo.pixels.width / 2, photo.pixels.height / 2, photo.pixels))}
                />
                {cursor && (
                  <span
                    className={styles.cursor}
                    aria-hidden="true"
                    style={{ left: `${100 * (cursor.x + .5) / photo.pixels.width}%`, top: `${100 * (cursor.y + .5) / photo.pixels.height}%` }}
                  />
                )}
              </div>
            ) : (
              <div className={styles.emptyPhoto}>
                <div className={styles.photoIcon}><ImagePlus size={27} strokeWidth={1.4} aria-hidden="true" /></div>
                <p>Importe une photo de ta palette</p>
                <button type="button" className="button button-primary" aria-describedby={fileHelp} disabled={interactionLocked} onClick={() => uploader.current?.click()}>
                  {loadingPhoto ? "Ouverture de la photo…" : "Choisir une photo"}
                </button>
                <span id={fileHelp}>JPG, PNG ou WebP · 8 Mo maximum</span>
              </div>
            )}
          </div>

          {photo && (
            <div id={canvasHelp} className={styles.canvasHelp}>
              <Pipette size={17} aria-hidden="true" />
              <span>Touche la photo pour prélever une teinte. Au clavier, utilise les flèches puis Entrée. Maj + flèche avance d’un pixel.</span>
            </div>
          )}

          <p className={styles.note}>Les couleurs prélevées varient selon l’éclairage, l’appareil et l’écran.</p>
        </section>

        <section className={styles.panel} aria-label="Teinte sélectionnée">
          <div className={styles.panelHeader}><h2>Teinte prélevée</h2></div>
          <div className={styles.sample} style={selected ? { backgroundColor: selected } : undefined}>
            {selected ? <code>{selected}</code> : <Pipette size={28} strokeWidth={1.4} aria-hidden="true" />}
          </div>
          {photo && photo.suggestions.length > 0 && (
            <div className={styles.suggestions}>
              <p>Teintes dominantes</p>
              <div className={styles.suggestionList}>
                {photo.suggestions.map((hex) => (
                  <button
                    type="button"
                    key={hex}
                    className={styles.suggestion}
                    aria-label={`Sélectionner la teinte ${hex}`}
                    aria-pressed={selected === hex}
                    title={hex}
                    style={{ backgroundColor: hex }}
                    disabled={interactionLocked}
                    onClick={() => {
                      setCursor(null);
                      setSelected(hex);
                      setNotice(`Couleur sélectionnée ${hex}.`);
                      setError("");
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <form className={styles.sampleForm} onSubmit={(event) => { event.preventDefault(); void saveColor(); }}>
            <label htmlFor={nameId}>Nom de la teinte</label>
            <input id={nameId} value={name} maxLength={140} disabled={!selected || interactionLocked} placeholder="Ex. Rose poudré" onChange={(event) => setName(event.target.value)} />
            {onUpload && (
              <label className={styles.photoOption}>
                <input type="checkbox" checked={savePhoto} disabled={!selected || interactionLocked} onChange={(event) => setSavePhoto(event.target.checked)} />
                Conserver la photo dans mon compte
              </label>
            )}
            <button type="submit" className="button button-primary" disabled={!selected || interactionLocked || colors.length >= maxColors}>
              <Plus size={17} aria-hidden="true" /> {saving ? "Enregistrement…" : "Enregistrer la teinte"}
            </button>
            {colors.length >= maxColors && <p className={styles.note}>Limite de {maxColors} teintes atteinte.</p>}
          </form>
        </section>
      </div>

      <p className={styles.status} role="status">{notice}</p>
      {error && <p className={styles.error} role="alert">{error}</p>}

      <section className={styles.panel} aria-label="Teintes enregistrées">
        <div className={styles.panelHeader}><h2>Mes teintes</h2><span className={styles.count}>{colors.length}</span></div>
        {colors.length === 0 ? <p className={styles.note}>Les teintes que tu enregistres apparaîtront ici.</p> : (
          <ul className={styles.colors}>
            {colors.map((color) => (
              <li className={styles.colorCard} key={color.id}>
                <div className={styles.colorBlock} style={{ backgroundColor: color.hex }} aria-hidden="true" />
                <div className={styles.colorInfo}>
                  {editing?.id === color.id ? (
                    <form
                      className={styles.editForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (savePending.current) return;
                        const nextName = editing.name.trim() || color.hex;
                        if (onChange((existing) => existing.map((item) => item.id === color.id ? { ...item, name: nextName } : item)) === false) return;
                        setEditing(null);
                        setNotice("Le nom de la teinte a été modifié.");
                      }}
                    >
                      <label className={styles.srOnly} htmlFor={editId}>Modifier le nom de la teinte</label>
                      <input id={editId} autoFocus value={editing.name} maxLength={140} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
                      <button type="submit" className={styles.iconButton} aria-label="Enregistrer le nom" disabled={saving}><Check size={16} aria-hidden="true" /></button>
                      <button type="button" className={styles.iconButton} aria-label="Annuler la modification" onClick={() => setEditing(null)}><X size={16} aria-hidden="true" /></button>
                    </form>
                  ) : (
                    <div className={styles.colorName}>
                      <strong>{color.name}</strong>
                      <code>{color.hex}</code>
                    </div>
                  )}
                  <div className={styles.actions}>
                    <button type="button" className={styles.iconButton} aria-label={`Copier le code de ${color.name}`} title="Copier le code" onClick={() => void copyColor(color.hex)}><Copy size={16} aria-hidden="true" /></button>
                    {color.photoPath && onResolvePhoto && (
                      <button type="button" className={styles.iconButton} aria-label={`Voir la photo de ${color.name}`} title="Voir la photo" disabled={interactionLocked} onClick={() => { if (color.photoPath) void loadPhoto(color.photoPath); }}><ImageIcon size={16} aria-hidden="true" /></button>
                    )}
                    <button type="button" className={styles.iconButton} aria-label={`Renommer ${color.name}`} title="Renommer" disabled={saving} onClick={() => setEditing(color)}><Pencil size={16} aria-hidden="true" /></button>
                    <button type="button" className={styles.iconButton} aria-label={`Supprimer ${color.name}`} title="Supprimer" disabled={interactionLocked} onClick={() => void removeColor(color)}><Trash2 size={16} aria-hidden="true" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
