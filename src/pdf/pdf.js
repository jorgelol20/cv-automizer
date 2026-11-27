import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import 'dotenv/config'
import { aviso } from "../util/aviso.js";

const require = createRequire(import.meta.url);

// Motor alternativo opcional. El escritorio registra uno basado en el
// Chromium que ya trae Electron, así que allí no hace falta descargar nada.
let motorAlternativo = null;

// Evita reintentar la descarga de Chromium en cada generación del proceso.
let descargaIntentada = false;

export function setPdfEngine(motor) {
    motorAlternativo = typeof motor === "function" ? motor : null;
}

function lineaError(error) {
    return (error?.message ?? String(error)).split("\n")[0].trim();
}

function rutaCliPlaywright() {
    try {
        const paquete = require.resolve("playwright/package.json");
        return path.join(path.dirname(paquete), "cli.js");
    } catch {
        return null;
    }
}

function rutaChromiumPropio(chromium) {
    try {
        const ruta = chromium.executablePath();
        return ruta && fs.existsSync(ruta) ? ruta : null;
    } catch {
        return null;
    }
}

// Orden de preferencia: ruta explícita del usuario → Chromium de Playwright →
// navegadores ya instalados en el sistema (sin descargar nada) → descarga.
function candidatosDeLanzamiento(chromium) {
    const candidatos = [];
    const chromeRoute = process.env.CHROME_ROUTE?.trim();

    if (chromeRoute) {
        if (fs.existsSync(chromeRoute)) {
            candidatos.push({
                descripcion: `CHROME_ROUTE (${chromeRoute})`,
                opciones: { executablePath: chromeRoute }
            });
        } else {
            aviso(
                `CHROME_ROUTE apunta a "${chromeRoute}", que no existe. ` +
                "Se ignora y se busca otro navegador."
            );
        }
    }

    if (rutaChromiumPropio(chromium)) {
        candidatos.push({
            descripcion: "Chromium de Playwright",
            opciones: {}
        });
    }

    candidatos.push(
        {
            descripcion: "Google Chrome instalado",
            opciones: { channel: "chrome" }
        },
        {
            descripcion: "Microsoft Edge instalado",
            opciones: { channel: "msedge" }
        }
    );

    return candidatos;
}

async function instalarChromium() {
    if (descargaIntentada) {
        return false;
    }

    descargaIntentada = true;

    const cli = rutaCliPlaywright();

    if (!cli) {
        return false;
    }

    aviso(
        "No hay ningún navegador disponible para los PDF. Descargando Chromium de Playwright " +
        "(unos 130 MB, solo la primera vez)…"
    );

    return new Promise((resolve) => {
        const entorno = { ...process.env };

        // Dentro de Electron, node_modules no se puede ejecutar con electron.exe
        // salvo que se comporte como Node.
        if (process.versions.electron) {
            entorno.ELECTRON_RUN_AS_NODE = "1";
        }

        const hijo = spawn(
            process.execPath,
            [cli, "install", "chromium"],
            {
                env: entorno,
                stdio: "ignore",
                windowsHide: true
            }
        );

        const temporizador = setTimeout(() => {
            hijo.kill();
            resolve(false);
        }, 10 * 60 * 1000);

        hijo.on("error", () => {
            clearTimeout(temporizador);
            resolve(false);
        });

        hijo.on("exit", (codigo) => {
            clearTimeout(temporizador);
            resolve(codigo === 0);
        });
    });
}

async function abrirNavegador(chromium, candidatos) {
    const errores = [];

    for (const candidato of candidatos) {
        try {
            const navegador = await chromium.launch(candidato.opciones);
            return { navegador, errores };
        } catch (error) {
            errores.push(`${candidato.descripcion}: ${lineaError(error)}`);
        }
    }

    if (await instalarChromium()) {
        try {
            const navegador = await chromium.launch({});
            return { navegador, errores };
        } catch (error) {
            errores.push(`Chromium de Playwright: ${lineaError(error)}`);
        }
    }

    return { navegador: null, errores };
}

async function generarConPlaywright(html, outputPath, erroresPrevios = []) {
    let chromium;

    try {
        ({ chromium } = await import("playwright"));
    } catch (error) {
        throw new Error(
            `No se pudo cargar Playwright: ${lineaError(error)}\n` +
            "Ejecuta npm install para restaurar las dependencias."
        );
    }

    const {
        navegador,
        errores
    } = await abrirNavegador(
        chromium,
        candidatosDeLanzamiento(chromium)
    );

    const todosLosErrores = [...erroresPrevios, ...errores];

    if (!navegador) {
        throw new Error(
            "No se pudo iniciar ningún navegador para generar el PDF.\n" +
            "- Instala el Chromium de Playwright con: npx playwright install chromium\n" +
            "- O define CHROME_ROUTE en .env con la ruta a un Chrome/Chromium válido.\n" +
            `Detalles:\n${todosLosErrores.map((mensaje) => `- ${mensaje}`).join("\n")}`
        );
    }

    try {
        const pagina = await navegador.newPage();

        await pagina.setContent(html, {
            waitUntil: "load"
        });

        // Espera a que las fuentes estén cargadas antes de paginar.
        await pagina.evaluate(async () => {
            await document.fonts.ready;
        });

        await pagina.pdf({
            path: outputPath,
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: "0",
                right: "0",
                bottom: "0",
                left: "0"
            }
        });
    } catch (error) {
        throw new Error(
            `No se pudo generar el PDF "${outputPath}": ${error.message}`
        );
    } finally {
        await navegador.close();
    }
}

export async function generatePdf(html, outputPath) {
    const rutaSalida = path.resolve(outputPath);

    await fsp.mkdir(
        path.dirname(rutaSalida),
        { recursive: true }
    );

    const preferencia = process.env.PDF_ENGINE?.trim().toLowerCase();

    if (preferencia === "electron" && !motorAlternativo) {
        throw new Error(
            "PDF_ENGINE=electron solo funciona dentro de la app de escritorio. " +
            "Usa PDF_ENGINE=playwright o deja la variable vacía."
        );
    }

    if (motorAlternativo && preferencia !== "playwright") {
        try {
            await motorAlternativo(html, rutaSalida);
            return;
        } catch (error) {
            aviso(
                `El motor de PDF del escritorio falló (${lineaError(error)}). ` +
                "Se reintenta con Playwright."
            );

            await generarConPlaywright(
                html,
                rutaSalida,
                [`Motor del escritorio: ${lineaError(error)}`]
            );
            return;
        }
    }

    await generarConPlaywright(html, rutaSalida);
}
