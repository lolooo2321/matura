# Matura Master 2027

Osobni AI trener za pripremu hrvatske državne mature 2027. iz matematike (A razina), fizike i hrvatskog jezika.

Lokalna, privatna web aplikacija — svi podaci (raspored, riješeni ispiti, banka pogrešaka, statistika) spremaju se
isključivo u IndexedDB tvog preglednika, ništa se ne šalje na server.

## Značajke

- **Pametan tjedni raspored** — automatski generira plan rješavanja matura oko izmjenjivih školskih smjena (jutarnja/popodnevna), s drag & drop premještanjem ispita po danima.
- **Biblioteka starih matura** — uvoz stvarnih ispita s NCVVO arhive (ugrađen, provjeren popis) ili ručno dodavanje, pregled PDF-a, štoperica, unos bodova.
- **Banka zadataka koje nisi znao** — spremi fotografiju/tekst zadatka, razlog pogreške, status znanja.
- **Spaced repetition kvizovi** — kviz pogrešaka, brzi kviz, tematski kviz, kviz slabih područja, sa sustavom pametnog ponavljanja.
- **Dashboard i statistika** — napredak po predmetu, grafikoni, heatmap aktivnosti, procjena datuma završetka priprema.
- **Gamifikacija** — XP, leveli, streak, bedževi, confetti i zvučni/vizualni dopaminski feedback.
- **AI tutor** (opcionalno) — hint → sljedeći korak → puno rješenje, AI slični zadaci, esej feedback. Zahtijeva vlastiti Anthropic API ključ (unosi se u Postavkama, čuva se samo lokalno — BYOK).

## Tehnologije

React + TypeScript + Vite + Tailwind CSS v4 + Dexie (IndexedDB) + dnd-kit + Recharts.

## Pokretanje

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
