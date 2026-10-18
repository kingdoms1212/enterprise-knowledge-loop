'use strict';
/* v2.1 · 처리 경로 3갈래 + 지식화 4단계(접수·처리·승인·공유 자동). loop.js(v2.0) 위에 덧씌운다. 모든 데이터는 가상이다. */
Object.assign(state,{voice:'V-2041',targets:['고객지원팀','운영팀'],indexing:false,quickClosed:{},standardClosed:{},candidateOpen:true,candidatePromoted:false,reuseCount:0,
 opinions:[
  {who:'운영팀 · 오민준',title:'캐시 설정부터 점검',text:'전체 색인 재구축 전에 캐시 적중률과 최근 설정 차이를 확인할 수 있습니다.',adopt:true,reason:'영향이 작은 1차 조치로 채택'},
  {who:'개발팀 · 한유진',title:'색인 재구축은 후순위',text:'운영 중 재구축은 부하를 높일 수 있습니다. 복구 가능한 설정 조정을 먼저 권고합니다.',adopt:true,reason:'재구축은 캐시 조정 실패 시 검토'},
  {who:'고객지원팀 · 김도윤',title:'고객 업무 영향 최소화',text:'점검 시간과 복구 기준을 공유하고, 조치 전후 응답 시간을 확인해야 합니다.',adopt:true,reason:'전후 응답 시간을 검증 조건으로 반영'}]});
roles.handler.menus=roles.handler.menus.filter(m=>m!=='pipeline');
pages.distribution[1]='부서 지식함';
const TRACK={QUICK:['바로 종결','green'],STANDARD:['일반 처리','blue'],KNOWLEDGE:['지식화','purple']};
state.manual=[];state.approverChanges=[];
const voices=[
 {id:'V-2041',ext:'CS-7821',title:'업데이트 후 문서 검색 속도 저하',quote:'업데이트 이후 검색 결과가 나오기까지 약 8초가 걸려 업무가 지연됩니다.',time:'10.07 09:12',suggest:'KNOWLEDGE',why:'근거 지식 없음 · 같은 증상 30일 내 2건 · 운영·개발 협업 필요',dept:'운영·개발'},
 {id:'V-2043',ext:'CS-7830',title:'비밀번호 초기화 메일이 오지 않습니다',quote:'초기화 버튼을 눌렀는데 메일이 오지 않아 로그인을 못 하고 있습니다.',time:'10.07 09:40',suggest:'QUICK',why:'게시 지식 K-1022 v3과 일치 · 같은 문의 이번 달 14건 처리',dept:'고객지원',kid:'K-1022 v3',ktitle:'계정 비밀번호 초기화 안내',kbody:'스팸함 확인 → 등록 메일 주소 확인 → 재발송(10분 간격) → 지속 시 계정 잠금 해제 요청.'},
 {id:'V-2044',ext:'CS-7834',title:'첨부 PDF 미리보기 일부 깨짐',quote:'특정 PDF를 미리보기로 열면 표가 깨져 보입니다. 다운로드하면 정상입니다.',time:'10.07 10:05',suggest:'STANDARD',why:'근거 지식 없음 · 개발팀 단일 처리 예상',dept:'개발'}];
const vById=id=>voices.find(v=>v.id===id);
const trackOf=v=>state['track_'+v.id]||v.suggest;
const voiceStatus=v=>state.quickClosed[v.id]?'종결 · 지식 재사용':state.standardClosed[v.id]?'종결':v.id==='V-2041'?(state.distributed?'지식 공유 완료':'지식화 진행'):'처리 대기';

/* 하나의 진행 표시: 접수 · 처리 · 승인 · 공유(자동) */
function stageBar(){
 const ap=(state.sourceApproved?1:0)+(state.policyApproved?1:0);
 const s=[
  {t:'접수',d:'AI 경로 제안 · 지식화로 확정',done:true},
  {t:'처리',d:!state.decision?'의견 반영해 결정':state.verified?'결정·결과 검증 완료':'결과 검증 필요',done:!!state.decision&&state.verified},
  {t:'승인',d:!state.draft?'검증하면 초안 자동 생성':!state.submitted?'초안 확인 · 배포 부서 직접 선택 후 제출':state.approved?'승인 완료':`확대 승인 ${ap}/2 · 승인자가 부서 조정 후 승인`,done:state.approved},
  {t:'공유',d:state.retired?'폐기 · 배포 철회':state.distributed?`${state.targets.join('·')} 전달 완료`:state.indexing?'게시 · 색인 준비 중':'승인하면 게시·색인·전달',done:state.distributed||state.retired,auto:true}];
 const now=s.findIndex(x=>!x.done);
 return `<div class="stagebar" aria-label="지식화 진행 단계">${s.map((x,i)=>`<div class="stage ${x.done?'done':''} ${i===now?'now':''}" ${i===now?'aria-current="step"':''}><small>STEP ${i+1}${x.auto?' · 자동':''}</small><strong>${x.done?'✓ ':''}${x.t}</strong><span>${x.d}</span></div>`).join('')}</div>`;
}

