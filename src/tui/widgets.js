// Piezas de UI reutilizables por las pantallas.
// Todo es Core imperativo: sin JSX ni build step.

import {
    BoxRenderable,
    InputRenderable,
    ScrollBoxRenderable,
    SelectRenderable,
    TextRenderable
} from "@opentui/core";

import { COLORS } from "./theme.js";

// Panel con borde redondeado y título opcional.
// `rest` se pasa tal cual a BoxRenderable para
// que cada pantalla ajuste tamaño y flex.
export function panel(renderer, options = {}) {
    const {
        title,
        borderColor = COLORS.border,
        ...rest
    } = options;

    const opciones = {
        border: true,
        borderStyle: "rounded",
        borderColor,
        backgroundColor: COLORS.panel,
        flexDirection: "column",
        ...rest
    };

    if (title) {
        opciones.title = ` ${title} `;
        opciones.titleColor = COLORS.muted;
        opciones.titleAlignment = "left";
    }

    return new BoxRenderable(renderer, opciones);
}

// Texto con estilos por defecto del tema.
export function texto(renderer, content, options = {}) {
    const {
        color = COLORS.text,
        ...rest
    } = options;

    return new TextRenderable(renderer, {
        content: String(content ?? ""),
        fg: color,
        wrapMode: "word",
        ...rest
    });
}

// Lista seleccionable con los colores del tema.
export function selector(renderer, options) {
    return new SelectRenderable(renderer, {
        backgroundColor: COLORS.panel,
        textColor: COLORS.muted,
        focusedBackgroundColor: COLORS.panel,
        focusedTextColor: COLORS.text,
        selectedBackgroundColor: COLORS.selectionBg,
        selectedTextColor: COLORS.selectionFg,
        descriptionColor: COLORS.dim,
        selectedDescriptionColor: COLORS.muted,
        showDescription: false,
        showSelectionIndicator: true,
        wrapSelection: true,
        ...options
    });
}

// Campo de una línea. InputRenderable siempre
// mide 1 de alto, así que se suele envolver.
export function entrada(renderer, options) {
    return new InputRenderable(renderer, {
        backgroundColor: COLORS.inputBg,
        focusedBackgroundColor: COLORS.inputFocusBg,
        textColor: COLORS.text,
        cursorColor: COLORS.accent,
        ...options
    });
}

// Registro con scroll y pegado al final.
// `escribir` acepta texto multilínea y aplica
// un color por llamada.
export function crearLog(renderer, options = {}) {
    const {
        title = "Registro",
        limite = 300,
        ...rest
    } = options;

    const root = panel(renderer, {
        title,
        paddingLeft: 1,
        paddingRight: 1,
        ...rest
    });

    const scroll = new ScrollBoxRenderable(renderer, {
        width: "100%",
        flexGrow: 1,
        stickyScroll: true,
        stickyStart: "bottom",
        viewportCulling: false
    });

    root.add(scroll);

    let total = 0;

    function limpiar() {
        for (const hijo of [...scroll.getChildren()]) {
            scroll.remove(hijo);
        }

        total = 0;
    }

    function escribir(mensaje, color = COLORS.text) {
        const contenido = String(mensaje ?? "");

        for (const linea of contenido.split(/\r?\n/)) {
            if (!linea.trim()) {
                continue;
            }

            if (total >= limite) {
                limpiar();
                escribir("… (registro recortado)", COLORS.dim);
            }

            scroll.add(
                texto(renderer, linea, {
                    color,
                    width: "100%"
                })
            );

            total++;
        }
    }

    return {
        root,
        escribir,
        limpiar
    };
}
