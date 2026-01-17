# ExploreBCCD

A web application for exploring phylogenetic posterior tree distributions using the BCCD (CCD1 with the Height-Short branch extension) model.

## Features

- **Interactive tree visualization** – Explore the tree structure with clade probabilities and split statistics
- **Split conditioning** – Condition on clade splits to analyze constrained distributions
- **Height conditioning** – Condition on node heights to analyze constrained distributions
- **SVG export** – Export visualizations for publications and presentations
- **Privacy-focused** – All processing happens locally in your browser

## Tech Stack

- [Svelte 5](https://svelte.dev/) with [SvelteKit](https://svelte.dev/docs/kit)
- [Bun](https://bun.sh/) as runtime and package manager
- [Vite](https://vite.dev/) for development and bundling
- [Tailwind CSS 4](https://tailwindcss.com/) for styling
- [TypeScript](https://www.typescriptlang.org/)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) for asynchronous processing without halting the UI thread.

## Getting Started

### Prerequisites

Install [Bun](https://bun.sh/):

```bash
curl -fsSL https://bun.sh/install | bash
```

### Installation

```bash
bun install
```

### Development

Start the development server:

```bash
bun run dev
```

The app will be available at `http://localhost:5173`.

### Build

Create a production build:

```bash
bun run build
```

Preview the production build:

```bash
bun run preview
```

### Other Commands

```bash
bun run check      # Run svelte-check for type errors
bun run lint       # Check formatting and lint
bun run format     # Auto-format code with Prettier
bun run test       # Run tests with Vitest
```
