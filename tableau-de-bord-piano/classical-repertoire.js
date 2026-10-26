/* Répertoire classique éditable dans le navigateur, conservé localement. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const api = () => window.PianoDashboard;
  const works = () => api()?.getRepertoire?.() || [];
  const root = $("repertoire-list");
  function draw() {
    const all = works();
    $("repertoire-count").textContent = all.length + (all.length > 1 ? " œuvres" : " œuvre");
    root.replaceChildren();
    for (const [status,label] of [["studied","Œuvres déjà étudiées"],["current","Œuvres en cours"],["planned","Œuvres à étudier"]]) {
      const collection=all.filter(w=>w.status===status);
      const section=document.createElement("section");section.className="works-group";
      const heading=document.createElement("h3");heading.textContent=label+" · "+collection.length;
      const list=document.createElement("div");list.className="works-list";
      for(const w of collection){
        const card=document.createElement("article");card.className="work-card";
        const detail=document.createElement("div");
        for(const [tag,cls,value] of [["div","composer",w.composer],["strong","",w.title],["div","reference",w.reference],["div","notes",w.notes]]){
          if(!value)continue;
          const n=document.createElement(tag);n.className=cls;n.textContent=value;detail.append(n);
        }
        const actions=document.createElement("div");actions.className="work-actions";
        const edit=document.createElement("button");edit.type="button";edit.textContent="Modifier";edit.addEventListener("click",()=>editWork(w.id));
        const remove=document.createElement("button");remove.type="button";remove.className="danger";remove.textContent="Suppr.";remove.addEventListener("click",()=>deleteWork(w.id));
        actions.append(edit,remove);card.append(detail,actions);list.append(card);
      }
      section.append(heading,list);root.append(section);
    }
  }
  function saveAll(items){
    api()?.setRepertoire?.(items);
    draw();
  }
  function resetForm(){
    $("repertoire-form").reset();$("rep-id").value="";$("rep-status").value="current";
    $("rep-existing").value="";$("repertoire-form-title").textContent="Ajouter une œuvre";
    $("rep-save").textContent="Ajouter au répertoire";$("rep-cancel").classList.add("hidden");
  }
  function editWork(id){
    const w=works().find(w=>w.id===id);if(!w)return;
    $("rep-id").value=w.id;$("rep-composer").value=w.composer;$("rep-title").value=w.title;
    $("rep-reference").value=w.reference||"";$("rep-status").value=w.status;$("rep-notes").value=w.notes||"";
    $("rep-existing").value=w.id;
    $("repertoire-form-title").textContent="Modifier une œuvre";
    $("rep-save").textContent="Enregistrer les modifications";$("rep-cancel").classList.remove("hidden");
    $("repertoire-editor").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function deleteWork(id){
    const item=works().find(w=>w.id===id);
    if(!item||!window.confirm("Supprimer « "+item.title+" » de ton répertoire ?"))return;
    saveAll(works().filter(w=>w.id!==id));
    if($("rep-id").value===id)resetForm();
  }
  $("open-repertoire").addEventListener("click",()=>document.querySelector('[data-tab="classical"]')?.click());
  $("rep-existing").addEventListener("change",e=>{if(e.target.value)editWork(e.target.value);else resetForm();});
  $("rep-cancel").addEventListener("click",resetForm);
  $("repertoire-form").addEventListener("submit",event=>{
    event.preventDefault();
    const oldId=$("rep-id").value;
    const work={id:oldId||"work-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),
      composer:$("rep-composer").value.trim(),title:$("rep-title").value.trim(),
      reference:$("rep-reference").value.trim(),status:$("rep-status").value,notes:$("rep-notes").value.trim()};
    if(!work.title||!work.composer)return;
    const all=works(),i=all.findIndex(w=>w.id===oldId);
    if(i>=0)all[i]=work;else all.push(work);
    saveAll(all);resetForm();
  });
  // Après un import, le tableau de bord reconstruit son contenu : redessiner les cartes.
  new MutationObserver(()=>{
    if(!root.querySelector(".works-group"))draw();
  }).observe(root,{childList:true});
  draw();
})();
