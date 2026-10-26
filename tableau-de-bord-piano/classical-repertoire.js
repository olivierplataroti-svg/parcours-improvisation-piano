/* Gestion locale des œuvres classiques – aucune donnée envoyée au serveur. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const dashboard = () => window.PianoDashboard;
  function currentWorks() {
    const api = dashboard();
    return api && typeof api.getRepertoire === "function" ? api.getRepertoire() : [];
  }
  function writeWorks(works) {
    const api = dashboard();
    if (!api || typeof api.setRepertoire !== "function") {
      window.alert("Le répertoire n'est pas encore disponible. Recharge la page.");
      return;
    }
    api.setRepertoire(works);
  }
  function resetForm() {
    $("repertoire-form").reset();
    $("rep-id").value = "";
    $("rep-status").value = "current";
    $("repertoire-form-title").textContent = "Ajouter une œuvre";
    $("rep-save").textContent = "Ajouter au répertoire";
    $("rep-cancel").classList.add("hidden");
  }
  function editWork(id) {
    const work = currentWorks().find(w => w.id === id);
    if (!work) return;
    $("rep-id").value = work.id;
    $("rep-composer").value = work.composer;
    $("rep-title").value = work.title;
    $("rep-reference").value = work.reference || "";
    $("rep-status").value = work.status;
    $("rep-notes").value = work.notes || "";
    $("repertoire-form-title").textContent = "Modifier une œuvre";
    $("rep-save").textContent = "Enregistrer les modifications";
    $("rep-cancel").classList.remove("hidden");
    $("repertoire-editor").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function deleteWork(id) {
    const works = currentWorks();
    const work = works.find(w => w.id === id);
    if (!work || !window.confirm("Supprimer cette œuvre de ton répertoire : " + work.title + " ?")) return;
    writeWorks(works.filter(w => w.id !== id));
    if ($("rep-id").value === id) resetForm();
  }
  window.editWork = editWork;
  window.deleteWork = deleteWork;
  $("open-repertoire").addEventListener("click", () => {
    const tab = document.querySelector('[data-tab="classical"]');
    if (tab) tab.click();
  });
  $("repertoire-form").addEventListener("submit", event => {
    event.preventDefault();
    const oldId = $("rep-id").value;
    const work = {
      id: oldId || "work-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8),
      composer: $("rep-composer").value.trim(),
      title: $("rep-title").value.trim(),
      reference: $("rep-reference").value.trim(),
      status: $("rep-status").value,
      notes: $("rep-notes").value.trim()
    };
    if (!work.composer || !work.title) return;
    const works = currentWorks();
    const idx = works.findIndex(w => w.id === oldId);
    if (idx >= 0) works[idx] = work; else works.push(work);
    writeWorks(works);
    resetForm();
  });
  $("rep-cancel").addEventListener("click", resetForm);
})();
