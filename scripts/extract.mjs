// =========================================================
// extract.mjs — découpeur du fichier maître de formation
// Node ESM. Aucune dépendance.
//
//   node scripts/extract.mjs --dry     # rapport, n'écrit rien
//   node scripts/extract.mjs --emit    # (ÉTAPE 3) écrit /formation + /assets
//
// Le source est lu en LECTURE SEULE ; jamais modifié.
// =========================================================
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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

// =========================================================
//  GÉNÉRATION (--emit)
// =========================================================
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%A5%87%3C/text%3E%3C/svg%3E";

const SHELL_CSS = `
/* ===== Coquille site formation (ajout hors source) ===== */
body.formation{background:var(--bg);color:var(--ink);margin:0}
.formation a:focus-visible,.formation button:focus-visible,.formation summary:focus-visible,.formation input:focus-visible,.formation .qz-opts button:focus-visible{outline:3px solid var(--gold-soft);outline-offset:2px;border-radius:6px}
.formation .skip-to{position:absolute;left:-999px;top:0;z-index:100;background:var(--gold);color:#1a1405;padding:10px 16px;border-radius:0 0 8px 0;font-weight:700}
.formation .skip-to:focus{left:0}
.formation .fbar{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:12px;background:rgba(7,6,4,.88);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);padding:10px 16px}
.formation .ftoc-btn{font-family:var(--mono);font-size:13px;color:var(--gold);background:transparent;border:1px solid var(--line);border-radius:8px;padding:8px 12px;cursor:pointer;white-space:nowrap}
.formation .fcrumb{flex:1;min-width:0;font-family:var(--mono);font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.formation .fcrumb b{color:var(--gold)}
.formation .fnav{display:flex;gap:6px}
.formation .fnav a,.formation .fnav span{display:grid;place-items:center;width:38px;height:38px;border-radius:8px;border:1px solid var(--line);background:var(--panel2);color:var(--ink);text-decoration:none;font-size:15px}
.formation .fnav span{opacity:.3;pointer-events:none}
.formation .fprog{height:3px;background:#1A1610}
.formation .fprog>div{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-soft));width:0;transition:width .3s}
.formation .fmain{padding:26px 0 0}
.formation .fmod-foot{max-width:960px;margin:10px auto 60px;padding:22px 22px 0;border-top:1px dashed var(--line);display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between}
.formation .done-btn.on{background:var(--green);border-color:var(--green);color:#04130E}
.formation .fnav-pair{display:flex;gap:10px}
.formation .fnav-link{font-family:var(--mono);font-size:13.5px;color:var(--ink);text-decoration:none;padding:12px 18px;border-radius:100px;background:var(--panel2);border:1px solid var(--line)}
.formation .fnav-link:hover{border-color:var(--gold)}
.formation .fnav-link[aria-disabled="true"]{opacity:.3;pointer-events:none}
.formation footer.frisk{border-top:1px solid var(--line);padding:26px 22px;color:var(--muted);font-size:12.5px;text-align:center;max-width:960px;margin:0 auto}
/* tiroir sommaire */
.formation .fscrim{position:fixed;inset:0;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:.25s;z-index:60}
.formation .fscrim.open{opacity:1;pointer-events:auto}
.formation .ftoc{position:fixed;top:0;left:0;bottom:0;width:min(86vw,340px);background:var(--panel);border-right:1px solid var(--line);transform:translateX(-105%);transition:transform .3s;z-index:70;overflow-y:auto;padding:18px}
.formation .ftoc.open{transform:none}
.formation .ftoc-h{font-family:var(--mono);font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin:16px 0 6px}
.formation .ftoc a{display:flex;gap:8px;padding:8px 10px;border-radius:8px;color:var(--muted);text-decoration:none;font-size:13.5px}
.formation .ftoc a:hover{background:var(--panel2);color:var(--ink)}
.formation .ftoc a.cur{color:var(--gold);background:var(--panel2)}
.formation .ftoc a .n{font-family:var(--mono);color:var(--gold);flex:none}
.formation .ftoc a.is-done .n::after{content:"✓";margin-left:4px;color:var(--green)}
/* glossaire */
dialog#glossaire-dlg{max-width:780px;width:92%;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:14px;padding:0}
dialog#glossaire-dlg::backdrop{background:rgba(0,0,0,.6)}
.gdlg-head{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--line);background:var(--panel)}
.gdlg-head h2{margin:0;font-size:17px}
.gdlg-body{padding:8px 20px 20px;max-height:72vh;overflow:auto}
[data-close-glossaire]{background:transparent;border:1px solid var(--line);color:var(--muted);border-radius:8px;padding:6px 12px;cursor:pointer;font-family:var(--mono)}
/* sommaire (index) */
.formation .fhero{max-width:960px;margin:0 auto;padding:44px 22px 6px}
.formation .fhero .eyebrow{margin-bottom:10px}
.formation .fhero h1{font-size:clamp(28px,5.2vw,46px);line-height:1.05;margin:0 0 12px}
.formation .fhero p{color:var(--muted);max-width:640px}
.formation .fresume{display:inline-block;margin-top:16px;font-family:var(--mono);font-size:13.5px;padding:12px 22px;border-radius:100px;background:linear-gradient(135deg,var(--gold-soft),var(--gold));color:#1a1405;text-decoration:none;font-weight:700}
.formation .fpart{max-width:960px;margin:0 auto;padding:20px 22px}
.formation .fpart-h{font-family:var(--mono);font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);border-bottom:1px solid var(--line);padding-bottom:8px;margin:14px 0}
.formation .fmod-list{display:grid;gap:10px}
.formation .fmod-card{display:flex;gap:14px;align-items:center;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--panel);text-decoration:none;color:var(--ink)}
.formation .fmod-card:hover{border-color:var(--gold)}
.formation .fmod-card .n{font-family:var(--mono);font-size:22px;color:transparent;-webkit-text-stroke:1px var(--gold);flex:none;min-width:34px}
.formation .fmod-card .t{flex:1}
.formation .fmod-card .t small{display:block;color:var(--muted);font-size:12px;font-family:var(--mono)}
.formation .fmod-card.is-done{border-color:var(--green)}
.formation .fmod-card.is-done .n{-webkit-text-stroke-color:var(--green)}
.formation .fmod-card .chk{font-family:var(--mono);font-size:12px;color:var(--muted)}
.formation .fmod-card.is-done .chk{color:var(--green)}
@media print{
  .formation .fbar,.formation .fprog,.formation .ftoc,.formation .fscrim,.formation .fmod-foot,dialog#glossaire-dlg{display:none!important}
  .formation .fmain{padding:0}
  details{border:1px solid #ccc}
}
`;

