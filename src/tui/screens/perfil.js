// Pantalla "Perfil": editor de data/UserInfo.md y
// data/oferta.md. La CLI no permitía editar; aquí
// se guarda con CTRL+S. Si falta el fichero se
// carga la plantilla pública como punto de partida.

import { mkdir, readFile, writeFile } from "node:fs/promises";

import { BoxRenderable, TextareaRenderable } from "@opentui/core";

import { COLORS } from "../theme.js";
import { panel } from "../widgets.js";
import { abrirRuta } from "../services.js";

const DOCUMENTOS = [
    {
        id: "perfil",
        titulo: "Perfil",
        ruta: "data/UserInfo.md",
        ejemplo: "data/UserInfo.example.md",
        alto: 2
    },
    {
        id: "oferta",
        titulo: "Oferta",
        ruta: "data/oferta.md",
        ejemplo: "data/oferta.example.md",
        alto: 1
    }
];

export function crearPantallaPerfil({ renderer, app }) {
    const estado = {
        cargado: false
    };

    const root = new BoxRenderable(renderer, {
        width: "100%",
        height: "100%",
        flexDirection: "column"
    });

    const documentos = DOCUMENTOS.map((definicion) => {
        const documento = {
            ...definicion,
            panel: null,
            area: null,
            guardado: "",
            sucio: false,
            plantilla: false
        };

        const panelDoc = panel(renderer, {
            title: ` ${definicion.titulo} — ${definicion.ruta} `,
            flexGrow: definicion.alto,
            paddingLeft: 1,
            paddingRight: 1
        });

        const area = new TextareaRenderable(renderer, {
            width: "100%",
            flexGrow: 1,
            initialValue: "",
            wrapMode: "word",
            backgroundColor: COLORS.panel,
            focusedBackgroundColor: COLORS.panelAlt,
            textColor: COLORS.text,
            focusedTextColor: COLORS.text,
            cursorColor: COLORS.accent,
            selectionBg: COLORS.selectionBg,
            selectionFg: COLORS.selectionFg,
            placeholder: "Escribe aquí…",
            onContentChange: () => {
                // Comparar con el texto guardado evita
                // falsos positivos si el evento llega
                // durante la carga inicial.
                documento.sucio =
                    documento.area.plainText !== documento.guardado;

                pintarTitulo(documento);
            }
        });

        panelDoc.add(area);
        root.add(panelDoc);

        documento.panel = panelDoc;
        documento.area = area;

        return documento;
    });

    const focusables = documentos.map((documento) => documento.area);

    function pintarTitulo(documento) {
        const marcas = [];

        if (documento.plantilla) {
            marcas.push("plantilla");
        }

        if (documento.sucio) {
            marcas.push("●");
        }

        const sufijo = marcas.length > 0
            ? ` (${marcas.join(" ")})`
            : "";

        documento.panel.title =
            ` ${documento.titulo} — ${documento.ruta}${sufijo} `;
    }

    function documentoActivo() {
        const enfocado = renderer.currentFocusedRenderable;

        return (
            documentos.find(
                (documento) => documento.area === enfocado
            ) ?? documentos[0]
        );
    }

    async function cargarDocumento(documento) {
        try {
            const contenido = await readFile(
                documento.ruta,
                "utf8"
            );

            documento.area.setText(contenido);
            documento.guardado = contenido;
            documento.plantilla = false;
        } catch (error) {
            if (error?.code !== "ENOENT") {
                app.setStatus(`❌ ${error.message}`, "error");
                return;
            }

            try {
                const plantilla = await readFile(
                    documento.ejemplo,
                    "utf8"
                );

                documento.area.setText(plantilla);
                documento.guardado = plantilla;
                documento.plantilla = true;
            } catch {
                documento.area.setText("");
                documento.guardado = "";
            }
        }

        documento.sucio = false;
        pintarTitulo(documento);
    }

    async function cargarTodo() {
        for (const documento of documentos) {
            await cargarDocumento(documento);
        }

        estado.cargado = true;
    }

    async function guardar(documento) {
        try {
            await mkdir("data", { recursive: true });
            await writeFile(
                documento.ruta,
                documento.area.plainText,
                "utf8"
            );

            documento.sucio = false;
            documento.plantilla = false;
            documento.guardado = documento.area.plainText;

            pintarTitulo(documento);

            app.setStatus(
                `✅ Guardado ${documento.ruta}`,
                "ok"
            );
        } catch (error) {
            app.setStatus(`❌ ${error.message}`, "error");
        }
    }

    return {
        root,

        hint:
            "CTRL+S guardar  TAB cambiar editor  ESC soltar foco  e abrir  ↑↓←→ mover",

        onShow() {
            app.setFocusables(focusables);

            if (!estado.cargado) {
                return cargarTodo();
            }
        },

        // Aviso al cambiar de pestaña con cambios pendientes.
        onHide() {
            const pendientes = documentos
                .filter((documento) => documento.sucio)
                .map((documento) => documento.ruta);

            if (pendientes.length > 0) {
                app.setStatus(
                    `⚠️ Sin guardar: ${pendientes.join(", ")}`,
                    "warn"
                );
            }
        },

        onKey(key) {
            if (key.ctrl && key.name === "s") {
                guardar(documentoActivo());
                return true;
            }

            if (!key.ctrl && key.name === "e") {
                abrirRuta(documentoActivo().ruta);
                return true;
            }

            return false;
        }
    };
}
