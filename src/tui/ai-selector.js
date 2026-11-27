// Selector compartido de proveedor + modelo.
// Lo usan las pantallas "Específica" y "General"
// para no duplicar el listado de modelos.
//
// El estado vive en `estadoIA` (propiedad de la
// app) con la forma { provider, model }, de modo
// que ambas pantallas recuerdan la misma elección.

import { BoxRenderable, SelectRenderableEvents } from "@opentui/core";

import { resolverModelo, resolverParamsModelo } from "../config/modelos.js";

import { panel, selector } from "./widgets.js";
import { PROVIDERS, listModels, nombreProveedor } from "./services.js";

export function crearSelectorIA({ renderer, app, estadoIA }) {
    let cargadoPara = "";
    let modelos = [];

    const root = new BoxRenderable(renderer, {
        width: "100%",
        height: 8,
        flexDirection: "row"
    });

    const panelProveedor = panel(renderer, {
        title: "Proveedor",
        width: 30,
        height: 8,
        paddingLeft: 1
    });

    const selProveedor = selector(renderer, {
        width: "100%",
        height: 6,
        options: PROVIDERS.map((provider) => ({
            name: provider.name,
            description: provider.id
        })),
        selectedIndex: 0
    });

    panelProveedor.add(selProveedor);

    const panelModelo = panel(renderer, {
        title: "Modelo",
        flexGrow: 1,
        height: 8,
        paddingLeft: 1
    });

    const selModelo = selector(renderer, {
        width: "100%",
        height: 6,
        showScrollIndicator: true,
        options: [
            {
                name: "Pulsa ENTER en el proveedor para cargar modelos",
                description: ""
            }
        ]
    });

    panelModelo.add(selModelo);

    root.add(panelProveedor);
    root.add(panelModelo);

    function modeloActual() {
        return (
            modelos.find((model) => model.id === estadoIA.model) ??
            null
        );
    }

    async function actualizarResumen() {
        if (!estadoIA.model) {
            return;
        }

        try {
            const params = await resolverParamsModelo(
                estadoIA.provider
            );

            app.setStatus(
                [
                    estadoIA.model,
                    `T ${params.temperatureCV}`,
                    `${params.maxTokensCV} tok`
                ].join(" · "),
                "info"
            );
        } catch {
            // Sin resumen si la config no se puede leer.
        }
    }

    async function cargarModelos({ enfocar = false } = {}) {
        cargadoPara = estadoIA.provider;
        modelos = [];
        estadoIA.model = "";

        panelModelo.title =
            ` Modelo — ${nombreProveedor(estadoIA.provider)} (cargando…) `;

        selModelo.options = [
            {
                name: "⏳ consultando modelos…",
                description: ""
            }
        ];

        try {
            const lista = await listModels(estadoIA.provider);

            if (lista.length === 0) {
                throw new Error("No hay modelos disponibles.");
            }

            const favorito = estadoIA.model || await resolverModelo(
                estadoIA.provider
            ).catch(() => "");

            modelos = lista;

            selModelo.options = lista.map((model) => {
                const json = model.supportsStructuredOutput
                    ? "  [JSON]"
                    : "";
                const estrella = model.id === favorito
                    ? "  ★"
                    : "";

                return {
                    name: `${model.name}${json}${estrella}`,
                    description: model.id
                };
            });

            const indice = Math.max(
                0,
                lista.findIndex((model) => model.id === favorito)
            );

            selModelo.setSelectedIndex(indice);
            estadoIA.model = lista[indice].id;

            panelModelo.title =
                ` Modelo — ${nombreProveedor(estadoIA.provider)} (${lista.length}) `;

            actualizarResumen();

            if (enfocar) {
                app.focus(selModelo);
            }
        } catch (error) {
            panelModelo.title =
                ` Modelo — ${nombreProveedor(estadoIA.provider)} `;

            selModelo.options = [
                {
                    name: "❌ No se pudieron cargar los modelos",
                    description: ""
                }
            ];

            app.setStatus(`❌ ${error.message}`, "error");
        }
    }

    // Alinea los selectores con el estado compartido.
    // Se llama en onShow de cada pantalla.
    function sincronizar() {
        const indice = PROVIDERS.findIndex(
            (provider) => provider.id === estadoIA.provider
        );

        if (indice >= 0) {
            selProveedor.setSelectedIndex(indice);
        }

        if (cargadoPara !== estadoIA.provider || modelos.length === 0) {
            cargarModelos();
            return;
        }

        const indiceModelo = modelos.findIndex(
            (model) => model.id === estadoIA.model
        );

        if (indiceModelo >= 0) {
            selModelo.setSelectedIndex(indiceModelo);
            estadoIA.model = modelos[indiceModelo].id;
        }
    }

    selProveedor.on(
        SelectRenderableEvents.ITEM_SELECTED,
        () => {
            const proveedor =
                PROVIDERS[selProveedor.getSelectedIndex()];

            if (!proveedor) {
                return;
            }

            if (proveedor.id === estadoIA.provider) {
                cargarModelos({ enfocar: true });
                return;
            }

            estadoIA.provider = proveedor.id;
            app.setStatus(
                `Proveedor: ${proveedor.name}`,
                "info"
            );

            cargarModelos({ enfocar: true });
        }
    );

    selModelo.on(
        SelectRenderableEvents.SELECTION_CHANGED,
        (indice) => {
            const modelo = modelos[indice];

            if (!modelo) {
                return;
            }

            estadoIA.model = modelo.id;
            actualizarResumen();
        }
    );

    return {
        root,
        focusables: [selProveedor, selModelo],
        sincronizar,
        recargar: () => cargarModelos(),

        get provider() {
            return estadoIA.provider;
        },

        get model() {
            return estadoIA.model;
        },

        get modelInfo() {
            return modeloActual();
        },

        // Resumen legible para el registro al generar.
        descripcion() {
            return `${nombreProveedor(estadoIA.provider)} · ${estadoIA.model}`;
        }
    };
}
