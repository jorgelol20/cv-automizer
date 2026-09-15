import { mkdir, writeFile } from "node:fs/promises";
const userName = process.env.NOMBRE_USUARIO.replaceAll(' ', '');

export async function saveCV(cv) {
  await mkdir("output", {
    recursive: true
  });
  
  await writeFile(
    `output/CV-${userName}.json`,
    JSON.stringify(cv, null, 2),
    "utf-8"
  );
}

export async function saveMarkdown(markdown) {
  await mkdir("output", { recursive: true });

  await writeFile(
    `output/CV-${userName}.md`,
    markdown,
    "utf-8"
  );
}

export async function saveHtml(html) {
  await mkdir("output", { recursive: true });

  await writeFile(
    `output/CV-${userName}.html`,
    html,
    "utf-8"
  );
}