/* 홈: 경로별 현황 + 지식화 후보 */
const homePageV20=homePage;
homePage=function(){
 const html=homePageV20();
 if(!canCase()||state.role==='sourceowner')return html;
 const n={QUICK:0,STANDARD:0,KNOWLEDGE:0};voices.forEach(v=>n[trackOf(v)]++);
 const tracks=`<div class="section-title"><h2>이번 VOC는 어떤 경로로 처리하나요?</h2><span class="small muted">AI 제안 · 담당자 확정 · 가상 3건</span></div><div class="track-grid">${Object.entries(TRACK).map(([k,[name,c]])=>`<button class="track-card" onclick="go('voice')"><span class="tag ${c}">${name}</span><strong>${n[k]}<span> 건</span></strong><p>${{QUICK:'게시된 지식으로 답하고 바로 종결 · 재사용 기록',STANDARD:'결정·결과만 기록하고 종결 · 의견은 필요할 때만',KNOWLEDGE:'새 문제·반복·다부서 · 검증 후 지식으로 공유'}[k]}</p></button>`).join('')}</div>`;
 const cand=state.candidateOpen?`<section class="panel candidate"><div class="panel-head"><h2>지식화 후보</h2>${tag('시스템 제안','purple')}</div><div class="panel-body"><strong>근거 지식 없이 반복된 ‘PDF 미리보기 깨짐’ 문의 3건</strong><p class="small">최근 30일 · C-2044, C-2031, C-2019 · 모두 개발팀 처리 · 기준: 근거 없는 유사 Case 3건</p><div class="actions" style="margin-top:12px">${btn('대표 Case로 지식화',"promoteCandidate()",'primary small')}${btn('지금은 넘기기',"dismissCandidate()",'small')}</div><p class="small muted" style="margin-top:8px">자동으로 초안을 만들거나 게시하지 않습니다.</p></div></section>`:state.candidatePromoted?`<div class="notice">C-2044를 대표로 지식화 경로로 승격했습니다. 나머지 2건은 같은 지식의 출처로 묶입니다.</div>`:'';
 return html.replace(/<div class="section-title"><h2>지금, 지식은 어디까지 왔나요\?<\/h2>[\s\S]*?<\/div><div class="journey">[\s\S]*?<\/div><div class="grid">/,`${tracks}${cand}<div class="section-title"><h2>지식화 중인 업무 · C-2041</h2><span class="small muted">하나의 진행 표시</span></div>${stageBar()}<div class="grid">`);
};
function promoteCandidate(){state.candidateOpen=false;state.candidatePromoted=true;state['track_V-2044']='KNOWLEDGE';render();toast('C-2044를 지식화로 승격했습니다. 경로 변경 이력이 남습니다.')}
function dismissCandidate(){modal('지식화 후보 넘기기',`<label class="field">넘기는 이유<input id="dismiss-reason" placeholder="예: 다음 업데이트에서 근본 수정 예정"></label><div id="dismiss-error" class="error" role="alert"></div>${btn('넘기기',"confirmDismiss()",'primary')}`)}
function confirmDismiss(){if(!$('dismiss-reason').value.trim()){$('dismiss-error').textContent='넘기는 이유를 입력해주세요.';return}$('modal').close();state.candidateOpen=false;render();toast('후보를 넘겼습니다. 사유가 기록됩니다.')}

/* 접수된 VOC: 목록 + 경로 제안·확정 + 경로별 처리 */
voicePage=function(){
 const v=vById(state.voice),t=trackOf(v),closed=state.quickClosed[v.id]||state.standardClosed[v.id];
 const list=voices.map(x=>`<button class="voice-row ${x.id===v.id?'active':''}" onclick="state.voice='${x.id}';render()"><span class="mono">${x.id} · ${x.time}</span><strong>${x.title}</strong><span>${tag(TRACK[trackOf(x)][0],TRACK[trackOf(x)][1])} ${tag(voiceStatus(x),voiceStatus(x).startsWith('종결')||voiceStatus(x).includes('완료')?'green':'')}</span></button>`).join('');
 const choose=`<fieldset class="track-pick" ${closed?'disabled':''}><legend>처리 경로 확정</legend>${Object.entries(TRACK).map(([k,[name]])=>`<label class="${t===k?'on':''}"><input type="radio" name="track" value="${k}" ${t===k?'checked':''} onchange="setTrack('${k}')">${name}${v.suggest===k?' <small>AI 제안</small>':''}</label>`).join('')}</fieldset>`;
 let act='';
 if(closed)act=`<div class="notice">${state.quickClosed[v.id]?`${v.kid}을 적용해 종결했습니다. 재사용 1건이 기록됐습니다.`:'결정과 결과를 기록하고 종결했습니다.'}</div>`;
 else if(t==='QUICK')act=v.kid?`<div class="kcard">${tag('게시 지식 · 현재 권한 확인','green')}<h3>${v.ktitle} · ${v.kid}</h3><p>${v.kbody}</p></div><label class="field">적용 사유<input id="quick-reason" value="등록 메일 확인 후 재발송 안내로 해결 가능"></label><div id="voice-error" class="error" role="alert"></div>${btn('이 지식으로 처리하고 종결',"quickResolve()",'primary')}<p class="small muted" style="margin-top:8px">맞지 않으면 경로를 일반 처리로 바꾸세요. ‘보완 필요’는 지식 소유자에게 전달됩니다.</p>`:`<div class="notice amber">답할 게시 지식이 없습니다. 일반 처리나 지식화로 진행하세요.</div>`;
 else if(t==='STANDARD')act=`<label class="field">결정과 사유<textarea id="std-decision">${v.id==='V-2044'?'PDF 렌더러의 표 처리 옵션을 조정하고 고객에게 다운로드 우회 방법을 안내합니다.':''}</textarea></label><label class="field">결과 요약<input id="std-result" value="${v.id==='V-2044'?'옵션 조정 후 해당 PDF 정상 표시 확인':''}"></label><label class="check"><input type="checkbox" id="std-knowledge"> 다른 부서도 알아야 할 내용입니다 · 종결 후 지식화로 전환</label><div id="voice-error" class="error" role="alert"></div>${btn('처리하고 종결',"standardClose()",'primary')}<p class="small muted" style="margin-top:8px">부서 의견·전후 증거는 필요할 때만 남깁니다.</p>`;
 else act=`<div class="notice purple">지식화 경로는 의견을 반영한 결정 → 결과 검증 → 승인 → 자동 공유 순서로 진행합니다.</div>${btn('지식화 업무 열기 →',"go('case')",'primary')}`;
 return head('01 / IMPORTED VOICE','접수된 VOC를 알맞은 경로로 처리합니다','대부분은 기존 지식으로 바로 끝내고, 새로운 문제만 지식으로 만듭니다.',tag('고객용 접수 화면 아님'))+`<div class="voice-layout"><section class="panel"><div class="panel-head"><h2>반입된 VOC</h2>${tag('3건 · 가상')}</div>${list}</section><section class="panel"><div class="panel-head"><h2>${v.id} · ${v.ext}</h2>${tag('정제 완료','green')}</div><div class="panel-body"><h2>${v.title}</h2><blockquote>“${v.quote}”</blockquote><div class="notice purple"><strong>로컬 AI 경로 제안 · ${TRACK[v.suggest][0]}</strong><br>${v.why}<br>관련 부서: ${v.dept}</div>${choose}${act}</div></section></div>`;
};
function setTrack(k){const v=vById(state.voice);const from=trackOf(v);if(from==='KNOWLEDGE'&&k!=='KNOWLEDGE'&&state.submitted){toast('지식 제출 후에는 경로를 낮출 수 없습니다.');render();return}state['track_'+v.id]=k;render();toast(`${TRACK[k][0]}로 확정했습니다. AI 제안(${TRACK[v.suggest][0]})과 함께 기록됩니다.`)}
function quickResolve(){if(state.role!=='handler'){toast('담당자 시안에서 처리해주세요.');return}if(!$('quick-reason').value.trim()){$('voice-error').textContent='적용 사유를 입력해주세요.';return}state.quickClosed[state.voice]=true;state.reuseCount++;render();toast('종결했습니다. K-1022 v3 재사용 1건 기록 · 검증 없는 결과라 지식 출처로는 쓰지 않습니다.')}
function standardClose(){if(state.role!=='handler'){toast('담당자 시안에서 처리해주세요.');return}if(!$('std-decision').value.trim()||!$('std-result').value.trim()){$('voice-error').textContent='결정·사유와 결과 요약을 입력해주세요.';return}const k=$('std-knowledge').checked;state.standardClosed[state.voice]=!k;if(k){state['track_'+state.voice]='KNOWLEDGE'}render();toast(k?'지식화 경로로 전환했습니다. 검증 항목을 보완해주세요.':'결정과 결과를 기록하고 종결했습니다.')}

