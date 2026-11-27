// Pantalla "API Keys": estado enmascarado,
// guardar/borrar en .env y probar conexión.
// Nunca se muestra ni se registra el valor completo.

import { BoxRenderable, InputRenderableEvents, SelectRenderableEvents } from "@opentui/core";

import { clearKey, getKeysStatus, setKey } from "../../config/keys.js";

import { COLORS } from "../theme.js";
import {
    entrada,
    panel,
    selector,
    texto
} from "../widgets.js";
import { listModels } from "../services.js";

const AYUDA_BASE =
    "ENTER pega una clave nueva · d borrar · t probar conexión · r recargar";

export function crearPantallaKeys({ renderer, app }) {
    const estado = {
        claves: [],
        indice: 0,
        editando: false,
        ocupado: false
    };

    const root = new BoxRenderable(renderer, {
        width: "100%",
        height: "100%",
        flexDirection: "column"
    });

    const panelClaves = panel(renderer, {
        title: "Claves locales (.env, ignorado por git)",
        width: "100%",
        height: 12,
        paddingLeft: 1,
        paddingRight: 1
    });

    const selClaves = selector(renderer, {
        width: "100%",
        height: 10,
        showDescription: true,
        options: []
    });

    panelClaves.add(selClaves);

    const panelAccion = panel(renderer, {
        title: "Acción",
        width: "100%",
        flexGrow: 1,
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 1
    });

    const textoAyuda = texto(renderer, AYUDA_BASE, {
        color: COLORS.muted,
        width: "100%"
    });

    const inputClave = entrada(renderer, {
        width: "100%",
        placeholder: "Pega la clave y pulsa ENTER"
    });

    inputClave.visible = false;

    panelAccion.add(textoAyuda);
    panelAccion.add(inputClave);

    root.add(panelClaves);
    root.add(panelAccion);

    async function recargar() {
        try {
            const claves = await getKeysStatus();

            estado.claves = claves;
            estado.indice = Math.min(
                estado.indice,
                Math.max(0, claves.length - 1)
            );

            selClaves.options = claves.map((clave) => ({
                name: `${clave.configured ? "✅" : "❌"} ${clave.etiqueta}  ${
                    clave.configured ? clave.masked : "—"
                }`,
                description: `${clave.name} · ${clave.source}`
            }));

            selClaves.setSelectedIndex(estado.indice);
        } catch (error) {
            app.setStatus(`❌ ${error.message}`, "error");
        }
    }

    function claveActual() {
        return estado.claves[estado.indice] ?? null;
    }

    function salirEdicion() {
        estado.editando = false;
        inputClave.visible = false;
        inputClave.value = "";
        textoAyuda.content = AYUDA_BASE;
        app.setFocusables([selClaves]);
    }

    function entrarEdicion() {
        const clave = claveActual();

        if (!clave) {
            return;
        }

        estado.editando = true;
        inputClave.value = "";
        inputClave.placeholder = `Nueva clave para ${clave.etiqueta}`;
        inputClave.visible = true;
        textoAyuda.content = `${clave.ayuda}  [${clave.name}]`;

        app.setFocusables([inputClave]);
    }

    async function guardar(valor) {
        const clave = claveActual();

        if (!clave) {
            return;
        }

        try {
            const resultado = await setKey(clave.name, valor);

            await recargar();
            salirEdicion();

            app.setStatus(
                `✅ ${resultado.name} guardada (${resultado.masked})`,
                "ok"
            );
        } catch (error) {
            app.setStatus(`❌ ${error.message}`, "error");
        }
    }

    async function borrar() {
        const clave = claveActual();

        if (!clave) {
            return;
        }

        try {
            await clearKey(clave.name);

            await recargar();

            app.setStatus(`🗑️ ${clave.name} vaciada`, "warn");
        } catch (error) {
            app.setStatus(`❌ ${error.message}`, "error");
        }
    }

    async function probar() {
        const clave = claveActual();

        if (!clave) {
            return;
        }

        if (!clave.configured) {
            app.setStatus("La clave no está configurada.", "warn");
            return;
        }

        if (estado.ocupado) {
            return;
        }

        estado.ocupado = true;
        app.setStatus(`Consultando ${clave.etiqueta}…`, "info");

        try {
            const modelos = await listModels(clave.provider);

            app.setStatus(
                `✅ ${clave.etiqueta}: ${modelos.length} modelos disponibles`,
                "ok"
            );
        } catch (error) {
            app.setStatus(
                `❌ ${clave.etiqueta}: ${error.message}`,
                "error"
            );
        } finally {
            estado.ocupado = false;
        }
    }

    selClaves.on(SelectRenderableEvents.SELECTION_CHANGED, (indice) => {
        estado.indice = indice;
    });

    selClaves.on(SelectRenderableEvents.ITEM_SELECTED, () => {
        entrarEdicion();
    });

    inputClave.on(InputRenderableEvents.ENTER, (valor) => {
        guardar(valor);
    });

    return {
        root,

        hint:
            "↑↓ elegir  ENTER editar  ESC cancelar  d borrar  t probar  r recargar",

        onShow() {
            app.setFocusables([selClaves]);
            recargar();
        },

        onKey(key) {
            if (key.name === "escape" && estado.editando) {
                salirEdicion();
                return true;
            }

            if (key.ctrl || estado.editando) {
                return false;
            }

            if (key.name === "d") {
                borrar();
                return true;
            }

            if (key.name === "t") {
                probar();
                return true;
            }

            if (key.name === "r") {
                recargar();
                return true;
            }

            return false;
        }
    };
}
