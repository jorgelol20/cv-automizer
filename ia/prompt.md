# PROMPT — CV ADAPTATION ORCHESTRATOR

## INPUTS

### USER_INFO

```text
{{USER_INFO}}
```

### JOB_OFFER

```text
{{JOB_OFFER}}
```

---

# OBJETIVO

Adapta `USER_INFO` a `JOB_OFFER` para maximizar:

* relevancia;
* coincidencia ATS;
* presencia de keywords;
* claridad;
* priorización de información;
* legibilidad humana.

Debes hacerlo **sin inventar ninguna información**.

`USER_INFO` es la única fuente de hechos sobre el candidato.

`JOB_OFFER` solo determina relevancia y prioridad.

---

# REGLA PRINCIPAL

Antes de escribir cualquier frase, determina:

1. ¿Qué hecho estoy afirmando?
2. ¿Dónde aparece ese hecho en `USER_INFO`?
3. ¿A qué contexto pertenece?
4. ¿Existe una relación explícita entre la tecnología y la actividad?
5. ¿Estoy añadiendo algo que solo es técnicamente probable?

Si una afirmación no tiene evidencia concreta:

> NO LA ESCRIBAS.

---

# FASE 1 — ANALIZAR JOB_OFFER

Extrae internamente:

* título objetivo;
* tecnologías;
* lenguajes;
* frameworks;
* bases de datos;
* herramientas;
* cloud;
* metodologías;
* responsabilidades;
* conocimientos;
* competencias;
* requisitos obligatorios;
* requisitos deseables;
* keywords ATS;
* conceptos repetidos;
* términos equivalentes.

Clasifica las keywords por prioridad:

```text
MUST_HAVE
HIGH
MEDIUM
LOW
```

---

# FASE 2 — ANALIZAR USER_INFO

Construye internamente un inventario de:

### IDENTIDAD

* nombre;
* título;
* contacto;
* ubicación.

### SKILLS

* lenguajes;
* frameworks;
* bases de datos;
* tecnologías;
* herramientas.

### EXPERIENCIA

Para cada experiencia:

* empresa;
* puesto;
* ubicación;
* fechas;
* actividades;
* tecnologías explícitamente asociadas;
* responsabilidades explícitas;
* resultados explícitos.

### PROYECTOS

Para cada proyecto:

* nombre;
* URL;
* tecnologías;
* actividades;
* responsabilidades;
* integraciones;
* despliegue;
* infraestructura;
* resultados.

### EDUCACIÓN

Para cada formación:

* título;
* institución;
* fechas;
* conocimientos;
* tecnologías;
* actividades;
* resultados académicos.

---

# FASE 3 — CLASIFICAR LA EVIDENCIA

Para cada elemento relevante, determina:

```text
EVIDENCIA_GLOBAL
EVIDENCIA_CONTEXTUAL
EVIDENCIA_DE_RELACIÓN
```

Ejemplo:

```text
AWS
→ EVIDENCIA_GLOBAL
```

si solo aparece en Skills.

```text
Docker + Scoundrel's Quest + Contenerización
→ EVIDENCIA_CONTEXTUAL + EVIDENCIA_DE_RELACIÓN
```

porque la relación aparece explícitamente.

---

# FASE 4 — CREAR MAPA DE MATCH

Relaciona las keywords de `JOB_OFFER` con `USER_INFO`.

Usa:

```text
KEYWORD_EXACTA
KEYWORD_NORMALIZADA
KEYWORD_COMPUESTA_RESPALDADA
MATCH_PARCIAL
MATCH_CONTEXTUAL
SIN_EVIDENCIA
```

No conviertas:

```text
MATCH_PARCIAL
```

en:

```text
KEYWORD_EXACTA
```

No conviertas:

```text
MATCH_CONTEXTUAL
```

en una capacidad explícita del candidato.

---

# FASE 5 — PROTEGER LA EVIDENCIA

Antes de redactar, aplica estas reglas:

## REGLA A — Tecnología ≠ actividad

```text
PostgreSQL
```

no significa:

```text
administración de bases de datos
optimización
diseño de BBDD
```

---

## REGLA B — Tecnología ≠ contexto

```text
AWS
```

no significa:

```text
infraestructura cloud
DevOps
despliegue
arquitectura cloud
```

---

## REGLA C — Tecnología ≠ tecnología relacionada

```text
FastAPI
```

no significa automáticamente:

```text
REST
API development
microservices
```

---

## REGLA D — Proyecto ≠ experiencia profesional

Las tecnologías de un proyecto no deben atribuirse a una empresa.

---

## REGLA E — Educación ≠ experiencia profesional