/* Case: 탭 3개(접수 기록·결정·결과 검증)와 4단계 바 */
casePath=function(){return stageBar()+`<div class="pathbar">${[['source','접수 기록'],['decision','결정 · 부서 의견'],['outcome','결과 검증']].map(([id,n])=>`<button class="${state.tab===id?'active':''}" onclick="caseTab('${id}')">${n}</button>`).join('')}</div>`};
const casePageV20=casePage;
casePage=function(){
 if(['opinions','knowledge'].includes(state.tab))state.tab=state.tab==='opinions'?'decision':'outcome';
 let html=casePageV20();
 const ro=state.role!=='handler'?'disabled':'';
 if(state.tab==='decision'){
  const ops=state.opinions.map((o,i)=>`<div class="op-row"><div><strong>${o.who}</strong><p>${o.title} — ${o.text}</p></div><select aria-label="${o.who} 반영 여부" ${ro} onchange="state.opinions[${i}].adopt=this.value==='y'"><option value="y" ${o.adopt?'selected':''}>반영</option><option value="n" ${!o.adopt?'selected':''}>보류</option></select><input aria-label="${o.who} 판단 사유" id="op-reason-${i}" value="${esc(o.reason)}" ${ro} oninput="state.opinions[${i}].reason=this.value"></div>`).join('');
  const body=`<div class="panel-body"><div class="notice purple"><strong>AI 제안</strong><br>색인 상태 확인 및 재구축 검토 · 확정 조치가 아닙니다.</div><h3>부서 의견 반영</h3><p class="small muted">의견마다 반영 여부와 사유를 결정과 함께 저장합니다.</p>${ops}<div class="ext-slot"><button class="btn small" disabled>메일·메신저 기록 가져오기</button>${tag('확장 예정 · 인터페이스만 정의')}</div><h3 style="margin-top:18px">사람의 결정</h3><label class="field">채택 사유와 적용 조건<textarea id="decision-reason" ${ro} placeholder="예: 업무 중단을 줄이기 위해 캐시 조정을 먼저 진행하고, 악화되면 복구합니다.">${esc(state.decision||'운영·개발 의견을 반영해 캐시 설정 점검과 복구 가능한 조정을 먼저 수행합니다. 악화되면 즉시 복구합니다.')}</textarea></label><div id="case-error" class="error" role="alert"></div>${btn('결정 저장',"saveDecision()",'primary')}</div>`;
  html=html.replace(/<section class="panel"><div class="panel-body"><div class="notice purple"><strong>AI 제안<\/strong>[\s\S]*?결정 저장<\/button><\/div><\/section>/,`<section class="panel">${body}</section>`);
 }
 if(state.tab==='outcome'){
  html=html.replace(/<button class="btn primary" onclick="verifyOutcome\(\)">증거 확인 · 결과 검증<\/button>/,`<button class="btn primary" onclick="verifyOutcome()" ${state.verified?'disabled':''}>검증 완료 · 지식 초안 자동 생성</button>`+(state.draft?`<div class="kcard" style="margin-top:16px">${tag('AI 초안 · 사람 확인 필요','purple')}<h3>${state.outcome==='FAIL'?'캐시 조정 실패 시 확인할 교훈':'검색 지연 대응 가이드'} · K-2041 v1</h3><p>고객 식별 정보 제거 · 배포 대상 제안: ${state.targets.join(', ')}</p>${btn(state.submitted?'지식화 검토 보기 →':'초안 확인·제출 →',"go('review')",'primary small')}</div>`:''));
 }
 return html;
};
const saveDecisionV20=saveDecision;
saveDecision=function(){if(state.role==='handler'){for(let i=0;i<state.opinions.length;i++){if(!state.opinions[i].reason.trim()){$('case-error').textContent='부서 의견마다 반영·보류 사유를 입력해주세요.';return}}}saveDecisionV20()};
const verifyOutcomeV20=verifyOutcome;
verifyOutcome=function(){verifyOutcomeV20();if(!state.verified)return;state.draft=true;state.tab='outcome';render();toast('결과를 검증했고 AI가 지식 초안과 배포 대상을 제안했습니다.')};

