 'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY='last-light-multilab-v2';
const RELEASE='20261029-multilab';
const PAN_CENTERS={all:[768,512],left:[340,590],aisle:[806,677],right:[1280,640]};
const freshState=()=>({started:false,answers:{},firstChoices:{},hints:0,finished:false});
let activeLab=null,POINTS=[],SCENE_DETAILS={},OUTCOMES={},COMPARISONS={},state=freshState();
let sceneReady=false,toastTimer,hintTimer,finishTimer,currentId=null;
let zoomScale=1,lastCompletedId=null,sceneLoadAttempt=0,sceneController=null,resizeFrame=0,storageAvailable=true,sceneLoadFailed=false;
let book={version:2,labs:{}};
function cleanState(raw,lab){
 const out=freshState();if(!raw||typeof raw!=='object')return out;
 out.started=raw.started===true;
 for(const p of lab.points){
  const a=raw.answers?.[p.id],c=raw.firstChoices?.[p.id];
  if(a&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<3){out.answers[p.id]={choice:a.choice,correct:a.choice===p.answer};out.firstChoices[p.id]=a.choice;}
  if(Number.isInteger(c)&&c>=0&&c<3)out.firstChoices[p.id]=c;
 }
 out.hints=Number.isInteger(raw.hints)&&raw.hints>=0?raw.hints:0;
 out.finished=raw.finished===true&&Object.keys(out.answers).length===6;
 if(Object.keys(out.answers).length||Object.keys(out.firstChoices).length)out.started=true;
 return out;
}
try{
 const raw=JSON.parse(localStorage.getItem(STORAGE_KEY));
 if(raw?.version===2&&raw.labs&&typeof raw.labs==='object')book=raw;
 else{
  const old=JSON.parse(localStorage.getItem('last-light-lab-v1'));
  if(old&&typeof old==='object'){
   // The sixth computer question has changed from a normal check to a missing registration.
   if(old.answers)delete old.answers.server;if(old.firstChoices)delete old.firstChoices.server;
   old.finished=false;book.labs.computer=old;
  }
 }
}catch{}
for(const lab of Object.values(LABS))book.labs[lab.id]=cleanState(book.labs[lab.id],lab);
function renderLobby(){
 const labs=Object.values(LABS),done=labs.filter(l=>book.labs[l.id].finished).length;
 const total=labs.reduce((sum,l)=>sum+Object.keys(book.labs[l.id].answers).length,0);
 $('#journeyCount').textContent=`${total} / 24`;
 $('#journeyFinished').textContent=`已完成 ${done} / 4 间实验室`;
 for(const lab of labs){
  const saved=book.labs[lab.id],n=Object.keys(saved.answers).length;
  const card=$(`[data-lab="${lab.id}"]`);
  card.classList.toggle('is-active',activeLab?.id===lab.id);card.classList.toggle('is-complete',saved.finished);
  card.setAttribute('aria-pressed',String(activeLab?.id===lab.id));
  $('.lab-card-progress',card).textContent=saved.finished?'巡查完成 ✓':saved.started?`已检查 ${n} / 6`:'6 处隐患 · 约 3 分钟';
  $('.lab-card-action',card).textContent=saved.finished?'查看场景与报告 ↗':saved.started?'继续这间巡查 ↗':'进入实验室 ↗';
  $('.lab-card-bar span',card).style.width=`${n/6*100}%`;
 }
}
function selectLab(id){
 const lab=LABS[id];if(!lab)return;
 if(activeLab)persist();
 clearTimeout(finishTimer);clearTimeout(hintTimer);lastCompletedId=null;currentId=null;
 $$('dialog[open]').forEach(d=>d.close());$('#zoomMount').innerHTML='';
 activeLab=lab;POINTS=lab.points;SCENE_DETAILS=lab.details;OUTCOMES=lab.outcomes;COMPARISONS=lab.comparisons;
 state=book.labs[id];sceneReady=false;sceneLoadFailed=false;zoomScale=1;
 $('#gameSection').hidden=false;$('#currentLabStrip').hidden=false;
 $('#currentLabName').textContent=lab.name;$('#currentLabRoom').textContent=`21:30 / ${lab.room}`;
 $('#sceneLabName').textContent=`${lab.name} · 夜间`;$('.scene-number').textContent=`SCENE ${String(Object.keys(LABS).indexOf(id)+1).padStart(2,'0')} / 04`;
 $('.note-time').textContent=`21:30 / 实验室 ${lab.room}`;
 $('#lightOff').querySelector('span').textContent=`晚安，${lab.name}。`;
 $('.compare-note').textContent='画面呈现本次模拟处置后的状态；标记停用、报告不等于已经完成专业检修。';
 $('.compare-summary').innerHTML=`<span>${lab.name}</span><span>6 项检查完成</span>`;
 document.title=`${lab.name} · 最后一个离开实验室的人`;
 const observeNames=lab.id==='computer'?['左侧工位','中央通道','右侧工位']:['左侧区域','中央区域','右侧区域'];
 ['left','aisle','right'].forEach((key,i)=>{$(`[data-observe="${key}"]`).textContent=observeNames[i];$(`[data-pan="${key}"]`).textContent=observeNames[i];});
 renderLobby();loadScene();$('#currentLabStrip').scrollIntoView({block:'start',behavior:'auto'});
}
function returnToLobby(){
 if(activeLab)persist();clearTimeout(finishTimer);clearTimeout(hintTimer);
 ++sceneLoadAttempt;if(sceneController)sceneController.abort();
 $$('dialog[open]').forEach(d=>d.close());$('#zoomMount').innerHTML='';
 activeLab=null;sceneReady=false;$('#gameSection').hidden=true;$('#currentLabStrip').hidden=true;
 document.title='最后一个离开实验室的人 · 安全离场计划';renderLobby();updateDock();
 $('#labLobby').scrollIntoView({block:'start',behavior:'auto'});$('#lobbyTitle').focus({preventScroll:true});
}
const count=()=>Object.keys(state.answers).length;
function persist(){if(activeLab)book.labs[activeLab.id]=state;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(book));storageAvailable=true;}catch{storageAvailable=false;}$('#storageNote').hidden=storageAvailable;renderLobby();}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3800);}
function update(){
 const n=count();
 $('#progressLabel').innerHTML=`${n} <em>/ 6</em>`;$('#progressBar').style.width=`${n/6*100}%`;$('.progress-track').setAttribute('aria-valuenow',String(n));
 $('#sceneState').textContent=state.finished?'已安心离场':state.started?'巡查进行中':'等待巡查';
 $('.live-dot').classList.toggle('active',state.started&&!state.finished);
 $('#startBtn').hidden=state.started;$('#startBtn').disabled=!sceneReady;$('#mobileStartBtn').hidden=state.started;$('#mobileStartBtn').disabled=!sceneReady;
 $('#hintBtn').hidden=!state.started||n===6||state.finished;$('#hintBtn').disabled=!sceneReady;
 $('#finishBtn').hidden=n!==6||state.finished;$('#reportBtn').hidden=!state.finished;$('#compareBtn').hidden=n!==6;
 updateDock();updateHandoff();
 $('#resetBtn').hidden=!state.started;
 $('#sceneCaption').hidden=!sceneReady||state.finished||n===6;
 $('#sceneCaption').innerHTML=state.started?'<span class="caption-icon">↖</span> 点击可疑物品，做出你的判断':'<span class="caption-icon">↖</span> 每一处细节，都值得再看一眼';
 $('#sceneInstruction').textContent=!sceneReady?(sceneLoadFailed?'场景加载遇到问题，请点击重新加载。':'场景正在加载，已有进度会保留。'):state.finished?'巡查完成。谢谢你，为明天留下一份安心。':n===6?'6 项检查已完成，可以准备关灯离开了':state.started?'点击场景中的物品检查 · 支持放大观察':'点击“开始今晚的巡查”，进入场景';
 $('#missionDescription').innerHTML=state.finished?'离场检查已完成。<br>认真对待细节，就是最好的守护。':n===6?'你完成了全部 6 项检查。<br>确认离场安排，就可以安心离开。':'观察实验室，完成 6 项安全检查。<br>发现问题，也要知道如何正确处理。';
 $('#checklist').innerHTML=POINTS.map((p,i)=>`<li class="${state.answers[p.id]?'done':''}"><span class="check-circle">${state.answers[p.id]?'✓':String(i+1).padStart(2,'0')}</span>${state.answers[p.id]?`<button data-review="${p.id}" aria-label="回顾${p.area}">${p.area}</button><span class="review-label">已检查</span>`:`<button data-inspect="${p.id}" aria-label="观察${p.area}" ${!state.started||!sceneReady?'disabled':''}>${p.area}</button><span class="review-label">观察</span>`}</li>`).join('');
 $$('[data-review]').forEach(b=>b.addEventListener('click',()=>openQuestion(b.dataset.review)));
 $$('[data-inspect]').forEach(b=>b.addEventListener('click',()=>openZoom(SCENE_DETAILS[b.dataset.inspect].pan,b.dataset.inspect)));
 $$('.scene-observe button').forEach(b=>b.disabled=!sceneReady||state.finished);
 $$('.room-svg').forEach(svg=>{
  svg.classList.toggle('started',state.started);
  $$('[data-safe-for]',svg).forEach(layer=>layer.classList.toggle('resolved',!!state.answers[layer.dataset.safeFor]));
  $$('[data-point]',svg).forEach(g=>{g.classList.toggle('resolved',!!state.answers[g.dataset.point]);g.setAttribute('tabindex',state.started&&!state.finished?'0':'-1');});
 });
 $('#lightOff').classList.toggle('visible',state.finished);$('#lightOff').setAttribute('aria-hidden',String(!state.finished));persist();
}
function wireScene(root){
 $$('[data-point]',root).forEach(el=>{
  const activate=()=>{if(!state.started){toast('先点击“开始今晚的巡查”，再检查实验室。');return;}if(state.finished){showReport();return;}openQuestion(el.dataset.point);};
  el.addEventListener('click',activate);
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
 });
 $$('[data-neutral]',root).forEach(el=>el.addEventListener('click',()=>state.started&&toast(el.dataset.neutral)));
}
function preloadSceneImage(src){
 return new Promise((resolve,reject)=>{const image=new Image();const timer=setTimeout(()=>{image.onload=null;image.onerror=null;reject(new Error('image timeout'));},15000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(new Error('image load'));};image.src=src;});
}
async function loadScene(){
 const attempt=++sceneLoadAttempt;sceneReady=false;sceneLoadFailed=false;if(sceneController)sceneController.abort();sceneController=new AbortController();
 const controller=sceneController,timeout=setTimeout(()=>controller.abort(),18000);
 $('#sceneMount').innerHTML='<div class="scene-loading" role="status">正在布置今晚的巡查场景…</div>';update();
 try{
  const [svg]=await Promise.all([
   fetch(`${activeLab.scene}?v=${RELEASE}`,{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('scene load');return response.text();}),
   preloadSceneImage(activeLab.before),preloadSceneImage(activeLab.after)
  ]);
  if(attempt!==sceneLoadAttempt)return;
  $('#sceneMount').innerHTML=svg;wireScene($('#sceneMount'));sceneReady=true;update();
 }catch{
  if(attempt!==sceneLoadAttempt)return;
  sceneLoadFailed=true;$('#sceneMount').innerHTML='<div class="scene-load-error" role="status"><strong>场景暂时未能加载</strong>请检查网络后重试，已有检查进度会保留。<button id="retryScene">重新加载场景 ↻</button></div>';$('#retryScene').onclick=loadScene;update();
 }finally{clearTimeout(timeout);}
}
function openQuestion(id){
 const p=POINTS.find(x=>x.id===id);if(!p)return;currentId=id;if(state.finished)clearTimeout(finishTimer);
 $$('.hinted').forEach(e=>e.classList.remove('hinted'));
 const answered=state.answers[id];
 $('#questionContent').innerHTML=`<div class="dialog-eyebrow">THE LAST LIGHT / 离场巡查</div><div class="question-kicker">✧ ${p.tag}</div><h2 id="questionTitle">${p.title}</h2><p class="question-story">${p.story}</p><div class="inspection-detail"><svg viewBox="${SCENE_DETAILS[id].crop}" role="img" aria-label="${SCENE_DETAILS[id].label}观察特写"><image href="${activeLab.before}" width="1536" height="1024"/></svg><span>${answered?'检查前 · ':''}${SCENE_DETAILS[id].label}</span></div><div class="question-prompt">${p.prompt}</div><div class="choices">${p.options.map((option,i)=>`<button class="choice" data-choice="${i}"><span>${'ABC'[i]}</span><span>${option}</span></button>`).join('')}</div><div id="answerFeedback" aria-live="polite"></div>`;
 $$('.choice').forEach(b=>b.addEventListener('click',()=>selectAnswer(Number(b.dataset.choice))));
 if(answered) renderFeedback(p,answered.choice,true);
 else if(Number.isInteger(state.firstChoices[id])) renderFeedback(p,state.firstChoices[id],false);
 if(!$('#questionDialog').open)$('#questionDialog').showModal();
}
function selectAnswer(choice){
 const p=POINTS.find(x=>x.id===currentId);if(!p||state.answers[p.id])return;
 // Keep the question open until the user acknowledges the explanation.
 state.firstChoices[p.id]=choice;persist();
 renderFeedback(p,choice,false);
}
function renderFeedback(p,choice,review){
 $$('.choice').forEach((b,i)=>{b.disabled=true;b.classList.toggle('correct',i===p.answer);b.classList.toggle('wrong',i===choice&&choice!==p.answer);});
 const correct=choice===p.answer;
 $('#answerFeedback').innerHTML=`<div class="feedback"><h3>${review?'检查要点回顾':correct?'判断正确，这个细节你注意到了。':'这个选择值得再想一想。'}</h3><p>${p.explanation}</p></div><button class="primary-btn" id="acknowledgeBtn">${review?'返回场景':correct?'完成这一项检查':'记住正确做法，完成检查'} <span>✓</span></button>`;
 requestAnimationFrame(()=>{const feedback=$('#answerFeedback');feedback.scrollIntoView({block:'nearest',behavior:'auto'});$('#acknowledgeBtn').focus({preventScroll:true});});
 $('#acknowledgeBtn').onclick=()=>{
  if(!review){state.answers[p.id]={choice,correct};lastCompletedId=p.id;update();toast(count()===6?'全部检查完成，可以准备关灯离开了。':`${p.area}已检查 · ${count()} / 6`);}
  $('#questionDialog').close();currentId=null;
 };
}
function start(){if(!sceneReady)return;state.started=true;update();toast('巡查开始。试着点击场景中的可疑物品。');if(matchMedia('(max-width: 800px)').matches)$('#sceneViewport').scrollIntoView({behavior:'auto',block:'center'});}
function hint(){
 const p=POINTS.find(x=>!state.answers[x.id]);if(!p)return;state.hints++;persist();toast(p.hint);clearTimeout(hintTimer);
 $$('.hinted').forEach(e=>e.classList.remove('hinted'));$$(`[data-point="${p.id}"]`).forEach(e=>e.classList.add('hinted'));
 hintTimer=setTimeout(()=>$$('.hinted').forEach(e=>e.classList.remove('hinted')),6500);
 if(matchMedia('(max-width: 800px)').matches)$('#sceneViewport').scrollIntoView({behavior:'auto',block:'center'});
}
function finish(){
 if(count()!==6)return;
 $('#infoContent').innerHTML='<div class="dialog-eyebrow">ONE LAST CHECK</div><h2 id="infoTitle">最后，确认一下。</h2><p id="finishLabNote"></p><div class="info-callout"><p style="margin:0">在真实实验室，还需按本室清单完成相应检查与交接。这里的“关灯离开”，表示完成本次模拟巡查。</p></div><button class="primary-btn" id="confirmFinish">确认完成，关灯离开 <span>↗</span></button>';
 $('#finishLabNote').textContent=activeLab.finishNote;$('#infoDialog').showModal();$('#confirmFinish').onclick=()=>{$('#infoDialog').close();state.finished=true;update();$('#sceneViewport').scrollIntoView({behavior:'auto',block:'center'});clearTimeout(finishTimer);finishTimer=setTimeout(()=>state.finished&&showReport(),1500);};
}
function showReport(){
 clearTimeout(finishTimer);
 const missed=POINTS.filter(p=>!state.answers[p.id]?.correct);
 const reviewMarkup=missed.length?`<section class="review-focus" aria-label="需要复习的细节"><h3>${missed.length} 处细节，值得再记一次</h3><p>首次判断的记录会保留。点开回顾，把正确做法带走。</p><ul>${missed.map(p=>`<li><div><strong>${p.area}</strong><button data-report-review="${p.id}" aria-label="复习${p.area}的正确做法">回顾正确做法 ↗</button></div><p>${p.short}</p></li>`).join('')}</ul></section>`:`<section class="review-focus all-correct"><h3>六项判断，都留意到了。</h3><p>把这份细致带进下一次实验，离开前继续多看一眼。</p></section>`;
 const correct=POINTS.filter(p=>state.answers[p.id]?.correct).length;
 $('#reportContent').innerHTML=`<div class="report-top"><div class="report-stamp">✓</div><div class="dialog-eyebrow">A CAREFUL GOODBYE</div><h2 id="reportTitle">谢谢你，最后的守护者。</h2><p>${activeLab.name} · ${activeLab.room}<br>最后一盏灯熄灭了，安心留在实验室里。</p></div><div class="report-stats"><div><strong>6<small> / 6</small></strong>完成检查</div><div><strong>${correct}<small> / 6</small></strong>首次判断正确</div><div><strong>${state.hints}</strong>使用提示</div></div>${reviewMarkup}<p class="report-list-hint">点击检查项，可查看这处场景的前后变化。</p><ul class="report-list">${POINTS.map(p=>`<li><h3><button class="report-area-link" data-report-compare="${p.id}" aria-label="查看${p.area}前后变化">${p.area} ↗</button><span class="${state.answers[p.id]?.correct?'first':''}">${state.answers[p.id]?.correct?'首次判断正确':'已学习正确做法'}</span></h3><p>${p.short}</p></li>`).join('')}</ul><button class="report-compare" id="reportCompareBtn">查看巡查前后对比 ↔</button><div class="report-actions"><button class="primary-btn" id="downloadBtn">保存我的检查卡 ↓</button><button class="secondary-btn" id="replayBtn">重玩本实验室 ↻</button><button class="secondary-btn" id="chooseNextLab">选择其他实验室 ↗</button></div><p class="report-footnote">这是一份学习记录，不是安全资质或真实检查证明。<br>把今天记住的细节，带进明天的实验室。</p>`;
 $$('[data-report-review]').forEach(button=>button.onclick=()=>openQuestion(button.dataset.reportReview));$$('[data-report-compare]').forEach(button=>button.onclick=()=>openComparison(button.dataset.reportCompare));
 $('#chooseNextLab').onclick=returnToLobby;$('#reportCompareBtn').onclick=openComparison;$('#downloadBtn').onclick=downloadCard;$('#replayBtn').onclick=()=>{$('#reportDialog').close();reset(true);};
 if(!$('#reportDialog').open)$('#reportDialog').showModal();
}
function downloadCard(){
 const correct=POINTS.filter(p=>state.answers[p.id]?.correct).length;
 const rows=POINTS.map((p,i)=>`<circle cx="82" cy="${385+i*65}" r="11" fill="#dce6cd"/><path d="M77 ${385+i*65}l4 4 6-8" fill="none" stroke="#658451" stroke-width="2"/><text x="108" y="${389+i*65}" fill="#4b6342" font-size="17">${p.area}</text><text x="108" y="${411+i*65}" fill="#839174" font-size="12">${p.short}</text>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="980" viewBox="0 0 640 980"><rect width="640" height="980" fill="#f4f3eb"/><rect x="28" y="28" width="584" height="924" rx="16" fill="#fafbf3" stroke="#d6ddc8"/><g font-family="PingFang SC,Microsoft YaHei,sans-serif"><text x="320" y="99" text-anchor="middle" fill="#82916f" font-size="12" letter-spacing="4">THE LAST LIGHT</text><text x="320" y="162" text-anchor="middle" fill="#35533f" font-size="30">最后一个离开实验室的人</text><text x="320" y="202" text-anchor="middle" fill="#82916f" font-size="16">${activeLab.name} · 离场检查卡</text><path d="M65 235h510" stroke="#d7deca"/><text x="200" y="294" text-anchor="middle" font-size="37" fill="#45623c">6 / 6</text><text x="200" y="323" text-anchor="middle" font-size="13" fill="#899579">完成检查</text><text x="440" y="294" text-anchor="middle" font-size="37" fill="#45623c">${correct} / 6</text><text x="440" y="323" text-anchor="middle" font-size="13" fill="#899579">首次判断正确</text>${rows}<path d="M65 806h510" stroke="#d7deca"/><text x="320" y="849" text-anchor="middle" fill="#5d754e" font-size="19">今晚，把平安留给明天。</text><text x="320" y="885" text-anchor="middle" fill="#95a087" font-size="11">实验室安全互动学习记录 · 非安全资质或真实检查证明</text></g></svg>`;
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});const svgUrl=URL.createObjectURL(blob);const img=new Image();
 const fallback=()=>{downloadBlob(blob,`${activeLab.name}-离场检查卡.svg`);URL.revokeObjectURL(svgUrl);};
 img.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=1960;const ctx=canvas.getContext('2d');if(!ctx){fallback();return;}ctx.drawImage(img,0,0,1280,1960);canvas.toBlob(png=>{if(png){downloadBlob(png,`${activeLab.name}-离场检查卡.png`);URL.revokeObjectURL(svgUrl);}else fallback();},'image/png');}catch{fallback();}};
 img.onerror=fallback;img.src=svgUrl;
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('检查卡已生成，请在浏览器下载中查看。');}
function reset(direct=false){
 const execute=()=>{clearTimeout(finishTimer);clearTimeout(hintTimer);lastCompletedId=null;state={started:false,answers:{},firstChoices:{},hints:0,finished:false};$$('dialog[open]').forEach(d=>d.close());$$('.hinted').forEach(e=>e.classList.remove('hinted'));update();$('#sceneViewport').scrollIntoView({behavior:'auto',block:'center'});toast('新的一晚，重新出发。');};
 if(direct||(!count()&&!Object.keys(state.firstChoices).length)){execute();return;}
 $('#infoContent').innerHTML='<div class="dialog-eyebrow">START AGAIN</div><h2 id="infoTitle">重新开始今晚的巡查？</h2><p>本实验室的检查进度和首次判断记录将清空，其他实验室的记录会保留。</p><button class="primary-btn" id="confirmReset">重新开始 <span>↻</span></button><button class="hint-btn" id="cancelReset">保留进度，继续检查</button>';
 $('#infoDialog').showModal();$('#confirmReset').onclick=execute;$('#cancelReset').onclick=()=>$('#infoDialog').close();
}
function showInfo(){
 $('#infoContent').innerHTML='<div class="dialog-eyebrow">ABOUT THE LAST LIGHT</div><h2 id="infoTitle">一场认真的告别。</h2><p>《最后一个离开实验室的人》是一份实验室安全互动作品。你是今晚最后离开的同学，用一次细致的巡查，为明天留下一份安心。</p><ol><li>先自由选择实验室，再点击“开始今晚的巡查”，观察场景中的物品。</li><li>点击检查点，选择你认为合适的处理方式。</li><li>阅读反馈并完成检查，场景会随之变化。</li><li>完成 6 项后关灯离开，回顾并保存检查卡。</li></ol><div class="info-callout"><p style="margin:0">找不到时可以使用提示，也可以点击“局部观察”或检查清单中的区域名称。放大场景支持滑动与倍率调整。完成全部检查后，还能拖动分界线查看巡查前后对比。首次判断计入报告，但不限制重玩。四间实验室分别记录进度，可随时切换，记录只保存在当前浏览器中。</p></div><p>场景图片由 AI 生成，房间编号和事件均为虚构教学示意，不对应真实实验室。具体管理与处置要求以所在实验室规定为准。</p><button class="primary-btn" id="closeInfo">我知道了 <span>↗</span></button>';
 $('#infoDialog').showModal();$('#closeInfo').onclick=()=>$('#infoDialog').close();
}
$('#startBtn').onclick=start;$('#mobileStartBtn').onclick=start;$('#hintBtn').onclick=hint;$('#finishBtn').onclick=finish;$('#reportBtn').onclick=showReport;$('#resetBtn').onclick=()=>reset();$('#helpBtn').onclick=showInfo;$('#aboutBtn').onclick=showInfo;
function updateDock(){
 if(!activeLab){$('#dockCaption').textContent='4 类实验室 · 24 处隐患';$('#dockProgress').textContent='选择今晚的巡查地点';$('#dockAction').innerHTML='选择实验室 <span>↗</span>';$('#dockAction').disabled=false;return;}
 const n=count();
 $('#dockCaption').textContent=state.started?`${activeLab.name} · ${activeLab.room}`:'今晚，把平安留给明天';
 $('#dockProgress').textContent=state.finished?'已安心离场':n===6?'6 项检查已完成':state.started?`已检查 ${n} / 6 项`:'准备好了吗？';
 const action=state.finished?'查看报告':n===6?'完成离场':state.started?'继续观察':'开始巡查';
 $('#dockAction').innerHTML=`${action} <span>↗</span>`;$('#dockAction').disabled=!sceneReady&&!state.finished&&n<6;
}
function syncZoomControls(){
 $('#zoomFactor').textContent=`${zoomScale.toFixed(1)}×`;
 $('#zoomOutBtn').disabled=zoomScale<=1;$('#zoomInBtn').disabled=zoomScale>=4;
}
function positionZoom(center,behavior='auto'){
 const mount=$('#zoomMount'),svg=$('.room-svg',mount);if(!svg)return;
 svg.classList.remove('overview');svg.style.minWidth='0';svg.style.width=`${mount.clientWidth*zoomScale}px`;
 const scale=svg.getBoundingClientRect().width/1536;
 mount.scrollTo({left:Math.max(0,center[0]*scale-mount.clientWidth/2),top:Math.max(0,center[1]*scale-mount.clientHeight/2),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':behavior});
 syncZoomControls();
}
function panScene(area='all',pointId=null){
 zoomScale=area==='all'?1:matchMedia('(max-width: 600px)').matches?3:1.5;
 let center=PAN_CENTERS[area]||PAN_CENTERS.all;
 if(pointId&&SCENE_DETAILS[pointId]){const [x,y,w,h]=SCENE_DETAILS[pointId].crop.split(' ').map(Number);center=[x+w/2,y+h/2];}
 positionZoom(center);
 $$('.zoom-nav button').forEach(b=>{b.classList.toggle('selected',b.dataset.pan===area);b.setAttribute('aria-pressed',String(b.dataset.pan===area));});
}
function changeZoom(delta){
 const mount=$('#zoomMount'),svg=$('.room-svg',mount);if(!svg)return;
 const scale=svg.getBoundingClientRect().width/1536;
 const center=[(mount.scrollLeft+mount.clientWidth/2)/scale,(mount.scrollTop+mount.clientHeight/2)/scale];
 zoomScale=Math.max(1,Math.min(4,zoomScale+delta));positionZoom(center,'auto');
}
function openZoom(area='all',pointId=null){
 if(!sceneReady){toast('场景正在加载，请稍等。');return;}
 $('#zoomMount').innerHTML=$('#sceneMount').innerHTML.replace(/id="patch-/g,'id="zoom-patch-').replace(/url\(#patch-/g,'url(#zoom-patch-');wireScene($('#zoomMount'));update();if(!$('#zoomDialog').open)$('#zoomDialog').showModal();panScene(area,pointId);
}
function openComparison(topic='all'){
 if(count()!==6)return;
 if(!sceneReady){toast('对比场景正在加载，请稍等。');return;}
 clearTimeout(finishTimer);selectComparison(typeof topic==='string'?topic:'all');if(!$('#compareDialog').open)$('#compareDialog').showModal();
}
function selectComparison(topic){
 const key=Object.prototype.hasOwnProperty.call(COMPARISONS,topic)?topic:'all',item=COMPARISONS[key];
 $('#compareTopics').innerHTML=Object.entries(COMPARISONS).map(([id,value])=>`<button data-compare-topic="${id}" class="${id===key?'selected':''}" aria-pressed="${id===key}">${value.name}</button>`).join('');
 $$('[data-compare-topic]').forEach(button=>button.onclick=()=>selectComparison(button.dataset.compareTopic));
 $$('.compare-scene').forEach((svg,index)=>{svg.setAttribute('viewBox',item.crop);svg.setAttribute('aria-label',`${item.name} · ${index?'巡查后':'巡查前'}`);svg.innerHTML=`<image href="${index?activeLab.after:activeLab.before}" width="1536" height="1024"/>${comparisonLabels(index===1,key)}`;});
 $('#compareContext').innerHTML=`<strong>${item.before}</strong> → ${item.after}`;
 const tag=$('.compare-cable-tag');tag.hidden=activeLab.id!=='computer'||(key!=='all'&&key!=='cable');
 if(!tag.hidden){const [x,y,w,h]=item.crop.split(' ').map(Number);tag.style.left=`${(384-x)/w*100}%`;tag.style.top=`${(691-y)/h*100}%`;}
 setComparison('split' in item?item.split:50);
}
function updateHandoff(){
 const item=lastCompletedId&&state.answers[lastCompletedId]?OUTCOMES[lastCompletedId]:null;
 $('#handoff').hidden=!item||state.finished;if(!item)return;
 $('#handoffTitle').textContent=item[0];$('#handoffText').textContent=item[1];
 $('#handoffNext').textContent=count()===6?'确认离场 ↗':'继续观察下一处 ↗';
 $('#handoffNext').disabled=!sceneReady;
}
$('#handoffNext').onclick=()=>{
 if(count()===6){finish();return;}
 const next=POINTS.find(p=>!state.answers[p.id]);if(next)openZoom(SCENE_DETAILS[next.id].pan,next.id);
};
function setComparison(value){
 const numeric=Number(value),split=Number.isFinite(numeric)?Math.max(0,Math.min(100,numeric)):50;
 $('#compareFrame').style.setProperty('--split',`${split}%`);$('#compareRange').value=String(split);
 $('#compareRange').setAttribute('aria-valuetext',`巡查后画面显示 ${Math.round(split)}%`);
 $('.after-label').hidden=split<10;$('.before-label').hidden=split>90;
}
$('#dockAction').onclick=()=>{
 if(!activeLab){$('#labLobby').scrollIntoView({block:'start',behavior:'auto'});$('#lobbyTitle').focus({preventScroll:true});return;}
 if(!state.started){start();return;}
 if(state.finished){showReport();return;}
 if(count()===6){finish();return;}
 const next=POINTS.find(p=>!state.answers[p.id]);if(next)openZoom(SCENE_DETAILS[next.id].pan,next.id);
};
$('#zoomOutBtn').onclick=()=>changeZoom(-.5);$('#zoomInBtn').onclick=()=>changeZoom(.5);
$('#compareBtn').onclick=openComparison;$('#compareRange').oninput=e=>setComparison(e.target.value);
const compareFrame=$('#compareFrame');
function compareFromPointer(e){const rect=compareFrame.getBoundingClientRect();setComparison((e.clientX-rect.left)/rect.width*100);}
compareFrame.addEventListener('pointerdown',e=>{if(e.button!==0)return;compareFrame.setPointerCapture(e.pointerId);compareFromPointer(e);});
compareFrame.addEventListener('pointermove',e=>{if(compareFrame.hasPointerCapture(e.pointerId))compareFromPointer(e);});
function releaseComparisonPointer(e){if(compareFrame.hasPointerCapture(e.pointerId))compareFrame.releasePointerCapture(e.pointerId);}
compareFrame.addEventListener('pointerup',releaseComparisonPointer);compareFrame.addEventListener('pointercancel',releaseComparisonPointer);
$('#zoomBtn').onclick=()=>openZoom();
$$('[data-observe]').forEach(b=>b.onclick=()=>openZoom(b.dataset.observe));
$$('[data-pan]').forEach(b=>b.onclick=()=>panScene(b.dataset.pan));
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
window.addEventListener('resize',()=>{
 cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(!$('#zoomDialog').open)return;const mount=$('#zoomMount'),svg=$('.room-svg',mount);if(!svg)return;const scale=svg.getBoundingClientRect().width/1536;positionZoom([(mount.scrollLeft+mount.clientWidth/2)/scale,(mount.scrollTop+mount.clientHeight/2)/scale],'auto');});
},{passive:true});
$$('[data-lab]').forEach(button=>button.onclick=()=>selectLab(button.dataset.lab));
$('#switchLabBtn').onclick=returnToLobby;renderLobby();updateDock();

function svgBadge(x,y,text,safe=true){return `<g transform="translate(${x} ${y})"><rect width="205" height="33" rx="5" fill="${safe?'#f2f5e8':'#fff0cf'}" stroke="${safe?'#839a72':'#ba9456'}"/><text x="103" y="22" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#425b43">${text}</text></g>`;}
function comparisonLabels(after,key){
 if(activeLab.id==='computer'&&(key==='all'||key==='server'))return svgBadge(1278,348,after?'已报告 · 待核验':'夜间运行 · 未登记',after);
 if(after&&activeLab.id==='electronics'&&(key==='all'||key==='cover'))return svgBadge(1140,430,'已停用 · 待专业检修');
 if(after&&activeLab.id==='mechanical'&&(key==='all'||key==='toolcable'))return svgBadge(1300,620,'已停用 · 待专业检修');
 return '';
}
