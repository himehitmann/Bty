import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/postcss";
import { build } from "esbuild";
import postcss from "postcss";
import imageSources from "../lib/catalog-image-sources.json" with { type: "json" };

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.resolve(process.argv[2] ?? path.join(root, "out", "Navier.html"));
const stylesPath = path.join(root, "app", "globals.css");
const styles = await postcss([tailwind({ base: root, optimize: false })]).process(await readFile(stylesPath, "utf8"), {
  from: stylesPath,
});
const { outputFiles } = await build({
  absWorkingDir: root,
  entryPoints: ["scripts/portable-entry.tsx"],
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "es2022",
  jsx: "automatic",
  minify: true,
  outfile: "navier.js",
  write: false,
  legalComments: "inline",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_SUPABASE_URL": "undefined",
    "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "undefined",
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": "undefined",
  },
  loader: { ".woff2": "dataurl", ".webp": "dataurl" },
  plugins: [{
    name: "portable-styles",
    setup(plugin) {
      plugin.onResolve({ filter: /^\.\/portable\.css$/ }, () => ({ path: stylesPath, namespace: "portable" }));
      plugin.onLoad({ filter: /./, namespace: "portable" }, () => ({
        contents: styles.css,
        resolveDir: path.dirname(stylesPath),
        loader: "css",
      }));
      plugin.onResolve({ filter: /^\/fonts\// }, ({ path: font }) => ({ path: path.join(root, "public", font) }));
    },
  }],
});

const script = outputFiles.find((file) => file.path.endsWith(".js")).text.replace(/<\/script/gi, "<\\/script");
const css = outputFiles.find((file) => file.path.endsWith(".css")).text;
if (/<\/style(?:[\s/>]|$)/i.test(css)) throw new Error("La feuille de style contient une balise de fermeture inattendue.");
const scriptHash = createHash("sha256").update(script).digest("base64");
const styleHash = createHash("sha256").update(css).digest("base64");
const licenses = (await Promise.all([
  readFile(path.join(root, "public", "fonts", "tenor-sans-OFL.txt"), "utf8"),
  readFile(path.join(root, "public", "fonts", "dm-sans-OFL.txt"), "utf8"),
  readFile(path.join(root, "public", "licenses", "uiverse-MIT.txt"), "utf8"),
])).join("\n\n").replaceAll("-->", "--&gt;");

const directory = path.dirname(destination);
await mkdir(directory, { recursive: true });
const temporaryDirectory = await mkdtemp(path.join(directory, ".navier-build-"));
const temporaryFile = path.join(temporaryDirectory, "Navier.html");
try {
  await writeFile(temporaryFile, `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; style-src-elem 'sha256-${styleHash}'; img-src data: blob: ${[...imageSources.community, ...Object.values(imageSources.manufacturer)].join(" ")}; font-src data:; connect-src https://world.openbeautyfacts.org; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>Navier</title>
<style>${css}</style>
</head>
<body>
<div id="navier"></div>
<noscript>Active JavaScript dans ton navigateur pour ouvrir Navier.</noscript>
<script>${script}</script>
<!-- ${licenses} -->
</body>
</html>
`, { flag: "wx" });
  await rename(temporaryFile, destination);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
console.log(destination);
