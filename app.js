(function(){
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const STORAGE_KEYS = { saved:'clipfinder_saved_v1', messages:'clipfinder_messages_v1' };
  let savedLeads = readSaved();
  let currentLeads = [];
  let lastMode = 'demo';
  let messageCount = Number(localStorage.getItem(STORAGE_KEYS.messages) || 0);
  let activeTemplate = 'warm';
  let activeView = 'overview';
  let progressTimer = null;
  let currentSearchToken = 0;
  function applyTheme(theme){
    const dark = theme !== 'light';
    document.body.classList.toggle('dark-theme', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    const toggle = $('#themeToggle');
    if(toggle){ toggle.textContent = dark ? '☀' : '☾'; toggle.title = dark ? 'Включить светлую тему' : 'Включить тёмную тему'; toggle.setAttribute('aria-label', toggle.title); }
    const meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', dark ? '#0d0e14' : '#f7f8fb');
  }
  const savedTheme = localStorage.getItem('clipfinder_theme_v1') || 'dark';
  applyTheme(savedTheme);
  $('#themeToggle')?.addEventListener('click',()=>{
    const next = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
    localStorage.setItem('clipfinder_theme_v1', next);
    applyTheme(next);
  });
  const templates = {
    warm: {title:'Дружелюбное знакомство', text:'Привет, {name}!\n\nПосмотрел твой контент — особенно понравилось: {detail}. Классно подаёшь тему.\n\nЯ занимаюсь видеомонтажом и помогаю авторам делать видео динамичнее и удерживать внимание зрителя. Думаю, мог бы быть полезен и твоему проекту.\n\nЕсли актуально, могу прислать пару примеров работ 🙂'},
    specific: {title:'С конкретным предложением', text:'Привет, {name}!\n\nУвидел твой контент про «{detail}». Кажется, некоторые ролики можно усилить монтажом: сделать более цепкий старт, добавить ритм и аккуратную графику.\n\nЯ видеомонтажёр, работаю с авторами и короткими видео. Могу предложить идею монтажа именно под твой формат.\n\nБудет удобно, если скину примеры?​'},
    short: {title:'Короткое сообщение', text:'Привет, {name}! Увидел твой контент про {detail} — очень интересно. Я занимаюсь монтажом видео и хотел предложить помощь с роликами. Могу прислать портфолио, если сейчас актуально 🙂'}
  };
  const demoLeads = [
    {id:'demo-1',name:'Канал о личных финансах',url:'#',domain:'youtube.com',category:'Блогеры и авторы',platform:'YouTube',snippet:'Пример результата: автор регулярно выпускает образовательные видео и может быть заинтересован в монтаже выпусков и коротких нарезок.',score:92,source:'Демо-результат',demo:true},
    {id:'demo-2',name:'Подкаст «Новый взгляд»',url:'#',domain:'youtube.com',category:'Подкасты',platform:'YouTube',snippet:'Пример результата: разговорный формат, из которого можно делать полные выпуски, Shorts и промо-фрагменты для соцсетей.',score:87,source:'Демо-результат',demo:true},
    {id:'demo-3',name:'Экспертный блог о фитнесе',url:'#',domain:'instagram.com',category:'Эксперты',platform:'Instagram / Reels',snippet:'Пример результата: короткие обучающие ролики, где регулярный монтаж и субтитры могут помочь упаковать экспертный контент.',score:83,source:'Демо-результат',demo:true},
    {id:'demo-4',name:'Небольшой бренд одежды',url:'#',domain:'tiktok.com',category:'Бизнес',platform:'TikTok',snippet:'Пример результата: бренд может использовать динамичные продуктовые видео и вертикальные ролики для социальных сетей.',score:78,source:'Демо-результат',demo:true}
  ];
  function readSaved(){try{return JSON.parse(localStorage.getItem(STORAGE_KEYS.saved)||'[]')}catch(_){return []}}
  function persistSaved(){localStorage.setItem(STORAGE_KEYS.saved,JSON.stringify(savedLeads));updateCounters()}
  function updateCounters(){
    $('#sidebarSavedCount').textContent=savedLeads.length; $('#statSaved').textContent=savedLeads.length;
    $('#statFound').textContent=currentLeads.length ? currentLeads.length : '—'; $('#statMessages').textContent=messageCount;
    $('#settingsSavedCount').textContent=savedLeads.length; $('#settingsMessagesCount').textContent=messageCount;
    $('#exportButton').disabled=currentLeads.length===0; $('#exportButtonPage').disabled=currentLeads.length===0;
  }
  function toast(message,type='success'){
    const el=document.createElement('div');el.className='toast '+type;el.textContent=message;$('#toastRegion').appendChild(el);
    setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(5px)';setTimeout(()=>el.remove(),250)},3300);
  }
  function showView(name){
    activeView=name;
    $$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+name));
    $$('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    const labels={overview:'Обзор',search:'Поиск клиентов',saved:'Сохранённые',templates:'Сообщения',settings:'Настройки'};
    $('#currentCrumb').textContent=labels[name]||'Обзор';
    $('#sidebar').classList.remove('open');
    if(name==='saved') renderSaved(); if(name==='templates') renderTemplate(); if(name==='settings') updateConnectionStatus();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  document.addEventListener('click',e=>{
    const viewBtn=e.target.closest('[data-view]'); if(viewBtn){showView(viewBtn.dataset.view);return}
    const chip=e.target.closest('[data-query]');if(chip){e.preventDefault();const q=chip.dataset.query;$('#searchQuery').value=q;$('#searchQueryPage').value=q;const form=activeView==='search'?$('#searchFormPage'):$('#searchForm');form.requestSubmit();}
  });
  $('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  document.addEventListener('click',e=>{if(window.innerWidth<=760 && $('#sidebar').classList.contains('open')&&!e.target.closest('#sidebar')&&!e.target.closest('#mobileMenu'))$('#sidebar').classList.remove('open')});
  function setDate(){const now=new Date();$('#todayDate').textContent=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(now)}
  setDate();
  function normalizeLead(item,index,mode){
    const url=item.url||item.link||'#';let domain=item.domain||'источник';try{if(!item.domain)domain=new URL(url).hostname.replace(/^www\./,'')}catch(_){}
    return {id:item.id||'lead-'+simpleHash(url+'|'+(item.name||item.title||index)),name:item.name||item.title||'Без названия',url,domain,category:item.category||'Потенциальный клиент',platform:item.platform||platformFromDomain(domain),snippet:item.snippet||item.description||'Открой источник, чтобы проверить информацию и понять, подходит ли автор для сотрудничества.',score:Number(item.score)||scoreFromText((item.name||'')+' '+(item.snippet||'')),source:item.source||(mode==='demo'?'Демо-результат':'Поисковый результат'),demo:!!item.demo||mode==='demo',savedAt:item.savedAt||null}}
  function simpleHash(str){let h=0;for(let i=0;i<str.length;i++)h=(h*31+str.charCodeAt(i))|0;return Math.abs(h).toString(36)}
  function platformFromDomain(domain){if(/youtube/i.test(domain))return'YouTube';if(/instagram/i.test(domain))return'Instagram / Reels';if(/tiktok/i.test(domain))return'TikTok';if(/t\.me|telegram/i.test(domain))return'Telegram';return'Веб-сайт'}
  function scoreFromText(t){let s=60;const low=t.toLowerCase();['ищу монтаж','нужен монтаж','видеомонтаж','монтажер','монтажёр','reels','shorts','подкаст'].forEach(k=>{if(low.includes(k))s+=5});return Math.min(98,s)}
  function startProgress(page){
    const suffix=page?'Page':'';const progress=$('#searchProgress'+suffix),bar=$('#progressBar'+suffix),text=$('#progressText'+suffix),percent=$('#progressPercent'+suffix);
    progress.classList.remove('hidden');bar.style.width='0%';percent.textContent='0%';
    const lines=['Подбираем поисковые фразы…','Ищем публичные страницы…','Проверяем заголовки и описания…','Собираем результаты…'];let n=0;
    clearInterval(progressTimer);progressTimer=setInterval(()=>{n=Math.min(92,n+7+Math.random()*11);bar.style.width=n+'%';percent.textContent=Math.round(n)+'%';text.textContent=lines[Math.min(lines.length-1,Math.floor(n/25))]},260);
  }
  function stopProgress(page){const suffix=page?'Page':'';clearInterval(progressTimer);$('#progressBar'+suffix).style.width='100%';$('#progressPercent'+suffix).textContent='100%';setTimeout(()=>$('#searchProgress'+suffix).classList.add('hidden'),450)}
  async function runSearch(page){
    const token=++currentSearchToken;const q=($('#searchQuery'+(page?'Page':'')).value||'').trim();
    const type=$('#clientType'+(page?'Page':'')).value;const platform=$('#platform'+(page?'Page':'')).value;const language=$('#language'+(page?'Page':'')).value;
    $('#searchQuery').value=q;$('#searchQueryPage').value=q;$('#clientType').value=$('#clientTypePage').value=type;$('#platform').value=$('#platformPage').value=platform;$('#language').value=$('#languagePage').value=language;
    const btn=$('#searchButton'+(page?'Page':''));btn.disabled=true;const original=btn.innerHTML;btn.innerHTML='<span class="button-spark">✳</span><span>Ищем…</span>';
    startProgress(page);showView(page?'search':'overview');
    let response;try{
      response=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q,clientType:type,platform,language})});
      if(!response.ok)throw new Error('HTTP '+response.status);response=await response.json();
      if(!response||!Array.isArray(response.results))throw new Error('Некорректный ответ сервера');
    }catch(err){response={mode:'demo',results:makeDemoResults(q,type,platform),notice:'Не удалось получить выдачу API. Показаны демонстрационные примеры. Проверь сервер, API-ключ и лимиты поискового сервиса.',fallbackReason:'Не удалось получить реальные результаты; показаны примеры.'};}
    if(token!==currentSearchToken)return;
    lastMode=response.mode||'demo';currentLeads=(response.results||[]).map((x,i)=>normalizeLead(x,i,lastMode));
    stopProgress(page);btn.disabled=false;btn.innerHTML=original;
    $('#modeLabel').textContent=lastMode==='live'?'Реальный поиск':'Демо-режим';$('.status-dot').style.background=lastMode==='live'?'#2eae7b':'#f0a53b';$('.status-dot').style.boxShadow=lastMode==='live'?'0 0 0 3px #e1f8ed':'0 0 0 3px #fff4df';
    renderLeadLists(response.notice||'');updateCounters();
    if(lastMode==='demo')toast(response.fallbackReason||'Показан демо-результат. Подключи API в настройках для реального поиска.','warning');else toast('Поиск завершён: найдено '+currentLeads.length+' результатов.');
    if(page)$('#pageResultsMeta').textContent=currentLeads.length+' результатов';
  }
  function makeDemoResults(q,type,platform){
    let results=demoLeads.map(x=>({...x}));
    if(type!=='all')results=results.filter(x=>({bloggers:['Блогеры и авторы'],podcasts:['Подкасты'],experts:['Эксперты'],business:['Бизнес']}[type]||[]).includes(x.category));
    if(platform!=='all'){const p={youtube:'YouTube',instagram:'Instagram / Reels',tiktok:'TikTok',telegram:'Telegram',web:'Веб-сайт'}[platform];results=results.filter(x=>x.platform===p)}
    if(q)results=results.map(x=>({...x,snippet:'Демо-результат для запроса «'+q+'». '+x.snippet}));
    return results;
  }
  $('#searchForm').addEventListener('submit',e=>{e.preventDefault();runSearch(false)});
  $('#searchFormPage').addEventListener('submit',e=>{e.preventDefault();runSearch(true)});
  function escapeHtml(str){return String(str??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function initials(name){const n=String(name||'CF').trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('');return escapeHtml(n.toUpperCase()||'CF')}
  function isSaved(lead){return savedLeads.some(x=>x.id===lead.id||x.url===lead.url)}
  function cardHtml(lead,index){const saved=isSaved(lead);return `<article class="lead-card" style="animation-delay:${Math.min(index,8)*35}ms"><div class="lead-logo">${initials(lead.name)}</div><div class="lead-main"><div class="lead-card-top"><h3>${escapeHtml(lead.name)}</h3><span class="lead-tag">${escapeHtml(lead.category)}</span>${lead.demo?'<span class="lead-tag demo-tag">Демо</span>':''}</div><p class="lead-snippet">${escapeHtml(lead.snippet)}</p><div class="lead-domain-row"><span>↗ ${escapeHtml(lead.domain)}</span><span>${escapeHtml(lead.platform)}</span><span class="lead-score">Релевантность ${Math.max(1,Math.min(99,Number(lead.score)||60))}%</span></div></div><div class="lead-actions"><button class="save-lead-button ${saved?'saved':''}" data-save-id="${escapeHtml(lead.id)}" title="${saved?'Убрать из сохранённых':'Сохранить клиента'}" aria-label="${saved?'Убрать из сохранённых':'Сохранить клиента'}">${saved?'♥':'♡'}</button><div class="lead-actions-bottom"><button class="lead-more-button" data-details-id="${escapeHtml(lead.id)}">Подробнее</button><button class="lead-open-button" data-open-url="${escapeHtml(lead.url)}">Открыть ↗</button></div></div></article>`}
  function renderLeadLists(notice=''){
    const html=currentLeads.length?`<div class="lead-list">${currentLeads.map(cardHtml).join('')}</div>`:`<div class="no-results"><strong>Пока ничего не найдено</strong><p>Попробуй изменить запрос или выбрать другую платформу.</p></div>`;
    $('#resultsArea').innerHTML=html;$('#resultsAreaPage').innerHTML=html;
    $('#resultsHeading').textContent=currentLeads.length?'Найденные возможности':'Подходящие возможности';
    $('#resultsSubheading').textContent=notice|| (lastMode==='live'?'Результаты получены из поискового API. Проверь каждую страницу перед контактом.':'Демо-результаты для проверки интерфейса. Подключи API, чтобы искать по интернету.');
    $('#pageResultsMeta').textContent=currentLeads.length?`${currentLeads.length} результатов${lastMode==='demo'?' · демо':''}`:'Пока ничего не найдено';
    updateCounters();
  }
  document.addEventListener('click',e=>{
    const save=e.target.closest('[data-save-id]');if(save){toggleSave(save.dataset.saveId);return}
    const details=e.target.closest('[data-details-id]');if(details){showLeadDetails(details.dataset.detailsId);return}
    const open=e.target.closest('[data-open-url]');if(open){openSafeUrl(open.dataset.openUrl);return}
  });
  function toggleSave(id){const lead=currentLeads.find(x=>x.id===id)||savedLeads.find(x=>x.id===id);if(!lead)return;
    const exists=savedLeads.some(x=>x.id===lead.id||x.url===lead.url);if(exists){savedLeads=savedLeads.filter(x=>x.id!==lead.id&&x.url!==lead.url);toast('Удалено из сохранённых.')}else{savedLeads.unshift({...lead,savedAt:new Date().toISOString()});toast('Клиент сохранён.');}
    persistSaved();renderLeadLists();if(activeView==='saved')renderSaved();
  }
  function renderSaved(){const q=($('#savedFilter').value||'').toLowerCase().trim();const filtered=savedLeads.filter(x=>[x.name,x.snippet,x.domain,x.platform].join(' ').toLowerCase().includes(q));
    $('#savedResultsArea').innerHTML=filtered.length?`<div class="lead-list">${filtered.map(cardHtml).join('')}</div>`:`<div class="empty-state" style="min-height:230px"><div class="empty-art"><div class="empty-magnifier">♡</div></div><h3>${savedLeads.length?'Ничего не совпало с фильтром':'Список пока пуст'}</h3><p>${savedLeads.length?'Попробуй другой запрос.':'Во время поиска нажимай на сердечко, чтобы сохранить перспективных клиентов.'}</p><button class="primary-button empty-cta" data-view="search">Найти клиентов <span class="button-arrow">↗</span></button></div>`;
  }
  $('#savedFilter').addEventListener('input',renderSaved);
  function openSafeUrl(url){try{const parsed=new URL(url,window.location.origin);if(!['http:','https:'].includes(parsed.protocol)||url==='#'){toast('У этого демо-результата нет конкретной страницы.','warning');return}window.open(parsed.href,'_blank','noopener,noreferrer')}catch(_){toast('Не удалось открыть ссылку.','warning')}}
  function showLeadDetails(id){const lead=currentLeads.find(x=>x.id===id)||savedLeads.find(x=>x.id===id);if(!lead)return;
    $('#leadModalContent').innerHTML=`<div class="eyebrow"><span class="eyebrow-line"></span> ИНФОРМАЦИЯ О ЛИДЕ</div><h2 class="modal-lead-title">${escapeHtml(lead.name)}</h2><div class="modal-detail-row"><span class="lead-tag">${escapeHtml(lead.category)}</span><span class="lead-tag">${escapeHtml(lead.platform)}</span><span class="lead-tag">${escapeHtml(lead.domain)}</span>${lead.demo?'<span class="lead-tag demo-tag">Демо-результат</span>':''}</div><p class="modal-lead-snippet">${escapeHtml(lead.snippet)}</p><div class="modal-detail-row"><span class="lead-score">Релевантность ${lead.score}%</span><span class="lead-tag">Источник: ${escapeHtml(lead.source)}</span></div>${lead.demo?'<div class="modal-demo-note">Это пример интерфейса, а не подтверждённый реальный клиент. При подключённом API проверяй оригинальную страницу перед тем, как писать автору.</div>':''}<div class="modal-action-row"><button class="primary-button" data-modal-save="${escapeHtml(lead.id)}">${isSaved(lead)?'♥ Сохранён':'♡ Сохранить клиента'}</button><button class="secondary-button" data-modal-message="${escapeHtml(lead.id)}">Подготовить сообщение</button><button class="secondary-button" data-open-url="${escapeHtml(lead.url)}">Открыть источник ↗</button></div>`;
    $('#leadModalBackdrop').classList.remove('hidden');
  }
  $('#closeLeadModal').addEventListener('click',()=>$('#leadModalBackdrop').classList.add('hidden'));
  $('#leadModalBackdrop').addEventListener('click',e=>{if(e.target===$('#leadModalBackdrop'))$('#leadModalBackdrop').classList.add('hidden')});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-modal-save]');if(b){toggleSave(b.dataset.modalSave);showLeadDetails(b.dataset.modalSave);return}const m=e.target.closest('[data-modal-message]');if(m){const lead=currentLeads.find(x=>x.id===m.dataset.modalMessage)||savedLeads.find(x=>x.id===m.dataset.modalMessage);$('#leadModalBackdrop').classList.add('hidden');if(lead){$('#templateName').value='';$('#templateDetail').value=lead.name;showView('templates');renderTemplate();}return}});
  function csvCell(v){return '"'+String(v??'').replace(/"/g,'""')+'"'}
  function exportCsv(items,filename){if(!items.length){toast('Нет данных для экспорта.','warning');return}const rows=[['Название','Категория','Платформа','Сайт','Ссылка','Описание','Релевантность','Тип результата'],...items.map(x=>[x.name,x.category,x.platform,x.domain,x.url,x.snippet,x.score,x.demo?'Демо':'Поисковый результат'])];const csv='\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);toast('CSV-файл подготовлен к скачиванию.')}
  $('#exportButton').addEventListener('click',()=>exportCsv(currentLeads,'clipfinder-results.csv'));$('#exportButtonPage').addEventListener('click',()=>exportCsv(currentLeads,'clipfinder-results.csv'));$('#exportSavedButton').addEventListener('click',()=>exportCsv(savedLeads,'clipfinder-saved.csv'));
  $$('.template-choice').forEach(b=>b.addEventListener('click',()=>{activeTemplate=b.dataset.template;renderTemplate();}));
  function renderTemplate(){ $$('.template-choice').forEach(b=>b.classList.toggle('active',b.dataset.template===activeTemplate));$('#templateTitle').textContent=templates[activeTemplate].title;$('#templateMessage').value=personalize(templates[activeTemplate].text);$('#templateFeedback').textContent=''; }
  function personalize(text){const name=($('#templateName')?.value||'').trim()||'имя автора';const detail=($('#templateDetail')?.value||'').trim()||'твой контент';return text.replaceAll('{name}',name).replaceAll('{detail}',detail)}
  $('#templateName').addEventListener('input',()=>{const pos=$('#templateMessage').selectionStart;$('#templateMessage').value=personalize(templates[activeTemplate].text);try{$('#templateMessage').setSelectionRange(pos,pos)}catch(_){}});
  $('#templateDetail').addEventListener('input',()=>{$('#templateMessage').value=personalize(templates[activeTemplate].text)});
  $('#copyTemplateButton').addEventListener('click',async()=>{const text=$('#templateMessage').value;try{await navigator.clipboard.writeText(text);$('#templateFeedback').textContent='Скопировано. Проверь текст и отправь вручную.'}catch(_){$('#templateMessage').select();try{document.execCommand('copy');$('#templateFeedback').textContent='Скопировано. Проверь текст и отправь вручную.'}catch(__){$('#templateFeedback').textContent='Выдели текст и скопируй его вручную.'}}messageCount++;localStorage.setItem(STORAGE_KEYS.messages,String(messageCount));updateCounters();toast('Сообщение готово — отправь его вручную.');});
  async function updateConnectionStatus(){try{const r=await fetch('/api/health');const data=await r.json();const live=!!data.serpApiConfigured;$('#apiStatusBadge').textContent=live?'Подключён':'Не подключён';$('#apiStatusBadge').classList.toggle('connected',live);$('#modeLabel').textContent=live?'Поиск доступен':'Демо-режим';}catch(_){$('#apiStatusBadge').textContent='Сервер не запущен';$('#apiStatusBadge').classList.remove('connected')}}
  $('#testConnectionButton').addEventListener('click',async()=>{const out=$('#connectionFeedback');out.textContent='Проверяем…';try{const r=await fetch('/api/health');const d=await r.json();if(d.serpApiConfigured){out.textContent='Подключение доступно. Запусти поиск, чтобы проверить результаты.';$('#apiStatusBadge').textContent='Подключён';$('#apiStatusBadge').classList.add('connected')}else{out.textContent='Сервер работает, но SERPAPI_KEY не задан. Сейчас активен демо-режим.';$('#apiStatusBadge').textContent='Не подключён';$('#apiStatusBadge').classList.remove('connected')}}catch(_){out.textContent='Сервер недоступен. Запусти npm start из папки проекта.'}});
  $('#clearSavedButton').addEventListener('click',()=>{if(!savedLeads.length){$('#clearFeedback').textContent='Список уже пуст.';return}if(!confirm('Удалить все сохранённые лиды из этого браузера?'))return;savedLeads=[];persistSaved();renderSaved();renderLeadLists();$('#clearFeedback').textContent='Сохранённые лиды удалены.';toast('Список очищен.');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#leadModalBackdrop').classList.add('hidden')});
  // Fill the page with deliberate starter content only after a user initiates a search.
  updateCounters();updateConnectionStatus();renderTemplate();renderSaved();
})();
