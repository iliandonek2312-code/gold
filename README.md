# Gold Sweep Academy

Site vitrine de **Gold Sweep Academy** — une académie de formation au trading de
l'or (XAU/USD) et des indices : méthode structurée, mentorat et communauté.

Site statique multi-pages, sans dépendance ni étape de build. Il suffit d'ouvrir
`index.html`.

## Structure

```
.
├── index.html              # Accueil (hero, méthode, programmes, tarifs, FAQ, contact)
├── programme.html          # Cursus détaillé, module par module
├── a-propos.html           # Histoire, valeurs, équipe
├── contact.html            # Formulaire de contact + informations
├── mentions-legales.html   # Mentions légales (à compléter)
├── confidentialite.html    # Politique de confidentialité (RGPD)
├── cgv.html                # Conditions générales de vente (modèle)
├── 404.html                # Page d'erreur
├── robots.txt              # Directives moteurs de recherche
├── sitemap.xml             # Plan du site
├── assets/
│   ├── css/styles.css      # Thème sombre + accents or, responsive
│   ├── js/main.js          # Menu mobile, animations, compteurs, formulaires
│   └── img/                # Emplacement des images
├── LICENSE
└── README.md
```

## Pages & sections

**Accueil** — hero, chiffres clés animés, la méthode (4 piliers), programmes,
mentors, témoignages, tarifs (mensuel / annuel / à vie), FAQ, appel à l'action.

**Programme** — les 6 modules du cursus, du débutant à l'autonomie, en accordéon.

**À propos** — histoire de l'académie, valeurs et présentation de l'équipe.

**Contact** — formulaire complet (validation front-end) et coordonnées.

**Pages légales** — mentions légales, confidentialité (RGPD) et CGV, fournies
comme modèles à compléter.

## Développement local

Aucune installation requise. Ouvrez simplement le fichier dans un navigateur :

```bash
# option 1 : ouvrir directement
open index.html          # macOS
xdg-open index.html      # Linux

# option 2 : petit serveur local
python3 -m http.server 8000
# puis http://localhost:8000
```

## Déploiement

Le site étant 100 % statique, il se déploie sur n'importe quel hébergement
statique (GitHub Pages, Netlify, Vercel, un simple serveur web…). Il suffit de
publier le contenu du dépôt tel quel.

## Personnalisation

- **Couleurs & thème** : variables CSS en haut de `assets/css/styles.css` (`:root`).
- **Contenu** : directement dans les fichiers `.html`. En-tête et pied de page
  sont répétés à l'identique sur chaque page (site statique sans moteur de
  gabarits) — pensez à les mettre à jour partout si vous les modifiez.
- **Formulaires** : `assets/js/main.js` gère une validation front-end de
  démonstration. Branchez-les à votre service (e-mail, CRM, API) pour un envoi réel.
- **À compléter avant mise en production** :
  - Informations dans `mentions-legales.html` (éditeur, hébergeur) — champs entre crochets.
  - Détails RGPD dans `confidentialite.html` et modalités dans `cgv.html`
    (à faire valider par un professionnel du droit).
  - Le domaine dans `robots.txt` et `sitemap.xml`.
  - L'adresse e-mail de contact (`contact@goldsweepacademy.com`, placeholder).

## Contenu de démonstration

Les noms, tarifs, témoignages et chiffres sont des exemples à remplacer par les
données réelles de l'académie.

## Avertissement

Le trading comporte un risque de perte en capital. Le contenu de ce site est
fourni à titre éducatif et ne constitue pas un conseil en investissement.
