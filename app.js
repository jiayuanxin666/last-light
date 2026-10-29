'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = 'last-light-lab-v1';
const RELEASE = '20261028-release';
const POINTS = [
 {id:'drink',area:'操作台区域',title:'电脑旁的那杯饮料',tag:'01 / 操作台检查',story:'左侧第一排工位已经空了，一杯没带走的饮料还放在键盘旁。离开前，这个小细节值得留意。',prompt:'你会怎么处理这杯饮料？',options:['把饮料移到机箱上，给键盘腾出空间。','按实验室规定将饮料带离操作区，保持设备周边整洁、干燥。','只要今晚没人碰它，就可以留在这里。'],answer:1,explanation:'饮料倾倒可能造成设备损坏和用电风险。遵守实验室饮食管理要求，保持电气设备周边干燥；若已经洒到设备上，不要直接触碰带电设备，应立即报告。',short:'饮料带离操作区，设备周边保持干燥。',hint:'看看左侧第一排电脑桌，键盘旁有什么？'},
 {id:'exit',area:'通道与出口',title:'“明天再搬”的纸箱',tag:'02 / 疏散通道检查',story:'新设备的包装箱临时堆在中央通道。白天大家侧着身子就能走过去，但紧急情况下，这条通道还够畅通吗？',prompt:'面对通道中的纸箱，最合适的做法是？',options:['移到指定存放区域，保持出口和疏散通道畅通。','往门边挤一挤，只留一条侧身通过的缝。','贴上“注意绕行”，明天再搬。'],answer:0,explanation:'疏散通道和安全出口应保持畅通，临时存放也不能成为堵塞的理由。物品应移到规定区域；遇到较重或无法安全移动的物品，联系管理人员协助。',short:'物品归位，出口和疏散通道保持畅通。',hint:'从座位走向门口时，中央通道里的什么会挡住你？'},
 {id:'cable',area:'设备线缆',title:'被忽略的一处破损',tag:'03 / 线缆外观检查',story:'桌边的一根设备线缆外皮已经破损。有人说“还能用”，但能工作不代表没有风险。',prompt:'发现破损线缆后，你应该怎么做？',options:['用手摸一下，看看有没有发热。','自己用普通胶带缠好，继续使用。','停止使用相关设备，做好停用提示并报告，交由专业人员处理。'],answer:2,explanation:'发现破损线缆，应停止使用并报告，由专业人员检修或更换。不要触摸破损部位，也不要自行带电维修；需要断电时，应由具备条件的人员按规定安全操作。',short:'破损线缆停止使用，标记并报告检修。',hint:'低头看看左侧第一排工位下方，垂下的线缆有没有破损？'},
 {id:'power',area:'电源连接区',title:'插排后面，还是插排',tag:'04 / 用电检查',story:'地面上，一个插排接着另一个插排。为了多接几台设备，临时连接就这样一直留了下来。',prompt:'你认为应该如何处理？',options:['只要插头插得紧，就可以一直使用。','停止违规串接使用，报告管理人员核查负载与供电配置。','再接一个插排，就能分散负载。'],answer:1,explanation:'串接插排不会增加上游线路的承载能力，可能带来过载和接触不良风险。停止违规使用，按实验室要求由管理人员核查负载、插排额定参数和供电配置。',short:'避免违规串接，供电配置由管理人员核查。',hint:'观察右侧第一排工位下方的地面，顺着电线找一找。'},
 {id:'fire',area:'消防设施',title:'被推车挡住的灭火器',tag:'05 / 消防设施检查',story:'清洁推车停在墙边，看起来很整齐，却挡住了灭火器的取用位置。',prompt:'这辆推车应该放在哪里？',options:['移到指定位置，确保消防设施清晰可见、方便取用。','保持原位，大家知道灭火器在哪里就行。','把灭火器收进柜子，避免被推车碰到。'],answer:0,explanation:'消防设施应保持可见、可达、可用，周边不能堆放妨碍取用的物品。将推车移到指定位置；若发现器材缺失或异常，应报告管理人员。',short:'消防设施无遮挡，周边空间便于取用。',hint:'看看入口左侧，清洁推车是否挡住了消防器材？'},
 {id:'server',area:'夜间运行设备',title:'这一盏灯，需要留下',tag:'06 / 运行状态核验',story:'右侧第一排的一台计算设备仍亮着绿灯，旁边标有“夜间任务，已登记”。离开实验室，是否必须把它也关掉？',prompt:'对这台夜间运行的设备，你会怎么做？',options:['直接拔掉插头，关掉全部设备最安全。','有标签就不用再看，也不用核对。','核对批准记录、责任人和运行要求；确认正常后按规定保留运行，有疑问及时联系。'],answer:2,explanation:'离场检查不能一概而论。经批准连续运行的设备，应核验登记、责任人和规定的保障措施，保持必要运行条件；遇到异常或不明情况及时报告，不擅自改变运行状态。',short:'核验夜间运行登记，按规定保留必要设备。',hint:'右侧第一排工位上有一台亮着绿灯的主机，别忘了核验旁边的运行登记。'}
];
const SCENE_DETAILS = {
 drink:{crop:'327 389 280 187',pan:'left',label:'左侧第一排 · 操作台'},
 exit:{crop:'588 541 472 315',pan:'aisle',label:'中央通道 · 临时堆放'},
 cable:{crop:'354 548 248 222',pan:'left',label:'左侧第一排 · 桌边线缆'},
 power:{crop:'1036 708 450 300',pan:'right',label:'右侧第一排 · 地面电源'},
 fire:{crop:'32 210 420 650',pan:'left',label:'入口左侧 · 消防设施'},
 server:{crop:'1260 338 276 240',pan:'right',label:'右侧第一排 · 运行登记'}
};
const PAN_CENTERS={all:[768,512],left:[340,590],aisle:[806,677],right:[1280,640]};
const OUTCOMES={
 drink:['饮料已带离操作区','设备周边保持干燥，操作台恢复整洁。'],
 exit:['中央通道已清理','纸箱移至指定区域，离开时的通道恢复畅通。'],
 cable:['破损线缆已标记停用','交由专业人员检修，不能把“还能用”当作安全。'],
 power:['违规串接已停止','后续负载与供电配置交由管理人员核查。'],
 fire:['灭火器周围已清空','消防器材清晰可见，取用空间恢复畅通。'],
 server:['夜间运行登记已核验','按规定保留必要运行条件，避免擅自断电。']
};
const COMPARISONS={
 all:{name:'全景',crop:'0 0 1536 1024',before:'从临时堆放到顺手遗留的小物品',after:'五处隐患完成处置，一项运行状态完成核验。'},
 drink:{name:'操作台',crop:'300 360 400 267',before:'键盘旁遗留饮料',after:'饮料带离操作区，保持设备周边干燥。'},
 exit:{name:'通道',crop:'570 530 530 353',before:'纸箱占用中央通道',after:'物品归位，通道恢复畅通。'},
 cable:{name:'线缆',crop:'340 550 270 180',before:'设备线缆外皮破损',after:'设备停止使用并标记，等待专业人员检修。'},
 power:{name:'电源',crop:'1000 690 500 333',before:'插排违规串接',after:'停止串接使用，由管理人员核查供电配置。'},
 fire:{name:'消防',crop:'10 235 600 400',split:24,before:'清洁推车妨碍取用灭火器',after:'移走推车，保证器材可见、可达。'},
 server:{name:'运行设备',crop:'1190 330 345 230',before:'设备亮着绿灯，需要核对登记',after:'核验后保留批准运行；前后画面不变，是正确处置的一部分。'}
};

