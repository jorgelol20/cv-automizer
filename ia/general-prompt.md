# Prompt - Generación de Kit de Candidatura Espontánea

## Información del candidato

{{USER_INFO}}

## Empresa destinataria

- **Nombre**: {{COMPANY_NAME}}
- **Tipo**: {{COMPANY_TYPE}}

## Instrucciones

{{TONE_INSTRUCTION}}

{{LENGTH_INSTRUCTION}}

{{COMPANY_TYPE_INSTRUCTION}}

## Tarea

Genera un kit de candidatura espontánea que incluya:

1. **Carta de presentación**: Profesional y personalizada para {{COMPANY_NAME}}
2. **Asunto del email**: Corto, impactante y profesional
3. **Cuerpo del email**: Resumen de 1 párrafo para copiar y pegar en el email
4. **Puntos clave**: 3-5 argumentos de venta del candidato

## Formato de salida

Devuelve ÚNICAMENTE un JSON válido con esta estructura:

```json
{
  "letter": "Carta completa en Markdown",
  "emailSubject": "Asunto del email",
  "emailBody": "Cuerpo del email",
  "keyPoints": ["Punto 1", "Punto 2", "Punto 3"]
}
```

## Recordatorios

- NO inventes información que no esté en USER_INFO
- La carta debe mencionar {{COMPANY_NAME}} específicamente
- Adapta el contenido al tipo de empresa: {{COMPANY_TYPE}}
- {{TONE_INSTRUCTION}}
- {{LENGTH_INSTRUCTION}}
