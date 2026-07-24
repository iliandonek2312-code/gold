// =========================================================
// extract.mjs — découpeur du fichier maître de formation
// Node ESM. Aucune dépendance.
//
//   node scripts/extract.mjs --dry     # rapport, n'écrit rien
//   node scripts/extract.mjs --emit    # (ÉTAPE 3) écrit /formation + /assets
//
// Le source est lu en LECTURE SEULE ; jamais modifié.
// =========================================================
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..");
export const SOURCE = join(ROOT, "source", "GOLD-SWEEP-SCALPER-ACADEMY.html");

// --- Table de correspondance id → slug/num/partie (NON dérivable : figée) ---
export const PARTS = {
  I: "Partie I — Bases",
  II: "Partie II — Structure & liquidité",
  III: "Partie III — Confluence & exécution",
  IV: "Partie IV — Rigueur & mental",
  V: "Partie V — Approfondissements",
};

export const MODULES = [
  { id: "mA",  num: "01", part: "I",   slug: "01-le-trading-lor-et-toi" },
  { id: "mB",  num: "02", part: "I",   slug: "02-lire-un-graphique" },
  { id: "mC",  num: "03", part: "I",   slug: "03-bougies-japonaises" },
  { id: "m1",  num: "04", part: "II",  slug: "04-structure-de-marche" },
  { id: "m2",  num: "05", part: "II",  slug: "05-la-liquidite" },
  { id: "m3",  num: "06", part: "II",  slug: "06-zones-institutionnelles" },
  { id: "mD",  num: "07", part: "II",  slug: "07-multi-timeframe" },
  { id: "m4",  num: "08", part: "III", slug: "08-indicateurs" },
  { id: "m5",  num: "09", part: "III", slug: "09-setup-a-plus" },
  { id: "mE",  num: "10", part: "III", slug: "10-bibliotheque-de-setups" },
  { id: "m6",  num: "11", part: "III", slug: "11-gestion-du-risque" },
  { id: "m7",  num: "12", part: "III", slug: "12-sessions-killzones" },
  { id: "m8",  num: "13", part: "IV",  slug: "13-journal" },
  { id: "m9",  num: "14", part: "IV",  slug: "14-backtesting" },
  { id: "m10", num: "15", part: "IV",  slug: "15-psychologie" },
  { id: "m11", num: "16", part: "IV",  slug: "16-objectifs" },
  { id: "mN1", num: "17", part: "V",   slug: "17-tradingview" },
  { id: "mN2", num: "18", part: "V",   slug: "18-correlations" },
  { id: "mN3", num: "19", part: "V",   slug: "19-saisonnalite" },
  { id: "mN4", num: "20", part: "V",   slug: "20-execution" },
  { id: "mN5", num: "21", part: "V",   slug: "21-order-flow" },
  { id: "mN6", num: "22", part: "V",   slug: "22-prop-firm" },
  { id: "mN7", num: "23", part: "V",   slug: "23-etude-de-cas" },
  { id: "mN8", num: "24", part: "V",   slug: "24-trader-durable" },
  { id: "mEx", num: "25", part: null,  slug: "examen" },
  { id: "mG",  num: null, part: null,  slug: "glossaire" },
];
export const META = new Map(MODULES.map((m) => [m.id, m]));
// m0 (Programme) alimente la page d'accueil /formation/ (traité à part).

// --- Lecture du source ---
export function readSource() {
  return readFileSync(SOURCE, "utf8");
}

// --- Extraction du <style> (verbatim, concaténé si plusieurs) ---
export function extractCss(html) {
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let out = "", m;
  while ((m = re.exec(html))) out += m[1] + "\n";
  return out.trim();
}

// --- Extraction des <script> (verbatim, pour référence) ---
export function extractScripts(html) {
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let m;
  while ((m = re.exec(html))) blocks.push(m[1]);
  return blocks;
}

