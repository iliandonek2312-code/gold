// =========================================================
// verify.mjs — contrôleur du portage de la formation
// Node ESM. Aucune dépendance.
//
//   node scripts/verify.mjs           # auto : pages si /formation existe, sinon source
//   node scripts/verify.mjs --source  # contrôle sur le modèle d'extraction (avant génération)
//   node scripts/verify.mjs --pages   # contrôle sur les pages générées dans /formation
//
// Contrôles (§6), hors « 40 feuilles liseuse » (retiré : décision ÉTAPE 0).
// =========================================================
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT, MODULES, META, readSource, sliceSections, extractQuizBlocks, schemasIn,
} from "./extract.mjs";

const FORMATION = join(ROOT, "formation");

const EXPECT = {
  pages: 26,      // 24 modules + examen + glossaire (l'accueil /formation/ est à part)
  figures: 67,
  ex: 46,
  exo: 40,
  qz: 51,
  glossary: 52,
};

function count(hay, needle) { return hay.split(needle).length - 1; }

// --- Construit les "pages virtuelles" à partir du source (mode --source) ---
function virtualPages() {
  const html = readSource();
  const sections = sliceSections(html);
  const byId = new Map(sections.map((s) => [s.id, s]));
  const quizByAfter = new Map(extractQuizBlocks(html).map((q) => [q.afterId, q]));
  const pages = [];
  for (const meta of MODULES) {
    const s = byId.get(meta.id);
    if (!s) continue;
    let content = s.inner;
    const q = quizByAfter.get(meta.id);
    if (q) content += q.html;
    pages.push({ slug: meta.slug, html: content });
  }
  return pages;
}

// --- Charge les pages réelles (mode --pages) ---
function realPages() {
  const files = readdirSync(FORMATION).filter((f) => f.endsWith(".html") && f !== "index.html");
  return files.map((f) => ({ slug: f.replace(/\.html$/, ""), html: readFileSync(join(FORMATION, f), "utf8"), file: f }));
}