/* 지식화 검토: 배포 대상 확정 · 조건부 확대 승인 · 승인하고 게시 */
const reviewPageV20=reviewPage;
reviewPage=function(){
 const html=reviewPageV20();if(!state.draft)return html;
 const cut=html.indexOf('<div class="grid" style="margin-top:20px">');
 const top=html.slice(0,cut).replace(/(<div class="context">[\s\S]*?<\/div>)/,'$1'+stageBar());
 const targets=targetPanel();
 const appr=[['sourceowner','원본 소유자 · 이수현','원본 의존 해제와 정제 범위 확인',state.sourceApproved],['policyofficer','정책 승인자 · 정하린','관계자 한정 → 제안 공유 범위 검토',state.policyApproved]];
 const sharing=panel('공유 확대 승인',`<p class="small">${sharingText()}</p>${appr.map(([r,n,d,ok])=>`<div class="approval"><div><strong>${n}</strong><p>${d}</p></div>${state.role===r&&state.submitted&&!ok?btn('승인',`approveShare('${r}')`,'primary small'):tag(ok?'승인됨':state.submitted?'요청됨':'제출 시 요청',ok?'green':'amber')}</div>`).join('')}`,tag('조건부','amber'));
 let action='';
 if(state.retired)action=tag('폐기된 버전');
 else if(state.indexing)action=tag('게시·색인 처리 중','amber');
 else if(state.published)action=btn('부서 지식함 보기',"go('distribution')");
 else if(state.role==='handler')action=state.submitted?tag('승인 진행 중','amber'):`<label class="check"><input id="review-confirm" type="checkbox"> 초안의 내용·증거·배포 대상을 확인했습니다.</label>${btn('검토 제출',"submitPlan()",'primary')}`;
 else if(state.role==='reviewer')action=state.submitted?`<label class="check"><input id="review-confirm" type="checkbox"> 현재 버전의 내용·증거·공유 범위를 확인했습니다.</label><div class="actions">${btn('반려',"rejectDraft()")}${btn('승인하고 게시',"approveAndPublish()",'primary')}</div>`:tag('담당자 제출 대기');
 else action=tag(state.submitted?'확대 승인 진행 중':'담당자 제출 대기','amber');
 return top+`<div class="grid equal" style="margin-top:20px">${targets}${sharing}</div><section class="panel action-bar"><span class="small">승인하면 게시 → 색인 → 대상 부서 전달이 자동으로 이어집니다.</span><div>${action}</div></section>`;
};
function submitPlan(){if(!$('review-confirm').checked){toast('내용·증거·배포 대상 확인이 필요합니다.');return}
 const c=cover();if(!state.sel.length){$('target-error').textContent='배포 대상 부서를 하나 이상 선택하세요.';return}
 if(c.out&&!state.policy){$('target-error').textContent='공유 범위 밖 인원의 처리 방법을 고르세요.';return}
 if(state.policy==='EXPAND')state.expanded=c.outU;
 state.submitted=true;render();toast('제출했습니다. 원본 소유자·정책 승인 요청을 동시에 보냈습니다.')}
function approveShare(r){if(state.role!==r||!state.submitted)return;if(r==='sourceowner')state.sourceApproved=true;else state.policyApproved=true;render();toast('승인을 기록했습니다.')}
function rejectDraft(){modal('지식 반려',`<label class="field">반려 사유<textarea id="reject-reason" placeholder="보완할 내용과 근거"></textarea></label><div id="reject-error" class="error" role="alert"></div>${btn('반려 확정',"confirmReject()",'danger')}`)}
function confirmReject(){if(!$('reject-reason').value.trim()){$('reject-error').textContent='반려 사유를 입력해주세요.';return}$('modal').close();Object.assign(state,{submitted:false,sourceApproved:false,policyApproved:false,approverChanges:[],expanded:[]});render();toast('반려했습니다. 담당자 초안 단계로 돌아갑니다.')}
function approveAndPublish(){
 if(state.role!=='reviewer'||!state.submitted)return;
 if(!$('review-confirm').checked){toast('내용·증거·공유 범위 확인이 필요합니다.');return}
 if(!state.sel.length){$('target-error').textContent='배포 대상 부서를 하나 이상 선택하세요.';return}
 if(!state.sourceApproved||!state.policyApproved){toast('원본 소유자와 정책 승인이 모두 필요합니다.');return}
 state.approved=true;state.indexing=true;render();toast(state.expanded.length?`승인했습니다. ${state.expanded.map(u=>org(u).n).join(', ')}에 열람 권한을 자동 설정하고 게시·색인 후 전달합니다.`:'승인했습니다. 게시·색인을 진행하고, 준비되면 부서에 자동 전달합니다.');
 setTimeout(()=>{if(state.retired||!state.indexing)return;state.indexing=false;state.published=true;state.distributed=true;render();toast(`양 색인 준비 완료 · ${state.targets.join(', ')} 중 열람 가능 ${cover().ok}명에게 전달했습니다.`)},1500);
}

/* 부서 지식함: 배포 현황(검토·게시자) + 수신함(확인 기본 생략) */
const distributionPageV20=distributionPage;
distributionPage=function(){
 if(state.role==='reviewer'){
  const st=state.retired?'철회':state.distributed?'전달 완료':state.indexing?'색인 준비 후 전달':state.submitted?'승인 대기':'계획 없음';
  return head('04 / DEPARTMENT DELIVERY','배포 현황','승인 때 확정된 대상에 자동 전달된 내역입니다. 수동 배포는 예외 처리용입니다.')+(state.draft?stageBar():'')+`<div class="grid">${panel('K-2041 v1 · 대상 부서',state.submitted?state.targets.map(d=>`<div class="info-row"><span>${d}</span>${tag(st,st==='전달 완료'?'green':st==='철회'?'':'amber')}</div>`).join('')+state.manual.map(m=>`<div class="info-row"><span>${m.d} ${tag('수동')}<br><small>${m.reason}${m.ack?' · 수신 확인 요청':''}</small></span>${tag(state.retired?'철회':m.st,m.st.startsWith('전달 완료')&&!state.retired?'green':'amber')}</div>`).join('')+`<div class="scope">수신함은 색인 준비 후에만 생성되며, 대상 지정으로 권한이 자동 부여되지 않습니다. 수신 확인은 요청하지 않았습니다.</div>`:'<p>아직 제출된 배포 계획이 없습니다.</p>')}${panel('예외 처리',`<div class="info-row"><span>색인 실패</span><strong>배포 대기 · 운영 재시도</strong></div><div class="info-row"><span>부서 추가</span><strong>공유 범위 검토 후 추가 배포</strong></div><div class="info-row"><span>새 버전 게시</span><strong>기존 배포 대체 · 새로 전달</strong></div>`)}</div>`+manualPanel();
 }
 return distributionPageV20().replace(/<button class="btn primary small" onclick="acknowledge\(\)">이 버전 수신 확인<\/button>/,'').replace('확인 대기','확인 요청 없음 · 승인 시 자동 배포');
};

