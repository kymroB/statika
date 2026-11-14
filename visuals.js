/* Упрощённые авторские векторные схемы для обучения, без внешних изображений.
   Схемы не заменяют проверку техники у специалиста. */
(function(){
'use strict';
const line=(points,style='body')=>`<path class="${style}" d="${points}"/>`;
const head=(x,y,r=23)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#d4eee8" stroke="#173440" stroke-width="3"/>`;
const joint=(x,y)=>`<circle cx="${x}" cy="${y}" r="8" fill="#aedfc7" stroke="#16313a" stroke-width="3"/>`;
const note=(x,y,text,bad=false)=>`<text x="${x}" y="${y}" fill="${bad?'#ffc2b4':'#b6eccd'}" font-size="15" font-weight="700">${text}</text>`;
const stroke=(path,bad=false)=>`<path d="${path}" stroke="${bad?'#ffab9e':'#b0eccb'}" stroke-width="4" fill="none" stroke-dasharray="7 6" stroke-linecap="round"/>`;
const svg=(content,bad)=>`<svg viewBox="0 0 620 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${bad?'Схематическая иллюстрация распространённой ошибки':'Схематическая иллюстрация положения тела'}"><style>.body{fill:none;stroke:#d3ebe8;stroke-width:18;stroke-linecap:round;stroke-linejoin:round}.limb{fill:none;stroke:#c0deda;stroke-width:12;stroke-linecap:round;stroke-linejoin:round}.ground{fill:none;stroke:#557480;stroke-width:4;stroke-linecap:round}</style><path class="ground" d="M36 279H583"/>${content}<text x="26" y="306" fill="#91b2b5" font-size="12">СХЕМА ПОЛОЖЕНИЯ · НЕ ФОТО</text></svg>`;
function hanging(id,bad){const knee=id==='knee';const scap=id==='scap';let body=`<path class="ground" d="M110 40H505"/>${head(310,126)}${line('M242 44L273 168L310 176L350 168L378 44','limb')}${joint(242,44)}${joint(378,44)}${line('M310 177L310 226')}`;
 if(knee){body+=line(`M310 225L${bad?330:357} ${bad?266:237}L405 ${bad?281:248}`,'limb')+line('M310 225L287 237L254 249','limb')+note(406,172,bad?'Раскачивание':'Колени плавно вперёд',bad);}
 else body+=line('M310 226L275 271M310 226L346 271','limb')+note(397,150,bad?'Рывок / сгиб рук':scap?'Двигаются лопатки':'Активные плечи',bad);
 body+=bad?stroke('M378 85Q402 122 382 154',true):stroke('M387 92L387 151');return svg(body,bad);
}
function floorPlank(id,bad){const forearms=id==='plank',push=id==='push';let hipY=bad?190:120;const shoulderX=172,shoulderY=112,hipX=333,footX=511;const h=head(147,84,20);
 let body=h+line(`M${shoulderX} ${shoulderY}L${hipX} ${hipY}L${footX} 245`);
 body+=forearms?line('M172 112L179 251L120 251','limb'):line('M172 112L186 266','limb');
 body+=line('M511 245L523 273','limb')+joint(hipX,hipY)+note(348,92,bad?'Таз провисает':push?'Корпус стабилен':'Ровная линия',bad);
 body+=bad?stroke('M330 140L333 177',true):stroke('M173 97L336 110L498 233');return svg(body,bad);
}
function side(bad,full=false){let hip=bad?208:137;let body=head(138,64,21)+line(`M170 100L292 ${hip}L${full?502:405} ${full?253:235}`)+line('M170 100L171 267L113 267','limb');
 if(full)body+=line('M502 253L551 270','limb');else body+=line('M405 235L424 266L474 266','limb');
 body+=joint(171,267)+joint(292,hip)+note(355,118,bad?'Таз опущен':'Таз поднят',bad);
 body+=bad?stroke('M282 163L306 211',true):stroke('M171 100L292 137L405 235');return svg(body,bad);
}
function wall(bad){let body=`<path class="ground" d="M174 54V281"/>${head(197,81)}${line('M207 110L210 210L360 207L360 265')}${line('M210 139L258 166','limb')}${line('M360 265L425 265','limb')}${joint(210,210)}${joint(360,207)}${note(388,116,bad?'Колени внутрь':'Колени над стопами',bad)}`;
 if(bad)body+=stroke('M390 220L365 245',true);else body+=stroke('M360 209L360 260');return svg(body,bad);}
function bridge(bad){let h=bad?235:171;let body=head(116,239,20)+line(`M143 257L179 256L345 ${h}L440 240L460 274`)+line('M460 274L516 274','limb')+line('M180 256L241 266','limb')+joint(345,h)+note(285,104,bad?'Таз опущен':'Подними таз',bad);body+=bad?stroke('M343 177L343 225',true):stroke('M333 182L353 147');return svg(body,bad);}
function lunge(bad){let body=head(289,78)+line('M289 102L290 183')+line('M290 147L337 167','limb')+line(`M290 183L380 ${bad?228:209}L401 269`,'limb')+line('M290 183L217 223L187 269','limb')+joint(380,bad?228:209)+note(380,113,bad?'Колено нестабильно':'Колено по линии стопы',bad);body+=bad?stroke('M386 191L421 226',true):stroke('M380 215L397 266');return svg(body,bad);}
function seated(id,bad){const support=id==='support',tuck=id==='tuck';let hip=bad?261:230,foot=tuck?385:485;
 let body=head(224,93)+line(`M228 120L234 ${hip}L${tuck?332:415} ${tuck?244:250}L${foot} ${tuck?263:262}`);
 body+=line(`M235 149L193 262L180 268`,'limb')+joint(234,hip);
 if(tuck)body+=line('M332 244L384 263','limb');
 body+=note(357,121,bad?'Сильно отклонился назад':support?'Плечи вниз':tuck?'Стопы слегка подняты':'Одна стопа поднята',bad);
 body+=bad?stroke('M233 159L201 222',true):stroke('M225 122L234 215');
 return svg(body,bad);
}
function lying(id,bad){const dead=id==='deadbug';let body=head(129,235,21)+line('M155 253L348 253')+line('M216 253L212 180L256 127','limb');
 if(dead)body+=line('M347 253L361 175L439 175','limb')+line('M342 253L421 220L460 256','limb');
 else body+=line('M348 253L358 173L434 173','limb');
 body+=note(387,91,bad?'Поясница выгнута':'Поясница стабильна',bad);
 body+=bad?stroke('M238 259Q290 222 331 261',true):stroke('M170 260L342 260');return svg(body,bad);}
function balance(bad){let body=head(300,68)+line(`M300 92L${bad?265:306} 181L306 250L300 269`)+line('M307 186L375 225L413 218','limb')+line('M298 143L266 160M308 143L344 165','limb')+note(365,103,bad?'Потеря равновесия':'Стена рядом',bad);body+=bad?stroke('M293 94L260 156',true):stroke('M306 105L305 238');return svg(body,bad);}
const fallbacks={plank:'floor',high:'floor',push:'floor',side:'side',shortside:'side',wall:'wall',bridge:'bridge',lunge:'lunge',deadbug:'lying',hollow:'lying',leglift:'seated',tuck:'seated',support:'seated',balance:'balance',hang:'hang',scap:'hang',knee:'hang'};
window.StaticDiagram=(id,bad=false)=>{switch(fallbacks[id]){
 case 'hang':return hanging(id,bad);case 'floor':return floorPlank(id,bad);case 'side':return side(bad,id==='shortside');case 'wall':return wall(bad);case 'bridge':return bridge(bad);case 'lunge':return lunge(bad);case 'lying':return lying(id,bad);case 'seated':return seated(id,bad);case 'balance':return balance(bad);default:return svg(note(100,130,'Схема пока не готова'),bad);
}};
})();
