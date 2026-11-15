/* Статика: персональный тренажёр без сторонних JS-зависимостей.
 * Сессии работают без сети. Supabase Auth + PostgREST включаются после настройки.
 */
const VERSION = '2.3.0-rc4';
const $ = (s, root = document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = (n, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(n)) ? Number(n) : min));
const uid = () => {
 if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
 const bytes = crypto.getRandomValues(new Uint8Array(16));
 bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
 const h = [...bytes].map(x => x.toString(16).padStart(2,'0')).join('');
 return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
};
const now = () => new Date().toISOString();
const fmtDate = x => new Date(x).toLocaleDateString('ru-RU', {day:'numeric',month:'short',year:'numeric'});
const safeRead = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { toast('Браузер не разрешает сохранение данных. Проверь настройки.'); return false; } };

const LIB = {
 hang: {name:'Активный вис',kind:'hold',instruction:'Ухватись за надёжно закреплённый турник. Мягко опусти плечи от ушей, напряги мышцы спины, локти оставь прямыми. Не раскачивайся, дыши ровно.',cue:'Плечи вдали от ушей; хват без боли.',fallback:'Сократи удержание до 5 секунд или выполняй с частичной опорой ног, если турник допускает это безопасно.'},
 plank: {name:'Планка на предплечьях',kind:'hold',instruction:'Локти под плечами. Сохраняй длинную линию от макушки до пяток. Слегка напряги ягодицы и живот, продолжай дышать.',cue:'Без прогиба в пояснице.',fallback:'Опусти колени на пол или сократи удержание.'},
 wall: {name:'Стульчик у стены',kind:'hold',instruction:'Прижми спину к стене, выведи стопы вперёд и согни колени до комфортной глубины. Не обязательно опускать бёдра горизонтально.',cue:'Колени направлены по линии стоп.',fallback:'Уменьши глубину приседа или время удержания.'},
 bridge: {name:'Ягодичный мост',kind:'hold',instruction:'Ляг на спину, стопы на полу, колени согнуты. Подними таз до ровной линии от плеч к коленям, не переразгибая поясницу.',cue:'Основное усилие — ягодицы.',fallback:'Поднимай таз ниже и удерживай меньше.'},
 push: {name:'Отжимания',kind:'reps',instruction:'Ладони чуть шире плеч, корпус устойчив. Плавно опускайся и поднимайся без рывков. Двигайся в комфортной амплитуде.',cue:'Локти не разводи строго в стороны.',fallback:'Отжимайся от стены или устойчивой столешницы, если обычный вариант сложен.'},
 scap: {name:'Движения лопатками в висе',kind:'reps',instruction:'Повисни на перекладине. Не сгибая рук, слегка опусти и сведи лопатки, поднимая тело на несколько сантиметров; затем расслабь до исходного положения.',cue:'Маленькая, контролируемая амплитуда.',fallback:'Сделай меньше повторений или используй частичную опору ног при подходящей конструкции турника.'},
 side: {name:'Боковая планка с колен',kind:'hold',sides:2,instruction:'Ляг на бок, предплечье под плечом, колени согнуты. Подними таз, удерживая плечо, таз и колени на одной линии. Повтори на другую сторону.',cue:'Не проваливай плечо.',fallback:'Поднимай таз на меньшую высоту или сократи время.'},
 high: {name:'Высокая планка',kind:'hold',instruction:'Ладони под плечами, ноги выпрямлены, корпус ровный. Не переноси вес чрезмерно на запястья и не опускай поясницу.',cue:'Тело стабильно, дыхание ровное.',fallback:'Сделай планку от стены или с колен.'},
 lunge: {name:'Статический выпад',kind:'hold',sides:2,instruction:'Поставь одну ногу впереди другой, опустись в неглубокий выпад и удерживай. Спина ровная, обе стопы устойчивы. Поменяй ноги.',cue:'Колено направлено в сторону носка.',fallback:'Держись одной рукой за стену и не опускайся глубоко.'},
 deadbug: {name:'Dead Bug — удержание',kind:'hold',sides:2,instruction:'Ляг на спину, подними согнутые ноги и руки. Медленно вытяни противоположные руку и ногу до комфортной амплитуды, удерживай без прогиба поясницы.',cue:'Поясница не выгибается.',fallback:'Оставь ногу ближе к корпусу.'},
 leglift: {name:'Подъём стопы сидя',kind:'hold',sides:2,instruction:'Сядь с вытянутыми ногами, ладони у бёдер. Не заваливаясь назад, подними одну стопу на несколько сантиметров и удерживай; затем другую.',cue:'Работай на небольшой высоте.',fallback:'Слегка согни колено или сократи удержание.'},
 tuck: {name:'Подъём согнутых коленей сидя',kind:'hold',instruction:'Сядь на пол с согнутыми ногами, поставь ладони рядом с бёдрами. Слегка приподними стопы за счёт мышц живота, опираясь на ягодицы. Не нужно поднимать таз.',cue:'Без раскачивания и боли в пояснице.',fallback:'Поднимай одну стопу за раз.'},
 hollow: {name:'Облегчённый hollow hold',kind:'hold',instruction:'Ляг на спину, прижми поясницу к полу, подними голову и плечи на небольшую высоту, колени держи согнутыми над тазом. Дыши спокойно.',cue:'Не выгибай поясницу.',fallback:'Оставь голову на полу и удерживай только положение ног.'},
 support: {name:'Активный упор сидя',kind:'hold',instruction:'Сядь на пол, ладони у бёдер. Отталкивайся руками от пола, слегка разгружая таз. Пятки могут оставаться на полу. Плечи опущены.',cue:'Не требуется отрывать всё тело.',fallback:'Сохраняй только лёгкое давление ладонями в пол.'},
 knee: {name:'Контролируемый подъём коленей в висе',kind:'reps',instruction:'Сначала зафиксируй активный вис. Медленно согни колени и слегка подними их вперёд, затем так же медленно опусти. Без раскачивания.',cue:'Небольшая амплитуда допустима.',fallback:'Останься на активном висе или упражнении Dead Bug.'},
 shortside: {name:'Боковая планка',kind:'hold',sides:2,instruction:'Упрись предплечьем в пол под плечом, выпрями ноги и подними таз, удерживая прямую линию тела. Повтори на другой бок.',cue:'Локоть строго под плечом.',fallback:'Вернись к варианту с согнутыми коленями.'},
 balance: {name:'Баланс на одной ноге',kind:'hold',sides:2,instruction:'Встань рядом со стеной, перенеси вес на одну стопу, слегка приподними вторую. Смотри перед собой, не задерживай дыхание.',cue:'Стена рядом на случай потери равновесия.',fallback:'Касайся стены пальцами или держи вторую стопу близко к полу.'}
};

const DAYS = [
 {title:'Опора и корпус',subtitle:'Плечевой пояс · корпус · ноги',items:[['hang',10,2],['plank',20,2],['wall',20,2],['bridge',20,2],['push',8,2]]},
 {title:'Устойчивость и контроль',subtitle:'Лопатки · баланс · стабилизация',items:[['scap',5,2],['side',15,2],['high',20,2],['lunge',15,2],['deadbug',10,2]]},
 {title:'Закрепление техники',subtitle:'Повторение · подготовка к уголку',items:[['hang',12,2],['plank',25,2],['wall',25,2],['leglift',8,2],['push',8,2],['bridge',20,2]]}
];
const PHASES = [
 {from:1,to:2,label:'Фундамент',sub:'Техника и комфортные удержания'},
 {from:3,to:4,label:'Контроль',sub:'Стабильность корпуса и лопаток'},
 {from:5,to:6,label:'Подготовка к уголку',sub:'Упоры, сгибатели бедра и корпус'},
 {from:7,to:8,label:'Статическая сила',sub:'Короткие специальные удержания'},
 {from:9,to:10,label:'Координация',sub:'Баланс и усложнение без спешки'},
 {from:11,to:12,label:'Закрепление',sub:'Оценка техники и самостоятельность'}
];
function plan(week, day) {
 const phase = PHASES.find(p => week >= p.from && week <= p.to);
 let rows = DAYS[day-1].items.map(([id,target,sets]) => ({id,target,sets}));
 if (week >= 3) rows = rows.map((x,i) => ({...x, sets:i < 3 ? 3 : 2}));
 if (week >= 5) {
   if (day===1) rows[2] = {id:'hollow',target:12,sets:2};
   if (day===2) rows[3] = {id:'balance',target:15,sets:2};
   if (day===3) rows[3] = {id:'support',target:12,sets:2};
 }
 if (week >= 7) {
   if (day===1) rows[4] = {id:'tuck',target:10,sets:2};
   if (day===2) rows[1] = {id:'shortside',target:12,sets:2};
   if (day===3) rows[0] = {id:'knee',target:5,sets:2};
 }
 if (week >= 9) {
   if (day===1) rows[4] = {id:'support',target:15,sets:3};
   if (day===2) rows[4] = {id:'hollow',target:15,sets:2};
   if (day===3) rows[3] = {id:'tuck',target:12,sets:2};
 }
 const step = Math.floor((week-1)/2); // постепенный прирост, один раз за две недели
 const isSecond = week % 2 === 0;
 rows = rows.map(x => {
   const kind = LIB[x.id].kind;
   let target = x.target + (kind==='hold' ? Math.min(8,step*2) + (isSecond?2:0) : Math.min(2,Math.floor(step/2)));
   return {...x,target: Math.round(target), kind, sides: LIB[x.id].sides || 1};
 });
 return {week,day,title:DAYS[day-1].title,subtitle:DAYS[day-1].subtitle,phase,items:rows};
}
function countSlots(ex){return ex.sets*ex.sides;}
function slotLabel(ex,i){return ex.sides===2 ? `Подход ${Math.floor(i/2)+1} · ${i%2===0?'левая':'правая'} сторона` : `Подход ${i+1}`;}
function amountLabel(ex) {return `${ex.sets} × ${ex.target} ${ex.kind==='hold'?'сек':'повт'}${ex.sides===2?' / сторона':''}`;}
function sessionsKey(){return `statika.sessions.${state.user?.id || 'guest'}.v1`;}
function pendingKey(){return `statika.pending.${state.user?.id || 'guest'}.v1`;}
function loadSaved(){state.sessions=safeRead(sessionsKey(),[]).filter(validSession);state.pending=new Set(safeRead(pendingKey(),[]));}
function persist(){safeWrite(sessionsKey(),state.sessions);safeWrite(pendingKey(),[...state.pending]);}
function validSession(s){return !!s && /^[0-9a-f-]{36}$/i.test(s.id || '') && Number.isInteger(s.week) && s.week>=1 && s.week<=12 && Number.isInteger(s.day) && s.day>=1 && s.day<=3 && typeof s.sets==='object' && !Array.isArray(s.sets);}
function findFor(week,day){return state.sessions.filter(s=>s.week===week && s.day===day).sort((a,b)=>new Date(b.performed_at)-new Date(a.performed_at));}
function progress(s){const p=plan(s.week,s.day);let total=0,done=0;for(const ex of p.items){total+=countSlots(ex);done+=(s.sets[ex.id]||[]).filter(v=>typeof v==='number' && v>0).length;}return {done,total,pct:Math.round(done/total*100)};}
function completedWeeks(){let n=0;for(let w=1;w<=12;w++){if([1,2,3].every(d=>findFor(w,d).some(s=>s.completed))) n++; else break;}return n;}
function nextWeek(){return Math.min(12, completedWeeks()+1);}

