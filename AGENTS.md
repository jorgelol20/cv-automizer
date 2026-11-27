# AGENTS.md

## Project Overview

CV Automizer generates CVs adapted to job offers using AI models (Ollama local, Google Gemini, OpenCode Zen, OpenCode Go, Claude o Groq). It also generates a "general kit" (cover letter + email + CV) for spontaneous applications. All code, comments, prompts, and UI are in **Spanish**.

## Memory (`MEMORY.md` in repo root)

- At session start, read `MEMORY.md` first for project state and past decisions. Create it from the existing template if missing.
- At session end or after any significant task, update it: current state, key decisions (with why), pitfalls to avoid, next steps.
- Keep it under ~50 lines: summarize and prune, don't just append.
- Promote stable rules to `AGENTS.md` instead of leaving them in memory.
- Never store secrets, tokens, API keys, or personal data.

## Commands

```bash
npm install              # Install dependencies
npm start                # Run CLI (interactive, prompts for provider/model)
npm run tui              # Run terminal UI (needs Node >=26.4 + --experimental-ffi, included in script)
npm run desktop          # Run Electron desktop app
node src/cv/test-source.js  # Test UserInfo.md parser (prints parsed JSON)
node src/config/test-source.js  # Test API keys status (masked)
node src/config/test-modelos.js  # Test modelos config (effective values)
node src/pdf/test-pdf.js         # Test PDF engine (no AI call)
node --experimental-ffi src/tui/test-screens.js  # Headless TUI smoke test (frames)
```

There is **no build step, test framework, linter, or type checker**. Plain Node.js ES modules. The TUI is Core imperative (no JSX, no transpiler).

`start.bat` (Windows, doble clic o terminal): exige Node.js 22.12+, usa npm, auto-ejecuta `npm install` si falta `node_modules`, crea `.env` desde `.env.example` si falta, copia las plantillas de `data/` si faltan y hace `pause` siempre. No comprueba Chrome: el PDF del escritorio usa el Chromium de Electron. Usa `call` con npm y `cd /d "%~dp0"`.

## Architecture

### Entry Points

- **CLI**: `src/index.js` → interactive readline → `generateCV()` from `src/app.js`
- **TUI**: `src/tui/index.js` → OpenTUI renderer → `src/tui/app.js` (tabs, focus, footer) → misma capa de negocio
- **Desktop**: `desktop/main.cjs` (Electron main) → IPC → `src/app.js` or `src/general/generate.js`
- **General Kit**: `src/general/generate.js` → `generateGeneralKit()` (letter + email + CV)

### TUI (OpenTUI)

`@opentui/core` loads a native library; Node needs `--experimental-ffi` and >= 26.4 (or Bun >= 1.3). The `npm run tui` script includes the flag. Nothing else in the app requires that runtime: CLI and Desktop still run on Node 22.12+.

Screens are Core-imperative factories `crearPantallaX({ renderer, app })` returning `{ root, hint, onShow, onHide, onKey }`. The shell (`src/tui/app.js`) owns focus (`app.setFocusables` / `app.focus`), routes keys (`1`-`5` tabs, `TAB` fields, `q` quit), and destroys the renderer on every exit path.

**Never write to `console.*` from business code** while the TUI is mounted: it breaks the frame. Use `onProgress` (`generateCV` / `generateGeneralKit`) for progress and `aviso()` (`src/util/aviso.js`) for provider warnings. Both default to console for CLI/Desktop and are redirected by the TUI.

### Pipeline (CV)

```
data/UserInfo.md → parseUserInfo() → SOURCE
data/oferta.md   → JOB_OFFER
                        ↓
              AI Provider (Ollama/Gemini/OpenCode Zen/OpenCode Go/Claude/Groq)
                        ↓
                  CV JSON (validated against src/schema/cv.schema.json)
                        ↓
              enforceTraceability() → filters skills to only those in UserInfo
                        ↓
              renderMarkdown() / renderHtml() → saveCV/saveMarkdown/saveHtml
                        ↓
              generatePdf() (Electron en escritorio, Playwright en CLI/TUI) → output/*.pdf
```

### Key Directories