// --- Découpage robuste des <section class="module" id="…"> ---
// Compte les <section>/<section …> imbriqués pour trouver le </section> apparié.
export function sliceSections(html) {
  const openRe = /<section\b[^>]*>/gi;
  const startRe = /<section\b[^>]*\bid="([^"]+)"[^>]*>/i;
  const results = [];
  let m;
  // Collecte tous les tokens <section...> et </section> avec position.
  const tokens = [];
  const tokRe = /<section\b[^>]*>|<\/section>/gi;
  while ((m = tokRe.exec(html))) {
    tokens.push({ pos: m.index, text: m[0], open: m[0][1] !== "/" });
  }
  // Parcours avec pile ; à chaque ouverture de module au niveau racine, on
  // capture jusqu'à la fermeture appariée.
  let depth = 0;
  let cur = null;
  for (const t of tokens) {
    if (t.open) {
      if (depth === 0) {
        const idm = t.text.match(/\bid="([^"]+)"/);
        cur = { id: idm ? idm[1] : null, start: t.pos, startTagEnd: t.pos + t.text.length };
      }
      depth++;
    } else {
      depth--;
      if (depth === 0 && cur) {
        cur.end = t.pos + "</section>".length;
        cur.outer = html.slice(cur.start, cur.end);
        cur.inner = html.slice(cur.startTagEnd, t.pos);
        results.push(cur);
        cur = null;
      }
    }
  }
  return results;
}

// --- Repérage des schémas dans un fragment : renvoie [{n, figureIndex}] ---
export function schemasIn(fragment) {
  const re = /<b>\s*Sch[ée]ma\s+(\d+)\b/gi;
  const nums = [];
  let m;
  while ((m = re.exec(fragment))) nums.push(parseInt(m[1], 10));
  return nums;
}

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

// --- Extraction des blocs quiz autonomes situés ENTRE les sections ---
// Dans le source, les quiz de fin de partie sont des <div class="quiz"> de
// premier niveau, hors des <section class="module">. On les rattache au dernier
// module rencontré avant eux. Renvoie [{afterId, label, html, qCount}].
export function extractQuizBlocks(html) {
  const blocks = [];
  const re = /<div class="quiz">/g;
  let m;
  while ((m = re.exec(html))) {
    // Trouve le </div> apparié en comptant la profondeur des <div>.
    const tokRe = /<div\b[^>]*>|<\/div>/gi;
    tokRe.lastIndex = m.index;
    let depth = 0, t, end = -1;
    while ((t = tokRe.exec(html))) {
      if (t[0][1] === "/") { depth--; if (depth === 0) { end = tokRe.lastIndex; break; } }
      else depth++;
    }
    const block = html.slice(m.index, end);
    const label = (block.match(/<h4>([^<]*)<\/h4>/) || [])[1] || "";
    const qCount = count(block, 'class="qz-q"');
    const before = html.slice(0, m.index);
    const secs = [...before.matchAll(/<section class="module" id="([^"]+)"/g)];
    const afterId = secs.length ? secs[secs.length - 1][1] : null;
    blocks.push({ afterId, label, html: block, qCount });
  }
  return blocks;
}