/* 배포 현황: 담당자·승인자가 대상 부서를 직접 지정 (예외 배포) */
function manualPanel(){
 const ready=state.published&&!state.retired,ms=state.mSel,mc=ms.length?cover(ms,state.mExcl):null;
 const body=!ready?`<p class="small">게시가 끝난 버전에만 추가할 수 있습니다. 게시 전에는 지식화 검토 화면에서 대상 부서를 고칩니다.</p>`:
 `<p class="small">자동 배포 대상에 없던 부서를 조직도에서 직접 지정합니다. 공유 범위 안 인원은 바로 받고, 범위 밖 인원은 확대 승인 후 받습니다. 지정만으로 권한이 생기지 않습니다.</p>
 <div class="chips">${ms.map(x=>`<span class="chip">${selLabel(x)}</span>`).join('')||'<span class="small muted">선택된 부서 없음</span>'}${btn('＋ 부서 선택',"openOrgPicker('manual')",'small')}</div>${mc?coverLine(mc):''}
 <label class="field">지정 사유<input id="m-reason" placeholder="예: 품질 점검 항목과 겹침"></label>
 <label class="check"><input id="m-ack" type="checkbox"> 이 대상에는 수신 확인 요청</label>
 <div id="m-error" class="error" role="alert"></div>${btn('선택 대상에 배포',"manualDistribute()",'primary small')}`;
 return `<div class="grid" style="margin-top:20px">${panel('대상 부서 직접 지정',body,tag('수동','amber'))}${panel('예외 처리',`<div class="info-row"><span>색인 실패</span><strong>배포 대기 · 운영 재시도</strong></div><div class="info-row"><span>전달 실패 부서</span><strong>해당 부서만 재배포</strong></div><div class="info-row"><span>새 버전 게시</span><strong>자동·수동 대상 모두 새 버전으로 전달</strong></div><div class="info-row"><span>폐기</span><strong>자동·수동 배포 모두 철회</strong></div>`)}</div>`;
}
function manualDistribute(){
 const ms=state.mSel,reason=$('m-reason').value.trim();
 if(!ms.length){$('m-error').textContent='배포할 부서를 선택하세요.';return}
 if(!reason){$('m-error').textContent='지정 사유를 입력하세요. 감사 기록에 남습니다.';return}
 const c=cover(ms,state.mExcl),d=ms.map(selLabel).join(', ');
 state.manual.push({d,reason,ack:$('m-ack').checked,st:c.out?`${c.ok}명 전달 · ${c.out}명 확대 승인 대기`:`전달 완료 · ${c.ok}명`});state.mSel=[];state.mExcl=[];render();
 toast(c.out?`${d}: 열람 가능 ${c.ok}명에게 전달했고, 범위 밖 ${c.out}명은 확대 승인을 요청했습니다.`:`${d} ${c.ok}명에게 K-2041 v1을 전달했습니다.`);
}

/* 조직도 기반 배포 대상 선택: 대상은 "부서 + 하위 포함 여부 + 제외" 규칙으로 저장하고, 전달 시점 조직도로 사람을 계산한다 */
const ORG=[['all','전사',null,0],
['cx','고객경험본부','all',3],['cs','고객지원팀','cx',42],['ts','기술지원팀','cx',28],['voc','VOC분석팀','cx',9],
['op','운영본부','all',3],['ops','운영팀','op',35],['infra','인프라팀','op',21],['qm','품질관리팀','op',14],
['dev','개발본부','all',4],['plat','플랫폼개발팀','dev',38],['srch','검색개발팀','dev',17],['aid','AI개발팀','dev',12],['qa','QA팀','dev',15],
['sales','영업본부','all',3],['dom','국내영업팀','sales',40],['gl','해외영업팀','sales',18],['pt','파트너영업팀','sales',11],
['mg','경영지원본부','all',4],['hr','인사팀','mg',10],['fin','재무팀','mg',9],['law','법무팀','mg',6]].map(([id,n,p,h])=>({id,n,p,h}));
const SCOPE=['cx','cs','ts','voc','op','ops','infra','qm','srch']; // 이 지식에 제안된 공유 범위(확대 승인 대상)
const LOWCLR={infra:2}; // 보안등급 미달 인원: 공유 범위를 넓혀도 전달하지 않는다
const org=id=>ORG.find(o=>o.id===id),kids=id=>ORG.filter(o=>o.p===id),desc=id=>kids(id).flatMap(k=>[k.id,...desc(k.id)]);
Object.assign(state,{sel:[{id:'cs',sub:false},{id:'ops',sub:false}],sugg:['cs','ops'],excl:[],policy:null,expanded:[],mSel:[],mExcl:[]});
function units(sel=state.sel,excl=state.excl){const s=new Set();sel.forEach(x=>{s.add(x.id);if(x.sub)desc(x.id).forEach(d=>s.add(d))});excl.forEach(e=>[e,...desc(e)].forEach(d=>s.delete(d)));return[...s]}
function cover(sel=state.sel,excl=state.excl,expanded=state.expanded){let people=0,ok=0,out=0,clr=0;const outU=[];
 units(sel,excl).forEach(id=>{const u=org(id),c=LOWCLR[id]||0;people+=u.h;clr+=c;if(SCOPE.includes(id)||expanded.includes(id))ok+=u.h-c;else if(u.h){out+=u.h-c;outU.push(id)}});
 return{people,ok,out,clr,outU}}
const selLabel=x=>org(x.id).n+(x.sub&&kids(x.id).length?' 전체':'');
function syncTargets(){state.targets=state.sel.map(selLabel)}
syncTargets();
const coverLine=c=>`<div class="cover"><span>대상 <b>${c.people}</b>명</span><span>열람 가능 <b>${c.ok}</b>명</span><span class="${c.out?'deny':''}">공유 범위 밖 <b>${c.out}</b>명</span><span>보안등급 미달 <b>${c.clr}</b>명 · 전달 제외</span></div>`;