const BUILTIN = window.STATICFIT_CONFIG || {};
const config = safeRead('statika.config.v1',{});
const state = {screen:'home',week:1,day:1,user:null,auth:null,sessions:[],pending:new Set(),activeId:null,exerciseIndex:0,slotIndex:0,
 timer:null,timerInterval:null,timerOutput:null, syncBusy:false, syncStatus:'local', authMode:'login', error:'', message:'', isOnline:navigator.onLine,
 recovery:false,settings:{supabaseUrl:config.supabaseUrl || BUILTIN.supabaseUrl || '', supabasePublishableKey:config.supabasePublishableKey || BUILTIN.supabasePublishableKey || ''}
};
let syncLater = null;
function configured(){return /^https:\/\/[a-z0-9.-]+\/?$/i.test(state.settings.supabaseUrl.trim()) && /^sb_publishable_[a-zA-Z0-9_\-]+$/.test(state.settings.supabasePublishableKey.trim());}
function base(){return state.settings.supabaseUrl.trim().replace(/\/$/,'');}
function apiHeaders(jwt){return {'apikey':state.settings.supabasePublishableKey,'Content-Type':'application/json',...(jwt?{'Authorization':`Bearer ${jwt}`}:{})};}
function toast(message){const el=$('#toast');if(!el) return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),4000);}
function setAuth(value){
 state.auth=value;state.user=value?.user || null;
 if(value) safeWrite('statika.auth.v1',value); else localStorage.removeItem('statika.auth.v1');
 loadSaved();
}
async function request(path,{method='GET',body=null,jwt=null,extra={}}={}){
 const res=await fetch(base()+path,{method,headers:{...apiHeaders(jwt),...extra},...(body!==null?{body:JSON.stringify(body)}:{}),cache:'no-store'});
 const data=res.status===204?null:await res.json().catch(()=>null);
 if(!res.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || `HTTP ${res.status}`);
 return data;
}
let refreshing = null;
async function token(){
 if(!state.auth) throw new Error('Не выполнен вход');
 if(Date.now() < (state.auth.expires_at || 0)-90000) return state.auth.access_token;
 if(refreshing) return refreshing;
 refreshing = (async()=>{
   const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:state.auth.refresh_token}});
   state.auth={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+data.expires_in*1000,user:data.user};
   state.user=data.user; safeWrite('statika.auth.v1',state.auth);
   return state.auth.access_token;
 })();
 try{return await refreshing;}finally{refreshing=null;}
}
async function login(email,password){
 if(!configured())throw new Error('Сначала подключите облачную базу в настройках');
 const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
 setAuth({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+data.expires_in*1000,user:data.user});
 state.syncStatus='pending';await sync();navigate('home');toast('Вход выполнен. Дневник синхронизируется.');
}
async function signup(email,password){
 if(!configured())throw new Error('Сначала подключите облачную базу в настройках');
 const data=await request('/auth/v1/signup',{method:'POST',body:{email,password}});
 if(data.access_token && data.refresh_token){setAuth({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+data.expires_in*1000,user:data.user});await sync();navigate('home');}
 else toast('Проверьте почту и подтвердите регистрацию, затем войдите.');
}
async function logout(){
 try {if(navigator.onLine && state.auth)await request('/auth/v1/logout',{method:'POST',jwt:await token()});}catch{}
 stopTimer();setAuth(null);state.activeId=null;state.syncStatus='local';navigate('account');toast('Вы вышли. Локальные записи аккаунта сохранены на этом устройстве.');
}
async function sync(){
 if(!state.user || !configured() || !navigator.onLine){state.syncStatus=state.user?'pending':'local';updateSyncTag();return;}
 if(state.syncBusy)return;
 state.syncBusy=true;state.syncStatus='working';updateSyncTag();
 try{
   const jwt=await token();
   // Сначала отправляем локальные изменения, затем получаем удалённые: офлайн-правки не затираются.
   const uploads=state.sessions.filter(s=>state.pending.has(s.id));
   for(const item of uploads){
     const stamp=item.updated_at;
     await request('/rest/v1/workout_sessions?on_conflict=id',{method:'POST',jwt,body:[{...item,user_id:state.user.id}],extra:{Prefer:'resolution=merge-duplicates,return=minimal'}});
     const live=state.sessions.find(s=>s.id===item.id);
     if(live && live.updated_at===stamp)state.pending.delete(item.id);
   }
   const remote=await request('/rest/v1/workout_sessions?select=*&order=updated_at.desc&limit=1000',{jwt});
   const byId=new Map(state.sessions.map(s=>[s.id,s]));
   for(const r of remote||[]){if(validSession(r) && !state.pending.has(r.id))byId.set(r.id,r);}
   state.sessions=[...byId.values()];persist();
   state.syncStatus=state.pending.size?'pending':'synced';
 }catch(err){state.syncStatus='error';toast('Не удалось синхронизировать: '+err.message);}
 finally{state.syncBusy=false;updateSyncTag();if(state.pending.size && state.syncStatus==='pending')setTimeout(()=>sync(),1200);}
}
function queueSync(){
 persist();if(!state.user)return;
 state.syncStatus='pending';updateSyncTag();clearTimeout(syncLater);syncLater=setTimeout(()=>sync(),600);
}
function touchSession(s){s.updated_at=now();state.pending.add(s.id);queueSync();}
function initSession(week,day){
 const old=findFor(week,day).find(s=>!s.completed);
 const s=old || {id:uid(),user_id:state.user?.id || null,week,day,performed_at:now(),updated_at:now(),completed:false,mood:'',notes:'',sets:{}};
 if(!old){state.sessions.unshift(s);touchSession(s);}
 state.activeId=s.id;state.exerciseIndex=0;state.slotIndex=0;
 const p=plan(week,day);
 outer:for(let i=0;i<p.items.length;i++)for(let j=0;j<countSlots(p.items[i]);j++){
   if(!((s.sets[p.items[i].id]||[])[j]>0)){state.exerciseIndex=i;state.slotIndex=j;break outer;}
 }
 stopTimer();navigate('workout');
}
function currentSession(){return state.sessions.find(s=>s.id===state.activeId) || null;}
function markSet(actual){
 const s=currentSession();if(!s)return;
 const p=plan(s.week,s.day);const e=p.items[state.exerciseIndex];
 if(!e)return;
 const val=Math.round(num(actual,1,e.kind==='hold'?300:100));
 const arr=Array.isArray(s.sets[e.id])?[...s.sets[e.id]]:[];
 arr[state.slotIndex]=val;s.sets[e.id]=arr;touchSession(s);
 stopTimer();
 let found=false;
 for(let i=state.exerciseIndex;i<p.items.length&&!found;i++){
   for(let j=(i===state.exerciseIndex?state.slotIndex+1:0);j<countSlots(p.items[i]);j++){
     if(!((s.sets[p.items[i].id]||[])[j]>0)){state.exerciseIndex=i;state.slotIndex=j;found=true;break;}
   }
 }
 if(!found){
   for(let i=0;i<p.items.length&&!found;i++)for(let j=0;j<countSlots(p.items[i]);j++){
     if(!((s.sets[p.items[i].id]||[])[j]>0)){state.exerciseIndex=i;state.slotIndex=j;found=true;break;}
   }
 }
 render();
 if(!found)toast('Все подходы записаны. Заверши тренировку, чтобы сохранить итог.');
}
function finishWorkout(){
 const s=currentSession();if(!s)return;
 const prog=progress(s);
 if(prog.done===0){toast('Сначала запишите хотя бы один подход.');return;}
 if(prog.done<prog.total && !confirm(`Записано ${prog.done} из ${prog.total} подходов. Завершить тренировку с пропущенными подходами?`))return;
 s.completed=true;touchSession(s);stopTimer();state.activeId=null;navigate('history');toast('Тренировка сохранена в дневнике.');
}
function saveSessionField(field,value){const s=currentSession();if(!s)return; if(field==='notes')s.notes=value.slice(0,4000);if(field==='mood')s.mood=['','easy','normal','hard'].includes(value)?value:'';touchSession(s);}
function editSet(exIndex,setIndex){state.exerciseIndex=exIndex;state.slotIndex=setIndex;stopTimer();render();}