// --- Rapport (--dry) ---
function dryReport() {
  const html = readSource();
  const css = extractCss(html);
  const scripts = extractScripts(html);
  const sections = sliceSections(html);
  const byId = new Map(sections.map((s) => [s.id, s]));
  const quizzes = extractQuizBlocks(html);
  const quizByAfter = new Map(quizzes.map((q) => [q.afterId, q]));

  const kb = (s) => (Buffer.byteLength(s, "utf8") / 1024).toFixed(1);

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" EXTRACTION À BLANC — aucun fichier écrit");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Source           : source/GOLD-SWEEP-SCALPER-ACADEMY.html`);
  console.log(`Taille source    : ${kb(html)} Ko`);
  console.log(`Blocs <style>    : 1  →  formation.css (${kb(css)} Ko)`);
  console.log(`Blocs <script>   : ${scripts.length}  →  formation.js (réécrit : quiz + progression + nav)`);
  console.log(`Sections module  : ${sections.length} (attendu 27 : 24 modules + m0 + examen + glossaire)`);
  console.log("");

  // Table des modules
  console.log("id     num part slug                         Ko   fig  ex exo  qz  schémas");
  console.log("────── ─── ──── ──────────────────────────── ──── ──── ── ─── ─── ────────");
  let tFig = 0, tEx = 0, tExo = 0, tQz = 0;
  const allSchemas = [];
  for (const meta of MODULES) {
    const s = byId.get(meta.id);
    if (!s) { console.log(`${meta.id.padEnd(6)} MANQUANT !`); continue; }
    const fig = count(s.inner, "<figure");
    const ex = count(s.inner, 'class="ex"');
    const exo = count(s.inner, 'class="exo"');
    const attached = quizByAfter.get(meta.id);
    const qz = count(s.inner, 'class="qz-q"') + (attached ? attached.qCount : 0);
    const sch = schemasIn(s.inner);
    allSchemas.push(...sch.map((n) => ({ n, id: meta.id, slug: meta.slug })));
    tFig += fig; tEx += ex; tExo += exo; tQz += qz;
    const range = sch.length ? `${sch[0]}–${sch[sch.length - 1]}` : "—";
    const qmark = attached ? `${qz}*` : String(qz);
    console.log(
      `${meta.id.padEnd(6)} ${(meta.num || "—").padEnd(3)} ${(meta.part || "—").padEnd(4)} ` +
      `${meta.slug.slice(0, 28).padEnd(28)} ${kb(s.outer).padStart(4)} ${String(fig).padStart(4)} ` +
      `${String(ex).padStart(2)} ${String(exo).padStart(3)} ${qmark.padStart(3)} ${range.padStart(8)}`
    );
  }
  // m0 (accueil)
  const m0 = byId.get("m0");
  console.log(`${"m0".padEnd(6)} ${"—".padEnd(3)} ${"—".padEnd(4)} ${"(→ accueil /formation/)".padEnd(28)} ${kb(m0.outer).padStart(4)}`);

  console.log("────── ─── ──── ──────────────────────────── ──── ──── ── ─── ─── ────────");
  console.log(`TOTAUX${" ".repeat(33)} fig=${tFig}  ex=${tEx}  exo=${tExo}  qz=${tQz}   (* quiz de partie rattaché)`);
  console.log("");

  // Rattachement des quiz de fin de partie
  console.log("Quiz de fin de partie (blocs autonomes → rattachés à une page module) :");
  for (const q of quizzes) {
    const meta = META.get(q.afterId);
    const dest = meta ? `module ${meta.num} (${meta.slug}.html)` : `après ${q.afterId}`;
    console.log(`  ${String(q.qCount).padStart(2)} q · ${q.label.padEnd(45)} → ${dest}`);
  }
  console.log(`  Examen (mEx) : 20 q sur sa propre page examen.html`);
  console.log("");

  // Continuité des schémas
  const nums = allSchemas.map((x) => x.n).sort((a, b) => a - b);
  const dup = nums.filter((n, i) => nums[i + 1] === n);
  const holes = [];
  for (let i = 1; i <= 67; i++) if (!nums.includes(i)) holes.push(i);
  console.log(`Schémas trouvés  : ${nums.length}  (min ${nums[0]}, max ${nums[nums.length - 1]})`);
  console.log(`  doublons       : ${dup.length ? dup.join(",") : "aucun"}`);
  console.log(`  trous (1..67)  : ${holes.length ? holes.join(",") : "aucun"}`);
  console.log(`  → chaque <figure> recevra id="schema-N" à la génération.`);
  console.log("");

  // Renvois croisés (§3.3)
  console.log("Renvois croisés (§3.3) — résolution prévue :");
  const homeOf = (n) => {
    const hit = allSchemas.find((x) => x.n === n);
    return hit ? `${hit.slug}.html#schema-${n}` : "(introuvable !)";
  };
  for (const n of [21, 35, 37]) {
    console.log(`  Schéma ${n}  →  /formation/${homeOf(n)}`);
  }
  console.log("");
  console.log("Outils interactifs spécifiques repérés (à câbler dans formation.js) :");
  console.log(`  checklist Setup A+ (.ck / #score)   présent : ${count(html, 'id="score"') > 0}`);
  console.log(`  calculateur d'espérance (#c-out)    présent : ${count(html, 'id="c-out"') > 0}`);
  console.log("═══════════════════════════════════════════════════════════════");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || "--dry";
  if (mode === "--dry") dryReport();
  else {
    console.error(`Mode "${mode}" non encore implémenté (ÉTAPE 3 : --emit).`);
    process.exit(1);
  }
}