| Path | Purpose |
|------|---------|
| `src/ai/` | AI providers (Ollama, Gemini, OpenCode Zen, OpenCode Go, Claude, Groq), prompt building, model listing |
| `src/config/` | Gestión local: `keys.js` (`.env`, secretos) y `modelos.js` (`config/modelos.json`, sin secretos: modelo favorito + temperaturas + topes por proveedor con herencia de `defaults`) |
| `src/cv/` | UserInfo parser, traceability enforcement, schema validation |
| `src/general/` | General kit pipeline (cover letter, email) |
| `src/render/` | HTML and Markdown renderers |
| `src/render/fonts/` | Inter variable (subset latin, woff2) + licencia OFL; se embebe en el HTML como base64 para que el PDF no dependa de las fuentes del sistema |
| `src/tui/` | Terminal UI: shell (`app.js`), shared AI selector, screens, widgets, headless smoke test |
| `src/util/` | `aviso.js`: provider warning sink (console by default, TUI status bar when mounted) |
| `src/schema/` | JSON Schema files for validation |
| `src/pdf/` | Playwright-based PDF generation |
| `ia/` | System and user prompt templates (loaded at runtime) |
| `data/` | Input files: `UserInfo.md`, `oferta.md`, optional `ImagenUsuario.*` |
| `output/` | Generated files (JSON, MD, HTML, PDF) |
| `desktop/` | Electron app (main.cjs, pdf.cjs, preload.cjs, index.html, app.js) |

## Critical Environment Variables

Copy `.env.example` to `.env` and configure. Model tuning lives in `config/modelos.json` (local, gitignored, managed from CLI option 3 or the Desktop "Modelos" tab — never by hand-editing `.env`):

| Variable | Required | Purpose |
|----------|----------|---------|
| `CHROME_ROUTE` | No (PDF override) | Path to a specific Chrome/Chromium executable for PDF (e.g., `C:\Users\...\chrome.exe`). Empty = automatic engine |
| `PDF_ENGINE` | No | `electron` (desktop only) or `playwright` forces the PDF engine |
| `OPENCODE_ZEN_API_KEY` | For OpenCode Zen | OpenCode Zen API key (`OPENCODE_API_KEY` leído como alias legacy) |
| `OPENCODE_GO_API_KEY` | For OpenCode Go | OpenCode Go API key (`OPENCODE_API_KEY` leído como alias) |
| `GEMINI_API_KEY` | For Gemini | Google Gemini API key |
| `ANTHROPIC_API_KEY` | For Claude | Anthropic API key (`CLAUDE_API_KEY` leído como alias) |
| `GROQ_API_KEY` | For Groq | Groq API key, sin alias (`GROQ_BASE_URL` opcional para tests) |
| `OLLAMA_BASE_URL` | For Ollama | Ollama server URL (default: `http://localhost:11434`) |
| `NOMBRE_USUARIO` | Recommended | Overrides candidate name in output |
| `NOMBRE_ARCHIVO` | Recommended | Base filename for generated files (spaces stripped) |

`config/modelos.json` stores per-provider `{model, temperatureCV, maxTokensCV, temperatureMatch, maxTokensMatch, temperatureGeneral, maxTokensGeneral}` plus editable global `defaults` (`null`/empty = inherit). Resolution order: explicit option > `modelos.json` > code default (CV 0.2/16384, match 0.1/2048, general 0.3/4096). Never store secrets there — only tuning values.

## PDF Generation

PDF generation **does not require the user to install Chrome**. `src/pdf/pdf.js` resolves the engine in this order:

1. A registered engine (`setPdfEngine`). The desktop registers `desktop/pdf.cjs`, which prints with the Chromium bundled in Electron (`webContents.printToPDF`), so desktop users need no extra browser or download.
2. Without a registered engine (CLI/TUI), Playwright tries: `CHROME_ROUTE` (optional override) → Playwright's own Chromium → installed Google Chrome (channel) → installed Microsoft Edge (channel) → `playwright install chromium` once (~130 MB, announced through `aviso()`). `npm run pdf:browser` provisions the browser manually.
3. `PDF_ENGINE=electron|playwright` forces a path; `electron` only works inside the desktop app.

Every path prints A4 with `printBackground`, `preferCSSPageSize` and zero margins (the real margins come from `@page` in `src/render/style.css`) and waits for `document.fonts.ready`. If the registered engine fails, it warns and retries with Playwright.

