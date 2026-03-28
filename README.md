# Diamond Art

A browser app for turning photos into **dithered diamond-art patterns**. It quantizes colors to a **DMC embroidery palette**, applies error diffusion or Bayer dithering, and lets you preview and export a bead grid as **PNG** or **PDF**.

## Requirements

- **Node.js** 18 or newer (LTS recommended)
- **npm** (comes with Node)

## Setup

From the project root:

```bash
npm install
```

## Run locally (development)

Starts the webpack dev server with hot reload:

```bash
npm run dev
```

Then open **http://localhost:3001** in your browser (see `webpack.config.js` for the port).

## Build for production

Creates an optimized bundle in the `dist/` folder:

```bash
npm run build
```

Output is static files (`index.html`, hashed JS, assets). Deploy `dist/` to any static host (GitHub Pages, Netlify, S3, nginx, etc.).

To sanity-check the build locally you can serve `dist/` with any static server, for example:

```bash
npx serve dist
```

## Other scripts

| Command | Description |
|--------|-------------|
| `npm run lint` | Run ESLint on `src` |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting without writing files |

## Tech stack

- **React** + **TypeScript**
- **MUI** + **Tailwind** for UI
- **rgbquant** for palette reduction and error diffusion
- **pdf-lib** for PDF export
- **Web Worker** (`dither.worker.ts`) for dithering off the main thread

---

*Diamond art generator, for Sydney.*
