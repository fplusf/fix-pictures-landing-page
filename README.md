# fix.pictures App

Marketing landing + image-fixing web app for `fix.pictures`.

## Stack

- React + TypeScript + Vite
- Tailwind CSS 3
- Web Worker pipeline (`@imgly/background-removal`)
- Optional localhost inference service (`local-inference/`)

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Routes

- `/` landing page
- `/app` image processing app
- `/terms` terms page
- `/privacy` privacy page
