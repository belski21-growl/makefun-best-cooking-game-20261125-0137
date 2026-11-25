import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dest = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};
mkdirSync(dest, { recursive: true });
cpSync(join(here, "game"), join(dest, "game"), { recursive: true });
cpSync(join(here, "screenshots"), join(dest, "screenshots"), { recursive: true });
writeFileSync(join(dest, "dossier.json"), buildDossier(dest, caps));
