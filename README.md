# dev-tools

Petits scripts d'outillage réutilisés entre projets. Pas publié sur npm —
installation directement depuis Git.

## Installation

```bash
pnpm add -D github:t2ym5u/dev-tools
```

## `sync-version`

Synchronise le numéro de version de `package.json` dans d'autres fichiers
(doc, changelog...) au moment du bump — pensé pour tourner comme hook
`version` de `pnpm version` / `npm version`, qui s'exécute après le bump
mais avant le commit/tag créé par la commande, de sorte que les fichiers
synchronisés soient inclus dans le même commit de release.

1. Créer `sync-version.config.mjs` à la racine du projet consommateur :

   ```js
   export default [
     {
       file: "CLAUDE.md",
       pattern: /(\*\*Version actuelle\s?:\*\*\s?)\d+\.\d+\.\d+/,
     },
     // ajouter une entrée par fichier à synchroniser
   ];
   ```

   Chaque `pattern` doit contenir un groupe capturant `(...)` couvrant tout
   ce qui précède le numéro de version — il est réinjecté tel quel, seul le
   numéro de version est remplacé.

2. Brancher le script dans `package.json` :

   ```json
   {
     "scripts": {
       "version": "sync-version"
     }
   }
   ```

3. `pnpm version minor` (ou équivalent) met désormais aussi à jour et stage
   les fichiers listés dans `sync-version.config.mjs`.

## Ajouter un nouveau script

- Un fichier par script sous `bin/`.
- Une entrée `bin` par script dans `package.json`.
- Documenter l'usage ici.