Una tecnología estudiada no debe presentarse automáticamente como experiencia laboral.

---

# FASE 6 — PRESERVAR KEYWORDS

Identifica las keywords de `USER_INFO` que sean relevantes para `JOB_OFFER`.

Preserva especialmente:

* nombres exactos de tecnologías;
* lenguajes;
* frameworks;
* bases de datos;
* herramientas;
* servicios cloud;
* plataformas;
* herramientas de IA.

No las reemplaces por términos genéricos.

Ejemplo:

```text
FastAPI
```

debe permanecer como:

```text
FastAPI
```

y no simplemente:

```text
framework backend
```

---

# FASE 7 — PRIORIZAR INFORMACIÓN

Ordena la información según:

```text
1. MUST_HAVE respaldado
2. HIGH respaldado
3. MEDIUM respaldado
4. LOW respaldado
5. Información general relevante
```

No elimines una keyword importante simplemente porque esté en Skills y no en Experiencia.

---

# FASE 8 — ADAPTAR EL TÍTULO

Analiza el título de la oferta.

Comprueba si puede utilizarse sin introducir:

* seniority;
* especialización;
* responsabilidades;
* dominio;
* arquitectura;
* rol no demostrado.

Si es compatible con `USER_INFO`, adapta el título.

Si no lo es, conserva un título fiel al candidato.

---

# FASE 9 — REDACTAR PERFIL

Genera un perfil breve.

Debe priorizar:

1. título profesional;
2. tecnologías principales relevantes;
3. experiencia relevante;
4. proyectos relevantes;
5. áreas explícitamente demostradas.

No utilices relleno promocional.

No escribas:

> Desarrollador altamente motivado y orientado a resultados.

salvo que exista evidencia.

---

# FASE 10 — REDACTAR SKILLS

Mantén las tecnologías declaradas.

Reordénalas para priorizar las relevantes para la oferta.

No añadas ninguna tecnología que no esté en `USER_INFO`.

No deduzcas tecnologías relacionadas.

Ejemplo:

```text
USER_INFO:
FastAPI
```

No añadas:

```text
REST
```

---

# FASE 11 — REDACTAR EXPERIENCIA

Para cada experiencia:

1. conserva la empresa;
2. conserva el puesto;
3. conserva ubicación y fechas;
4. identifica actividades explícitas;
5. identifica tecnologías explícitamente asociadas;
6. prioriza las relacionadas con la oferta;
7. reformula solo lingüísticamente;
8. no añadas responsabilidades.

### REGLA CRÍTICA

No hagas:

```text
AWS en Skills
↓
Gestión de infraestructura AWS en NTT Data
```

Sí puedes hacer:

```text
Scoundrel's Quest:
Docker
+
Contenerización explícita
↓
Contenerización de la aplicación mediante Docker
```

---

# FASE 12 — REDACTAR PROYECTOS

Prioriza proyectos que demuestren keywords relevantes.

Conserva:

* tecnologías;
* actividades;
* APIs;
* integración;
* persistencia;
* Docker;
* despliegue;
* GitHub Actions;
* frontend;
* backend;

solo cuando estén explícitamente presentes.

No infieras características arquitectónicas.

---

# FASE 13 — REDACTAR EDUCACIÓN

Utiliza educación para demostrar:

* formación;
* conocimientos;
* tecnologías;
* metodologías;
* competencias técnicas.

No presentes una formación como experiencia laboral.

Conserva resultados académicos cuando sean relevantes y estén presentes.

---

# FASE 14 — OPTIMIZACIÓN ATS

Comprueba que las keywords relevantes aparezcan en el lugar más adecuado.

Prioridad:

```text
Título
↓
Perfil
↓
Experiencia
↓
Proyectos
↓
Skills
```

Pero no fuerces una keyword dentro de un contexto donde no exista evidencia.

Una keyword global puede permanecer en Skills.

Una actividad contextual debe permanecer en su experiencia/proyecto/formación.

---

# FASE 15 — CONTROL DE KEYWORD LOSS

Compara internamente:

```text
KEYWORDS RELEVANTES EN USER_INFO
```

contra:

```text
KEYWORDS PRESENTES EN CV FINAL
```

Si se ha perdido una keyword relevante y existe espacio apropiado para recuperarla, incorpórala.

Especial atención a:

* Python;
* JavaScript;
* PHP;
* SQL;
* React;
* FastAPI;
* Laravel;
* Eloquent ORM;
* Streamlit;
* Vite;
* Recharts;
* MySQL;
* PostgreSQL;
* MariaDB;
* AWS;
* Docker;
* GitHub Actions;
* Linux;
* WordPress;
* OpenAI;
* Gemini;
* Git;
* GitHub.