const LEARN = MODULES.filter((m) => m.part); // 24 modules d'apprentissage
const NAV_ORDER = MODULES.filter((m) => m.id !== "m0"); // 24 + examen + glossaire

function getH2(html) {
  const m = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}
function getModNum(html) {
  const m = html.match(/<div class="mod-num">([^<]*)<\/div>/);
  return m ? m[1].trim() : "";
}
// Ajoute id="schema-N" à chaque <figure> selon son libellé <b>Schéma N</b>
function addSchemaIds(html) {
  return html.replace(/<figure>([\s\S]*?)<\/figure>/g, (whole, inner) => {
    const nm = inner.match(/Sch[ée]ma\s+(\d+)/);
    return nm ? `<figure id="schema-${nm[1]}">${inner}</figure>` : whole;
  });
}
// Résout les 3 renvois croisés (§3.3) vers le schéma d'origine
function linkifyCrossRefs(html, selfSlug, homeOf) {
  const link = (n, text) => {
    const home = homeOf(n);
    const href = home === selfSlug ? `#schema-${n}` : `${home}.html#schema-${n}`;
    return `<a href="${href}">${text}</a>`;
  };
  return html
    .replace("miroir du Schéma 21", "miroir du " + link(21, "Schéma 21"))
    .replace("(Schéma 35)", "(" + link(35, "Schéma 35") + ")")
    .replace("(Schéma 37)", "(" + link(37, "Schéma 37") + ")");
}

function head(title) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="theme-color" content="#070604">
<link rel="icon" href="${FAVICON}">
<link rel="stylesheet" href="../assets/formation.css">
</head>`;
}

function tocHtml(currentSlug) {
  let out = `<a class="skip-to" href="#fcontenu">Aller au contenu</a><nav class="ftoc" id="ftoc" aria-label="Sommaire de la formation">
