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

`npm run dev` now serves the frontend and the local `/api/process-image` route through Vite middleware.
Set `OPENAI_API_KEY` in your shell or `.env` before testing the hosted GPT image edit path.

## Vercel Dev

If you want to test the app closer to deployment behavior, run:

```bash
npm run dev:vercel
```

This serves both the app and `api/` routes through Vercel's local runtime.

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