function targetPanel(){
 const byHandler=state.role==='handler'&&!state.submitted,byApprover=state.role==='reviewer'&&state.submitted&&!state.approved,editable=byHandler||byApprover,c=cover();
 const intro=byHandler?'AI 제안은 출발점입니다. [부서 추가]에서 조직도로 팀이나 상위 부서(하위 포함)를 고르세요. 전사 배포는 "전사"를 고르면 됩니다.'
  :byApprover?'승인 전에 대상을 조정할 수 있습니다. 빼는 것은 자유롭고, 추가한 부서 중 승인된 공유 범위 밖 인원에게는 전달하지 않습니다.'
  :state.approved?'승인 때 확정된 대상입니다. 게시 후 추가는 부서 지식함의 "대상 부서 직접 지정"에서 합니다.':'담당자가 제출하면 승인자가 이 대상을 확인·조정합니다.';
 const chips=state.sel.map((x,i)=>`<span class="chip">${selLabel(x)}${state.sugg.includes(x.id)?' '+tag('AI 제안','purple'):''}${editable?`<button aria-label="${selLabel(x)} 빼기" onclick="removeSel(${i})">×</button>`:''}</span>`).join('')||'<span class="small muted">선택된 부서가 없습니다.</span>';
 const ex=state.excl.length?`<p class="small">제외: ${state.excl.map(e=>org(e).n).join(', ')}</p>`:'';
 let pol='';
 if(c.out||state.policy){const names=c.outU.map(u=>org(u).n).join(', ');
  pol=byHandler&&c.out?`<div class="notice amber"><b>${names}</b>은(는) 이 지식의 공유 범위 밖입니다. 대상으로 정해도 열람 권한은 생기지 않으니 처리 방법을 고르세요.
   <label class="check"><input type="radio" name="pol" ${state.policy==='READABLE_ONLY'?'checked':''} onchange="setPolicy('READABLE_ONLY')"><span>열람 가능한 ${c.ok}명에게만 전달 (범위 밖 ${c.out}명은 받지 않음)</span></label>
   <label class="check"><input type="radio" name="pol" ${state.policy==='EXPAND'?'checked':''} onchange="setPolicy('EXPAND')"><span>공유 범위를 넓혀 확대 승인 요청 (원본 소유·정책 승인 후 ${c.ok+c.out}명에게 전달)</span></label></div>`
  :state.policy==='EXPAND'?`<div class="notice">공유 범위 확대 포함: ${state.expanded.map(u=>org(u).n).join(', ')||names} · 확대 승인 후 전달</div>`
  :c.out?`<div class="notice amber">공유 범위 밖 ${c.out}명(${names})은 전달하지 않습니다. 열람 가능자에게만 전달합니다.</div>`:'';}
 const log=state.approverChanges.length?`<div class="notice amber">승인자 조정: ${state.approverChanges.join(' · ')} — 승인 기록에 변경 전후가 남습니다.</div>`:'';
 return panel('배포 대상 부서',`<p class="small">${intro}</p><div class="chips">${chips}${editable?btn('＋ 부서 추가',"openOrgPicker('review')",'small'):''}</div>${ex}${coverLine(c)}${pol}${log}<div id="target-error" class="error" role="alert"></div>`,tag(state.approved?'확정':byApprover?'승인자 조정 가능':state.submitted?'제출됨':'담당자 선택',state.approved?'green':'amber'));
}
function sharingText(){const ex=state.expanded.length?` + 확대 추가: ${state.expanded.map(u=>org(u).n).join(', ')}`:state.policy==='EXPAND'?` + 확대 추가: ${cover().outU.map(u=>org(u).n).join(', ')}`:'';
 return `원본이 관계자 한정이라 제안 공유 범위(고객경험본부 · 운영본부 · 검색개발팀${ex})가 확대에 해당합니다. 대상 부서가 원본 범위 안이면 이 단계는 생략됩니다. 제출하면 두 요청이 동시에 발송되고, 모두 승인되면 이 범위로 열람 권한이 자동 설정됩니다(원본 문서 권한은 그대로).`}
function setPolicy(p){state.policy=p;render()}
function removeSel(i){const x=state.sel[i];if(state.role==='reviewer'&&state.submitted)state.approverChanges.push('−'+selLabel(x));state.sel.splice(i,1);syncTargets();render()}

