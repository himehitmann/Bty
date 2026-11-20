import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/postcss";
import { build } from "esbuild";
import postcss from "postcss";

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
  loader: { ".woff2": "dataurl" },
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
const hash = createHash("sha256").update(script).digest("base64");
const license = (await readFile(path.join(root, "public", "fonts", "geist-OFL.txt"), "utf8")).replaceAll("-->", "--&gt;");

await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination + ".tmp", `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>Navier</title>
<style>${css}</style>
</head>
<body>
<div id="navier"></div>
<noscript>Active JavaScript dans ton navigateur pour ouvrir Navier.</noscript>
<script>${script}</script>
<!-- ${license} -->
</body>
</html>
`);
await rename(destination + ".tmp", destination);
console.log(destination);
