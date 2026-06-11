import { marked } from "marked";
import { BASE } from "./config";

export function rendrePage(
  markdown: string,
  gabarit: string,
  meta: Record<string, string>,
): string {
  const corps = marked.parse(markdown) as string;
  const { titre = "", date = "", auteur = "" } = meta;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${titre}</title>
  <link rel="stylesheet" href="${BASE}/gabarits/gabarit-${gabarit}.css">
  <script>
    window.PagedConfig = {
      auto: true,
      after: () => { window.__tamponRendu = true; },
    };
  </script>
  <script src="${BASE}/ui/vendor/paged.polyfill.js"></script>
</head>
<body>
  <div class="bandeau-nom" aria-hidden="true">sans-titre</div>
  <div class="bandeau-titre-courant" aria-hidden="true">${titre}</div>
  <div class="bandeau-date-courante" aria-hidden="true">${date}</div>
  <div class="pied-coordonnees" aria-hidden="true">Association sans-titre — SIRET 000 000 000 00000${auteur ? ` — ${auteur}` : ""}</div>
  ${corps}
</body>
</html>`;
}
