# Super Zoos Adventure V3

Clean standalone rebuild of the Super Zoos runner for iPhone, iPad and GitHub Pages.

## Architecture rules

- No migration workflow from V2.
- No cross-repository synchronisation.
- One shared 3D coordinate system for heroes, obstacles, pickups and collisions.
- Explicit game-state machine for ground, jump, slide, rail, trampoline, sky and landing phases.
- Responsive safe-area support for iPhone and iPad.
- V2 remains untouched as a reference build.

## Commands

```bash
npm install
npm run dev
npm run build
```

## Deployment

GitHub Pages is built and deployed from `main` using `.github/workflows/deploy-pages.yml`.
