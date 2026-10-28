const PRESETS = [
 {title:"Свежие заказы на монтаж",desc:"Ищи людей и компании, которые прямо сейчас ищут видеомонтажёра.",en:'"video editor" OR "video editing" freelance job',ru:'"видеомонтажёр" OR "видеомонтаж" ищу монтажёра заказ',category:"orders"},
 {title:"YouTube-монтаж",desc:"Объявления о монтаже длинных видео для YouTube.",en:'"YouTube editor" OR "YouTube video editor" hiring freelance',ru:'ищу монтажёра YouTube видео заказ',category:"orders"},
 {title:"Shorts / Reels / TikTok",desc:"Короткие вертикальные ролики, нарезки и субтитры.",en:'"short form video editor" OR "Reels editor" freelance',ru:'монтаж Shorts Reels TikTok ищу монтажёра',category:"orders"},
 {title:"Подкасты и интервью",desc:"Монтаж подкастов, нарезки эпизодов и клипы для соцсетей.",en:'"podcast video editor" freelance hiring',ru:'монтаж видеоподкаста ищу монтажёра заказ',category:"orders"},
 {title:"Реклама и бизнес-видео",desc:"Рекламные ролики, промо и контент для компаний.",en:'"video editor" "looking for" freelance ads',ru:'ищем видеомонтажёра реклама проморолик',category:"orders"},
 {title:"Блогеры и авторы",desc:"Ищи активных авторов с регулярными публикациями и публичными бизнес-контактами.",en:'YouTube creator weekly videos business contact',ru:'YouTube блогер регулярно выпускает видео контакты для сотрудничества',category:"creators"},
 {title:"Стримеры и игровые каналы",desc:"Потенциальные клиенты для нарезок стримов, хайлайтов и Shorts.",en:'streamer YouTube highlights editor creator',ru:'стример нарезки хайлайты монтаж видео',category:"creators"},
 {title:"Подкастеры и эксперты",desc:"Авторы, которые публикуют длинные беседы и могут использовать короткие клипы.",en:'podcast host interview channel video clips',ru:'подкаст интервью эксперт канал видеонарезки',category:"creators"}
];
const SOURCES = {
 "Google": q => "https://www.google.com/search?q="+encodeURIComponent(q),
 "YouTube": q => "https://www.youtube.com/results?search_query="+encodeURIComponent(q),
 "Reddit": q => "https://www.reddit.com/search/?q="+encodeURIComponent(q),
 "Upwork": q => "https://www.upwork.com/nx/search/jobs/?q="+encodeURIComponent(q),
 "Fiverr": q => "https://www.fiverr.com/search/gigs?query="+encodeURIComponent(q),
 "Contra": q => "https://contra.com/search?query="+encodeURIComponent(q),
 "LinkedIn": q => "https://www.linkedin.com/search/results/content/?keywords="+encodeURIComponent(q)
};
const STORAGE_KEY = "vcf_leads_v1";
let leads = loadLeads(), selectedPreset = 0, editingId = null;
function loadLeads(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch(e){return []}}
function saveLeads(){localStorage.setItem(STORAGE_KEY,JSON.stringify(leads));updateStats();renderLeads()}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function safeUrl(s){try{let u=new URL(s);return ["http:","https:"].includes(u.protocol)?u.href:""}catch(e){return ""}}
function showToast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function switchTab(name){document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id==="view-"+name));document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===name));if(name==="leads")renderLeads()}
function initSearch(){
 const list=document.getElementById("presetList");
 list.innerHTML=PRESETS.map((p,i)=>`<button class="preset ${i===selectedPreset?'selected':''}" onclick="selectPreset(${i})">${esc(p.title)}<small>${p.category==="orders"?"Площадки с заказами":"Поиск авторов"}</small></button>`).join("");
 const source=document.getElementById("sourceSelect");source.innerHTML=Object.keys(SOURCES).map(x=>`<option>${esc(x)}</option>`).join("");source.value="Google";source.addEventListener("change",renderSearchLinks);
 selectPreset(0);
}
function selectPreset(i){selectedPreset=i;document.querySelectorAll(".preset").forEach((x,j)=>x.classList.toggle("selected",j===i));const p=PRESETS[i];document.getElementById("searchTitle").textContent=p.title;document.getElementById("searchDesc").textContent=p.desc;updateQuery();renderSearchLinks()}
function updateQuery(){const lang=document.getElementById("languageSelect").value;const p=PRESETS[selectedPreset];document.getElementById("queryInput").value=lang==="ru"?p.ru:lang==="mix"?p.en+" "+p.ru:p.en}
function renderSearchLinks(){const q=document.getElementById("queryInput").value.trim();const source=document.getElementById("sourceSelect").value;document.getElementById("searchLinks").innerHTML=`<a target="_blank" rel="noopener noreferrer" href="${SOURCES[source](q)}">Открыть поиск в ${esc(source)} ↗</a>`+Object.keys(SOURCES).filter(s=>s!==source).map(s=>`<a target="_blank" rel="noopener noreferrer" href="${SOURCES[s](q)}">${esc(s)} ↗</a>`).join("")}
document.addEventListener("input",e=>{if(e.target.id==="queryInput")renderSearchLinks()});
document.getElementById("languageSelect").addEventListener("change",()=>{updateQuery();renderSearchLinks()});
function runCustomSearch(){const q=document.getElementById("customQuery").value.trim();if(!q){showToast("Сначала введи поисковый запрос");return}window.open(SOURCES[document.getElementById("sourceSelect").value](q),"_blank","noopener")}
function updateStats(){document.getElementById("statTotal").textContent=leads.length;document.getElementById("statNew").textContent=leads.filter(x=>x.status==="Новый"||x.status==="Проверить").length;document.getElementById("statContacted").textContent=leads.filter(x=>["Написал","Ответил","Обсуждение"].includes(x.status)).length;document.getElementById("statWon").textContent=leads.filter(x=>x.status==="Заказ получен").length}
function renderLeads(){
 const text=(document.getElementById("filterText")?.value||"").toLowerCase(),status=document.getElementById("filterStatus")?.value||"",source=document.getElementById("filterSource")?.value||"";
 const rows=leads.filter(l=>(!text||[l.name,l.niche,l.contact,l.notes,l.source,l.url].join(" ").toLowerCase().includes(text))&&(!status||l.status===status)&&(!source||l.source===source));
 const tbody=document.getElementById("leadRows");tbody.innerHTML=rows.map(l=>`<tr><td><strong>${esc(l.name)}</strong><div class="muted tiny">${esc(l.notes||"")}</div>${l.score&&l.score!=="Не оценено"?`<div class="tiny" style="color:var(--green);margin-top:5px">Оценка: ${esc(l.score)}</div>`:""}</td><td>${esc(l.source)}</td><td>${esc(l.niche||"—")}</td><td><span class="status" data-s="${esc(l.status)}">${esc(l.status)}</span></td><td>${l.url?`<a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer" style="color:#b8c8ff">Профиль ↗</a>`:"—"}<div class="tiny muted">${esc(l.contact||"")}</div></td><td><div class="actions"><button onclick="editLead('${l.id}')">Изменить</button><button onclick="advanceLead('${l.id}')">Статус →</button><button class="danger" onclick="deleteLead('${l.id}')">Удалить</button></div></td></tr>`).join("");
 document.getElementById("emptyState").style.display=rows.length?"none":"block";
}
function openLeadModal(id=null){
 editingId=id;const l=id?leads.find(x=>x.id===id):null;document.getElementById("modalTitle").textContent=l?"Изменить клиента":"Добавить клиента";
 const vals={leadName:l?.name||"",leadSource:l?.source||"YouTube",leadUrl:l?.url||"",leadContact:l?.contact||"",leadNiche:l?.niche||"",leadStatus:l?.status||"Новый",leadScore:l?.score||"Не оценено",leadNotes:l?.notes||""};
 Object.entries(vals).forEach(([k,v])=>document.getElementById(k).value=v);
 document.getElementById("leadModal").classList.add("open");document.getElementById("leadName").focus();
}
function closeLeadModal(){document.getElementById("leadModal").classList.remove("open")}
document.getElementById("leadForm").addEventListener("submit",e=>{
 e.preventDefault();const url=document.getElementById("leadUrl").value.trim();if(url&&!safeUrl(url)){showToast("Ссылка должна начинаться с http:// или https://");return}
 const obj={id:editingId||String(Date.now())+Math.random().toString(16).slice(2,6),name:document.getElementById("leadName").value.trim(),source:document.getElementById("leadSource").value,url,contact:document.getElementById("leadContact").value.trim(),niche:document.getElementById("leadNiche").value.trim(),status:document.getElementById("leadStatus").value,score:document.getElementById("leadScore").value,notes:document.getElementById("leadNotes").value.trim(),updatedAt:new Date().toISOString()};
 if(editingId)leads=leads.map(x=>x.id===editingId?obj:x);else leads.unshift(obj);
 saveLeads();closeLeadModal();showToast(editingId?"Клиент обновлён":"Клиент сохранён");
});
function editLead(id){openLeadModal(id)}
function deleteLead(id){const l=leads.find(x=>x.id===id);if(!l)return;if(confirm(`Удалить «${l.name}» из базы?`)){leads=leads.filter(x=>x.id!==id);saveLeads();showToast("Запись удалена")}}
function advanceLead(id){const statuses=["Новый","Проверить","Написал","Ответил","Обсуждение","Заказ получен","Не подходит"];const l=leads.find(x=>x.id===id);if(!l)return;l.status=statuses[(statuses.indexOf(l.status)+1)%statuses.length];saveLeads();showToast("Статус: "+l.status)}
function clearLeads(){if(!leads.length){showToast("База уже пуста");return}if(confirm("Удалить все записи? Рекомендуем сначала экспортировать CSV.")){leads=[];saveLeads();showToast("База очищена")}}
function exportCSV(){if(!leads.length){showToast("Нет записей для экспорта");return}const cols=["name","source","url","contact","niche","status","score","notes","updatedAt"];const labels=["Имя/канал","Источник","Ссылка","Публичный контакт","Ниша","Статус","Оценка","Заметки","Обновлено"];const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"';const csv=[labels,...leads.map(l=>cols.map(k=>l[k]||""))].map(row=>row.map(q).join(";")).join("\r\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="video_clients.csv";a.click();URL.revokeObjectURL(a.href);showToast("Экспорт готов")}
function importCSV(){document.getElementById("csvFile").click()}
document.getElementById("csvFile").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;const text=await f.text();const lines=text.replace(/^\ufeff/,"").split(/\r?\n/).filter(Boolean);if(lines.length<2){showToast("В CSV нет записей");return}const parse=line=>{let a=[],cur="",q=false;for(let i=0;i<line.length;i++){let c=line[i];if(c==='"'&&line[i+1]==='"'&&q){cur+='"';i++}else if(c==='"')q=!q;else if((c===";"||c===",")&&!q){a.push(cur);cur=""}else cur+=c}a.push(cur);return a};const head=parse(lines[0]).map(x=>x.trim().toLowerCase());const get=(r,...names)=>{let i=head.findIndex(h=>names.includes(h));return i>=0?(r[i]||""):""};let count=0;for(const line of lines.slice(1)){const r=parse(line);const name=get(r,"имя/канал","имя/компания/канал","name");if(!name)continue;leads.push({id:String(Date.now())+Math.random().toString(16).slice(2),name,source:get(r,"источник","platform")||"Другое",url:get(r,"ссылка","url"),contact:get(r,"публичный контакт","contact"),niche:get(r,"ниша","niche"),status:get(r,"статус","status")||"Новый",score:get(r,"оценка","score")||"Не оценено",notes:get(r,"заметки","notes"),updatedAt:new Date().toISOString()});count++}saveLeads();e.target.value="";showToast(`Импортировано записей: ${count}`)});
function copyTemplate(id){const el=document.getElementById(id);if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(el.value).then(()=>showToast("Сообщение скопировано")).catch(()=>fallbackCopy(el))}else fallbackCopy(el)}
function fallbackCopy(el){el.select();try{document.execCommand("copy");showToast("Сообщение скопировано")}catch(e){showToast("Выдели текст и скопируй вручную")}}
document.getElementById("leadModal").addEventListener("click",e=>{if(e.target.id==="leadModal")closeLeadModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLeadModal()});
initSearch();updateStats();renderLeads();
