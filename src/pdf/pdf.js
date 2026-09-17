import { chromium } from "playwright";
import 'dotenv/config'
export async function generatePdf(html, outputPath) {
    const browser = await chromium.launch({
        executablePath: process.env.CHROME_ROUTE
    });

    try {
        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "load"
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
    } finally {
        await browser.close();
    }
}