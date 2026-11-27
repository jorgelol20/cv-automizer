import { getKeysStatus } from "./keys.js";

const estado = await getKeysStatus();

console.log("🔑 API keys locales (enmascaradas)");
console.log();

for (const clave of estado) {
    const marca = clave.configured ? "✅" : "❌";
    const valor = clave.configured
        ? `${clave.masked} (${clave.source})`
        : "no configurada";

    console.log(
        `${marca} ${clave.etiqueta} [${clave.name}]: ${valor}`
    );
}
