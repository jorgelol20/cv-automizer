// Generación de PDF dentro de Electron.
//
// Electron ya incluye Chromium, así que el escritorio no necesita Chrome
// instalado ni la descarga del Chromium de Playwright.
//
// El módulo es CommonJS porque lo consume `desktop/main.cjs`; el pipeline de
// `src/` lo recibe como motor registrado con `setPdfEngine`.

const { BrowserWindow } = require("electron");

const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function generarPdfConElectron(html, outputPath) {
  const rutaSalida = path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(process.cwd(), outputPath);

  const rutaTemporal = path.join(
    os.tmpdir(),
    `cv-automizer-${process.pid}-${Date.now()}.html`
  );

  await fs.writeFile(rutaTemporal, html, "utf8");

  const ventana = new BrowserWindow({
    show: false,
    width: 1000,
    height: 1400,

    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  try {
    await ventana.loadFile(rutaTemporal);

    // Igual que en Playwright: esperar a las fuentes antes de paginar.
    await ventana.webContents.executeJavaScript(
      "document.fonts.ready.then(() => true)"
    );

    const pdf = await ventana.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: "A4",
      margins: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    });

    await fs.mkdir(
      path.dirname(rutaSalida),
      { recursive: true }
    );

    await fs.writeFile(rutaSalida, pdf);
  } finally {
    if (!ventana.isDestroyed()) {
      ventana.destroy();
    }

    await fs.unlink(rutaTemporal).catch(() => {});
  }
}

module.exports = {
  generarPdfConElectron
};
