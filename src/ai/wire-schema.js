// Saneado de JSON Schema para las APIs de Gemini y Claude.
//
// El contrato canónico (src/schema/cv.schema.json, cv.match.schema.json
// y general.schema.json) se valida con AJV después de la respuesta.
// Las APIs de estos proveedores solo aceptan un subconjunto de JSON
// Schema y rechazan palabras clave de validación que el contrato sí usa.
// Aquí se eliminan esas claves sin tocar la estructura del objeto.

const NO_SOPORTADAS_GEMINI = new Set([
    "$schema",
    "$id",
    "additionalProperties",
    "minLength",
    "maxLength",
    "pattern",
    "format",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "minItems",
    "maxItems",
    "uniqueItems",
    "minProperties",
    "maxProperties"
]);

// Claude mantiene `additionalProperties` (lo acepta su API),
// pero no el resto de restricciones de validación.
const NO_SOPORTADAS_CLAUDE = new Set([
    "$schema",
    "$id",
    "minLength",
    "maxLength",
    "pattern",
    "format",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "minItems",
    "maxItems",
    "uniqueItems",
    "minProperties",
    "maxProperties"
]);

function limpiar(schema, claves) {
    if (Array.isArray(schema)) {
        return schema.map(
            (item) => limpiar(item, claves)
        );
    }

    if (!schema || typeof schema !== "object") {
        return schema;
    }

    const limpio = {};

    for (const [clave, valor] of Object.entries(schema)) {
        if (claves.has(clave)) {
            continue;
        }

        limpio[clave] = limpiar(valor, claves);
    }

    return limpio;
}

export function schemaParaGemini(schema) {
    return limpiar(schema, NO_SOPORTADAS_GEMINI);
}

export function schemaParaClaude(schema) {
    return limpiar(schema, NO_SOPORTADAS_CLAUDE);
}

// El endpoint OpenAI-compatible de OpenCode Go acepta el subconjunto
// de Claude, pero en modo `strict` exige además que cada objeto
// declare todas sus propiedades en `required` y `additionalProperties: false`.
function aplicarStrict(schema) {
    if (Array.isArray(schema)) {
        return schema.map(aplicarStrict);
    }

    if (!schema || typeof schema !== "object") {
        return schema;
    }

    const resultado = {};

    for (const [clave, valor] of Object.entries(schema)) {
        resultado[clave] = aplicarStrict(valor);
    }

    const propiedades = schema.properties;

    if (
        propiedades &&
        typeof propiedades === "object" &&
        !Array.isArray(propiedades)
    ) {
        resultado.required = Object.keys(propiedades);
        resultado.additionalProperties = false;
    }

    return resultado;
}

export function schemaParaGo(schema) {
    return aplicarStrict(
        limpiar(schema, NO_SOPORTADAS_CLAUDE)
    );
}