---

# FASE 16 — CONTROL DE KEYWORD STUFFING

No repitas artificialmente las mismas keywords.

La frecuencia debe parecer natural.

No conviertas:

> Python, Python, Python, FastAPI, FastAPI...

en una estrategia ATS.

La optimización debe seguir siendo legible.

---

# FASE 17 — AUDITORÍA DE CADA FRASE

Para cada frase factual del CV:

### Pregunta 1

¿Está respaldada por `USER_INFO`?

### Pregunta 2

¿La fuente es concreta?

### Pregunta 3

¿La frase conserva el mismo significado?

### Pregunta 4

¿La tecnología está realmente asociada al contexto?

### Pregunta 5

¿He añadido una responsabilidad?

### Pregunta 6

¿He añadido un resultado?

### Pregunta 7

¿He añadido seniority?

### Pregunta 8

¿He añadido un contexto técnico?

### Pregunta 9

¿He añadido una valoración?

Si alguna respuesta implica una ampliación no respaldada:

> REESCRIBE O ELIMINA.

---

# FASE 18 — AUDITORÍA DE INFERENCIAS TÉCNICAS

Busca explícitamente estas transformaciones:

```text
Python → Backend
React → Frontend
FastAPI → REST
FastAPI → APIs
PostgreSQL → Administración
PostgreSQL → Optimización
Docker → Despliegue
Docker → DevOps
AWS → Infraestructura
AWS → Cloud management
GitHub Actions → CI/CD
```

Solo son válidas si `USER_INFO` contiene evidencia explícita de la relación.

---

# FASE 19 — AUDITORÍA DE CONTEXTO

Comprueba:

```text
¿La tecnología aparece en esta experiencia?
¿La actividad aparece en este proyecto?
¿El conocimiento pertenece realmente a esta formación?
¿Estoy moviendo información de Skills a Experiencia?
¿Estoy moviendo información de Educación a Experiencia?
¿Estoy moviendo información de un proyecto a una empresa?
```

Si una asociación no está respaldada:

> ELIMÍNALA.

---

# FASE 20 — AUDITORÍA DE PROMESAS

Busca afirmaciones como:

* experto;
* senior;
* avanzado;
* especializado;
* eficiente;
* robusto;
* escalable;
* optimizado;
* alto rendimiento;
* alta disponibilidad;
* producción;
* liderazgo;
* arquitectura;
* estrategia.

Comprueba que cada una esté respaldada.

Si no lo está:

> ELIMÍNALA.

---

# FASE 21 — AUDITORÍA DE DATOS

Comprueba:

* nombre;
* email;
* teléfono;
* ubicación;
* LinkedIn;
* GitHub;
* empresas;
* puestos;
* instituciones;
* fechas;
* URLs.

No completes campos vacíos mediante inferencia.

---

# FASE 22 — AUDITORÍA DE CONSISTENCIA

Verifica que:

* no existan contradicciones;
* no haya tecnologías inventadas;
* no haya experiencias inventadas;
* no haya responsabilidades inventadas;
* no haya resultados inventados;
* no haya ubicaciones inventadas;
* no haya fechas inventadas;
* no haya seniority inventado;
* no se mezclen contextos.

---

# FASE 23 — REGLA DE MINIMALIDAD

Si una frase puede escribirse de dos formas:

```text
A = más sofisticada pero requiere inferencia

B = más sencilla y totalmente demostrada
```

elige:

```text
B
```

Nunca sacrifiques evidencia por estilo.

---

# FASE 24 — GENERAR JSON

Después de completar todas las auditorías, genera exclusivamente el JSON solicitado.

Utiliza exactamente el esquema proporcionado por la aplicación.

No:

* añadas campos;
* elimines campos obligatorios;
* cambies nombres;
* cambies tipos;
* añadas comentarios;
* añadas Markdown;
* añadas explicaciones.

---

# REGLA FINAL

No escribas el CV que un candidato con estas tecnologías podría tener.

Escribe únicamente el CV que puede demostrarse a partir de `USER_INFO`, optimizado para las necesidades de `JOB_OFFER`.

### PRINCIPIO FUNDAMENTAL

```text
JOB_OFFER determina QUÉ priorizar.

USER_INFO determina QUÉ se puede afirmar.

EL CONTEXTO determina DÓNDE se puede afirmar.

LA EVIDENCIA DE RELACIÓN determina CÓMO se puede afirmar.
```

Nunca describas lo que una tecnología implica.

Describe únicamente lo que `USER_INFO` demuestra.
