import { chromium } from "playwright";
import 'dotenv/config'

export async function generatePdf(html, outputPath) {
    const chromePath = process.env.CHROME_ROUTE?.trim();

    if (!chromePath) {
        throw new Error(
            "CHROME_ROUTE no está definida en .env. Sin la ruta a Chrome/Chromium no se puede generar el PDF."
        );
    }

    let browser;

    try {
        browser = await chromium.launch({
            executablePath: chromePath
        });
    } catch (error) {
        throw new Error(
            `No se pudo iniciar Chrome/Chromium en "${chromePath}". Revisa CHROME_ROUTE en .env.\n${error.message}`
        );
    }

    try {
        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "load"
        });

        // Espera a que las fuentes estén cargadas antes de paginar.
        await page.evaluate(async () => {
            await document.fonts.ready;
        });

        await page.pdf({
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
        await browser.close();
    }
}