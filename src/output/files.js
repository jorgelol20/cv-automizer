import { mkdir, writeFile } from "node:fs/promises";

import { getUserFilePart } from "./naming.js";

function defaultName() {
  return `CV-${getUserFilePart()}`;
}

export async function saveCV(cv, fileName = null) {
  await mkdir("output", {
    recursive: true
  });

  const name = fileName || defaultName();

  await writeFile(
    `output/${name}.json`,
    JSON.stringify(cv, null, 2),
    "utf-8"
  );
}

export async function saveMarkdown(markdown, fileName = null) {
  await mkdir("output", { recursive: true });

  const name = fileName || defaultName();

  await writeFile(
    `output/${name}.md`,
    markdown,
    "utf-8"
  );
}

export async function saveHtml(html, fileName = null) {
  await mkdir("output", { recursive: true });

  const name = fileName || defaultName();

  await writeFile(
    `output/${name}.html`,
    html,
    "utf-8"
  );
}
