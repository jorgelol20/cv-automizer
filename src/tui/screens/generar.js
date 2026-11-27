// Pantalla "Específica": CV adaptado a data/oferta.md.
// Flujo: proveedor → modelo → opciones → generar.

import { BoxRenderable, SelectRenderableEvents } from "@opentui/core";

import { generateCV } from "../../app.js";

import { crearSelectorIA } from "../ai-selector.js";
import { COLORS } from "../theme.js";
import { crearLog, panel, selector } from "../widgets.js";
import { LAYOUTS, abrirRuta } from "../services.js";

export function crearPantallaGenerar({ renderer, app }) {
    const estado = {
        layout: "standard",
        skipMatch: false,
        ocupado: false,
        salida: null
    };

    const root = new BoxRenderable(renderer, {
        width: "100%",
        height: "100%",
        flexDirection: "column"
    });

    const selectorIA = crearSelectorIA({
        renderer,
        app,
        estadoIA: app.estadoIA
    });

    const panelOpciones = panel(renderer, {
        title: "Opciones",
        width: "100%",
        height: 5,
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        paddingLeft: 1,
        paddingRight: 1
    });

    const selMatch = selector(renderer, {
        width: 36,
        height: 3,
        options: [
            {
                name: "Match: sí (2ª llamada)",
                description: ""
            },
            {
                name: "Match: no (más rápido)",
                description: ""
            }
        ],
        selectedIndex: 0
    });

    const selLayout = selector(renderer, {
        width: 24,
        height: 3,
        options: LAYOUTS.map((layout) => ({
            name: layout.name,
            description: layout.id
        })),
        selectedIndex: 0
    });

    panelOpciones.add(selMatch);
    panelOpciones.add(selLayout);

    const log = crearLog(renderer, {
        title: "Registro",
        flexGrow: 1
    });

    root.add(selectorIA.root);
    root.add(panelOpciones);
    root.add(log.root);

    const focusables = [
        ...selectorIA.focusables,
        selMatch,
        selLayout
    ];

    selMatch.on(
        SelectRenderableEvents.SELECTION_CHANGED,
        (indice) => {
            estado.skipMatch = indice === 1;
        }
    );

    selLayout.on(
        SelectRenderableEvents.SELECTION_CHANGED,
        (indice) => {
            estado.layout = LAYOUTS[indice]?.id ?? "standard";
        }
    );

    function abrirSalida(tipo) {
        if (!estado.salida) {
            app.setStatus(
                "Genera un CV antes de abrir la salida.",
                "warn"
            );
            return;
        }

        abrirRuta(tipo === "pdf" ? estado.salida.pdf : "output");
    }

    async function generar() {
        if (estado.ocupado) {
            return;
        }

        const modelo = selectorIA.modelInfo;

        if (!modelo) {
            app.setStatus(
                "Selecciona un modelo (ENTER en el proveedor).",
                "warn"
            );
            return;
        }

        if (!modelo.supportsStructuredOutput) {
            app.setStatus(
                `"${modelo.name}" no soporta salida estructurada.`,
                "error"
            );
            return;
        }

        estado.ocupado = true;
        estado.salida = null;

        try {
            log.limpiar();
            log.escribir(
                `Generando CV con ${selectorIA.descripcion()}…`,
                COLORS.accent
            );

            if (!process.env.CHROME_ROUTE?.trim()) {
                log.escribir(
                    "⚠️ CHROME_ROUTE vacío: el PDF fallará (JSON/MD/HTML sí se guardan).",
                    COLORS.warn
                );
            }

            const resultado = await generateCV({
                provider: selectorIA.provider,
                model: selectorIA.model,
                layout: estado.layout,
                skipMatch: estado.skipMatch,
                onProgress: (mensaje) =>
                    log.escribir(mensaje, COLORS.muted)
            });

            estado.salida = resultado.output;

            log.escribir("✅ CV generado", COLORS.ok);

            for (const [clave, ruta] of Object.entries(
                resultado.output
            )) {
                log.escribir(`  ${clave}: ${ruta}`, COLORS.muted);
            }

            if (resultado.match) {
                log.escribir(
                    `🎯 Match: ${resultado.match.score}/100 — ${resultado.match.summary}`,
                    COLORS.warn
                );
            }

            const metrics = resultado.metrics ?? {};
            const partes = [];

            if (metrics.tokensInput != null) {
                partes.push(`entrada ${metrics.tokensInput}`);
            }

            if (metrics.tokensOutput != null) {
                partes.push(`salida ${metrics.tokensOutput}`);
            }

            if (metrics.latencyMs != null) {
                partes.push(`${metrics.latencyMs} ms`);
            }

            if (partes.length > 0) {
                log.escribir(`📊 ${partes.join(" · ")}`, COLORS.dim);
            }

            app.setStatus(
                "✅ CV generado — o abre el PDF, f abre output/",
                "ok"
            );
        } catch (error) {
            log.escribir(`❌ ${error.message}`, COLORS.error);
            app.setStatus(
                "❌ Error al generar (detalle en el registro)",
                "error"
            );
        } finally {
            estado.ocupado = false;
        }
    }

    return {
        root,

        hint:
            "↑↓ mover  ENTER cargar/elegir  g generar  r recargar  o PDF  f output/",

        onShow() {
            selectorIA.sincronizar();
            app.setFocusables(focusables);
        },

        onKey(key) {
            if (key.ctrl) {
                return false;
            }

            if (key.name === "g") {
                generar();
                return true;
            }

            if (key.name === "r") {
                selectorIA.recargar();
                return true;
            }

            if (key.name === "o") {
                abrirSalida("pdf");
                return true;
            }

            if (key.name === "f") {
                abrirSalida("carpeta");
                return true;
            }

            return false;
        }
    };
}
