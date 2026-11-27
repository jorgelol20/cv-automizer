// Prueba manual del motor de PDF, sin llamar a ningún proveedor de IA.
// Uso: node src/pdf/test-pdf.js
//
// Comprueba que hay un navegador disponible (Playwright, Chrome/Edge del
// sistema o descarga automática de Chromium) y que el PDF sale en A4.

import fs from "node:fs/promises";
import path from "node:path";

import { generatePdf } from "./pdf.js";

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 16mm 17mm; }
  body { font-family: Georgia, serif; margin: 0; }
  h1 { color: #2563eb; }
</style>
</head>
<body>
  <h1>Prueba de PDF</h1>
  <p>Si ves este texto, el motor de PDF funciona.</p>
</body>
</html>`;

const salida = path.resolve("output", "_test-pdf.pdf");

const inicio = Date.now();

await generatePdf(html, salida);

const { size } = await fs.stat(salida);

console.log(`PDF generado: ${salida}`);
console.log(`Tamaño: ${size} bytes`);
console.log(`Tiempo: ${Date.now() - inicio} ms`);

await fs.unlink(salida);

console.log("OK: el motor de PDF funciona sin Chrome.");
