import { appendFileSync, mkdirSync } from "fs";

const JOURNAL = "/app/logs/atelier.log";
mkdirSync("/app/logs", { recursive: true });

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