let pick=null;
function openOrgPicker(mode){pick={mode,sel:JSON.parse(JSON.stringify(mode==='review'?state.sel:state.mSel)),excl:[...(mode==='review'?state.excl:state.mExcl)],q:''};modal('배포 대상 부서 선택',pickerBody())}
function pickerBody(){
 const q=pick.q.trim(),vis=id=>!q||org(id).n.includes(q)||desc(id).some(d=>org(d).n.includes(q));
 const depth=id=>{let d=0,p=org(id).p;while(p){d++;p=org(p).p}return d};
 const coveredBy=id=>{let p=org(id).p;while(p){if(pick.sel.find(x=>x.id===p&&x.sub))return p;p=org(p).p}return null};
 const rows=ORG.filter(o=>vis(o.id)).map(o=>{
  const s=pick.sel.find(x=>x.id===o.id),par=coveredBy(o.id),off=pick.excl.includes(o.id)||pick.excl.some(e=>desc(e).includes(o.id));
  const all=units([{id:o.id,sub:true}],[]).filter(u=>org(u).h),n=all.reduce((a,u)=>a+org(u).h,0),inn=u=>SCOPE.includes(u)||state.expanded.includes(u);
  const scope=all.every(inn)?tag('공유 범위 안','green'):all.some(inn)?tag('일부 범위 밖','amber'):tag('공유 범위 밖','red');
  const ctl=par?`<span class="small muted">${org(par).n} 전체에 포함</span> <button class="btn text small" onclick="toggleExcl('${o.id}')">${pick.excl.includes(o.id)?'제외 취소':'제외'}</button>`
   :`<input type="checkbox" ${s?'checked':''} onchange="pickToggle('${o.id}',this.checked)" aria-label="${o.n} 선택">`;
  const sub=!par&&s&&kids(o.id).length?`<label class="small"><input type="checkbox" ${s.sub?'checked':''} onchange="pickSub('${o.id}',this.checked)"> 하위 부서 포함</label>`:'';
  return `<div class="org-row ${off?'excluded':''}" style="padding-left:${depth(o.id)*22+8}px">${par?'':ctl}<b>${o.n}</b><span class="small muted">${n}명</span>${scope}${sub}${par?ctl:''}</div>`}).join('')||'<p class="small">검색 결과가 없습니다.</p>';
 const c=cover(pick.sel,pick.excl);
 return `<input class="org-search" placeholder="부서 이름 검색 (예: 개발, 영업)" value="${pick.q}" oninput="pick.q=this.value;refreshPicker(true)">
 <div class="actions" style="margin:10px 0">${btn('전사 선택',"pickAll()",'small')}${btn('선택 비우기',"pick.sel=[];pick.excl=[];refreshPicker()",'small')}</div>
 <p class="small muted">상위 부서를 고르면 하위 부서가 모두 포함됩니다. 일부만 빼려면 하위 부서의 [제외]를 누르세요. 조직이 바뀌면 전달 시점의 조직도로 다시 계산합니다.</p>
 <div class="org-list">${rows}</div>${coverLine(c)}
 <div id="pick-error" class="error" role="alert"></div>
 <div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}${btn(`선택 적용 · ${pick.sel.length}개`,"applyPicker()",'primary')}</div>`;
}
function refreshPicker(keep){const pos=keep?document.activeElement.selectionStart:0;$('modal-body').innerHTML=pickerBody();if(keep){const i=document.querySelector('.org-search');i.focus();i.setSelectionRange(pos,pos)}}
function pickToggle(id,on){if(on){const sub=kids(id).length>0;pick.sel=pick.sel.filter(x=>!(sub&&desc(id).includes(x.id)));pick.sel.push({id,sub});pick.excl=pick.excl.filter(e=>!desc(id).includes(e))}else pick.sel=pick.sel.filter(x=>x.id!==id);refreshPicker()}
function pickSub(id,on){pick.sel.find(x=>x.id===id).sub=on;if(on)pick.sel=pick.sel.filter(x=>!desc(id).includes(x.id));else pick.excl=pick.excl.filter(e=>!desc(id).includes(e));refreshPicker()}
function toggleExcl(id){pick.excl=pick.excl.includes(id)?pick.excl.filter(e=>e!==id):[...pick.excl,id];refreshPicker()}
function pickAll(){pick.sel=[{id:'all',sub:true}];pick.excl=[];refreshPicker()}
function applyPicker(){
 if(!pick.sel.length){$('pick-error').textContent='부서를 하나 이상 고르세요.';return}
 if(pick.mode==='manual'){state.mSel=pick.sel;state.mExcl=pick.excl;$('modal').close();render();return}
 if(state.role==='reviewer'&&state.submitted){
  const after=cover(pick.sel,pick.excl);
  if(state.policy==='EXPAND'&&after.out){$('pick-error').textContent='승인된 공유 범위 밖 인원이 늘어납니다. 승인 단계에서는 범위를 넓힐 수 없으니 반려 후 담당자가 다시 제출해야 합니다.';return}
  if(after.out&&!state.policy)state.policy='READABLE_ONLY';
  const b=state.sel.map(selLabel),a=pick.sel.map(selLabel);
  a.filter(x=>!b.includes(x)).forEach(x=>state.approverChanges.push('+'+x));b.filter(x=>!a.includes(x)).forEach(x=>state.approverChanges.push('−'+x));
  pick.excl.filter(e=>!state.excl.includes(e)).forEach(e=>state.approverChanges.push('제외 '+org(e).n));
 }
 state.sel=pick.sel;state.excl=pick.excl;if(!cover().out&&state.policy==='READABLE_ONLY')state.policy=null;
 syncTargets();$('modal').close();render();toast(`배포 대상: ${state.targets.join(', ')} · 열람 가능 ${cover().ok}명`)}

/* 배포 현황 대시보드 (S12): 관리자·검토자 운영 화면. 부서 단위 집계만, 개인별 열람 기록은 보여 주지 않는다 */
pages.dashboard=['▣','배포 현황 대시보드','운영'];
roles.admin.menus.push('dashboard');roles.reviewer.menus.push('dashboard');
const DASH_DEPT=[['고객경험본부',79,79,61,21],['운영본부',73,71,40,9],['개발본부',86,17,9,4],['영업본부',72,0,0,0],['경영지원본부',29,0,0,0]];
const DASH_ROWS=[['K-2041 v1','검색 지연 대응 가이드','자동','고객지원팀 · 운영팀',77,77,'전달 완료'],
 ['K-2033 v2','결제 오류 재처리 절차','자동','고객경험본부 전체',79,79,'전달 완료'],
 ['K-2038 v1','인프라 점검 체크리스트','수동','운영본부 전체 (인프라팀 등급 미달 2명 제외)',73,71,'부분 실패 · 재시도 대기'],
 ['K-2040 v1','신규 요금제 문의 응대','자동','전사 (확대 승인 요청)',369,155,'확대 승인 대기 3일'],
 ['비공개 지식 1건','열람 권한이 없어 제목을 숨김','자동','개발본부 전체',86,17,'색인 준비 후 전달']];