<div class="ftoc-h">Formation</div>
<a href="index.html"${currentSlug === "index" ? ' class="cur"' : ""}><span class="n">◆</span> Accueil &amp; progression</a>`;
  let lastPart = null;
  for (const m of MODULES) {
    if (m.id === "m0") continue;
    if (m.part && m.part !== lastPart) {
      out += `<div class="ftoc-h">${PARTS[m.part]}</div>`;
      lastPart = m.part;
    }
    if (m.id === "mEx") out += `<div class="ftoc-h">Validation</div>`;
    if (m.id === "mG") out += `<div class="ftoc-h">Référence</div>`;
    const cur = m.slug === currentSlug ? " cur" : "";
    const done = m.part ? ` data-mod-slug="${m.slug}"` : "";
    out += `<a href="${m.slug}.html" class="tocitem${cur}"${done}><span class="n">${m.num || "§"}</span> ${m.slugTitle}</a>`;
  }
  out += `</nav>`;
  return out;
}

function bar(breadcrumb, prev, next) {
  const arrow = (m, sym, rel) => m
    ? `<a href="${m.slug}.html" data-nav-${rel} aria-label="${rel === "prev" ? "Précédent" : "Suivant"}">${sym}</a>`
    : `<span>${sym}</span>`;
  return `<div class="fscrim" id="fscrim"></div>
<header class="fbar">
<button class="ftoc-btn" aria-expanded="false" aria-controls="ftoc">☰ Sommaire</button>
<div class="fcrumb">${breadcrumb}</div>
<div class="fnav">${arrow(prev, "◀", "prev")}${arrow(next, "▶", "next")}</div>
</header>
<div class="fprog"><div id="fprogfill"></div></div>`;
}

function footFrame(learnJson) {
  return `<footer class="frisk">Avertissement : le trading comporte un risque de perte en capital. Contenu strictement éducatif — aucun conseil en investissement.</footer>
<script>window.GSS_LEARN_SLUGS=${learnJson};</script>
<script src="../assets/formation.js" defer></script>
</body>
</html>`;
}

function emit() {
  const html = readSource();
  const sections = sliceSections(html);
  const byId = new Map(sections.map((s) => [s.id, s]));
  const quizByAfter = new Map(extractQuizBlocks(html).map((q) => [q.afterId, q]));

  // Titres de module (h2) + carte schéma→slug
  const schemaHome = new Map();
  for (const meta of MODULES) {
    const s = byId.get(meta.id);
    meta.slugTitle = getH2(s.inner) || meta.slug;
    for (const n of schemasIn(s.inner)) schemaHome.set(n, meta.slug);
  }
  const homeOf = (n) => schemaHome.get(n);
  const learnJson = JSON.stringify(LEARN.map((m) => m.slug));

  // Glossaire (table) pour la page ET le dialog
  const gloSection = byId.get("mG");
  const gloTable = (gloSection.inner.match(/<table[\s\S]*?<\/table>/) || [""])[0];
  const gloDialog = `<dialog id="glossaire-dlg">
