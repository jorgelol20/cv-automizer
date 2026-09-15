# CV Automizer

Aplicación para generar CVs adaptados automáticamente a una oferta de empleo utilizando modelos de IA.

El proyecto utiliza una fuente de datos estructurada en Markdown con la información del candidato, una oferta de empleo y un pipeline de generación que produce el CV en JSON, Markdown, HTML y PDF.

Actualmente dispone de una interfaz de escritorio basada en Electron y mantiene también un modo CLI.

---

## Características

- Generación de CV adaptado a una oferta de empleo.
- Soporte para modelos locales mediante Ollama.
- Soporte para Google Gemini.
- Selección de proveedor y modelo desde la aplicación.
- Edición de `UserInfo.md` desde la interfaz.
- Edición de `oferta.md` desde la interfaz.
- Generación de JSON.
- Generación de Markdown.
- Generación de HTML.
- Generación de PDF.
- Previsualización del HTML generado dentro de la aplicación.
- Apertura directa del HTML y PDF generado.
- Apertura de la carpeta de salida.
- Soporte opcional para una imagen de usuario.
- Validación del CV generado mediante JSON Schema.
- Sistema de trazabilidad para limitar información no respaldada por los datos del candidato.

---

## Requisitos

### Software

- Node.js
- npm
- Ollama (si se utilizan modelos locales)
- Google Gemini API Key (si se utiliza Gemini)

### Sistema operativo

El proyecto está orientado principalmente a Windows, aunque gran parte del código utiliza APIs multiplataforma de Node.js y Electron.

---

## Instalación

Clonar el repositorio:

```bash
git clone <URL_DEL_REPOSITORIO>
cd cv-automizer
````

Instalar dependencias:

```bash
npm install
```

Instalar Electron:

```bash
npm install --save-dev electron
```

---

## Configuración

Crear un archivo `.env` en la raíz del proyecto.

Ejemplo:

```env
AI_PROVIDER=ollama

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:9b

GEMINI_API_KEY=TU_API_KEY

NOMBRE_USUARIO=Jorge Colomer Albertos
NOMBRE_ARCHIVO=Jorge Colomer Albertos
```

### Variables

#### `AI_PROVIDER`

Proveedor de IA utilizado por el modo CLI o por la configuración inicial.

Valores habituales:

```text
ollama
gemini
```

#### `OLLAMA_BASE_URL`

URL del servidor local de Ollama.

Ejemplo:

```env
OLLAMA_BASE_URL=http://localhost:11434
```

#### `OLLAMA_MODEL`

Modelo utilizado por defecto cuando se trabaja con Ollama.

Ejemplo:

```env
OLLAMA_MODEL=qwen3.5:9b
```

#### `GEMINI_API_KEY`

Clave API de Google Gemini.

```env
GEMINI_API_KEY=...
```

#### `NOMBRE_USUARIO`

Nombre utilizado para la generación final del CV.

```env
NOMBRE_USUARIO=Jorge Colomer Albertos
```

#### `NOMBRE_ARCHIVO`

Nombre base utilizado para los archivos generados.

Los espacios se eliminan automáticamente.

Ejemplo:

```env
NOMBRE_ARCHIVO=Jorge Colomer Albertos
```

genera archivos como:

```text
CV-JorgeColomerAlbertos.json
CV-JorgeColomerAlbertos.md
CV-JorgeColomerAlbertos.html
CV-JorgeColomerAlbertos.pdf
```

---

# Estructura del proyecto

```text
cv-automizer/
│
├── desktop/
│   ├── app.js
│   ├── index.html
│   ├── main.cjs
│   ├── preload.cjs
│   └── style.css
│
├── src/
│   ├── ai/
│   │   ├── factory.js
│   │   ├── gemini.js
│   │   ├── menu.js
│   │   ├── models.js
│   │   ├── ollama.js
│   │   ├── prompt.js
│   │   └── provider.js
│   │
│   ├── cv/
│   │   ├── source.js
│   │   ├── traceability.js
│   │   ├── validate.js
│   │   └── test-source.js
│   │
│   ├── input/
│   │   └── files.js
│   │
│   ├── output/
│   │   └── files.js
│   │
│   ├── pdf/
│   │   └── pdf.js
│   │
│   ├── render/
│   │   ├── html.js
│   │   ├── markdown.js
│   │   └── style.css
│   │
│   ├── schema/
│   │   ├── cv.schema.json
│   │   └── cv.gemini.schema.json
│   │
│   ├── app.js
│   └── index.js
│
├── data/
│   ├── UserInfo.md
│   ├── oferta.md
│   └── ImagenUsuario.*
│
├── output/
│
├── ia/
│   ├── system.md
│   └── prompt.md
│
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

# Datos de entrada

## `data/UserInfo.md`

Contiene la información real del candidato.

Se utiliza como fuente principal de información para generar el CV.

La información debe ser explícita y estructurada.

Ejemplo:

