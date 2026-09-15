import { readFile } from "node:fs/promises";

export async function readInputFiles() {
  const userInfo = await readFile(
    "data/UserInfo.md",
    "utf-8"
  );

  const jobOffer = await readFile(
    "data/oferta.md",
    "utf-8"
  );

  return {
    userInfo,
    jobOffer
  };
}
