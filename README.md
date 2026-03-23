# ⚡ FlashForge

A Quizlet-style flashcard study app built with React + Vite.

## Features

- **Create & manage** flashcard sets with terms and definitions
- **Study mode** — 3D flip cards, keyboard navigation, shuffle, progress tracking
- **Test mode** — auto-generated quizzes (multiple choice + written answers) with scoring
- **Import** — paste tab/comma/dash-separated terms for bulk card creation
- **Star** difficult cards for focused review
- **Persistent storage** — your sets save in the browser via localStorage

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Deploy to Vercel

### Option A: Via GitHub (Recommended)

1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **"Add New Project"** → Import your repo
4. Vercel auto-detects Vite — just click **Deploy**
5. Done! Your app is live at `https://your-project.vercel.app`

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Follow the prompts — it auto-detects Vite config
```

## Keyboard Shortcuts (Study Mode)

| Key | Action |
|-----|--------|
| `Space` / `Enter` | Flip card |
| `←` | Previous card |
| `→` | Next card |

## Tech Stack

- **React 18** — UI framework
- **Vite 6** — Build tool & dev server
- **localStorage** — Client-side data persistence
- **Google Fonts** — DM Sans + Space Mono

## Project Structure

```
flashforge/
├── index.html          # Entry point with mobile viewport + fonts
├── package.json        # Dependencies & scripts
├── vite.config.js      # Vite + React plugin
├── .gitignore
└── src/
    ├── main.jsx        # React DOM mount
    └── App.jsx         # Full application (single component file)
```

## Notes

- Data is stored in `localStorage` per browser — not synced across devices
- Works offline after first load (all assets are bundled)
- Mobile-optimised with touch-friendly controls
