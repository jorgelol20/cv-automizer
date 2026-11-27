import { getModelosConfig } from "./modelos.js";

const config = await getModelosConfig();

console.log("🧠 Configuración de modelos (local)");
console.log();

console.log("Defectos:");

for (const [campo, valor] of Object.entries(config.defaults)) {
    console.log(`  ${campo}: ${valor}`);
}

console.log();

for (const [provider, entrada] of Object.entries(config.providers)) {
    const fijados = Object.entries(entrada.valores).filter(
        ([, valor]) => valor !== null
    );

    if (fijados.length === 0) {
        console.log(`❌ ${entrada.etiqueta} [${provider}]: sin overrides (hereda defectos)`);
        continue;
    }

    console.log(`✅ ${entrada.etiqueta} [${provider}]:`);

    for (const [campo, valor] of fijados) {
        console.log(`  ${campo}: ${valor}`);
    }
}
