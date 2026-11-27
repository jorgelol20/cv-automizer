// Prueba headless de la TUI: monta el shell con el
// renderer de test de OpenTUI (salida en memoria),
// cambia de pestaña y ejecuta atajos básicos.
//
// Uso: node --experimental-ffi src/tui/test-screens.js
//
// No requiere red ni claves: si faltan, cada
// pantalla muestra su error sin romper el frame.

import { createTestRenderer } from "@opentui/core/testing";

import { crearApp } from "./app.js";
import { crearLog } from "./widgets.js";

const setup = await createTestRenderer({
    width: 100,
    height: 30
});

const fallos = [];

function comprobar(nombre, condicion) {
    if (!condicion) {
        fallos.push(nombre);
    }
}

function esperar(ms = 0) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Un keypress necesita un tick para que el
// renderer lo procese antes de capturar el frame.
async function pulsar(accion) {
    accion();
    await setup.renderOnce();
    await esperar(40);
    await setup.renderOnce();
}

async function irA(numero) {
    await pulsar(() => setup.mockInput.pressKey(String(numero)));
}

let app;

try {
    app = crearApp(setup.renderer);

    await setup.renderOnce();
    await esperar(80);
    await setup.renderOnce();

    const inicio = setup.captureCharFrame();

    comprobar("cabecera con pestañas", inicio.includes("CV Automizer"));
    comprobar("pestaña Específica", inicio.includes("Específica"));
    comprobar("panel de proveedor", inicio.includes("Proveedor"));
    comprobar("barra de pistas", inicio.includes("g generar"));

    console.log("=== 1 Específica ===");
    console.log(inicio);

    // TAB recorre los campos del selector de IA.
    const antesTab = setup.renderer.currentFocusedRenderable;
    await pulsar(() => setup.mockInput.pressTab());
    comprobar(
        "TAB cambia de campo",
        antesTab !== setup.renderer.currentFocusedRenderable
    );

    await irA(2);

    const general = setup.captureCharFrame();

    comprobar("pantalla General", general.includes("Longitud"));
    comprobar("campo empresa", general.includes("Empresa"));
    comprobar("pista de generar", general.includes("g generar"));

    console.log("=== 2 General ===");
    console.log(general);

    await irA(3);

    const claves = setup.captureCharFrame();

    comprobar("pantalla API Keys", claves.includes("API Keys"));
    comprobar("aviso .env", claves.includes(".env"));

    console.log("=== 3 API Keys ===");
    console.log(claves);

    await pulsar(() => setup.mockInput.pressEnter());

    const editandoClave = setup.captureCharFrame();

    comprobar(
        "editor de clave visible",
        editandoClave.includes("Nueva clave")
    );

    await pulsar(() => setup.mockInput.pressEscape());

    comprobar(
        "ESC cancela la edición de la clave",
        setup.renderer.currentFocusedRenderable?.constructor.name ===
            "SelectRenderable"
    );

    await irA(4);

    const modelos = setup.captureCharFrame();

    comprobar("pantalla Modelos", modelos.includes("Configuración"));
    comprobar("herencia visible", modelos.includes("hereda"));

    console.log("=== 4 Modelos ===");
    console.log(modelos);

    await pulsar(() => setup.mockInput.pressEnter());

    // El primer ENTER elige el proveedor y pasa el
    // foco a los campos; el segundo abre el editor.
    await pulsar(() => setup.mockInput.pressEnter());

    comprobar(
        "editor de campo visible",
        setup.captureCharFrame().includes("vacío = heredar")
    );

    await pulsar(() => setup.mockInput.pressEscape());

    await irA(5);

    const perfil = setup.captureCharFrame();

    comprobar("pantalla Perfil", perfil.includes("UserInfo.md"));
    comprobar("editor de oferta", perfil.includes("oferta.md"));

    console.log("=== 5 Perfil ===");
    console.log(perfil);

    // TAB dentro de un textarea cambia de editor,
    // no inserta un tabulador.
    const antes = setup.renderer.currentFocusedRenderable;
    await pulsar(() => setup.mockInput.pressTab());
    const despues = setup.renderer.currentFocusedRenderable;

    comprobar("TAB mueve el foco entre editores", antes !== despues);

    // ESC suelta el foco del textarea: los atajos
    // globales (1-5, q) vuelven a funcionar.
    await pulsar(() => setup.mockInput.pressEscape());

    comprobar(
        "ESC suelta el foco del editor",
        setup.renderer.currentFocusedEditor === null
    );

    // Terminal mínima: 80x24 sin desbordes.
    setup.resize(80, 24);
    await setup.renderOnce();
    await esperar(60);
    await setup.renderOnce();

    const pequena = setup.captureCharFrame();

    comprobar("80x24 mantiene la cabecera", pequena.includes("CV Automizer"));
    comprobar("80x24 mantiene el pie", pequena.includes("CTRL+S"));

    console.log("=== Perfil a 80x24 ===");
    console.log(pequena);

    await irA(1);
    await setup.renderOnce();

    const generarPequena = setup.captureCharFrame();

    comprobar(
        "80x24 mantiene Específica",
        generarPequena.includes("Proveedor") &&
            generarPequena.includes("g generar")
    );

    // Regresión: escribir en el registro (antes
    // un `const texto` local tapaba el helper y
    // mataba la TUI al generar).
    const logPrueba = crearLog(setup.renderer, {
        title: "Prueba log",
        height: 6
    });

    setup.renderer.root.add(logPrueba.root);
    logPrueba.escribir("linea de prueba del log");

    await setup.renderOnce();
    await esperar(40);
    await setup.renderOnce();

    comprobar(
        "el registro escribe líneas",
        setup.captureCharFrame().includes("linea de prueba del log")
    );

    setup.renderer.root.remove(logPrueba.root);
} catch (error) {
    fallos.push(`excepción: ${error?.stack ?? error}`);
} finally {
    try {
        app?.destruir();
    } catch {
        // La destrucción ya se probó.
    }

    console.log();
    console.log(
        fallos.length === 0
            ? "✅ Todas las comprobaciones pasaron."
            : `❌ Fallos (${fallos.length}):\n - ${fallos.join("\n - ")}`
    );

    process.exit(fallos.length === 0 ? 0 : 1);
}
