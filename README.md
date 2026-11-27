# CV Automizer

Aplicación para generar CVs adaptados automáticamente a una oferta de empleo utilizando modelos de IA.

El proyecto utiliza una fuente de datos estructurada en Markdown con la información del candidato, una oferta de empleo y un pipeline de generación que produce el CV en JSON, Markdown, HTML y PDF.

Actualmente dispone de una interfaz de escritorio basada en Electron, una interfaz de terminal (TUI) y mantiene también un modo CLI.

> **Estado:** beta pública `0.10.0` (noviembre de 2026). El flujo principal es estable, pero algunas integraciones con proveedores aún no se han validado con claves reales. Consulta las [limitaciones conocidas](#limitaciones-conocidas).

---

## Características

- Generación de CV adaptado a una oferta de empleo.
- Puntuación de encaje (match) entre el CV y la oferta, opcional.
- Dos layouts de CV: estándar y una página.
- Kit de candidatura espontánea: carta, email y CV adaptado a la empresa.
- Proveedores: Ollama, Google Gemini, OpenCode Zen, OpenCode Go, Claude (Anthropic) y Groq.
- Selección de proveedor y modelo desde la aplicación.
- Gestión de API Keys desde la CLI, el escritorio y la TUI (valores enmascarados).
- Configuración local de modelo favorito, temperatura y tokens por proveedor.
- Edición de `UserInfo.md` y `oferta.md` desde el escritorio y la TUI.
- Generación de JSON, Markdown, HTML y PDF (sin necesidad de instalar Chrome).
- Interfaz de terminal (TUI) con pestañas, editor de perfil/oferta y registro de progreso.
- Previsualización del HTML generado dentro del escritorio.
- Apertura directa del HTML y PDF generado.
- Apertura de la carpeta de salida.
- Soporte opcional para una imagen de usuario.
- Validación del CV generado mediante JSON Schema.
- Sistema de trazabilidad para limitar información no respaldada por los datos del candidato.

---

## Requisitos

### Software

- Node.js 22.12 o superior
- npm
- Ollama (si se utilizan modelos locales)
- Al menos una API key de Gemini, OpenCode Zen, OpenCode Go, Claude o Groq (si no se usa Ollama)

Para generar PDF no hace falta tener Chrome instalado. El escritorio usa el Chromium que ya incluye Electron; la CLI y la TUI usan el Chromium de Playwright, un Chrome/Edge del sistema o lo descargan automáticamente la primera vez (unos 130 MB). También puedes prepararlo antes con `npm run pdf:browser`.

La TUI es opcional y necesita **Node.js 26.4 o superior** con `--experimental-ffi` (el script `npm run tui` ya lo añade), o Bun 1.3+.

### Sistema operativo

El proyecto está orientado principalmente a Windows, aunque gran parte del código utiliza APIs multiplataforma de Node.js y Electron.

---

## Instalación

Clonar el repositorio:

```bash
git clone https://github.com/jorgelol20/cv-automizer.git
cd cv-automizer
```

Instalar dependencias:

```bash
npm install
```

### Desde la release

Si prefieres no clonar el repositorio, descarga el ZIP de la [última release](https://github.com/jorgelol20/cv-automizer/releases).

Descomprímelo y ejecuta `npm install` dentro de la carpeta.

## Primer arranque

La aplicación necesita dos ficheros locales que no se versionan:

- `data/UserInfo.md`: tu perfil.
- `data/oferta.md`: la oferta a la que adaptar el CV.

`start.bat` los crea automáticamente desde las plantillas la primera vez. El escritorio y la TUI también cargan la plantilla si el fichero aún no existe y avisan al guardar. Si arrancas solo con `npm start`, cópialos a mano (la CLI avisa si faltan):

```bat
copy data\UserInfo.example.md data\UserInfo.md
copy data\oferta.example.md data\oferta.md
```

En Linux/macOS:

```bash
cp data/UserInfo.example.md data/UserInfo.md
cp data/oferta.example.md data/oferta.md
```

Edita ambos ficheros antes de generar.

---

## Configuración

Copia `.env.example` a `.env` y rellena solo lo que vayas a usar. Los valores vacíos no se consideran configurados.

```env
NOMBRE_USUARIO=
NOMBRE_ARCHIVO=

OLLAMA_BASE_URL=http://localhost:11434
OPENCODE_ZEN_API_KEY=
OPENCODE_GO_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=

# Opcional: ruta a un Chrome/Chromium concreto para los PDF.
CHROME_ROUTE=
# Opcional: fuerza el motor de PDF ("electron" solo en escritorio, "playwright").
# PDF_ENGINE=
```

### Variables

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `NOMBRE_USUARIO` | No | Sobrescribe el nombre del candidato en la salida. |
| `NOMBRE_ARCHIVO` | No | Nombre base de los ficheros generados (sin espacios). |
| `OLLAMA_BASE_URL` | No | URL del servidor local de Ollama. |
| `OPENCODE_ZEN_API_KEY` | Para OpenCode Zen | Clave de OpenCode Zen (`OPENCODE_API_KEY` se acepta como alias de lectura). |
| `OPENCODE_GO_API_KEY` | Para OpenCode Go | Clave con suscripción Go (`OPENCODE_API_KEY` se acepta como alias de lectura). |
| `GEMINI_API_KEY` | Para Gemini | Clave de Google AI Studio. |
| `ANTHROPIC_API_KEY` | Para Claude | Clave de Anthropic (`CLAUDE_API_KEY` se acepta como alias de lectura). |
| `GROQ_API_KEY` | Para Groq | Clave de Groq. |
| `CHROME_ROUTE` | No | Ruta a un Chrome/Chromium concreto para los PDF. En CLI/TUI es la primera opción; el escritorio usa Electron salvo que definas `PDF_ENGINE=playwright`. |
| `PDF_ENGINE` | No | `electron` o `playwright` para forzar el motor de PDF (`electron` solo funciona en el escritorio). |

Las claves también se pueden guardar desde la CLI (`npm start` → opción 2), la pestaña **API Keys** del escritorio o la pestaña **API Keys** de la TUI. Nunca se muestran completas: solo `******abcd`.

El modelo favorito, la temperatura y los tokens por proveedor se guardan en `config/modelos.json` (local, ignorado por git) y se editan desde la CLI (opción 3), la pestaña **Modelos** del escritorio o la pestaña **Modelos** de la TUI; no se configuran en `.env`.

Ejemplo de nombres generados:

```text
CV-NombreApellido.json
CV-NombreApellido.md
CV-NombreApellido.html
CV-NombreApellido.pdf
```

---

## Estructura del proyecto

```text
cv-automizer/
│
├── .github/
│   └── rulesets/
│       ├── main.json
│       ├── tags.json
│       └── README.md
│
├── desktop/
│   ├── app.js
│   ├── index.html
│   ├── main.cjs
│   ├── pdf.cjs
│   ├── preload.cjs
│   └── style.css
│
├── src/
│   ├── ai/
│   │   ├── claude.js
│   │   ├── factory.js
│   │   ├── gemini.js
│   │   ├── groq.js
│   │   ├── match.js
│   │   ├── ollama.js
│   │   ├── opencode.js
│   │   ├── opencode-go.js
│   │   ├── prompt.js
│   │   ├── provider.js
│   │   └── wire-schema.js
│   │
│   ├── config/
│   │   ├── keys.js
│   │   ├── modelos.js
│   │   ├── test-modelos.js
│   │   └── test-source.js
│   │
│   ├── cv/
│   │   ├── source.js
│   │   ├── traceability.js
│   │   ├── validate.js
│   │   └── test-source.js
│   │
│   ├── general/
│   │   ├── email.js
│   │   ├── generate.js
│   │   ├── letter.js
│   │   ├── prompt.js
│   │   ├── traceability.js
│   │   └── validate.js
│   │
│   ├── input/
│   │   └── files.js
│   │
│   ├── output/
│   │   ├── files.js
│   │   ├── general-files.js
│   │   └── naming.js
│   │
│   ├── pdf/
│   │   ├── pdf.js
│   │   └── test-pdf.js
│   │
│   ├── render/
│   │   ├── escape.js
│   │   ├── fonts/
│   │   │   ├── inter-latin-var.woff2
│   │   │   └── OFL.txt
│   │   ├── html.js
│   │   ├── markdown.js
│   │   └── style.css
│   │
│   ├── tui/
│   │   ├── screens/
│   │   │   ├── generar.js
│   │   │   ├── general.js
│   │   │   ├── keys.js
│   │   │   ├── modelos.js
│   │   │   └── perfil.js
│   │   ├── ai-selector.js
│   │   ├── app.js
│   │   ├── index.js
│   │   ├── services.js
│   │   ├── test-screens.js
│   │   ├── theme.js
│   │   └── widgets.js
│   │
│   ├── util/
│   │   └── aviso.js
│   │
│   ├── schema/
│   │   ├── cv.schema.json
│   │   ├── cv.match.schema.json
│   │   └── general.schema.json
│   │
│   ├── app.js
│   └── index.js
│
├── config/
│   └── modelos.json          # local, ignorado por git
│
├── data/
│   ├── UserInfo.md           # local, ignorado por git
│   ├── oferta.md             # local, ignorado por git
│   ├── UserInfo.example.md
│   ├── oferta.example.md
│   └── ImagenUsuario.*
│
├── ia/
│   ├── system.md
│   ├── prompt.md
│   ├── general-system.md
│   └── general-prompt.md
│
├── output/                   # ignorado por git
├── .env                      # local, ignorado por git
├── .env.example
├── .gitignore
├── AGENTS.md
├── CHANGELOG.md
├── LICENSE
├── MEMORY.md
├── package-lock.json
├── package.json
└── README.md
```

---

## Datos de entrada

### `data/UserInfo.md`

Contiene la información real del candidato. Es local y está ignorado por git.

Se utiliza como fuente principal de información para generar el CV.

La información debe ser explícita y estructurada. Usa `data/UserInfo.example.md` como plantilla: incluye las secciones de información profesional, contacto, habilidades, experiencia, proyectos, formación académica, certificaciones e idiomas.

---

### `data/oferta.md`

Contiene la oferta de empleo utilizada para adaptar el CV. También es local e ignorada por git; `data/oferta.example.md` sirve como plantilla.

La oferta se utiliza para establecer prioridades.

No debe utilizarse como fuente de información personal del candidato.

---

## Imagen del usuario

La aplicación puede incluir una imagen del candidato automáticamente.

Debe colocarse en:

```text
data/ImagenUsuario.*
```

Formatos soportados actualmente:

```text
ImagenUsuario.png
ImagenUsuario.jpg
ImagenUsuario.jpeg
ImagenUsuario.webp
```

El sistema detecta el archivo automáticamente y lo integra en el HTML generado.

La imagen se incrusta como `data:` URL para que también esté disponible en la generación del PDF.

---

## Flujo de generación

El flujo del programa principal es:

```text
UserInfo.md
      │
      ▼
parseUserInfo()
      │
      ▼
    SOURCE
      │
      ├──────────────┐
      │              │
      ▼              ▼
   oferta.md       SOURCE
      │              │
      └──────┬───────┘
             ▼
          Modelo IA
             │
             ▼
          CV JSON
             │
             ▼
       Validación JSON
             │
             ▼
        Traceability
             │
       ┌─────┼──────┐
       ▼     ▼      ▼
      MD    HTML    JSON
             │
             ▼
            PDF
```

---

## Proveedores de IA

Todos los proveedores se configuran desde la aplicación: la clave en la CLI (opción 2) o en la pestaña **API Keys**, y el modelo en la CLI (opción 3) o en la pestaña **Modelos**.

### Ollama

Permite utilizar modelos instalados localmente, sin clave.

```env
OLLAMA_BASE_URL=http://localhost:11434
```

La aplicación obtiene los modelos instalados mediante la API de Ollama.

---

### Google Gemini

Requiere `GEMINI_API_KEY`. Los modelos se obtienen dinámicamente de la API.

---

### OpenCode Zen

Requiere `OPENCODE_ZEN_API_KEY` (`OPENCODE_API_KEY` se acepta como alias de lectura). Usa la capa gratuita y el endpoint `chat/completions`.

---

### OpenCode Go

Requiere `OPENCODE_GO_API_KEY` (la documentación de Go usa `OPENCODE_API_KEY`, aceptada como alias de lectura). Es la suscripción de pago de OpenCode y usa el endpoint OpenAI-compatible `POST https://opencode.ai/inference/go/openai/v1/chat/completions`.

Cada petición envía `x-opencode-session`, obligatorio para el servicio. El schema canónico viaja como JSON Schema estricto cuando el modelo lo soporta y se reintenta con `json_object` si la API lo rechaza; los modelos sin retención de datos aparecen como `[zero-retention]` y los gratuitos como `(gratis)`.

---

### Claude (Anthropic)

Requiere `ANTHROPIC_API_KEY` (`CLAUDE_API_KEY` como alias de lectura). Usa `POST /v1/messages` con `fetch` nativo.

---

### Groq

Requiere `GROQ_API_KEY`. Es compatible con OpenAI (`POST /openai/v1/chat/completions`) y usa `response_format: { type: "json_object" }`.

---

## Interfaz de escritorio

La aplicación de escritorio está desarrollada con Electron.

Ejecutar:

```bash
npm run desktop
```

La interfaz permite:

* editar el perfil;
* editar la oferta;
* guardar cambios;
* seleccionar proveedor y modelo;
* configurar modelo favorito, temperatura y tokens;
* gestionar API Keys;
* generar el CV;
* generar el kit de candidatura espontánea (carta, email y CV);
* ver el progreso de la generación por etapas;
* avisar de cambios sin guardar antes de cerrar;
* visualizar el resultado;
* abrir el HTML;
* abrir el PDF;
* abrir la carpeta de salida.

---

## Interfaz de terminal (TUI)

La TUI usa [OpenTUI](https://github.com/sst/opentui) sobre una librería nativa. Se arranca con:

```bash
npm run tui
```

Requisitos:

* **Node.js 26.4 o superior** (el script añade `--experimental-ffi`), o **Bun 1.3+** (`bun src/tui/index.js`).
* Terminal de al menos 80×24 para que el diseño respire (por debajo se recorta, no falla).
* La CLI (`npm start`) y el escritorio (`npm run desktop`) siguen funcionando con Node 22.12+.

Pestañas (teclas `1`–`5`):

| Pestaña | Contenido |
|---------|-----------|
| Específica | Proveedor, modelo, match y layout → CV para `data/oferta.md` |
| General | Empresa, tipo, tono y longitud → carta + email + CV |
| API Keys | Estado enmascarado, pegar/borrar clave y probar conexión |
| Modelos | Modelo favorito, temperaturas y tokens por proveedor + defectos |
| Perfil | Editor de `data/UserInfo.md` y `data/oferta.md` (CTRL+S guarda) |

Atajos: `TAB` cambia de campo, `ENTER` elige/edita, `ESC` cancela, `q` sale.
En Específica: `g` genera, `r` recarga modelos, `o` abre el PDF y `f` la carpeta `output/`.
En General: `g` genera, `r` recarga modelos, `o` abre el CV, `c` la carta y `f` la carpeta.

La TUI no previsualiza HTML ni PDF dentro del terminal: abre los ficheros con la aplicación del sistema. Comparte el mismo pipeline (`src/app.js`, `src/general/generate.js`) que la CLI y el escritorio; el progreso llega por `onProgress` para no escribir en stdout y romper el frame.

Prueba headless de las pantallas (sin terminal interactiva):

```bash
node --experimental-ffi src/tui/test-screens.js
```

---

## CLI

El proyecto también puede ejecutarse desde consola:

```bash
npm start
```

La CLI permite seleccionar proveedor y modelo y ejecutar el mismo pipeline de generación. También incluye la gestión de claves (opción 2) y la configuración de modelos (opción 3).

---

## Archivos generados

Los archivos se almacenan en:

```text
output/
```

El nombre depende de `NOMBRE_ARCHIVO` (o `NOMBRE_USUARIO`) y, en el kit general, también del nombre de la empresa. Si no se define ninguno, se usa `Candidato`. Los espacios y los caracteres no válidos para Windows se eliminan.

CV específico:

```text
output/
├── CV-NombreApellido.json
├── CV-NombreApellido.md
├── CV-NombreApellido.html
└── CV-NombreApellido.pdf
```

Kit general (carta, email y CV adaptado a la empresa):

```text
output/
├── General-Empresa-Carta.md
├── General-Empresa-Carta.pdf
├── General-Empresa-Email.html
├── General-Empresa-Email.pdf
├── CV-NombreApellido-Empresa.json
├── CV-NombreApellido-Empresa.md
├── CV-NombreApellido-Empresa.html
└── CV-NombreApellido-Empresa.pdf
```

---

## JSON Schema

El CV generado se valida mediante JSON Schema.

Schema principal:

```text
src/schema/cv.schema.json
```

Para la respuesta estructurada, Gemini, Claude y OpenCode Go reciben una versión saneada del schema canónico generada por `src/ai/wire-schema.js`: se eliminan las palabras clave que sus APIs no aceptan (`$schema`, `minLength`, `pattern`, `format` y las restricciones numéricas, entre otras). Gemini elimina además `additionalProperties`; OpenCode Go lo fija a `false` y marca todas las propiedades como `required` en modo estricto. Groq usa `response_format: { type: "json_object" }`. El contrato que se valida siempre es el canónico con AJV.

El match y el kit general tienen sus propios esquemas:

```text
src/schema/cv.match.schema.json
src/schema/general.schema.json
```

La validación evita que el resultado final tenga una estructura incompatible con el sistema.

---

## Trazabilidad

Una de las reglas principales del proyecto es que la IA no debe inventar información del candidato.

La información debe proceder de `UserInfo.md`.

La oferta solo define qué información es más relevante.

Ejemplos de información que no debe inferirse:

* tecnologías;
* lenguajes;
* frameworks;
* bases de datos;
* idiomas;
* fechas;
* empresas;
* puestos;
* responsabilidades;
* métricas;
* certificaciones.

La lógica relacionada con esta protección se encuentra principalmente en:

```text
src/cv/source.js
src/cv/traceability.js
ia/system.md
ia/prompt.md
```

---

## Título profesional

El campo `title` puede adaptarse automáticamente a la oferta.

A diferencia de los datos estructurales del candidato, el título puede ser generado por el modelo siempre que no implique información falsa sobre experiencia o seniority.

Por ejemplo, el título original:

```text
DESARROLLADOR FULL STACK
```

puede adaptarse a un puesto objetivo relacionado con backend.

---

## Desarrollo

Para ejecutar el proyecto en modo CLI:

```bash
npm start
```

Para ejecutar la aplicación de escritorio:

```bash
npm run desktop
```

Para ejecutar la TUI (requiere Node 26.4+):

```bash
npm run tui
```

Para probar las pantallas de la TUI sin terminal interactiva:

```bash
node --experimental-ffi src/tui/test-screens.js
```

Para probar el parser del perfil (si falta `data/UserInfo.md`, usa `data/UserInfo.example.md`):

```bash
node src/cv/test-source.js
```

Para comprobar el estado de las claves y la configuración de modelos:

```bash
node src/config/test-source.js
node src/config/test-modelos.js
```

Para comprobar el motor de PDF sin llamar a ningún proveedor de IA:

```bash
node src/pdf/test-pdf.js
```

---

## Tecnologías

El proyecto utiliza principalmente:

* Node.js
* JavaScript
* Electron
* OpenTUI
* HTML
* CSS
* Playwright
* AJV
* Ollama
* Google Gemini
* OpenCode Zen
* OpenCode Go
* Claude (Anthropic)
* Groq

---

## Limitaciones conocidas

- Beta orientada a Windows. La CLI y el escritorio usan APIs multiplataforma, pero el flujo principal se prueba en Windows.
- La generación de PDF no requiere Chrome: el escritorio usa Electron y la CLI/TUI usan Playwright. Si no encuentra ningún navegador, la primera generación descarga Chromium (necesita conexión).
- La TUI exige Node 26.4+ por la librería nativa de OpenTUI.
- Ollama, OpenCode Zen, OpenCode Go, Claude, Gemini y Groq están implementados, pero las pruebas con claves reales de Claude, Gemini, Groq y OpenCode Go aún no cubren todos los modelos y casos.
- No hay suite de tests formal: el proyecto incluye scripts de comprobación y un smoke test de la TUI.
- El escritorio no está firmado ni empaquetado como instalador; se ejecuta con `npm run desktop`.

---

## Licencia

Código publicado bajo **0BSD**: puedes usar, copiar, modificar y distribuir el proyecto con o sin fines comerciales, sin necesidad de atribución. Consulta `LICENSE`.

La fuente [Inter](https://rsms.me/inter/) incluida en `src/render/fonts/` se distribuye bajo la SIL Open Font License 1.1 (`src/render/fonts/OFL.txt`).

---

## Objetivo del proyecto

El objetivo de CV Automizer es automatizar la creación de CVs adaptados a distintas ofertas de empleo manteniendo un equilibrio entre:

* automatización;
* personalización;
* trazabilidad;
* control sobre los datos;
* generación local mediante modelos de IA;
* generación de documentos listos para entregar.

La IA se utiliza principalmente para adaptar y presentar la información existente, no para crear información ficticia sobre el candidato.
