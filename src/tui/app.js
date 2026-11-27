// Shell de la TUI: cabecera con pestañas, cuerpo
// con la pantalla activa y pie con pistas/estado.
// Gestiona foco, atajos globales y cierre limpio
// del terminal.

import { BoxRenderable, TextAttributes } from "@opentui/core";

import { setAvisoSink } from "../util/aviso.js";

import { COLORS, TABS } from "./theme.js";
import { texto } from "./widgets.js";

import { crearPantallaGenerar } from "./screens/generar.js";
import { crearPantallaGeneral } from "./screens/general.js";
import { crearPantallaKeys } from "./screens/keys.js";
import { crearPantallaModelos } from "./screens/modelos.js";
import { crearPantallaPerfil } from "./screens/perfil.js";

const COLORES_ESTADO = {
    info: COLORS.muted,
    ok: COLORS.ok,
    warn: COLORS.warn,
    error: COLORS.error
};

export function crearApp(renderer, { alSalir } = {}) {
    const estado = {
        activa: null,
        destruido: false,
        focusables: [],
        focusIndex: 0,
        temporizador: null
    };

    // --- Estructura ---

    const root = new BoxRenderable(renderer, {
        width: "100%",
        height: "100%",
        flexDirection: "column",
        backgroundColor: COLORS.bg
    });

    const cabecera = new BoxRenderable(renderer, {
        width: "100%",
        height: 1,
        flexDirection: "row",
        backgroundColor: COLORS.panel,
        paddingLeft: 1
    });

    const cuerpo = new BoxRenderable(renderer, {
        width: "100%",
        flexGrow: 1,
        flexDirection: "column"
    });

    const pie = new BoxRenderable(renderer, {
        width: "100%",
        height: 2,
        flexDirection: "column",
        backgroundColor: COLORS.panel,
        paddingLeft: 1,
        paddingRight: 1
    });

    const textoPista = texto(renderer, "", {
        color: COLORS.dim,
        wrapMode: "none"
    });

    const textoEstado = texto(renderer, "", {
        color: COLORS.muted,
        wrapMode: "none"
    });

    pie.add(textoPista);
    pie.add(textoEstado);

    root.add(cabecera);
    root.add(cuerpo);
    root.add(pie);

    renderer.root.add(root);

    // --- Foco ---

    function setFocusables(lista) {
        estado.focusables = (lista ?? []).filter(Boolean);
        estado.focusIndex = 0;
        estado.focusables[0]?.focus();
    }

    function focus(renderable) {
        const indice = estado.focusables.indexOf(renderable);

        if (indice < 0) {
            return;
        }

        estado.focusIndex = indice;
        renderable.focus();
    }

    function moverFoco(delta) {
        const total = estado.focusables.length;

        if (total === 0) {
            return;
        }

        estado.focusIndex =
            (estado.focusIndex + delta + total) % total;

        estado.focusables[estado.focusIndex].focus();
    }

    // --- Estado y cabecera ---

    function setStatus(mensaje, tono = "info") {
        textoEstado.content = String(mensaje ?? "");
        textoEstado.fg = COLORES_ESTADO[tono] ?? COLORS.muted;

        if (estado.temporizador) {
            clearTimeout(estado.temporizador);
        }

        estado.temporizador = setTimeout(() => {
            if (!estado.destruido) {
                textoEstado.content = "";
            }
        }, 12000);
    }

    function pintarCabecera() {
        for (const hijo of [...cabecera.getChildren()]) {
            cabecera.remove(hijo);
        }

        cabecera.add(
            texto(renderer, " CV Automizer ", {
                color: COLORS.bg,
                attributes: TextAttributes.BOLD
            })
        );

        cabecera.add(texto(renderer, " "));

        TABS.forEach((tab, indice) => {
            const activa = estado.activa?.id === tab.id;

            cabecera.add(
                texto(renderer, ` ${indice + 1} ${tab.label} `, {
                    color: activa ? COLORS.accent : COLORS.muted,
                    attributes: activa ? TextAttributes.BOLD : 0
                })
            );
        });
    }

    function pintarPie() {
        textoPista.content = estado.activa?.pantalla.hint ?? "";
    }

    // --- Pantallas ---

    const app = {
        renderer,
        estadoIA: {
            provider: "opencode-zen",
            model: ""
        },
        setStatus,
        setFocusables,
        focus
    };

    // Los avisos de proveedores (p. ej. Gemini) van
    // a la barra de estado, nunca a stdout.
    setAvisoSink((mensaje) => setStatus(mensaje, "warn"));

    const pantallas = new Map([
        ["generar", crearPantallaGenerar({ renderer, app })],
        ["general", crearPantallaGeneral({ renderer, app })],
        ["keys", crearPantallaKeys({ renderer, app })],
        ["modelos", crearPantallaModelos({ renderer, app })],
        ["perfil", crearPantallaPerfil({ renderer, app })]
    ]);

    function mostrar(id) {
        if (estado.destruido || estado.activa?.id === id) {
            return;
        }

        if (estado.activa) {
            try {
                estado.activa.pantalla.onHide?.();
            } catch {
                // Un onHide defectuoso no debe bloquear el cambio.
            }

            cuerpo.remove(estado.activa.pantalla.root);
        }

        const pantalla = pantallas.get(id);

        if (!pantalla) {
            return;
        }

        estado.activa = { id, pantalla };
        cuerpo.add(pantalla.root);

        setStatus("", "info");
        pintarCabecera();
        pintarPie();

        Promise.resolve()
            .then(() => pantalla.onShow?.())
            .catch((error) => {
                setStatus(`❌ ${error.message}`, "error");
            });
    }

    // --- Cierre ---

    function destruir() {
        if (estado.destruido) {
            return;
        }

        estado.destruido = true;

        if (estado.temporizador) {
            clearTimeout(estado.temporizador);
            estado.temporizador = null;
        }

        try {
            renderer.destroy();
        } catch {
            // El renderer ya podía estar destruido.
        }

        if (typeof alSalir === "function") {
            alSalir();
        }
    }

    // --- Teclado ---

    function alPulsar(key) {
        if (estado.destruido) {
            return;
        }

        if (key.ctrl && key.name === "c") {
            destruir();
            return;
        }

        const editando = Boolean(renderer.currentFocusedEditor);
        const pantalla = estado.activa?.pantalla;

        // TAB cambia de campo incluso dentro de un
        // textarea: sus keybindings no capturan TAB.
        if (key.name === "tab" && !key.ctrl) {
            moverFoco(key.shift ? -1 : 1);
            return;
        }

        if (editando) {
            // Con un editor enfocado solo pasan CTRL+*
            // y ESC; el resto es texto para el campo.
            if (key.ctrl) {
                pantalla?.onKey?.(key);
                return;
            }

            if (key.name === "escape") {
                const consumido = pantalla?.onKey?.(key);

                // ESC sin consumir suelta el foco:
                // así vuelven los atajos globales
                // (1-5, q) sin escribir en el texto.
                if (!consumido) {
                    renderer.currentFocusedEditor?.blur();
                }
            }

            return;
        }

        if (pantalla?.onKey?.(key)) {
            return;
        }

        if (!key.ctrl && /^[1-5]$/.test(key.name)) {
            mostrar(TABS[Number.parseInt(key.name, 10) - 1].id);
            return;
        }

        if (key.name === "q") {
            destruir();
        }
    }

    renderer.keyInput.on("keypress", alPulsar);

    pintarCabecera();
    mostrar("generar");

    return {
        app,
        pantallas,
        mostrar,
        destruir,
        // Utilidad para pruebas headless.
        estado
    };
}
