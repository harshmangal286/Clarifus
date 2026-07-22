const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let current = 1;
const onboard = $('#onboarding'), snapshot = $('#snapshot'), flow = $('#how'), hero = $('.hero');
function showStep(n){ current=n; $$('.step').forEach(x=>x.classList.toggle('active',+x.dataset.step===n)); $$('.step').forEach(x=>{if(+x.dataset.step!==n)x.style.display='none';else x.style.display='block'}); $$('.progress span').forEach((x,i)=>x.classList.toggle('active',i<n)); $('#backBtn').style.visibility=n===1?'hidden':'visible'; }
function begin(){hero.classList.add('hidden');flow.classList.add('hidden');onboard.classList.remove('hidden');showStep(1);window.scrollTo({top:0,behavior:'smooth'});}
$$('[data-start]').forEach(b=>b.addEventListener('click',begin));
$$('[data-scroll]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.scroll).scrollIntoView({behavior:'smooth'})));
$('#backBtn').onclick=()=>showStep(Math.max(1,current-1));
const file=$('#fileInput'), zone=$('#uploadZone'), status=$('#uploadStatus');
async function uploadResume(resume){
  if(!resume)return;
  if(resume.size>10*1024*1024){status.textContent='Please choose a file smaller than 10 MB.';status.className='upload-status error';return}
  zone.querySelector('strong').textContent=resume.name;zone.querySelector('small').textContent='Reading your experience…';status.textContent='Extracting skills, projects, experience, and evidence.';status.className='upload-status';
  const body=new FormData();body.append('file',resume);
  try{const response=await fetch('/api/resumes/extract',{method:'POST',body});const data=await response.json();if(!response.ok)throw new Error(data.detail||'We could not read that resume.');renderExtraction(data);$('#uploadView').classList.add('hidden');$('#extractionView').classList.remove('hidden')}catch(error){status.textContent=error.message;status.className='upload-status error';zone.querySelector('small').textContent='PDF or DOCX · up to 10 MB'}}
function makeCard(label, values, wide=false){const content=Array.isArray(values)?(values.length?values.map(value=>`<span class="extraction-chip">${value}</span>`).join(''):'<p class="extraction-empty">Nothing clear enough to use yet</p>'):(values?`<p>${values}</p>`:'<p class="extraction-empty">Not found in this resume</p>');return `<section class="extraction-card${wide?' wide':''}"><strong>${label}</strong>${content}</section>`}
function renderExtraction({file_name,extraction}){const e=extraction;$('#extractionSummary').textContent=`We read ${e.word_count} words from ${file_name}. You can confirm these signals before we use them.`;$('#extractionGrid').innerHTML=[makeCard('Skills',e.skills),makeCard('Technologies',e.technologies),makeCard('Projects',e.projects,true),makeCard('Experience',e.experience,true),makeCard('Certifications',e.certifications),makeCard('GitHub',e.github)].join('')}
file.onchange=()=>uploadResume(file.files[0]);
['dragenter','dragover'].forEach(e=>zone.addEventListener(e,x=>{x.preventDefault();zone.classList.add('drag')}));['dragleave','drop'].forEach(e=>zone.addEventListener(e,x=>{x.preventDefault();zone.classList.remove('drag')}));zone.addEventListener('drop',e=>uploadResume(e.dataTransfer.files[0]));
$('#confirmExtraction').onclick=()=>showStep(2);$('#replaceResume').onclick=()=>{file.value='';$('#extractionView').classList.add('hidden');$('#uploadView').classList.remove('hidden');status.textContent='';zone.querySelector('strong').textContent='Drop your resume here'};
$('#skipUpload').onclick=()=>showStep(2);
function selectable(container){$$(container+' button').forEach(b=>b.onclick=()=>{$$(container+' button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$(container).parentElement.querySelector('.continue').disabled=false})}
selectable('#goals');selectable('#confusion');
$('#goals').parentElement.querySelector('.continue').onclick=()=>showStep(3);
$('#confusion').parentElement.querySelector('.continue').onclick=()=>{showStep(4);startThinking()};
$('#confidenceRange').oninput=e=>{$('#confidenceText').textContent=['Very unclear','A little foggy','Somewhere in the middle','Mostly clear','Very clear'][e.target.value]};
function startThinking(){const rows=$$('#thinking div');let i=0;const tick=()=>{if(i){rows[i-1].classList.remove('current');rows[i-1].querySelector('span').textContent='✓'}if(i<rows.length){rows[i].classList.add('current');rows[i].querySelector('span').textContent='◌';i++;setTimeout(tick,700)}else setTimeout(showSnapshot,550)};tick()}
function showSnapshot(){onboard.classList.add('hidden');snapshot.classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
