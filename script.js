const leads=[
{name:"Jake Miller",handle:"@jakemiller",type:"YouTube Creator",platform:"YouTube",audience:"128K",opportunity:"Posts 3 videos/week",score:96,email:"jake@example.com",description:"Jake publishes high-frequency educational videos. His recent uploads show strong growth but inconsistent editing quality."},
{name:"Alex Carter",handle:"@alexcarter",type:"Podcast",platform:"YouTube",audience:"84K",opportunity:"Long-form podcast",score:92,email:"alex@example.com",description:"Alex runs a growing business podcast. Episodes are long-form and could benefit from short-form clips and professional editing."},
{name:"GrowthLab",handle:"@growthlab",type:"Business",platform:"Instagram",audience:"62K",opportunity:"Needs Reels",score:89,email:"hello@growthlab.example",description:"GrowthLab publishes educational business content and appears to be increasing their short-form video output."},
{name:"Daniel Brooks",handle:"@danielbrooks",type:"Creator",platform:"YouTube",audience:"47K",opportunity:"Weekly uploads",score:87,email:"daniel@example.com",description:"Daniel is consistently uploading videos but has limited editing complexity, creating a strong opportunity for an editor."},
{name:"Mia Thompson",handle:"@miathompson",type:"Coach",platform:"Instagram",audience:"31K",opportunity:"Daily content",score:84,email:"mia@example.com",description:"Mia produces frequent educational content and could benefit from outsourcing video editing."}
];

const leadList=document.getElementById("leadList"),searchButton=document.getElementById("searchButton"),scanModal=document.getElementById("scanModal"),leadModal=document.getElementById("leadModal"),closeModal=document.getElementById("closeModal"),closeLeadModal=document.getElementById("closeLeadModal"),progressBar=document.getElementById("progressBar"),progressPercent=document.getElementById("progressPercent"),scanTitle=document.getElementById("scanTitle"),scanText=document.getElementById("scanText"),leadsFound=document.getElementById("leadsFound"),highIntent=document.getElementById("highIntent"),emailsFound=document.getElementById("emailsFound");

renderLeads(leads.slice(0,4));

function getInitials(name){return name.split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase()}

function renderLeads(data){
 leadList.innerHTML="";
 data.forEach((lead,index)=>{
  const row=document.createElement("div");
  row.className="lead-row"; row.style.animationDelay=`${index*70}ms`;
  row.innerHTML=`<div class="client"><div class="client-avatar">${getInitials(lead.name)}</div><div class="client-info"><strong>${lead.name}</strong><small>${lead.handle}</small></div></div><div class="platform">${lead.platform}</div><div class="audience">${lead.audience}</div><div class="opportunity">${lead.opportunity}</div><div><span class="score">${lead.score}%</span></div><button class="more" onclick="openLead(${index})">⋯</button>`;
  leadList.appendChild(row);
 });
}

searchButton.addEventListener("click",startSearch);

function startSearch(){
 searchButton.classList.add("loading"); scanModal.classList.add("show");
 let progress=0,currentStep=0;
 const steps=document.querySelectorAll(".scan-step");
 steps.forEach(s=>s.classList.remove("active","done"));
 const interval=setInterval(()=>{
  progress+=Math.floor(Math.random()*4)+1;if(progress>100)progress=100;
  progressBar.style.width=`${progress}%`;progressPercent.textContent=`${progress}%`;
  const stepIndex=Math.min(Math.floor(progress/25),3);
  if(stepIndex!==currentStep){
   if(steps[currentStep]){steps[currentStep].classList.remove("active");steps[currentStep].classList.add("done");steps[currentStep].querySelector("span").textContent="✓"}
   currentStep=stepIndex;
   if(steps[currentStep]){steps[currentStep].classList.add("active");steps[currentStep].querySelector("span").textContent="●"}
  }
  if(progress<25){scanTitle.textContent="Finding clients...";scanText.textContent="Scanning creators and businesses."}
  else if(progress<50){scanTitle.textContent="Analyzing activity...";scanText.textContent="Looking for signs they need an editor."}
  else if(progress<75){scanTitle.textContent="Finding opportunities...";scanText.textContent="Matching leads to your profile."}
  else{scanTitle.textContent="Ranking leads...";scanText.textContent="Calculating client potential."}
  if(progress>=100){clearInterval(interval);setTimeout(finishSearch,700)}
 },100);
}

function finishSearch(){
 scanModal.classList.remove("show");searchButton.classList.remove("loading");progressBar.style.width="0%";progressPercent.textContent="0%";generateNewLead();
}

function generateNewLead(){
 const name=randomName();
 const newLead={name,handle:"@"+name.toLowerCase().replace(" ",""),type:"YouTube Creator",platform:"YouTube",audience:Math.floor(Math.random()*150+20)+"K",opportunity:randomOpportunity(),score:Math.floor(Math.random()*13)+86,email:"hello@creator.example",description:"This lead was recently discovered by EditFind AI. Their content frequency and audience growth indicate a potential need for professional video editing."};
 leads.unshift(newLead);renderLeads(leads.slice(0,5));
 leadsFound.textContent=parseInt(leadsFound.textContent)+Math.floor(Math.random()*8)+3;
 highIntent.textContent=parseInt(highIntent.textContent)+1;
 emailsFound.textContent=parseInt(emailsFound.textContent)+1;
}

function randomName(){return ["Noah Wilson","Ethan Walker","Lucas Martin","Oliver Stone","Ryan Cooper","Chris Morgan","Liam Parker","James Taylor"][Math.floor(Math.random()*8)]}
function randomOpportunity(){return ["3 uploads/week","Needs short clips","Growing channel","Long-form content","Daily content","Podcast editing"][Math.floor(Math.random()*6)]}

function openLead(index){
 const lead=leads[index];
 document.getElementById("leadDetails").innerHTML=`<div class="detail-top"><div class="detail-avatar">${getInitials(lead.name)}</div><div><h2>${lead.name}</h2><p>${lead.handle} · ${lead.type}</p></div><div class="detail-score">${lead.score}% match</div></div><div class="detail-grid"><div class="detail-stat"><small>PLATFORM</small><strong>${lead.platform}</strong></div><div class="detail-stat"><small>AUDIENCE</small><strong>${lead.audience}</strong></div><div class="detail-stat"><small>EMAIL</small><strong>${lead.email}</strong></div><div class="detail-stat"><small>OPPORTUNITY</small><strong>${lead.opportunity}</strong></div></div><div class="detail-opportunity"><strong>Why this lead?</strong><br><br>${lead.description}</div><div class="detail-actions"><button class="primary-action" onclick="generatePitch('${lead.name}')">✦ Generate pitch</button><button class="secondary-action" onclick="copyEmail('${lead.email}')">Copy email</button></div>`;
 leadModal.classList.add("show");
}

function generatePitch(name){alert(`AI pitch generated for ${name}!\n\nHey ${name.split(" ")[0]},\n\nI watched some of your recent content and really liked your style. I noticed there is a lot of potential to make your videos even more engaging through tighter editing, pacing and short-form clips.\n\nI'd love to help with that.`)}
function copyEmail(email){navigator.clipboard.writeText(email);alert("Email copied: "+email)}
closeModal.addEventListener("click",()=>scanModal.classList.remove("show"));
closeLeadModal.addEventListener("click",()=>leadModal.classList.remove("show"));
window.addEventListener("click",e=>{if(e.target===scanModal)scanModal.classList.remove("show");if(e.target===leadModal)leadModal.classList.remove("show")});
document.querySelectorAll(".nav-item").forEach(item=>item.addEventListener("click",()=>{document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));item.classList.add("active")}));