```md
# JORGE COLOMER ALBERTOS

## Información profesional

**Título:** DESARROLLADOR FULL STACK

## Contacto

**Email:** jorgejorgemonovar@gmail.com
**Teléfono:** 602215143
**Ubicación:** Monóvar, Alicante
**LinkedIn:** https://www.linkedin.com/...
**GitHub:** https://github.com/...

## Habilidades

**Lenguajes:** JavaScript, Python, PHP, SQL
**Frameworks:** React, Bootstrap, FastAPI, Laravel
**Bases de datos:** MySQL, PostgreSQL, MariaDB
**Tecnologías / Herramientas:** Git, GitHub, Docker

## Experiencia

### Empresa

**Puesto:** DESARROLLADOR FULL STACK
**Ubicación:** Alicante
**Inicio:** 2024
**Fin:** 2026

- Descripción de la experiencia.
- Otra descripción.
```

---

## `data/oferta.md`

Contiene la oferta de empleo utilizada para adaptar el CV.

Ejemplo:

```md
# Backend Developer

## Descripción

Buscamos un desarrollador backend para incorporarse a nuestro equipo.

## Requisitos

- Experiencia con Node.js
- Experiencia con TypeScript
- Conocimientos de PostgreSQL
- Experiencia desarrollando APIs REST
- Conocimientos de Docker
- Experiencia trabajando con Git

## Se valorará

- NestJS
- AWS
- MongoDB
- Experiencia en arquitecturas de microservicios
```

La oferta se utiliza para establecer prioridades.

No debe utilizarse como fuente de información personal del candidato.

---

# Imagen del usuario

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

# Flujo de generación

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

# Proveedores de IA

## Ollama

Permite utilizar modelos instalados localmente.

Ejemplo:

```env
OLLAMA_BASE_URL=http://localhost:11434
```

La aplicación obtiene los modelos instalados mediante la API de Ollama.

Un modelo local puede ser útil para trabajar sin depender de una API externa.

---

## Google Gemini

La aplicación utiliza la API de Gemini y obtiene dinámicamente los modelos disponibles para la API Key configurada.

La selección del modelo se realiza desde la aplicación.

---

# Interfaz de escritorio

La aplicación de escritorio está desarrollada con Electron.

Ejecutar:

```bash
npm run desktop
```

La interfaz permite:

* editar el perfil;
* editar la oferta;
* guardar cambios;
* seleccionar proveedor;
* seleccionar modelo;
* generar el CV;
* visualizar el resultado;
* abrir el HTML;
* abrir el PDF;
* abrir la carpeta de salida.

---

# CLI

El proyecto también puede ejecutarse desde consola:

```bash
npm start
```

El CLI permite seleccionar proveedor y modelo y ejecutar el mismo pipeline de generación.

---

# Archivos generados

Los archivos se almacenan en:

```text
output/
```

El nombre depende de:

```env
NOMBRE_ARCHIVO
```

Ejemplo:

```text
output/
├── CV-JorgeColomerAlbertos.json
├── CV-JorgeColomerAlbertos.md
├── CV-JorgeColomerAlbertos.html
└── CV-JorgeColomerAlbertos.pdf
```

---

# JSON Schema

El CV generado se valida mediante JSON Schema.

Schema principal:

```text
src/schema/cv.schema.json
```

También existe un schema específico para determinados casos de respuesta estructurada de Gemini:

```text
src/schema/cv.gemini.schema.json
```

La validación evita que el resultado final tenga una estructura incompatible con el sistema.

---

# Trazabilidad

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

# Título profesional

El campo `title` puede adaptarse automáticamente a la oferta.

A diferencia de los datos estructurales del candidato, el título puede ser generado por el modelo siempre que no implique información falsa sobre experiencia o seniority.

Por ejemplo, el título original:

```text
DESARROLLADOR FULL STACK
```

puede adaptarse a un puesto objetivo relacionado con backend.

---

# Desarrollo

Para ejecutar el proyecto en modo CLI:

```bash
npm start
```

Para ejecutar la aplicación de escritorio:

```bash
npm run desktop
```

Para probar el parser del perfil:

```bash
node src/cv/test-source.js
```
**Nota** *Te printará un JSON con la información base que se puede extraer de tu MD. Intenta utilizar la plantilla dada para crear el tuyo dado que así no tendrás que hacer modificaciones.*

---

# Tecnologías

El proyecto utiliza principalmente:

* Node.js
* JavaScript
* Electron
* HTML
* CSS
* Playwright
* AJV
* Ollama
* Google Gemini

---

# Objetivo del proyecto

El objetivo de CV Automizer es automatizar la creación de CVs adaptados a distintas ofertas de empleo manteniendo un equilibrio entre:

* automatización;
* personalización;
* trazabilidad;
* control sobre los datos;
* generación local mediante modelos de IA;
* generación de documentos listos para entregar.

La IA se utiliza principalmente para adaptar y presentar la información existente, no para crear información ficticia sobre el candidato.

```
