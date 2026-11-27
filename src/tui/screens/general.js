// Pantalla "General": kit de candidatura espontánea
// (carta + email + CV adaptado a la empresa).

import {
    BoxRenderable,
    InputRenderableEvents,
    SelectRenderableEvents
} from "@opentui/core";

import { generateGeneralKit } from "../../general/generate.js";

import { crearSelectorIA } from "../ai-selector.js";
import { COLORS } from "../theme.js";
import {
    crearLog,
    entrada,
    panel,
    selector,
    texto
} from "../widgets.js";
import { LAYOUTS, abrirRuta } from "../services.js";

const TIPOS = [
    { id: "startup", name: "Tipo: startup" },
    { id: "consulting", name: "Tipo: consultora" },
    { id: "enterprise", name: "Tipo: gran empresa" },
    { id: "sector", name: "Tipo: sector específico" }
];

const TONOS = [
    { id: "formal", name: "Formal" },
    { id: "enthusiastic", name: "Entusiasta" },
    { id: "direct", name: "Directo" }
];

const LONGITUDES = [
    { id: "short", name: "Corta (1 párrafo)" },
    { id: "medium", name: "Media (3 párrafos)" },
    { id: "long", name: "Larga (4-5 párrafos)" }
];

export function crearPantallaGeneral({ renderer, app }) {
    const estado = {
        empresa: "",
        tipo: "startup",
        tono: "formal",
        longitud: "medium",
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

    // --- Fila: empresa + carta ---

    const fila = new BoxRenderable(renderer, {
        width: "100%",
        height: 8,
        flexDirection: "row"
    });

    const panelEmpresa = panel(renderer, {
        title: "Empresa",
        width: 34,
        height: 8,
        paddingLeft: 1,
        paddingRight: 1
    });

    panelEmpresa.add(
        texto(renderer, "Nombre (obligatorio)", {
            color: COLORS.dim
        })
    );

    const inputEmpresa = entrada(renderer, {
        width: "100%",
        placeholder: "p. ej. Acme S.L."
    });

    panelEmpresa.add(inputEmpresa);

    const selTipo = selector(renderer, {
        width: "100%",
        height: 4,
        options: TIPOS.map((tipo) => ({
            name: tipo.name,
            description: tipo.id
        })),
        selectedIndex: 0
    });

    panelEmpresa.add(selTipo);

    const panelTono = panel(renderer, {
        title: "Tono",
        width: 22,
        height: 8,
        paddingLeft: 1
    });

    const selTono = selector(renderer, {
        width: "100%",
        height: 6,
        options: TONOS.map((tono) => ({
            name: tono.name,
            description: tono.id
        })),
        selectedIndex: 0
    });

    panelTono.add(selTono);

    const panelLongitud = panel(renderer, {
        title: "Longitud",
        flexGrow: 1,
        height: 8,
        paddingLeft: 1
    });

    const selLongitud = selector(renderer, {
        width: "100%",
        height: 6,
        options: LONGITUDES.map((longitud) => ({
            name: longitud.name,
            description: longitud.id
        })),
        selectedIndex: 1
    });

    panelLongitud.add(selLongitud);

    fila.add(panelEmpresa);
    fila.add(panelTono);
    fila.add(panelLongitud);

    // --- Opciones ---

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

    const selLayout = selector(renderer, {
        width: 24,
        height: 3,
        options: LAYOUTS.map((layout) => ({
            name: layout.name,
            description: layout.id
        })),
        selectedIndex: 0
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

    panelOpciones.add(selLayout);
    panelOpciones.add(selMatch);

    const log = crearLog(renderer, {
        title: "Registro",
        flexGrow: 1
    });

    root.add(selectorIA.root);
    root.add(fila);
    root.add(panelOpciones);
    root.add(log.root);

    const focusables = [
        ...selectorIA.focusables,
        inputEmpresa,
        selTipo,
        selTono,
        selLongitud,
        selLayout,
        selMatch
    ];

    inputEmpresa.on(InputRenderableEvents.INPUT, (valor) => {
        estado.empresa = valor;
    });

    selTipo.on(SelectRenderableEvents.SELECTION_CHANGED, (indice) => {
        estado.tipo = TIPOS[indice]?.id ?? "startup";
    });

    selTono.on(SelectRenderableEvents.SELECTION_CHANGED, (indice) => {
        estado.tono = TONOS[indice]?.id ?? "formal";
    });

    selLongitud.on(
        SelectRenderableEvents.SELECTION_CHANGED,
        (indice) => {
            estado.longitud = LONGITUDES[indice]?.id ?? "medium";
        }
    );

    selLayout.on(SelectRenderableEvents.SELECTION_CHANGED, (indice) => {
        estado.layout = LAYOUTS[indice]?.id ?? "standard";
    });

    selMatch.on(SelectRenderableEvents.SELECTION_CHANGED, (indice) => {
        estado.skipMatch = indice === 1;
    });

    function abrirSalida(tipo) {
        if (!estado.salida) {
            app.setStatus(
                "Genera el kit antes de abrir la salida.",
                "warn"
            );
            return;
        }

        const ruta = {
            cv: estado.salida.cvPdf,
            carta: estado.salida.letterPdf
        }[tipo];

        abrirRuta(ruta ?? "output");
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

        if (!estado.empresa.trim()) {
            app.setStatus(
                "Escribe el nombre de la empresa (TAB para salir del campo).",
                "warn"
            );
            return;
        }

        estado.ocupado = true;
        estado.salida = null;

        try {
            log.limpiar();
            log.escribir(
                `Generando kit para ${estado.empresa}…`,
                COLORS.accent
            );
            log.escribir(selectorIA.descripcion(), COLORS.muted);

            const resultado = await generateGeneralKit({
                provider: selectorIA.provider,
                model: selectorIA.model,
                companyName: estado.empresa.trim(),
                companyType: estado.tipo,
                tone: estado.tono,
                letterLength: estado.longitud,
                layout: estado.layout,
                skipMatch: estado.skipMatch,
                onProgress: (mensaje) =>
                    log.escribir(mensaje, COLORS.muted)
            });

            estado.salida = resultado.output;

            log.escribir("✅ Kit generado", COLORS.ok);

            for (const [clave, ruta] of Object.entries(
                resultado.output
            )) {
                log.escribir(`  ${clave}: ${ruta}`, COLORS.muted);
            }

            const metrics = resultado.metrics ?? {};

            if (metrics.latencyMs != null) {
                log.escribir(
                    `📊 ${metrics.tokensInput ?? "?"} in · ${metrics.tokensOutput ?? "?"} out · ${metrics.latencyMs} ms`,
                    COLORS.dim
                );
            }

            app.setStatus(
                "✅ Kit generado — o abre el CV, c la carta, f output/",
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
            "TAB campo  g generar  r recargar modelos  o CV  c carta  f output/",

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
                abrirSalida("cv");
                return true;
            }

            if (key.name === "c") {
                abrirSalida("carta");
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
