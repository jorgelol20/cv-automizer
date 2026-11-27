import { readFile } from "node:fs/promises";

import { parseUserInfo } from "./source.js";

async function leerUserInfo() {
  try {
    return {
      texto: await readFile(
        "data/UserInfo.md",
        "utf-8"
      ),
      plantilla: false
    };
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }

    return {
      texto: await readFile(
        "data/UserInfo.example.md",
        "utf-8"
      ),
      plantilla: true
    };
  }
}

const {
  texto,
  plantilla
} = await leerUserInfo();

if (plantilla) {
  console.error(
    "Aviso: no existe data/UserInfo.md; se usa data/UserInfo.example.md."
  );
}

const source =
  parseUserInfo(texto);

console.log(
  JSON.stringify(
    source,
    null,
    2
  )
);
