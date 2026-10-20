/* VOC-first interaction proposal. Fixture data, no server or live model. */
const uxOriginal={home:homePage,voice:voicePage,triage:triagePanel,review:reviewPage,render,closeReasons,quickClose,createCase,sources:sourcesPanel,createDraft};
Object.assign(state,{uxFilter:'all',uxQuery:'',uxInputs:{},uxCandidates:{},uxLogs:[],uxTab:'work'});
pages.home[1]='내 VOC 업무';pages.home[2]='업무';pages.voice[1]='VOC 수신함';pages.case[1]='VOC 처리';pages.review[1]='지식 작성·결재';
const uxDecision=c=>c.id==='C-2041'?state.decision:c.decision||'';
const uxCan=c=>!!c&&canMain(c)&&!c.closed;
const uxDraft=c=>state.uxInputs[c.id]||(state.uxInputs[c.id]={decision:uxDecision(c),result:c.result||'',outcome:c.outcome||'SUCCESS'});
function uxLog(c,text){state.uxLogs.push({case:c.id,text,by:myName()})}
function uxSet(cid,key,value){if(uxCan(state.cases[cid]))uxDraft(state.cases[cid])[key]=value}
function uxOpen(id,tab='work'){state.caseId=id;state.uxTab=tab;state.tab=tab;go('case')}
openCase=uxOpen;
caseTab=function(tab){state.uxTab=['tasks','refs'].includes(tab)?tab:'work';state.tab=state.uxTab;render()};
function uxPhase(v){const c=state.cases[v.caseId];return v.st.clean==='격리'?'blocked':c?.closed?'done':c?'working':'new'}
function uxStatus(v){const p=uxPhase(v),c=state.cases[v.caseId];if(p==='blocked')return tag('정제 확인 필요','red');if(p==='done')return tag('처리 완료','green');if(p==='new')return tag('담당 지정 대기','amber');const n=taskAgg(c.id).open.length;return tag(n?'협업 회신 대기':'처리 중',n?'amber':'blue')}
function uxRowAction(v){const c=state.cases[v.caseId];return c?`uxOpen('${c.id}')`:`state.vsel='${v.id}';go('voice')`}
homePage=function(){
 if(!['handler','reviewer','opsmember','devmember'].includes(state.role))return uxOriginal.home();
 const permitted=new Set(visibleCases().map(c=>c.voice));
 const q=state.vq.filter(v=>state.role==='handler'||permitted.has(v.id));
 const filters=[['all','전체',q.length],['new','담당 지정',q.filter(v=>uxPhase(v)==='new').length],['working','처리 중',q.filter(v=>uxPhase(v)==='working').length],['done','완료',q.filter(v=>uxPhase(v)==='done').length]];
 const rows=q.filter(v=>(state.uxFilter==='all'||uxPhase(v)===state.uxFilter)&&(!state.uxQuery||(v.title+v.id).includes(state.uxQuery)));
 const c=state.cases['C-2041'];
 const cards=[['담당 지정',q.filter(v=>uxPhase(v)==='new').length,'정제된 문의를 확인하고 처리 시작','new'],['진행 중',q.filter(v=>uxPhase(v)==='working').length,'조치와 부서 회신을 함께 관리','working'],['처리 완료',q.filter(v=>uxPhase(v)==='done').length,'필요한 경험만 지식으로 남기기','done']];
 return head('WORKSPACE / VOC','오늘 처리할 VOC','접수된 문의를 해결하고, 다시 쓸 수 있는 경험을 지식으로 남깁니다.',state.role==='handler'?btn('VOC 수신함',"go('voice')",'primary'):'')+
 `<div class="ux-stats">${cards.map(([title,n,desc,key])=>`<button class="ux-stat" onclick="state.uxFilter='${key}';render()"><span>${title}</span><strong>${n}<small>건</small></strong><p>${desc}</p></button>`).join('')}</div>
 <div class="ux-home-grid"><section class="panel ux-queue"><div class="panel-head"><h2>내 업무 목록</h2><span class="small muted">현재 업무 소속 기준</span></div>
 <div class="ux-tools"><div class="ux-filters" aria-label="업무 상태 필터">${filters.map(([k,n,count])=>`<button aria-pressed="${state.uxFilter===k}" class="${state.uxFilter===k?'on':''}" onclick="state.uxFilter='${k}';render()">${n} <b>${count}</b></button>`).join('')}</div><form onsubmit="event.preventDefault();state.uxQuery=$('ux-query').value.trim();render()"><input id="ux-query" aria-label="VOC 제목 또는 번호 검색" placeholder="제목 또는 VOC 번호" value="${esc(state.uxQuery)}"><button type="submit" class="btn small">검색</button></form></div>
 <div class="table-wrap"><table class="ux-worktable"><thead><tr><th>문의 / 담당</th><th>상태</th><th>다음 할 일</th><th></th></tr></thead><tbody>${rows.map(v=>{const c=state.cases[v.caseId],a=c?taskAgg(c.id):null;return `<tr><td><button class="ux-title" onclick="${uxRowAction(v)}">${esc(v.title)}</button><p class="small muted">${v.id} · ${c?c.main+' · '+c.handler:v.ch+' · '+v.dept}</p></td><td>${uxStatus(v)}</td><td class="small">${c?.closed?'필요하면 지식화':a?.open.length?`필수 회신 ${a.open.length}건 확인`:c?'조치·결과 기록':uxPhase(v)==='blocked'?'정제 담당자 확인':'AI 분석 확인·담당 지정'}</td><td>${btn(c?.closed?'결과 보기':c?'이어 처리':'확인',uxRowAction(v),'small')}</td></tr>`}).join('')||'<tr><td colspan="4" class="empty">조건에 맞는 업무가 없습니다.</td></tr>'}</tbody></table></div></section>
 <aside class="stack"><section class="panel ux-loop"><div class="panel-head"><h2>해결 경험을 지식으로</h2>${tag('선택','green')}</div><div class="panel-body"><p>모든 VOC에 결재가 필요한 것은 아닙니다. 공유할 처리 방법만 검증·승인합니다.</p><ol><li><b>VOC 처리 완료</b><span>결정과 결과를 남깁니다</span></li><li><b>AI 초안 작성 · 사람 확인</b><span>결과 증거·공식 근거를 확인합니다</span></li><li><b>독립 승인 후 자동 배포</b><span>허용된 부서에서 검색·재사용합니다</span></li></ol>${state.draft?btn(state.submitted?'제출한 지식 보기':'작성 중인 지식 보기',"go('review')",'small primary'):c?.closed?btn('완료한 VOC 지식화',"uxOpen('C-2041')",'small primary'):'<div class="ux-callout">완료된 VOC에서 ‘지식으로 남기기’를 선택하세요.</div>'}</div></section>
 <section class="panel"><div class="panel-body"><h3>기존 자료가 필요하다면</h3><p class="small muted">문서함과 AI 검색은 처리 중에도 사용할 수 있습니다.</p><div class="actions">${btn('문서·지식 찾기',"go('search')",'small')}${btn('문서함',"go('docbox')",'small text')}</div></div></section></aside></div>
 <details class="ux-more"><summary>지식 재검토·전체 순환 예시</summary>${reviewDueRow()}${btn('완료된 순환 예시',"showStory()",'small')}</details>`;
};
function uxTriageDefaults(v){const d=triDraft(v);if(!v.fin&&!d.uxReady){d.uxReady=true;d.uxCandidate=d.track==='KNOWLEDGE';d.track='STANDARD';d.rel=[]}return d}
triagePanel=function(v){
 if(!v.ai)return uxOriginal.triage(v);
 const fixed=!!v.fin,d=fixed?v.fin:uxTriageDefaults(v),edit=!fixed&&canTriage();
 if(fixed)return panel('담당 지정 완료',`<p class="small">${esc(d.dept)}에서 처리합니다. AI 분석과 담당자 확정 기록을 따로 보관합니다.</p>${afterCase(v)}<details class="ux-more"><summary>분류·AI 제안 기록</summary><div class="table-wrap"><table class="cmp"><thead><tr><th>항목</th><th>AI 제안</th><th>담당자 확정</th></tr></thead><tbody>${[['분류','cat'],['긴급도','urg'],['담당 부서','dept'],['초기 처리 경로','track'],['초기 협업 부서','rel']].map(([label,key])=>{const val=x=>key==='track'?TRACK[x]?.[0]||x:Array.isArray(x)?x.join(' · ')||'없음':x;return `<tr><th>${label}</th><td>${esc(val(v.ai[key]))}</td><td>${esc(val(d[key]))}</td></tr>`}).join('')}</tbody></table></div>${fbCtl('cls-'+v.id,'class',v.id+' 분류 제안')}</details>`,tag('처리 연결됨','green'));
 return `<section class="panel ux-triage"><div class="panel-head"><h2>확인하고 처리 시작</h2>${tag('AI 분석 완료','purple')}</div><div class="panel-body"><div class="ux-ai-summary"><span class="ux-spark">✦ AI 분석</span><p>${esc(v.ai.why)}</p><div class="actions">${tag(v.ai.cat)}${tag(v.ai.urg+' 긴급도',v.ai.urg==='높음'?'amber':'')}${v.ai.track==='KNOWLEDGE'?tag('해결 후 지식화 추천','green'):''}</div></div>
 <label class="field">담당 부서 <span class="small muted">· 최종 처리 책임</span><div class="rel-pick"><strong>${esc(d.dept)}</strong>${edit?btn('변경',`openDeptPicker('${v.id}','main')`,'small text'):''}</div></label>
 <label class="field">긴급도<select aria-label="긴급도 확정" ${edit?'':'disabled'} onchange="setTri('${v.id}','urg',this.value)">${URGS.map(o=>`<option ${d.urg===o?'selected':''}>${o}</option>`).join('')}</select></label>
 <details class="ux-more"><summary>분류 조정·초기 협업 부서 <span class="muted">선택</span></summary><label class="field">분류<select aria-label="분류 확정" ${edit?'':'disabled'} onchange="setTri('${v.id}','cat',this.value)">${CATS.map(o=>`<option ${d.cat===o?'selected':''}>${o}</option>`).join('')}</select></label><p class="small">협업은 처리 중에도 요청할 수 있습니다.</p><div class="actions">${d.rel.map(x=>tag(x)).join('')}${edit?btn('협업 부서 선택',`openDeptPicker('${v.id}','rel')`,'small'):''}</div></details>
 <div class="ux-primary-action"><button class="btn primary" onclick="uxStart('${v.id}')" ${edit?'':'disabled'}>담당 지정하고 처리 시작 →</button><p class="small muted">처리 기록(Case)이 함께 생성됩니다.</p></div>
 ${v.ai.refs.some(k=>refOk(k)&&canReadRef(k)&&REFS[k].kind==='KNOWLEDGE')?`<div class="ux-shortcut"><b>기존 지식으로 해결할 수 있나요?</b><p class="small muted">적용할 지식과 사유를 확인하고 바로 종결할 수 있습니다.</p>${btn('추천 지식으로 바로 처리',`uxQuick('${v.id}')`,'small')}</div>`:''}
 ${fbCtl('cls-'+v.id,'class',v.id+' 분류 제안')}<p class="small muted ux-footnote">가상 AI 분석 · 제안과 담당자 확정값은 따로 기록합니다.</p></div></section>`;
};
function uxStart(id){const v=vq(id);if(!canTriage()||!v?.ai)return;if(v.caseId){uxOpen(v.caseId);return}const d=uxTriageDefaults(v);d.track='STANDARD';uxOriginal.createCase(id);const c=state.cases[v.caseId];if(!c)return;c.uxKnowledgeSuggested=!!d.uxCandidate;uxLog(c,'담당 지정 · 처리 기록 생성');uxOpen(c.id);toast('담당 지정을 마쳤습니다. 조치와 결과를 한 화면에서 기록하세요.')}
function uxQuick(id){const v=vq(id);if(!canTriage()||!v?.ai)return;if(!v.caseId){uxTriageDefaults(v).track='QUICK';uxOriginal.createCase(id)}state.vsel=id;render()}
createCase=uxStart;
function uxOpinionList(c){
 if(c.id==='C-2041')return state.opinions.map((o,i)=>({...o,key:String(i)}));
 c.ops=c.ops||{};return tasksOf(c.id).filter(t=>t.st==='COMPLETED').map(t=>{const o=c.ops[t.id]||(c.ops[t.id]={adopt:true,reason:''});return{who:t.dept,title:'협업 회신',text:t.reply,adopt:o.adopt,reason:o.reason,key:t.id}});
}
function uxOp(cid,key,field,value){const c=state.cases[cid];if(!uxCan(c))return;const o=cid==='C-2041'?state.opinions[Number(key)]:c.ops[key];o[field]=value}
function uxOpinions(c){const ops=uxOpinionList(c),editable=uxCan(c);if(!ops.length)return '';
 return `<details class="ux-more ux-opinions" ${state.uxShowOpinions?'open':''}><summary>부서 의견 검토 <span class="ux-count">${ops.length}</span> <span class="muted">${ops.some(o=>!o.reason.trim())?'판단 사유 확인 필요':'반영·보류 사유 기록됨'}</span></summary>${ops.map(o=>`<article class="ux-op"><b>${esc(o.who)} · ${esc(o.title)}</b><p>${esc(o.text)}</p><div class="ux-op-controls"><select aria-label="${esc(o.who)} 반영 여부" ${editable?'':'disabled'} onchange="uxOp('${c.id}','${o.key}','adopt',this.value==='y')"><option value="y" ${o.adopt?'selected':''}>반영</option><option value="n" ${!o.adopt?'selected':''}>보류</option></select><input aria-label="${esc(o.who)} 판단 사유" placeholder="반영·보류 사유" value="${esc(o.reason)}" ${editable?'':'disabled'} oninput="uxOp('${c.id}','${o.key}','reason',this.value)"></div></article>`).join('')}</details>`;
}
function uxKnowledgeCard(c){
 const draft=c.id==='C-2041'&&state.draft;
 if(!c.closed)return `<section class="panel ux-after"><div class="panel-body"><h3>해결한 뒤, 지식으로</h3><p class="small muted">처리 완료 후 다른 업무에도 쓸 수 있는 해결 방법만 남깁니다. 지금은 VOC 해결에 집중하세요.</p>${c.track==='KNOWLEDGE'||c.uxKnowledgeSuggested?tag('AI가 지식화 후보로 제안','purple'):''}</div></section>`;
 return `<section class="panel ux-after"><div class="panel-head"><h2>이 경험을 다시 쓸 수 있나요?</h2>${tag('선택','green')}</div><div class="panel-body"><p class="small">결과 증거를 확인하고 AI로 처리 가이드를 만드세요. 지식화하지 않아도 VOC는 완료 상태입니다.</p>${draft?btn(state.submitted?'지식 결재 현황 보기':'AI 초안 이어 작성',"go('review')",'primary small'):canMain(c)?btn('지식으로 남기기',`uxKnowledge('${c.id}')`,'primary small'):tag('담당자가 지식화 선택')}<p class="small muted">${c.id==='C-2041'&&state.published?'지식 게시·배포 완료':draft?'담당자 작성 → 독립 결재 → 자동 배포':'공식 지식으로 공유하기 전에 결과를 검증합니다.'}</p>${state.uxCandidates[c.id]?tag('지식화 후보로 저장됨','green'):''}</div></section>`;
}
function uxWork(c){const v=vq(c.voice),d=uxDraft(c),edit=uxCan(c),open=taskAgg(c.id).open;
 if(c.track==='QUICK')return `<div class="panel-body"><h2>기존 지식으로 처리</h2>${afterCase(v)}</div>`;
 return `<div class="panel-body"><div class="ux-section-head"><h2>${c.closed?'처리 결과':'조치와 결과'}</h2>${tag(c.closed?'완료':'담당자 작성',c.closed?'green':'blue')}</div>
 <div class="ux-voc-quote"><b>접수된 문의</b><p>${esc(v?.title||c.title)}</p><details><summary>정제된 문의 전문</summary><p>${v?showClean(maskPII(v.raw).text):''}</p></details></div>
 ${open.length?`<div class="ux-wait"><div><b>필수 협업 회신 ${open.length}건을 기다리고 있습니다.</b><span>${open.map(t=>esc(t.dept)).join(' · ')} · 조치 내용은 미리 저장할 수 있습니다.</span></div>${btn('협업 확인',"caseTab('tasks')",'small')}</div>`:''}
 ${uxOpinions(c)}
 <label class="field">어떤 조치를 했나요? <span class="small muted">결정·이유</span><textarea id="ux-decision" ${edit?'':'disabled'} placeholder="진행할 조치와 선택한 이유를 기록하세요." oninput="uxSet('${c.id}','decision',this.value)">${esc(d.decision)}</textarea></label>
 <label class="field">처리 결과는 어떤가요?<textarea id="ux-result" ${edit?'':'disabled'} placeholder="확인한 결과와 고객 안내 내용을 기록하세요." oninput="uxSet('${c.id}','result',this.value)">${esc(d.result)}</textarea></label>
 <label class="field ux-outcome">결과 구분<select id="ux-outcome" ${edit?'':'disabled'} onchange="uxSet('${c.id}','outcome',this.value)">${[['SUCCESS','해결'],['PARTIAL','부분 해결'],['FAIL','해결하지 못함 · 원인/교훈 기록']].map(([k,n])=>`<option value="${k}" ${d.outcome===k?'selected':''}>${n}</option>`).join('')}</select></label>
 <div id="ux-error" class="error" role="alert"></div>
 ${edit?`<div class="ux-savebar"><span class="small muted">완료 시 필수 회신과 기록을 확인합니다.</span><div class="actions">${btn('임시 저장',`uxSave('${c.id}',false)`)}<button class="btn primary" onclick="uxSave('${c.id}',true)" ${open.length?'disabled title="필수 협업 회신이 필요합니다"':''}>처리 완료</button></div></div>`:`<div class="ux-complete">✓ ${c.closed?'VOC 처리가 완료되었습니다. 지식 게시와는 별도로 관리합니다.':'메인 부서가 조치와 결과를 확정합니다.'}</div>`}</div>`;
}
casePage=function(){const vis=visibleCases();if(!vis.some(c=>c.id===state.caseId))state.caseId=vis[0]?.id;const c=curCase();if(!c)return head('VOC','처리할 VOC가 없습니다','현재 업무 소속에서 접근할 수 있는 기록이 없습니다.');
 const t=['tasks','refs'].includes(state.uxTab)?state.uxTab:'work';state.tab=t;
 const n=taskAgg(c.id).open.length, tabs=[['work','처리'],['tasks','협업'+(n?' · '+n:'')],['refs','근거·기록']];
 const body=t==='tasks'?tasksBody(c):t==='refs'?refsBody(c)+`<div class="panel-body"><details class="ux-more"><summary>접수·분류 기록</summary>${genericSource(c)}</details><details class="ux-more"><summary>처리 이력</summary><ul>${state.uxLogs.filter(x=>x.case===c.id).map(x=>`<li>${esc(x.text)} · ${esc(x.by)}</li>`).join('')||'<li>시연용 접수·담당 지정 기록</li>'}</ul></details></div>`:uxWork(c);
 return `<div class="ux-back">${btn('← 내 VOC 업무',"go('home')",'small text')}<span>${c.voice} / ${c.id}</span></div>`+head('VOC / WORKSPACE',esc(c.title),`${c.main} · ${c.handler}　|　${c.rel.length?'협업 '+c.rel.join(' · '):'단독 처리'}`,tag(c.closed?'처리 완료':n?'협업 회신 대기':'처리 중',c.closed?'green':n?'amber':'blue'))+
 `<div class="ux-progress"><span class="done">✓ 담당 지정</span><i>›</i><span class="${c.closed?'done':'current'}">${c.closed?'✓ 처리 완료':'처리 중'}</span><span class="ux-optional">완료 후 선택 <i>›</i> 지식 작성·결재</span></div>${roleBanner(c)}
 <div class="ux-case-tabs" role="tablist" aria-label="VOC 작업"><div>${tabs.map(([k,l])=>`<button role="tab" aria-selected="${t===k}" class="${t===k?'on':''}" onclick="caseTab('${k}')">${l}</button>`).join('')}</div><label>다른 VOC <select aria-label="다른 VOC 선택" onchange="uxOpen(this.value)">${vis.map(x=>`<option value="${x.id}" ${x.id===c.id?'selected':''}>${x.id} · ${esc(x.title)}</option>`).join('')}</select></label></div>
 <div class="case-layout ux-case-layout"><section class="panel ux-work">${body}</section><div class="stack">${uxKnowledgeCard(c)}<details class="ux-more ux-permission"><summary>담당·접근 범위</summary>${summaryPanel(c)}<p class="small">협업 요청과 배포 대상 지정은 원문·문서 접근권을 넓히지 않습니다. 현재 업무 소속의 권한을 적용합니다.</p></details></div></div>`;
};
function uxSave(cid,finish){const c=state.cases[cid];if(!uxCan(c)){toast('메인 부서 담당자만 처리할 수 있습니다.');return}const d=uxDraft(c);d.decision=$('ux-decision')?.value.trim()??d.decision;d.result=$('ux-result')?.value.trim()??d.result;
 const fail=message=>{$('ux-error').textContent=message};
 if(finish){if(taskAgg(cid).open.length){fail('필수 협업 회신을 먼저 확인해주세요.');return}if(!d.decision||!d.result){fail('조치·이유와 처리 결과를 모두 남겨주세요.');return}if(uxOpinionList(c).some(o=>!o.reason.trim())){state.uxShowOpinions=true;render();$('ux-error').textContent='부서 의견의 반영·보류 사유를 확인해주세요.';return}}
 const linked=ukRecord(c),changed=uxDecision(c)!==d.decision||(c.result||'')!==d.result||(c.outcome||'SUCCESS')!==d.outcome;
 if(linked?.approved&&changed){fail('승인된 지식의 근거를 바꾸려면 개정이 필요합니다. 이 시안에서는 원 기록을 보존합니다.');return}
 if(cid==='C-2041'){state.decision=d.decision;state.outcome=d.outcome}
 c.decision=d.decision;c.result=d.result;c.outcome=d.outcome;
 uxLog(c,finish?'처리 완료 · 결정·결과 기록':'처리 기록 임시 저장');
 if(finish){c.closed=true;vq(c.voice).st.tri='종결';state.standardClosed[c.voice]=true;state.uxShowOpinions=false}
 render();toast(finish?'VOC 처리를 완료했습니다. 필요한 경우에만 지식으로 남기세요.':'처리 기록을 저장했습니다.');
}
closeReasons=function(c){const r=[];if(!canMain(c))r.push('메인 부서 담당자만 완료할 수 있습니다.');if(taskAgg(c.id).open.length)r.push('필수 협업 회신이 남아 있습니다.');if(c.track!=='QUICK'&&(!uxDecision(c)||!c.result))r.push('조치·결과 기록이 필요합니다.');if(uxOpinionList(c).some(o=>!o.reason.trim()))r.push('부서 의견의 판단 사유가 필요합니다.');return r};
closeBar=function(c){return `<div class="ux-complete">${c.closed?'✓ VOC 처리 완료':`조치·결과를 기록한 뒤 ‘처리’ 화면에서 완료합니다. ${btn('처리 화면',"caseTab('work')",'small text')}`}</div>`};
refinementUseSuggestion=function(){const c=curCase();if(!uxCan(c))return;uxDraft(c).decision=state.refinementDecisionSuggestion||'';$('modal').close();state.uxTab='work';render();$('ux-decision')?.focus();toast('작성 중인 조치에 반영했습니다. 확인 후 직접 저장하세요.')};
function uxKnowledge(cid){const c=state.cases[cid];if(!c?.closed||!canMain(c)){toast('처리 완료 후 메인 부서 담당자가 선택합니다.');return}
 if(cid!=='C-2041'){modal('지식화 후보로 남기기',`<h3>${esc(c.title)}</h3><p class="small">${esc(c.result||'기존 지식으로 처리한 문의')}</p><label class="field">다른 업무에서도 재사용할 이유<textarea id="ux-candidate-why" placeholder="예: 동일 문의가 반복되어 표준 안내가 필요"></textarea></label><p class="small muted">후보는 공식 근거가 아닙니다. 결과 증거 검증 후 초안을 작성합니다. 이 시안의 초안·결재·배포 전체 시연은 검색 지연 사례 C-2041에서 제공합니다.</p><div id="ux-candidate-error" class="error" role="alert"></div>${btn('후보 저장',`uxCandidate('${cid}')`,'primary')}`);return}
 if(state.draft){go('review');return}
 modal('공유할 처리 결과 확인',`<div class="ux-modal-intro"><b>VOC는 이미 완료되었습니다.</b><p>공식 지식으로 남길 결과와 적용 조건을 확인합니다. AI 초안은 검증된 기록을 바탕으로 작성합니다.</p></div><label class="field">조치 전 증거<textarea id="ux-before" placeholder="동일 조건에서 관측한 수치·시험 기록">${esc(state.before||'')}</textarea></label><label class="field">조치 후 증거<textarea id="ux-after" placeholder="어떤 결과를 확인했는지">${esc(state.after||c.result)}</textarea></label><label class="field">적용 조건·한계<textarea id="ux-limits" placeholder="적용 가능한 환경과 예외·주의점">${esc(state.limits||'')}</textarea></label><label class="check"><input id="ux-evidence-check" type="checkbox">기록된 증거와 결과가 일치하는지 확인했습니다.</label><div id="ux-verify-error" class="error" role="alert"></div><div class="actions">${btn('취소',"$('modal').close()")}${btn('검증하고 AI 초안 작성',"uxGenerate()",'primary')}</div><p class="small muted">실제 모델 호출 없이 예시 초안을 생성합니다. 승인 전에는 공식 검색·배포 대상이 아닙니다.</p>`);
}
function uxCandidate(cid){const c=state.cases[cid],why=$('ux-candidate-why').value.trim();if(!canMain(c)||!c.closed)return;if(!why){$('ux-candidate-error').textContent='재사용할 이유를 남겨주세요.';return}state.uxCandidates[cid]={why,by:myName()};c.toKnowledge=true;uxLog(c,'지식화 후보 등록');$('modal').close();render();toast('후보로 저장했습니다. 검증·승인 없이 공식 지식으로 사용하지 않습니다.')}
function uxGenerate(){const c=state.cases['C-2041'];if(!canMain(c)||!c.closed||state.draft)return;const record={before:$('ux-before').value.trim(),after:$('ux-after').value.trim(),limits:$('ux-limits').value.trim()};if(Object.values(record).some(x=>!x)||!$('ux-evidence-check').checked){$('ux-verify-error').textContent='전후 증거·적용 조건을 입력하고 확인 표시를 해주세요.';return}Object.assign(state,record,{verified:true,draft:true});c.verified=true;c.toKnowledge=true;uxLog(c,'결과 검증 · AI 지식 초안 작성');$('modal').close();go('review');toast('검증한 결과로 AI 예시 초안을 작성했습니다. 내용을 수정하고 공식 근거를 선택하세요.')}
createDraft=function(){uxKnowledge('C-2041')};
stageBar=function(){return `<div class="ux-progress"><span class="${state.cases['C-2041'].closed?'done':'current'}">${state.cases['C-2041'].closed?'✓ VOC 처리 완료':'VOC 처리'}</span><i>›</i><span class="${state.submitted?'done':state.draft?'current':''}">${state.submitted?'✓ ':''}지식 작성</span><i>›</i><span class="${state.approved?'done':state.submitted?'current':''}">독립 결재</span><i>›</i><span class="${state.distributed?'done':''}">${state.distributed?'✓ 배포 완료':'자동 게시·배포'}</span></div>`};
reviewPage=function(){if(!state.draft)return head('KNOWLEDGE / REVIEW','지식 작성·결재','공유할 가치가 있는 해결 경험만 공식 지식으로 남깁니다.')+panel('작성 중인 지식이 없습니다',`<div class="empty"><h2>완료된 VOC에서 시작하세요.</h2><p>처리 완료 → 결과 검증·AI 초안 → 독립 승인 → 자동 배포</p>${btn('내 VOC 업무',"go('home')",'primary')}</div>`);return uxOriginal.review()};
function uxReviewLayout(){const main=$('main');if(state.page!=='review'||!state.draft)return;
 const head=main.querySelector('.page-head');if(head){head.querySelector('h1').textContent='공유할 지식을 확인하고 제출하세요';const p=head.querySelector('p');if(p)p.textContent='VOC 처리는 완료되었습니다. 지식 내용·근거·공유 범위를 확인하면 결재로 이어집니다.'}
 main.querySelectorAll('.context').forEach(x=>x.remove());
 const compare=main.querySelector('.comparison');if(compare){const original=compare.querySelector('section.panel');if(original&&!original.closest('details')){const d=document.createElement('details');d.className='ux-original-record';const s=document.createElement('summary');s.textContent='원본 업무와 정제 내역 비교';original.before(d);d.append(s,original)}compare.querySelector('.arrow')?.remove()}
 const targets=[...main.querySelectorAll('section.panel')].find(p=>p.querySelector('#target-error'));
 if(targets&&!targets.parentElement.classList.contains('ux-target-fold')){const d=document.createElement('details');d.className='ux-target-fold';d.open=!!state.uxTargetsOpen;const s=document.createElement('summary');s.innerHTML=`<strong>공유할 부서</strong><span>${esc(state.targets.join(' · '))}</span><b>변경</b>`;targets.before(d);d.append(s,targets);d.ontoggle=()=>state.uxTargetsOpen=d.open}
 const note=main.querySelector('.refinement-approval-note');if(note){note.innerHTML='<strong>결재선</strong><p>상신 → 관련 부서 합의(동시) → 최종 승인·게시</p><span class="small muted">공유 범위를 넓힐 때만 원본 소유 측·정책 승인이 합의와 같은 묶음에 더해집니다.</span>'}
}
render=function(...args){const r=uxOriginal.render.apply(this,args);document.body.classList.add('ux-workflow');const demo=document.querySelector('.demo strong');if(demo)demo.textContent='WORKFLOW CONCEPT';
 if(state.page==='home'&&['handler','reviewer','opsmember','devmember'].includes(state.role)){$('main').querySelector('h1').textContent='오늘 처리할 VOC';$('main').querySelector('.page-head p').textContent='접수된 문의를 해결하고, 다시 쓸 수 있는 경험을 지식으로 남깁니다.'}
 if(state.page==='voice'){const h=$('main').querySelector('h1'),p=$('main').querySelector('.page-head p');if(h)h.textContent='VOC 수신함';if(p)p.textContent='정제된 문의와 AI 분석을 확인하고 담당 부서를 지정하세요. 지식화 여부는 처리한 뒤 결정할 수 있습니다.'}
 if(state.page==='case'&&curCase()?.closed){const ai=$('main').querySelector('.refinement-ai'),stack=$('main').querySelector('.case-layout>.stack');if(ai&&stack){const d=document.createElement('details');d.className='ux-more ux-permission';const s=document.createElement('summary');s.textContent='AI 처리 분석 다시 보기';d.append(s,ai);stack.append(d)}}
 uxReviewLayout();return r};
document.addEventListener('DOMContentLoaded',()=>render());