<div class="gdlg-head"><h2>Glossaire — 52 termes</h2><button data-close-glossaire>Fermer ✕</button></div>
<div class="gdlg-body">${gloTable}</div>
</dialog>`;

  const outDir = join(ROOT, "formation");
  mkdirSync(outDir, { recursive: true });
  const written = [];
  const idx = (slug) => NAV_ORDER.findIndex((m) => m.slug === slug);

  // Pages modules + examen + glossaire
  for (const meta of NAV_ORDER) {
    const s = byId.get(meta.id);
    let content = addSchemaIds(s.inner);
    const q = quizByAfter.get(meta.id);
    if (q) content += `\n<div class="wrap">${addSchemaIds(q.html)}</div>`;
    content = linkifyCrossRefs(content, meta.slug, homeOf);

    const i = idx(meta.slug);
    const prev = i > 0 ? NAV_ORDER[i - 1] : null;
    const next = i < NAV_ORDER.length - 1 ? NAV_ORDER[i + 1] : null;

    let crumb;
    if (meta.id === "mEx") crumb = `Formation › <b>Examen final</b>`;
    else if (meta.id === "mG") crumb = `Formation › <b>Glossaire</b>`;
    else crumb = `Formation › ${PARTS[meta.part]} › <b>Module ${meta.num}</b>`;

    const isGlossary = meta.id === "mG";
    const doneBtn = meta.part
      ? `<button class="done-btn" data-slug="${meta.slug}" aria-pressed="false">○ MARQUER CE MODULE COMME TERMINÉ</button>`
      : `<span></span>`;
    const navPair =
      `<div class="fnav-pair">` +
      (prev ? `<a class="fnav-link prev" data-nav-prev href="${prev.slug}.html">◀ ${prev.num ? "Module " + prev.num : prev.slugTitle}</a>` : `<span class="fnav-link" aria-disabled="true">◀</span>`) +
      (next ? `<a class="fnav-link next" data-nav-next href="${next.slug}.html">${next.num ? "Module " + next.num : next.slugTitle} ▶</a>` : `<span class="fnav-link" aria-disabled="true">▶</span>`) +
      `</div>`;

    const page =
      head(`${meta.num ? "Module " + meta.num + " · " : ""}${meta.slugTitle} — Gold Sweep Academy`) +
      `\n<body class="formation">\n` +
      tocHtml(meta.slug) +
      bar(crumb, prev, next) +
      `<main class="fmain" id="fcontenu">\n${content}\n` +
      `<div class="fmod-foot">${doneBtn}${navPair}</div>\n` +
      `<div class="wrap" style="margin-bottom:40px"><button class="fnav-link" data-open-glossaire>📖 Ouvrir le glossaire</button></div>\n` +
      `</main>\n` +
      (isGlossary ? "" : gloDialog) +
      footFrame(learnJson);

    const file = `${meta.slug}.html`;
    writeFileSync(join(outDir, file), page, "utf8");
    written.push(file);
  }

  // Page d'accueil /formation/index.html (à partir de m0 + sommaire)
  const m0 = byId.get("m0");
  let sommaire = "";
  let lastPart = null;
  for (const m of NAV_ORDER) {
    if (m.part && m.part !== lastPart) {
      if (lastPart !== null) sommaire += `</div>`;
      sommaire += `<div class="fpart"><div class="fpart-h">${PARTS[m.part]}</div><div class="fmod-list">`;
      lastPart = m.part;
    }
    if (m.id === "mEx") { sommaire += `</div><div class="fpart"><div class="fpart-h">Validation &amp; référence</div><div class="fmod-list">`; lastPart = "END"; }
    const isLearn = !!m.part;
    const doneAttr = isLearn ? ` data-mod-slug="${m.slug}"` : "";
    sommaire += `<a class="fmod-card"${doneAttr} href="${m.slug}.html"><span class="n">${m.num || "★"}</span><span class="t">${m.slugTitle}<small>${m.part ? PARTS[m.part] : (m.id === "mEx" ? "Examen final" : "Glossaire")}</small></span><span class="chk">${isLearn ? "○" : "→"}</span></a>`;
  }
  sommaire += `</div></div>`;

  const indexPage =
    head("Formation — Gold Sweep Academy") +
    `\n<body class="formation">\n` +
    tocHtml("index") +
    `<div class="fscrim" id="fscrim"></div>
<header class="fbar"><button class="ftoc-btn" aria-expanded="false" aria-controls="ftoc">☰ Sommaire</button><div class="fcrumb"><b>Formation</b> — Gold Sweep Scalper Academy</div><div class="fnav"><a href="01-le-trading-lor-et-toi.html" data-nav-next aria-label="Commencer">▶</a></div></header>
<div class="fprog"><div id="fprogfill"></div></div>` +
    `<main class="fmain" id="fcontenu">
<section class="fhero">
<div class="eyebrow">Formation complète</div>
<h1>Le programme, du premier chandelier à l'autonomie</h1>
<p id="fproglabel">24 modules, un examen final et un glossaire. Progresse à ton rythme — ta progression est mémorisée sur cet appareil.</p>
<a class="fresume" id="fresume" href="01-le-trading-lor-et-toi.html">Reprendre où j'en étais →</a>
</section>
${m0.inner}
${sommaire}
<div class="wrap" style="margin:10px auto 60px"><button class="fnav-link" data-open-glossaire>📖 Ouvrir le glossaire</button></div>
</main>` +
    gloDialog +
    footFrame(learnJson);
  writeFileSync(join(outDir, "index.html"), indexPage, "utf8");
  written.unshift("index.html");

  // formation.css = <style> source (verbatim) + coquille
  const css = extractCss(html) + "\n" + SHELL_CSS;
  writeFileSync(join(ROOT, "assets", "formation.css"), css, "utf8");

  console.log(`✓ Écrit ${written.length} pages dans /formation :`);
  console.log("  " + written.join("  "));
  console.log(`✓ assets/formation.css (${(Buffer.byteLength(css, "utf8") / 1024).toFixed(1)} Ko)`);
  console.log(`✓ assets/formation.js (moteur : déjà présent)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || "--dry";
  if (mode === "--dry") dryReport();
  else if (mode === "--emit") emit();
  else { console.error(`Mode "${mode}" inconnu (attendu : --dry | --emit).`); process.exit(1); }
}
