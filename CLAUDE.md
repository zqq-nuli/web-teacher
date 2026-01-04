# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**网页教师 (Web Teacher)** is a browser extension that transforms web-based tutorials and documentation into interactive, guided learning experiences. It uses AI to analyze page content and generate step-by-step lesson plans, then presents them with Driver.js-powered highlights and an optional TTS narration.

Built with:
- **WXT** (Web Extension Tools) - Framework for building cross-browser extensions
- **React 19** - UI framework
- **Zustand** - State management with chrome.storage persistence
- **Driver.js** - New-user-guide-style highlighting and overlays
- **Tailwind CSS v4** - Styling

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (Chrome)
pnpm dev

# Start development server (Firefox)
pnpm dev:firefox

# Build for production (Chrome)
pnpm build

# Build for production (Firefox)
pnpm build:firefox

# Type check
pnpm compile

# Create distributable zip
pnpm zip
```

## Architecture

### Directory Structure

```
web-teacher/
├── src/
│   ├── entrypoints/           # WXT entry points
│   │   ├── background.ts      # Service worker (AI API proxy, message routing)
│   │   ├── content.tsx        # Content script (extraction, guide, TTS)
│   │   └── popup/             # Popup UI (settings, start learning)
│   │
│   ├── core/                  # Core business modules
│   │   ├── extractor/         # Content extraction from web pages
│   │   ├── ai/                # AI service (OpenAI/Anthropic)
│   │   │   ├── providers/     # API providers
│   │   │   └── prompts/       # Prompt templates
│   │   ├── guide/             # Driver.js guide system
│   │   └── tts/               # Text-to-speech
│   │
│   ├── components/            # React components
│   │   ├── FloatingPanel/     # Main lesson UI panel
│   │   └── ContentApp.tsx     # Content script React app
│   │
│   ├── store/                 # Zustand stores
│   │   ├── settings.ts        # User settings
│   │   ├── lesson.ts          # Current lesson state
│   │   └── ui.ts              # UI state
│   │
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Utility functions
│   └── types/                 # TypeScript type definitions
│
├── wxt.config.ts              # WXT configuration
└── package.json
```

### Key Modules

#### Content Extractor (`src/core/extractor/`)
Extracts main content from web pages using:
- Site-specific selectors (article, main, .content, etc.)
- Text density analysis as fallback
- Element mapping with unique CSS selectors

#### AI Service (`src/core/ai/`)
Supports two providers:
- **OpenAI** - Uses chat completions API with JSON mode
- **Anthropic** - Uses messages API

Generates lesson plans with:
- Step-by-step breakdown of content
- Element targeting for highlights
- Metadata (difficulty, estimated time, keywords)

#### Guide System (`src/core/guide/`)
Built on Driver.js:
- Step-by-step highlighting with overlay
- Custom styled popovers
- Step controller with navigation and auto-advance
- Scroll management

#### TTS Module (`src/core/tts/`)
Text-to-speech with:
- Native browser TTS (Web Speech API)
- Queue-based playback
- Configurable voice and rate

### Message Flow

```
Popup → Background → Content Script
  │         │            │
  │    AI API calls      │
  │         │            │
  └─────────┴────────────┘
      chrome.runtime.sendMessage
```

### Entry Points

- **`background.ts`** - Handles AI API calls, settings persistence, message routing
- **`content.tsx`** - Renders floating panel, manages guide and TTS, extracts content
- **`popup/`** - Settings UI and "Start Learning" trigger

### Key Conventions

- WXT auto-generates types in `.wxt/` (gitignored)
- `defineBackground()`, `defineContentScript()` are WXT globals
- `browser` API is WXT's cross-browser polyfill
- Path alias `@/` points to `src/` directory
- Uses Shadow DOM for content script UI isolation

## Configuration

- **`wxt.config.ts`** - WXT configuration with `srcDir: 'src'`
- **`tsconfig.json`** - Extends `.wxt/tsconfig.json`
- **`postcss.config.js`** - PostCSS with Tailwind CSS v4

## Types (`src/types/index.ts`)

Key types:
- `LessonPlan` - Generated lesson structure
- `LessonStep` - Individual step with content and targeting
- `ExtractedContent` - Page content with elements
- `Settings` - AI, TTS, and guide configuration