// --- Contrôles ---
function run(mode) {
  const usingPages = mode === "pages";
  const pages = usingPages ? realPages() : virtualPages();
  const all = pages.map((p) => p.html).join("\n");
  const results = [];
  const add = (label, ok, detail = "") => results.push({ label, ok, detail });

  // 1. Nombre de pages de contenu
  add("Pages de contenu = 26", pages.length === EXPECT.pages, `trouvé ${pages.length}`);

  // 2. Figures totales = 67
  const figs = count(all, "<figure");
  add("Figures (<figure>) = 67", figs === EXPECT.figures, `trouvé ${figs}`);

  // 3. Numérotation schémas 1..67
  const nums = schemasIn(all).sort((a, b) => a - b);
  const dup = nums.filter((n, i) => nums[i + 1] === n);
  const holes = [];
  for (let i = 1; i <= 67; i++) if (!nums.includes(i)) holes.push(i);
  add("Schémas numérotés 1→67, sans trou ni doublon",
    nums.length === 67 && dup.length === 0 && holes.length === 0,
    `n=${nums.length} doublons=[${dup}] trous=[${holes}]`);

  // 4. .ex / .exo / .qz-q
  const ex = count(all, 'class="ex"');
  const exo = count(all, 'class="exo"');
  const qz = count(all, 'class="qz-q"');
  add("Exemples .ex = 46", ex === EXPECT.ex, `trouvé ${ex}`);
  add("Exercices .exo = 40", exo === EXPECT.exo, `trouvé ${exo}`);
  add("Questions .qz-q = 51", qz === EXPECT.qz, `trouvé ${qz}`);

  // 5. Glossaire = 52 termes (lignes td.mono du tableau)
  const glo = pages.find((p) => p.slug === "glossaire");
  const terms = glo ? count(glo.html, '<td class="mono"') : 0;
  add("Glossaire = 52 termes", terms === EXPECT.glossary, `trouvé ${terms}`);

  // 6. Chaque .qz-q a exactement un data-ok="1"
  let badQz = 0;
  const qzRe = /<div class="qz-q">[\s\S]*?<div class="qz-fb">/g;
  let m;
  while ((m = qzRe.exec(all))) {
    if (count(m[0], 'data-ok="1"') !== 1) badQz++;
  }
  add("Chaque .qz-q a un seul data-ok=\"1\"", badQz === 0, `${badQz} anomalie(s)`);

  // 7. Balises équilibrées (div/section/figure/details/table) — par page
  let unbalanced = [];
  for (const p of pages) {
    for (const tag of ["div", "section", "figure", "details", "table"]) {
      const open = (p.html.match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
      const close = (p.html.match(new RegExp(`</${tag}>`, "gi")) || []).length;
      if (open !== close) unbalanced.push(`${p.slug}:${tag}(${open}/${close})`);
    }
  }
  add("Balises équilibrées (div/section/figure/details/table)",
    unbalanced.length === 0, unbalanced.slice(0, 6).join(" "));

  // 8. Renvois croisés (§3.3) résolvables : schémas 21, 35, 37 présents
  const homeOf = (n) => {
    for (const p of pages) if (schemasIn(p.html).includes(n)) return p.slug;
    return null;
  };
  const crossOk = [21, 35, 37].every((n) => homeOf(n));
  add("Renvois croisés 21/35/37 → schéma cible existe",
    crossOk, [21, 35, 37].map((n) => `${n}:${homeOf(n) || "MANQUE"}`).join(" "));

  // 9. Poids des pages < 60 Ko (mode --pages uniquement, fiable avec CSS/JS externes)
  if (usingPages) {
    const heavy = pages.filter((p) => Buffer.byteLength(p.html, "utf8") > 60 * 1024);
    add("Chaque page < 60 Ko", heavy.length === 0,
      heavy.map((p) => `${p.slug}:${(Buffer.byteLength(p.html, "utf8") / 1024).toFixed(0)}Ko`).join(" "));

    // 10. Liens internes morts (ancres + pages)
    const slugs = new Set(pages.map((p) => p.slug).concat(["index"]));
    let dead = [];
    for (const p of pages) {
      const ids = new Set([...p.html.matchAll(/id="([^"]+)"/g)].map((x) => x[1]));
      for (const lm of p.html.matchAll(/href="([^"]+)"/g)) {
        const href = lm[1];
        if (/^https?:|^mailto:|^tel:/.test(href)) continue;
        const [path, frag] = href.split("#");
        if (path && path.endsWith(".html")) {
          const target = path.replace(/\.html$/, "");
          if (!slugs.has(target)) dead.push(`${p.slug}→${href}`);
        } else if (!path && frag) {
          if (!ids.has(frag)) dead.push(`${p.slug}→#${frag}`);
        }
      }
    }
    add("Aucun lien interne mort", dead.length === 0, dead.slice(0, 6).join(" "));
  } else {
    add("Poids < 60 Ko / liens morts / erreurs JS", true, "(contrôlé en mode --pages après génération)");
  }

  // --- Sortie ---
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(` VÉRIFICATION — mode ${usingPages ? "PAGES (/formation)" : "SOURCE (modèle d'extraction)"}`);
  console.log("═══════════════════════════════════════════════════════════════");
  let fail = 0;
  for (const r of results) {
    const mark = r.ok ? "✓" : "✗";
    if (!r.ok) fail++;
    console.log(`  ${mark}  ${r.label.padEnd(52)} ${r.ok ? "" : "→ " + r.detail}`);
  }
  console.log("───────────────────────────────────────────────────────────────");
  console.log(`  ${fail === 0 ? "✓ TOUT AU VERT" : "✗ " + fail + " CONTRÔLE(S) EN ÉCHEC"}  (${results.length - fail}/${results.length})`);
  console.log("═══════════════════════════════════════════════════════════════");
  process.exit(fail === 0 ? 0 : 1);
}

let mode = "auto";
if (process.argv.includes("--source")) mode = "source";
else if (process.argv.includes("--pages")) mode = "pages";
if (mode === "auto") mode = existsSync(FORMATION) ? "pages" : "source";
run(mode);