function dashboardPage(){
 const scope=state.role==='admin'?'전사 집계 · 관리자':'내가 승인·배포한 지식 · 검토자';
 const stat=(l,v,s)=>`<div class="stat"><small>${l}</small><strong>${v}</strong><div class="small muted">${s}</div></div>`;
 const bar=(v,t,label)=>`<div class="dbar" title="${label} ${v}/${t}명"><span style="width:${t?Math.round(v/t*100):0}%"></span></div>`;
 const dept=DASH_DEPT.map(([n,t,r,o,u])=>`<tr><th scope="row">${n}</th><td>${t}명</td><td>${r}명 ${bar(r,t,'열람 가능')}</td><td>${r?Math.round(o/r*100)+'%':'—'} ${bar(o,r,'열람')}</td><td>${u}건</td><td>${r<t?tag(r?`범위 밖 ${t-r}명`:'공유 범위 밖','amber'):tag('모두 열람 가능','green')}</td></tr>`).join('');
 const rows=DASH_ROWS.map(([id,ti,tr,tg,t,r,st])=>`<tr><td><b>${id}</b><div class="small muted">${ti}</div></td><td>${tag(tr,tr==='수동'?'amber':'')}</td><td>${tg}</td><td>${r}/${t}명</td><td>${tag(st,st.startsWith('전달 완료')?'green':st.includes('실패')?'red':'amber')}</td></tr>`).join('');
 return head('05 / DELIVERY DASHBOARD','배포 현황 대시보드','지식이 필요한 부서에 닿았는지, 어디서 막혔는지 봅니다. 수는 부서 단위로만 보여 주고 개인별 열람 기록은 보여 주지 않습니다.',`<label class="small">기간 <select><option>최근 30일</option><option>최근 90일</option></select></label><label class="small">본부 <select><option>전체</option>${DASH_DEPT.map(d=>`<option>${d[0]}</option>`).join('')}</select></label>`)
 +`<div class="context"><b>${scope}</b><span>본문을 읽을 권한이 없는 지식은 제목을 숨기고 건수만 표시합니다.</span></div>`
 +`<div class="dash-stats">${stat('배포',24,'자동 19 · 수동 5')}${stat('전달 완료','22건','완료율 92%')}${stat('진행 중','2건','확대 승인 대기 1 · 색인 대기 1')}${stat('실패','1건','부분 실패 · 재시도 대기')}${stat('30일 열람률','63%','열람 가능 인원 대비')}${stat('후속 업무 재사용','34건','지식을 적용한 Case')}</div>`
 +`<div class="grid" style="margin-top:20px">${panel('본부별 도달·활용',`<div class="table-wrap"><table><thead><tr><th>본부</th><th>대상</th><th>열람 가능</th><th>열람률</th><th>재사용</th><th>권한</th></tr></thead><tbody>${dept}</tbody></table></div><p class="small muted" style="margin-top:10px">5명 미만 부서는 개인이 드러나지 않도록 상위 부서에 합산합니다. 열람률은 열람 가능 인원 기준입니다.</p>`)}
 ${panel('조치가 필요한 항목',`<div class="info-row"><span>${tag('실패','red')} K-2038 인프라팀 일부 전달 실패</span>${btn('실패 대상만 재시도',"toast('실패한 사용자에게만 다시 전달을 시도합니다.')",'small')}</div><div class="info-row"><span>${tag('지연','amber')} K-2040 확대 승인 3일째 대기</span>${btn('승인자에게 알림',"toast('정책 승인자에게 확대 승인 요청을 다시 알렸습니다.')",'small')}</div><div class="info-row"><span>${tag('조직 변경','amber')} 폐지된 VOC운영팀이 대상인 배포 1건</span>${btn('대상 다시 지정',"toast('배포 대상 지정 화면으로 이동합니다.')",'small')}</div><div class="info-row"><span>${tag('범위 밖','amber')} 영업본부 72명이 공유 범위 밖이라 3건을 받지 못함</span><span class="small muted">확대 여부는 지식 담당자가 판단</span></div>`)}</div>`
 +`<section class="panel" style="margin-top:20px"><div class="panel-head"><h2>최근 배포</h2>${tag('지식 버전 기준')}</div><div class="table-wrap"><table><thead><tr><th>지식</th><th>방식</th><th>대상 규칙</th><th>전달 / 대상</th><th>상태</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

/* 로그인 화면에 로고 */
const LOGO_MARK=`<svg viewBox="4 18 112 76" width="150" height="103" aria-hidden="true" focusable="false"><defs><linearGradient id="g" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#0369a1"/></linearGradient></defs><path d="M28,86 C14,86 8,74 12,64 C15,56 23,52 30,54 C30,38 44,26 60,28 C72,29 80,36 83,45 C96,43 108,52 107,66 C106,78 97,86 86,86 Z" fill="url(#g)"/><g stroke="#ffffff" stroke-width="3.2" fill="none" stroke-linecap="round"><path d="M68.63,41.07 A19,19 0 0 1 78.97,58.99"/><path d="M70.35,73.93 A19,19 0 0 1 49.65,73.93"/><path d="M41.03,58.99 A19,19 0 0 1 51.37,41.07"/></g><g fill="#ffffff"><path d="M78.86,61.19 L75.54,55.81 L82.73,56.19 Z"/><path d="M47.81,72.74 L54.13,72.55 L50.21,78.59 Z"/><path d="M53.33,40.07 L50.34,45.64 L47.07,39.23 Z"/></g><circle cx="60.00" cy="39.00" r="8.6" fill="#ffffff"/><circle cx="76.45" cy="67.50" r="8.6" fill="#ffffff"/><circle cx="43.55" cy="67.50" r="8.6" fill="#ffffff"/><path d="M57.8,41.2 a4,4 0 1 1 4.4,0 v1.6 h-4.4 z" fill="none" stroke="#0369a1" stroke-width="1.3" stroke-linejoin="round"/><path d="M58.4,44.1 h3.2" stroke="#0369a1" stroke-width="1.2" stroke-linecap="round"/><path d="M72.85448267190435,62.9 h4.6 l2.6,2.6 v6.6 h-7.2 z" fill="none" stroke="#0369a1" stroke-width="1.3" stroke-linejoin="round"/><path d="M74.65448267190435,67.7 h3.6 M74.65448267190435,69.9 h3.6" stroke="#0369a1" stroke-width="1.1" stroke-linecap="round"/><text x="43.54551732809566" y="70.6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="8.4" fill="#0369a1">AI</text></svg>`;
const showLoginV20=showLogin;
showLogin=function(){showLoginV20();$('modal-body').insertAdjacentHTML('afterbegin',`<div class="login-brand">${LOGO_MARK}<div><b>Knowledge Loop</b><small>기업의 기록을 기업 안에서 지식으로</small></div></div>`)};

const renderV20=render;
render=function(){
 if(state.page==='dashboard'){state.page='quality';renderV20();state.page='dashboard';
  document.querySelectorAll('.nav-btn').forEach(b=>{const on=b.getAttribute('onclick')==="go('dashboard')";b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});
  $('mobile-menu').value='dashboard';$('crumb').textContent='워크스페이스 / '+pages.dashboard[1];
  $('main').innerHTML=dashboardPage()+$('main').querySelector('.footer').outerHTML;
 } else renderV20();const f=document.querySelector('.footer span:last-child');if(f)f.textContent='시안 · 처리 경로 3갈래 · 모든 기록·수치·AI 응답은 가상입니다'};
