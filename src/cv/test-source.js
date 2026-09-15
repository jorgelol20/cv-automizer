import { readFile } from "node:fs/promises";

import { parseUserInfo } from "./source.js";

const userInfo = await readFile(
  "data/UserInfo.md",
  "utf-8"
);

const source =
  parseUserInfo(userInfo);

console.log(
  JSON.stringify(
    source,
    null,
    2
  )
);