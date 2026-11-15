/* Статика: персональный тренажёр без сторонних JS-зависимостей.
 * Сессии работают без сети. Supabase Auth + PostgREST включаются после настройки.
 */
const VERSION = self.STATIKA_VERSION;
const rc7Time = seconds => {const n=Math.max(0,Math.floor(Number(seconds)||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
const rc72Clock = (phase,remaining,duration) => phase==='countdown' ? '-'+rc7Time(Math.max(0,Math.ceil(remaining))) : phase==='hold' ? rc7Time(Math.min(duration,Math.floor(Math.max(0,duration-remaining)))) : rc7Time(Math.max(0,Math.ceil(remaining)));
let rc7PickerOpen=false;
let rc7SheetParent=null;
const rc7Icon=(name)=>({sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/></svg>',mute:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/></svg>',info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8v.2"/></svg>',more:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>'})[name];
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
let diaryOpenedId=null;
let diaryEditingId=null;
function diaryCompletedCount(s){const p=plan(s.week,s.day);return p.items.filter(ex=>{const a=s.sets?.[ex.id]||[];return Array.from({length:countSlots(ex)},(_,i)=>a[i]).every(x=>Number(x)>0);}).length;}
function diaryFull(s){return diaryCompletedCount(s)===plan(s.week,s.day).items.length;}
function diaryLabel(s){return diaryFull(s)?'Завершено':s.completed?'Завершена частично':'В процессе';}
function diaryCard(s){const p=plan(s.week,s.day),done=diaryCompletedCount(s),pct=Math.round(100*done/p.items.length),full=diaryFull(s);
 return `<button type="button" class="diary-card ${!full?'diary-incomplete':''}" data-diary-open="${s.id}"><span class="diary-status-icon ${full?'complete':''}">${full?'✓':'◔'}</span><span class="diary-card-body"><span class="diary-card-title">День ${s.day} · ${esc(p.title)}</span><span class="diary-card-detail">Выполнено ${done} из ${p.items.length} упражнений</span><span class="diary-meter"><span style="width:${pct}%"></span></span></span><span class="diary-card-side"><span class="diary-tag ${full?'done':''}">${diaryLabel(s)}</span><span class="diary-pct">${pct}%</span></span><span class="diary-arrow">›</span></button>`;
}
function diaryOverview(){const all=state.sessions.filter(s=>progress(s).done>0).sort((a,b)=>new Date(b.performed_at)-new Date(a.performed_at));const full=all.filter(diaryFull).length,partial=all.length-full,sets=all.reduce((a,s)=>a+progress(s).done,0);
 const groups=new Map();for(const s of all){if(!groups.has(s.week))groups.set(s.week,[]);groups.get(s.week).push(s);}
 return `<section class="diary-screen"><div class="diary-heading"><h1>Дневник</h1><button class="diary-export" data-action="export" type="button" title="Скачать резервную копию">Экспорт ↧</button></div><div class="diary-stats"><div><span>Завершено</span><strong>${full}</strong></div><div><span>В процессе</span><strong>${partial}</strong></div><div><span>Всего подходов</span><strong>${sets}</strong></div></div>${all.length?[...groups.entries()].map(([week,entries])=>`<section class="diary-week"><h2>НЕДЕЛЯ ${week}</h2>${entries.map(diaryCard).join('')}</section>`).join(''):`<div class="empty"><h3>Пока нет записей</h3><p>Результаты появятся после первого сохранённого подхода.</p><button class="btn btn-primary" data-start="1:1">Начать тренировку</button></div>`}</section>`;
}
function diaryDetail(s){const p=plan(s.week,s.day),done=diaryCompletedCount(s),pct=Math.round(100*done/p.items.length),full=diaryFull(s),editing=diaryEditingId===s.id;
 return `<section class="diary-screen diary-detail"><button class="diary-back" data-diary-back>← Дневник</button><div class="diary-eyebrow">НЕДЕЛЯ ${s.week} · ДЕНЬ ${s.day}</div><div class="diary-detail-heading"><h1>${esc(p.title)}</h1><span class="diary-tag ${full?'done':''}">${diaryLabel(s)}</span></div><div class="diary-meta">${fmtDate(s.performed_at)} · ${progress(s).done} из ${progress(s).total} подходов</div><div class="diary-progress"><div><span>Выполнено <b>${done} из ${p.items.length}</b> упражнений</span><strong>${pct}%</strong></div><span class="diary-meter"><span style="width:${pct}%"></span></span></div><div class="diary-exercises">${p.items.map(ex=>{const arr=s.sets?.[ex.id]||[],n=countSlots(ex),complete=Array.from({length:n},(_,i)=>arr[i]).every(x=>Number(x)>0),recorded=Array.from({length:n},(_,i)=>arr[i]).filter(x=>Number(x)>0);return `<article class="diary-exercise"><div class="diary-ex-row"><span class="diary-ex-check ${complete?'complete':''}">${complete?'✓':''}</span><div><strong>${esc(LIB[ex.id].name)}</strong><span>${recorded.length?`${recorded.length} из ${n} подходов · ${recorded.join(', ')} ${ex.kind==='hold'?'сек':'повт'}`:'Не выполнено · '+amountLabel(ex)}</span></div></div>${editing?`<div class="diary-edit-sets">${Array.from({length:n},(_,i)=>`<label>${esc(slotLabel(ex,i))}<input type="number" inputmode="numeric" min="0" max="${ex.kind==='hold'?300:100}" value="${arr[i]>0?arr[i]:''}" placeholder="—" data-diary-set="${esc(ex.id)}" data-diary-index="${i}" aria-label="${esc(LIB[ex.id].name)} ${esc(slotLabel(ex,i))}"></label>`).join('')}</div>`:''}</article>`;}).join('')}</div>${editing?`<button class="diary-primary" data-diary-save="${s.id}">Сохранить изменения</button><button class="diary-secondary" data-diary-cancel>Отмена</button>`:`${!full?`<button class="diary-primary" data-diary-resume="${s.id}">▶ Продолжить тренировку</button>`:''}<button class="diary-secondary" data-diary-edit="${s.id}">✎ Редактировать результаты</button>`}</section>`;
}
function history(){const s=state.sessions.find(x=>x.id===diaryOpenedId);if(diaryOpenedId&&!s){diaryOpenedId=null;diaryEditingId=null;}return s?diaryDetail(s):diaryOverview();}

const oldShell=shell;
shell=function(content){
 const nav=[['home','Сегодня','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m3 11 9-8 9 8v10H3z"/></svg>'],['plan','Программа','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>'],['history','Дневник','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h8M8 17h5"/></svg>'],['account','Аккаунт','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></svg>']];
 return `<div class="app-shell"><header class="topbar"><button class="brand" data-nav="home" aria-label="На главную"><span class="brand-mark">◇</span><span>СТАТИКА</span></button><button class="top-profile" data-nav="account"><span id="sync-status" class="sync-pill ${syncBadge().cls}">${syncBadge().text}</span><span class="avatar">${state.user?'✓':'◌'}</span></button></header><main id="main" class="main">${content}</main><nav class="bottom-nav" aria-label="Разделы">${nav.map(([id,label,glyph])=>`<button data-nav="${id}" class="nav-link ${state.screen===id || (state.screen==='workout'&&v2.origin===id)?'active':''}" aria-current="${state.screen===id?'page':'false'}"><span class="nav-glyph">${glyph}</span><span>${label}</span></button>`).join('')}</nav></div>`;
};
render=function(){const screens={home,plan:planView,workout,learn:learning,history,account};$('#app').innerHTML=shell((screens[state.screen]||home)());};
navigate=function(screen){if(screen!=='history'){diaryOpenedId=null;diaryEditingId=null;}if(!['home','plan','workout','learn','history','account'].includes(screen))return;
 if(state.screen==='workout'&&screen!=='workout'&&['countdown','hold','rest'].includes(v2.stage))pauseMachine();
 state.screen=screen;render();window.scrollTo({top:0,behavior:'instant'});
};
finishWorkout=function(){const s=currentSession(),pg=selectedProgress();if(!s||pg.done===0){toast('Нет записанных подходов. Для просмотра завершать тренировку не нужно.');return;}
 if(pg.done<pg.total&&!confirm(`Выполнено ${pg.done} из ${pg.total} подходов. Сохранить как «Выполнено частично»?`))return;
 s.completed=pg.done===pg.total;touchSession(s);clearMachine();state.activeId=null;v2.historyReview=false;navigate('history');toast(pg.done===pg.total?'Тренировка выполнена полностью.':'Частичная тренировка сохранена.');
};
// RC7.3 diary: distinct read/edit flow, never the timer screen.
document.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-diary-open],[data-diary-back],[data-diary-resume],[data-diary-edit],[data-diary-save],[data-diary-cancel]');if(!b)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 if(b.dataset.diaryOpen){diaryOpenedId=b.dataset.diaryOpen;diaryEditingId=null;render();window.scrollTo(0,0);return;}
 if(b.hasAttribute('data-diary-back')){diaryOpenedId=null;diaryEditingId=null;render();window.scrollTo(0,0);return;}
 if(b.hasAttribute('data-diary-cancel')){diaryEditingId=null;render();return;}
 if(b.dataset.diaryEdit){diaryEditingId=b.dataset.diaryEdit;render();return;}
 if(b.dataset.diaryResume){const s=state.sessions.find(x=>x.id===b.dataset.diaryResume);if(s){diaryOpenedId=null;diaryEditingId=null;openWorkout(s.week,s.day,{origin:'plan'});}return;}
 if(b.dataset.diarySave){const s=state.sessions.find(x=>x.id===b.dataset.diarySave);if(!s)return;
 const inputs=[...document.querySelectorAll('[data-diary-set]')];const updates={};for(const input of inputs){const raw=input.value.trim(),val=raw===''?0:Number(raw);if(!Number.isInteger(val)||val<0||val>Number(input.max)){toast('Проверь значения подходов: нужны целые числа в допустимом диапазоне.');input.focus();return;}const id=input.dataset.diarySet;updates[id] ||= [...(s.sets[id]||[])];updates[id][Number(input.dataset.diaryIndex)]=val;}
 for(const [id,arr] of Object.entries(updates))s.sets[id]=arr;s.completed=diaryFull(s);touchSession(s);diaryEditingId=null;render();toast('Результаты сохранены.');return;}
},true);
// События захватываются до обработчиков версии 1.0, чтобы поведение было единым.
function rc5Close(){document.getElementById('rc5-modal')?.remove();}
function rc5Modal(title,body,back=false){rc5Close();const el=document.createElement('div');el.id='rc5-modal';el.className='rc5-modal';el.innerHTML=`<div class="rc5-scrim" data-rc5-close></div><section class="rc5-sheet" role="dialog" aria-modal="true" aria-label="${title}"><header>${back?'<button class="rc7-back" data-rc7-back aria-label="Назад к действиям">← Действия</button>':''}<strong>${title}</strong><button data-rc5-close aria-label="Закрыть">×</button></header>${body}</section>`;document.body.appendChild(el);document.body.classList.add('rc5-modal-open');el.querySelector('[data-rc5-close]')?.focus();}
function rc5Dismiss(){rc5Close();document.body.classList.remove('rc5-modal-open');}
function rc5Tech(tab='ready'){
 const ex=selectedPlan().items[state.exerciseIndex],data=LIB[ex.id];
 const tabs=[['rest','Отдых'],['ready','Старт'],['active','Фиксация']];
 const photo=ex.id==='hang'?`<img src="./media/hang-${tab}.webp" alt="${esc(data.name)}: ${tabs.find(x=>x[0]===tab)[1]}">`:`<div class="rc5-modal-diagram">${window.StaticDiagram?window.StaticDiagram(ex.id,false):''}</div>`;
 const copy=tab==='rest'?'Естественное расслабленное положение между подходами.':tab==='ready'?'Подготовься к упражнению, проверь опору и положение тела.':esc(data.instruction);
 rc5Modal('Техника · '+esc(data.name),`<div class="rc5-tabs">${tabs.map(([key,label])=>`<button data-rc5-tab="${key}" class="${key===tab?'selected':''}">${label}</button>`).join('')}</div><div class="rc5-modal-photo">${photo}</div><h3>${tabs.find(x=>x[0]===tab)[1]}</h3><p>${copy}</p><p class="rc5-cue">${esc(data.cue)}</p><h3>Частые ошибки</h3><ul class="rc7-errors">${(ERRORS[ex.id]||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="rc7-easier">Если сложно: ${esc(data.fallback)}</p>`);
}
function rc5Menu(){
 const advanced=document.getElementById('rc5-advanced');
 rc5Modal('Действия',`<div class="rc5-menu-actions"><button data-rc5="settings">⚙ Настройки тренировки <span>›</span></button><button data-rc5="edit">✎ Исправить результат <span>›</span></button><button data-rc5="finish">⚑ Завершить тренировку <span>›</span></button></div>`);
}
document.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-rc5],[data-rc5-close],[data-rc5-tab],[data-rc7-back]');if(!b)return;
 if(b.hasAttribute('data-rc5-close')){rc5Dismiss();return;}
 if(b.hasAttribute('data-rc7-back')){rc5Menu();return;}
 if(b.dataset.rc5Tab){rc5Tech(b.dataset.rc5Tab);return;}
 switch(b.dataset.rc5){
 case 'tech':if(['countdown','hold','rest'].includes(v2.stage))pauseMachine();rc5Tech(v2.stage==='hold'?'active':v2.stage==='rest'?'rest':'ready');break;
 case 'menu':rc5Menu();break;
 case 'sound':if(['countdown','hold','rest'].includes(v2.stage)){toast('Звук можно изменить после остановки отсчёта.');break;}v2.sound=!v2.sound;updateMachineSettings();render();break;
 case 'settings':case 'edit':{
   const selector=b.dataset.rc5==='settings'?'.v23-settings':'.v2-edit';const source=document.querySelector('#rc5-advanced '+selector);
   const html=source?source.innerHTML:'Настройки недоступны';rc5Modal(b.dataset.rc5==='settings'?'Настройки тренировки':'Исправить результат',`<div class="rc5-modal-settings">${html}</div>`,true);break;
 }
 case 'finish':rc5Dismiss();finishWorkout();break;
 }
},false);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')rc5Dismiss();});
document.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-rc7-picker],[data-v2-action],[data-v2-ex],[data-v2-slot],[data-v2-study],[data-v2-scene],[data-open-session]');if(!b)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 if(b.dataset.rc7Picker==='toggle'){if(['countdown','hold','rest','reps'].includes(v2.stage))return;rc7PickerOpen=!rc7PickerOpen;render();return;}
 if(b.dataset.v2Study){switchToStudy(b.dataset.v2Study,state.screen==='workout'?'workout':'plan');return;}
 if(b.dataset.v2Scene){v2.studyBad=b.dataset.v2Scene==='wrong';render();return;}
 if(b.dataset.openSession){const s=state.sessions.find(x=>x.id===b.dataset.openSession);if(s)openWorkout(s.week,s.day,{sessionId:s.id,origin:'history'});return;}
 if(b.dataset.v2Ex!==undefined){rc7PickerOpen=false;if(['countdown','hold','rest','reps'].includes(v2.stage)){toast('Сначала приостанови или закончи текущий подход.');return;}state.exerciseIndex=Number(b.dataset.v2Ex);state.slotIndex=getNextSlot(selectedPlan().items[state.exerciseIndex],0);if(state.slotIndex<0)state.slotIndex=0;v2.stage='idle';render();return;}
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
 case 'edit-set':{if(['countdown','hold','rest','reps'].includes(v2.stage)){toast('Сначала поставьте тренировку на паузу.');break;}const value=document.querySelector('#rc5-modal #v2-actual')?.value||$('#v2-actual')?.value;if(!value||Number(value)<1){toast('Введите положительное число.');break;}persistSet(value);render();toast('Исправление сохранено.');break;}
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
  if(bg2.mode==='awake'&&['countdown','hold','rest'].includes(v2.stage))scheduleBackgroundPauseCheck();
  else if(bg2.mode==='locked'&&['countdown','hold','rest'].includes(v2.stage))bg2.lockedHiddenAt=Date.now();
 } else {
  cancelBackgroundPauseCheck();
  if(bg2.mode==='awake'&&['countdown','hold','rest'].includes(v2.stage))requestScreenLock();
  if(bg2.player){reconcileRecordedTrack(true);if(bg2.lockedHiddenAt&&Date.now()-bg2.lockedHiddenAt>10000)toast('Проверь, все ли сигналы прозвучали при выключенном экране.');bg2.lockedHiddenAt=0;}
 }
});
window.addEventListener('focus',()=>{if(bg2.player)reconcileRecordedTrack(true);});
window.addEventListener('pageshow',()=>{if(bg2.player)reconcileRecordedTrack(true);});
window.addEventListener('pagehide',()=>{
 // При блокировке экрана pagehide может сработать на некоторых устройствах.
 // В экспериментальном режиме аудиодорожку не останавливаем принудительно.
 if(bg2.mode==='awake'&&['countdown','hold','rest'].includes(v2.stage))scheduleBackgroundPauseCheck();
});

boot().catch(err=>{console.error(err);render();toast('Ошибка запуска: '+err.message);});
