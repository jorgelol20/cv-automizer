# AGENTS.md

## Project Overview

CV Automizer generates CVs adapted to job offers using AI models (Ollama local or Google Gemini). It also generates a "general kit" (cover letter + email + CV) for spontaneous applications. All code, comments, prompts, and UI are in **Spanish**.

## Commands

```bash
npm install              # Install dependencies
npm start                # Run CLI (interactive, prompts for provider/model)
npm run desktop          # Run Electron desktop app
node src/cv/test-source.js  # Test UserInfo.md parser (prints parsed JSON)
```

There is **no build step, test framework, linter, or type checker**. Plain Node.js ES modules.

## Architecture

### Entry Points

- **CLI**: `src/index.js` → interactive readline → `generateCV()` from `src/app.js`
- **Desktop**: `desktop/main.cjs` (Electron main) → IPC → `src/app.js` or `src/general/generate.js`
- **General Kit**: `src/general/generate.js` → `generateGeneralKit()` (letter + email + CV)

### Pipeline (CV)

```
data/UserInfo.md → parseUserInfo() → SOURCE
data/oferta.md   → JOB_OFFER
                        ↓
              AI Provider (Ollama/Gemini)
                        ↓
                  CV JSON (validated against src/schema/cv.schema.json)
                        ↓
              enforceTraceability() → filters skills to only those in UserInfo
                        ↓
              renderMarkdown() / renderHtml() → saveCV/saveMarkdown/saveHtml
                        ↓
              generatePdf() via Playwright → output/*.pdf
```

### Key Directories

| Path | Purpose |
|------|---------|
| `src/ai/` | AI providers (Ollama, Gemini), prompt building, model listing |
| `src/cv/` | UserInfo parser, traceability enforcement, schema validation |
| `src/general/` | General kit pipeline (cover letter, email) |
| `src/render/` | HTML and Markdown renderers |
| `src/schema/` | JSON Schema files for validation |
| `src/pdf/` | Playwright-based PDF generation |
| `ia/` | System and user prompt templates (loaded at runtime) |
| `data/` | Input files: `UserInfo.md`, `oferta.md`, optional `ImagenUsuario.*` |
| `output/` | Generated files (JSON, MD, HTML, PDF) |
| `desktop/` | Electron app (main.cjs, preload.cjs, index.html, app.js) |

## Critical Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Purpose |
|----------|----------|---------|
| `CHROME_ROUTE` | **Yes** (for PDF) | Path to Chromium executable (e.g., `C:\Users\...\chrome.exe`) |
| `GEMINI_API_KEY` | For Gemini | Google Gemini API key |
| `OLLAMA_BASE_URL` | For Ollama | Ollama server URL (default: `http://localhost:11434`) |
| `NOMBRE_USUARIO` | Recommended | Overrides candidate name in output |
| `NOMBRE_ARCHIVO` | Recommended | Base filename for generated files (spaces stripped) |

## PDF Generation

PDF is generated via **Playwright** with a system Chromium. The `CHROME_ROUTE` env var must point to a valid `chrome.exe`. Without it, PDF generation fails.

## AI Providers

- **Ollama**: Local models, no API key needed. Models listed via `/api/tags`.
- **Gemini**: Requires `GEMINI_API_KEY`. Models listed dynamically via Google GenAI SDK.

Both providers return structured JSON validated against schemas in `src/schema/`.

## Prompt Templates

Prompts are **not** hardcoded in `src/ai/`. They are loaded from:
- `ia/system.md` + `ia/prompt.md` — CV adaptation
- `ia/general-system.md` + `ia/general-prompt.md` — General kit

The `src/ai/prompt.js` and `src/general/prompt.js` modules do `{{VARIABLE}}` substitution.

## Traceability Rule

The core business rule: **the AI must never invent candidate information**. `src/cv/traceability.js` enforces this by filtering skills to only those explicitly present in `UserInfo.md`. The `ia/system.md` prompt has extensive rules about evidence levels and inference prohibitions.

## Input File Format

`data/UserInfo.md` must follow a strict Markdown structure (see `data/UserInfo.md` for the template). The parser (`src/cv/source.js`) expects:
- `# Name` heading
- `## Información profesional` with `**Título:**`
- `## Contacto` with labeled fields
- `## Habilidades` with `**Lenguajes:**`, `**Frameworks:**`, etc.
- `## Experiencia` with `### Company` blocks
- `## Proyectos`, `## Formación académica`, `## Certificaciones`, `## Idiomas`

## Output Naming

Nombres centralizados en `src/output/naming.js` (espacios e `<>:"/\|?*&` eliminados):

- CV específico: `CV-{usuario}.*` (usuario = `NOMBRE_ARCHIVO` o `NOMBRE_USUARIO` sin espacios)
- CV con empresa (kit general): `CV-{usuario}-{empresa}.*`
- General kit: `General-{empresa}-Carta.*` y `General-{empresa}-Email.*`

## Unused / Legacy Files

- `src/ai/menu.js` — not imported anywhere
- `src/ai/adaptation-prompt.js` — not imported; prompt logic lives in `src/ai/prompt.js` + `ia/*.md`

## Conventions

- **Language**: Spanish for all user-facing text, comments, and prompts
- **Module system**: ES modules (`"type": "module"`) in `src/`, CommonJS in `desktop/`
- **Validation**: AJV with JSON Schema (draft 2020-12)
- **No formatter/linter configured** — match existing code style manually