The CV HTML embeds the Inter variable font as a base64 `@font-face` (`src/render/fonts/inter-latin-var.woff2`, OFL), so the PDF renders the same on any machine. `generatePdf` waits for `document.fonts.ready` before printing. The cover letter and email keep a Georgia serif stack and do not embed a font.

## AI Providers

- **Ollama**: Local models, no API key needed. Models listed via `/api/tags`.
- **Gemini**: Requires `GEMINI_API_KEY`. Models listed dynamically via Google GenAI SDK. `responseJsonSchema` recibe el schema canónico saneado por `src/ai/wire-schema.js`.
- **OpenCode Zen**: Requires `OPENCODE_ZEN_API_KEY` (`OPENCODE_API_KEY` as legacy fallback). Free tier via `chat/completions`.
- **OpenCode Go**: Requires `OPENCODE_GO_API_KEY` (`OPENCODE_API_KEY` as fallback). Paid subscription; OpenAI-compatible `POST /openai/v1/chat/completions` at `https://opencode.ai/inference/go` with native `fetch`. Sends `x-opencode-session` (mandatory) and `User-Agent`; caches `/v1/models` (5 min) to cap `max_tokens` to `limit.output`, add a reasoning reserve (+16384) and `reasoning_effort: "low"` when the model supports it, omit `temperature` when unsupported and choose `json_schema` strict (canonical schema sanitized by `src/ai/wire-schema.js`) or `json_object`, with one retry on 400/422. 401/403/404/429 mapped in Spanish.
- **Claude**: Requires `ANTHROPIC_API_KEY` (`CLAUDE_API_KEY` as alias). `POST /v1/messages` con `fetch` nativo (sin SDK), `output_config.format` con el schema canónico saneado por `src/ai/wire-schema.js` (sin `minLength`, `minimum` ni `maximum`); contrato canónico `cv.schema.json` validado con AJV.
- **Groq**: Requires `GROQ_API_KEY` (sin alias). `POST /openai/v1/chat/completions` con `fetch` nativo (sin SDK), compatible OpenAI, `response_format: {type: "json_object"}` universal (vale para todos los modelos); sin wire-schema porque el contrato canónico `cv.schema.json` se valida con AJV. `GET /openai/v1/models` filtrado a chat models con JSON fiable (excluye `whisper*`, `*guard*`, `distil-*`).
- **OpenAI**: Not implemented; no provider in `src/ai/factory.js` and no key in `.env.example`.

## Gestión API Keys

Claves soportadas `OPENCODE_ZEN_API_KEY`, `OPENCODE_GO_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` y `GROQ_API_KEY` (catálogo `KEY_DEFS` en `src/config/keys.js`). Almacenamiento solo `.env` local (ignorado por git). UI/CLI muestran `******abcd`, nunca el valor completo en logs. `setKey/clearKey` reescriben `.env` preservando comentarios y recargan `process.env` en caliente. Probar conexión reutiliza `listModels`.

All providers return structured JSON validated against schemas in `src/schema/`. Gemini, Claude and OpenCode Go receive the canonical schema sanitized by `src/ai/wire-schema.js` (they do not support every JSON Schema keyword).

## Prompt Templates

Prompts are **not** hardcoded in `src/ai/`. They are loaded from:
- `ia/system.md` + `ia/prompt.md` — CV adaptation
- `ia/general-system.md` + `ia/general-prompt.md` — General kit

The `src/ai/prompt.js` and `src/general/prompt.js` modules do `{{VARIABLE}}` substitution.

## Traceability Rule

The core business rule: **the AI must never invent candidate information**. `src/cv/traceability.js` enforces this by filtering skills to only those explicitly present in `UserInfo.md`. The `ia/system.md` prompt has extensive rules about evidence levels and inference prohibitions.

## Input File Format

`data/UserInfo.md` must follow a strict Markdown structure. The tracked templates are `data/UserInfo.example.md` and `data/oferta.example.md`; the real `data/UserInfo.md` / `data/oferta.md` are local and gitignored. The parser (`src/cv/source.js`) expects:
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

## Conventions

- **Language**: Spanish for all user-facing text, comments, and prompts
- **Module system**: ES modules (`"type": "module"`) in `src/`, CommonJS in `desktop/`
- **Validation**: AJV with JSON Schema (draft 2020-12)
- **Package manager**: npm only (`package-lock.json`); Node 22.12+ (`engines` in `package.json`)
- **No formatter/linter configured** — match existing code style manually
