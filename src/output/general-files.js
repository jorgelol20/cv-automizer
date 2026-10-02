import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDir = "output";

async function ensureOutputDir() {
  await mkdir(outputDir, { recursive: true });
}

export async function saveGeneralKit(fileName, kit, content, type = "letter") {
  await ensureOutputDir();

  const ext = type === "email" ? "html" : "md";
  const suffix = type === "email" ? "Email" : "Carta";
  const filePath = path.join(outputDir, `${fileName}-${suffix}.${ext}`);

  await writeFile(filePath, content, "utf8");

  return filePath;
}

export async function saveLetterPdf(fileName, pdfPath) {
  await ensureOutputDir();
  return pdfPath;
}

export async function saveEmailPdf(fileName, pdfPath) {
  await ensureOutputDir();
  return pdfPath;
}
