/* Panel flow: VOC detail and processing open in a right-side panel over the list, so the left menu stays where the user started. Fixture data only. */
const pfOld={render,go};
state.uxPanel=null;
function pfOpen(kind,id){state.uxPanel={kind,id};if(kind==='case')state.caseId=id;else{state.vsel=id;state.vview='clean'}if(state.page==='case')state.page='home';render()}
function pfClose(){state.uxPanel=null;render()}
uxOpen=function(id,tab='work'){state.uxTab=tab;state.tab=tab;pfOpen('case',id)};
openCase=uxOpen;
selVoice=function(id){const v=vq(id);if(!v)return;v.caseId?uxOpen(v.caseId):pfOpen('voice',id)};
uxRowAction=function(v){const c=state.cases[v.caseId];return c?`uxOpen('${c.id}')`:`selVoice('${v.id}')`};
ukCapture=function(c){const d=uxDraft(c);if(state.uxPanel?.kind==='case'&&state.caseId===c.id&&uxCan(c)){d.decision=$('ux-decision')?.value??d.decision;d.result=$('ux-result')?.value??d.result}};
go=function(page){if(page==='case'){const id=state.caseId||visibleCases()[0]?.id;if(id)uxOpen(id);return}state.uxPanel=null;pfOld.go(page)};
function pfNav(){$('nav').querySelectorAll('.nav-btn').forEach(b=>{if(b.getAttribute('onclick')==="go('case')")b.remove()});$('nav').querySelectorAll('.nav-label').forEach(l=>{if(!l.nextElementSibling||l.nextElementSibling.classList.contains('nav-label'))l.remove()});$('mobile-menu').querySelector('option[value="case"]')?.remove()}
function pfVoicePage(){if(state.page!=='voice')return;const main=$('main');
 main.querySelector('.tri-layout')?.remove();
 main.querySelectorAll('.page-head .head-acts .btn.primary').forEach(b=>b.classList.remove('primary'));
 main.querySelectorAll('.q-table tbody tr').forEach(tr=>tr.classList.toggle('active',state.uxPanel?.kind==='voice'&&tr.getAttribute('onclick')===`selVoice('${state.uxPanel.id}')`));
 const table=main.querySelector('.q-table')?.closest('.panel');if(table&&!main.querySelector('.pf-hint'))table.querySelector('.panel-head')?.insertAdjacentHTML('afterend','<p class="pf-hint">문의를 누르면 오른쪽에 상세가 열립니다. 담당 지정부터 종결까지 그 안에서 진행합니다.</p>')}
/* Review: the step's main button also sits at the top; when submit is blocked, the bar lists exactly what is missing. */
const PF_FIELDS={title:'제목',procedure:'조치·절차',result:'결과',limits:'적용 조건·한계'};
const PF_HINTS=['담당자의 조치와 선택 이유를 확인해 작성하세요.','처리 결과가 아직 확인되지 않았습니다.','적용 조건·예외와 주의사항을 확인해 작성하세요.'];
function pfFieldEl(key,text){return $('uk-'+key)||[...$('main').querySelectorAll('.comparison p,.comparison h2,.comparison h3,.document p')].find(e=>e.textContent.trim()===text)}
function pfGoField(key){const c=state.cases[state.uxReviewCase],v=(ukBody(c)||{})[key]||'',el=pfFieldEl(key,v.trim());if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.focus?.()}
function pfGoEl(sel){const el=$('main').querySelector(sel);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.focus?.()}
function pfMissing(c){const k=ukRecord(c),out=[];if(!k?.draft)return out;const generic=c.id!=='C-2041',open=taskAgg(c.id).open.length;
 if(open)out.push([`필수 협업 회신 ${open}건이 남아 있습니다.`,'협업 확인',`uxOpen('${c.id}','tasks')`]);
 if(!c.closed)out.push(['VOC를 아직 종결하지 않았습니다. 종결하면 상신할 수 있습니다.','VOC 처리로',`uxOpen('${c.id}')`]);
 const body=ukBody(c)||{},edit=generic&&k.editing;
 for(const [key,label] of Object.entries(PF_FIELDS)){const saved=(body[key]||'').trim(),now=edit?(k.editing[key]||'').trim():saved,hint=PF_HINTS.includes(saved)||!saved;
  if(hint&&(!now||PF_HINTS.includes(now)))out.push([`초안의 ‘${label}’ 칸이 안내 문구 그대로입니다. 실제 내용으로 바꿔 주세요.`,'칸으로 이동',`pfGoField('${key}')`,key]);
  else if(hint)out.push([`‘${label}’ 칸을 고쳤지만 아직 저장하지 않았습니다. 수정 사유를 적고 ‘초안 수정본 저장’을 눌러 주세요.`,'저장 위치로',`pfGoEl('#uk-edit-reason')`,key])}
 if(edit&&!out.some(x=>x[2].startsWith('pfGoEl')))out.push(['초안을 고친 뒤 저장하지 않았습니다. 수정 사유를 적고 ‘초안 수정본 저장’을 눌러 주세요.','저장 위치로',`pfGoEl('#uk-edit-reason')`]);
 if(generic&&!k.targets.length)out.push(['공유할 부서를 하나 이상 선택해 주세요.','공유 부서로',`pfGoEl('.ux-target-fold,[id^=uk-target]')`]);
 if(!generic&&!k.submitted){if(!state.sel.length)out.push(['공유할 부서를 하나 이상 선택해 주세요.','공유 부서로',"pfOpenTargets()"]);else if(cover().out&&!state.policy)out.push(['공유 범위 밖 인원이 있습니다. ‘열람 가능자만’ 또는 ‘확대 승인’ 중 처리 방법을 골라 주세요.','고르러 가기',"pfOpenTargets()"])}
 if(generic&&ukExpansion(c)&&!k.expand)out.push(['선택한 부서·근거가 원래 공유 범위보다 넓습니다. ‘공유 범위 확대 요청’에 표시해 주세요.','확대 요청으로',`pfGoEl('input[onchange*=".expand="]')`]);
 const box=$('uk-confirm')||$('review-confirm');if(box&&!box.checked)out.push(['‘내용·근거·범위를 확인했습니다’ 확인란에 표시해 주세요.','확인란으로',`pfGoEl('#${box.id}')`]);
 return out}
