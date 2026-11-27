# PROMPT — Adaptación de CV

## Entradas

### USER_INFO

```text
{{USER_INFO}}
```

### JOB_OFFER

```text
{{JOB_OFFER}}
```

{{LAYOUT_INSTRUCTION}}

## Objetivo

Adapta `USER_INFO` a `JOB_OFFER` maximizando relevancia, coincidencia ATS y claridad, sin inventar nada. `JOB_OFFER` decide qué priorizar; `USER_INFO` decide qué se puede afirmar; el contexto decide dónde; la relación explícita decide cómo.

## Proceso (interno, no lo expliques)

1. **Oferta:** extrae título, tecnologías, responsabilidades y keywords; clasifica cada necesidad en `MUST_HAVE / HIGH / MEDIUM / LOW`.
2. **Candidato:** inventaría identidad, skills, y para cada experiencia/proyecto/formación sus actividades y tecnologías explícitamente asociadas.
3. **Evidencia:** marca cada elemento como `GLOBAL / CONTEXTUAL / DE_RELACIÓN` (ver system). Un `MATCH_PARCIAL` o `CONTEXTUAL` sirve para priorizar, nunca para afirmar equivalencia completa.
4. **Redacción:** prioriza `MUST_HAVE` respaldado → `HIGH` → `MEDIUM` → `LOW`; conserva nombres técnicos exactos; resume o combina puntos redundantes sin cambiar hechos; omite lo irrelevante para la oferta.
5. **Título y perfil:** adapta el título solo si no añade seniority ni rol no demostrado; perfil breve y factual.
6. **Auditoría:** aplica la auto-auditoría del system a cada frase y elimina lo no respaldado.

## Formatos

- **Estándar (por defecto):** conserva la información valiosa; resume solo para mejorar claridad o relevancia.
- **One-page (solo si `{{LAYOUT_INSTRUCTION}}` lo pide):** presupuesto total 27 líneas: perfil 2, experiencia 12 (máx. 3 puestos × 1 encabezado + 3 bullets de 110-130 caracteres), proyectos 8 (máx. 2 × 1 + 3), educación 3 (1 formación × 1 + 1, resto en 1 línea), skills 2 (una línea por categoría, máx. 2 tecnologías por bullet, frases nominales). Orden de recorte: primero nº de entradas con detalle, luego bullets por entrada, luego caracteres; nunca pierdas una keyword `MUST_HAVE/HIGH`.

Genera exclusivamente el JSON que exige la salida estructurada, sin comentarios ni Markdown fuera del JSON.
