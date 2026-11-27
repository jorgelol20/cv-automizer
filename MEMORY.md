# MEMORY.md — CV-Automizer
Memoria entre sesiones; resume o elimina lo que ya no aporte (máx. ~50 líneas).
## Estado actual
- v0.10.0 beta pública (2026-11-27): PDF sin Chrome (Electron en escritorio; Playwright en CLI/TUI). Base: repo nuevo con historial limpio, licencia 0BSD, `engines` Node >=22.12 y release con ZIP generado por `git archive`. El repo anterior se archiva privado.
- Funcionalidad: CLI, TUI (Node >=26.4 + `--experimental-ffi`) y Electron; 6 proveedores (Ollama, Gemini, OpenCode Zen/Go, Claude, Groq); kit general; config de modelos; API keys; PDF sin Chrome (Electron o Playwright); Inter embebida.
- Validación real: Ollama y OpenCode Zen probados con modelos reales. Claude, Gemini, Groq y OpenCode Go están implementados, pero falta la matriz completa con claves reales.
- Primer arranque: `start.bat` crea `.env` y copia `data/*.example.md`; el escritorio carga la plantilla si falta y avisa; la CLI da un error claro si no existen los datos.
- `private: true` evita un `npm publish` accidental; la licencia 0BSD no exige atribución.
## Decisiones (y por qué)
- Historial limpio: repo antiguo archivado privado + repo nuevo; el estado actual es el commit inicial. No se reescribe el historial público anterior.
- 0BSD en vez de MIT: el autor no quiere exigir atribución; 0BSD es una concesión explícita, válida para uso comercial y código cerrado.
- Node >=22.12 por Electron 44; la TUI mantiene 26.4+ y ese requisito vive en `src/tui/index.js` y el README.
- `data/UserInfo.md`, `data/oferta.md`, `config/modelos.json`, `.env` y `output/` nunca se versionan; solo las plantillas `*.example.md`.
- Proveedores sin SDK (fetch nativo) salvo Gemini (`@google/genai`) y Ollama; Gemini/Claude/Go sanean el schema con `wire-schema.js`; Groq usa `json_object`.
- OpenCode Go: `x-opencode-session` obligatorio, catálogo cacheado 5 min, `json_schema` strict con fallback a `json_object` y reserva de tokens para modelos de razonamiento.
- Prompts en `ia/*.md`; el formato lo impone la salida estructurada + AJV. Match opcional (`match=null`); `traceability.js` filtra skills a UserInfo.
- `config/modelos.json` separado de `.env`, con herencia de `defaults` y escritura atómica tmp+rename.
- TUI Core imperativo (sin JSX/build); prohibido `console.*` con la TUI montada: usar `onProgress`/`aviso()`.
- PDF sin Chrome: `generatePdf` usa un motor registrado (`setPdfEngine`); escritorio registra `desktop/pdf.cjs` (Chromium de Electron). CLI/TUI encadenan CHROME_ROUTE → Chromium de Playwright → Chrome/Edge → descarga; `CHROME_ROUTE` es override opcional.
## Aprendizajes y errores a evitar
- `src/` es ESM y `desktop/` CJS: usar `import()` dinámico en `main.cjs`.
- CRLF en `src/render`/`src/pdf`, LF en `src/general`/`desktop`; `edit` conserva el fin de línea.
- En CSS de impresión, `34% 60%` + gap deja hueco muerto: usar `minmax(0, Xfr)`.
- `page.pdf()` usa media print; `emulateMedia({ media: "print" })` solo para medir.
- Playwright 1.63 no descarga navegadores en `npm install`: usar canales `chrome`/`msedge`, `npm run pdf:browser` o la descarga perezosa de `pdf.js`.
- Ollama sin servidor: `fetch failed` con `cause.code=ECONNREFUSED`; mensaje accionable en español.
- Reescribir `.env` preservando comentarios y recargar `process.env`; nunca devolver claves completas.
- PowerShell no acepta `&&`; en `.bat` usar `call` con npm, `%~dp0`, sin `chcp` y ASCII puro.
- TUI: toda acción async con try/catch; un rechazo no capturado cierra la app.
- `pnpm install` sin `package.json` sube al padre: probar installs en directorios aislados con `package.json`.
- npm 12 bloquea los `postinstall` por defecto: Electron necesita `allowScripts` en `package.json` para descargar su binario.
- No asumir que existen `data/UserInfo.md`/`data/oferta.md`: usar plantillas y `mkdir` en el primer arranque.
## Próximos pasos
- Probar con claves reales Claude, Gemini, Groq y OpenCode Go (CV con/sin match y kit general); verificar el schema saneado.
- P2 seguridad Electron: restringir `open-output-file` a `output/`, `will-navigate`/`setWindowOpenHandler`, sandbox del iframe de preview y timeouts/reintentos de red.
- Escritorio: barra de acción fija, confirmación al borrar clave y ARIA/foco/contraste.
- TUI: probar en terminal real a 80x24, editar claves/modelos y guardar perfil.
- Valorar instalador Electron (electron-builder, icono) y `@opentui/core` como `optionalDependencies`.
- Probar `start.bat` real con doble clic y la rama winget en un equipo sin Node.
- Fase 2: cifrado/keychain del SO solo si se pide.
