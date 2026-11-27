// Pantalla "Modelos": modelo favorito, temperaturas
// y topes de tokens por proveedor, más los defectos
// globales. Persiste en config/modelos.json.

import {
    BoxRenderable,
    InputRenderableEvents,
    SelectRenderableEvents
} from "@opentui/core";

import {
    CAMPOS,
    getModelosConfig,
    resetModeloConfig,
    setDefaults,
    setModeloConfig
} from "../../config/modelos.js";

import { COLORS } from "../theme.js";
import {
    entrada,
    panel,
    selector,
    texto
} from "../widgets.js";

const ETIQUETAS_CAMPO = {
    model: "Modelo favorito",
    temperatureCV: "Temperatura CV",
    maxTokensCV: "Tokens máx. CV",
    temperatureMatch: "Temperatura match",
    maxTokensMatch: "Tokens máx. match",
    temperatureGeneral: "Temperatura general",
    maxTokensGeneral: "Tokens máx. general"
};

export function crearPantallaModelos({ renderer, app }) {
    const estado = {
        config: null,
        proveedor: "opencode-zen",
        campoIndice: 0,
        editando: false
    };

    const root = new BoxRenderable(renderer, {
        width: "100%",
        height: "100%",
        flexDirection: "column"
    });

    const fila = new BoxRenderable(renderer, {
        width: "100%",
        flexGrow: 1,
        flexDirection: "row"
    });

    const panelProveedores = panel(renderer, {
        title: "Proveedor  ● fijado ○ hereda",
        width: 36,
        height: "100%",
        paddingLeft: 1
    });

    const selProveedores = selector(renderer, {
        width: "100%",
        height: 8,
        options: []
    });

    panelProveedores.add(selProveedores);

    const panelCampos = panel(renderer, {
        title: "Configuración",
        flexGrow: 1,
        height: "100%",
        paddingLeft: 1
    });

    const selCampos = selector(renderer, {
        width: "100%",
        height: "100%",
        options: []
    });

    panelCampos.add(selCampos);

    fila.add(panelProveedores);
    fila.add(panelCampos);

    // Editor emergente: solo está montado al editar.
    const panelEditor = panel(renderer, {
        title: "Nuevo valor",
        width: "100%",
        height: 3,
        paddingLeft: 1,
        paddingRight: 1
    });

    const inputValor = entrada(renderer, {
        width: "100%",
        placeholder: "valor (vacío = heredar)"
    });

    panelEditor.add(inputValor);

    root.add(fila);

    const focusablesBase = [selProveedores, selCampos];

    function idsProveedores() {
        return estado.config
            ? Object.keys(estado.config.providers)
            : [];
    }

    function indiceProveedor() {
        const ids = idsProveedores();

        if (estado.proveedor === null) {
            return ids.length;
        }

        return Math.max(0, ids.indexOf(estado.proveedor));
    }

    function valoresActuales() {
        if (!estado.config) {
            return {};
        }

        if (estado.proveedor === null) {
            return estado.config.defaults;
        }

        return estado.config.providers[estado.proveedor]?.valores ?? {};
    }

    function etiquetaProveedor() {
        if (!estado.config || estado.proveedor === null) {
            return "Defectos globales";
        }

        return (
            estado.config.providers[estado.proveedor]?.etiqueta ??
            estado.proveedor
        );
    }

    function pintarProveedores() {
        const ids = idsProveedores();

        const opciones = ids.map((id) => {
            const entrada = estado.config.providers[id];
            const fijados = Object.values(
                entrada.valores
            ).filter((valor) => valor !== null).length;

            const marca = fijados > 0 ? "●" : "○";
            const cuenta = fijados > 0 ? `  (${fijados})` : "";

            return {
                name: `${marca} ${entrada.etiqueta}${cuenta}`,
                description: id
            };
        });

        opciones.push({
            name: "◇ Defectos globales",
            description: "defaults"
        });

        selProveedores.options = opciones;
        selProveedores.setSelectedIndex(indiceProveedor());
    }

    function pintarCampos() {
        const valores = valoresActuales();
        const defectos = estado.config?.defaults ?? {};

        selCampos.options = CAMPOS.map((campo) => {
            const valor = valores[campo];
            let muestra;

            if (valor === null || valor === undefined) {
                if (campo === "model") {
                    muestra = estado.proveedor
                        ? "hereda (sin favorito)"
                        : "—";
                } else {
                    muestra = estado.proveedor
                        ? `hereda → ${defectos[campo]}`
                        : "—";
                }
            } else {
                muestra = String(valor);
            }

            return {
                name: `${ETIQUETAS_CAMPO[campo]}: ${muestra}`,
                description: campo
            };
        });

        selCampos.setSelectedIndex(
            Math.min(estado.campoIndice, CAMPOS.length - 1)
        );

        panelCampos.title = ` Configuración — ${etiquetaProveedor()} `;
    }

    async function recargar() {
        try {
            const config = await getModelosConfig();
            const ids = Object.keys(config.providers);

            estado.config = config;

            if (estado.proveedor === null) {
                // Se conserva "defectos globales".
            } else if (!ids.includes(estado.proveedor)) {
                estado.proveedor = ids[0] ?? null;
            }

            pintarProveedores();
            pintarCampos();
        } catch (error) {
            app.setStatus(`❌ ${error.message}`, "error");
        }
    }

    function cerrarEditor() {
        estado.editando = false;

        if (root.getChildren().includes(panelEditor)) {
            root.remove(panelEditor);
        }

        inputValor.value = "";
        app.setFocusables(focusablesBase);
    }

    function abrirEditor() {
        const campo = CAMPOS[estado.campoIndice];

        if (!campo) {
            return;
        }

        const valor = valoresActuales()[campo];

        estado.editando = true;

        inputValor.value =
            valor === null || valor === undefined
                ? ""
                : String(valor);

        inputValor.placeholder = estado.proveedor
            ? "vacío = heredar de los defectos"
            : "vacío = defecto de código";

        panelEditor.title = ` ${ETIQUETAS_CAMPO[campo]} (${
            estado.proveedor ? "proveedor" : "global"
        }) `;

        if (!root.getChildren().includes(panelEditor)) {
            root.add(panelEditor);
        }

        app.setFocusables([inputValor]);
    }

    async function guardar(valor) {
        const campo = CAMPOS[estado.campoIndice];

        if (!campo) {
            return;
        }

        try {
            const resultado = estado.proveedor
                ? await setModeloConfig(
                      estado.proveedor,
                      campo,
                      valor
                  )
                : await setDefaults(campo, valor);

            await recargar();
            cerrarEditor();

            if (resultado.valor === null) {
                app.setStatus(
                    `${ETIQUETAS_CAMPO[campo]}: ahora hereda`,
                    "ok"
                );
            } else {
                app.setStatus(
                    `${ETIQUETAS_CAMPO[campo]} = ${resultado.valor}`,
                    "ok"
                );
            }
        } catch (error) {
            app.setStatus(`❌ ${error.message}`, "error");
        }
    }

    async function restablecer() {
        if (estado.proveedor === null) {
            app.setStatus(
                "Los defectos globales no se restablecen desde aquí.",
                "warn"
            );
            return;
        }

        try {
            await resetModeloConfig(estado.proveedor);

            estado.campoIndice = 0;
            await recargar();

            app.setStatus(
                `${etiquetaProveedor()} restablecido (hereda todo)`,
                "warn"
            );
        } catch (error) {
            app.setStatus(`❌ ${error.message}`, "error");
        }
    }

    selProveedores.on(
        SelectRenderableEvents.ITEM_SELECTED,
        (indice) => {
            const ids = idsProveedores();

            estado.proveedor =
                indice >= ids.length ? null : ids[indice];

            estado.campoIndice = 0;

            pintarCampos();
            app.setStatus(
                `Editando: ${etiquetaProveedor()}`,
                "info"
            );
            app.focus(selCampos);
        }
    );

    selCampos.on(SelectRenderableEvents.SELECTION_CHANGED, (indice) => {
        estado.campoIndice = indice;
    });

    selCampos.on(SelectRenderableEvents.ITEM_SELECTED, () => {
        abrirEditor();
    });

    inputValor.on(InputRenderableEvents.ENTER, (valor) => {
        guardar(valor);
    });

    return {
        root,

        hint:
            "↑↓ elegir  ENTER editar  ESC cancelar  d restablecer  r recargar  ● fijado ○ hereda",

        onShow() {
            app.setFocusables(focusablesBase);
            recargar();
        },

        onKey(key) {
            if (key.name === "escape" && estado.editando) {
                cerrarEditor();
                return true;
            }

            if (key.ctrl || estado.editando) {
                return false;
            }

            if (key.name === "d") {
                restablecer();
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
