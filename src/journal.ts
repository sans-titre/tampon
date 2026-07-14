import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { LOGS_DIR } from "./config";

const JOURNAL = join(LOGS_DIR, "atelier.log");
mkdirSync(LOGS_DIR, { recursive: true });

function horodater() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function ecrire(niveau: string, ...args: unknown[]) {
  const ligne = `[${horodater()}] ${niveau} ${args.map(String).join(" ")}\n`;
  process.stdout.write(ligne);
  appendFileSync(JOURNAL, ligne);
}

export const journal = {
  info: (...args: unknown[]) => ecrire("INFO ", ...args),
  erreur: (...args: unknown[]) => ecrire("ERR  ", ...args),
};
