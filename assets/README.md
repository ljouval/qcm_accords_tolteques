# Moteur QCM — Documentation

## Structure

```
mon-questionnaire/
├── index.html              Point d'entrée
└── assets/
    ├── config.md           Titre, intro, présentation des catégories
    ├── questionnaire.md    Questions et réponses
    ├── profils.md          Niveaux, insights, profils combinés
    ├── data.js             Données embarquées (généré depuis les .md)
    ├── parser.js           Lecture et parsing des .md
    ├── app.js              Logique de l'application
    ├── style.css           Styles
    ├── lancer.bat          Lanceur local Windows
    └── README.md           Ce fichier
```

## Utilisation en local (Windows)

Double-cliquez sur `assets/lancer.bat`.
Python requis : https://www.python.org (cocher "Add Python to PATH").

## Utilisation sur GitHub Pages

1. Déposez tous les fichiers dans un dépôt GitHub
2. Settings → Pages → Branch: main
3. Accédez à `https://pseudo.github.io/nom-du-depot/`

## Modifier le contenu

Éditez `config.md`, `questionnaire.md` ou `profils.md`,
puis mettez à jour `data.js` en copiant les contenus dans les variables
`RAW_CONFIG`, `RAW_QUESTIONNAIRE` et `RAW_PROFILS`.

Sur GitHub Pages, `data.js` n'est pas obligatoire —
l'application lit directement les `.md` via fetch().

## Créer un nouveau questionnaire

Remplacez les trois fichiers `.md` en respectant leur syntaxe.
Le moteur (`app.js`, `parser.js`, `style.css`) n'a pas besoin d'être modifié.
