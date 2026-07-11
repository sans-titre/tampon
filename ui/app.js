const btnComposer = document.getElementById("btn-composer");
const manuscrit = document.getElementById("manuscrit");
const selectGabarit = document.getElementById("gabarit");
const inputTitre = document.getElementById("meta-titre");
const inputDate = document.getElementById("meta-date");
const inputAuteur = document.getElementById("meta-auteur");
const inputNomFichier = document.getElementById("nom-fichier");
const zoneStatut = document.getElementById("statut");

function afficherStatut(message, type = "neutre") {
  zoneStatut.className = "statut" + (type === "erreur" ? " erreur" : "");
  zoneStatut.innerHTML = message;
}

// Le select reflète les gabarit-*.css réellement présents sur le serveur.
async function chargerGabarits() {
  try {
    const reponse = await fetch("/sans-titre.art/tampon/gabarits");
    const gabarits = await reponse.json();
    selectGabarit.innerHTML = "";
    for (const gabarit of gabarits) {
      const option = document.createElement("option");
      option.value = gabarit;
      option.textContent =
        gabarit.length <= 2 ? gabarit.toUpperCase() : gabarit[0].toUpperCase() + gabarit.slice(1);
      selectGabarit.append(option);
    }
    if (gabarits.includes("rapport")) selectGabarit.value = "rapport";
  } catch {
    afficherStatut("Impossible de charger la liste des gabarits.", "erreur");
  }
}

chargerGabarits();

btnComposer.addEventListener("click", async () => {
  const markdown = manuscrit.value.trim();
  if (!markdown) {
    afficherStatut("Le manuscrit est vide.", "erreur");
    return;
  }

  const payload = {
    markdown,
    gabarit: selectGabarit.value,
    meta: {
      titre: inputTitre.value.trim(),
      date: inputDate.value.trim(),
      auteur: inputAuteur.value.trim(),
    },
    nomFichier: inputNomFichier.value.trim() || null,
  };

  btnComposer.disabled = true;
  afficherStatut("Composition en cours…");

  try {
    const reponse = await fetch("/sans-titre.art/tampon/composer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const donnees = await reponse.json();

    if (!reponse.ok || donnees.erreur) {
      afficherStatut("Erreur : " + (donnees.erreur ?? "inconnue"), "erreur");
      return;
    }

    const lien = `/sans-titre.art/tampon/tirages/${donnees.tirage}`;
    window.open(lien, "_blank");
    afficherStatut(`Tirage prêt.<br><a href="${lien}" target="_blank">Ouvrir à nouveau →</a>`);
  } catch (err) {
    afficherStatut("Erreur réseau : " + err.message, "erreur");
  } finally {
    btnComposer.disabled = false;
  }
});
