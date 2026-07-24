# ANALYSE — ÉTAPE 0 (reconnaissance)

> Portage de la formation `GOLD-SWEEP-SCALPER-ACADEMY.html` vers des pages web
> consultables en ligne. Ce document constate la **structure réelle** du fichier
> source (lecture seule) et fixe les décisions prises avant génération de code.

## Source analysé

`source/GOLD-SWEEP-SCALPER-ACADEMY.html` — 440 Ko, 4140 lignes, entièrement
autonome (`<style>` + `<script>` + 67 SVG inline, aucune ressource externe).
Fichier maître : jamais modifié.

## Structure réelle constatée

27 sections `<section class="module" id="…">`, dans cet ordre :

```
m0 · mA mB mC · m1 m2 m3 mD · m4 m5 mE m6 m7 · m8 m9 m10 m11 · mN1…mN8 · mEx · mG
```

Les `id` correspondent **exactement** à la table de correspondance du prompt :
24 modules d'apprentissage (`mA`→`mN8`) + `m0` (programme) + `mEx` (examen) +
`mG` (glossaire). 6 séparateurs `<div class="partie">` (sommaire uniquement).

## Recompte vs contrat de vérification (§1)

| Élément | Attendu | Constaté | État |
|---|---|---|---|
| Modules d'apprentissage | 24 | 24 (`mA`→`mN8`) | ✓ |
| Examen | 1 (`mEx`) | 1 | ✓ |
| Schémas SVG (`<figure>` + `<b>Schéma N</b>`) | 67 | 67, numérotés 1→67 **sans trou ni doublon** | ✓ |
| Exemples `.ex` | 46 | 46 | ✓ |
| Exercices `.exo` | 40 | 40 | ✓ |
| Questions `.qz-q` | 51 | 51, chacune avec **exactement un** `data-ok="1"` | ✓ |
| Glossaire | 52 termes | 52 (lignes `<tr>` d'un `<table>`, +1 en-tête) | ✓ |
| Feuilles mode liseuse | 40 | **0** | ✗ (voir divergences) |

Répartition des quiz : `mC` (6) · `mD` (8) · `m7` (9) · `mN8` (8) · `mEx` (20) = 51.

## Divergences vs prompt (v3 du source)

1. **Le mode liseuse n'existe pas dans ce fichier.** Zéro élément `.rsheet`.
   Des fonctions JS (`go`, `openToc`, `closeToc`) et quelques styles résiduels
   subsistent, mais aucun contenu n'est découpé en écrans. Le contrat
   « 40 feuilles » est donc inatteignable — mécanique retirée de cette version.
   **Décision : contrôle « 40 feuilles » retiré du `verify.mjs`.**

2. **Aucune persistance dans le source** : `localStorage` absent, `done-btn` = 5
   (pas 24), `learnIds` résiduel. La progression par page (§7) est du **code
   neuf**, pas un portage.

3. **Glossaire = `<table>`**, pas `<dl>/<dt>`. Le `verify.mjs` comptera les
   `<tr>` de `mG` (−1 en-tête). Les 136 `<dt>` du document sont dans les fiches,
   hors glossaire.

4. **Charte** : variables quasi identiques (`--bg:#070604`, `--gold:#D4AF37`,
   `--green:#35C79C`, `--red:#F06060`) avec quelques noms/valeurs décalés
   (`--gold-soft` vs `--gold-lite`, `--panel*`). Le `<style>` étant extrait
   **verbatim** (§3.2), la fidélité visuelle est garantie.

## Poids par module (contrainte < 60 Ko/page)

CSS et JS externalisés (partagés, mis en cache) → hors du poids de chaque page.
HTML brut par section (Ko) : `mE` 39 · `m2` 35 · `m3` 31 · `m1` 29 · `m7` 25,
le reste sous 20. Coquille (header/nav/footer) ≈ 6 Ko. Page la plus lourde
≈ 45 Ko → **contrainte tenable partout.**

## Renvois croisés (§3.3)

Les 3 existent et leurs cibles aussi :

| Renvoi | Ligne source | Schéma cible (déf.) |
|---|---|---|
| « miroir du Schéma 21 » | 1209 | Schéma 21 (l. 1188) |
| « (Schéma 35) » | 2340 | Schéma 35 (l. 1597) |
| « (Schéma 37) » | 2351 | Schéma 37 (l. 1639) |

Les `<figure>` n'ont aucun `id` aujourd'hui → ajout de `id="schema-N"` pour
ancrer ces liens.

## Décision sur le mode liseuse (§4) → Option (b)

**Une page = un module en scroll continu ; navigation ◀ ▶ entre modules.**

- Le source n'a pas de découpage en écrans à porter ; l'option (a) obligerait à
  redécouper le contenu pédagogique, interdit par §5.3.
- Modules courts (max 39 Ko) → page scroll < 1 s en 4G (CSS/JS en cache).
- Scroll continu = impression PDF propre (rien de masqué) + UX mobile robuste.
- Confort mobile : barre de progression sticky + sommaire ☰ + ◀ ▶ inter-modules.

## Progression (§7)

Stockage en **`localStorage`** (une clé par slug de module), agrégé sur le
sommaire. **Implication assumée** : la progression disparaît si l'élève change
d'appareil, navigue en privé ou vide son cache. Aucune synchro multi-appareils
sans compte serveur. Acceptable pour un premier lancement.

## Cible à produire (rappel §2)

```
/formation/index.html            sommaire + progression
/formation/<slug>.html           ×25 (24 modules + examen)
/formation/glossaire.html
/assets/formation.css            <style> extrait verbatim
/assets/formation.js             quiz + progression + navigation
/scripts/extract.mjs             découpeur
/scripts/verify.mjs              contrôleur
```

## Prochaine étape

**ÉTAPE 1 — Outils** : écrire `extract.mjs` et `verify.mjs`, lancer l'extraction
à blanc et montrer ce qu'elle trouve, sans encore écrire les pages. En attente
de validation.
