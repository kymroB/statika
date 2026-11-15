/* Статика 2.1: Wake Lock и аудиодорожка статического упражнения.
 * Для заблокированного экрана — экспериментальный режим. Ни одна веб-API
 * не гарантирует фоновое воспроизведение на всех версиях iOS/Android.
 */
const VOICE_SR = 11025;
// Вместо искажённой PCM-речи 2.1 используем сигналы и доступный русский голос ОС.
function wavBlobFromSamples(samples){
 const pcm=new ArrayBuffer(44+samples.length*2),v=new DataView(pcm);
 const chars=(pos,str)=>{for(let i=0;i<str.length;i++)v.setUint8(pos+i,str.charCodeAt(i));};
 chars(0,'RIFF');v.setUint32(4,36+samples.length*2,true);chars(8,'WAVE');chars(12,'fmt ');
 v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
 v.setUint32(24,VOICE_SR,true);v.setUint32(28,VOICE_SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
 chars(36,'data');v.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){
  const y=Math.max(-1,Math.min(1,samples[i]));v.setInt16(44+i*2,Math.round(y*32767),true);
 }
 return new Blob([pcm],{type:'audio/wav'});
}
function screenModeStatus(){
 if(bg2.mode==='locked')return 'Экспериментальный режим. Для статических удержаний используется аудиодорожка; работа при блокировке не гарантируется. Упражнения на повторения отмечаются вручную.';
 if(!window.isSecureContext||!('wakeLock' in navigator))return 'Wake Lock недоступен при запуске из файла. После публикации на HTTPS можно будет удерживать экран включённым.';
 if(bg2.wakeState==='active')return 'Экран удерживается включённым во время активного упражнения.';
 if(bg2.wakeState==='error')return 'Система не разрешила Wake Lock: проверь энергосбережение и настройки браузера.';
 return 'Когда начнёшь упражнение, приложение запросит разрешение не выключать экран.';
}
function updateScreenStatus(){const el=document.querySelector('#v21-mode-status');if(el)el.textContent=screenModeStatus();}
async function requestScreenLock(){
 if(bg2.mode!=='awake'||document.hidden||state.screen!=='workout'||bg2.wake)return;
 if(!window.isSecureContext||!('wakeLock' in navigator)){
  bg2.wakeState='unsupported';updateScreenStatus();return;
 }
 try{
  const sentinel=await navigator.wakeLock.request('screen');
  if(bg2.mode!=='awake'||document.hidden||state.screen!=='workout'){await sentinel.release();return;}
  bg2.wake=sentinel;bg2.wakeState='active';updateScreenStatus();
  sentinel.addEventListener('release',()=>{
   if(bg2.wake===sentinel){bg2.wake=null;bg2.wakeState='idle';updateScreenStatus();}
  });
 }catch(e){bg2.wakeState='error';updateScreenStatus();console.info('WakeLock:',e.message);}
}
function releaseScreenLock(){
 const old=bg2.wake;bg2.wake=null;bg2.wakeState='idle';
 if(old)old.release().catch(()=>{});
 updateScreenStatus();
}
function stopMediaTick(){if(bg2.interval)clearInterval(bg2.interval);bg2.interval=null;}
function stopRecordedTrack(){
 stopMediaTick();
 if(bg2.player){try{bg2.player.pause();bg2.player.removeAttribute('src');bg2.player.load();}catch{}}
 if(bg2.track?.url)URL.revokeObjectURL(bg2.track.url);
 bg2.player=null;bg2.track=null;bg2.cursor=0;bg2.currentPhase=null;bg2.lastMediaPosition=-1;bg2.lastMediaAdvance=0;
 if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='none';}catch{}}
}
function buildExerciseAudio(ex,slots){
 const events=[];
 let t=0;
 const times=[];
 for(let i=0;i<slots.length;i++){
  const slot=slots[i],last=i===slots.length-1,prepareTime=t;
  const pre=ex.sides===2?3:1.5, countStart=t+pre;
  const holdStart=countStart+3,holdEnd=holdStart+ex.target;
  events.push({at:prepareTime,type:'phase',phase:'countdown',end:holdStart,slot});
  events.push({at:holdStart,type:'phase',phase:'hold',end:holdEnd,slot});
  events.push({at:holdEnd,type:'complete',slot,target:ex.target});
  events.push({at:holdEnd,type:'phase',phase:last?'between':'rest',end:holdEnd+(last?1.5:v2.rest),slot:last?slot:slots[i+1]});
  times.push({last,slot,prepareTime,countStart,holdStart,holdEnd});
  t=holdEnd+(last?1.5:v2.rest);
 }
 const sr=VOICE_SR,mix=new Float32Array(Math.ceil((t+.05)*sr));
 // Очень тихая непрерывная дорожка: помогает некоторым браузерам не останавливать аудиоплеер.
 for(let i=0;i<mix.length;i++)mix[i]=0.00007*Math.sin(2*Math.PI*180*i/sr);
 function tone(at,frequency,volume=.15,length=.17){
  if(!v2.sound)return;
  const off=Math.max(0,Math.round(at*sr)),n=Math.round(length*sr);
  for(let j=0;j<n && off+j<mix.length;j++)mix[off+j]+=volume*Math.sin(Math.PI*j/n)**2*Math.sin(2*Math.PI*frequency*j/sr);
 }
 for(const x of times){
  // Три высоких коротких сигнала перед упражнением; отдельный стартовый сигнал.
  for(let j=0;j<3;j++)tone(x.countStart+j,850,.18,.15);
  tone(x.holdStart,1300,.25,.28);
  // Окончание удержания: два низких сигнала. При полном завершении упражнения — три.
  tone(x.holdEnd,530,.23,.30);tone(x.holdEnd+.38,530,.23,.30);
  if(x.last)tone(x.holdEnd+.8,720,.2,.24);
 }
 return {url:URL.createObjectURL(wavBlobFromSamples(mix)),events,seconds:t,exId:ex.id};
}
function startMediaTick(){stopMediaTick();bg2.interval=setInterval(()=>reconcileRecordedTrack(!document.hidden),140);}
function reconcileRecordedTrack(checkStall=false){
 const player=bg2.player,track=bg2.track;
 if(!player||!track)return;
 const time=Math.max(0,player.currentTime||0);
 // Android может отправить ended с задержкой после погасшего экрана.
 const finished=!!player.ended || (Number.isFinite(player.duration)&&player.duration>0&&time>=player.duration-.10);
 const effectiveTime=finished?Math.max(time,track.seconds):time;
 let redraw=false;
 while(bg2.cursor<track.events.length && track.events[bg2.cursor].at<=effectiveTime+.045){
  const event=track.events[bg2.cursor++];
  if(event.type==='complete'){
   state.slotIndex=event.slot;
   const ex=selectedPlan().items[state.exerciseIndex],s=currentSession();
   if(ex && !((s?.sets?.[ex.id]||[])[event.slot]>0))persistSet(event.target);
   redraw=true;
  }else if(event.type==='phase'){
   if(v2.stage!==event.phase)redraw=true;
   if(event.phase==='hold'){const ex=selectedPlan().items[state.exerciseIndex];safeWrite('statika.v23.inflight',{sessionId:currentSession()?.id||null,week:v2.selected.week,day:v2.selected.day,exercise:ex.id,slot:event.slot,at:Date.now()});}
   v2.stage=event.phase;v2.stageBefore=null;
   v2.duration=Math.max(0,event.end-event.at);
   v2.remaining=Math.max(0,event.end-effectiveTime);
   if(['countdown','hold','rest'].includes(event.phase))state.slotIndex=event.slot;
   bg2.currentPhase=event;
   if(bg2.mode==='awake' && v2.voice && !bg2.player){
    if(event.phase==='countdown')speak('Приготовься');
    if(event.phase==='hold')speak('Начали');
    if(event.phase==='rest')speak('Отдых');
    if(event.phase==='between')speak('Упражнение завершено');
   }
  }
 }
 if(bg2.currentPhase&&v2.stage!=='paused')v2.remaining=Math.max(0,bg2.currentPhase.end-effectiveTime);
 if(typeof updateV24Progress==='function')updateV24Progress();
 if(v2.stage==='between'){
  releaseScreenLock();stopMediaTick();
 }else if(checkStall && !document.hidden && !player.ended){
  const stamp=performance.now();
  if(time>(bg2.lastMediaPosition??-1)+.015){bg2.lastMediaPosition=time;bg2.lastMediaAdvance=stamp;}
  else if(player.paused && ['countdown','hold','rest'].includes(v2.stage)){
   v2.stageBefore=v2.stage;v2.stage='paused';stopMediaTick();redraw=true;
   toast('Аудио приостановлено браузером. Нажми «Продолжить».');
  }else if(!player.paused&&stamp-(bg2.lastMediaAdvance||stamp)>2400&&['countdown','hold','rest'].includes(v2.stage)){
   // Нельзя автоматически начислять подход, если аудиодорожка не дошла до его окончания.
   v2.stageBefore=v2.stage;v2.stage='paused';player.pause();stopMediaTick();redraw=true;
   toast('Аудио остановилось. Возобнови тренировку вручную.');
  }
 }
 if(redraw&&state.screen==='workout'&&!document.hidden)render();
 else if(state.screen==='workout'&&!document.hidden){
  const el=document.getElementById('v2-clock');if(el)el.textContent=String(Math.ceil(v2.remaining));
 }
}
function setupMediaSession(ex){
 if(!('mediaSession' in navigator))return;
 try{
  if('MediaMetadata' in window)navigator.mediaSession.metadata=new MediaMetadata({title:'Статика · '+LIB[ex.id].name,artist:'Автоматическая тренировка',album:'Статика 2.2'});
  navigator.mediaSession.playbackState='playing';
  for(const [act,callback] of [['play',()=>resumeMachine()],['pause',()=>pauseMachine()]]){
   try{navigator.mediaSession.setActionHandler(act,callback);}catch{}
  }
 }catch{}
}
function startRecordedTrack(){
 if(!['idle','between'].includes(v2.stage))return;
 const ex=selectedPlan().items[state.exerciseIndex];if(!ex||ex.kind!=='hold')return;
 if(bg2.mode==='locked'&&!v2.sound){toast('Для режима с выключенным экраном включи звуковые сигналы.');return;}
 stopRecordedTrack();
 const current=currentSession(),old=current?.sets?.[ex.id]||[];
 let slots=[];for(let i=state.slotIndex;i<countSlots(ex);i++)if(!(old[i]>0))slots.push(i);
 if(!slots.length){v2.stage='between';render();return;}
 const track=buildExerciseAudio(ex,slots);
 const player=new Audio(track.url);player.preload='auto';player.playsInline=true;
 bg2.player=player;bg2.track=track;bg2.cursor=0;bg2.currentPhase=null;bg2.lastMediaPosition=-1;bg2.lastMediaAdvance=performance.now();
 player.addEventListener('timeupdate',()=>reconcileRecordedTrack(false));
 player.addEventListener('seeked',()=>reconcileRecordedTrack(true));
 player.addEventListener('playing',()=>{bg2.lastMediaPosition=player.currentTime;bg2.lastMediaAdvance=performance.now();reconcileRecordedTrack(false);});
 player.addEventListener('pause',()=>{if(bg2.player===player&&!player.ended&&['countdown','hold','rest'].includes(v2.stage)){v2.stageBefore=v2.stage;v2.stage='paused';stopMediaTick();if(!document.hidden)render();}});
 player.addEventListener('ended',()=>{reconcileRecordedTrack(true);stopMediaTick();if(v2.stage!=='between'){v2.stage='between';v2.remaining=0;if(!document.hidden)render();}releaseScreenLock();});
 player.addEventListener('error',()=>{toast('Не удалось воспроизвести аудиодорожку. Попробуй режим с включённым экраном.');pauseMachine();});
 v2.stage='countdown';v2.remaining=0;v2.historyReview=false;
 const playPromise=player.play();
 if(bg2.mode==='awake')requestScreenLock();
 setupMediaSession(ex);
 if(playPromise && typeof playPromise.then==='function')playPromise.then(()=>{
  startMediaTick();reconcileRecordedTrack(false);
 }).catch(err=>{
  stopRecordedTrack();v2.stage='idle';releaseScreenLock();render();toast('Не удалось начать аудио: '+err.message);
 });
 render();
}
