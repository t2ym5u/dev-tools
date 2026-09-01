# dev-tools

Petits scripts d'outillage réutilisés entre projets. Pas publié sur npm —
installation directement depuis Git.

## Installation

Toujours épingler un tag précis, jamais la branche par défaut — sinon un
futur push ici change silencieusement ce que `pnpm install` récupère chez
les consommateurs :

```bash
pnpm add -D github:t2ym5u/dev-tools#v1.0.0
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

## Publier une nouvelle version

Un changement ici n'a aucun effet chez les consommateurs tant qu'il n'est
pas taggé — ils sont épinglés sur un tag précis (`#vX.Y.Z`), jamais sur la
branche par défaut.

1. Committer le changement (nouveau script, fix, ajustement de
   `sync-version`...) sur `master`.

2. Bumper la version et créer le tag en une seule commande — `pnpm version`
   met à jour `package.json`, committe, et crée le tag `vX.Y.Z` :

   ```bash
   pnpm version patch   # correctif rétrocompatible
   pnpm version minor   # nouveau script / nouvelle option, rétrocompatible
   pnpm version major   # change la signature d'un script existant
   ```

3. Pousser le commit de bump *et* le tag en une fois :

   ```bash
   git push origin master --follow-tags
   ```

4. Créer la release GitHub correspondante (changelog visible, historique
   des versions) :

   ```bash
   gh release create vX.Y.Z --title "vX.Y.Z" --notes "Ce qui a changé…"
   ```

5. Dans **chaque projet consommateur**, mettre à jour la référence de tag
   et réinstaller :

   ```bash
   pnpm add -D github:t2ym5u/dev-tools#vX.Y.Z
   ```

   Tenir à jour la liste des projets consommateurs (privée, hors de ce
   repo) pour ne pas en oublier un lors d'un bump.

## Ajouter un nouveau script

- Un fichier par script sous `bin/`.
- Une entrée `bin` par script dans `package.json`.
- Documenter l'usage ici.