function stopTimer(){if(state.timerInterval)clearInterval(state.timerInterval);state.timerInterval=null;state.timer=null;}
function playSound(){try{const ctx=new (window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type='sine';osc.frequency.value=770;gain.gain.setValueAtTime(0.09,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+0.25);setTimeout(()=>ctx.close(),600);}catch{}}
function timerDisplay(){
 const t=state.timer;if(!t)return;
 const el=$('#timer-seconds');const btn=$('#timer-toggle');
 if(el)el.textContent=String(Math.ceil(t.remaining));
 if(btn)btn.textContent=t.running?'Пауза':'Продолжить';
}
function timerTick(){
 const t=state.timer;if(!t||!t.running)return;
 t.remaining=Math.max(0,(t.deadline-Date.now())/1000);timerDisplay();
 if(t.remaining<=0){
   const mode=t.mode;const ex=mode==='hold'?plan(currentSession().week,currentSession().day).items[state.exerciseIndex]:null;
   if(t.running){playSound();if(navigator.vibrate)navigator.vibrate(80);}
   stopTimer();
   if(mode==='hold' && ex)markSet(ex.target);
   else {render();toast('Отдых завершён. Можно продолжать.');}
 }
}
function startTimer(mode){
 if(!currentSession())return;
 const ex=plan(currentSession().week,currentSession().day).items[state.exerciseIndex];
 if(mode==='hold' && ex.kind!=='hold')return;
 stopTimer();
 const duration=mode==='rest'?60:ex.target;
 state.timer={mode, duration, remaining:duration,deadline:Date.now()+duration*1000,running:true};
 state.timerInterval=setInterval(timerTick,150);render();
}
function pauseResumeTimer(){
 const t=state.timer;if(!t)return;
 if(t.running){t.remaining=Math.max(0,(t.deadline-Date.now())/1000);t.running=false;}
 else {t.deadline=Date.now()+t.remaining*1000;t.running=true;}
 timerDisplay();
}

function syncBadge(){
 if(!state.user)return {text:'На этом устройстве',cls:'local'};
 if(!navigator.onLine)return {text:'Без интернета',cls:'warn'};
 if(state.user&&!navigator.onLine)return {text:'Нет сети · сохранено локально',cls:'warn'};
 return ({synced:{text:'Облако синхронизировано',cls:'good'},working:{text:'Синхронизация…',cls:'warn'},pending:{text:'Ожидает синхронизации',cls:'warn'},error:{text:'Ошибка синхронизации',cls:'bad'}})[state.syncStatus] || {text:'Ожидает синхронизации',cls:'warn'};
}
function updateSyncTag(){const e=$('#sync-status');if(e){const v=syncBadge();e.className=`sync-pill ${v.cls}`;e.textContent=v.text;}}
function icon(name){return {home:'⌂',plan:'▦',history:'▥',account:'◉'}[name];}
function shell(content){
 const nav=[['home','Сегодня'],['plan','Программа'],['history','Дневник'],['account','Аккаунт']];
 return `<div class="app-shell"><header class="topbar"><button class="brand" data-nav="home" aria-label="На главную"><span class="brand-mark">◇</span><span>СТАТИКА</span></button><button class="top-profile" data-nav="account" title="Настройки аккаунта"><span id="sync-status" class="sync-pill ${syncBadge().cls}">${syncBadge().text}</span><span class="avatar">${state.user?'✓':'◌'}</span></button></header><main id="main" class="main">${content}</main><nav class="bottom-nav" aria-label="Разделы">${nav.map(([id,label])=>`<button data-nav="${id}" class="nav-link ${state.screen===id || (state.screen==='workout' && id==='home')?'active':''}" aria-current="${state.screen===id?'page':'false'}"><span class="nav-glyph">${icon(id)}</span><span>${label}</span></button>`).join('')}</nav></div>`;
}
function heading(eyebrow,title,desc=''){return `<div class="heading"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${desc?`<p class="muted">${desc}</p>`:''}</div>`;}
function home(){
 const full=state.sessions.filter(s=>s.completed).length;const uniqueDone=new Set(state.sessions.filter(s=>s.completed).map(s=>`${s.week}:${s.day}`)).size;const w=nextWeek();const done=completedWeeks();
 const days=[1,2,3].map(d=>{
   const p=plan(w,d);const s=findFor(w,d)[0];const status=s?.completed?'Завершено':s?'Продолжить':'Начать';
   return `<button class="day-card" data-start="${w}:${d}"><div class="day-num">0${d}</div><div class="day-info"><strong>${esc(p.title)}</strong><span>${esc(p.subtitle)}</span><div class="day-meta">${p.items.length} упражнений · ~25–35 мин</div></div><span class="state-label ${s?.completed?'finished':''}">${status} <b>→</b></span></button>`;
 }).join('');
 const latest=state.sessions.filter(s=>s.completed).sort((a,b)=>new Date(b.performed_at)-new Date(a.performed_at))[0];
 return `${heading('МОЯ ТРЕНИРОВОЧНАЯ ПРОГРАММА','Сильнее. Спокойнее. Точнее.','12 недель постепенного развития статической силы и контроля тела.')}
 <section class="hero"><div class="hero-tag">ТЕКУЩИЙ ЭТАП</div><h2>${done===12?'Курс пройден':'Неделя '+w+' <span>/ 12</span>'}</h2><div class="hero-sub">${esc(PHASES.find(p=>w>=p.from&&w<=p.to).label)} · 3 тренировки в неделю</div><div class="meter"><span style="width:${Math.round(done/12*100)}%"></span></div><div class="hero-footer"><span>${done} из 12 недель завершено</span><span>${Math.round(done/12*100)}%</span></div></section>
 <div class="two-stats"><div class="stat"><div class="stat-value">${full}</div><div class="stat-label">Занятий записано</div></div><div class="stat"><div class="stat-value">${Math.round(uniqueDone/36*100)}%</div><div class="stat-label">От плана из 36 занятий</div></div></div>
 <div class="section-title"><h2>${done===12?'Тренировки последней недели':'Тренировки недели '+w}</h2><button class="text-link" data-nav="plan">Все 12 недель ↗</button></div>
 <div class="day-list">${days}</div>
 <div class="note-card"><strong>Принцип первой недели</strong><p>Без предельных усилий: каждый подход выполняй ровно, спокойно дыши, прекращай при боли или головокружении. Между днями оставляй время на восстановление.</p></div>
 ${latest?`<button class="recent" data-nav="history"><span>Последняя запись: ${fmtDate(latest.performed_at)}</span><strong>Неделя ${latest.week} · ${DAYS[latest.day-1].title} →</strong></button>`:''}`;
}
function weekSelector(selected){return `<div class="week-strip" role="group" aria-label="Выбор недели">${Array.from({length:12},(_,i)=>i+1).map(w=>`<button data-week="${w}" class="week-pill ${selected===w?'selected':''}">${w}</button>`).join('')}</div>`;}
function planView(){
 const w=state.week,phase=PHASES.find(x=>w>=x.from&&w<=x.to);
 return `${heading('КАРТА КУРСА','Программа 12 недель','Три занятия в неделю. Сложность повышается только при уверенной технике.')}
 ${weekSelector(w)}
 <div class="phase-card"><div class="eyebrow">НЕДЕЛИ ${phase.from}–${phase.to}</div><h2>${phase.label}</h2><p>${phase.sub}</p></div>
 ${[1,2,3].map(d=>{const p=plan(w,d);const complete=findFor(w,d).some(s=>s.completed);
 return `<article class="plan-card"><div class="plan-header"><div><div class="eyebrow">ДЕНЬ ${d}</div><h3>${p.title}</h3><p class="muted">${p.subtitle}</p></div>${complete?'<span class="tag done">✓ Готово</span>':'<span class="tag">25–35 мин</span>'}</div>
 <div class="plan-exercises">${p.items.map(x=>`<div class="plan-exercise"><span>${esc(LIB[x.id].name)}</span><small>${amountLabel(x)}</small></div>`).join('')}</div>
 <button class="btn btn-light btn-wide" data-start="${w}:${d}">${complete?'Повторить тренировку':'Открыть тренировку'} <span>→</span></button></article>`;}).join('')}
 <div class="note-card"><strong>Важно</strong><p>План содержит ориентиры, а не обязательные нормативы. При утомлении можно уменьшить продолжительность, число подходов или выбрать облегчённый вариант из инструкции.</p></div>`;
}
function workout(){
 const s=currentSession();if(!s)return home();
 const p=plan(s.week,s.day),pg=progress(s);const ex=p.items[state.exerciseIndex]||p.items[0],data=LIB[ex.id], entries=s.sets[ex.id]||[];
 const doneEx = index => {const item=p.items[index];return (s.sets[item.id]||[]).filter(v=>v>0).length===countSlots(item)};
 return `<div class="workout-top"><button class="back-btn" data-nav="home">← Назад</button><div class="workout-step">НЕДЕЛЯ ${s.week} · ДЕНЬ ${s.day}</div></div>
 <h1 class="workout-name">${p.title}</h1><div class="workout-progress"><div class="meter"><span style="width:${pg.pct}%"></span></div><span>${pg.done}/${pg.total} подходов</span></div>
 <div class="exercise-strip">${p.items.map((item,i)=>`<button title="${esc(LIB[item.id].name)}" data-exercise="${i}" class="exercise-node ${state.exerciseIndex===i?'current':''} ${doneEx(i)?'completed':''}">${doneEx(i)?'✓':i+1}</button>`).join('')}</div>
 <article class="workout-card"><div class="exercise-count">УПРАЖНЕНИЕ ${state.exerciseIndex+1} ИЗ ${p.items.length}</div><h2>${esc(data.name)}</h2><div class="exercise-prescription">${amountLabel(ex)}</div>
 <div class="coaching"><strong>Техника</strong><p>${esc(data.instruction)}</p><div class="coaching-cue">✓ ${esc(data.cue)}</div><details><summary>Если сложно — облегчённый вариант</summary><p>${esc(data.fallback)}</p></details></div>
 <h3 class="little-title">Подходы</h3><div class="set-row">${Array.from({length:countSlots(ex)},(_,i)=>{
 const v=entries[i];return `<button data-set="${state.exerciseIndex}:${i}" class="set-pill ${v>0?'recorded':''} ${state.slotIndex===i?'active':''}" title="${slotLabel(ex,i)}">${v>0?'✓ ':''}${i+1}${v>0?` · ${v}`:''}</button>`;
 }).join('')}</div>
 <div class="current-set">${slotLabel(ex,state.slotIndex)} ${entries[state.slotIndex]>0?'· изменить запись':''}</div>
 ${ex.kind==='hold'?`<div class="timer-box"><span class="timer-caption">ТАЙМЕР УДЕРЖАНИЯ</span><div class="timer-digits"><span id="timer-seconds">${state.timer?Math.ceil(state.timer.remaining):ex.target}</span><small>сек</small></div>
 <div class="timer-actions">${state.timer?.mode==='hold'?`<button class="btn btn-outline" id="timer-toggle" data-action="toggle-timer">${state.timer.running?'Пауза':'Продолжить'}</button><button class="btn btn-muted" data-action="stop-timer">Сбросить</button>`:`<button class="btn btn-primary btn-wide" data-action="start-hold">▶ Начать удержание</button>`}</div><p class="fine-print">По окончании отсчёта подход запишется автоматически. Если завершил раньше — укажи фактическое время ниже.</p></div>`:''}
 <div class="record-form"><label for="actual">Фактически выполнено (${ex.kind==='hold'?'секунды':'повторения'})</label><div class="record-line"><input id="actual" type="number" min="1" max="${ex.kind==='hold'?300:100}" value="${entries[state.slotIndex]||ex.target}" inputmode="numeric"/><button class="btn btn-primary" data-action="mark-set">✓ Записать подход</button></div></div>
 <div class="rest-line"><button class="btn btn-outline" data-action="start-rest">◷ Отдых 60 сек</button>${state.timer?.mode==='rest'?`<span id="timer-seconds">${Math.ceil(state.timer.remaining)}</span><button class="btn btn-muted" data-action="stop-timer">Стоп</button>`:''}</div></article>
 <section class="feelings"><h3>Заметки после занятия</h3><label for="mood">Как ощущалась нагрузка?</label><select id="mood" data-field="mood"><option value="" ${!s.mood?'selected':''}>Не выбрано</option><option value="easy" ${s.mood==='easy'?'selected':''}>Легко</option><option value="normal" ${s.mood==='normal'?'selected':''}>Нормально</option><option value="hard" ${s.mood==='hard'?'selected':''}>Тяжело</option></select><label for="notes">Самочувствие и техника</label><textarea id="notes" data-field="notes" maxlength="4000" rows="3" placeholder="Что получилось? Что было трудно?">${esc(s.notes)}</textarea></section>
 <button class="btn btn-finish btn-wide" data-action="finish">Завершить и сохранить (${pg.done}/${pg.total})</button><p class="fine-print center">Если потерял доступ к интернету, записи останутся на устройстве и будут отправлены в облако позднее.</p>`;
}
function history(){
 const completed=state.sessions.filter(s=>s.completed).sort((a,b)=>new Date(b.performed_at)-new Date(a.performed_at));
 const totalSets=state.sessions.reduce((a,s)=>a+Object.values(s.sets).reduce((b,vals)=>b+(Array.isArray(vals)?vals.filter(v=>v>0).length:0),0),0);
 const chart=Array.from({length:12},(_,i)=>({w:i+1,count:[1,2,3].filter(d=>state.sessions.some(s=>s.week===i+1&&s.day===d&&s.completed)).length}));
 return `${heading('МОЙ ПРОГРЕСС','Дневник тренировок','Выполненные подходы, история занятий и заметки.')}
 <div class="two-stats"><div class="stat"><div class="stat-value">${completed.length}</div><div class="stat-label">Завершено занятий</div></div><div class="stat"><div class="stat-value">${totalSets}</div><div class="stat-label">Подходов записано</div></div></div>
 <section class="chart-card"><h2>Завершённые занятия по неделям</h2><div class="bars">${chart.map(c=>`<div class="bar-col"><div class="bar-track"><div class="bar-fill" style="height:${c.count/3*100}%"></div></div><small>${c.w}</small></div>`).join('')}</div><p class="fine-print">Высота столбца показывает число завершённых тренировок из трёх на каждой неделе.</p></section>
 <div class="section-title"><h2>История</h2><button class="text-link" data-action="export">Экспорт JSON ↓</button></div>
 ${state.sessions.length ? state.sessions.slice().sort((a,b)=>new Date(b.performed_at)-new Date(a.performed_at)).map(s=>{
 const pg=progress(s);return `<article class="history-row"><div class="history-icon">${s.completed?'✓':'◴'}</div><div class="history-body"><strong>Неделя ${s.week} · ${esc(DAYS[s.day-1].title)}</strong><span>${fmtDate(s.performed_at)} · ${pg.done} из ${pg.total} подходов · ${s.completed?'Завершено':'Черновик'}</span>${s.mood?`<small>Нагрузка: ${{easy:'легко',normal:'нормально',hard:'тяжело'}[s.mood]}</small>`:''}${s.notes?`<p>${esc(s.notes)}</p>`:''}</div><button class="history-action" data-open-session="${s.id}" title="Открыть">↗</button></article>`;}).join('') : `<div class="empty"><div class="empty-symbol">◎</div><h3>Пока нет записей</h3><p>Открой первую тренировку и сохрани хотя бы один подход.</p><button class="btn btn-primary" data-start="1:1">Начать тренировку</button></div>`}
 <div class="note-card"><strong>Резервная копия</strong><p>Экспортируй дневник в JSON после важных этапов. Это полезно даже при облачной синхронизации.</p></div>`;
}
function account(){
 const guest = safeRead('statika.sessions.guest.v1',[]);
 const authPart = state.user ? `<div class="connected"><span class="connected-mark">✓</span><div><strong>${esc(state.user.email||'Профиль')}</strong><p>Вход выполнен. Дневник принадлежит этому аккаунту.</p></div></div>${state.recovery?`<form id="password-form" class="form-stack"><p class="muted small">Введите новый пароль для восстановления доступа.</p><label>Новый пароль<input name="newpassword" type="password" required minlength="8" autocomplete="new-password"/></label><button type="submit" class="btn btn-primary btn-wide">Обновить пароль</button></form>`:''}<div class="action-row"><button class="btn btn-outline" data-action="sync">↻ Синхронизировать</button><button class="btn btn-muted" data-action="logout">Выйти</button></div>${guest.length?`<div class="note-card"><strong>Есть локальные гостевые занятия (${guest.length})</strong><p>Можно перенести их в текущий аккаунт. Записи не удалятся с устройства.</p><button class="btn btn-light" data-action="import-guest">Перенести записи</button></div>`:''}` : (configured()?`<form id="auth-form" class="form-stack"><div class="mode-switch"><button type="button" class="${state.authMode==='login'?'selected':''}" data-auth-mode="login">Вход</button><button type="button" class="${state.authMode==='signup'?'selected':''}" data-auth-mode="signup">Регистрация</button></div><label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"/></label><label>Пароль<input name="password" type="password" minlength="6" autocomplete="${state.authMode==='login'?'current-password':'new-password'}" required placeholder="Не меньше 6 символов"/></label><button type="submit" class="btn btn-primary btn-wide">${state.authMode==='login'?'Войти':'Создать аккаунт'}</button><button class="text-link center" type="button" data-action="reset-password">Забыли пароль?</button></form>`:`<div class="note-card"><strong>Облако ещё не подключено</strong><p>Локальные тренировки уже работают. Для входа с двух телефонов подключи Supabase ниже.</p></div>`);
 return `${heading('НАСТРОЙКИ','Аккаунт и данные','Авторизация, облачная синхронизация и резервные копии.')}
 <section class="settings-card"><div class="section-title"><h2>Мои данные</h2><span id="account-status" class="tag">${syncBadge().text}</span></div>${authPart}</section>
 <section class="settings-card"><h2>Подключение Supabase</h2><p class="muted small">Для синхронизации используется отдельный бесплатный проект Supabase. Укажи URL и публичный ключ проекта. Секретный ключ вводить нельзя.</p>
 <form id="config-form" class="form-stack"><label>Project URL<input type="url" name="url" value="${esc(state.settings.supabaseUrl)}" placeholder="https://xxxxx.supabase.co" autocomplete="off" required/></label><label>Publishable key<input type="text" name="key" value="${esc(state.settings.supabasePublishableKey)}" placeholder="sb_publishable_..." autocomplete="off" spellcheck="false" required/></label><button type="submit" class="btn btn-outline btn-wide">Сохранить параметры подключения</button></form>
 <p class="fine-print">Если параметры уже прописаны в файле config.js, они будут использоваться при публикации на обоих телефонах.</p></section>
 <section class="settings-card"><h2>Резервное копирование</h2><p class="muted small">Сохрани JSON-файл с результатами или импортируй собственную резервную копию.</p><div class="action-row"><button class="btn btn-light" data-action="export">↓ Экспорт</button><button class="btn btn-outline" data-action="import">↑ Импорт</button></div><input type="file" id="import-file" accept=".json,application/json" hidden/></section>
 <div class="note-card"><strong>Конфиденциальность</strong><p>Каждый пользователь видит только свои тренировки благодаря Row Level Security в Supabase. Пароль хранится в системе авторизации Supabase, не в журнале тренировок. На устройстве хранится сеанс входа для повторного использования.</p></div>
 <p class="version">Статика · версия ${VERSION} · PWA</p>`;
}
function render(){
 const body=({home,plan:planView,workout,history,account})[state.screen]();
 $('#app').innerHTML=shell(body);
 if(state.timer)timerDisplay();
}
function navigate(screen){
 if(!['home','plan','workout','history','account'].includes(screen))return;
 if(state.screen==='workout'&&screen!=='workout')stopTimer();
 state.screen=screen;render();window.scrollTo({top:0,behavior:'instant'});
}
function downloadFile(name,data,type){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportData(){downloadFile('statika-diary-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({format:'statika-diary-v1',exported_at:now(),sessions:state.sessions},null,2),'application/json');toast('Резервная копия подготовлена.');}
function importData(text){
 let data;try{data=JSON.parse(text);}catch{throw new Error('Файл не является JSON');}
 if(data?.format!=='statika-diary-v1'||!Array.isArray(data.sessions))throw new Error('Неверный формат резервной копии');
 if(data.sessions.length>2000)throw new Error('Слишком большой файл резервной копии');
 let added=0;
 const ids=new Set(state.sessions.map(s=>s.id));
 for(const s of data.sessions){
   if(!validSession(s))continue;
   if(ids.has(s.id))continue;
   const copy={id:s.id,user_id:state.user?.id||null,week:s.week,day:s.day,performed_at:s.performed_at||now(),updated_at:now(),completed:!!s.completed,mood:['','easy','normal','hard'].includes(s.mood)?s.mood:'',notes:String(s.notes||'').slice(0,4000),sets:{}};
   const p=plan(s.week,s.day);
   for(const ex of p.items){const old=Array.isArray(s.sets[ex.id])?s.sets[ex.id]:[];copy.sets[ex.id]=old.slice(0,countSlots(ex)).map(v=>v>0?Math.round(num(v,1,ex.kind==='hold'?300:100)):null);}
   state.sessions.push(copy);state.pending.add(copy.id);ids.add(copy.id);added++;
 }
 queueSync();render();toast('Добавлено записей: '+added);
}
function importGuest(){
 const guest=safeRead('statika.sessions.guest.v1',[]);if(!guest.length)return;
 const ids=new Set(state.sessions.map(s=>s.id));let n=0;
 for(const s of guest){if(!validSession(s))continue;const copy={...s,id:ids.has(s.id)?uid():s.id,user_id:state.user.id,updated_at:now()};state.sessions.push(copy);state.pending.add(copy.id);n++;}
 queueSync();render();toast(`Импортировано ${n} гостевых записей.`);
}
function setConfig(url,key){
 if(!/^https:\/\/[a-z0-9.-]+\/?$/i.test(url)||!/^sb_publishable_[a-zA-Z0-9_\-]+$/.test(key))throw new Error('Нужен HTTPS URL и ключ sb_publishable_… (не секретный ключ).');
 if(state.user)throw new Error('Перед сменой проекта необходимо выйти из аккаунта');
 state.settings={supabaseUrl:url.trim(),supabasePublishableKey:key.trim()};safeWrite('statika.config.v1',state.settings);
 toast('Параметры сохранены. Теперь можно войти.');render();
}
async function handleHashLogin(){
 if(!configured())return;
 const raw=window.location.hash.replace(/^#/,'');
 if(!raw.includes('access_token='))return;
 const params=new URLSearchParams(raw);
 const access_token=params.get('access_token'), refresh_token=params.get('refresh_token');
 if(!access_token||!refresh_token)return;
 try{
 const user=await request('/auth/v1/user',{jwt:access_token});
 setAuth({access_token,refresh_token,expires_at:Date.now()+Number(params.get('expires_in')||3600)*1000,user});
 window.history.replaceState(null,'',location.pathname+location.search);
 state.recovery=params.get('type')==='recovery';if(state.recovery)state.screen='account';await sync();toast(state.recovery?'Введите новый пароль на вкладке аккаунта.':'Email подтверждён. Вход выполнен.');
 }catch(err){toast('Не удалось обработать ссылку подтверждения: '+err.message);}
}

// Делегированные обработчики не вставляют в HTML пользовательский JS.
document.addEventListener('click', async ev=>{
 const target=ev.target.closest('[data-nav],[data-week],[data-start],[data-exercise],[data-set],[data-auth-mode],[data-open-session],[data-action]');if(!target)return;
 if(target.dataset.nav){navigate(target.dataset.nav);return;}
 if(target.dataset.week){state.week=Number(target.dataset.week);render();return;}
 if(target.dataset.start){const[w,d]=target.dataset.start.split(':').map(Number);initSession(w,d);return;}
 if(target.dataset.exercise!==undefined){state.exerciseIndex=Number(target.dataset.exercise);state.slotIndex=0;stopTimer();render();return;}
 if(target.dataset.set){const[i,j]=target.dataset.set.split(':').map(Number);editSet(i,j);return;}
 if(target.dataset.authMode){state.authMode=target.dataset.authMode;render();return;}
 if(target.dataset.openSession){const s=state.sessions.find(x=>x.id===target.dataset.openSession);if(s){state.activeId=s.id;state.exerciseIndex=0;state.slotIndex=0;navigate('workout');}return;}
 const act=target.dataset.action;if(!act)return;
 try{
   switch(act){
   case 'mark-set':markSet($('#actual').value);break;
   case 'start-hold':startTimer('hold');break;
   case 'start-rest':startTimer('rest');break;
   case 'toggle-timer':pauseResumeTimer();break;
   case 'stop-timer':stopTimer();render();break;
   case 'finish':finishWorkout();break;
   case 'sync':await sync();toast('Проверка синхронизации завершена.');break;
   case 'logout':await logout();break;
   case 'export':exportData();break;
   case 'import':$('#import-file').click();break;
   case 'import-guest':if(confirm('Скопировать гостевые записи в текущий аккаунт?'))importGuest();break;
   case 'reset-password':{
     const email=prompt('Введите email, на который отправить ссылку восстановления:');
     if(email){if(!configured())throw new Error('Supabase не настроен');await request('/auth/v1/recover',{method:'POST',body:{email}});toast('Если адрес существует, на него отправлена ссылка.');}
     break;
   }
   }
 }catch(err){toast(err.message);}
});
document.addEventListener('submit',async ev=>{
 const form=ev.target;if(!['auth-form','config-form','password-form'].includes(form.id))return;ev.preventDefault();
 const btn=$('button[type="submit"]',form);if(btn)btn.disabled=true;
 try{
   const f=new FormData(form);
   if(form.id==='auth-form'){
     if(state.authMode==='signup')await signup(String(f.get('email')).trim(),String(f.get('password')));
     else await login(String(f.get('email')).trim(),String(f.get('password')));
   }else if(form.id==='password-form'){await request('/auth/v1/user',{method:'PUT',jwt:await token(),body:{password:String(f.get('newpassword')||'')}});state.recovery=false;toast('Пароль обновлён.');render();}else setConfig(String(f.get('url')||''),String(f.get('key')||''));
 }catch(err){toast(err.message);}finally{if(btn&&btn.isConnected)btn.disabled=false;}
});
document.addEventListener('change',async ev=>{
 const t=ev.target;if(t.id==='import-file'&&t.files?.[0]){
   try{if(t.files[0].size>2_000_000)throw new Error('Файл больше 2 МБ');importData(await t.files[0].text());}catch(err){toast(err.message);}t.value='';
 }else if(t.dataset.field==='mood')saveSessionField('mood',t.value);
});
document.addEventListener('input',ev=>{if(ev.target.dataset.field==='notes')saveSessionField('notes',ev.target.value);});
window.addEventListener('online',()=>{state.isOnline=true;sync();});
window.addEventListener('offline',()=>{state.isOnline=false;updateSyncTag();});
window.addEventListener('focus',()=>{if(state.user)sync();});

async function boot(){
 const prior=safeRead('statika.auth.v1',null);
 if(prior?.user?.id && configured()){
   state.auth=prior;state.user=prior.user;
 }
 loadSaved();state.week=nextWeek();
 await handleHashLogin();
 if(state.user){sync().then(()=>render());}
 render();
 if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').then(reg=>{reg.update().catch(()=>{});document.addEventListener('visibilitychange',()=>{if(!document.hidden)reg.update().catch(()=>{});});}).catch(()=>{});
}

/* Статика 2.0 — рабочая надстройка над v1. Формат данных v1 сохранён. */
const v2 = {
 origin:'home', selected:{week:1,day:1}, studyId:'side', studyBad:false,
 screenBeforeStudy:'plan', historyReview:false, repeat:false,
 stage:'idle', stageBefore:null, duration:0, remaining:0, deadline:0, interval:null, lastCount:4,
 sound:safeRead('statika.v2.sound',true), voice:safeRead('statika.v22.voice',false),
 rest:num(safeRead('statika.v2.rest',60),30,120), audio:null
};
// 2.1: управление экраном и заранее сформированной аудиодорожкой упражнения.
const bg2 = {
 mode:['awake','locked'].includes(safeRead('statika.v21.screen','awake'))?safeRead('statika.v21.screen','awake'):'awake',
 wake:null, wakeState:'idle', player:null, track:null, cursor:0, interval:null,
 spoken:null, lockedHiddenAt:0, lockWarning:false
};
const ERRORS = {
 hang:['Раскачивание тела вместо удержания','Напряжение шеи, плечи у ушей'],scap:['Рывки и сильное сгибание локтей','Слишком большая амплитуда'],
 knee:['Поднимать колени рывком','Раскачивать корпус'],plank:['Прогиб в пояснице','Таз слишком высоко'],high:['Провисание поясницы','Избыточная нагрузка на кисти'],
 push:['Провисание живота','Резкий темп без контроля'],wall:['Колени заваливаются внутрь','Опускаться ниже комфортной глубины'],bridge:['Переразгибать поясницу','Поднимать таз рывком'],
 side:['Плечо уходит к уху','Таз провисает'],shortside:['Плечо и локоть не на одной линии','Таз провисает'],
 lunge:['Потеря равновесия','Колено уходит внутрь'],deadbug:['Поясница отрывается от пола','Движения выполняются рывком'],
 hollow:['Прогиб в пояснице','Задержка дыхания'],leglift:['Сильный наклон назад','Рывок вместо контроля'],
 tuck:['Раскачивание корпуса','Чрезмерное напряжение поясницы'],support:['Плечи подняты к ушам','Сильный прогиб спины'],
 balance:['Далеко отходить от стены','Смотреть под ноги и сутулиться']
};
function statusOf(week,day){
 const ss=findFor(week,day),full=ss.find(s=>s.completed&&progress(s).done===progress(s).total),
 partial=ss.find(s=>s.completed&&progress(s).done>0&&progress(s).done<progress(s).total),
 draft=ss.find(s=>!s.completed&&progress(s).done>0);
 if(draft)return {label:'Продолжить',kind:'active',session:draft};
 if(full)return {label:'Выполнено полностью',kind:'full',session:full};
 if(partial)return {label:'Выполнено частично',kind:'partial',session:partial};
 return {label:'Начать',kind:'new',session:null};
}
completedWeeks=function(){let n=0;for(let w=1;w<=12;w++){if([1,2,3].every(d=>statusOf(w,d).kind==='full'))n++;else break;}return n;};
function selectedPlan(){const s=currentSession();return s?plan(s.week,s.day):plan(v2.selected.week,v2.selected.day);}
function selectedProgress(){const s=currentSession();return s?progress(s):{done:0,total:selectedPlan().items.reduce((n,e)=>n+countSlots(e),0),pct:0};}
function clearMachine(){
 localStorage.removeItem('statika.v23.inflight');stopRecordedTrack();releaseScreenLock();
 if(v2.interval)clearInterval(v2.interval);v2.interval=null;v2.stage='idle';v2.stageBefore=null;v2.remaining=0;v2.lastCount=4;
}
function pauseMachine(){
 if(!['countdown','hold','rest'].includes(v2.stage))return;
 if(bg2.player){bg2.player.pause();stopMediaTick();v2.stageBefore=v2.stage;v2.stage='paused';}
 else{v2.remaining=Math.max(0,(v2.deadline-Date.now())/1000);v2.stageBefore=v2.stage;v2.stage='paused';if(v2.interval)clearInterval(v2.interval);v2.interval=null;}
 releaseScreenLock();if(state.screen==='workout')render();
}
function openWorkout(week,day,{repeat=false,sessionId=null,origin=null}={}){
 if(v2.stage==='paused' && v2.selected.week===week && v2.selected.day===day && !repeat && !sessionId){v2.origin=origin || (state.screen==='plan'?'plan':v2.origin);navigate('workout');return;}
 if(state.screen==='workout')pauseMachine();
 stopTimer();clearMachine();v2.selected={week,day};v2.origin=origin|| (state.screen==='plan'?'plan':'home');v2.historyReview=!!sessionId;v2.repeat=repeat;
 let s=sessionId?state.sessions.find(x=>x.id===sessionId):null;
 if(!s&&!repeat){const st=statusOf(week,day);if(st.kind==='active'||st.kind==='partial')s=st.session;}
 state.activeId=s?.id||null;state.exerciseIndex=0;state.slotIndex=0;
 const p=selectedPlan(),ss=s;
 outer:for(let i=0;i<p.items.length;i++)for(let j=0;j<countSlots(p.items[i]);j++){
   if(!((ss?.sets?.[p.items[i].id]||[])[j]>0)){state.exerciseIndex=i;state.slotIndex=j;break outer;}
 }
 navigate('workout');
}
initSession=function(week,day){openWorkout(week,day);};
function ensureSession(){
 let s=currentSession();if(s){if(s.completed){s.completed=false;touchSession(s);}return s;}
 const {week,day}=v2.selected;
 s={id:uid(),user_id:state.user?.id||null,week,day,performed_at:now(),updated_at:now(),completed:false,mood:'',notes:'',sets:{}};
 state.sessions.unshift(s);state.activeId=s.id;touchSession(s);return s;
}
function getNextSlot(ex,starting){const s=currentSession();const arr=s?.sets?.[ex.id]||[];
 for(let j=starting;j<countSlots(ex);j++)if(!(arr[j]>0))return j;return -1;}
function nextExerciseIndex(){const p=selectedPlan(),s=currentSession();for(let i=state.exerciseIndex+1;i<p.items.length;i++){
 const ex=p.items[i],arr=s?.sets?.[ex.id]||[];if(Array.from({length:countSlots(ex)},(_,j)=>arr[j]).some(x=>!(x>0)))return i;}return -1;}
function audioInit(){try{v2.audio ||= new (window.AudioContext||window.webkitAudioContext)();if(v2.audio.state==='suspended')v2.audio.resume().catch(()=>{});}catch{}}
function beep(type='tick'){
 if(!v2.sound)return;
 try{audioInit();if(!v2.audio)return;const ctx=v2.audio,t=ctx.currentTime,osc=ctx.createOscillator(),g=ctx.createGain();
 osc.frequency.value=type==='start'?1120:type==='end'?650:790;osc.type='sine';g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.13,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+(type==='end'?.38:.17));osc.connect(g);g.connect(ctx.destination);osc.start(t);osc.stop(t+(type==='end'?.4:.2));}catch{}
}
// Только настоящий голосовой движок устройства. Нечитаемые PCM-клипы 2.1 удалены.
function russianVoice(){
 if(!('speechSynthesis' in window))return null;
 const voices=window.speechSynthesis.getVoices()||[];
 return voices.find(x=>/^ru([-_]|$)/i.test(x.lang||'')) || null;
}
function voiceAvailability(){return russianVoice()?'Русский голос устройства обнаружен. Озвучка экспериментальная; сигналы остаются основным сопровождением.':'Русский голос пока не обнаружен. Можно проверить его наличие кнопкой ниже.';}
function speak(text){
 if(!v2.voice||bg2.mode==='locked'||bg2.player)return false; // iOS: TTS can interrupt the timing audio track
 const voice=russianVoice();if(!voice)return false;
 try{
  const speech=new SpeechSynthesisUtterance(text);
  speech.voice=voice;speech.lang='ru-RU';speech.rate=.92;speech.volume=1;
  window.speechSynthesis.cancel();window.speechSynthesis.speak(speech);
  return true;
 }catch(e){console.warn('Не удалось воспроизвести русскую речь:',e);return false;}
}

function machinePhase(phase,duration){
 if(v2.interval)clearInterval(v2.interval);v2.interval=null;v2.stage=phase;v2.duration=duration;v2.remaining=duration;v2.deadline=Date.now()+1000*duration;v2.lastCount=4;
 if(['countdown','hold','rest'].includes(phase)){v2.interval=setInterval(machineTick,100);machineTick();}
 if(state.screen==='workout')render();
}
function prepCountdown(){speak('Приготовься');machinePhase('countdown',3);}
function beginWork(){
 const ex=selectedPlan().items[state.exerciseIndex];beep('start');speak('Начали');
 if(ex.kind==='hold'){safeWrite('statika.v23.inflight',{sessionId:currentSession()?.id||null,week:v2.selected.week,day:v2.selected.day,exercise:ex.id,slot:state.slotIndex,at:Date.now()});machinePhase('hold',ex.target);}else {machinePhase('reps',0);}
}
function persistSet(actual){
 const s=ensureSession(),ex=selectedPlan().items[state.exerciseIndex];const val=Math.round(num(actual,1,ex.kind==='hold'?300:100));
 const arr=Array.isArray(s.sets[ex.id])?[...s.sets[ex.id]]:[];arr[state.slotIndex]=val;s.sets[ex.id]=arr;localStorage.removeItem('statika.v23.inflight');touchSession(s);
 return val;
}
function endApproach(actual){
 const ex=selectedPlan().items[state.exerciseIndex];persistSet(actual);beep('end');
 const next=getNextSlot(ex,state.slotIndex+1);
 if(next>=0){state.slotIndex=next;speak('Отдых');machinePhase('rest',v2.rest);}
 else {v2.stage='between';if(v2.interval)clearInterval(v2.interval);v2.interval=null;
   speak('Упражнение завершено');render();}
}
function machineTick(){
 if(!['countdown','hold','rest'].includes(v2.stage)){if(v2.interval)clearInterval(v2.interval);v2.interval=null;return;}
 v2.remaining=Math.max(0,(v2.deadline-Date.now())/1000);
 if(v2.stage==='countdown'){
  const c=Math.max(1,Math.ceil(v2.remaining));if(c!==v2.lastCount&&v2.remaining>.02){beep('tick');v2.lastCount=c;}
  if(v2.remaining<=0){beginWork();return;}
 }else if(v2.stage==='hold'&&v2.remaining<=0){const ex=selectedPlan().items[state.exerciseIndex];endApproach(ex.target);return;}
 else if(v2.stage==='rest'&&v2.remaining<=0){prepCountdown();return;}
 const n=$('#v2-clock');if(n)n.textContent=String(Math.max(0,Math.ceil(v2.remaining)));updateV24Progress();
 const photo=$('#v23-photo');if(photo){const phase=v2.stage==='hold'?'active':v2.stage==='rest'?'rest':'ready';const url='./media/hang-'+phase+'.webp';if(!photo.getAttribute('src')?.endsWith(url))photo.setAttribute('src',url);const label=$('#v23-tech-label');if(label)label.textContent=phase==='active'?'Лопатки вниз · локти прямые':phase==='rest'?'Отдых · стой под турником':'Свободный вис · плечи расслаблены';}
}
function updateV24Progress(){
 const el=document.getElementById('v24-progress');if(!el)return;
 const duration=Math.max(.01,Number(v2.duration)||0);
 const pct=['countdown','hold','rest','paused'].includes(v2.stage)?Math.max(0,Math.min(100,(1-(Number(v2.remaining)||0)/duration)*100)):0;
 el.style.width=pct.toFixed(2)+'%';
 const track=el.parentElement;if(track){track.setAttribute('aria-valuenow',String(Math.round(pct)));track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');}
}
function startApproaches(){
 if(!['idle','between'].includes(v2.stage))return;
 v2.historyReview=false;const ex=selectedPlan().items[state.exerciseIndex];
 if(ex.kind==='hold')return startRecordedTrack();
 audioInit();if(bg2.mode==='awake')requestScreenLock();prepCountdown();
}
function resumeMachine(){
 if(v2.stage!=='paused')return;
 if(bg2.player){
  const wanted=v2.stageBefore||'countdown';v2.stage=wanted;v2.stageBefore=null;
  bg2.player.play().then(()=>{if(bg2.mode==='awake')requestScreenLock();startMediaTick();reconcileRecordedTrack();}).catch(()=>{v2.stage='paused';toast('Браузер не разрешил продолжить аудио. Попробуй нажать ещё раз.');render();});
  render();return;
 }
 const phase=v2.stageBefore||'countdown';v2.stageBefore=null;machinePhase(phase,v2.remaining);if(bg2.mode==='awake')requestScreenLock();
}
function earlyEnd(){
 if(v2.stage!=='hold')return;
 const ex=selectedPlan().items[state.exerciseIndex];const elapsed=Math.floor(ex.target-v2.remaining);
 if(elapsed<1){pauseMachine();toast('Подход не записан — прошло меньше секунды.');return;}
 if(bg2.player){
  stopRecordedTrack();persistSet(elapsed);
  v2.stage='between';releaseScreenLock();render();toast('Подход записан. Для безопасности дальнейшее выполнение запускается вручную.');
  return;
 }
 endApproach(elapsed);
}
function afterExercise(){stopRecordedTrack();releaseScreenLock();const n=nextExerciseIndex();if(n<0){v2.stage='done';render();return;}state.exerciseIndex=n;state.slotIndex=getNextSlot(selectedPlan().items[n],0);if(state.slotIndex<0)state.slotIndex=0;v2.stage='idle';render();}
function switchToStudy(id,from='workout'){if(['countdown','hold','rest'].includes(v2.stage))pauseMachine();v2.studyId=id;v2.studyBad=false;v2.screenBeforeStudy=from;navigate('learn');}
function updateMachineSettings(){
 safeWrite('statika.v2.sound',v2.sound);safeWrite('statika.v22.voice',v2.voice);safeWrite('statika.v2.rest',v2.rest);
 safeWrite('statika.v21.screen',bg2.mode);
}
function machineTitle(){return {idle:'ГОТОВ К СТАРТУ',countdown:'ПРИГОТОВЬСЯ',hold:'УДЕРЖИВАЙ',rest:'ОТДЫХ',reps:'ПОВТОРЕНИЯ',paused:'ПАУЗА',between:'УПРАЖНЕНИЕ ЗАВЕРШЕНО',done:'ВСЕ УПРАЖНЕНИЯ ПРОЙДЕНЫ'}[v2.stage]||'ГОТОВ К СТАРТУ';}
function workout(){
 const p=selectedPlan(),s=currentSession(),pg=selectedProgress(),ex=p.items[state.exerciseIndex],data=LIB[ex.id];
 const a=s?.sets?.[ex.id]||[],count=countSlots(ex),isDone=count&&Array.from({length:count},(_,i)=>a[i]).every(x=>x>0);
 const atEnd=v2.stage==='between'||v2.stage==='done',canStart=v2.stage==='idle';
 const summary=v2.stage==='countdown'?'После сигнала начинай подход.':v2.stage==='hold'?'Сохраняй технику и спокойное дыхание.':v2.stage==='rest'?'Отдых идёт автоматически. Следующий подход начнётся после 3–2–1.':v2.stage==='reps'?'Выполни повторения без спешки. Затем отметь подход.':v2.stage==='paused'?'Тренировка на паузе. Отсчёт продолжится по кнопке.':atEnd?'Переход к другому упражнению только вручную.':'Нажми «Начать». Остальные подходы упражнения пойдут автоматически.';
 const digits=['countdown','hold','rest','paused'].includes(v2.stage)?String(Math.max(0,Math.ceil(v2.remaining))):ex.kind==='reps'?String(ex.target):String(ex.target);
 let controls='';
 if(canStart&&!v2.historyReview)controls=`<button class="btn btn-primary btn-wide" data-v2-action="start">▶ Начать упражнение</button>`;
 if(['countdown','hold','rest'].includes(v2.stage))controls=`<button class="btn btn-outline" data-v2-action="pause">Ⅱ Пауза</button>${v2.stage==='hold'?'<button class="btn btn-muted" data-v2-action="early">Завершить раньше</button>':''}`;
 if(v2.stage==='paused')controls='<button class="btn btn-primary btn-wide" data-v2-action="resume">▶ Продолжить</button><button class="btn btn-muted" data-v2-action="abort">Прервать подход</button>';
 if(v2.stage==='reps')controls=`<label class="v2-rep-entry">Повторений <input type="number" inputmode="numeric" id="v2-reps-input" min="1" max="100" value="${ex.target}"></label><button class="btn btn-primary" data-v2-action="reps">✓ Записать</button><button class="btn btn-muted" data-v2-action="abort">Прервать</button>`;
 if(atEnd){
   if(v2.stage==='between'&&!isDone){
     controls='<button class="btn btn-primary btn-wide" data-v2-action="continue-current">▶ Продолжить оставшиеся подходы</button><button class="btn btn-muted" data-v2-action="next">Пропустить остаток и перейти →</button>';
   }else{
     controls=nextExerciseIndex()<0?'<button class="btn btn-primary btn-wide" data-v2-action="finish">✓ Завершить тренировку</button>':'<button class="btn btn-primary btn-wide" data-v2-action="next">→ Следующее упражнение</button>';
   }
 }
 if(v2.historyReview)controls='<div class="subtle-card">Открыта запись дневника. Можно исправить результат любого подхода ниже.</div>';
 return `<div class="workout-top"><button class="back-btn" data-nav="${v2.historyReview?'history':v2.origin}">← ${v2.historyReview?'К дневнику':v2.origin==='plan'?'К программе':'На главную'}</button><span class="workout-step">НЕДЕЛЯ ${p.week} · ДЕНЬ ${p.day}</span></div>
 <div class="workout-compact-title">${esc(p.title)}</div><div class="workout-progress"><div class="meter"><span style="width:${pg.pct}%"></span></div><span>${pg.done}/${pg.total} подходов</span></div>
 <div class="exercise-strip">${p.items.map((item,i)=>{const arr=s?.sets?.[item.id]||[];const full=Array.from({length:countSlots(item)},(_,j)=>arr[j]).every(x=>x>0);return `<button data-v2-ex="${i}" class="exercise-node ${i===state.exerciseIndex?'current':''} ${full?'completed':''}" ${['countdown','hold','rest','reps'].includes(v2.stage)?'disabled title="Сначала остановите таймер"':''}>${full?'✓':i+1}</button>`;}).join('')}</div>
 <article class="workout-card v2-workout"><div class="exercise-count">УПРАЖНЕНИЕ ${state.exerciseIndex+1} ИЗ ${p.items.length}</div><h2>${esc(data.name)}</h2><p class="exercise-prescription">${amountLabel(ex)}</p>
 <div class="v23-tech"><button class="v23-tech-photo" data-v2-action="study-current" aria-label="Открыть подробную технику">${ex.id==='hang'?`<img id="v23-photo" src="./media/hang-${v2.stage==='rest'?'rest':v2.stage==='hold'?'active':'ready'}.webp" alt="Активный вис: ${v2.stage==='hold'?'фиксация':v2.stage==='rest'?'отдых':'подготовка'}">`:`<div class="v23-tech-fallback">${window.StaticDiagram?window.StaticDiagram(ex.id,false):''}</div>`}</button><div class="v23-tech-caption"><span id="v23-tech-label">${ex.id==='hang'?(v2.stage==='hold'?'Лопатки вниз · локти прямые':v2.stage==='rest'?'Отдых между подходами':'Свободный вис · плечи расслаблены'):esc(data.cue)}</span><button data-v2-action="study-current" aria-label="Подробная техника">ⓘ</button></div></div>
 <section class="v2-machine"><div class="eyebrow" id="v2-stage">${machineTitle()}</div><div class="v2-digits"><strong id="v2-clock">${digits}</strong><small>${v2.stage==='reps'||(ex.kind==='reps'&&canStart)?'раз':'сек'}</small></div><div class="v24-timeline" role="progressbar" aria-label="Прогресс текущей фазы"><span id="v24-progress"></span></div><div class="v2-controls">${controls}</div><p class="v2-hint">${summary}</p></section>
 <details class="v23-settings"><summary>⚙ Настройки тренировки</summary><div class="screen-mode-card"><div class="mode-heading">Режим экрана</div><div class="mode-options"><label class="mode-choice"><input type="radio" name="screen-mode" data-v2-setting="screen" value="awake" ${bg2.mode==='awake'?'checked':''}> <span><strong>Экран включён</strong><small>Попытка не давать экрану погаснуть через Wake Lock. Нужен HTTPS.</small></span></label><label class="mode-choice"><input type="radio" name="screen-mode" data-v2-setting="screen" value="locked" ${bg2.mode==='locked'?'checked':''}> <span><strong>Экран можно выключить · экспериментально</strong><small>Экспериментальный аудиотаймер со звуковыми сигналами. Русский голос при блокировке не гарантируется.</small></span></label></div><p class="mode-status" id="v21-mode-status">${screenModeStatus()}</p><button type="button" class="text-link" data-v2-action="test-voice">▶ Проверить голос устройства</button><p class="fine-print" id="voice-availability">${voiceAvailability()}</p></div>
 <div class="v2-quick-row"><label class="v2-check"><input type="checkbox" data-v2-setting="sound" ${v2.sound?'checked':''}> Звуки</label><label class="v2-check"><input type="checkbox" data-v2-setting="voice" ${v2.voice?'checked':''}> Голос устройства (если доступен)</label><label class="v2-rest">Отдых <select data-v2-setting="rest"><option value="30" ${v2.rest===30?'selected':''}>30 c</option><option value="45" ${v2.rest===45?'selected':''}>45 c</option><option value="60" ${v2.rest===60?'selected':''}>60 c</option><option value="90" ${v2.rest===90?'selected':''}>90 c</option><option value="120" ${v2.rest===120?'selected':''}>120 c</option></select></label></div>
 </details><details class="v2-edit"><summary>Исправить результат подхода</summary><p>Выбери подход выше и введи фактическое значение.</p><div class="record-line"><input id="v2-actual" type="number" inputmode="numeric" min="1" max="${ex.kind==='hold'?300:100}" value="${a[state.slotIndex]||ex.target}"><button class="btn btn-outline" data-v2-action="edit-set">Сохранить ${ex.kind==='hold'?'секунды':'повторения'}</button></div></details>
 <div class="set-row">${Array.from({length:count},(_,i)=>`<button data-v2-slot="${i}" class="set-pill ${a[i]>0?'recorded':''} ${i===state.slotIndex?'active':''}" ${['countdown','hold','rest','reps'].includes(v2.stage)?'disabled':''} title="${slotLabel(ex,i)}">${a[i]>0?'✓ ':''}${i+1}${a[i]>0?' · '+a[i]:''}</button>`).join('')}</div>
 <div class="current-set">${slotLabel(ex,state.slotIndex)} ${a[state.slotIndex]>0?'· записан':''}</div>
 </article>
 <section class="feelings"><h3>Самочувствие и заметки</h3><label for="mood">Как ощущалась нагрузка?</label><select id="mood" data-field="mood"><option value="" ${!s?.mood?'selected':''}>Не выбрано</option><option value="easy" ${s?.mood==='easy'?'selected':''}>Легко</option><option value="normal" ${s?.mood==='normal'?'selected':''}>Нормально</option><option value="hard" ${s?.mood==='hard'?'selected':''}>Тяжело</option></select><label for="notes">Комментарии</label><textarea id="notes" data-field="notes" maxlength="4000" rows="2" placeholder="Например: держал корпус стабильно, но быстро устали предплечья…">${esc(s?.notes||'')}</textarea></section>
 ${!v2.historyReview?`<button class="btn btn-finish btn-wide" data-v2-action="finish">${pg.done===pg.total?'✓ Завершить тренировку':'Завершить и сохранить частично'} (${pg.done}/${pg.total})</button>`:`<button class="btn btn-outline btn-wide" data-nav="history">← Вернуться в дневник</button>`}
 <p class="fine-print center">В режиме «Экран включён» переход в другой раздел ставит таймер на паузу. Режим с выключенным экраном экспериментальный: если браузер остановит аудио, приложение предложит возобновить его после возврата. При завершении упражнения потребуется вручную запустить следующее.</p>`;
}
function learning(){
 const id=LIB[v2.studyId]?v2.studyId:'side';const ex=LIB[id];
 return `${heading('РЕЖИМ ОБУЧЕНИЯ','Правильная техника','Выбери упражнение, посмотри схему положения тела и разбери частые ошибки. Это схематичные подсказки, а не видеоинструкция.')}
 <div class="study-library">${Object.entries(LIB).map(([k,x])=>`<button data-v2-study="${k}" class="${id===k?'selected':''}">${esc(x.name)}</button>`).join('')}</div>
 <article class="learn-card"><div class="eyebrow">${ex.kind==='hold'?'СТАТИЧЕСКОЕ УДЕРЖАНИЕ':'ДВИЖЕНИЕ НА ПОВТОРЕНИЯ'}</div><h2>${esc(ex.name)}</h2><div class="diagram" aria-label="Схема упражнения">${id==='hang'?'<img class="v23-learn-photo" src="./media/hang-sequence.webp" alt="Активный вис: отдых, свободный вис, активный вис; сравнительная последовательность">':''}${window.StaticDiagram?window.StaticDiagram(id,v2.studyBad):'<p>Визуальная схема недоступна</p>'}<span class="diagram-badge ${v2.studyBad?'wrong':''}">${v2.studyBad?'× Частая ошибка':'✓ Положение тела'}</span></div>
 <div class="diagram-switch"><button data-v2-scene="correct" class="${v2.studyBad?'':'selected'}">✓ Правильно</button><button data-v2-scene="wrong" class="${v2.studyBad?'selected wrong':''}">× Ошибки</button></div>
 <div class="study-grid"><div class="coaching"><strong>Как делать</strong><p>${esc(ex.instruction)}</p><div class="coaching-cue">✓ ${esc(ex.cue)}</div></div><div class="coaching"><strong>Чего избегать</strong><ul>${(ERRORS[id]||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>
 <details class="v2-fallback"><summary>Если сложно — облегчённый вариант</summary><p>${esc(ex.fallback)}</p></details>
 <button class="btn btn-primary btn-wide" data-v2-action="back-to-training">${v2.screenBeforeStudy==='workout'?'← Вернуться к тренировке':'← Вернуться к программе'}</button>
 <p class="fine-print">Изображения схематичные; перед освоением сложных упражнений желательно проверить технику с квалифицированным тренером. Прекращай выполнение при боли или головокружении.</p></article>`;
}
function home(){
 const w=nextWeek(),weeks=completedWeeks(),done=state.sessions.filter(s=>s.completed).length,unique=new Set(state.sessions.filter(s=>s.completed).map(s=>s.week+':'+s.day)).size;
 return `${heading('МОЯ ТРЕНИРОВОЧНАЯ ПРОГРАММА','Сильнее. Спокойнее. Точнее.','12 недель калистеники. Обучение технике и тренировки с автоматическим отсчётом.')}
 <section class="hero"><div class="hero-tag">ТЕКУЩИЙ ЭТАП</div><h2>Неделя ${w} <span>/ 12</span></h2><div class="hero-sub">${esc(PHASES.find(p=>w>=p.from&&w<=p.to).label)} · 3 занятия в неделю</div><div class="meter"><span style="width:${Math.round(weeks/12*100)}%"></span></div><div class="hero-footer"><span>${weeks} из 12 недель полностью пройдено</span><span>${Math.round(weeks/12*100)}%</span></div></section>
 <div class="two-stats"><div class="stat"><div class="stat-value">${done}</div><div class="stat-label">Сессий завершено</div></div><div class="stat"><div class="stat-value">${Math.round(unique/36*100)}%</div><div class="stat-label">Из 36 занятий закрыто</div></div></div>
 <div class="v2-mode-cards"><button data-nav="learn"><span>◈</span><strong>Обучение</strong><small>Положение тела, ошибки и облегчения</small></button><button data-nav="plan"><span>▦</span><strong>Программа</strong><small>Все 12 недель и 36 занятий</small></button></div>
 <div class="section-title"><h2>Неделя ${w}</h2><button class="text-link" data-nav="plan">Все недели ↗</button></div><div class="day-list">${[1,2,3].map(d=>{const p=plan(w,d),st=statusOf(w,d);return `<button class="day-card" data-start="${w}:${d}"><div class="day-num">0${d}</div><div class="day-info"><strong>${esc(p.title)}</strong><span>${esc(p.subtitle)}</span><div class="day-meta">${p.items.length} упражнений · 25–35 мин</div></div><span class="state-label ${st.kind==='full'?'finished':''}">${st.label} →</span></button>`;}).join('')}</div>
 <div class="note-card"><strong>Как устроена автоматическая тренировка</strong><p>Начни упражнение вручную. Затем приложение отсчитает 3–2–1 и проведёт подходы с отдыхом. Следующее упражнение включается только по твоей команде.</p></div>`;
}
function planView(){
 const w=state.week,phase=PHASES.find(p=>w>=p.from&&w<=p.to);
 return `${heading('КАРТА КУРСА','Программа 12 недель','Три занятия в неделю. Техника важнее длительности удержания.')}${weekSelector(w)}
 <div class="phase-card"><div class="eyebrow">НЕДЕЛИ ${phase.from}–${phase.to}</div><h2>${esc(phase.label)}</h2><p>${esc(phase.sub)}</p></div>
 ${[1,2,3].map(d=>{const p=plan(w,d),st=statusOf(w,d);return `<article class="plan-card"><div class="plan-header"><div><div class="eyebrow">ДЕНЬ ${d}</div><h3>${esc(p.title)}</h3><p class="muted">${esc(p.subtitle)}</p></div><span class="tag ${st.kind==='full'?'done':''}">${st.label}</span></div>
 <div class="plan-exercises">${p.items.map(x=>`<button class="plan-exercise v2-ex-preview" data-v2-study="${x.id}"><span>${esc(LIB[x.id].name)}</span><small>${amountLabel(x)}</small></button>`).join('')}</div>
 <button class="btn btn-light btn-wide" data-start="${w}:${d}">${st.kind==='full'?'Просмотреть / повторить':st.kind==='partial'?'Продолжить неполную тренировку':st.kind==='active'?'Продолжить тренировку':'Начать тренировку'} <span>→</span></button></article>`;}).join('')}
 <div class="note-card"><strong>Прогрессия</strong><p>Планы следующих недель доступны для ознакомления. Увеличивай нагрузку только если удержания выполняются с хорошей техникой и без боли. Если нагрузка высока, оставайся на текущем варианте упражнения.</p></div>`;
}
function history(){
 const all=state.sessions.filter(s=>progress(s).done>0).sort((a,b)=>new Date(b.performed_at)-new Date(a.performed_at)),completed=all.filter(s=>s.completed);
 const total=all.reduce((sum,s)=>sum+progress(s).done,0);
 const bars=Array.from({length:12},(_,i)=>({w:i+1,c:[1,2,3].filter(d=>statusOf(i+1,d).kind==='full').length}));
 return `${heading('МОЙ ПРОГРЕСС','Дневник тренировок','История подходов, завершённые и частично выполненные занятия.')}
 <div class="two-stats"><div class="stat"><div class="stat-value">${completed.length}</div><div class="stat-label">Закрытых сессий</div></div><div class="stat"><div class="stat-value">${total}</div><div class="stat-label">Подходов записано</div></div></div>
 <section class="chart-card"><h2>Полностью выполненные дни</h2><div class="bars">${bars.map(c=>`<div class="bar-col"><div class="bar-track"><div class="bar-fill" style="height:${c.c/3*100}%"></div></div><small>${c.w}</small></div>`).join('')}</div><p class="fine-print">Каждый столбец — до трёх полностью выполненных занятий за неделю. Частичные записи остаются в истории.</p></section>
 <div class="section-title"><h2>История</h2><button class="text-link" data-action="export">Экспорт JSON ↓</button></div>
 ${all.length?all.map(s=>{const pg=progress(s),label=s.completed?(pg.done===pg.total?'Выполнено полностью':'Выполнено частично'):'В процессе';return `<article class="history-row"><div class="history-icon">${s.completed&&pg.done===pg.total?'✓':'◴'}</div><div class="history-body"><strong>Неделя ${s.week} · ${esc(DAYS[s.day-1].title)}</strong><span>${fmtDate(s.performed_at)} · ${pg.done} из ${pg.total} подходов · ${label}</span>${s.mood?`<small>Нагрузка: ${{easy:'легко',normal:'нормально',hard:'тяжело'}[s.mood]}</small>`:''}${s.notes?`<p>${esc(s.notes)}</p>`:''}</div><button class="history-action" data-open-session="${s.id}" title="Просмотреть и исправить">↗</button></article>`;}).join(''):`<div class="empty"><h3>Пока нет подходов</h3><p>Открой первую тренировку и начни упражнение — результат появится здесь.</p><button class="btn btn-primary" data-start="1:1">Начать</button></div>`}
 <div class="note-card"><strong>Резервная копия</strong><p>Экспорт сохраняет тот же формат JSON, что и в версии 1.0. Перед обновлением рекомендуем скачать резервную копию.</p></div>`;
}
const oldShell=shell;
shell=function(content){
 const nav=[['home','Сегодня','⌂'],['plan','Программа','▦'],['learn','Обучение','◈'],['history','Дневник','▥'],['account','Аккаунт','◉']];
 return `<div class="app-shell"><header class="topbar"><button class="brand" data-nav="home" aria-label="На главную"><span class="brand-mark">◇</span><span>СТАТИКА <small class="v2-brand-number">2.3 RC4</small></span></button><button class="top-profile" data-nav="account"><span id="sync-status" class="sync-pill ${syncBadge().cls}">${syncBadge().text}</span><span class="avatar">${state.user?'✓':'◌'}</span></button></header><main id="main" class="main">${content}</main><nav class="bottom-nav" aria-label="Разделы">${nav.map(([id,label,glyph])=>`<button data-nav="${id}" class="nav-link ${state.screen===id || (state.screen==='workout'&&v2.origin===id)?'active':''}" aria-current="${state.screen===id?'page':'false'}"><span class="nav-glyph">${glyph}</span><span>${label}</span></button>`).join('')}</nav></div>`;
};
render=function(){const screens={home,plan:planView,workout,learn:learning,history,account};$('#app').innerHTML=shell((screens[state.screen]||home)());};
navigate=function(screen){if(!['home','plan','workout','learn','history','account'].includes(screen))return;
 if(state.screen==='workout'&&screen!=='workout'&&['countdown','hold','rest'].includes(v2.stage))pauseMachine();
 state.screen=screen;render();window.scrollTo({top:0,behavior:'instant'});
};
finishWorkout=function(){const s=currentSession(),pg=selectedProgress();if(!s||pg.done===0){toast('Нет записанных подходов. Для просмотра завершать тренировку не нужно.');return;}
 if(pg.done<pg.total&&!confirm(`Выполнено ${pg.done} из ${pg.total} подходов. Сохранить как «Выполнено частично»?`))return;
 s.completed=pg.done===pg.total;touchSession(s);clearMachine();state.activeId=null;v2.historyReview=false;navigate('history');toast(pg.done===pg.total?'Тренировка выполнена полностью.':'Частичная тренировка сохранена.');
};
// События захватываются до обработчиков версии 1.0, чтобы поведение было единым.
document.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-v2-action],[data-v2-ex],[data-v2-slot],[data-v2-study],[data-v2-scene],[data-open-session]');if(!b)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 if(b.dataset.v2Study){switchToStudy(b.dataset.v2Study,state.screen==='workout'?'workout':'plan');return;}
 if(b.dataset.v2Scene){v2.studyBad=b.dataset.v2Scene==='wrong';render();return;}
 if(b.dataset.openSession){const s=state.sessions.find(x=>x.id===b.dataset.openSession);if(s)openWorkout(s.week,s.day,{sessionId:s.id,origin:'history'});return;}
 if(b.dataset.v2Ex!==undefined){if(['countdown','hold','rest','reps'].includes(v2.stage)){toast('Сначала приостанови или закончи текущий подход.');return;}state.exerciseIndex=Number(b.dataset.v2Ex);state.slotIndex=getNextSlot(selectedPlan().items[state.exerciseIndex],0);if(state.slotIndex<0)state.slotIndex=0;v2.stage='idle';render();return;}
 if(b.dataset.v2Slot!==undefined){if(['countdown','hold','rest','reps'].includes(v2.stage))return;state.slotIndex=Number(b.dataset.v2Slot);render();return;}
 switch(b.dataset.v2Action){
 case 'start':startApproaches();break;
 case 'pause':pauseMachine();break;
 case 'resume':audioInit();resumeMachine();break;
 case 'early':earlyEnd();break;
 case 'abort':clearMachine();render();break;
 case 'test-voice':{const prev=v2.voice;v2.voice=true;const ok=speak('Приготовься');v2.voice=prev;if(ok)toast('Проигрывается голос устройства «Приготовься».');else toast('Голос недоступен в текущем режиме. Звуковые сигналы работают.');break;}
 case 'reps':{if(v2.stage!=='reps')break;const amount=num($('#v2-reps-input')?.value,0,100);if(amount>=1)endApproach(amount);else toast('Укажи фактическое число повторений.');break;}
 case 'next':afterExercise();break;
 case 'continue-current':{
  if(bg2.player)stopRecordedTrack();
  const ex=selectedPlan().items[state.exerciseIndex];state.slotIndex=getNextSlot(ex,0);
  if(state.slotIndex<0){v2.stage='between';render();break;}
  v2.stage='idle';startApproaches();break;
 }
 case 'study-current':switchToStudy(selectedPlan().items[state.exerciseIndex].id,'workout');break;
 case 'back-to-training':navigate(v2.screenBeforeStudy==='workout'?'workout':'plan');break;
 case 'edit-set':{if(['countdown','hold','rest','reps'].includes(v2.stage)){toast('Сначала поставьте тренировку на паузу.');break;}const value=$('#v2-actual')?.value;if(!value||Number(value)<1){toast('Введите положительное число.');break;}persistSet(value);render();toast('Исправление сохранено.');break;}
 case 'finish':finishWorkout();break;
 }
},true);
document.addEventListener('change',ev=>{const el=ev.target;if(!el.dataset.v2Setting)return;
 if(el.dataset.v2Setting==='screen'){
  if(['countdown','hold','rest','reps'].includes(v2.stage)){toast('Переключи режим между упражнениями.');render();return;}
  bg2.mode=el.value==='locked'?'locked':'awake';updateMachineSettings();render();return;
 }
 if(['countdown','hold','rest','reps'].includes(v2.stage) && ['voice','sound'].includes(el.dataset.v2Setting)){
   toast('Звук и голос можно менять между упражнениями.');render();return;
 }
 if(el.dataset.v2Setting==='sound')v2.sound=el.checked;
 if(el.dataset.v2Setting==='voice'){if(el.checked&&!russianVoice()){v2.voice=false;toast('Русский голос пока недоступен на устройстве.');render();return;}v2.voice=el.checked;}
 if(el.dataset.v2Setting==='rest'){if(['countdown','hold','rest'].includes(v2.stage)){toast('Время отдыха можно менять между подходами.');el.value=String(v2.rest);return;}v2.rest=num(el.value,30,120);}
 updateMachineSettings();
},true);
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){
  if(bg2.mode==='awake'&&['countdown','hold','rest'].includes(v2.stage))pauseMachine();
  else if(bg2.mode==='locked'&&['countdown','hold','rest'].includes(v2.stage))bg2.lockedHiddenAt=Date.now();
 } else {
  if(bg2.mode==='awake'&&['countdown','hold','rest'].includes(v2.stage))requestScreenLock();
  if(bg2.player){reconcileRecordedTrack(true);if(bg2.lockedHiddenAt&&Date.now()-bg2.lockedHiddenAt>10000)toast('Проверь, все ли сигналы прозвучали при выключенном экране.');bg2.lockedHiddenAt=0;}
 }
});
window.addEventListener('focus',()=>{if(bg2.player)reconcileRecordedTrack(true);});
window.addEventListener('pageshow',()=>{if(bg2.player)reconcileRecordedTrack(true);});
window.addEventListener('pagehide',()=>{
 // При блокировке экрана pagehide может сработать на некоторых устройствах.
 // В экспериментальном режиме аудиодорожку не останавливаем принудительно.
 if(bg2.mode==='awake'&&['countdown','hold','rest'].includes(v2.stage))pauseMachine();
});

boot().catch(err=>{console.error(err);render();toast('Ошибка запуска: '+err.message);});
