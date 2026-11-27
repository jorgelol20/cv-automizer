# Changelog

Todas las novedades relevantes de CV Automizer se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.9.0] - 2026-11-27

Primera beta pública.

### Añadido

- Generación de CV adaptado a una oferta de empleo.
- Kit de candidatura espontánea: carta, email y CV adaptado a la empresa.
- Proveedores: Ollama, Google Gemini, OpenCode Zen, OpenCode Go, Claude y Groq.
- Selección de proveedor y modelo con lista viva y modelo favorito.
- Configuración local de temperatura y tokens por proveedor (`config/modelos.json`).
- Gestión de API Keys en CLI, escritorio y TUI, siempre enmascaradas.
- Interfaz de escritorio Electron con previsualización, progreso por etapas y apertura de resultados.
- Interfaz de terminal (TUI) con pestañas, editor de perfil/oferta y registro de progreso.
- CLI interactiva (`npm start`).
- Validación del CV con JSON Schema y trazabilidad contra `UserInfo.md`.
- Render a JSON, Markdown, HTML y PDF, con la fuente Inter embebida en el CV.
- Plantillas públicas `data/UserInfo.example.md` y `data/oferta.example.md`.
- `start.bat` para Windows con comprobación de Node, instalación de dependencias, `.env` y aviso de Chrome.

### Cambiado

- Historial del repositorio reiniciado para la publicación pública; los datos locales no se versionan.
- `engines.node` pasa a `>=22.12` (lo exige Electron 44). La TUI mantiene su requisito de Node 26.4+.
- El primer arranque copia las plantillas de datos si faltan y muestra un error claro en la CLI si no existen.
- Se declaran los scripts permitidos de Electron y protobufjs (`allowScripts`) para que npm 12 no bloquee su instalación.

### Corregido

- Vulnerabilidad moderada de `fast-uri` (vía `npm audit fix`).
- Fallo de primer arranque de CLI y escritorio cuando no existían `data/UserInfo.md` u `data/oferta.md`.

### Notas

- Beta orientada a Windows.
- La generación de PDF requiere Chrome/Chromium y `CHROME_ROUTE`.
- Las pruebas con claves reales de Claude, Gemini, Groq y OpenCode Go siguen pendientes de validación completa.

[0.9.0]: https://github.com/jorgelol20/cv-automizer/releases/tag/v0.9.0