function pfOpenTargets(){state.uxTargetsOpen=true;render();setTimeout(()=>pfGoEl('#target-error'),50)}
function pfChecklist(){const bar=$('main')?.querySelector('.pf-stickybar');if(!bar)return;const c=state.cases[state.uxReviewCase],k=ukRecord(c),submit=bar.dataset.kind==='submit';
 $('main').querySelectorAll('.pf-missing').forEach(e=>e.classList.remove('pf-missing'));
 const list=submit&&c&&canMain(c)&&!k?.submitted?pfMissing(c):[],info=bar.querySelector('.pf-check');
 if(!submit){info.innerHTML=`<span>${esc(bar.dataset.note)}</span>`;return}
 list.forEach(x=>{if(x[3]){const el=pfFieldEl(x[3],((ukBody(c)||{})[x[3]]||'').trim());el?.classList.add('pf-missing')}});
 info.innerHTML=list.length?`<b>상신 전에 ${list.length}가지가 남았습니다</b><ol>${list.map(([t,l,a])=>`<li><span>${esc(t)}</span><button type="button" class="pf-link" onclick="${a}">${l} →</button></li>`).join('')}</ol>`:`<b class="pf-ready">✓ 상신할 준비가 되었습니다</b>`;
 bar.classList.toggle('blocked',!!list.length);
 const src=[...$('main').querySelectorAll('button.btn.primary')].find(b=>!b.closest('.pf-stickybar')&&/^(submitPlan|ukSubmit)\(/.test(b.getAttribute('onclick')||''));
 if(src){src.parentElement.querySelector('.pf-why-list')?.remove();if(list.length)src.insertAdjacentHTML('afterend',`<div class="pf-why pf-why-list"><b>⚠ 아직 상신할 수 없습니다. 아래 ${list.length}가지를 채워 주세요.</b><ol>${list.map(([t,l,a])=>`<li>${esc(t)} <button type="button" class="pf-link" onclick="${a}">${l} →</button></li>`).join('')}</ol></div>`)}}
function pfReviewActions(){if(state.page!=='review')return;const main=$('main'),head=main.querySelector('.page-head');if(!head)return;
 const src=[...main.querySelectorAll('button.btn.primary')].filter(b=>/^(submitPlan|approveAndPublish|ukSubmit|ukPublish)\(/.test(b.getAttribute('onclick')||''));if(!src.length)return;
 const bar=document.createElement('div');bar.className='pf-stickybar';bar.dataset.kind=/^(submitPlan|ukSubmit)/.test(src[0].getAttribute('onclick'))?'submit':'approve';bar.dataset.note='확인란 표시가 필요하면 아래 해당 위치로 이동합니다.';bar.innerHTML='<div class="pf-check"></div><div class="pf-bar-acts"></div>';
 src.forEach(b=>{const p=b.cloneNode(true);p.removeAttribute('onclick');p.onclick=()=>{b.click();if(document.contains(b))b.scrollIntoView({behavior:'smooth',block:'center'})};bar.querySelector('.pf-bar-acts').append(p)});
 const anchor=main.querySelector('.pf-line')||main.querySelector('.uk-verify-bar')||main.querySelector('.ux-back')||head;anchor.after(bar);pfChecklist()}
document.addEventListener('input',e=>{if(state.page==='review'&&e.target.closest?.('main'))pfChecklist()});
document.addEventListener('change',e=>{if(state.page==='review'&&e.target.closest?.('main'))pfChecklist()});
function pfDrawer(){const old=$('pf-drawer'),keep=old&&old.dataset.key===JSON.stringify(state.uxPanel)?old.querySelector('.pf-body').scrollTop:0;old?.remove();document.body.classList.remove('pf-open');
 const p=state.uxPanel;if(!p)return;let title,sub,body,kicker;
 if(p.kind==='case'){const c=state.cases[p.id];if(!c||!visibleCases().some(x=>x.id===c.id)){state.uxPanel=null;return}kicker='VOC 처리';title=c.title;sub=`${c.voice} / ${c.id} · ${c.main} · ${c.handler}${c.rel.length?' · 협업 '+c.rel.join(' · '):''}`;body=casePage()}
 else{const v=vq(p.id);if(!v){state.uxPanel=null;return}kicker='VOC 확인 · 담당 지정';title=v.title;sub=`${v.id} · ${v.ch} · ${v.dept} · ${v.time}`;body=`<div class="tri-layout">${voiceDoc(v)}${triagePanel(v)}</div>`}
 document.body.insertAdjacentHTML('beforeend',`<div id="pf-drawer" class="pf-drawer"><div class="pf-backdrop" onclick="pfClose()"></div><section class="pf-sheet" role="dialog" aria-modal="true" aria-labelledby="pf-title"><header class="pf-head"><div class="pf-title"><span>${kicker}</span><h2 id="pf-title">${esc(title)}</h2><p>${esc(sub)}</p></div><div class="pf-acts"></div><button class="pf-x" onclick="pfClose()" aria-label="패널 닫기">✕</button><div class="pf-error" role="alert"></div></header><div class="pf-body">${body}</div></section></div>`);
 const d=$('pf-drawer');d.dataset.key=JSON.stringify(p);document.body.classList.add('pf-open');
 const acts=d.querySelector('.pf-acts'),bd=d.querySelector('.pf-body');
 bd.querySelector('.ux-back')?.remove();bd.querySelector('.page-head')?.remove();bd.querySelector('.ux-case-tabs>label')?.remove();
 if(p.kind==='case'){const c=state.cases[p.id],stack=bd.querySelector('.case-layout>.stack');if(stack)stack.insertAdjacentHTML('afterbegin',refinementAiPanel());const card=stack?.querySelector('.uk-card');if(card)stack.prepend(card);
  if(c.closed){const ai=bd.querySelector('.refinement-ai');if(ai&&stack){const x=document.createElement('details');x.className='ux-more ux-permission';x.innerHTML='<summary>AI 처리 분석 다시 보기</summary>';x.append(ai);stack.append(x)}}
  const save=bd.querySelector('.ux-savebar');if(save){acts.append(...save.querySelector('.actions').children);save.remove();const err=bd.querySelector('#ux-error');if(err)d.querySelector('.pf-error').replaceWith(err)}
  const know=card?.querySelector('.btn.primary');if(know){if(c.closed&&!save){const k=know.cloneNode(true);k.classList.remove('small');acts.append(k)}know.classList.remove('primary')}}
 else{const start=bd.querySelector('.ux-primary-action');if(start){const b=start.querySelector('button');b&&acts.append(b);start.querySelector('p')?.classList.add('pf-note');start.className='pf-moved'}
  const v=vq(p.id);if(v.caseId&&!acts.children.length)acts.insertAdjacentHTML('beforeend',btn('처리 화면 열기',`uxOpen('${v.caseId}')`,'primary'))}
 bd.scrollTop=keep}
/* A disabled button always shows why, as text next to it, not only as a hover tooltip. */
function pfReason(b){const pv=state.uxPanel?.kind==='voice'&&b.closest('#pf-drawer')?vq(state.uxPanel.id):null;if(pv&&pv.st.clean==='격리')return '정제 확인(격리 해제)이 끝나야 담당 지정할 수 있습니다. 정제 담당자에게 확인을 요청하세요.';if(/^(submitPlan|ukSubmit)\(/.test(b.getAttribute('onclick')||''))return '';const t=b.textContent.trim();if(b.title)return b.title;if(t.startsWith('담당 지정하고')||t==='Case 생성')return '담당 지정 권한이 있는 담당자만 시작할 수 있습니다.';return ''}
function pfWhy(){
 document.querySelectorAll('main button:disabled, #pf-drawer .pf-body button:disabled').forEach(b=>{if(b.closest('.pf-stickybar')||b.nextElementSibling?.classList.contains('pf-why'))return;const r=pfReason(b);if(r)b.insertAdjacentHTML('afterend',`<span class="pf-why">⚠ ${esc(r)}</span>`)});
 const d=$('pf-drawer');if(!d)return;const lines=[];
 d.querySelectorAll('.pf-acts button:disabled').forEach(b=>{const c=state.uxPanel?.kind==='case'?state.cases[state.uxPanel.id]:null,open=c?taskAgg(c.id).open:[];
  if(c&&open.length&&b.textContent.trim()==='종결')lines.push(`⚠ 필수 협업 회신 ${open.length}건(${esc(open.map(t=>t.dept).join(' · '))})이 남아 있어 종결할 수 없습니다. 조치와 결과는 미리 적고 임시 저장할 수 있습니다. <button type="button" class="pf-link" onclick="caseTab('tasks')">협업 확인 →</button>`);
  else{const r=pfReason(b);if(r)lines.push(`⚠ ${esc(b.textContent.trim())}: ${esc(r)}`)}});
 if(lines.length)d.querySelector('.pf-head').insertAdjacentHTML('beforeend',`<div class="pf-why pf-why-head">${lines.join('<br>')}</div>`)}
/* Close types and AI 지식화 (plan 3.3, 3.7): one processing path. The handler picks how the VOC closes
   (AI 지식 참조 / 일반 종결 / 종료) and, separately, whether it becomes AI knowledge. Closing a flagged VOC
   creates the AI draft and an approval line: 관련 부서 합의 → 메인 부서 최종 승인. Any approver can 보완 요청 or 반려. */
const PF_CLOSE={AI_REFERENCE:['AI 지식 참조','AI 추천 답변·자료를 확인해 답합니다'],RESOLVED:['일반 종결','조치한 결과로 답합니다'],NO_REPLY:['종료','답변이 필요 없어 끝냅니다']};
Object.assign(roles,{opsagree:{name:'운영팀 승인자 · 오민준',dept:'운영팀',menus:['home','review']},devagree:{name:'개발팀 승인자 · 한유진',dept:'개발팀',menus:['home','review']}});
$('role').innerHTML=Object.entries(roles).map(([key,r])=>`<option value="${key}" ${key===state.role?'selected':''}>${r.name}</option>`).join('');
TRACK.STANDARD[0]='VOC 처리';
state.pfLines=state.pfLines||{};
function pfNormalize(){for(const c of Object.values(state.cases)){if(c.pfInit)continue;c.pfInit=true;if(c.track==='KNOWLEDGE'&&!c.closed)c.kreq={by:c.handler,at:'처리 중'};c.track='STANDARD'}}
function pfRefs(c){return (vq(c.voice)?.ai?.refs||[]).filter(k=>refOk(k)&&canReadRef(k))}
function pfType(c){const d=uxDraft(c);if(!d.ctype)d.ctype=vq(c.voice)?.ai?.track!=='KNOWLEDGE'&&pfRefs(c).some(k=>REFS[k].kind==='KNOWLEDGE')?'AI_REFERENCE':'RESOLVED';return d.ctype}
function pfSetClose(cid,t){const c=state.cases[cid];if(!uxCan(c))return;ukCapture(c);pfCapture(c);uxDraft(c).ctype=t;render()}
function pfCapture(c){const d=uxDraft(c);if($('pf-answer'))d.answer=$('pf-answer').value;const r=document.querySelector('input[name=pf-ref]:checked');if(r)d.kref=r.value;if($('pf-close-note'))d.note=$('pf-close-note').value}
function pfAnswer(k){const r=REFS[k];return `${r.title}(${r.ver}) 안내에 따라 답변드립니다. ${r.body||r.loc}`}
function pfAgreeDepts(c){return [...new Set(tasksOf(c.id).filter(t=>t.st==='COMPLETED'&&t.dept!==c.main).map(t=>t.dept))]}
function pfPreview(c){const a=pfAgreeDepts(c),open=tasksOf(c.id).filter(t=>t.req&&OPEN(t)&&t.dept!==c.main).map(t=>t.dept);const ag=[...new Set([...a,...open])];return `${ag.length?'합의 '+ag.join(' · ')+' → ':''}최종 승인 ${c.main}`}
function pfKreqBox(c,t){const on=!!c.kreq;return `<div class="pf-kreq ${on?'on':''}"><label class="check"><input type="checkbox" id="pf-kreq" ${on?'checked':''} onchange="pfKreq('${c.id}',this.checked)"><b>AI 지식화 대상으로 설정</b></label><p class="small">${on?`종결하면 AI 지식 초안과 결재선(${esc(pfPreview(c))})이 자동으로 만들어집니다.`:'다른 부서도 다시 쓸 해결이면 표시하세요. 종결한 뒤에도 설정할 수 있습니다.'}</p>${on&&t==='AI_REFERENCE'?'<p class="small pf-kreq-note">⚠ 이미 AI 지식으로 답한 건입니다. 기존 지식과 다른 내용이 있을 때만 지식화하세요.</p>':''}</div>`}
const pfOldWork=uxWork;
uxWork=function(c){if(c.closed)return pfClosedWork(c);let h=pfOldWork(c);const t=pfType(c),d=uxDraft(c),edit=uxCan(c),refs=pfRefs(c);
 const seg=`<div class="field pf-track"><span>어떻게 종결하나요?</span><div class="pf-track-opts" role="radiogroup" aria-label="종결 유형">${Object.entries(PF_CLOSE).map(([k,[n,desc]])=>{const off=k==='AI_REFERENCE'&&!refs.length;return `<button type="button" role="radio" aria-checked="${t===k}" class="${t===k?'on':''}" ${!edit||off?'disabled':''} onclick="pfSetClose('${c.id}','${k}')"><b>${n}${k===(vq(c.voice)?.ai?.track==='KNOWLEDGE'?'':'AI_REFERENCE')&&refs.some(x=>REFS[x].kind==='KNOWLEDGE')?' <i>AI 추천</i>':''}</b><span>${off?'⚠ 읽을 수 있는 AI 추천 자료가 없어 고를 수 없습니다':desc}</span></button>`}).join('')}</div></div>`;
 let block='';
 if(t==='AI_REFERENCE'){const k0=d.kref&&refs.includes(d.kref)?d.kref:refs[0];if(d.answer===undefined)d.answer=pfAnswer(k0);
  block=`<div class="pf-quick"><b>AI 추천 자료</b>${refs.map(k=>`<label class="kcard pick"><input type="radio" name="pf-ref" value="${k}" ${k===k0?'checked':''} ${edit?'':'disabled'}><div><h3>${tag(KIND[REFS[k].kind][0],KIND[REFS[k].kind][1])} ${esc(REFS[k].title)} · ${REFS[k].ver}</h3><p>${esc(REFS[k].body||REFS[k].loc)}</p></div></label>`).join('')}<label class="field">고객 답변 <span class="small muted">· AI 추천 답변을 확인하고 고치세요</span><textarea id="pf-answer" ${edit?'':'disabled'}>${esc(d.answer)}</textarea></label><button type="button" class="pf-link" onclick="pfMismatch('${c.id}')">추천 자료가 맞지 않나요? 보완 필요를 남기고 일반 종결로 →</button></div>`}
 else if(t==='NO_REPLY')block=`<label class="field">종료 사유 <span class="small muted">· 답변이 필요 없는 이유</span><textarea id="pf-close-note" ${edit?'':'disabled'} placeholder="예: 기능 개선 의견으로 별도 답변이 필요 없음">${esc(d.note||'')}</textarea></label>`;
 const a=h.indexOf('<label class="field">어떤 조치를 했나요?'),b=h.indexOf('<div id="ux-error"');
 if(a>0&&b>a)h=h.slice(0,a)+seg+(t==='RESOLVED'?h.slice(a,b):block)+pfKreqBox(c,t)+h.slice(b);
 return h.replace('>처리 완료</button>','>종결</button>').replace('완료 시 필수 회신과 기록을 확인합니다.','종결 시 필수 회신과 기록을 확인합니다.')};
function pfClosedWork(c){const t=c.ctype||'RESOLVED',v=vq(c.voice);
 return `<div class="panel-body"><div class="ux-section-head"><h2>처리 결과</h2>${tag('종결 · '+PF_CLOSE[t][0],'green')}</div><div class="ux-voc-quote"><b>접수된 문의</b><p>${esc(v?.title||c.title)}</p></div>
 <div class="info-row"><span>${t==='NO_REPLY'?'종료 사유':t==='AI_REFERENCE'?'참조한 자료':'조치·이유'}</span><strong>${esc(t==='NO_REPLY'?c.result:c.decision)}</strong></div>${t!=='NO_REPLY'?`<div class="info-row"><span>${t==='AI_REFERENCE'?'고객 답변':'처리 결과'}</span><strong>${esc(c.result||'')}</strong></div>`:''}
 <p class="small muted">VOC 종결과 AI 지식화는 따로 관리합니다. 지식화 진행은 오른쪽 ‘AI 지식화’에서 봅니다.</p></div>`}
function pfMismatch(cid){const c=state.cases[cid];if(!uxCan(c))return;pfCapture(c);const k=uxDraft(c).kref||pfRefs(c)[0];uxDraft(c).ctype='RESOLVED';state.pfImprove=(state.pfImprove||[]).concat({case:cid,k,by:myName()});uxLog(c,`보완 필요 · ${REFS[k]?.ver||''}`);render();toast(`${REFS[k]?.ver||'추천 자료'}에 ‘보완 필요’를 남겼습니다. 소유 부서의 개정 후보가 됩니다. 일반 종결로 처리하세요.`)}
function pfKreq(cid,on){const c=state.cases[cid];if(!canMain(c)){toast('메인 부서 담당자가 AI 지식화를 설정합니다.');return}const k=ukRecord(c),line=state.pfLines[cid];
 if(!on){if(line&&['COMPOSED','IN_PROGRESS'].includes(line.state)){toast('진행 중인 결재가 있어 해제할 수 없습니다.');render();return}c.kreq=null;uxLog(c,'AI 지식화 설정 해제');render();return}
 if(!c.closed)pfCapture(c);c.kreq={by:myName(),at:c.closed?'종결 후':'처리 중'};c.kreqRejected=null;uxLog(c,`AI 지식화 설정 · ${c.kreq.at}`);
 if(c.closed){if(k?.draft){pfCompose(c);toast('다시 AI 지식화를 설정했습니다. 초안을 확인하고 새 결재선으로 상신하세요.')}else{pfMakeDraft(c);toast('AI 지식 초안과 결재선을 만들었습니다. 초안을 확인하고 상신하세요.')}}
 render()}
const pfKnowledgeFlow=uxKnowledge;
function pfMakeDraft(c){const open=ukOpen,t=toast;ukOpen=()=>{};toast=()=>{};try{pfKnowledgeFlow(c.id)}finally{ukOpen=open;toast=t}state.uxLogs=state.uxLogs.filter(x=>!(x.case===c.id&&x.text==='AI 지식 초안 작성 · 결과 미검증'));if(c.id==='C-2041')state.verified=true;/* fixture flag: the closed result is what the approval line reviews */pfCompose(c);uxLog(c,'AI 지식 초안 생성 · 결재선 자동 구성')}
function pfCompose(c){const prev=state.pfLines[c.id],k=ukRecord(c);if(k){k.submitted=false;k.approved=false;k.pfRejected=false;k.rejection=null}
 state.pfLines[c.id]={no:(prev?.no||0)+1,state:'COMPOSED',drafter:c.handler,steps:[...pfAgreeDepts(c).map(d=>({kind:'AGREE',dept:d,st:'PENDING',origin:'AUTO'})),{kind:'FINAL',dept:c.main,st:'PENDING'}]}}
uxKnowledge=function(cid){const c=state.cases[cid];if(!c)return;if(ukRecord(c)?.draft&&roles[state.role].menus.includes('review')){ukOpen(cid);return}uxOpen(cid)};
createDraft=function(){uxKnowledge(state.caseId||'C-2041')};
ukReconcile=function(){};/* no separate verification: approval line review replaces it */
ukReady=function(c){return !!c?.closed&&!taskAgg(c.id).open.length};
const pfOldSave=uxSave;
uxSave=function(cid,finish){const c=state.cases[cid];if(!uxCan(c)){toast('메인 부서 담당자만 처리할 수 있습니다.');return}const t=pfType(c),d=uxDraft(c);
 if(t==='RESOLVED'){pfOldSave(cid,finish);if(finish&&c.closed)pfAfterClose(c,t);return}
 pfCapture(c);const fail=m=>{const e=$('ux-error');if(e)e.textContent=m};
 if(!finish){uxLog(c,'처리 기록 임시 저장');render();toast('처리 기록을 저장했습니다.');return}
 if(taskAgg(cid).open.length){fail('필수 협업 회신을 먼저 확인해주세요.');return}
 if(t==='AI_REFERENCE'&&(!d.kref||!(d.answer||'').trim())){fail('참조한 AI 추천 자료를 고르고 고객 답변을 확인해 주세요.');return}
 if(t==='NO_REPLY'&&!(d.note||'').trim()){fail('종료 사유를 적어 주세요.');$('pf-close-note')?.focus();return}
 const r=REFS[d.kref];c.decision=t==='AI_REFERENCE'?`AI 추천 ${r.title} ${r.ver} 참조`:'답변 불필요 · 종료';c.result=t==='AI_REFERENCE'?d.answer.trim():d.note.trim();c.outcome='SUCCESS';d.decision=c.decision;d.result=c.result;
 if(t==='AI_REFERENCE'){crefsOf(c.id).push({ref:d.kref,origin:'AI',usage:'적용',reason:'AI 추천 자료로 답변',by:myName(),dept:c.main,task:''});if(r.kind==='KNOWLEDGE'){state.reuseLog.push({k:d.kref,case:c.id,reason:'AI 지식 참조 종결'});state.reuseCount++}}
 c.closed=true;const v=vq(c.voice);if(v)v.st.tri='종결';pfAfterClose(c,t)};
function pfAfterClose(c,t){c.ctype=t;state.uxLogs=state.uxLogs.filter(x=>!(x.case===c.id&&x.text==='처리 완료 · 결정·결과 기록'));uxLog(c,'종결 · '+PF_CLOSE[t][0]);if(c.kreq&&!ukRecord(c)?.draft)pfMakeDraft(c);render();toast(c.kreq?'종결했습니다. AI 지식 초안과 결재선을 만들었습니다. 초안을 확인하고 상신하세요.':`종결했습니다(${PF_CLOSE[t][0]}). 필요하면 나중에 AI 지식화로 설정할 수 있습니다.`)}
/* Approval line state follows the knowledge record: submit opens the line, final approval closes it and marks the outcome verified. */
function pfSync(){for(const [cid,line] of Object.entries(state.pfLines)){const c=state.cases[cid],k=ukRecord(c);if(!k)continue;
 if(k.submitted&&!k.published&&!k.approved&&line.state!=='IN_PROGRESS'){if(line.state!=='COMPOSED')pfCompose(c),k.submitted=true;const l=state.pfLines[cid];l.state='IN_PROGRESS';l.submitter=k.submitter||myName();const ag=l.steps.filter(s=>s.kind==='AGREE'&&s.st!=='EXCLUDED');ag.forEach(s=>s.st='OPEN');if(!ag.length)l.steps.at(-1).st='OPEN';state.uxLogs=state.uxLogs.filter(x=>!(x.case===cid&&x.text==='지식 검토 제출'));uxLog(c,`결재 상신 · 결재선 ${l.no}`)}
 const l=state.pfLines[cid],fin=l.steps.at(-1);
 if((k.approved||k.published)&&l.state==='IN_PROGRESS'){fin.st='APPROVED';fin.by=fin.by||'박서연';l.state='APPROVED';k.verified=true;uxLog(c,'최종 승인 · 결과 검증 기록(승인자)')}}}
function pfLineOf(c){return state.pfLines[c?.id]}
function pfAgreeDone(c){const l=pfLineOf(c);return !l||l.steps.filter(s=>s.kind==='AGREE'&&s.st!=='EXCLUDED').every(s=>s.st==='APPROVED')}
function pfExpansion(c){return c.id==='C-2041'?state.policy==='expand'&&cover().out>0:ukExpansion(c)&&ukRecord(c)?.expand}
const PF_ST={PENDING:['대기',''],OPEN:['결정 대기','amber'],APPROVED:['승인','green'],RETURNED:['보완 요청','amber'],REJECTED:['반려','red'],CANCELLED:['취소',''],EXCLUDED:['제외됨','']};
function pfLinePanel(c){const l=pfLineOf(c),k=ukRecord(c);if(!l)return '';const me=roles[state.role],k2=c.id==='C-2041'?state:k;
 const steps=[{kind:'DRAFT',dept:c.main,st:l.state==='COMPOSED'?'OPEN':'APPROVED',who:l.drafter},...l.steps.slice(0,-1)];
 if(pfExpansion(c))steps.push({kind:'OWNER',dept:'원본 소유 측',st:!k2.submitted&&l.state==='COMPOSED'?'PENDING':k2.sourceApproved?'APPROVED':'OPEN'},{kind:'POLICY',dept:'정책 승인',st:!k2.submitted&&l.state==='COMPOSED'?'PENDING':k2.policyApproved?'APPROVED':'OPEN'});
 steps.push(l.steps.at(-1));
 const name={DRAFT:'기안',AGREE:'합의',OWNER:'공유 확대',POLICY:'공유 확대',FINAL:'최종 승인'};
 const mine=l.state==='IN_PROGRESS'?l.steps.findIndex(s=>s.st==='OPEN'&&s.dept===me.dept&&(s.kind==='AGREE'||state.role==='reviewer')&&myName()!==l.submitter):-1;
 const act=mine>=0?`<div class="pf-line-act"><label class="field">결정 사유 <span class="small muted">· 보완 요청·반려는 필수</span><input id="pf-line-reason" placeholder="예: 적용 조건이 빠졌습니다"></label><div id="pf-line-error" class="error" role="alert"></div><div class="actions">${l.steps[mine].kind==='AGREE'?btn('합의',`pfDecide('${c.id}',${mine},'APPROVED')`,'primary'):''}${btn('보완 요청',`pfDecide('${c.id}',${mine},'RETURNED')`)}${btn('반려',`pfDecide('${c.id}',${mine},'REJECTED')`,'danger')}</div>${l.steps[mine].kind==='FINAL'?'<p class="small muted">최종 승인은 위쪽 ‘최종 승인하고 게시’로 합니다.</p>':''}</div>`:'';
 const adj=l.state==='COMPOSED'&&canMain(c)&&myName()===l.drafter;
 const head=l.state==='REJECTED'?`AI 지식화 반려됨 · ${esc(l.reason||'')}`:l.state==='RETURNED'?`보완 요청 · ${esc(l.reason||'')}`:l.state==='APPROVED'?'결재 완료 · 게시·AI 적용(ACL 필터)':l.state==='IN_PROGRESS'?'결재 진행 중':'종결 시 자동 구성 · 기안자가 확인하고 상신';
 return `<section class="panel pf-line"><div class="panel-head"><h2>결재선 ${l.no>1?'· '+l.no+'차':''}</h2>${tag(head,l.state==='REJECTED'?'red':l.state==='APPROVED'?'green':l.state==='IN_PROGRESS'?'blue':'amber')}</div><div class="panel-body"><ol class="pf-line-steps">${steps.map(s=>`<li class="${s.st.toLowerCase()}"><small>${name[s.kind]}</small><b>${esc(s.dept)}</b><span>${s.who?esc(s.who):s.by?esc(s.by):''} ${s.kind==='DRAFT'?tag(s.st==='OPEN'?'상신 전':'상신',s.st==='OPEN'?'amber':'green'):tag(PF_ST[s.st][0],PF_ST[s.st][1])}</span>${s.reason?`<em>${esc(s.reason)}</em>`:''}${s.origin==='ADDED'?`<em>수기 추가 · ${esc(s.addReason)}</em>`:''}${s.st==='EXCLUDED'?`<em>제외 사유 · ${esc(s.xreason)} (${esc(s.xby)})</em>`:''}${adj&&s.kind==='AGREE'?pfAdjBtns(c,s):''}</li>`).join('<i>›</i>')}</ol><p class="small muted">합의 부서는 이 VOC에서 협업 업무를 완료한 관련 부서로 자동 구성합니다. 기안자는 상신 전에 합의 부서를 추가하거나 제외할 수 있고(사유 필수), 제외 기록은 최종 승인자에게 보입니다. 공유 확대·최종 승인 단계는 바꿀 수 없습니다. 기안자는 어느 단계도 결재할 수 없습니다.</p>${adj?pfAdjForm(c):''}${act}</div></section>`}
function pfAdjBtns(c,s){const i=pfLineOf(c).steps.indexOf(s);return s.origin==='ADDED'?`<button type="button" class="pf-link" onclick="pfAdjust('${c.id}','remove',${i})">삭제</button>`:s.st==='EXCLUDED'?`<button type="button" class="pf-link" onclick="pfAdjust('${c.id}','include',${i})">다시 포함</button>`:`<button type="button" class="pf-link" onclick="pfAdjust('${c.id}','exclude',${i})">제외</button>`}
function pfAdjForm(c){const l=pfLineOf(c),used=l.steps.map(s=>s.dept),all=(typeof REL_DEPTS!=='undefined'?REL_DEPTS:['운영팀','개발팀','품질관리팀','기술지원팀']).filter(d=>d!==c.main&&!used.includes(d));
 return `<div class="pf-line-act pf-adj"><b>결재선 조정 <span class="small muted">· 상신 전 · 합의 단계만</span></b><div class="pf-adj-row">${all.length?`<select id="pf-adj-dept">${all.map(d=>`<option>${esc(d)}</option>`).join('')}</select>`:'<span class="small muted">더할 부서 없음</span>'}<input id="pf-adj-reason" placeholder="사유 (추가·제외 모두 필수)">${all.length?btn('부서 추가',`pfAdjust('${c.id}','add')`):''}</div><div id="pf-adj-error" class="error" role="alert"></div></div>`}
const pfEul=w=>{const k=(w||'').charCodeAt(w.length-1)-0xAC00;return w+(k>=0&&k<11172&&k%28?'을':'를')};
function pfAdjust(cid,op,i){const c=state.cases[cid],l=pfLineOf(c);if(!l||l.state!=='COMPOSED'){toast('상신 후에는 결재선을 바꿀 수 없습니다. 회수하거나 보완 요청 후 다시 상신하세요.');return}
 const reason=$('pf-adj-reason')?.value.trim(),s=l.steps[i],fail=m=>{const e=$('pf-adj-error');if(e)e.textContent=m;$('pf-adj-reason')?.focus()};
 if(op==='add'){if(!reason)return fail('부서를 추가하려면 사유를 적어 주세요.');const d=$('pf-adj-dept').value;l.steps.splice(l.steps.length-1,0,{kind:'AGREE',dept:d,st:'PENDING',origin:'ADDED',addReason:reason});uxLog(c,`결재선 합의 부서 추가 · ${d} · ${reason}`);toast(`${pfEul(d)} 합의 부서로 추가했습니다.`)}
 else if(!s||s.kind!=='AGREE')return;
 else if(op==='exclude'){if(!reason)return fail(`${pfEul(s.dept)} 제외하려면 사유를 적어 주세요.`);Object.assign(s,{st:'EXCLUDED',xreason:reason,xby:myName()});uxLog(c,`결재선 합의 부서 제외 · ${s.dept} · ${reason}`);toast(`${pfEul(s.dept)} 합의에서 제외했습니다. 최종 승인자에게 제외 사유가 보입니다.`)}
 else if(op==='include'){Object.assign(s,{st:'PENDING',xreason:'',xby:''});uxLog(c,`결재선 합의 부서 다시 포함 · ${s.dept}`);toast(`${pfEul(s.dept)} 다시 합의 부서로 넣었습니다.`)}
 else if(op==='remove'&&s.origin==='ADDED'){l.steps.splice(i,1);uxLog(c,`결재선 수기 추가 부서 삭제 · ${s.dept}`);toast(`${pfEul(s.dept)} 결재선에서 뺐습니다.`)}
 render()}
function pfDecide(cid,i,st){const c=state.cases[cid],l=pfLineOf(c),k=ukRecord(c),s=l?.steps[i],reason=$('pf-line-reason')?.value.trim();if(!s||s.st!=='OPEN')return;
 if(st!=='APPROVED'&&!reason){$('pf-line-error').textContent='보완 요청·반려에는 사유가 필요합니다.';return}
 Object.assign(s,{st,by:myName(),reason:reason||''});
 if(st==='APPROVED'){if(pfAgreeDone(c))l.steps.at(-1).st='OPEN';uxLog(c,`${s.dept} 합의`);render();toast(`${s.dept} 합의를 기록했습니다.`);return}
 l.steps.forEach(x=>{if(x!==s&&['PENDING','OPEN'].includes(x.st))x.st='CANCELLED'});l.state=st;l.reason=reason;
 const kk=c.id==='C-2041'?state:k;kk.submitted=false;kk.approved=false;kk.sourceApproved=false;kk.policyApproved=false;
 if(st==='REJECTED'){k.pfRejected=true;c.kreq=null;c.kreqRejected={by:myName(),reason};uxLog(c,`AI 지식화 반려 · ${s.dept} · ${reason}`);toast('AI 지식화를 반려했습니다. 초안은 기록으로만 남고 검색·배포에 쓰지 않습니다.')}
 else{k.rejection=reason;uxLog(c,`보완 요청 · ${s.dept} · ${reason}`);toast('보완 요청을 보냈습니다. 기안자가 고쳐 다시 상신합니다.')}
 render()}
const pfOldPublish=ukPublish,pfOldApprove=approveAndPublish,pfOldUkSubmit=ukSubmit,pfOldSubmitPlan=submitPlan;
function pfFinalGate(c){if(!pfAgreeDone(c)){toast('관련 부서 합의가 모두 끝나야 최종 승인할 수 있습니다.');return false}return true}
ukPublish=function(cid){if(pfFinalGate(state.cases[cid]))pfOldPublish(cid)};
approveAndPublish=function(){if(state.role!=='reviewer'||pfFinalGate(state.cases['C-2041']))pfOldApprove()};
function pfSubmitGate(c){const k=ukRecord(c);if(k?.pfRejected){toast('반려된 AI 지식화입니다. VOC 처리 화면에서 다시 AI 지식화를 설정해야 상신할 수 있습니다.');return false}return true}
ukSubmit=function(cid){if(pfSubmitGate(state.cases[cid]))pfOldUkSubmit(cid)};
submitPlan=function(){if(pfSubmitGate(state.cases['C-2041']))pfOldSubmitPlan()};
ukVerifyBar=function(c){return pfLinePanel(c)};
/* Knowledge card in the panel: status of the flag and the approval line, one button. */
uxKnowledgeCard=function(c){const k=ukRecord(c),l=pfLineOf(c),can=canMain(c),view=roles[state.role].menus.includes('review');let body,act='',badge;
 if(c.kreqRejected&&!c.kreq){badge=tag('반려됨','red');body=`<p class="small">${esc(c.kreqRejected.by)} · ${esc(c.kreqRejected.reason)}</p><p class="small muted">초안은 기록으로만 남고 검색·배포에 쓰지 않습니다.</p>`;act=can?btn('다시 AI 지식화 설정',`pfKreq('${c.id}',true)`,'primary small'):''}
 else if(!c.closed){badge=c.kreq?tag('설정됨','green'):tag('설정 안 함');body=c.kreq?`<p class="small">종결하면 AI 초안과 결재선이 자동으로 만들어집니다.</p><p class="small muted">결재선: ${esc(pfPreview(c))}</p>`:'<p class="small">처리 화면 아래 ‘AI 지식화 대상으로 설정’에 표시하면 종결할 때 초안과 결재선이 만들어집니다.</p>'}
 else if(!k?.draft){badge=tag('설정 안 함');body='<p class="small">다른 부서도 다시 쓸 해결이면 지금 설정하세요. AI 초안과 결재선이 바로 만들어집니다.</p>'+(c.ctype==='AI_REFERENCE'?'<p class="small muted">이미 AI 지식으로 답한 건이라 보통은 지식화하지 않습니다.</p>':'');act=can?btn('AI 지식화로 설정',`pfKreq('${c.id}',true)`,'primary small'):''}
 else{const st=l?.state;badge=k.published||st==='APPROVED'?tag('게시·AI 적용','green'):st==='IN_PROGRESS'?tag('결재 중','blue'):st==='RETURNED'?tag('보완 요청','amber'):tag('상신 전','amber');body=`<p class="small">결재선: ${l?esc(l.steps.map(s=>(s.kind==='AGREE'?'합의 ':'최종 승인 ')+s.dept).join(' → ')):''}</p>`;act=view?btn(st==='COMPOSED'||st==='RETURNED'?(can?'초안 확인하고 상신':'결재 현황 보기'):'결재 현황 보기',`ukOpen('${c.id}')`,'primary small'):''}
 return `<section class="panel ux-after uk-card"><div class="panel-head"><h2>AI 지식화</h2>${badge}</div><div class="panel-body">${body}<div class="actions">${act}</div></div></section>`};
function pfStages(c){const k=ukRecord(c)||{},l=pfLineOf(c),a=taskAgg(c.id),cur=k.published?5:c.closed&&l?3:2;
 const sub=cur===2?(a.open.length?`관련 부서 회신 ${a.done}/${a.req}`:'처리 중 · 종결하면 AI 초안과 결재선 자동 구성'):cur===3?(l.state==='COMPOSED'?'상신 전 · 기안자가 초안 확인 후 상신':l.state==='RETURNED'?'보완 요청 · 초안 고쳐 다시 상신':l.state==='REJECTED'?'AI 지식화 반려됨':l.steps.filter(s=>s.st==='OPEN').map(s=>`${s.dept} ${s.kind==='AGREE'?'합의':'최종 승인'} 대기`).join(' · ')||'게시·색인 준비 중'):'게시·색인·대상 부서 전달 완료 · AI 답변에 ACL 필터 적용';
 return `<div class="pf-stages" aria-label="AI 지식화 진행 단계"><ol>${['접수','처리','결재','공유'].map((n,i)=>`<li class="${i+1<cur?'done':i+1===cur?'current':''}">${i+1<cur?'✓ ':''}${n}</li>`).join('')}</ol><p>${esc(sub)}</p></div>`}
function pfTracks(){const d=$('pf-drawer'),c=state.uxPanel?.kind==='case'?state.cases[state.uxPanel.id]:null;
 if(d&&c){const pair=d.querySelector('.uk-status-pair');if(pair){if(c.kreq||ukRecord(c)?.draft&&!c.kreqRejected)pair.outerHTML=pfStages(c);else{const s=pair.querySelector('div:first-child span');if(s)s.textContent=c.closed?'종결 · '+PF_CLOSE[c.ctype||'RESOLVED'][0]:'종결 유형은 종결할 때 고릅니다';pair.querySelector('div:last-child')?.remove()}}}
 if(state.page==='review'){const c2=state.cases[state.uxReviewCase]||state.cases['C-2041'],main=$('main');if(c2&&ukRecord(c2)?.draft){
   if(!main.querySelector('.pf-stages')){main.querySelectorAll('.ux-progress').forEach(x=>x.remove());main.querySelector('.page-head')?.insertAdjacentHTML('afterend',pfStages(c2))}
   if(!main.querySelector('.pf-line')){const at=main.querySelector('.pf-stickybar')||main.querySelector('.pf-stages');at?.insertAdjacentHTML('afterend',pfLinePanel(c2))}
   main.querySelectorAll('.uk-verify-bar:not(.pf-line),button[onclick^="ukVerify"],button[onclick^="ukReject"],button[onclick^="rejectStep"],button[onclick^="openReject"]').forEach(x=>x.remove());
   main.querySelectorAll('button').forEach(b=>{const o=b.getAttribute('onclick')||'',t=b.textContent.trim();if(/^(submitPlan|ukSubmit)/.test(o)||b.closest('.pf-stickybar')&&/제출/.test(t))b.textContent=t.replace(/검토 제출|제출/,'상신');if(/^(approveAndPublish|ukPublish)/.test(o)||/승인하고 게시/.test(t)&&b.closest('.pf-stickybar'))if(!/최종/.test(t))b.textContent=t.replace('승인하고 게시','최종 승인하고 게시')})}}
 if(['review','home'].includes(state.page)||$('pf-drawer'))pfWords();if(state.page==='home')pfHome()}
const PF_WORDS=[['결과 검증·독립 결재','결재'],['미검증 AI 초안','AI 초안'],['검증된 결과','처리 결과'],['독립 결재','결재선 결재'],['공식 공유 전 결과 검증·','공식 공유 전 '],['검토 제출','상신'],['결과 미검증','상신 전'],['검증된 처리 가이드','처리 가이드'],['조치·검증 결과','조치·결과'],['승인 진행 중','결재 진행 중'],['제출한 지식 검토','상신한 지식 결재']];
function pfWords(){for(const root of [$('main'),$('pf-drawer')]){if(!root)continue;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){let t=n.nodeValue,o=t;for(const [a,b] of PF_WORDS)t=t.split(a).join(b);if(t!==o)n.nodeValue=t}}}
function pfHome(){const main=$('main');main.querySelectorAll('.ux-worktable tbody tr').forEach(row=>{const m=row.cells[0]?.textContent.match(/V-\d+/),v=m&&vq(m[0]),c=v&&state.cases[v.caseId];if(!c)return;const t=row.querySelector('.uk-track');if(t)t.textContent=c.closed?PF_CLOSE[c.ctype||'RESOLVED'][0]:'처리 중'});
 if(main.querySelector('.pf-inbox'))return;const me=roles[state.role],rows=[];
 for(const [cid,l] of Object.entries(state.pfLines)){const c=state.cases[cid],k=ukRecord(c);if(!c||!k)continue;const title=esc(k.human?.title||(cid==='C-2041'?'검색 지연 대응 가이드':c.title));
  if(l.state==='IN_PROGRESS'){const s=l.steps.find(x=>x.st==='OPEN'&&x.dept===me.dept&&(x.kind==='AGREE'||state.role==='reviewer'));if(s&&myName()!==l.submitter)rows.push([title,`${c.id} · 기안 ${l.drafter} · ${s.kind==='AGREE'?'합의':'최종 승인'} 요청`,tag(s.kind==='AGREE'?'합의 대기':'최종 승인 대기','amber'),cid])}
  else if(state.role==='handler'&&canMain(c)&&['COMPOSED','RETURNED'].includes(l.state))rows.push([title,`${c.id} · ${l.state==='RETURNED'?'보완 요청: '+esc(l.reason):'종결 후 자동 구성된 결재선'}`,tag(l.state==='RETURNED'?'보완 후 상신':'상신 전','amber'),cid])}
 if(!rows.length)return;const at=main.querySelector('.page-head');at?.insertAdjacentHTML('afterend',`<section class="panel pf-inbox"><div class="panel-head"><h2>AI 지식화 결재함</h2>${tag(rows.length+'건','amber')}</div><div class="panel-body">${rows.map(([t,s,b,cid])=>`<div class="pf-inbox-row"><div><b>${t}</b><p class="small muted">${s}</p></div>${b}${btn('열기',`ukOpen('${cid}')`,'small primary')}</div>`).join('')}</div></section>`)}
const PF_AI_KEYS=[['dept','담당 부서'],['urg','긴급도'],['cat','분류']];
function pfDiffs(v){const d=triDraft(v);return PF_AI_KEYS.filter(([k])=>v.ai&&v.ai[k]!==undefined&&d[k]!==v.ai[k]).map(([k,n])=>`${n}(AI ${v.ai[k]} → ${d[k]})`)}
const pfOldTriage=triagePanel;
triagePanel=function(v){let h=pfOldTriage(v);if(!v.ai)return h;h=h.replace(/<div class="ux-shortcut">[\s\S]*?<\/div>/,'').replace(/<tr><th>초기 처리 경로<\/th>[\s\S]*?<\/tr>/,'').replace(tag('해결 후 지식화 추천','green'),tag('AI 지식화 추천','green'));if(v.fin)return h;const d=triDraft(v),diffs=pfDiffs(v);
 const box=diffs.length?`<div class="pf-diff"><b>AI 제안과 다르게 확정합니다</b><p>${diffs.map(esc).join(' · ')}</p><label class="field">사유 <span class="small muted">· AI 제안과 함께 기록됩니다</span><input id="pf-diff-reason" value="${esc(d.diffReason||'')}" placeholder="예: 고객 업무 중단으로 긴급도 상향" oninput="triDraft(vq('${v.id}')).diffReason=this.value"></label><div id="pf-diff-error" class="error" role="alert"></div></div>`:'';
 return h.replace('<div class="ux-primary-action">',box+'<div class="ux-primary-action">')};
function pfStart(id){const v=vq(id);if(v?.ai&&!v.fin&&pfDiffs(v).length&&!(triDraft(v).diffReason||'').trim()){const e=$('pf-diff-error');if(e)e.textContent='AI 제안과 다르게 확정한 사유를 적어 주세요.';$('pf-diff-reason')?.focus();return}
 uxStart(id);const c=state.cases[v?.caseId];if(c){c.pfInit=true;if(v.ai?.track==='KNOWLEDGE')c.pfAiKnowledge=true;if(triDraft(v).diffReason&&!c.pfDiffLogged){c.pfDiffLogged=true;uxLog(c,'AI 제안과 다르게 확정 · '+triDraft(v).diffReason)}}}
const pfOldUxStartTriage=triagePanel;triagePanel=function(v){return pfOldUxStartTriage(v).replace(`onclick="uxStart('${v.id}')"`,`onclick="pfStart('${v.id}')"`)};
render=function(...args){pfNormalize();pfSync();const r=pfOld.render.apply(this,args);pfNav();pfVoicePage();pfReviewActions();pfDrawer();pfTracks();pfWhy();return r};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.uxPanel&&!document.querySelector('dialog[open]'))pfClose()});
document.addEventListener('DOMContentLoaded',()=>render());
