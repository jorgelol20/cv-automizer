import { readFile } from "node:fs/promises";

async function leerEntrada(ruta, plantilla) {
  try {
    return await readFile(
      ruta,
      "utf-8"
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `Falta ${ruta}. Copia ${plantilla} como ${ruta} y edítalo antes de generar.`
      );
    }

    throw error;
  }
}

export async function readInputFiles() {
  const [
    userInfo,
    jobOffer
  ] = await Promise.all([
    leerEntrada(
      "data/UserInfo.md",
      "data/UserInfo.example.md"
    ),

    leerEntrada(
      "data/oferta.md",
      "data/oferta.example.md"
    )
  ]);

  return {
    userInfo,
    jobOffer
  };
}
