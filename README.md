# Gold Sweep Academy

Site vitrine de **Gold Sweep Academy** — une académie de formation au trading de
l'or (XAU/USD) et des indices : méthode structurée, mentorat et communauté.

Site statique, sans dépendance ni étape de build. Il suffit d'ouvrir `index.html`.

## Structure

```
.
├── index.html            # Page principale (toutes les sections)
├── assets/
│   ├── css/styles.css    # Thème sombre + accents or, responsive
│   ├── js/main.js        # Menu mobile, animations, compteurs, formulaire
│   └── img/              # Emplacement des images
├── LICENSE
└── README.md
```

## Sections

- **Hero** — accroche et appels à l'action
- **Chiffres clés** — compteurs animés
- **La méthode** — les 4 piliers de l'approche « Sweep »
- **Programmes** — Fondations, Sweep Mastery, Trader Pro
- **Mentors** — l'équipe pédagogique
- **Témoignages** — retours des membres
- **Tarifs** — mensuel, annuel, accès à vie
- **FAQ** — questions fréquentes
- **Contact** — formulaire d'inscription (démo front-end)

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

## Personnalisation

- **Couleurs & thème** : variables CSS en haut de `assets/css/styles.css` (`:root`).
- **Contenu** : directement dans `index.html`.
- **Formulaire** : `assets/js/main.js` gère une validation front-end de démonstration.
  Branchez-le à votre service (e-mail, CRM, API) pour un envoi réel.

## Avertissement

Le trading comporte un risque de perte en capital. Le contenu de ce site est
fourni à titre éducatif et ne constitue pas un conseil en investissement.