let state = {started:false,answers:{},firstChoices:{},hints:0,finished:false};
let sceneReady=false, toastTimer, hintTimer, finishTimer, currentId=null;
let zoomScale=1, lastCompletedId=null, sceneLoadAttempt=0, sceneController=null, resizeFrame=0, storageAvailable=true, sceneLoadFailed=false;
try {
 const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
 if(saved && typeof saved.started==='boolean' && saved.answers && typeof saved.answers==='object') {
  state.started=saved.started;
  for(const p of POINTS) { const a=saved.answers[p.id]; if(a && Number.isInteger(a.choice) && a.choice>=0 && a.choice<3) state.answers[p.id]={choice:a.choice,correct:a.choice===p.answer}; }
  for(const p of POINTS){const c=saved.firstChoices?.[p.id];if(Number.isInteger(c)&&c>=0&&c<3)state.firstChoices[p.id]=c;}
  state.hints=Number.isInteger(saved.hints)&&saved.hints>=0?saved.hints:0;
  state.finished=!!saved.finished&&Object.keys(state.answers).length===6;
 }
} catch {storageAvailable=false;}
if(Object.keys(state.answers).length||Object.keys(state.firstChoices).length)state.started=true;
const count=()=>Object.keys(state.answers).length;
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}$('#storageNote').hidden=storageAvailable;}
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
   fetch(`scene.svg?v=${RELEASE}`,{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('scene load');return response.text();}),
   preloadSceneImage('assets/lab-before.webp'),preloadSceneImage('assets/lab-after.webp')
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
 $('#questionContent').innerHTML=`<div class="dialog-eyebrow">THE LAST LIGHT / 离场巡查</div><div class="question-kicker">✧ ${p.tag}</div><h2 id="questionTitle">${p.title}</h2><p class="question-story">${p.story}</p><div class="inspection-detail"><svg viewBox="${SCENE_DETAILS[id].crop}" role="img" aria-label="${SCENE_DETAILS[id].label}观察特写"><image href="assets/lab-before.webp" width="1536" height="1024"/></svg><span>${answered?'检查前 · ':''}${SCENE_DETAILS[id].label}</span></div><div class="question-prompt">${p.prompt}</div><div class="choices">${p.options.map((option,i)=>`<button class="choice" data-choice="${i}"><span>${'ABC'[i]}</span><span>${option}</span></button>`).join('')}</div><div id="answerFeedback" aria-live="polite"></div>`;
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
 $('#infoContent').innerHTML='<div class="dialog-eyebrow">ONE LAST CHECK</div><h2 id="infoTitle">最后，确认一下。</h2><p>普通设备已按规定结束使用；获准夜间运行的设备已完成核验，保持必要的供电和运行条件。</p><div class="info-callout"><p style="margin:0">在真实实验室，还需按本室清单完成相应检查与交接。这里的“关灯离开”，表示完成本次模拟巡查。</p></div><button class="primary-btn" id="confirmFinish">确认完成，关灯离开 <span>↗</span></button>';
 $('#infoDialog').showModal();$('#confirmFinish').onclick=()=>{$('#infoDialog').close();state.finished=true;update();$('#sceneViewport').scrollIntoView({behavior:'auto',block:'center'});clearTimeout(finishTimer);finishTimer=setTimeout(()=>state.finished&&showReport(),1500);};
}
function showReport(){
 clearTimeout(finishTimer);
 const missed=POINTS.filter(p=>!state.answers[p.id]?.correct);
 const reviewMarkup=missed.length?`<section class="review-focus" aria-label="需要复习的细节"><h3>${missed.length} 处细节，值得再记一次</h3><p>首次判断的记录会保留。点开回顾，把正确做法带走。</p><ul>${missed.map(p=>`<li><div><strong>${p.area}</strong><button data-report-review="${p.id}" aria-label="复习${p.area}的正确做法">回顾正确做法 ↗</button></div><p>${p.short}</p></li>`).join('')}</ul></section>`:`<section class="review-focus all-correct"><h3>六项判断，都留意到了。</h3><p>把这份细致带进下一次实验，离开前继续多看一眼。</p></section>`;
 const correct=POINTS.filter(p=>state.answers[p.id]?.correct).length;
 $('#reportContent').innerHTML=`<div class="report-top"><div class="report-stamp">✓</div><div class="dialog-eyebrow">A CAREFUL GOODBYE</div><h2 id="reportTitle">谢谢你，最后的守护者。</h2><p>最后一盏灯熄灭了，安心留在实验室里。</p></div><div class="report-stats"><div><strong>6<small> / 6</small></strong>完成检查</div><div><strong>${correct}<small> / 6</small></strong>首次判断正确</div><div><strong>${state.hints}</strong>使用提示</div></div>${reviewMarkup}<p class="report-list-hint">点击检查项，可查看这处场景的前后变化。</p><ul class="report-list">${POINTS.map(p=>`<li><h3><button class="report-area-link" data-report-compare="${p.id}" aria-label="查看${p.area}前后变化">${p.area} ↗</button><span class="${state.answers[p.id]?.correct?'first':''}">${state.answers[p.id]?.correct?'首次判断正确':'已学习正确做法'}</span></h3><p>${p.short}</p></li>`).join('')}</ul><button class="report-compare" id="reportCompareBtn">查看巡查前后对比 ↔</button><div class="report-actions"><button class="primary-btn" id="downloadBtn">保存我的检查卡 ↓</button><button class="secondary-btn" id="replayBtn">再巡查一次 ↻</button></div><p class="report-footnote">这是一份学习记录，不是安全资质或真实检查证明。<br>把今天记住的细节，带进明天的实验室。</p>`;
 $$('[data-report-review]').forEach(button=>button.onclick=()=>openQuestion(button.dataset.reportReview));$$('[data-report-compare]').forEach(button=>button.onclick=()=>openComparison(button.dataset.reportCompare));
 $('#reportCompareBtn').onclick=openComparison;$('#downloadBtn').onclick=downloadCard;$('#replayBtn').onclick=()=>{$('#reportDialog').close();reset(true);};
 if(!$('#reportDialog').open)$('#reportDialog').showModal();
}
function downloadCard(){
 const correct=POINTS.filter(p=>state.answers[p.id]?.correct).length;
 const rows=POINTS.map((p,i)=>`<circle cx="82" cy="${385+i*65}" r="11" fill="#dce6cd"/><path d="M77 ${385+i*65}l4 4 6-8" fill="none" stroke="#658451" stroke-width="2"/><text x="108" y="${389+i*65}" fill="#4b6342" font-size="17">${p.area}</text><text x="108" y="${411+i*65}" fill="#839174" font-size="12">${p.short}</text>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="980" viewBox="0 0 640 980"><rect width="640" height="980" fill="#f4f3eb"/><rect x="28" y="28" width="584" height="924" rx="16" fill="#fafbf3" stroke="#d6ddc8"/><g font-family="PingFang SC,Microsoft YaHei,sans-serif"><text x="320" y="99" text-anchor="middle" fill="#82916f" font-size="12" letter-spacing="4">THE LAST LIGHT</text><text x="320" y="162" text-anchor="middle" fill="#35533f" font-size="30">最后一个离开实验室的人</text><text x="320" y="202" text-anchor="middle" fill="#82916f" font-size="16">我的离场检查卡</text><path d="M65 235h510" stroke="#d7deca"/><text x="200" y="294" text-anchor="middle" font-size="37" fill="#45623c">6 / 6</text><text x="200" y="323" text-anchor="middle" font-size="13" fill="#899579">完成检查</text><text x="440" y="294" text-anchor="middle" font-size="37" fill="#45623c">${correct} / 6</text><text x="440" y="323" text-anchor="middle" font-size="13" fill="#899579">首次判断正确</text>${rows}<path d="M65 806h510" stroke="#d7deca"/><text x="320" y="849" text-anchor="middle" fill="#5d754e" font-size="19">今晚，把平安留给明天。</text><text x="320" y="885" text-anchor="middle" fill="#95a087" font-size="11">实验室安全互动学习记录 · 非安全资质或真实检查证明</text></g></svg>`;
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});const svgUrl=URL.createObjectURL(blob);const img=new Image();
 const fallback=()=>{downloadBlob(blob,'最后一盏灯-检查卡.svg');URL.revokeObjectURL(svgUrl);};
 img.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=1960;const ctx=canvas.getContext('2d');if(!ctx){fallback();return;}ctx.drawImage(img,0,0,1280,1960);canvas.toBlob(png=>{if(png){downloadBlob(png,'最后一盏灯-检查卡.png');URL.revokeObjectURL(svgUrl);}else fallback();},'image/png');}catch{fallback();}};
 img.onerror=fallback;img.src=svgUrl;
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('检查卡已生成，请在浏览器下载中查看。');}
function reset(direct=false){
 const execute=()=>{clearTimeout(finishTimer);clearTimeout(hintTimer);lastCompletedId=null;state={started:false,answers:{},firstChoices:{},hints:0,finished:false};$$('dialog[open]').forEach(d=>d.close());$$('.hinted').forEach(e=>e.classList.remove('hinted'));update();$('#sceneViewport').scrollIntoView({behavior:'auto',block:'center'});toast('新的一晚，重新出发。');};
 if(direct||(!count()&&!Object.keys(state.firstChoices).length)){execute();return;}
 $('#infoContent').innerHTML='<div class="dialog-eyebrow">START AGAIN</div><h2 id="infoTitle">重新开始今晚的巡查？</h2><p>本次检查进度和首次判断记录将清空，你可以重新观察、选择。</p><button class="primary-btn" id="confirmReset">重新开始 <span>↻</span></button><button class="hint-btn" id="cancelReset">保留进度，继续检查</button>';
 $('#infoDialog').showModal();$('#confirmReset').onclick=execute;$('#cancelReset').onclick=()=>$('#infoDialog').close();
}
function showInfo(){
 $('#infoContent').innerHTML='<div class="dialog-eyebrow">ABOUT THE LAST LIGHT</div><h2 id="infoTitle">一场认真的告别。</h2><p>《最后一个离开实验室的人》是一份实验室安全互动作品。你是今晚最后离开的同学，用一次细致的巡查，为明天留下一份安心。</p><ol><li>点击“开始今晚的巡查”，观察场景中的物品。</li><li>点击检查点，选择你认为合适的处理方式。</li><li>阅读反馈并完成检查，场景会随之变化。</li><li>完成 6 项后关灯离开，回顾并保存检查卡。</li></ol><div class="info-callout"><p style="margin:0">找不到时可以使用提示，也可以点击“局部观察”或检查清单中的区域名称。放大场景支持滑动与倍率调整。完成全部检查后，还能拖动分界线查看巡查前后对比。首次判断计入报告，但不限制重玩。进度只保存在当前浏览器中。</p></div><p>场景图片由 AI 生成，房间编号和事件均为虚构教学示意，不对应真实实验室。具体管理与处置要求以所在实验室规定为准。</p><button class="primary-btn" id="closeInfo">我知道了 <span>↗</span></button>';
 $('#infoDialog').showModal();$('#closeInfo').onclick=()=>$('#infoDialog').close();
}
$('#startBtn').onclick=start;$('#mobileStartBtn').onclick=start;$('#hintBtn').onclick=hint;$('#finishBtn').onclick=finish;$('#reportBtn').onclick=showReport;$('#resetBtn').onclick=()=>reset();$('#helpBtn').onclick=showInfo;$('#aboutBtn').onclick=showInfo;
function updateDock(){
 const n=count();
 $('#dockCaption').textContent=state.started?'离场检查 · A-302':'今晚，把平安留给明天';
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
 $$('.compare-scene').forEach((svg,index)=>{svg.setAttribute('viewBox',item.crop);svg.setAttribute('aria-label',`${item.name} · ${index?'巡查后':'巡查前'}`);});
 $('#compareContext').innerHTML=`<strong>${item.before}</strong> → ${item.after}`;
 const tag=$('.compare-cable-tag');tag.hidden=key!=='all'&&key!=='cable';
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
update();loadScene();
