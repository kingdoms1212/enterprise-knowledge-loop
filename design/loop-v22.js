'use strict';
/* v2.2 · VOC 접수·분류(테스트 접수 포함) + Case 작업 공간 5탭(관련 부서 협업 업무·참고 자료) + 지식화 근거 선택.
   loop.js(v2.0)·loop-v21.js(v2.1) 위에 덧씌운다. 화면 상태만 바꾸는 시안이며 모든 데이터는 가상이다.
   실제 구현에서는 테스트 접수도 운영 반입과 같은 반입 서비스(POST /voices/intake → ingest_voice)를 호출한다. */

pages.voice[1]='VOC 접수·분류';
pages.case[1]='Case 작업 공간';
/* 관련 부서 협업 시연용 역할: Case 읽기·의견·연결된 조치만 가능, 원문·문서 권한은 넓어지지 않는다 */
roles.opsmember={name:'협업 담당 · 오민준',dept:'운영팀',menus:['home','case','search','knowledge','distribution']};
roles.devmember={name:'협업 담당 · 한유진',dept:'개발팀',menus:['home','case','search','knowledge','distribution']};
const TASK_ROLE={'운영팀':'opsmember','개발팀':'devmember'};
const myDept=()=>roles[state.role].dept;
const myName=()=>roles[state.role].name.split(' · ')[1];
const canIntake=()=>state.role==='handler';            // VOICE_INTAKE_CREATE · VOICE_INTAKE_IMPORT
const canTriage=()=>state.role==='handler';            // VOICE_TRIAGE
const canRaw=()=>state.role==='handler';               // READ_RAW: 접수·메인 부서의 VOC 담당만
const LOCK='<svg class="lock" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="currentColor"/><path d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
const clock=()=>{const d=new Date();return `10.07 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
const rx=(html,re,fn)=>html.replace(re,fn); // 치환 문자열의 $ 해석을 피하려고 항상 함수로 치환

/* 참고 자료 카탈로그 · read = 열람 가능한 부서(각 자료의 ACL) */
const REFS={
 'K-1022':{kind:'KNOWLEDGE',ver:'K-1022 v3',title:'계정 비밀번호 초기화 안내',owner:'고객지원팀',read:['고객지원팀','기술지원팀','운영팀','개발팀','영업팀'],loc:'§2 재발송 절차',body:'스팸함 확인 → 등록 메일 주소 확인 → 재발송(10분 간격) → 지속 시 계정 잠금 해제 요청.'},
 'D-038':{kind:'DOCUMENT',ver:'D-038 v3',title:'검색 서비스 운영 매뉴얼',owner:'운영팀',read:['고객지원팀','운영팀','개발팀','검색개발팀'],loc:'4.2 초기 점검 절차'},
 'K-0917':{kind:'KNOWLEDGE',ver:'K-0917 v2',title:'색인 재구축 시 부하 관리 가이드',owner:'개발팀',read:['고객지원팀','운영팀','개발팀'],loc:'3장 단계별 재구축'},
 'D-051':{kind:'DOCUMENT',ver:'D-051 v1',title:'검색 클러스터 장애 보고서(내부)',owner:'개발팀',read:['개발팀'],loc:'부록 B 캐시 설정값'},
 'D-044':{kind:'DOCUMENT',ver:'D-044 v2',title:'PDF 렌더러 표 처리 옵션 설명서',owner:'개발팀',read:['고객지원팀','개발팀'],loc:'5.1 표 레이아웃'},
 'D-060':{kind:'DOCUMENT',ver:'D-060 v1',title:'문서 뷰어 5.2 릴리스 노트',owner:'개발팀',read:['고객지원팀','기술지원팀','운영팀','개발팀','영업팀'],loc:'알려진 문제'},
 'K-2041':{kind:'KNOWLEDGE',ver:'K-2041 v1',title:'검색 지연 대응 가이드',owner:'고객지원팀',read:['고객지원팀','운영팀'],loc:'조치·검증 결과',live:()=>activeKnowledge()}};
const refOk=k=>REFS[k]&&(!REFS[k].live||REFS[k].live());
const canReadRef=(k,dept=myDept())=>REFS[k].read.includes(dept);
const KIND={KNOWLEDGE:['게시 지식','green'],DOCUMENT:['사내 문서','blue']};
const USAGE={'열람':'열어봄','참고':'판단에 활용','적용':'조치에 직접 적용'};

const CATS=['사용 문의','기능 오류','성능 문제','개선 요청','불만·보상','일반 문의'],URGS=['낮음','보통','높음','긴급'];
const MAIN_DEPTS=['고객지원팀','기술지원팀','운영팀','개발팀','품질관리팀'],REL_DEPTS=['운영팀','개발팀','검색개발팀','품질관리팀','기술지원팀'];
const RECV_DEPTS=['고객지원팀','기술지원팀','운영팀','영업팀'];

/* 개인정보 정제(시안용 규칙). 실제 구현은 pii_clean 단계 */
function maskPII(s){let n=0;const c=x=>{n++;return x};
 let t=s.replace(/([가-힣]{2,4})\((01\d-?\d{3,4}-?\d{4})\)/g,()=>{n+=2;return '[이름]([전화번호])'})
  .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,()=>c('[이메일]'))
  .replace(/01\d-?\d{3,4}-?\d{4}/g,()=>c('[전화번호]'))
  .replace(/(담당자|담당)\s+[가-힣]{2,4}(?![가-힣])/g,(m,a)=>c(a+' [이름]'));
 return{text:t,n}}
const showClean=s=>esc(s).replace(/\[(이름|전화번호|이메일|고객사)\]/g,'<span class="redact">$1</span>');

/* 로컬 AI 분석(시안: 고정 규칙). 출력 = ai_analyses.output_json, 참고 후보는 ACL 사전 필터 전 목록 */
function analyze(title,body,dept,hint){const s=title+' '+body;
 if(/비밀번호|로그인|초기화 메일/.test(s))return{cat:'사용 문의',urg:'보통',dept:'고객지원팀',track:'QUICK',rel:[],refs:['K-1022'],why:'게시 지식 K-1022 v3과 일치'};
 if(/PDF|표가|표 /.test(s))return{cat:'기능 오류',urg:'보통',dept:'고객지원팀',track:'STANDARD',rel:['개발팀'],refs:['D-044','D-060'],why:'근거 지식 없음 · 개발팀 확인 1회로 해결 예상 · 반복 낮음'};
 if(/검색|지연|느려|초 이상/.test(s))return activeKnowledge()
  ?{cat:'성능 문제',urg:'높음',dept:'고객지원팀',track:'QUICK',rel:[],refs:['K-2041','D-038'],why:'게시 지식 K-2041 v1(검색 지연 대응 가이드)과 일치 · V-2041과 같은 증상'}
  :{cat:'성능 문제',urg:'높음',dept:'고객지원팀',track:'KNOWLEDGE',rel:['운영팀','개발팀'],refs:['D-038','K-0917','D-051'],why:'근거 지식 없음 · 같은 증상 30일 내 2건 · 운영·개발 협업 필요'};
 return{cat:'일반 문의',urg:hint||'보통',dept,track:'STANDARD',rel:[],refs:[],why:'유사 지식 없음 · 담당 부서 확인 필요'}}

/* 시나리오 A·B·C(빠른 입력용) */
const SCN={
 A:{title:'비밀번호 초기화 메일이 오지 않습니다.',body:'비밀번호 초기화 버튼을 눌렀는데 30분이 지나도 메일이 오지 않습니다. 등록 메일은 minji.k@example.com 입니다. 오전에 보고서를 제출해야 해서 급히 로그인해야 합니다.',dept:'고객지원팀',cust:'개인 고객 · 김민지',prod:'계정·로그인',time:'2026-10-07T10:38',urg:'보통',att:'',memo:'반복 문의 · 기존 안내 지식 확인'},
 B:{title:'PDF 다운로드 시 표가 깨져 보입니다.',body:'견적서를 PDF로 내려받으면 3쪽 표의 칸이 어긋나고 일부 글자가 겹쳐 보입니다. 화면에서는 정상입니다. 담당 연락처 010-3141-5926.',dept:'고객지원팀',cust:'서진물산 (기업 고객)',prod:'문서 뷰어 · PDF 내보내기',time:'2026-10-07T10:40',urg:'보통',att:'quote-p3.pdf',memo:''},
 C:{title:'업데이트 이후 문서 검색이 8초 이상 걸립니다.',body:'지난주 5.2 업데이트 이후 사내 문서 검색 결과가 나오기까지 8초 이상 걸립니다. 전에는 2초 이내였습니다. 오전 9~11시에 특히 느립니다. 담당자 정다은 010-4821-7730.',dept:'고객지원팀',cust:'다온물류 (기업 고객)',prod:'문서 검색 서비스 v5.2',time:'2026-10-07T10:42',urg:'높음',att:'search-latency-capture.png',memo:'V-2041과 같은 증상인지 확인 필요'}};
const SCN_LABEL={A:['A','바로 종결'],B:['B','일반 처리'],C:['C','지식화']};

function seedV22(){
 const mk=(o)=>Object.assign({dataset:'CONNECTOR',urgHint:'',att:'',memo:'',fin:null,caseId:null,dup:'중복 없음'},o);
 const V2041=mk({id:'V-2041',ext:'CS-7821',ch:'고객지원 시스템',chCode:'CRM_CONNECTOR',dept:'고객지원팀',cust:'한빛제조 (기업 고객)',prod:'문서 검색 서비스 v5.2',title:'업데이트 이후 문서 검색이 8초 이상 걸립니다.',
  raw:'안녕하세요, 한빛제조 정보팀 박민수(010-2345-6789)입니다. 지난주 5.2 업데이트 이후 문서 검색 결과가 나오기까지 8초 이상 걸려 업무가 지연됩니다. 전에는 2초 이내였습니다.',time:'10.07 09:12',urgHint:'높음',
  st:{clean:'정제 완료',ai:'분석 완료',tri:'Case 생성'},caseId:'C-2041',ai:analyzeFixed('C')});
 V2041.fin={cat:'성능 문제',urg:'높음',dept:'고객지원팀',track:'KNOWLEDGE',rel:['운영팀','개발팀']};
 const V2043=mk({id:'V-2043',ext:'MAIL-3310',ch:'이메일 수집원',chCode:'MAIL_CONNECTOR',dept:'고객지원팀',cust:'개인 고객',prod:'계정·로그인',title:'비밀번호 초기화 메일이 오지 않습니다.',
  raw:'비밀번호 초기화 버튼을 눌렀는데 메일이 오지 않아 로그인을 못 하고 있습니다. 등록 메일은 jh.lee@example.com 입니다.',time:'10.07 09:40',
  st:{clean:'정제 완료',ai:'분석 완료',tri:'분류 대기'},ai:analyzeFixed('A')});
 const V2044=mk({id:'V-2044',ext:'CS-7834',ch:'고객지원 시스템',chCode:'CRM_CONNECTOR',dept:'고객지원팀',cust:'서진물산 (기업 고객)',prod:'문서 뷰어 · PDF 내보내기',title:'PDF 다운로드 시 표가 깨져 보입니다.',
  raw:'견적서를 PDF로 내려받으면 표의 칸이 어긋나 보입니다. 화면에서는 정상입니다. 담당자 최유나 010-5550-1234.',time:'10.07 10:05',att:'quote.pdf',
  st:{clean:'정제 완료',ai:'분석 완료',tri:'Case 생성'},caseId:'C-2044',ai:analyzeFixed('B')});
 V2044.fin={cat:'기능 오류',urg:'보통',dept:'고객지원팀',track:'STANDARD',rel:['개발팀']};
 const V2039=mk({id:'V-2039',ext:'CS-7809',ch:'고객지원 시스템',chCode:'CRM_CONNECTOR',dept:'고객지원팀',cust:'[정제 전 비공개]',prod:'결제·환불',title:'환불 요청 건 확인 부탁드립니다',
  raw:'(정제 실패 · 주민등록번호 형식 의심 값 포함)',time:'10.07 08:55',st:{clean:'격리',ai:'대기',tri:'분류 차단'},ai:null});
 return{vq:[V2044,V2043,V2041,V2039],
  cases:{'C-2041':{id:'C-2041',voice:'V-2041',title:'업데이트 이후 문서 검색 지연',track:'KNOWLEDGE',main:'고객지원팀',handler:'김도윤',rel:['운영팀','개발팀'],closed:false},
   'C-2044':{id:'C-2044',voice:'V-2044',title:'PDF 다운로드 시 표 깨짐',track:'STANDARD',main:'고객지원팀',handler:'김도윤',rel:['개발팀'],closed:false,decision:'',result:'',ops:{}}},
  tasks:{'C-2041':[
    {id:'T-2041-1',dept:'운영팀',who:'오민준',type:'의견',req:true,due:'10.09',note:'업데이트 전후 캐시·색인 설정 변경 이력과 현재 적중률을 확인해 의견 주세요.',st:'COMPLETED',reply:'캐시 적중률이 업데이트 후 92% → 61%로 떨어졌습니다. 설정 원복이 가능합니다.',hist:['요청 09:25','수락 09:40','진행 09:41','완료 11:02']},
    {id:'T-2041-2',dept:'개발팀',who:'한유진',type:'작업',req:true,due:'10.10',note:'5.2 변경분 중 색인 관련 변경을 확인하고, 복구 가능한 조정안을 작성해 주세요.',st:'IN_PROGRESS',reply:'',hist:['요청 09:26','수락 10:02','진행 10:15']},
    {id:'T-2041-3',dept:'품질관리팀',who:'',type:'검토',req:false,due:'10.11',note:'조치 전후 응답 시간 측정 방법 검토(선택).',st:'REQUESTED',reply:'',hist:['요청 09:30']}],
   'C-2044':[{id:'T-2044-1',dept:'개발팀',who:'한유진',type:'작업',req:true,due:'10.09',note:'PDF 내보내기에서 표 레이아웃이 깨지는 원인을 재현·확인해 주세요.',st:'ACCEPTED',reply:'',hist:['요청 10:12','수락 10:20']}]},
  crefs:{'C-2041':[
    {ref:'D-038',origin:'AI',usage:'적용',reason:'초기 점검 절차를 1차 조치 순서로 적용',by:'김도윤',dept:'고객지원팀',task:''},
    {ref:'K-0917',origin:'AI',usage:'참고',reason:'운영 중 재구축 부하 위험 판단',by:'오민준',dept:'운영팀',task:'T-2041-1'},
    {ref:'D-051',origin:'USER',usage:'참고',reason:'지난 장애의 캐시 설정값과 비교',by:'한유진',dept:'개발팀',task:'T-2041-2'}],
   'C-2044':[{ref:'D-060',origin:'AI',usage:'열람',reason:'알려진 문제 목록 확인',by:'김도윤',dept:'고객지원팀',task:''}]}};
}
function analyzeFixed(k){const s=SCN[k];const r=analyze(s.title,s.body,s.dept,s.urg);
 if(k==='C')return{cat:'성능 문제',urg:'높음',dept:'고객지원팀',track:'KNOWLEDGE',rel:['운영팀','개발팀'],refs:['D-038','K-0917','D-051'],why:'근거 지식 없음 · 같은 증상 30일 내 2건 · 운영·개발 협업 필요'};return r}
Object.assign(state,seedV22(),{vsel:'V-2043',vview:'clean',caseId:'C-2041',refMode:'ai',refQ:'',tri:{},demoSeq:0,reuseLog:[],
 official:{'D-038':true,'K-0917':true,'D-051':false}});
/* v2.1 목록(홈의 경로별 건수)에 새 시나리오 문구 반영 */
voices.forEach(v=>{const n=state.vq.find(x=>x.id===v.id);if(n)v.title=n.title.replace(/\.$/,'')});

const vq=id=>state.vq.find(v=>v.id===id);
const curCase=()=>state.cases[state.caseId];
const tasksOf=id=>state.tasks[id]||(state.tasks[id]=[]);
const crefsOf=id=>state.crefs[id]||(state.crefs[id]=[]);
const OPEN=t=>!['COMPLETED','CANCELLED'].includes(t.st);
function taskAgg(id){const req=tasksOf(id).filter(t=>t.req&&t.st!=='CANCELLED');return{req:req.length,done:req.filter(t=>t.st==='COMPLETED').length,open:tasksOf(id).filter(t=>t.req&&OPEN(t))}}
const visibleCases=()=>Object.values(state.cases).filter(c=>['handler','reviewer','sourceowner'].includes(state.role)||tasksOf(c.id).some(t=>t.dept===myDept()));
const isTaskRole=()=>!!TASK_ROLE[myDept()]&&['opsmember','devmember'].includes(state.role);
const caseVerified=c=>c.id==='C-2041'?state.verified:!!c.verified;

/* ---------- 상태 배지 ---------- */
const stTag={clean:s=>tag(s,s==='정제 완료'?'green':s==='격리'?'red':s==='정제 중'?'amber':''),
 ai:s=>tag(s,s==='분석 완료'?'green':s==='분석 실패'?'red':s==='분석 중'?'amber':''),
 tri:(s,v)=>s==='Case 생성'?tag(v.caseId,'blue'):tag(s,s==='분류 대기'?'amber':s==='종결'?'green':s==='분류 차단'?'red':''),
 /* 대기열 한 칸: 진행 중인 단계만 보이고, 격리·차단은 예외 배지 */
 one:v=>{const s=v.st;if(s.clean==='격리')return tag('격리','red')+' '+tag('차단','red');if(s.tri==='분류 차단')return tag('차단','red');
  if(s.clean!=='정제 완료')return stTag.clean(s.clean);if(s.ai!=='분석 완료')return stTag.ai(s.ai);return stTag.tri(s.tri,v)}};

/* ---------- 진행 표시: 4단계 유지, 처리 단계 하위 문구에 협업 집계 ---------- */
function procText(id,decided,verified){const a=taskAgg(id);const rel=a.req?` · 관련 부서 ${a.done}/${a.req} 완료`:' · 관련 부서 협업 없음';
 return verified?`메인 부서 처리${rel} · 결과 검증 완료`:`메인 부서 처리${rel} · ${a.done<a.req?'결과 취합':decided?'결과 검증 필요':'결과 취합'}`}
stageBar=function(){
 const ap=(state.sourceApproved?1:0)+(state.policyApproved?1:0);
 const s=[
  {t:'접수',d:'AI 경로 제안 · 지식화로 확정',done:true},
  {t:'처리',d:procText('C-2041',!!state.decision,state.verified),done:!!state.decision&&state.verified},
  {t:'승인',d:!state.draft?'검증하면 초안 자동 생성':!state.submitted?'초안 확인 · 근거·배포 부서 선택 후 제출':state.approved?'승인 완료':`확대 승인 ${ap}/2 · 승인자가 부서 조정 후 승인`,done:state.approved},
  {t:'공유',d:state.retired?'폐기 · 배포 철회':state.distributed?`${state.targets.join('·')} 전달 완료`:state.indexing?'게시 · 색인 준비 중':'승인하면 게시·색인·전달',done:state.distributed||state.retired,auto:true}];
 const now=s.findIndex(x=>!x.done);
 return `<div class="stagebar" aria-label="진행 단계">${s.map((x,i)=>`<div class="stage ${x.done?'done':''} ${i===now?'now':''}" ${i===now?'aria-current="step"':''}><small>STEP ${i+1}${x.auto?' · 자동':''}</small><strong>${x.done?'✓ ':''}${x.t}</strong><span>${x.d}</span></div>`).join('')}</div>`;
};
function caseStage(c){const v=vq(c.voice),ver=caseVerified(c);
 const s=[{t:'접수',d:`AI ${TRACK[v.ai?v.ai.track:c.track][0]} 제안 · ${TRACK[c.track][0]}로 확정`,done:true},
  {t:'처리',d:c.closed&&c.track==='QUICK'?'게시 지식 적용 · 즉시 종결':procText(c.id,!!c.decision,ver||c.closed),done:c.closed||ver}];
 const na=c.track!=='KNOWLEDGE';
 s.push({t:'승인',d:na?'해당 없음 · 지식화하지 않음':'검증하면 초안 자동 생성',done:false,na},{t:'공유',d:na?'해당 없음':'승인하면 게시·색인·전달',done:false,na,auto:true});
 const now=s.findIndex(x=>!x.done&&!x.na);
 return `<div class="stagebar" aria-label="진행 단계">${s.map((x,i)=>`<div class="stage ${x.done?'done':''} ${x.na?'na':''} ${i===now?'now':''}"><small>STEP ${i+1}${x.auto?' · 자동':''}</small><strong>${x.done?'✓ ':''}${x.t}</strong><span>${x.d}</span></div>`).join('')}</div>`}

/* ---------- 모달 폭 ---------- */
const modalV21=modal;
modal=function(title,body,wide){$('modal').onclose=null;$('modal').classList.toggle('wide',!!wide);modalV21(title,body)};

/* ================= VOC 접수·분류 ================= */
voicePage=function(){
 if(!vq(state.vsel))state.vsel=state.vq[0]?state.vq[0].id:null;
 const v=vq(state.vsel);
 const dis=(ok,why)=>ok?'':`disabled title="${why}"`;
 const acts=`<div class="head-acts"><button class="btn primary" onclick="openIntake()" ${dis(canIntake(),'VOICE_INTAKE_CREATE 권한 필요')}>＋ 새 VOC 테스트 접수</button><button class="btn" onclick="openCsv()" ${dis(canIntake(),'VOICE_INTAKE_IMPORT 권한 필요')}>CSV 반입</button><button class="btn" onclick="openConnectors()">수집원 상태</button></div>`;
 const waiting=state.vq.filter(x=>x.st.tri==='분류 대기').length;
 const rows=state.vq.map(x=>`<tr class="${x.id===state.vsel?'active':''}" onclick="selVoice('${x.id}')" tabindex="0" onkeydown="if(event.key==='Enter')selVoice('${x.id}')"><td class="mono nowrap">${x.id}</td><td>${x.dataset==='SYNTHETIC'?tag('MANUAL_DEMO','purple'):`<span class="small">${x.ch}</span>`}</td><td class="nowrap">${x.dept}</td><td class="ell">${esc(x.cust)}</td><td class="ttl"><span class="ell2">${esc(x.title)}</span></td><td class="mono nowrap">${x.time}</td><td>${stTag.one(x)}</td></tr>`).join('');
 const table=`<section class="panel"><div class="panel-head"><h2>접수 대기열</h2><div class="actions">${tag(`분류 대기 ${waiting}건`,'amber')}${tag(`전체 ${state.vq.length}건 · 가상`)}</div></div><div class="table-wrap"><table class="q-table"><thead><tr><th>Voice ID</th><th>채널</th><th>접수 부서</th><th>고객</th><th>제목</th><th>수신 시각</th><th>상태</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
 const detail=v?`<div class="tri-layout">${voiceDoc(v)}${triagePanel(v)}</div>`:`<section class="panel empty"><h2>대기열이 비어 있습니다.</h2><p>새 VOC를 테스트 접수하거나 샘플 3건을 생성하세요.</p></section>`;
 return head('01 / INTAKE · TRIAGE','VOC 접수·분류','기존 채널에서 반입된 VOC와 내부 테스트 접수를 같은 반입 서비스로 정제·분석하고, 사람이 분류를 확정해 Case로 연결합니다.',acts)+table+detail+devStrip();
};
function selVoice(id){state.vsel=id;state.vview='clean';render()}
function voiceDoc(v){
 const rawOn=state.vview==='raw'&&canRaw();
 const toggle=`<div class="seg" role="group" aria-label="본문 보기"><button class="${!rawOn?'on':''}" onclick="state.vview='clean';render()">정제문</button><button class="${rawOn?'on':''}" onclick="${canRaw()?"state.vview='raw';render()":"toast('원문은 READ_RAW 권한이 있는 VOC 담당만 볼 수 있습니다.')"}" ${canRaw()?'':'aria-disabled="true"'}>${canRaw()?'':LOCK+' '}원문</button></div>${canRaw()?'':tag(LOCK+' READ_RAW 권한 필요','amber')}`;
 let text;
 if(v.st.clean==='격리')text=`<div class="notice amber"><strong>PII 정제 실패 · 격리</strong><br>민감정보 형식이 의심되어 정제문을 만들지 않았습니다. 분류(Triage)와 AI 분석 이전에 차단되며, 원문은 지정 담당자의 수동 검토를 기다립니다.</div>`;
 else if(v.st.clean!=='정제 완료')text=`<div class="notice">정제 중입니다. 정제문이 생성되면 표시됩니다.</div>`;
 else text=rawOn?`<blockquote class="raw">${esc(v.raw)}</blockquote><p class="small muted">원문 v1 · 접수 부서 ${v.dept} 기본 권한(VOC 담당 READ_RAW) · 열람 기록이 남습니다.</p>`:`<blockquote>${showClean(maskPII(v.raw).text)}</blockquote><p class="small muted">정제문 v1 · 개인정보 ${maskPII(v.raw).n}건 마스킹 · AI 분석과 Case에는 정제문만 전달합니다.</p>`;
 const info=[['접수 부서',v.dept],['고객',esc(v.cust)],['제품·서비스',esc(v.prod)],['수신 시각',v.time],['채널',v.dataset==='SYNTHETIC'?'MANUAL_DEMO · 내부 테스트 접수':`${v.ch} · ${v.chCode}`],['외부 접수번호',v.ext]]
  .concat(v.urgHint?[['긴급도 힌트',v.urgHint]]:[]).concat(v.att?[['첨부',esc(v.att)+' <span class="muted">(파일명만)</span>']]:[]).concat(v.memo?[['담당자 메모',esc(v.memo)]]:[]).concat([['중복 검사',v.dup]]);
 return `<section class="panel"><div class="panel-head"><h2>${v.id} <span class="mono muted">${v.ext}</span></h2><div class="actions">${v.dataset==='SYNTHETIC'?tag('포트폴리오 시연용 가상 VOC','purple'):tag(v.ch,'blue')}</div></div><div class="panel-body"><h2 class="v-title">${esc(v.title)}</h2><div class="actions" style="margin:12px 0 4px">${toggle}</div>${text}<div class="kv">${info.map(([k,x])=>`<div><span>${k}</span><b>${x}</b></div>`).join('')}</div>${v.dataset==='SYNTHETIC'?`<div class="scope">출처: 데이터셋 “시연용 가상 VOC” · source_type SYNTHETIC · data_provenance에 기록 · 실제 고객 데이터가 아닙니다.</div>`:''}</div></section>`;
}
function triDraft(v){return state.tri[v.id]||(state.tri[v.id]=JSON.parse(JSON.stringify({cat:v.ai.cat,urg:v.ai.urg,dept:v.ai.dept,track:v.ai.track,rel:v.ai.rel})))}
function triagePanel(v){
 if(!v.ai)return panel('AI 제안 · 사람 확정',`<div class="notice amber">정제가 끝나지 않아 AI 분석을 하지 않았습니다. 정제 실패 원문은 AI에 전달하지 않습니다.</div><div class="actions">${btn('PII 수동 검토 요청',"toast('지정 담당자에게 수동 검토를 요청했습니다(결정 필요 사항: 검토 화면 범위).')",'small')}<button class="btn small" disabled>Case 생성</button></div>`,tag('분류 차단','red'));
 const fixed=!!v.fin,d=fixed?v.fin:triDraft(v),edit=!fixed&&canTriage(),a=v.ai;
 const sel=(key,opts)=>edit?`<select aria-label="${key} 확정" onchange="setTri('${v.id}','${key}',this.value)">${opts.map(o=>`<option value="${o}" ${d[key]===o?'selected':''}>${key==='track'?TRACK[o][0]:o}</option>`).join('')}</select>`:`<b>${key==='track'?TRACK[d[key]][0]:d[key]}</b>`;
 const mainCtl=edit?`<div class="rel-pick"><span class="chip">${d.dept}</span>${btn('변경',`openDeptPicker('${v.id}','main')`,'small')}</div>`:`<b>${d.dept}</b>`;
 const relCtl=edit?`<div class="rel-pick">${d.rel.map(x=>`<span class="chip">${x}${a.rel.includes(x)?' '+tag('AI 제안','purple'):''}<button aria-label="${x} 빼기" onclick="setRel('${v.id}','${x}',false)">×</button></span>`).join('')||'<span class="small muted">없음</span>'}${btn('＋ 부서 선택',`openDeptPicker('${v.id}','rel')`,'small')}</div>`:`<b>${d.rel.join(', ')||'없음'}</b>`;
 const diff=k=>JSON.stringify(a[k])!==JSON.stringify(d[k])?' '+tag('변경','amber'):'';
 const aiv=(k)=>k==='track'?tag(TRACK[a.track][0],TRACK[a.track][1]):k==='rel'?(a.rel.join(', ')||'없음'):a[k];
 const rowsT=[['cat','분류',CATS],['urg','긴급도',URGS],['dept','메인 부서',MAIN_DEPTS],['track','처리 경로',Object.keys(TRACK)],['rel','관련 부서',null]].map(([k,n,o])=>`<tr><th scope="row">${n}</th><td class="ai-col">${aiv(k)}</td><td>${k==='rel'?relCtl:k==='dept'?mainCtl:sel(k,o)}${diff(k)}</td></tr>`).join('');
 const refs=a.refs.filter(refOk),ok=refs.filter(k=>canReadRef(k)),hidden=refs.length-ok.length;
 const refList=ok.map(k=>{const r=REFS[k];return `<div class="ref-row">${tag(KIND[r.kind][0],KIND[r.kind][1])}<div><b>${r.title}</b><span class="mono">${r.ver} · ${r.loc}</span></div></div>`}).join('')||'<p class="small muted">추천할 참고 자료가 없습니다.</p>';
 let foot='';
 if(!fixed)foot=`<div class="tri-foot"><div id="tri-error" class="error" role="alert"></div><button class="btn primary" onclick="createCase('${v.id}')" ${canTriage()?'':'disabled title="VOICE_TRIAGE 권한 필요"'}>Case 생성</button><span class="small muted">VOICE_TRIAGE 권한 · 확정값은 Case에, AI 제안은 분석 기록에 따로 남습니다.</span></div>`;
 else foot=afterCase(v);
 return `<section class="panel"><div class="panel-head"><h2>AI 제안 · 사람 확정</h2>${tag(fixed?'분류 확정':'분류 대기',fixed?'green':'amber')}</div><div class="panel-body"><table class="cmp"><thead><tr><th>항목</th><th>AI 제안 ${tag('로컬 AI','purple')}</th><th>사람 확정</th></tr></thead><tbody>${rowsT}</tbody></table><p class="small muted ai-why">AI 근거: ${a.why}. AI 제안값은 확정 후에도 덮어쓰지 않고 함께 보존합니다.</p><h3 class="sub">추천 참고 자료 <span class="small muted">· ACL 사전 필터 후</span></h3>${refList}${foot}</div></section>`;
}
function setTri(id,k,val){const d=triDraft(vq(id));d[k]=val;if(k==='dept')d.rel=d.rel.filter(x=>x!==val);render()}
function setRel(id,x,on){const d=triDraft(vq(id));d.rel=on?[...d.rel.filter(y=>y!==x),x]:d.rel.filter(y=>y!==x);render()}
// 관련 부서 선택 다이얼로그: 팀 단위로 고른다(협업 업무가 팀에 생기므로 하위 포함 규칙은 쓰지 않는다)
const REL_ORG=(()=>{const hq=ORG.filter(o=>o.p==='all').map(o=>({n:o.n,teams:ORG.filter(t=>t.p===o.id).map(t=>t.n)}));
 const all=hq.flatMap(h=>h.teams);[...MAIN_DEPTS,...REL_DEPTS].forEach(n=>{if(!all.includes(n)){const h=hq.find(h=>h.n===(n==='개발팀'?'개발본부':'운영본부'))||hq[0];h.teams.unshift(n);all.push(n)}});return hq})();
let relPick=null;
function openDeptPicker(vid,mode){const d=triDraft(vq(vid));relPick={vid,mode,sel:mode==='main'?[d.dept]:[...d.rel],q:''};modal(mode==='main'?'메인 부서 선택':'관련 부서 선택',relPickBody())}
const openRelPicker=vid=>openDeptPicker(vid,'rel');
function relPickBody(){const v=vq(relPick.vid),d=triDraft(v),q=relPick.q.trim(),one=relPick.mode==='main',aiList=one?[v.ai.dept]:v.ai.rel;
 const rows=REL_ORG.map(h=>{const ts=h.teams.filter(t=>!q||t.includes(q)||h.n.includes(q));if(!ts.length)return '';
  return `<div class="org-row rel-hq"><b>${h.n}</b></div>`+ts.map(t=>{const isMain=!one&&t===d.dept,on=relPick.sel.includes(t);
   return `<label class="org-row" style="padding-left:30px"><input type="${one?'radio':'checkbox'}" name="dp" ${on?'checked':''} ${isMain?'disabled':''} onchange="relToggle('${t}',this.checked)" aria-label="${t} 선택"><b>${t}</b>${isMain?' '+tag('메인 부서','blue'):''}${aiList.includes(t)?' '+tag('AI 제안','purple'):''}</label>`}).join('')}).join('')||'<p class="small">검색 결과가 없습니다.</p>';
 const help=one?'최종 책임을 지고 Case를 처리할 팀 하나를 고르세요. 메인 부서를 바꾸면 그 팀은 관련 부서에서 빠집니다.':'협업 업무를 요청할 팀을 고르세요(여러 개 선택 가능). 메인 부서는 고를 수 없고, 관련 부서로 정해도 권한은 넓어지지 않습니다.';
 return `<input class="org-search" placeholder="부서 이름 검색 (예: 개발, 품질)" value="${relPick.q}" oninput="relPick.q=this.value;refreshRelPicker(true)">
 <p class="small muted">${help}</p>
 <div class="org-list">${rows}</div>
 <p class="small">선택: <b>${relPick.sel.join(', ')||'없음'}</b></p>
 <div id="dp-error" class="error" role="alert"></div>
 <div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}${btn(one?'선택 적용':`선택 적용 · ${relPick.sel.length}개`,"applyRelPicker()",'primary')}</div>`}
function refreshRelPicker(keep){const pos=keep?document.activeElement.selectionStart:0;$('modal-body').innerHTML=relPickBody();if(keep){const i=document.querySelector('.org-search');i.focus();i.setSelectionRange(pos,pos)}}
function relToggle(t,on){relPick.sel=relPick.mode==='main'?[t]:on?[...relPick.sel.filter(x=>x!==t),t]:relPick.sel.filter(x=>x!==t);refreshRelPicker()}
function applyRelPicker(){const d=triDraft(vq(relPick.vid));
 if(relPick.mode==='main'){if(!relPick.sel[0]){$('dp-error').textContent='메인 부서를 하나 고르세요.';return}d.dept=relPick.sel[0];d.rel=d.rel.filter(x=>x!==d.dept)}
 else d.rel=relPick.sel.filter(x=>x!==d.dept);
 $('modal').close();render()}
function createCase(id){const v=vq(id);if(!canTriage()){toast('VOICE_TRIAGE 권한이 필요합니다.');return}
 const d=triDraft(v),cid='C-'+id.slice(2);
 v.fin=JSON.parse(JSON.stringify(d));v.st.tri='Case 생성';v.caseId=cid;
 state.cases[cid]={id:cid,voice:id,title:v.title.replace(/[.。]$/,''),track:d.track,main:d.dept,handler:d.dept==='고객지원팀'?'김도윤':'미지정',rel:[...d.rel],closed:false,decision:'',result:'',ops:{}};
 tasksOf(cid);crefsOf(cid);
 if(!voices.find(x=>x.id===id))voices.push({id,title:v.title,suggest:d.track});else state['track_'+id]=d.track;
 render();toast(`${cid} 생성 · 메인 부서 ${d.dept} · ${TRACK[d.track][0]} · AI 제안과 확정값을 함께 기록했습니다.`)}
function afterCase(v){const c=state.cases[v.caseId];if(!c)return '';
 const info=`<div class="notice"><strong>${c.id} · ${TRACK[c.track][0]}</strong> · 메인 부서 ${c.main} · 관련 부서 ${c.rel.join(', ')||'없음'}<br><span class="small">확정자 김도윤 · 분류 상태 TRIAGED · Case 상태는 ${c.closed?'CLOSED':'OPEN'}</span></div>`;
 if(c.track!=='QUICK')return info+`<div class="actions">${btn('Case 작업 공간 열기 →',`openCase('${c.id}','${c.rel.length?'tasks':'source'}')`,'primary')}${c.rel.length&&!tasksOf(c.id).length?`<span class="small muted">관련 부서 협업 요청은 Case의 ‘협업 업무’ 탭에서 보냅니다.</span>`:''}</div>`;
 if(c.closed){const r=state.reuseLog.find(x=>x.case===c.id);return info+`<div class="kcard">${tag('재사용 기록 생성','green')}<h3>${r?REFS[r.k].ver+' → '+c.id:''}</h3><p>knowledge_reuse · 사용 유형 적용 · 사유: ${r?esc(r.reason):''}<br>case_references에도 ‘적용’으로 남습니다. 검증 없는 즉시 종결이라 새 지식의 근거로는 쓰지 않습니다.</p></div>`}
 const ks=v.ai.refs.filter(k=>refOk(k)&&REFS[k].kind==='KNOWLEDGE'&&canReadRef(k));
 if(!ks.length)return info+`<div class="notice amber">적용할 게시 지식이 없습니다. 처리 경로를 일반 처리로 다시 분류하세요.</div>`;
 return info+`<h3 class="sub">바로 종결 · 추천 지식 적용</h3>${ks.map((k,i)=>`<label class="kcard pick"><input type="radio" name="quick-k" value="${k}" ${i===0?'checked':''}><div>${tag('게시 지식 · 열람 시점 권한 확인','green')}<h3>${REFS[k].title} · ${REFS[k].ver}</h3><p>${REFS[k].body||REFS[k].loc}</p></div></label>`).join('')}<label class="field">적용 사유<input id="quick-reason" value="${k0reason(ks[0])}"></label><div id="quick-error" class="error" role="alert"></div>${btn('이 지식으로 즉시 종결',`quickClose('${c.id}')`,'primary')}`;
}
const k0reason=k=>k==='K-1022'?'등록 메일 확인 후 재발송 안내로 해결 가능':'같은 증상 · 캐시 설정 점검 절차 적용 가능';
function quickClose(cid){if(state.role!=='handler'){toast('메인 부서 담당자만 종결할 수 있습니다.');return}
 const c=state.cases[cid],k=(document.querySelector('input[name=quick-k]:checked')||{}).value,reason=$('quick-reason').value.trim();
 if(!k||!reason){$('quick-error').textContent='적용할 지식과 적용 사유를 입력해주세요.';return}
 c.closed=true;vq(c.voice).st.tri='종결';state.reuseLog.push({k,case:cid,reason});state.reuseCount++;state.quickClosed[c.voice]=true;
 crefsOf(cid).push({ref:k,origin:'AI',usage:'적용',reason,by:'김도윤',dept:'고객지원팀',task:''});
 if(k==='K-2041')state.reused=true;
 render();toast(`${cid} 종결 · ${REFS[k].ver} 재사용 기록 1건 생성`)}
function openCase(id,tab){state.caseId=id;state.tab=tab||'source';go('case')}

/* ---------- 새 VOC 테스트 접수 ---------- */
function openIntake(){if(!canIntake()){toast('VOICE_INTAKE_CREATE 권한이 필요합니다.');return}
 const ext=`DEMO-${String(state.demoSeq+1).padStart(3,'0')}`;
 const opt=(a,v)=>a.map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('');
 modal('새 VOC 테스트 접수',`<div class="intake-top">${tag('포트폴리오 시연용 가상 VOC','purple')}<span class="small muted">고객용 포털이 아닌 내부 시연·검증 화면 · 데이터셋 “시연용 가상 VOC”(SYNTHETIC)</span></div>
 <div class="scn"><span class="small"><b>시나리오 빠른 입력</b></span>${Object.keys(SCN).map(k=>`<button class="btn small" onclick="fillScenario('${k}')"><b>${SCN_LABEL[k][0]}</b> ${SCN_LABEL[k][1]}</button>`).join('')}</div>
 <form class="intake-grid" onsubmit="event.preventDefault();submitIntake()" novalidate>
 <div class="legend full">필수</div>
 <label class="field full">제목 <b class="req">*</b><input id="in-title" placeholder="예: 비밀번호 초기화 메일이 오지 않습니다."></label>
 <label class="field full">본문(원문) <b class="req">*</b><textarea id="in-body" placeholder="고객이 보낸 원문 그대로 입력합니다. 저장 후 정제 단계에서 개인정보를 마스킹합니다."></textarea></label>
 <label class="field">최초 접수 부서 <b class="req">*</b><select id="in-dept">${opt(RECV_DEPTS,'고객지원팀')}</select></label>
 <label class="field">고객(또는 고객 구분) <b class="req">*</b><input id="in-cust" placeholder="예: 기업 고객 · 다온물류"></label>
 <label class="field">제품·서비스 <b class="req">*</b><input id="in-prod" placeholder="예: 문서 검색 서비스 v5.2"></label>
 <label class="field">수신 시각 <b class="req">*</b><input id="in-time" type="datetime-local" value="2026-10-07T10:42"></label>
 <div class="legend full">선택</div>
 <label class="field">채널<select id="in-ch"><option value="MANUAL_DEMO" selected>MANUAL_DEMO</option><option value="INTERNAL_MANUAL">INTERNAL_MANUAL</option></select></label>
 <label class="field">긴급도 힌트<select id="in-urg"><option value="">없음</option>${opt(URGS,'')}</select></label>
 <label class="field">외부 접수번호<input id="in-ext" value="${ext}"></label>
 <label class="field">첨부(파일명만)<input id="in-att" placeholder="예: capture.png"></label>
 <label class="field full">담당자 메모<input id="in-memo" placeholder="내부 메모 · 고객에게 보이지 않음"></label>
 <div id="intake-error" class="error full" role="alert"></div>
 <div class="intake-foot full"><span></span><div class="actions">${btn('취소',"$('modal').close()")}<button class="btn primary" type="submit">접수하고 처리 시작</button></div></div>
 </form>`,true)}
function fillScenario(k){const s=SCN[k];$('in-title').value=s.title;$('in-body').value=s.body;$('in-dept').value=s.dept;$('in-cust').value=s.cust;$('in-prod').value=s.prod;$('in-time').value=s.time;$('in-urg').value=s.urg;$('in-att').value=s.att;$('in-memo').value=s.memo;$('in-ch').value='MANUAL_DEMO';$('intake-error').textContent='';
 document.querySelectorAll('.scn .btn').forEach(b=>b.classList.toggle('on',b.textContent.trim().startsWith(k)))}
function submitIntake(){
 const f=id=>$(id).value.trim();
 const miss=[['in-title','제목'],['in-body','본문'],['in-dept','최초 접수 부서'],['in-cust','고객'],['in-prod','제품·서비스'],['in-time','수신 시각']].filter(([id])=>!f(id)).map(x=>x[1]);
 if(miss.length){$('intake-error').textContent=`필수 항목을 입력해주세요: ${miss.join(', ')}`;return}
 state.demoSeq++;
 const n=2049+state.demoSeq,id=`V-${n}`,t=f('in-time'),time=`${t.slice(5,7)}.${t.slice(8,10)} ${t.slice(11,16)}`;
 const v={id,ext:f('in-ext')||`DEMO-${String(state.demoSeq).padStart(3,'0')}`,ch:'내부 테스트 접수',chCode:$('in-ch').value,dataset:'SYNTHETIC',dept:f('in-dept'),cust:f('in-cust'),prod:f('in-prod'),title:f('in-title'),raw:f('in-body'),time,urgHint:$('in-urg').value,att:f('in-att'),memo:f('in-memo'),st:{clean:'대기',ai:'대기',tri:'접수'},ai:null,fin:null,caseId:null,dup:'검사 중'};
 const m=maskPII(v.raw),ai=analyze(v.title,v.raw,v.dept,v.urgHint);
 const sim=state.vq.find(x=>x.id!==id&&x.ai&&x.ai.cat===ai.cat&&x.title.slice(0,6)===v.title.slice(0,6));
 const dup=sim?(sim.cust===v.cust?`중복 후보 ${sim.id} · 같은 고객·같은 증상 · 사람이 병합 판단`:`유사 접수 ${sim.id} · 고객 다름 → 새 Voice 저장 · 유사 사례로 연결`):'중복 없음';
 state.vq.unshift(v);state.vsel=id;state.vview='clean';
 const steps=[
  ['원문 저장',`raw_text 저장 · 접수 부서 ${v.dept} 기본 권한 적용(원문은 VOC 담당만)`,()=>{}],
  ['출처 기록(가상 데이터셋)',`데이터셋 “시연용 가상 VOC” · SYNTHETIC · ${v.ext} · data_provenance`,()=>{}],
  ['정제 중',`개인정보 ${m.n}건 마스킹 · clean_text v1 생성`,()=>{v.st.clean='정제 중'},()=>{v.st.clean='정제 완료'}],
  ['중복 검사',dup,()=>{},()=>{v.dup=dup}],
  ['AI 분석 완료',`${ai.cat} · ${TRACK[ai.track][0]} 제안 · 메인 부서 ${ai.dept}${ai.rel.length?' · 관련 '+ai.rel.join('·'):''}`,()=>{v.st.ai='분석 중'},()=>{v.st.ai='분석 완료';v.ai=ai}],
  ['분류 대기열',`담당자가 AI 제안을 확인하고 확정합니다`,()=>{},()=>{v.st.tri='분류 대기'}]];
 $('modal-body').innerHTML=`<div class="intake-top">${tag('포트폴리오 시연용 가상 VOC','purple')}<span class="mono">${id} · ${esc(v.ext)}</span></div><h3 style="margin:6px 0 4px">${esc(v.title)}</h3><p class="small muted">운영 반입과 같은 순서로 처리 중</p><ol class="pipe">${steps.map(([s,d],i)=>`<li id="pipe-${i}"><span class="dot"></span><div><b>${s}</b><p>${esc(d)}</p></div></li>`).join('')}</ol><div id="pipe-done"></div>`;
 render();
 let i=0;const tick=()=>{if(i>0){const p=steps[i-1];if(p[3])p[3]();const li=$('pipe-'+(i-1));if(li){li.classList.remove('run');li.classList.add('ok')}}
  if(i<steps.length){steps[i][2]();const li=$('pipe-'+i);if(li)li.classList.add('run');i++;if(state.page==='voice')render();setTimeout(tick,520)}
  else{if(state.page==='voice')render();const d=$('pipe-done');if(d)d.innerHTML=`<div class="notice"><strong>${id} 분류 대기열 등록 완료</strong> · 정제 ${v.st.clean} · AI ${v.st.ai} · 분류 ${v.st.tri}</div><div class="actions" style="justify-content:flex-end">${btn('분류 대기열에서 보기',"$('modal').close();go('voice')",'primary')}</div>`;toast(`${id} 접수 완료 · 대기열 맨 위에 표시했습니다.`)}};
 tick();
}
function openCsv(){if(!canIntake()){toast('VOICE_INTAKE_IMPORT 권한이 필요합니다.');return}
 modal('CSV 반입',`<p>수집원 <b>고객지원 CSV 반입</b>(소유 부서 고객지원팀)으로 여러 건을 한 번에 반입합니다. 행마다 같은 반입 서비스를 거칩니다.</p><div class="kv"><div><span>필수 열</span><b>title, body, received_department, customer, product, received_at</b></div><div><span>선택 열</span><b>channel, urgency_hint, external_id, attachment_name, memo</b></div><div><span>처리</span><b>원문 저장 → 출처 기록 → 정제 → 중복 검사 → AI 분석 → 분류 대기열</b></div></div><label class="field">CSV 파일<input type="file" accept=".csv" disabled></label>`)}
function openConnectors(){
 const rows=[['고객지원 시스템','CRM_CONNECTOR','고객지원팀',tag('정상','green'),'10.07 10:05'],['이메일 수집원','MAIL_CONNECTOR','고객지원팀',tag('정상','green'),'10.07 09:40'],['고객지원 CSV 반입','CSV_IMPORT','고객지원팀',tag('대기'),'수동 실행'],['시연용 가상 VOC','MANUAL_DEMO · SYNTHETIC','고객지원팀',tag('개발 모드에서만','purple'),state.demoSeq?`${state.demoSeq}건`:'—'],['전화·실시간 상담','—','—',tag('미연동'),'향후 고도화']];
 modal('수집원 상태',`<div class="table-wrap"><table><thead><tr><th>수집원</th><th>방식</th><th>소유 부서</th><th>상태</th><th>마지막 반입</th></tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="small muted" style="margin-top:12px">접수 부서 기본값은 수집원의 소유 부서이며, 수동·테스트 접수는 입력한 부서를 씁니다. 모든 수집원은 같은 반입 서비스를 호출합니다.</p>`,true)}

/* ---------- 개발 모드: 데모 초기화 · 샘플 3건 ---------- */
function devStrip(){return `<div class="devmode"><span class="tag purple">개발 모드 · DEMO_MODE=on</span>${btn('데모 데이터 초기화',"devReset()",'small')}${btn('샘플 VOC 3건 생성',"devSeed()",'small')}<span class="small muted">시연용 가상 VOC(SYNTHETIC) 데이터셋의 행만 지우고 만듭니다 · 운영 환경에서는 이 영역이 표시되지 않으며 데이터 삭제 API와 별개입니다.</span></div>`}
function devReset(){const ids=state.vq.filter(v=>v.dataset==='SYNTHETIC').map(v=>v.id);
 state.vq=state.vq.filter(v=>v.dataset!=='SYNTHETIC');ids.forEach(id=>{const cid='C-'+id.slice(2);delete state.cases[cid];delete state.tasks[cid];delete state.crefs[cid];delete state.tri[id]});
 state.demoSeq=0;if(!state.cases[state.caseId])state.caseId='C-2041';render();toast(`가상 데이터 ${ids.length}건을 지웠습니다. 반입된 기록은 그대로입니다.`)}
function devSeed(){['A','B','C'].forEach((k,i)=>{const s=SCN[k];state.demoSeq++;const id=`V-${2049+state.demoSeq}`,ai=analyze(s.title,s.body,s.dept,s.urg);
 state.vq.unshift({id,ext:`DEMO-${String(state.demoSeq).padStart(3,'0')}`,ch:'내부 테스트 접수',chCode:'MANUAL_DEMO',dataset:'SYNTHETIC',dept:s.dept,cust:s.cust,prod:s.prod,title:s.title,raw:s.body,time:clock(),urgHint:s.urg,att:s.att,memo:s.memo,st:{clean:'정제 완료',ai:'분석 완료',tri:'분류 대기'},ai,fin:null,caseId:null,dup:'중복 없음'})});
 state.vsel=state.vq[0].id;render();toast('샘플 VOC 3건(A·B·C)을 같은 반입 서비스로 생성했습니다.')}

/* ================= Case 작업 공간 ================= */
const CASE_TABS=[['source','접수 기록'],['tasks','협업 업무'],['decision','부서 의견·결정'],['refs','참고 자료'],['outcome','결과 검증']];
let tabOverride=null;
casePath=function(){const c=curCase(),t=tabOverride||state.tab,a=taskAgg(c.id),n=crefsOf(c.id).length;
 const badge=id=>id==='tasks'&&a.req?`<span class="cnt">${a.done}/${a.req}</span>`:id==='refs'&&n?`<span class="cnt">${n}</span>`:'';
 return (c.id==='C-2041'?stageBar():caseStage(c))+`<div class="pathbar case-tabs" role="tablist">${CASE_TABS.map(([id,nm],i)=>`<button role="tab" aria-selected="${t===id}" class="${t===id?'active':''}" onclick="caseTab('${id}')"><b>${i+1}</b> ${nm}${badge(id)}</button>`).join('')}</div>`};
caseTab=function(tab){state.tab=tab==='opinions'?'decision':tab==='knowledge'?'outcome':tab;render()};
function actAs(role){state.role=role;if($('modal').open)$('modal').close();if(!roles[role].menus.includes(state.page))state.page='home';render();window.scrollTo(0,0);
 toast(role==='handler'?'메인 부서(고객지원팀) 담당자로 돌아왔습니다.':`${roles[role].dept} · ${myName()} 역할로 전환했습니다. Case 읽기·의견·연결된 조치만 할 수 있습니다.`)}
function caseSwitch(){const cs=visibleCases();if(cs.length<2)return '';
 return `<div class="case-switch"><span class="small muted">Case</span>${cs.map(c=>{return `<button class="${c.id===state.caseId?'on':''}" onclick="state.caseId='${c.id}';state.tab='${state.tab}';render()"><b>${c.id}</b> <span class="small">${esc(c.title)}</span></button>`}).join('')}</div>`}
function roleBanner(c){if(!isTaskRole())return '';
 return `<div class="role-banner">${tag('협업 요청 범위','amber')}<span><b>${myDept()} · ${myName()}</b> — ${c.id}를 읽고 의견을 남기며, 우리 부서 협업 업무에 연결된 조치만 기록합니다. 원문(READ_RAW)과 문서 권한은 넓어지지 않고 각자의 ACL로 다시 확인합니다.</span>${btn('메인 부서 역할로 돌아가기',"actAs('handler')",'small')}</div>`}
function caseStatus(c){const a=taskAgg(c.id);if(c.closed)return['CLOSED','종결'];if(caseVerified(c))return['VERIFIED','결과 검증됨 · 종결 준비'];
 if(a.open.length)return['COLLECTING_OPINIONS',`관련 부서 대기 ${a.open.length}건`];if(c.id==='C-2041'?state.decision:c.decision)return['DECIDED','결정됨 · 결과 취합'];return['OPEN','메인 부서 처리']}
function summaryPanel(c){const label=caseStatus(c)[1];
 return panel('Case 요약',`<div class="info-row"><span>메인 부서 · 최종 책임</span><strong>${c.main} · ${c.handler}</strong></div><div class="info-row"><span>처리 경로</span>${tag(TRACK[c.track][0],TRACK[c.track][1])}</div><div class="info-row"><span>관련 부서 협업</span><strong>${c.rel.join(', ')||'없음'}</strong></div><div class="info-row"><span>Case 상태</span><strong>${label}</strong></div><div class="info-row"><span>원천 VOC</span><strong>${c.voice}</strong></div>`,tag(c.id))}
function swapLeft(html,body){return rx(html,/(<div class="case-layout"><section class="panel">)[\s\S]*?(<\/section><div class="stack">)/,(m,a,b)=>a+body+b)}
function decorate(html,c){html=rx(html,/<\/header>/,m=>m+caseSwitch()+roleBanner(c));
 html=rx(html,/<section class="panel"><div class="panel-head"><h2>(해결에 사용한 사내 지식|로컬 AI 조력자|다음에 남길 지식)<\/h2>[\s\S]*?<\/section>/g,()=>''); // 오른쪽 열은 Case 요약 중심
 return rx(html,/<div class="stack">/,m=>m+summaryPanel(c))}

const casePageV21=casePage;
casePage=function(){
 const vis=visibleCases();if(!vis.find(c=>c.id===state.caseId))state.caseId=(vis[0]||{}).id;
 const c=curCase();if(!c)return head('02 / CASE WORKSPACE','Case 작업 공간','협업 요청을 받은 Case가 없습니다.');
 let t=state.tab;if(t==='opinions')t='decision';if(t==='knowledge')t='outcome';if(!CASE_TABS.some(x=>x[0]===t))t='source';state.tab=t;
 if(c.id!=='C-2041')return decorate(genericCase(c,t),c);
 let html;
 if(t==='tasks'||t==='refs'){tabOverride=t;state.tab='source';try{html=casePageV21()}finally{state.tab=t;tabOverride=null}html=swapLeft(html,t==='tasks'?tasksBody(c):refsBody(c))}
 else html=casePageV21();
 if(t==='outcome'){const warn=taskAgg(c.id).open.length?`<div class="notice amber" style="margin:0 20px">필수 협업 업무 ${taskAgg(c.id).open.length}건이 아직 진행 중입니다. 관련 부서 회신을 취합한 뒤 검증하세요.</div>`:'';
  html=rx(html,/(<div class="case-layout"><section class="panel">)([\s\S]*?)(<\/section><div class="stack">)/,(m,a,b,d)=>a+warn+b+`<div class="panel-body cb-wrap">${closeBar(c)}</div>`+d)}
 html=html.replace('C-2041 · 고객지원팀 김도윤 · 운영팀·개발팀 참여','C-2041 · 메인 부서 고객지원팀 김도윤 · 관련 부서 운영팀·개발팀');
 return decorate(html,c);
};
function genericCase(c,t){const v=vq(c.voice);
 const body={source:genericSource,tasks:tasksBody,decision:genericDecision,refs:refsBody,outcome:genericOutcome}[t](c);
 const [code,label]=caseStatus(c);
 return head('02 / CASE WORKSPACE',esc(c.title),`${c.id} · 원천 ${c.voice} · 메인 부서 ${c.main} ${c.handler} · 관련 부서 ${c.rel.join('·')||'없음'}`,tag(label,c.closed?'green':'amber'))+casePath()+`<div class="case-layout"><section class="panel">${body}</section><div class="stack">${panel('권한 범위',`<div class="info-row"><span>메인 부서</span><strong>읽기·쓰기·결정·종결</strong></div><div class="info-row"><span>관련 부서(협업 업무)</span><strong>읽기·의견·연결된 조치</strong></div><div class="info-row"><span>원문</span><strong>접수·메인 부서 VOC 담당</strong></div><div class="info-row"><span>참고 문서</span><strong>문서별 ACL 재검사</strong></div>`)}${v&&v.dataset==='SYNTHETIC'?`<div class="notice purple">포트폴리오 시연용 가상 VOC · SYNTHETIC 데이터셋</div>`:''}</div></div>`}
function genericSource(c){const v=vq(c.voice),f=v.fin,a=v.ai;
 return `<div class="document"><div class="actions">${tag('정제된 VOC','blue')}${v.dataset==='SYNTHETIC'?tag('포트폴리오 시연용 가상 VOC','purple'):''}<span class="mono">${v.id} · ${esc(v.ext)}</span></div><h2>${esc(v.title)}</h2><blockquote>${showClean(maskPII(v.raw).text)}</blockquote><div class="kv"><div><span>접수 부서</span><b>${v.dept}</b></div><div><span>고객</span><b>${esc(v.cust)}</b></div><div><span>제품·서비스</span><b>${esc(v.prod)}</b></div><div><span>수신</span><b>${v.time} · ${v.dataset==='SYNTHETIC'?'MANUAL_DEMO':v.ch}</b></div></div><h3>분류 기록</h3><table class="cmp"><thead><tr><th>항목</th><th>AI 제안</th><th>사람 확정</th></tr></thead><tbody>${[['분류','cat'],['긴급도','urg'],['메인 부서','dept'],['처리 경로','track'],['관련 부서','rel']].map(([n,k])=>`<tr><th scope="row">${n}</th><td class="ai-col">${k==='track'?TRACK[a[k]][0]:k==='rel'?a.rel.join(', ')||'없음':a[k]}</td><td><b>${k==='track'?TRACK[f[k]][0]:k==='rel'?f.rel.join(', ')||'없음':f[k]}</b></td></tr>`).join('')}</tbody></table>${canRaw()?btn('원문 보기 (READ_RAW)',`toast('원문 열람이 감사 기록에 남습니다.')`,'small'):`<p class="small muted">${LOCK} 원문은 READ_RAW 권한이 필요합니다.</p>`}</div>`}

/* ---------- 협업 업무 ---------- */
const TSTEP=['REQUESTED','ACCEPTED','IN_PROGRESS','COMPLETED'],TLABEL={REQUESTED:'요청',ACCEPTED:'수락',IN_PROGRESS:'진행',COMPLETED:'완료',RETURNED:'반려',CANCELLED:'취소'};
const canMain=c=>state.role==='handler'&&myDept()===c.main;
function tasksBody(c){
 const ts=tasksOf(c.id),main=canMain(c)&&!c.closed;
 const pending=c.rel.filter(d=>!ts.some(t=>t.dept===d&&t.st!=='CANCELLED'));
 const form=main?`<details class="req-form" ${ts.length?'':'open'}><summary title="협업 요청은 원문·문서 권한을 넓히지 않습니다">＋ 관련 부서에 협업 요청</summary><div class="req-grid"><label class="field">대상 부서<select id="tq-dept">${[...new Set([...pending,...c.rel,...REL_DEPTS])].filter(d=>d!==c.main).map(d=>`<option>${d}</option>`).join('')}</select></label><label class="field">유형<select id="tq-type"><option>의견</option><option selected>작업</option><option>검토</option></select></label><label class="field">기한<input id="tq-due" type="date" value="2026-10-10"></label><label class="check"><input id="tq-req" type="checkbox" checked> 필수 업무 · 완료 전에는 종결 불가</label><label class="field wide">요청 메모<input id="tq-note" placeholder="무엇을 확인·처리해 달라는지 적어주세요"></label></div><div id="tq-error" class="error" role="alert"></div>${btn('협업 요청 보내기',`requestTask('${c.id}')`,'primary small')}</details>`:'';
 const hint=main&&pending.length?`<p class="small muted">확정된 관련 부서 중 아직 요청하지 않은 부서: <b>${pending.join(', ')}</b></p>`:'';
 const cards=ts.map(t=>taskCard(c,t)).join('')||`<div class="empty small"><h2>협업 업무가 없습니다.</h2><p>${c.track==='QUICK'?'바로 종결 경로는 협업 없이 게시 지식으로 처리합니다.':'메인 부서가 필요할 때 관련 부서에 의견·작업·검토를 요청합니다.'}</p></div>`;
 return `<div class="panel-body">${form}${hint}<div class="task-list" title="협업 요청은 원문·문서 권한을 넓히지 않습니다">${cards}</div>${closeBar(c)}</div>`}
function taskCard(c,t){
 const idx=TSTEP.indexOf(t.st),mine=myDept()===t.dept&&isTaskRole(),main=canMain(c)&&!c.closed;
 let chips;
 if(t.st==='RETURNED')chips=`<span class="chip-s done">요청</span><span class="chip-s ret">반려</span>`;
 else if(t.st==='CANCELLED')chips=`<span class="chip-s done">요청</span><span class="chip-s ret">취소</span>`;
 else chips=TSTEP.map((s,i)=>`<span class="chip-s ${i<idx||(i===idx&&s==='COMPLETED')?'done':i===idx?'now':''}">${TLABEL[s]}</span>`).join('<i>→</i>');
 let act='';
 if(mine&&!c.closed){if(t.st==='REQUESTED')act=btn('수락',`advTask('${c.id}','${t.id}','ACCEPTED')`,'primary small')+btn('반려',`returnTask('${c.id}','${t.id}')`,'small');
  else if(t.st==='ACCEPTED')act=btn('진행 시작',`advTask('${c.id}','${t.id}','IN_PROGRESS')`,'primary small');
  else if(t.st==='IN_PROGRESS')act=`<label class="field wide">완료 회신(메인 부서에 돌아갑니다)<textarea id="reply-${t.id}" rows="2">${t.dept==='개발팀'&&c.id==='C-2041'?'5.2에서 캐시 TTL 기본값이 300초→30초로 바뀐 것을 확인했습니다. TTL 원복은 복구 가능한 조정입니다.':t.dept==='개발팀'?'표 셀 병합 옵션이 5.2에서 기본 해제되어 재현됩니다. 옵션 재활성화로 해결됩니다.':''}</textarea></label>`+btn('완료 회신',`advTask('${c.id}','${t.id}','COMPLETED')`,'primary small')}
 else if(main&&OPEN(t)){if(TASK_ROLE[t.dept])act=btn(`${t.dept} 역할로 전환해 처리 →`,`actAs('${TASK_ROLE[t.dept]}')`,'small');else act=`<span class="small muted">시안 역할 없음</span>`;if(!t.req)act+=btn('요청 취소',`advTask('${c.id}','${t.id}','CANCELLED')`,'small text')}
 else if(main&&t.st==='RETURNED')act=btn('다시 요청',`advTask('${c.id}','${t.id}','REQUESTED')`,'small');
 return `<article class="task-card ${mine?'mine':''}"><header><div class="actions"><b>${t.dept}</b>${tag(t.type,'blue')}${t.req?tag('필수','amber'):tag('선택')}${t.who?`<span class="small muted">담당 ${t.who}</span>`:''}</div><span class="small muted nowrap"><span class="mono">${t.id}</span> · 기한 ${t.due}</span></header><p class="t-note">${esc(t.note)}</p><div class="steps">${chips}</div>${t.reply?`<div class="reply"><b>${t.st==='RETURNED'?'반려 사유':'회신'}</b> ${esc(t.reply)}</div>`:''}${act?`<div class="actions t-act">${act}</div>`:''}</article>`}
function requestTask(cid){const c=state.cases[cid];if(!canMain(c)){toast('메인 부서 담당자만 협업을 요청할 수 있습니다.');return}
 const dept=$('tq-dept').value,type=$('tq-type').value,note=$('tq-note').value.trim(),d=$('tq-due').value;
 if(!note){$('tq-error').textContent='요청 메모를 입력해주세요.';return}
 if(tasksOf(cid).some(t=>t.dept===dept&&t.type===type&&OPEN(t))){$('tq-error').textContent=`${dept}에 같은 유형의 진행 중인 요청이 있습니다.`;return}
 const id=`T-${cid.slice(2)}-${tasksOf(cid).length+1}`;
 tasksOf(cid).push({id,dept,who:{'운영팀':'오민준','개발팀':'한유진'}[dept]||'',type,req:$('tq-req').checked,due:d?`${d.slice(5,7)}.${d.slice(8,10)}`:'—',note,st:'REQUESTED',reply:'',hist:[`요청 ${clock().slice(6)}`]});
 if(!c.rel.includes(dept))c.rel.push(dept);
 render();toast(`${dept}에 ${type} 요청을 보냈습니다 · ${dept}에는 이 Case 읽기·의견 권한만 생깁니다.`)}
function advTask(cid,tid,to){const c=state.cases[cid],t=tasksOf(cid).find(x=>x.id===tid);
 const mine=myDept()===t.dept&&isTaskRole(),main=canMain(c);
 if(['ACCEPTED','IN_PROGRESS','COMPLETED'].includes(to)&&!mine){toast(`${t.dept} 담당자만 이 업무를 처리할 수 있습니다.`);return}
 if(['CANCELLED','REQUESTED'].includes(to)&&!main){toast('메인 부서만 요청을 취소하거나 다시 보낼 수 있습니다.');return}
 if(to==='CANCELLED'&&t.req){toast('필수 업무는 취소하지 않습니다.');return}
 if(to==='COMPLETED'){const r=($('reply-'+tid)||{}).value;if(!r||!r.trim()){toast('완료 회신 내용을 입력해주세요.');return}t.reply=r.trim();
  if(cid==='C-2041')state.opinions.push({who:`${t.dept} · ${t.who||myName()} (협업 ${t.id})`,title:`${t.type} 회신`,text:t.reply,adopt:true,reason:''});}
 if(to==='REQUESTED')t.reply='';
 t.st=to;t.hist.push(`${TLABEL[to]} ${clock().slice(6)}`);if(!t.who&&mine)t.who=myName();
 render();toast(to==='COMPLETED'?`${t.dept} 회신 완료 · 메인 부서(${c.main})로 돌아갔습니다. 종결은 메인 부서가 합니다.`:`${t.id} · ${TLABEL[to]}`)}
function returnTask(cid,tid){modal('협업 요청 반려',`<p class="small">반려하면 메인 부서가 내용을 고쳐 다시 요청하거나 다른 부서에 요청합니다.</p><label class="field">반려 사유<input id="ret-reason" placeholder="예: 우리 부서 소관이 아님 · 운영팀 확인 필요"></label><div id="ret-error" class="error" role="alert"></div>${btn('반려',`confirmReturn('${cid}','${tid}')`,'danger')}`)}
function confirmReturn(cid,tid){const r=$('ret-reason').value.trim();if(!r){$('ret-error').textContent='반려 사유를 입력해주세요.';return}const t=tasksOf(cid).find(x=>x.id===tid);t.st='RETURNED';t.reply=r;t.hist.push(`반려 ${clock().slice(6)}`);$('modal').close();render();toast('반려했습니다. 메인 부서에 돌아갑니다.')}
function closeReasons(c){const r=[],a=taskAgg(c.id);
 if(!canMain(c))r.push(`메인 부서(${c.main}) 담당자만 종결할 수 있습니다${isTaskRole()?' · 관련 부서는 회신까지만':''}`);
 if(a.open.length)r.push(`필수 협업 업무 ${a.open.length}건 미완료 · ${a.open.map(t=>`${t.dept} ${t.type}(${TLABEL[t.st]})`).join(', ')}`);
 if(c.track==='KNOWLEDGE'&&!caseVerified(c))r.push('결과 검증 필요');
 if(c.track==='STANDARD'&&!c.result)r.push('결과 요약 필요');
 return r}
function closeBar(c){if(c.closed)return `<div class="close-bar done"><div><b>Case 종결됨</b><p class="small">${c.track==='KNOWLEDGE'?'Case 종결과 지식 게시·배포는 따로 진행됩니다.':'지식화하지 않고 결정과 결과만 기록했습니다.'}</p></div>${tag('종결','green')}</div>`;
 const r=closeReasons(c);
 return `<div class="close-bar"><div><b>Case 종결</b>${r.length?`<ul class="reasons">${r.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<p class="small">종결 조건을 모두 충족했습니다.</p>'}</div><button class="btn primary" onclick="closeCase('${c.id}')" ${r.length?`disabled aria-disabled="true" title="${esc(r.join(' / '))}"`:''}>Case 종결</button></div>`}
function closeCase(cid){const c=state.cases[cid],r=closeReasons(c);if(r.length){toast(r[0]);return}
 c.closed=true;const v=vq(c.voice);if(v)v.st.tri='종결';if(c.track==='STANDARD'&&!c.toKnowledge)state.standardClosed[c.voice]=true;
 render();toast(`${cid} 종결 · ${c.toKnowledge?'지식화 후보로 전환했습니다.':c.track==='KNOWLEDGE'?'지식 게시·배포는 별도로 진행됩니다.':'지식화 없이 종결했습니다.'}`)}

/* ---------- 부서 의견·결정 / 결과 검증 (C-2041 외) ---------- */
function genericDecision(c){const done=tasksOf(c.id).filter(t=>t.st==='COMPLETED'),ro=canMain(c)&&!c.closed?'':'disabled';
 const ops=done.map(t=>{const o=c.ops[t.id]||(c.ops[t.id]={adopt:true,reason:''});return `<div class="op-row"><div><strong>${t.dept} · ${t.who} <span class="mono muted">${t.id}</span></strong><p>${esc(t.reply)}</p></div><select ${ro} aria-label="반영 여부" onchange="state.cases['${c.id}'].ops['${t.id}'].adopt=this.value==='y'"><option value="y" ${o.adopt?'selected':''}>반영</option><option value="n" ${!o.adopt?'selected':''}>보류</option></select><input ${ro} aria-label="판단 사유" value="${esc(o.reason)}" placeholder="반영·보류 사유" oninput="state.cases['${c.id}'].ops['${t.id}'].reason=this.value"></div>`}).join('')||'<p class="small muted">아직 완료된 관련 부서 회신이 없습니다. 의견은 필요할 때만 받습니다.</p>';
 const def=c.id==='C-2044'?'PDF 내보내기의 표 셀 병합 옵션을 다시 켜고, 수정 배포 전까지 고객에게 화면 인쇄 우회 방법을 안내합니다.':'';
 return `<div class="panel-body"><h3>관련 부서 회신</h3>${ops}<h3 style="margin-top:18px">메인 부서 결정</h3><label class="field">결정과 사유<textarea id="g-decision" ${ro}>${esc(c.decision||def)}</textarea></label><div id="g-error" class="error" role="alert"></div>${ro?'':btn('결정 저장',`saveGDecision('${c.id}')`,'primary')}${c.decision?`<div class="decision">저장된 결정 · ${esc(c.decision)}</div>`:''}</div>`}
function saveGDecision(cid){const c=state.cases[cid],v=$('g-decision').value.trim();if(!v){$('g-error').textContent='결정과 사유를 입력해주세요.';return}
 for(const t of tasksOf(cid).filter(t=>t.st==='COMPLETED'))if(!c.ops[t.id].reason.trim()){$('g-error').textContent='관련 부서 회신마다 반영·보류 사유를 입력해주세요.';return}
 c.decision=v;state.tab='outcome';render();toast('결정을 저장했습니다. 결과를 기록하세요.')}
function genericOutcome(c){const ro=canMain(c)&&!c.closed?'':'disabled';
 const def=c.id==='C-2044'?'옵션 재활성화 후 고객 견적서 PDF 3쪽 표가 정상 출력됨을 확인했습니다.':'';
 const k=c.track==='KNOWLEDGE'?`<label class="check"><input id="g-ver" type="checkbox" ${c.verified?'checked':''} ${ro}> 전후 증거와 적용 조건을 확인했습니다 · 결과 검증</label><p class="small muted">지식 초안 생성·승인·배포 흐름은 이 시안에서 C-2041로 시연합니다.</p>`:c.track==='STANDARD'?`<label class="check"><input id="g-k" type="checkbox" ${c.toKnowledge?'checked':''} ${ro}> 다른 부서도 알아야 할 내용입니다 · 종결 후 지식화 후보로 전환</label><p class="small muted">일반 처리는 결정과 결과만 남기고 종결합니다. 모든 VOC를 지식으로 만들지 않습니다.</p>`:'';
 return `<div class="panel-body"><div class="actions">${tag((c.decision||c.track==='QUICK')?'결정 기록 있음':'결정 기록 필요',(c.decision||c.track==='QUICK')?'green':'amber')}</div><label class="field">결과 요약<textarea id="g-result" ${ro}>${esc(c.result||def)}</textarea></label>${k}<div id="g-error" class="error" role="alert"></div>${ro?'':btn('결과 저장',`saveGResult('${c.id}')`,'primary')}${closeBar(c)}</div>`}
function saveGResult(cid){const c=state.cases[cid],v=$('g-result').value.trim();if(!v){$('g-error').textContent='결과 요약을 입력해주세요.';return}
 if(c.track!=='QUICK'&&!c.decision){$('g-error').textContent='부서 의견·결정 탭에서 결정을 먼저 저장해주세요.';return}
 c.result=v;if($('g-ver'))c.verified=$('g-ver').checked;if($('g-k'))c.toKnowledge=$('g-k').checked;render();toast('결과를 기록했습니다.')}

/* ---------- 참고 자료 ---------- */
function refLabel(k,dept){const r=REFS[k];return canReadRef(k,dept)?`<b>${r.title}</b><span class="mono">${r.ver} · ${r.loc}</span>`:''}   // 읽을 수 없는 근거는 호출하는 쪽에서 행을 빼므로 표시할 것이 없다
function refsBody(c){const v=vq(c.voice),used=crefsOf(c.id),canAdd=(canMain(c)||(isTaskRole()&&tasksOf(c.id).some(t=>t.dept===myDept())))&&!c.closed;
 const seg=`<div class="seg" role="group" aria-label="자료 찾기 방식"><button class="${state.refMode==='ai'?'on':''}" onclick="state.refMode='ai';render()">AI 추천</button><button class="${state.refMode==='find'?'on':''}" onclick="state.refMode='find';render()">직접 찾기</button></div>`;
 const row=(k,origin)=>{const r=REFS[k],ok=canReadRef(k),has=used.some(u=>u.ref===k&&u.dept===myDept());
  return `<div class="ref-row ${ok?'':'denied'}">${ok?tag(KIND[r.kind][0],KIND[r.kind][1]):tag(LOCK+' 접근 제한','red')}<div>${refLabel(k)}</div><div class="r-act">${!ok?'':has?tag('추가됨','green'):canAdd?btn('자료 추가',`addRef('${c.id}','${k}','${origin}')`,'small'):''}</div></div>`};
 let list;
 if(state.refMode==='ai'){const cand=(v&&v.ai?v.ai.refs:[]).filter(refOk),ok=cand.filter(k=>canReadRef(k));
  list=ok.map(k=>row(k,'AI')).join('')||'<p class="small muted">AI 추천 후보가 없습니다.</p>';}
 else{const q=state.refQ.trim();const ks=Object.keys(REFS).filter(refOk).filter(k=>canReadRef(k)).filter(k=>!q||REFS[k].title.includes(q)||k.includes(q));
  list=`<form class="ref-search" onsubmit="event.preventDefault();state.refQ=$('ref-q').value;render()"><input id="ref-q" value="${esc(state.refQ)}" placeholder="문서·지식 검색 (예: 검색, PDF)" aria-label="참고 자료 검색"><button class="btn small" type="submit">찾기</button></form>`+ks.map(k=>row(k,'USER')).join('');}
 const usedV=used.filter(u=>canReadRef(u.ref));   // 읽을 수 없는 자료는 존재·건수 모두 비노출
 const usedRows=usedV.map(u=>`<div class="used-row"><div>${refLabel(u.ref)}<p class="small">${esc(u.reason)}</p></div><div class="u-meta">${tag(u.origin==='AI'?'AI 추천':'직접 선택',u.origin==='AI'?'purple':'')} ${tag(u.usage,u.usage==='적용'?'green':u.usage==='참고'?'blue':'')}<span class="small muted">${u.dept} · ${u.by}${u.task?` · ${u.task}`:''}</span></div></div>`).join('')||'<p class="small muted">아직 기록된 참고 자료가 없습니다.</p>';
 return `<div class="panel-body"><div class="ref-head">${seg}<span class="small muted">현재 역할(${myDept()})의 권한으로 다시 확인한 목록입니다.</span></div><div class="ref-list">${list}</div><h3 class="sub">이 Case에서 사용한 자료 <span class="small muted">· case_references ${usedV.length}건</span></h3><div class="used">${usedRows}</div></div>`}
function addRef(cid,k,origin){const r=REFS[k];
 modal('참고 자료 추가',`<div class="ref-row">${tag(KIND[r.kind][0],KIND[r.kind][1])}<div><b>${r.title}</b><span class="mono">${r.ver} · ${r.loc}</span></div></div><fieldset class="track-pick"><legend>사용 유형</legend>${Object.keys(USAGE).map((u,i)=>`<label class="${i===1?'on':''}"><input type="radio" name="ref-usage" value="${u}" ${i===1?'checked':''} onchange="document.querySelectorAll('.track-pick label').forEach(l=>l.classList.toggle('on',l.contains(this)))">${u} <small>${USAGE[u]}</small></label>`).join('')}</fieldset><label class="field">사유<input id="ref-reason" placeholder="이 자료를 어떻게 썼는지 적어주세요"></label><p class="small muted">추가해도 다른 사람의 문서 권한은 바뀌지 않습니다. 열람 시점 정책(policy_hash_at_use)을 함께 남깁니다.</p><div id="ref-error" class="error" role="alert"></div>${btn('추가',`saveRef('${cid}','${k}','${origin}')`,'primary')}`)}
function saveRef(cid,k,origin){const reason=$('ref-reason').value.trim(),usage=document.querySelector('input[name=ref-usage]:checked').value;if(!reason){$('ref-error').textContent='사유를 입력해주세요.';return}
 const t=isTaskRole()?tasksOf(cid).find(x=>x.dept===myDept()):null;
 crefsOf(cid).push({ref:k,origin,usage,reason,by:myName().replace(/^.*\s/,''),dept:myDept(),task:t?t.id:''});
 if(usage==='적용'&&REFS[k].kind==='KNOWLEDGE'){state.reuseLog.push({k,case:cid,reason});state.reuseCount++}
 $('modal').close();render();toast(`${REFS[k].ver} · ${usage}로 기록했습니다.${usage==='적용'&&REFS[k].kind==='KNOWLEDGE'?' 재사용 기록도 생성했습니다.':''}`)}

/* ================= 지식화 검토: 실제 참고 자료 → 공식 근거 선택 ================= */
const targetTeams=()=>units().filter(id=>!kids(id).length).map(id=>org(id).n);
function sourcesPanel(){
 const used=[];crefsOf('C-2041').forEach(u=>{if(canReadRef(u.ref)&&!used.find(x=>x.ref===u.ref))used.push(u)});   // 읽을 수 없는 근거는 행 자체를 보이지 않는다
 const edit=(state.role==='handler'&&!state.submitted)||(state.role==='reviewer'&&state.submitted&&!state.approved);
 const tg=targetTeams();let need=0,inc=0;
 const rows=used.map(u=>{const k=u.ref,r=REFS[k],ok=canReadRef(k),on=!!state.official[k],out=tg.filter(d=>!r.read.includes(d));if(on)inc++;if(on&&out.length)need++;
  return `<div class="src-row ${on?'on':''}"><label class="check"><input type="checkbox" ${on?'checked':''} ${edit?'':'disabled'} onchange="state.official['${k}']=this.checked;render()"><span>공식 근거로 포함</span></label><div class="src-main">${refLabel(k)}<p class="small">${tag(u.origin==='AI'?'AI 추천':'직접 선택',u.origin==='AI'?'purple':'')} ${tag(u.usage,u.usage==='적용'?'green':'blue')} ${u.dept} · ${u.by} — ${esc(u.reason)}</p></div><div class="src-acl">${ok?'':tag(LOCK+' 제한 근거','amber')}${on&&out.length?`<span class="tag red">공유 확대 필요</span><span class="small muted">${ok?`근거 열람 범위 밖 배포 대상: ${out.join(', ')}`:'근거 열람 범위가 배포 대상보다 좁음'}</span>`:''}</div></div>`}).join('');
 const sum=need?`<div class="src-sum"><span class="deny">공유 확대 필요 <b>${need}</b>건</span></div>`:'';
 return panel('실제 참고 자료 · 공식 근거 선택',`<p class="small">AI 추천 후보 전체가 아니라 C-2041에서 실제로 열람·참고·적용한 자료입니다. 공식 근거는 자동으로 올리지 않고 담당자·검토자가 고릅니다. 근거의 ACL과 지식의 ACL은 합치지 않습니다.</p>${rows}${sum}${need?`<div class="notice amber">열람 범위가 배포 대상보다 좁은 근거를 공식 근거로 포함하면 원본 소유 부서 확인과 공유 확대 승인이 필요합니다. 빼면 지식 본문에서 이 근거를 인용하지 않습니다. 읽을 권한이 없는 사람에게는 이 근거가 보이지 않습니다.</div>`:''}`,tag(edit?'선택 가능':'읽기 전용',edit?'amber':''));
}
const reviewPageV21=reviewPage;
reviewPage=function(){let html=reviewPageV21();if(!state.draft)return html;
 if(!html.includes('class="stagebar"'))html=rx(html,/<\/header>/,m=>m+stageBar()); // ‘하나의 업무 여정’ 줄을 빼도 진행 표시는 한 줄 유지
 return rx(html,/<div class="grid equal" style="margin-top:20px">/,m=>`<div class="src-wrap">${sourcesPanel()}</div>`+m)};

/* ================= 홈 · 부서 지식함 문구 ================= */
const homePageV21=homePage;
homePage=function(){let html=homePageV21();
 if(state.role==='handler'||state.role==='reviewer'){const w=state.vq.filter(v=>v.st.tri==='분류 대기').length,q=state.vq.filter(v=>v.st.clean==='격리').length;
  html=rx(html,/(<h2>다음 행동이 필요한 업무<\/h2><span class="tag ">나와 연결된 업무<\/span><\/div>)/,m=>m+`<div class="work-row"><span class="bullet amber"></span><div><strong>분류 대기 VOC ${w}건 · AI 제안을 확인하고 Case를 만드세요</strong><p>VOC 접수·분류 · 정제 격리 ${q}건 · 테스트 접수도 같은 반입 서비스</p></div>${btn('분류하기',"go('voice')",'small')}</div>`);
  html=html.replace(/C-2041 · 고객지원 \/ 운영 \/ 개발 · /,'C-2041 · 메인 부서 고객지원팀 · ');}
 html=homeSimple(html);
 if(isTaskRole()){const mine=Object.values(state.cases).flatMap(c=>tasksOf(c.id).filter(t=>t.dept===myDept()).map(t=>({c,t})));
  const p=panel('협업 요청 받은 업무',mine.map(({c,t})=>`<div class="work-row"><span class="bullet ${OPEN(t)?'amber':''}"></span><div><strong>${c.id} · ${esc(c.title)} · ${t.type}${t.req?' (필수)':''}</strong><p>메인 부서 ${c.main} · ${TLABEL[t.st]} · 기한 ${t.due}</p></div>${btn('업무 열기',`openCase('${c.id}','tasks')`,'small')}</div>`).join('')||'<p class="small">받은 협업 요청이 없습니다.</p>',tag('관련 부서 협업','amber'));
  html=rx(html,/<div class="hero">/,m=>`<div style="margin-bottom:20px">${p}</div>`+m);}
 return html};
/* S01 홈: 업무 목록 하나 + 상단 소개만. 경로 타일·진행 표시·설명 패널은 각 화면에 있으므로 뺀다 */
function homeSimple(html){
 html=rx(html,/<div class="section-title"><h2>이번 VOC는 어떤 경로로 처리하나요\?<\/h2>[\s\S]*?<\/button><\/div>/,()=>'');
 html=rx(html,/<section class="panel candidate">[\s\S]*?<\/section>|<div class="notice">C-2044를 대표로[\s\S]*?<\/div>/,()=>'');
 html=rx(html,/<div class="section-title"><h2>지식화 중인 업무 · C-2041<\/h2>[\s\S]*?(?=<div class="grid">)/,()=>'');
 html=rx(html,/<section class="panel"><div class="panel-head"><h2>처리 완료와 지식 완성은 다릅니다<\/h2>[\s\S]*?<\/section>/,()=>'');
 html=html.replace('<div class="grid"><section class="panel"><div class="panel-head"><h2>다음 행동이 필요한 업무</h2>','<div class="grid one"><section class="panel"><div class="panel-head"><h2>다음 행동이 필요한 업무</h2>');
 const cand=state.candidateOpen?`<div class="work-row"><span class="bullet amber"></span><div><strong>지식화 후보 · PDF 미리보기 깨짐 유사 문의 3건 (야간 집계)</strong><p>C-2044 · C-2031 · C-2019 · 근거 지식 없이 반복 · 자동으로 초안을 만들지 않습니다</p></div><div class="actions">${btn('대표 Case로 지식화',"promoteCandidate()",'small')}${btn('넘기기',"dismissCandidate()",'small text')}</div></div>`
  :state.candidatePromoted?`<div class="work-row"><span class="bullet"></span><div><strong>지식화 후보 · C-2044를 대표 Case로 승격했습니다</strong><p>나머지 2건은 지식화 검토 때 함께 볼 후보로 남습니다 · 공식 근거로 자동 등록하지 않습니다(검증된 Case만 사람이 골라 포함)</p></div>${btn('Case 열기',"openCase('C-2044')",'small')}</div>`:'';
 if(cand)html=rx(html,/(<h2>다음 행동이 필요한 업무<\/h2>[\s\S]*?)(<\/section>)/,(m,a,b)=>a+cand+b);
 return html}
const distributionPageV21=distributionPage;
distributionPage=function(){const h=distributionPageV21();
 /* 검토자: 예외 처리 안내는 아래 ‘대상 부서 직접 지정’ 옆 4줄 판 하나만 */
 if(state.role==='reviewer')return rx(h,/<div class="grid">(<section class="panel"><div class="panel-head"><h2>K-2041 v1 · 대상 부서<\/h2>[\s\S]*?<\/section>)<section class="panel"><div class="panel-head"><h2>예외 처리<\/h2>[\s\S]*?<\/section>/,(m,a)=>`<div class="grid one">${a}`);
 /* 담당자: 통계 타일·하단 안내 없이 ‘우리 부서에 도착한 지식’만 */
 return rx(rx(h,/<div class="stat-grid">(?:<div class="stat">[\s\S]*?<\/strong><\/div>)*<\/div>/,()=>''),/<div class="scope">수신 확인은[\s\S]*?<\/div>$/,()=>'')};

const renderV21=render;
render=function(){renderV21();const f=document.querySelector('.footer span:last-child');if(f)f.textContent='시안 · VOC 접수·분류 · 관련 부서 협업 · 모든 기록·수치·AI 응답은 가상입니다';
 const d=document.querySelector('.demo strong');if(d)d.textContent='DESIGN PREVIEW'};

/* ================= 문서함(S14) · 사내 문서 관리 (MYBOX 같은 단순 문서 관리) =================
   폴더는 보호 자원: 폴더 생성 시 소유 부서+등급의 부서 기본 템플릿 → 하위 폴더·문서는 폴더 권한 상속 → 문서별 예외(사유 필수).
   문서 등급이 폴더 등급보다 높으면 더 좁은 쪽(등급 템플릿)을 쓴다. 권한 없는 문서·폴더는 목록·건수에 나타나지 않는다. 데이터는 모두 가상. */
{const ent=Object.entries(pages);Object.keys(pages).forEach(k=>delete pages[k]);
 ent.forEach(([k,v])=>{if(k==='knowledge')pages.docbox=['▤','문서함','지식'];pages[k]=v});}
['handler','reviewer','viewer','concurrent','opsmember','devmember','admin'].forEach(r=>{const m=roles[r].menus;if(m.includes('docbox'))return;const i=m.indexOf('knowledge');i<0?m.push('docbox'):m.splice(i,0,'docbox')});

const DEPT_H={'고객지원팀':42,'기술지원팀':28,'운영팀':35,'품질관리팀':14,'개발팀':54,'검색개발팀':17,'영업팀':69};
const DEPT_P={'고객지원팀':'고객경험본부','기술지원팀':'고객경험본부','운영팀':'운영본부','품질관리팀':'운영본부','개발팀':'개발본부','검색개발팀':'개발본부','영업팀':'영업본부'};
const ALL_DEPTS=Object.keys(DEPT_H);
const GRADE=[['공개',''],['사내','blue'],['대외비','amber'],['제한','red']];
const gradeChip=g=>`<span class="gchip g${g}">${g} ${GRADE[g][0]}</span>`;
/* 부서 기본 템플릿(policy_templates) · 등급별 열람 범위와 인원 */
function tmpl(dept,g){return [{who:'전사 전체'},{who:`${dept} 전체 + 상위 ${DEPT_P[dept]} 관리자`},{who:`${dept} 팀장·문서 관리자 + 지정 담당자`},{who:'지정 인원만(등록자 포함)'}][g]}
const tmplName=(dept,g)=>`${dept} 기본 · ${GRADE[g][0]}(${g})`;
const UPLOADER={handler:'김도윤',reviewer:'박서연',viewer:'최지우',concurrent:'김도윤',opsmember:'오민준',devmember:'한유진'};
const meName=()=>UPLOADER[state.role]||myName();
const upDepts=()=>state.role==='handler'?['고객지원팀','운영팀']:[myDept()];           // DOCUMENT_UPLOAD 범위(본직·겸직)
const canManageDocs=()=>['handler','reviewer'].includes(state.role);                // DOCUMENT_MANAGE(고객지원팀)

function seedDocs(){
 const F=(id,dept,name,grade,parent=null,extra=[])=>({id,dept,name,grade,parent,extra,rules:[]});
 const folders=[F('f-cs-man','고객지원팀','운영 매뉴얼',1),F('f-cs-scr','고객지원팀','상담 스크립트',1,'f-cs-man'),F('f-cs-inc','고객지원팀','장애 대응',2),F('f-cs-guide','고객지원팀','고객 안내문',0),
  F('f-ops-man','운영팀','운영 매뉴얼',1),F('f-ops-log','운영팀','점검 기록',2),
  F('f-dev-rel','개발팀','릴리스 노트',0),F('f-dev-inc','개발팀','장애 보고서',2),F('f-dev-des','개발팀','설계 문서',1),
  F('f-sl-pro','영업팀','제안서',1),F('f-sl-guide','영업팀','고객 안내 자료',0)];
 /* 직접 추가한 권한 규칙(iam.aces) 예시 · V15 권한 설정 패널 */
 const R=(id,kind,target,level,effect,from,to,scope,reason,by,at,x={})=>Object.assign({id,kind,target,sub:false,level,effect,from,to,scope,reason,by,at,status:'active'},x);
 folders[0].rules=[R('r-s1','person','정민수',3,'allow','','','','매뉴얼 개정 책임 · 관리 수준 위임','김도윤','09.29 14:05'),R('r-s2','person','윤하늘',1,'allow','2025-10-01','2025-12-31','','품질 점검(4분기) 기간 매뉴얼 검수','박서연','10.01 09:30')];
 folders[1].rules=[R('r-s3','person','박서연',3,'allow','','','','스크립트 개정 담당 · 관리 수준 위임','김도윤','09.12 10:02'),R('r-s4','group','외주 상담 파트너',0,'allow','','','','스크립트 열람만 허용(원본 반출 금지)','김도윤','09.20 16:40'),R('r-s5','group','장애 대응 TF',0,'allow','','','프로젝트 · C-2041 장애 대응','C-2041 대응 스크립트 공유','김도윤','10.07 11:40',{status:'pending'})];
 const V=(v,at,by,note,size)=>({v,at,by,note,size});
 const D=(id,title,ext,owner,folder,grade,st,by,at,vers,extra=[],extraWhy='')=>({id,title,ext,owner,folder,grade,st,by,at,vers,extra,extraWhy,pending:'',kreq:false,archived:false,rules:[]});
 const docs=[
  D('D-012','고객 응대 표준 운영 매뉴얼','docx','고객지원팀','f-cs-man',1,'파싱 완료','김도윤','10.06 17:20',[V('v4','10.06 17:20','김도윤','환불 문의 응대 절차 추가','1.8MB'),V('v3','09.12 10:02','박서연','상담 종료 멘트 수정','1.7MB'),V('v2','08.01 15:40','김도윤','채널별 응대 시간 기준 반영','1.6MB'),V('v1','06.03 09:15','김도윤','최초 등록','1.5MB')]),
  D('D-019','VOC 에스컬레이션 기준표','xlsx','고객지원팀','f-cs-scr',1,'파싱 완료','박서연','10.02 13:44',[V('v2','10.02 13:44','박서연','긴급도 기준에 응답 지연 시간 추가','220KB'),V('v1','07.15 11:30','박서연','최초 등록','190KB')]),
  D('D-033','2025.08 장애 공지 스캔본','pdf','고객지원팀','f-cs-inc',2,'OCR 필요','박서연','09.29 16:05',[V('v1','09.29 16:05','박서연','종이 공지 스캔','6.2MB')]),
  D('D-052','C-2041 검색 지연 대응 기록','docx','고객지원팀','f-cs-inc',1,'파싱 완료','김도윤','10.07 11:05',[V('v1','10.07 11:05','김도윤','협업 회신·조치 결과 정리','340KB')]),
  D('D-041','비밀번호 초기화 고객 안내문','hwp','고객지원팀','f-cs-guide',0,'파싱 완료','박서연','09.30 09:20',[V('v3','09.30 09:20','박서연','재발송 간격 10분으로 수정','96KB'),V('v2','08.22 14:00','박서연','스팸함 확인 단계 추가','92KB'),V('v1','05.11 10:10','김도윤','최초 등록','88KB')]),
  D('D-047','PDF 표 깨짐 임시 우회 안내문','docx','고객지원팀','f-cs-guide',1,'대기','김도윤','10.07 10:48',[V('v1','10.07 10:48','김도윤','C-2044 우회 안내 초안','64KB')]),
  D('D-038','검색 서비스 운영 매뉴얼','pdf','운영팀','f-ops-man',1,'파싱 완료','오민준','10.03 18:12',[V('v3','10.03 18:12','오민준','4.2 초기 점검 절차 개정','2.4MB'),V('v2','08.19 11:25','오민준','캐시 점검 항목 추가','2.2MB'),V('v1','04.02 09:00','오민준','최초 등록','2.0MB')],['고객지원팀','개발팀','검색개발팀'],'검색 장애 1차 대응 부서 공유(정책 승인 10.03)'),
  D('D-035','캐시 설정 변경 이력','xlsx','운영팀','f-ops-log',2,'파싱 완료','오민준','10.05 08:40',[V('v5','10.05 08:40','오민준','5.2 배포 후 TTL 변경 기록','410KB'),V('v4','09.28 19:02','오민준','주간 점검 반영','400KB')]),
  D('D-044','PDF 렌더러 표 처리 옵션 설명서','pdf','개발팀','f-dev-des',1,'파싱 완료','한유진','09.25 15:30',[V('v2','09.25 15:30','한유진','5.2 셀 병합 옵션 기본값 변경 반영','1.1MB'),V('v1','06.17 10:00','한유진','최초 등록','1.0MB')],['고객지원팀'],'고객 문의 대응용 공유(정책 승인 09.26)'),
  D('D-051','검색 클러스터 장애 보고서(내부)','docx','개발팀','f-dev-inc',3,'파싱 완료','한유진','09.18 21:10',[V('v1','09.18 21:10','한유진','장애 원인·캐시 설정값(부록 B)','780KB')]),
  D('D-056','색인 파이프라인 설계서','docx','개발팀','f-dev-des',2,'파싱 완료','한유진','09.09 14:22',[V('v2','09.09 14:22','한유진','증분 색인 단계 추가','1.5MB'),V('v1','05.30 10:40','한유진','최초 등록','1.3MB')]),
  D('D-060','문서 뷰어 5.2 릴리스 노트','pdf','개발팀','f-dev-rel',0,'파싱 완료','한유진','09.30 18:00',[V('v1','09.30 18:00','한유진','5.2 정식 배포','540KB')]),
  D('D-063','하반기 제안서 표준안','pptx','영업팀','f-sl-pro',1,'파싱 완료','최지우','09.21 11:11',[V('v1','09.21 11:11','최지우','최초 등록','4.8MB')]),
  D('D-065','검색 개선 일정 고객 안내 자료','pdf','영업팀','f-sl-guide',0,'대기','최지우','10.07 09:58',[V('v1','10.07 09:58','최지우','5.3 일정 안내','300KB')])];
 return{folders,docs}}
Object.assign(state,{db:seedDocs(),dview:'my',dsel:null,dq:'',dseq:0});

const fd=id=>state.db.folders.find(f=>f.id===id);
const dd=id=>state.db.docs.find(d=>d.id===id);
const fChain=f=>f?[f,...fChain(fd(f.parent))]:[];
const fLine=f=>!f?[]:f.broken?[f]:[f,...fLine(fd(f.parent))];           // 상속선: 상속을 끊은 폴더에서 멈춘다
const fGrade=f=>{const l=fLine(f);return l[l.length-1].grade};          // 하위 폴더는 부모 권한 상속(같은 acl)
const fExtra=f=>fLine(f).flatMap(x=>x.extra);
const fPath=f=>fChain(f).reverse().map(x=>x.name).join(' › ');
const fDesc=id=>state.db.folders.filter(f=>f.parent===id).flatMap(f=>[f.id,...fDesc(f.id)]);
/* 권한 계산: 폴더 상속 + 문서 예외. 문서 등급이 더 높으면 좁은 쪽(등급 템플릿) */
function acl(o){const isF=!o.owner,dept=isF?o.dept:o.owner,f=isF?o:fd(o.folder),br=!!o.broken;
 const fg=f?fGrade(f):null,g=isF?fg:br?o.grade:Math.max(o.grade,fg??o.grade),narrowed=!isF&&!br&&f&&o.grade>fg;
 const inh=f&&!narrowed&&(isF||!br)?fExtra(f):[],own=isF?[]:o.extra;
 const extra=g===0?[]:[...new Set([...inh,...own])].filter(x=>x!==dept);
 const t=tmpl(dept,g);
 return aclEval(o,{dept,g,narrowed,fg,t,extra,depts:g===0?ALL_DEPTS:[dept,...extra],
  src:br?'예외':isF?(o.parent?'상속':'템플릿'):(own.length||o.override)?'예외':f?'폴더 상속':'템플릿'})}
const canReadAcl=d=>{const a=acl(d);return!a.meDeny&&(a.depts.includes(myDept())||a.meAllow||(d.self&&d.by===meName()))};
const canSee=d=>{if(d.archived)return false;if(isAdm())return true;return canReadAcl(d)};
/* 관리자가 READ 없는 문서는 제목 없이 관리 정보(ID·종류·보안 등급)만 본다 */
const docHidden=d=>isAdm()&&!canReadAcl(d);
const docName=d=>docHidden(d)?`열람 권한 없는 문서 · ${d.id} · 문서 · ${GRADE[acl(d).g][0]}`:d.title;   // 관리자는 권한 관리를 위해 목록·권한 정보를 보지만, 원본은 문서 권한이 있어야 연다
const canSeeF=f=>isAdm()||acl(f).depts.includes(myDept())||f.dept===myDept();
const SRC_TAG={'폴더 상속':'blue','상속':'blue','예외':'amber','템플릿':''};
const srcTag=s=>tag(s,SRC_TAG[s]);
const stTagD=s=>s==='대기'?`<span class="tag amber"><span class="spin" aria-hidden="true"></span>대기</span>`:tag(s,s==='파싱 완료'?'green':s==='OCR 필요'?'purple':'');
const FI={pdf:'#c2410c',docx:'#2563eb',hwp:'#0891b2',xlsx:'#15803d',pptx:'#b45309',png:'#7c3aed',jpg:'#7c3aed'};
const fileIcon=e=>`<span class="fi" style="--c:${FI[e]||'#64788c'}">${(e||'?').toUpperCase().slice(0,4)}</span>`;
function viewDocs(){const v=state.dview,vis=state.db.docs.filter(canSee);let ds;
 if(v==='my')ds=vis.filter(d=>isAdm()||d.owner===myDept());
 else if(v==='mine')ds=vis.filter(d=>d.by===meName());
 else if(v==='shared')ds=vis.filter(d=>d.owner!==myDept());
 else if(v==='recent')ds=[...vis].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,6);
 else{const id=v.slice(2),ids=[id,...fDesc(id)];ds=vis.filter(d=>ids.includes(d.folder))}
 const q=state.dq.trim();if(q)ds=ds.filter(d=>(!docHidden(d)&&d.title.includes(q))||d.id.includes(q.toUpperCase()));
 return v==='recent'?ds:[...ds].sort((a,b)=>b.at.localeCompare(a.at))}
const curFolder=()=>state.dview.startsWith('f:')?fd(state.dview.slice(2)):null;
const VIEW_NAME={my:'내 부서 문서',mine:'내가 올린 문서',shared:'공유받은 문서',recent:'최근 문서'};

function docboxPage(){
 if(state.dview.startsWith('f:')){const f=curFolder();if(!f||(f.dept!==myDept()&&!isAdm()))state.dview='my'}
 if(state.dsel&&(!dd(state.dsel)||!canSee(dd(state.dsel))))state.dsel=null;
 const node=(f,lv)=>{const on=state.dview==='f:'+f.id;
  return `<button class="dt-node ${on?'on':''}" style="--lv:${lv}" onclick="docView('f:${f.id}')" ${on?'aria-current="true"':''}><span class="fic" aria-hidden="true"></span><span class="dt-name">${esc(f.name)}</span></button>`+state.db.folders.filter(x=>x.parent===f.id).map(x=>node(x,lv+1)).join('')};
 const myRoots=state.db.folders.filter(f=>(isAdm()||f.dept===myDept())&&!f.parent);
 const item=(v,label,n,ic)=>`<button class="dt-node top ${state.dview===v?'on':''}" onclick="docView('${v}')"><span class="dt-ic" aria-hidden="true">${ic}</span><span class="dt-name">${label}</span></button>`;
 const tree=`<nav class="panel dtree" aria-label="문서함 폴더"><div class="dt-sec">${isAdm()?'전체 부서 문서 · 관리자':'내 부서 문서'}</div>${item('my',isAdm()?'전체 부서':myDept(),null,'▣')}${isAdm()?[...new Set(myRoots.map(f=>f.dept))].map(dp=>`<div class="dt-dept">${dp}</div>`+myRoots.filter(f=>f.dept===dp).map(f=>node(f,1)).join('')).join(''):myRoots.map(f=>node(f,1)).join('')}<div class="dt-sec">보기</div>${item('mine','내가 올린 문서',null,'↑')}${item('shared','공유받은 문서',null,'⇄')}${item('recent','최근 문서',null,'◷')}</nav>`;
 const f=curFolder(),ds=viewDocs();
 const crumb=f?`${f.dept} › ${fPath(f)}`:state.dview==='my'?(isAdm()?'전체 부서':myDept()):VIEW_NAME[state.dview];
 const own=!(f||(state.dview==='my'&&!isAdm())||state.dview==='mine'); // 부서 폴더 화면에서는 소유 부서가 모두 같다
 const rows=ds.map(d=>{const a=acl(d),fo=fd(d.folder);return `<tr class="${d.id===state.dsel?'active':''}" onclick="docSel('${d.id}')" tabindex="0" onkeydown="if(event.key==='Enter')docSel('${d.id}')"><td><div class="dname">${fileIcon(d.ext)}<div><span class="dn-line"><b class="${docHidden(d)?'muted doc-hidden':''}">${esc(docName(d))}</b>${a.src==='예외'?tag('예외','amber'):''}${d.pending||pendOf(d).length?tag('승인 대기','purple'):''}</span><span class="mono muted">${d.id}${fo&&(state.dview==='shared'||state.dview==='recent'||state.dview==='mine'||state.dview==='my')?` · ${esc(fPath(fo))}`:''}</span></div></div></td><td class="mono nowrap">${d.vers[0].v}</td>${own?`<td class="nowrap">${d.owner}</td>`:''}<td>${gradeChip(a.g)}</td><td>${stTagD(d.st)}</td><td class="mono nowrap">${d.at}</td></tr>`}).join('');
 const list=`<section class="panel"><div class="panel-head dlist-head"><div><h2>${esc(crumb)}</h2><span class="small muted">${ds.length}건 · 내가 볼 수 있는 문서만 표시</span></div><form class="dsearch" onsubmit="event.preventDefault();state.dq=$('dq').value;render()"><input id="dq" value="${esc(state.dq)}" placeholder="문서 이름·ID 검색" aria-label="문서 검색"><button class="btn small" type="submit">검색</button></form></div><div class="table-wrap"><table class="d-table"><thead><tr><th>이름</th><th>버전</th>${own?'<th>소유 부서</th>':''}<th>보안 등급</th><th>처리 상태</th><th>수정 시각</th></tr></thead><tbody>${rows||`<tr><td colspan="${own?6:5}" class="d-empty">${state.dq?'검색 결과가 없습니다.':'이 폴더에 문서가 없습니다. [업로드]로 문서를 올리세요.'}</td></tr>`}</tbody></table></div></section>`;
 const det=state.dsel?docDetail(dd(state.dsel)):f?folderDetail(f):'';
 const dis=(ok,why)=>ok?'':`disabled title="${why}"`;
 const acts=`<div class="head-acts"><button class="btn primary" onclick="openUpload()" ${dis(!isAdm(),'관리자는 문서를 올리지 않습니다 · 권한 관리만 합니다')}>↑ 업로드</button><button class="btn" onclick="openNewFolder()" ${dis(canManageDocs(),'DOCUMENT_MANAGE 권한 필요(부서 문서 관리자)')}>＋ 새 폴더</button></div>`;
 return head('S14 / DOCUMENTS','문서함','문서를 폴더로 정리하고 버전과 권한을 관리합니다.',acts)
  +`<div class="dbox">${tree}<div class="dmain">${list}${det}</div></div>`}
function docView(v){state.dview=v;state.dsel=null;state.dq='';render()}
function docSel(id){state.dsel=state.dsel===id?null:id;render();const e=document.querySelector('.ddetail');if(e&&state.dsel)e.scrollIntoView({block:'nearest',behavior:'smooth'})}
const usedBy=d=>{const out=[];
 Object.values(state.cases).forEach(c=>{if(!visibleCases().includes(c))return;crefsOf(c.id).filter(u=>u.ref===d.id).forEach(u=>out.push({k:'Case',id:c.id,t:c.title,u:u.usage,by:`${u.dept} · ${u.by}`}))});
 const KN={'D-038':['K-2041','K-0917'],'D-051':['K-0917'],'D-041':['K-1022'],'D-012':['K-1022']};
 (KN[d.id]||[]).filter(k=>refOk(k)&&canReadRef(k)).forEach(k=>out.push({k:'지식',id:REFS[k].ver,t:REFS[k].title,u:'근거',by:REFS[k].owner}));
 return out};
function docDetail(d){const a=acl(d),fo=fd(d.folder),mine=d.owner===myDept()||upDepts().includes(d.owner),admOnly=isAdm()&&!canReadAcl(d);
 const dis=(ok,why)=>ok?'':`disabled title="${why}"`;
 const vers=d.vers.map((v,i)=>`<li class="${i===0?'cur':''}"><div><b class="mono">${v.v}</b>${i===0?tag('현재','green'):tag('보존')}<span class="small muted">${v.at} · ${v.by} · ${v.size}</span></div>${admOnly?'':`<p class="small">${esc(v.note)}</p>`}</li>`).join('');
 return `<section class="panel ddetail"><div class="panel-head"><div class="dname">${fileIcon(d.ext)}<div><h2 class="${admOnly?'doc-hidden':''}">${esc(docName(d))}</h2><span class="mono muted">${d.id} · ${d.vers[0].v} · 등록 ${d.by}</span></div></div><div class="actions">${d.kreq?tag('지식화 검토 요청됨','green'):''}${d.pending?tag(esc(d.pending),'purple'):''}<button class="close" onclick="docSel('${d.id}')" aria-label="상세 닫기">×</button></div></div>${dTabs('doc',d)}${state.dtab==='acl'?aclPanel('doc',d):`
 <div class="panel-body"><div class="dd-grid one">
  <div><h3 class="sub0">버전 목록</h3><ol class="vlist">${vers}</ol><button class="btn small" onclick="openNewVersion('${d.id}')" ${dis(mine,'소유 부서의 DOCUMENT_UPLOAD 권한 필요')}>↑ 새 버전 올리기</button><p class="small muted">이전 버전은 지우지 않고 보존합니다.</p></div>
  ${a.narrowed?`<p class="small muted">${LOCK} 보안 등급 ${GRADE[d.grade][0]} · 폴더 ${GRADE[a.fg][0]}보다 높아 좁은 쪽을 적용합니다.</p>`:''}
 </div><div class="dd-acts"><button class="btn primary small" onclick="docKreq('${d.id}')" ${dis(d.st==='파싱 완료'&&!d.kreq,d.kreq?'이미 요청함':'파싱이 끝난 문서만 요청할 수 있습니다')}>지식화 요청</button><button class="btn small" onclick="openShare('${d.id}')" ${dis(mine,'소유 부서만 요청할 수 있습니다')}>공유 범위 변경 요청</button><button class="btn small" onclick="openMove('doc','${d.id}')" ${dis(mine,'소유 부서만 이동할 수 있습니다')}>이동</button><button class="btn small" onclick="docDownload('${d.id}')" ${admOnly?dis(false,'관리 역할만으로는 원본을 열거나 내려받을 수 없습니다 · 문서 권한 필요'):dis(a.g<3,'제한(3) 등급은 다운로드할 수 없습니다 · 열람만')}>다운로드</button>${admOnly?'<span class="small muted adm-only">관리 역할: 권한 관리용 정보만 표시 · 원본은 문서 권한(보기·다운로드)이 있어야 열립니다</span>':''}<button class="btn small danger" onclick="openDiscard('${d.id}')" ${dis(mine&&canManageDocs(),'DOCUMENT_MANAGE 권한 필요')}>폐기</button></div></div>`}</section>`}
function folderDetail(f){const a=acl(f),ids=[f.id,...fDesc(f.id)],n=state.db.docs.filter(d=>!d.archived&&ids.includes(d.folder)),sub=fDesc(f.id).length;
 const empty=!state.db.docs.some(d=>!d.archived&&d.folder===f.id)&&!sub,mg=canManageDocs()&&f.dept===myDept();
 const dis=(ok,why)=>ok?'':`disabled title="${why}"`;
 const info=[['소유 부서',f.dept],['보안 등급',gradeChip(a.g)],['권한 출처',srcTag(a.src)+` <span class="small muted">${f.broken?'상속 끊김 · 물려받던 규칙을 복사해 직접 관리':f.parent?`상위 폴더 ‘${esc(fd(f.parent).name)}’ 권한 상속`:'폴더 생성 시 부서 기본 템플릿'}</span>`],['적용 규칙',`<b>${ruleFrom(f)}</b> <span class="small muted">· ${tmplName(f.dept,a.g)} → ${a.t.who}${a.extra.length?' + '+a.extra.join('·'):''}</span>${a.g===3?`<div class="small acl-g3n">${g3Note(f.dept)}</div>`:''}`],['상속 중인 문서',`${n.filter(d=>acl(d).src==='폴더 상속').length}건 · 하위 폴더 ${fDesc(f.id).filter(x=>inhChain(fd(x)).includes(f)).length}개${fDesc(f.id).some(x=>!inhChain(fd(x)).includes(f))?` · 상속 끊김 ${fDesc(f.id).filter(x=>!inhChain(fd(x)).includes(f)).length}개(반영 안 됨)`:''}`]];
 return `<section class="panel ddetail"><div class="panel-head"><div class="dname"><span class="fic big" aria-hidden="true"></span><div><h2>${esc(f.name)}</h2><span class="mono muted">${f.dept} › ${esc(fPath(f))}</span></div></div><div class="actions">${f.pending?tag(esc(f.pending),'purple'):''}</div></div>${dTabs('folder',f)}${state.dtab==='acl'?aclPanel('folder',f):`<div class="panel-body"><div class="dd-grid two"><div><h3 class="sub0">폴더 권한 요약</h3><div class="kv one">${info.map(([k,x])=>`<div><span>${k}</span><b>${x}</b></div>`).join('')}</div></div><div><h3 class="sub0">권한이 바뀌면</h3><p class="small">폴더 권한을 바꾸면 상속 중인 문서와 하위 폴더에 함께 반영됩니다(ACL 포인터 교체). 넓히는 변경은 변경 요청 후 정책 승인자의 승인이 필요하고, 좁히는 변경은 바로 반영됩니다. 직접 규칙을 더한 문서는 그 규칙을 유지한 채 함께 반영되고, 상속을 끊은 문서·폴더는 반영되지 않습니다.</p><div class="scope">문서를 이 폴더로 옮기면 이 폴더의 권한을 물려받습니다. 권한이 넓어지는 이동은 승인 후 이동합니다.</div></div></div>
 <div class="dd-acts"><button class="btn small primary" onclick="dTab('acl')">권한 설정</button><button class="btn small" onclick="openFolderAcl('${f.id}')" ${dis(mg,'DOCUMENT_MANAGE 권한 필요')}>보안 등급 변경</button><button class="btn small" onclick="openMove('folder','${f.id}')" ${dis(mg,'DOCUMENT_MANAGE 권한 필요')}>이동</button><button class="btn small danger" onclick="delFolder('${f.id}')" ${dis(mg&&empty,empty?'DOCUMENT_MANAGE 권한 필요':'빈 폴더만 삭제할 수 있습니다')}>삭제</button>${empty?'':'<span class="small muted">빈 폴더만 삭제할 수 있습니다(보관 처리).</span>'}</div></div>`}</section>`}

/* ---------- 파일 선택 영역(이 시안은 파일 이름·형식만 읽고 아무것도 올리지 않음) ---------- */
const dropArea=id=>`<label class="drop" id="${id}" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="event.preventDefault();this.classList.remove('over');pickFile('${id}',event.dataTransfer.files[0])"><input type="file" class="sr" onchange="pickFile('${id}',this.files[0])"><span class="drop-ic" aria-hidden="true">↑</span><b>파일을 끌어 놓거나 클릭해서 선택</b><span class="small muted">PDF·DOCX·HWP·XLSX·PPTX·이미지 · 최대 100MB · 시안에서는 파일 이름·형식만 읽고 업로드하지 않습니다</span><span class="drop-file"></span></label>`;
let picked={};
function pickFile(id,f){if(!f)return;const ext=(f.name.split('.').pop()||'').toLowerCase();picked[id]={name:f.name,ext,type:f.type||'알 수 없음',size:f.size};
 const el=$(id);el.classList.add('has');el.querySelector('.drop-file').innerHTML=`${fileIcon(ext)} <b>${esc(f.name)}</b> <span class="small muted">${esc(f.type||ext)} · ${f.size<1048576?Math.max(1,Math.round(f.size/1024))+'KB':(f.size/1048576).toFixed(1)+'MB'}</span>`;
 const t=$('up-title');if(t&&!t.value)t.value=f.name.replace(/\.[^.]+$/,'');if($('up-error'))$('up-error').textContent=''}
const folderOpts=(dept,sel,excl=[])=>{const out=[];const walk=(p,lv)=>state.db.folders.filter(f=>f.dept===dept&&f.parent===p&&!excl.includes(f.id)).forEach(f=>{out.push(`<option value="${f.id}" ${f.id===sel?'selected':''}>${'　'.repeat(lv)}${esc(f.name)} · ${GRADE[fGrade(f)][0]}</option>`);walk(f.id,lv+1)});walk(null,0);
 return `<option value="" ${!sel?'selected':''}>(부서 최상위 · 폴더 없음)</option>`+out.join('')};
const gradeOpts=g=>GRADE.map((x,i)=>`<option value="${i}" ${i===g?'selected':''}>${i} ${x[0]}</option>`).join('');
function prevBox(dept,g,f){const fg=f?fGrade(f):null,eg=f?Math.max(g,fg):g,t=tmpl(dept,eg),ex=f&&g<=fg&&eg>0?fExtra(f).filter(x=>x!==dept):[];
 return `<div class="vprev"><div class="vp-h">${LOCK} 이 문서의 권한</div><div class="rsum"><span>소유 부서 <b>${dept}</b></span><span>등급 ${gradeChip(eg)}</span><span>출처 <b>${f&&g<=fg?`폴더 ‘${esc(f.name)}’ 상속`:`템플릿 ‘${tmplName(dept,eg)}’`}</b></span></div><div class="small muted">${tmplName(dept,eg)} → ${t.who}${ex.length?' + '+ex.join('·'):''}</div>${eg===3?`<div class="small acl-g3n">${g3Note(dept)}</div>`:''}${f&&g>fg?`<div class="vp-warn">문서 등급(${GRADE[g][0]} ${g})이 폴더 등급(${GRADE[fg][0]} ${fg})보다 높아 폴더 권한을 그대로 쓰지 않고 더 좁은 쪽(${GRADE[g][0]} 템플릿)을 적용합니다.</div>`:''}${!f?'<div class="small muted">폴더 없이 올리면 소유 부서 기본 템플릿을 적용합니다.</div>':''}</div>`}

/* ---------- 업로드 ---------- */
function openUpload(){picked={};const f=curFolder(),dept=f&&upDepts().includes(f.dept)?f.dept:upDepts()[0];
 modal('문서 업로드',`<div class="up-grid">${dropArea('up-drop')}
 <label class="field full">제목 <b class="req">*</b><input id="up-title" placeholder="파일을 고르면 파일 이름으로 채워집니다"></label>
 <label class="field">소유 부서<select id="up-dept" onchange="upDeptChange()">${upDepts().map(x=>`<option ${x===dept?'selected':''}>${x}</option>`).join('')}</select></label>
 <label class="field">보안 등급<select id="up-grade" onchange="upPrev()">${gradeOpts(1)}</select></label>
 <label class="field full">폴더<select id="up-folder" onchange="upPrev()">${folderOpts(dept,f&&f.dept===dept?f.id:'')}</select></label>
 <div id="up-prev" class="full"></div>
 <p class="full up-acl">${LOCK} <a href="#" onclick="event.preventDefault();toast('등록한 뒤 문서 상세의 [권한 설정] 탭에서 부서·사람·역할·그룹별로 허용 규칙을 조정합니다.')">업로드 후 권한 설정에서 대상별로 조정할 수 있습니다</a></p>
 <div class="notice amber full">업로드만으로 지식이 되지 않습니다. 지식화는 별도 검토를 거칩니다.</div>
 <div id="up-error" class="error full" role="alert"></div>
 <div class="intake-foot full"><span class="small muted">등록하면 파싱 대기로 시작합니다</span><div class="actions">${btn('취소',"$('modal').close()")}${btn('등록','submitUpload()','primary')}</div></div></div>`,true);upPrev()}
function upDeptChange(){$('up-folder').innerHTML=folderOpts($('up-dept').value,'');upPrev()}
function upPrev(){const f=fd($('up-folder').value);$('up-prev').innerHTML=prevBox($('up-dept').value,+$('up-grade').value,f)}
function submitUpload(){const p=picked['up-drop'],title=$('up-title').value.trim();
 if(!p||!title){$('up-error').textContent=!p?'올릴 파일을 선택해주세요.':'제목을 입력해주세요.';return}
 state.dseq++;const id=`D-${String(70+state.dseq).padStart(3,'0')}`,folder=$('up-folder').value||null,owner=$('up-dept').value,img=/^(png|jpe?g|tiff?|bmp)$/.test(p.ext);
 const sz=p.size<1048576?Math.max(1,Math.round(p.size/1024))+'KB':(p.size/1048576).toFixed(1)+'MB';
 state.db.docs.push({id,title,ext:p.ext,owner,folder,grade:+$('up-grade').value,st:'대기',by:meName(),at:clock(),vers:[{v:'v1',at:clock(),by:meName(),note:'최초 등록',size:sz}],extra:[],extraWhy:'',pending:'',kreq:false,archived:false,self:true});
 state.dview=folder&&fd(folder).dept===myDept()?'f:'+folder:'mine';state.dq='';state.dsel=id;$('modal').close();render();
 toast(`${id} 등록 · 파싱 대기 · 권한: ${ruleFrom(dd(id))} · 지식화는 별도 요청`);
 setTimeout(()=>{dd(id).st=img?'OCR 필요':'파싱 완료';if(state.page==='docbox')render()},1800)}
function openNewVersion(id){picked={};const d=dd(id);
 modal('새 버전 올리기',`<p class="small"><b>${esc(d.title)}</b> · 현재 ${d.vers[0].v} → <b>v${d.vers.length+1}</b>. 이전 버전은 보존되고, 권한은 그대로 유지됩니다.</p>${dropArea('nv-drop')}<label class="field">변경 내용<input id="nv-note" placeholder="예: 4.3 절차 추가"></label><div id="up-error" class="error" role="alert"></div><div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}${btn('새 버전 등록',`submitVersion('${id}')`,'primary')}</div>`)}
function submitVersion(id){const p=picked['nv-drop'],note=$('nv-note').value.trim(),d=dd(id);if(!p||!note){$('up-error').textContent=!p?'파일을 선택해주세요.':'변경 내용을 입력해주세요.';return}
 d.vers.unshift({v:'v'+(d.vers.length+1),at:clock(),by:meName(),note,size:p.size<1048576?Math.max(1,Math.round(p.size/1024))+'KB':(p.size/1048576).toFixed(1)+'MB'});d.at=clock();d.st='대기';$('modal').close();render();toast(`${id} ${d.vers[0].v} 등록 · 이전 버전 보존 · 파싱 대기`);
 setTimeout(()=>{d.st='파싱 완료';if(state.page==='docbox')render()},1800)}

/* ---------- 새 폴더 · 폴더 권한 변경 · 삭제 ---------- */
/* 새 폴더의 권한: 시작 규칙(최상위 = 부서 템플릿, 하위 = 상위 폴더) + 만들 때 직접 추가하는 규칙.
   [대상 추가] 대화상자를 'nf' 모드로 재사용해 규칙을 이 화면으로 돌려받는다. 만들면 폴더는 바로 생기고, 넓히는 규칙만 승인 대기 */
let NF=null;
const nfObj=()=>({id:'nf',name:NF.name.trim()||'새 폴더',dept:NF.dept,grade:NF.grade,parent:NF.parent,extra:NF.extra||[],rules:NF.rules,broken:NF.broken?{by:meName(),at:clock(),why:''}:null});
const nfBase=()=>Object.assign(nfObj(),{rules:[],extra:[],broken:null});        // 시작 권한(직접 규칙 없음)
const nfKey=()=>[NF.dept,NF.parent,NF.grade].join('|');
function nfSnap(){if(!NF||!$('nf-name'))return;const p=$('nf-parent').value||null;Object.assign(NF,{name:$('nf-name').value,dept:$('nf-dept').value,parent:p,grade:p?fGrade(fd(p)):+$('nf-grade').value,reason:$('nf-reason').value})}
/* 시작 권한보다 넓히는가: 사람이 늘거나 권한 수준이 올라가면 승인 대상 */
function nfWiden(c){const s=nfBase();return ruleDiff(liveRules(s),withO(s,{rules:[c]},()=>liveRules(s))).dir==='wide'}
/* 조정한 시작 규칙: 원래 규칙(orig)과 견줘 넓히는가 */
function nfAdjWiden(r){const o=nfObj();return ruleDiff(withO(o,{rules:NF.rules.map(x=>x===r?r.orig:x)},()=>liveRules(o)),liveRules(o)).dir==='wide'}
const nfRuleWiden=r=>r.orig?nfAdjWiden(r):r.copied?false:nfWiden(r);
const nfDirect=()=>NF.rules.filter(r=>!r.copied||r.orig);
const nfChanged=()=>nfDirect().length+(NF.broken&&NF.removed?NF.removed.length:0);   // 사유가 필요한 변경 수(빼기 포함)                  // 사유가 필요한 직접 규칙(추가·빼기·조정)
function openNewFolder(){if(!canManageDocs()){toast('DOCUMENT_MANAGE 권한이 필요합니다.');return}const f=curFolder();
 NF={name:'',dept:f?f.dept:myDept(),grade:1,parent:f?f.id:null,rules:[],reason:''};nfOpen()}
function nfOpen(){const s=NF;
 modal('새 폴더',`<div class="up-grid"><label class="field full">폴더 이름 <b class="req">*</b><input id="nf-name" placeholder="예: 환불 응대"></label>
 <label class="field">소유 부서<select id="nf-dept" onchange="$('nf-parent').innerHTML=folderOpts(this.value,'');nfPrev()">${upDepts().map(x=>`<option ${x===s.dept?'selected':''}>${x}</option>`).join('')}</select></label>
 <label class="field">보안 등급<select id="nf-grade" onchange="nfPrev()">${gradeOpts(s.grade)}</select></label>
 <label class="field full">상위 폴더<select id="nf-parent" onchange="nfPrev()">${folderOpts(s.dept,s.parent||'')}</select></label><div id="nf-prev" class="full"></div>
 <section id="nf-acl" class="nf-acl full" aria-label="권한"></section>
 <label class="field full" id="nf-reasonw">사유 <b class="req">*</b> <span class="small muted">직접 추가한 규칙이 있을 때 필수</span><input id="nf-reason" placeholder="예: 환불 응대 TF가 폴더를 함께 씀" oninput="$('nf-error').textContent=''"></label>
 <div id="nf-error" class="error full" role="alert"></div>
 <div class="intake-foot full"><span class="small muted">폴더는 바로 만들어지고 시작 규칙으로 권한을 시작합니다 · 시작 권한보다 넓히는 규칙만 승인 후 적용합니다.</span><div class="actions">${btn('취소',"$('modal').close()")}${btn('만들기','submitFolder()','primary')}</div></div></div>`,true);
 $('nf-name').value=s.name;$('nf-reason').value=s.reason;nfPrev()}
function nfPrev(){nfSnap();$('nf-error').textContent='';const gs=$('nf-grade');gs.disabled=!!NF.parent;gs.value=NF.grade;
 let reset=false;if(NF.broken&&NF.bkey!==nfKey()){NF.broken=false;NF.extra=[];NF.rules=NF.rules.filter(r=>!r.copied);NF.removed=[];reset=true}   // 시작 규칙이 바뀌면 조정한 복사본은 버린다
 const o=nfObj(),can=canAcl(o),drop=!can?NF.rules.length:0;if(drop){NF.rules=o.rules=[];NF.broken=false;NF.removed=[];NF.extra=o.extra=[];o.broken=null}
 const p=NF.parent?fd(NF.parent):null,dept=NF.dept,{a,rows}=aclRows(o),g=a.g,t=tmpl(dept,g),ex=p&&g>0?fExtra(p).filter(x=>x!==dept):[];
 const dr=nfDirect(),k=nfChanged(),pn=dr.filter(nfRuleWiden).length,df=k?ruleDiff(liveRules(nfBase()),liveRules(o)):null;
 $('nf-prev').innerHTML=`<div class="vprev"><div class="vp-h">${LOCK} 이 폴더의 권한</div><div class="rsum"><span>소유 부서 <b>${dept}</b></span><span>등급 ${gradeChip(g)}</span><span>출처 <b>${p?`상위 폴더 ‘${esc(p.name)}’ 상속`:`템플릿 ‘${tmplName(dept,g)}’`}</b></span></div><div class="small muted">${tmplName(dept,g)} → ${t.who}${ex.length?' + '+ex.join('·'):''}</div>${k?chgBox(df,df.dir==='wide'?`넓히는 규칙 ${pn}건은 만든 뒤 승인 후 적용 · 나머지는 바로 적용`:'만들 때 바로 적용'):''}<div class="small muted">이 폴더에 넣는 문서는 이 권한을 물려받습니다.${p?' 하위 폴더는 상위 폴더보다 낮은 등급으로 만들 수 없습니다(상위 등급 그대로).':''}</div>${g===3?`<div class="small acl-g3n">${g3Note(dept)}</div>`:''}</div>`;
 const start=NF.broken?`상속 끊김 · 시작 규칙을 복사해 직접 관리 <span class="muted">· 조정 ${NF.rules.filter(r=>r.orig).length}건${NF.removed&&NF.removed.length?` · 빼기 ${NF.removed.length}건(${NF.removed.map(esc).join('·')})`:''} · 이후 상위 폴더 변경은 반영되지 않습니다</span>`:`${p?`상위 폴더 ‘${esc(p.name)}’에서 물려받음`:`템플릿 ‘${tmplName(dept,g)}’에서 시작`} <span class="muted">· 만들면 아래 규칙으로 시작합니다${can?' · [조정]·[빼기]로 바꿀 수 있습니다':''}</span>`;
 $('nf-acl').innerHTML=`<div class="acl-bar"><h3 class="sub0">권한 <span class="muted">${rows.length}</span></h3>${can?`<button type="button" class="btn small primary" onclick="nfAdd()">＋ 대상 추가</button>`:''}</div>
 <p class="small nf-start">${LOCK} ${start}</p>${reset?'<p class="small vp-warn nf-ro">상위 폴더·부서·등급이 바뀌어 조정한 시작 규칙을 되돌렸습니다.</p>':''}${can?'':`<p class="small muted nf-ro">규칙 추가는 ${dept} 담당자(문서 관리 책임)와 관리자만 할 수 있습니다 · 시작 규칙만 적용합니다.${drop?` 추가했던 규칙 ${drop}건은 뺐습니다.`:''}</p>`}
 <div class="table-wrap"><table class="acl-table"><thead><tr><th>대상</th><th>권한 수준</th><th>출처</th><th>작업</th></tr></thead><tbody>${rows.map(x=>aclRow('nf',o,x,a,can)).join('')}</tbody></table></div>`;
 $('nf-reasonw').style.display=k?'':'none'}
function nfAdd(){nfSnap();openAclAdd('nf','nf')}
function nfAdj(rid){nfSnap();openAclAdd('nf','nf',rid,1)}
/* [빼기]: 시작 규칙을 복사해 상속을 끊고 이 허용 규칙만 지운다(좁히는 변경 → 만들 때 바로 적용) */
function nfOut(rid){nfSnap();const o=nfObj(),x=aclRows(o).rows.find(x=>x.inh&&x.r.id===rid);if(!x)return;const bp=outPatch(o,rid,'');
 if(!ownerOk(o,{broken:bp.broken,rules:bp.rules,extra:bp.extra})){$('nf-error').textContent=ownerMsg(o);return}
 NF.broken=true;NF.bkey=nfKey();NF.extra=bp.extra;NF.rules=bp.rules;NF.removed=[...(NF.removed||[]),x.r.target];nfPrev()}
function nfDel(id){nfSnap();const rules=NF.rules.filter(r=>r.id!==id);if(!ownerOk(nfObj(),{rules})){$('nf-error').textContent=ownerMsg(nfObj());return}NF.rules=rules;nfPrev()}
function submitFolder(){nfSnap();const name=NF.name.trim(),dept=NF.dept,parent=NF.parent,err=s=>{$('nf-error').textContent=s};
 if(!name)return err('폴더 이름을 입력해주세요.');
 if(state.db.folders.some(f=>f.dept===dept&&f.parent===parent&&f.name===name))return err('같은 위치에 같은 이름의 폴더가 있습니다.');
 const can=canAcl(nfObj()),rs=can?NF.rules:[],why=NF.reason.trim();
 if(can&&nfChanged()&&!why)return err('직접 추가·조정·빼기한 규칙이 있으면 사유를 입력해주세요.');
 if(!ownerOk(nfObj(),{rules:rs}))return err(ownerMsg(nfObj()));
 const F=['kind','target','sub','level','effect','from','to','scope'],pick=r=>Object.fromEntries(F.map(f=>[f,r[f]]));
 const rules=rs.map(r=>{const w=nfRuleWiden(r),x=Object.assign({},r,{id:'r'+(++state.dseq),reason:r.copied?`상속 끊기 · ${why}`:why,at:clock(),status:'active'});delete x.orig;
  if(r.orig&&w)Object.assign(x,pick(r.orig),{pend:Object.assign(pick(r),{reason:why,by:meName(),at:clock()})});   // 넓히는 조정: 원래 규칙 유지 + 변경 요청
  else if(!r.copied&&w)x.status='pending';return x});
 const pn=rules.filter(r=>r.status==='pending'||r.pend).length,br=can&&NF.broken,nd=can?nfDirect().length:0,nrm=br&&NF.removed?NF.removed.length:0;
 const id='f-n'+(++state.dseq);state.db.folders.push({id,dept,name,grade:NF.grade,parent,extra:br?NF.extra||[]:[],rules,broken:br?{by:meName(),at:clock(),why}:null,grade0:NF.grade,copiedExtra:br?NF.extra||[]:null});NF=null;$('modal').close();
 if(dept===myDept())state.dview='f:'+id;state.dsel=null;render();
 toast(pn?`폴더를 만들었습니다. 넓히는 규칙 ${pn}건은 승인 후 적용됩니다.`:`폴더 ‘${name}’를 만들었습니다 · ${tmplName(dept,fGrade(fd(id)))} 적용${nd?` · 직접 규칙 ${nd}건 바로 적용`:''}${br?` · 상속 끊김(시작 규칙 복사${nrm?` · 빼기 ${nrm}건`:''})`:''}`)}
function openFolderAcl(id){const f=fd(id),a=acl(f);if(f.parent&&!f.broken){toast('하위 폴더는 상위 폴더 권한을 상속합니다. 상위 폴더에서 변경하거나, 이동으로 상속을 끊으세요.');return}
 modal('폴더 보안 등급 변경',`<p class="small"><b>${esc(f.name)}</b> · 현재 ${tmplName(f.dept,a.g)} · ${ruleFrom(f)}</p><div class="up-grid"><label class="field">새 보안 등급<select id="fa-grade" onchange="faPrev('${id}')">${gradeOpts(a.g)}</select></label><p class="small muted">대상(부서·사람·역할·그룹)별 허용 규칙은 권한 설정 탭에서 바꿉니다.</p><label class="field full">사유 <b class="req">*</b><input id="fa-reason" placeholder="예: 장애 대응 자료를 대외비로 상향"></label><div id="fa-prev" class="full"></div><div id="fa-error" class="error full" role="alert"></div><div class="actions full" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}${btn('요청','submitFolderAcl(\''+id+'\')','primary')}</div></div>`,true);faPrev(id)}
function faCalc(id){const f=fd(id),g=+$('fa-grade').value,d=diffObj(f,Object.assign({},f,{grade:g}));
 const docs=state.db.docs.filter(x=>!x.archived&&[id,...fDesc(id)].includes(x.folder));return{f,g,d,docs}}
function faPrev(id){const c=faCalc(id);$('fa-prev').innerHTML=`<div class="vprev"><div class="vp-h">영향 미리보기</div><div class="ad-stats"><span>영향 받는 하위 문서 <b>${c.docs.length}건</b> · 하위 폴더 ${fDesc(id).length}개</span></div>${chgBox(c.d,c.d.dir==='wide'?'넓히는 변경 → 권한 설정(S10)에서 정책 승인자 승인 후 반영':c.d.dir==='narrow'?'좁히는 변경 → 바로 반영':'바로 반영 · 볼 수 있는 범위 그대로')}</div>`}
function submitFolderAcl(id){const c=faCalc(id),r=$('fa-reason').value.trim();if(!r){$('fa-error').textContent='사유를 입력해주세요.';return}
 if(c.d.dir==='wide'){c.f.pending=`권한 확대 승인 대기 · 등급 ${GRADE[c.g][0]}`;$('modal').close();render();toast('권한 설정(S10)으로 승인 요청을 보냈습니다. 승인 전까지 권한은 그대로입니다.');return}
 c.f.grade=c.g;if(c.ex)c.f.extra.push(c.ex);$('modal').close();render();toast(`폴더 권한을 바로 반영했습니다 · 상속 중인 문서 ${c.docs.length}건에 함께 적용`)}
function delFolder(id){const f=fd(id);if(state.db.docs.some(d=>!d.archived&&d.folder===id)||fDesc(id).length){toast('빈 폴더만 삭제할 수 있습니다.');return}
 state.db.folders=state.db.folders.filter(x=>x.id!==id);state.dview=f.parent?'f:'+f.parent:'my';render();toast(`폴더 ‘${f.name}’를 삭제(보관)했습니다.`)}

/* ---------- 이동: 새 폴더 권한 상속 · 넓어지면 승인 후 이동 ---------- */
function moveTargets(kind,o){const out=[];const excl=kind==='folder'?[o.id,...fDesc(o.id)]:[];
 const depts=[...new Set([myDept(),...upDepts(),...state.db.folders.filter(canSeeF).map(f=>f.dept)])];
 depts.forEach(dp=>{const walk=(p,lv)=>state.db.folders.filter(f=>f.dept===dp&&f.parent===p&&!excl.includes(f.id)&&(dp===myDept()||upDepts().includes(dp)||canSeeF(f))).forEach(f=>{out.push({id:f.id,dept:dp,lv,f});walk(f.id,lv+1)});walk(null,0)});return out}
function openMove(kind,id){const o=kind==='doc'?dd(id):fd(id),cur=kind==='doc'?o.folder:o.parent,dept=kind==='doc'?o.owner:o.dept;
 const ts=moveTargets(kind,o);let last='';
 const opts=ts.map(t=>{const h=t.dept!==last?`<div class="mv-dept">${t.dept}${t.dept!==dept?' <span class="small muted">· 다른 부서</span>':''}</div>`:'';last=t.dept;
  return h+`<label class="mv-opt" style="--lv:${t.lv}"><input type="radio" name="mv" value="${t.id}" ${t.id===cur?'checked disabled':''} onchange="mvPrev('${kind}','${id}')"><span class="fic" aria-hidden="true"></span>${esc(t.f.name)} ${gradeChip(fGrade(t.f))}${t.id===cur?' <span class="small muted">(현재 위치)</span>':''}</label>`}).join('');
 modal(`${kind==='doc'?'문서':'폴더'} 이동`,`<p class="small"><b>${esc(kind==='doc'?o.title:o.name)}</b> · 현재 ${cur?esc(fPath(fd(cur))):'부서 최상위'} · ${ruleFrom(o)}</p><div class="mv-list">${kind==='folder'?`<label class="mv-opt" style="--lv:0"><input type="radio" name="mv" value="" ${!cur?'checked disabled':''} onchange="mvPrev('${kind}','${id}')">${dept} 최상위</label>`:''}${opts}</div>${kind==='doc'&&o.extra.length?`<label class="check"><input id="mv-keep" type="checkbox" checked onchange="mvPrev('${kind}','${id}')"> 문서 예외(+${o.extra.join('·')}) 유지</label>`:''}<div id="mv-prev"><p class="small muted">옮길 폴더를 고르세요. 옮기면 새 폴더의 권한을 물려받습니다.</p></div><div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}<button id="mv-go" class="btn primary" disabled onclick="doMove('${kind}','${id}')">이동</button></div>`,true)}
function mvCalc(kind,id){const o=kind==='doc'?dd(id):fd(id),r=document.querySelector('input[name=mv]:checked:not(:disabled)');if(!r)return null;const to=r.value||null,tf=fd(to);
 let dept=kind==='doc'?o.owner:o.dept;const nd=tf?tf.dept:dept;
 let sim;if(kind==='doc'){const keep=$('mv-keep')?$('mv-keep').checked:true;sim=Object.assign({},o,{folder:to,owner:nd,extra:keep?o.extra:[]})}
 else sim=Object.assign({},o,{parent:to,dept:nd,grade:to?o.grade:fGrade(o)});
 return{o,to,tf,d:diffObj(o,sim),owner:nd!==dept,nd,ob:!ownerOk(sim),sim}}
function mvPrev(kind,id){const c=mvCalc(kind,id);$('mv-go').disabled=!c||c.ob;if(!c)return;const w=c.d.dir==='wide';
 const msg=c.ob?`<div class="vp-warn red ad-owner" role="alert"><b>${ownerMsg(c.sim)}</b> — 옮길 폴더의 규칙에 소유 부서 보기 권한이 없습니다. 다른 폴더를 고르세요.</div>`:c.owner?`<div class="vp-warn"><b>소유 부서 변경 · 승인 필요</b> — ${kind==='doc'?c.o.owner:c.o.dept} → ${c.nd}. 이전 소유 부서와 정책 관리자 승인 후 이동합니다.</div>`:'';
 $('mv-prev').innerHTML=`<div class="vprev"><div class="vp-h">${LOCK} 이동 후 권한</div><div class="small muted">${c.tf?`폴더 ‘${esc(c.tf.name)}’ 권한 상속`:'부서 최상위 · 템플릿'}</div>${chgBox(c.d,c.owner?'소유 부서 변경 · 승인 후 이동':w?'공유 확대 → 권한 설정(S10)에서 승인되면 옮깁니다':'바로 이동합니다')}${msg}</div>`;
 $('mv-go').textContent=c.owner||w?'승인 요청':'이동'}
function doMove(kind,id){const c=mvCalc(kind,id);if(!c||c.ob)return;const w=c.d.dir==='wide',dest=c.tf?c.tf.name:'부서 최상위';
 if(c.owner||w){c.o.pending=c.owner?`소유 부서 변경 승인 대기 → ${c.nd}`:`이동 승인 대기 → ${dest} (넓어짐)`;$('modal').close();render();toast(c.owner?'소유 부서 변경 요청을 보냈습니다 · 이전 소유 부서 + 정책 관리자 승인 후 이동합니다.':`공유 확대(넓어짐)라 승인 후 ‘${dest}’로 이동합니다.`);return}
 if(kind==='doc'){c.o.folder=c.to;if($('mv-keep')&&!$('mv-keep').checked)c.o.extra=[]}else{if(!c.to)c.o.grade=fGrade(c.o);c.o.parent=c.to}
 $('modal').close();render();toast(`‘${dest}’로 이동했습니다 · ${DIRL[c.d.dir]}`)}

/* ---------- 공유 범위 변경(문서 예외) · 지식화 요청 · 다운로드 · 폐기 ---------- */
function openShare(id){const d=dd(id),a=acl(d);
 modal('공유 범위 변경 요청',`<p class="small"><b>${esc(d.title)}</b> · ${ruleFrom(d)} (${srcTag(a.src)})</p><fieldset class="track-pick"><legend>변경</legend><label class="on"><input type="radio" name="sh-dir" value="add" checked onchange="shPrev('${id}')">넓히기 <small>부서 추가 · 문서 예외</small></label><label><input type="radio" name="sh-dir" value="rm" onchange="shPrev('${id}')" ${d.extra.length?'':'disabled'}>좁히기 <small>예외 해제</small></label></fieldset><label class="field">부서<select id="sh-dept" onchange="shPrev('${id}')"></select></label><label class="field">사유 <b class="req">*</b><input id="sh-reason" placeholder="예: 기술지원팀 1차 응대에 필요"></label><div id="sh-prev"></div><div id="sh-error" class="error" role="alert"></div><div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}${btn('요청 보내기',`submitShare('${id}')`,'primary')}</div>`);shPrev(id,true)}
function shPrev(id,init){const d=dd(id),dir=document.querySelector('input[name=sh-dir]:checked').value,a=acl(d);
 document.querySelectorAll('.track-pick label').forEach(l=>l.classList.toggle('on',l.querySelector('input').checked));
 const opts=dir==='add'?ALL_DEPTS.filter(x=>!a.depts.includes(x)):d.extra;const s=$('sh-dept'),keep=s.value;s.innerHTML=opts.map(x=>`<option ${x===keep?'selected':''}>${x}</option>`).join('');
 const x=s.value,df=x?diffObj(d,Object.assign({},d,{extra:dir==='add'?[...d.extra,x]:d.extra.filter(y=>y!==x)})):null;
 $('sh-prev').innerHTML=!x?'<p class="small muted">변경할 부서가 없습니다.</p>':`<div class="vprev">${chgBox(df,dir==='add'?'넓히는 변경 → 권한 설정(S10 객체 예외)에서 정책 승인자 승인 후 반영 · 그 전까지 권한 그대로':'좁히는 변경 → 소유 부서 확인 후 바로 반영')}</div>`}
function submitShare(id){const d=dd(id),dir=document.querySelector('input[name=sh-dir]:checked').value,x=$('sh-dept').value,r=$('sh-reason').value.trim();
 if(!x||!r){$('sh-error').textContent=!x?'부서를 고르세요.':'사유를 입력해주세요.';return}
 if(dir==='add'){d.pending=`공유 확대 승인 대기 · +${x}`;$('modal').close();render();toast('권한 설정(S10)으로 공유 확대 승인을 요청했습니다.');return}
 d.extra=d.extra.filter(y=>y!==x);$('modal').close();render();toast(`${x} 예외를 해제했습니다 · 좁아짐 · 바로 적용`)}
function docKreq(id){const d=dd(id);d.kreq=true;render();toast(`${id} 지식화 검토를 요청했습니다 · 문서는 그대로이고 검토를 거쳐야 지식이 됩니다.`)}
function docDownload(id){const a=acl(dd(id));if(isAdm()&&!canReadAcl(dd(id))){toast('관리 역할만으로는 원본을 내려받을 수 없습니다 · 문서 권한 필요');return}if(a.g>=3){toast('제한(3) 등급은 다운로드할 수 없습니다.');return}toast(a.g===2?`${id} 다운로드 · 대외비 워터마크 포함 · 감사 기록에 남습니다.`:`${id} 다운로드 · 열람 기록에 남습니다(시안: 파일 없음).`)}
function openDiscard(id){const d=dd(id),u=usedBy(d).length;
 modal('문서 폐기',`<p class="small"><b>${esc(d.title)}</b> (${d.id})를 폐기합니다. 목록·검색에서 빠지고 원본은 보존 정책에 따라 보관합니다.${u?` 이 문서를 근거로 쓴 지식·Case ${u}건은 출처 회수 규칙을 따릅니다.`:''}</p><label class="field">폐기 사유 <b class="req">*</b><input id="dc-reason" placeholder="예: 새 매뉴얼로 대체"></label><div id="dc-error" class="error" role="alert"></div><div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}${btn('폐기',`doDiscard('${id}')`,'danger')}</div>`)}
function doDiscard(id){const r=$('dc-reason').value.trim();if(!r){$('dc-error').textContent='폐기 사유를 입력해주세요.';return}dd(id).archived=true;state.dsel=null;$('modal').close();render();toast(`${id}를 폐기했습니다 · 사유 기록 · 원본은 보존 정책에 따라 보관`)}

/* ================= 권한 설정 패널(V15) · 폴더·문서 상세 =================
   규칙 한 줄 = iam.aces(대상 principal · 권한 수준 → 행위 코드 묶음 · ALLOW/DENY · valid_from~expires_at · 범위).
   물려받은 규칙(템플릿·상위 폴더)은 읽기 전용, 직접 추가한 규칙만 편집·삭제. 넓히는 변경은 승인 대기, 좁히는 변경은 즉시.
   같은 패널을 권한 설정(S10) 객체 예외 화면에서도 쓴다. 데이터는 모두 가상. */
const isAdm=()=>state.role==='admin';
const LV=[['보기','목록·검색·본문 열람','READ · SEARCH'],['다운로드','보기 + 원본 파일 내려받기 (대외비 워터마크 · 제한 불가)','+ DOWNLOAD (대외비 워터마크 · 제한 불가)'],['편집','다운로드 + 새 버전 올리기','+ WRITE · DOCUMENT_UPLOAD'],['관리','편집 + 이동·삭제·권한 변경','+ DOCUMENT_MANAGE · MANAGE_ACL']];
const PK={dept:'부서',person:'사람',role:'역할',group:'그룹'};
const PICON={dept:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 14V3.2L8 1.8v12.2M8 6h5.5v8M1.5 14h13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M4.4 5.2h1.6M4.4 8h1.6M4.4 10.8h1.6M10 8.8h1.6M10 11.4h1.6" stroke="currentColor" stroke-width="1.3"/></svg>',
 person:'<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5.2" r="2.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.6 14.2c.5-3 2.7-4.6 5.4-4.6s4.9 1.6 5.4 4.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
 role:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l5.2 2v4.1c0 3.2-2.2 5.6-5.2 6.7-3-1.1-5.2-3.5-5.2-6.7V3.6z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.7 8l1.6 1.6 3-3.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 group:'<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5.6" cy="5.6" r="2.3" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="11.2" cy="6.4" r="1.9" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M1.4 13.6c.4-2.5 2.1-3.8 4.2-3.8s3.8 1.3 4.2 3.8M10 9.9c2.2-.4 4.2.8 4.6 3.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'};
const picon=k=>`<span class="pic pic-${k}" title="${PK[k]}">${PICON[k]}</span>`;
/* 대상 표본(iam.principals) · cl = 열람 등급(clearance, 이 등급까지 열 수 있음) */
const DEPT_CL={'고객지원팀':2,'기술지원팀':2,'운영팀':2,'품질관리팀':1,'개발팀':2,'검색개발팀':2,'영업팀':1,'정보보호팀':3};
const XDEPT_H=Object.assign({'정보보호팀':9},DEPT_H);
const HQS=[...new Set(Object.values(DEPT_P))];
const hqTeams=h=>ALL_DEPTS.filter(t=>DEPT_P[t]===h);
const PEOPLE=[['김도윤','고객지원팀',2],['박서연','고객지원팀',2],['이수현','고객지원팀',2],['정민수','고객지원팀',1],['강민재','기술지원팀',2],['장예린','기술지원팀',1],['오민준','운영팀',2],['배수아','운영팀',1],['윤하늘','품질관리팀',1],['한유진','개발팀',3],['서지안','검색개발팀',2],['최지우','영업팀',1],['문태오','영업팀',0],['정하린','정보보호팀',3]].map(([name,dept,cl])=>({name,dept,cl}));
const each=n=>Object.fromEntries(ALL_DEPTS.map(d=>[d,n]));
const PGROUPS={role:[{name:'전사 팀장',m:each(1),cl:2},{name:'문서 관리자(전사)',m:each(1),cl:3},{name:'정책 승인자',m:{'정보보호팀':2},cl:3},{name:'품질 감사',m:{'품질관리팀':4},cl:2},{name:'상담 교육 강사',m:{'고객지원팀':3,'기술지원팀':2},cl:1}],
 group:[{name:'장애 대응 TF',m:{'고객지원팀':3,'운영팀':3,'개발팀':2,'검색개발팀':2},cl:2},{name:'검색 5.3 프로젝트',m:{'개발팀':6,'검색개발팀':5,'운영팀':2,'영업팀':2},cl:2},{name:'신입 상담사 교육',m:{'고객지원팀':8,'기술지원팀':4},cl:1},{name:'외주 상담 파트너',m:{'고객지원팀':5},cl:1}]};
const SCOPES=['고객 · 한빛은행','고객 · 미래보험','고객 · 서울시 교육청','프로젝트 · 검색 5.3 개선','프로젝트 · C-2041 장애 대응'];
const person=n=>PEOPLE.find(p=>p.name===n);
const pgrp=(k,n)=>(PGROUPS[k]||[]).find(x=>x.name===n);

function aclTargets(k){
 if(k==='dept')return[...ALL_DEPTS.map(t=>({name:t,meta:DEPT_P[t],cl:DEPT_CL[t]})),{name:'정보보호팀',meta:'관리 조직',cl:3},...HQS.map(h=>({name:h,meta:`본부 · 소속 ${hqTeams(h).join('·')}`,cl:2,hq:true}))];
 if(k==='person')return PEOPLE.map(p=>({name:p.name,meta:`${p.dept}`,cl:p.cl}));
 return PGROUPS[k].map(x=>({name:x.name,meta:Object.keys(x.m).length>4?'전 부서':Object.keys(x.m).join('·'),cl:x.cl}))}
const tgtCl=(k,n)=>{const t=aclTargets(k).find(x=>x.name===n);return t?t.cl:3};
/* 부서 대상 → [단위, 인원, 열람 등급]. 본부는 관리자 3명, 하위 포함이면 소속 팀까지 */
const deptUnits=r=>HQS.includes(r.target)?[[r.target,0,2],...(r.sub?hqTeams(r.target).map(t=>[t,0,DEPT_CL[t]]):[])]:[[r.target,0,DEPT_CL[r.target]??2]];
const covers=(row,c)=>{const units=deptUnits(row).map(u=>u[0]);
 if(row.kind==='group'&&row.target==='전사 전체')return true;
 if(row.kind===c.kind&&row.target===c.target)return true;
 if(row.kind==='dept'&&c.kind==='person'){const p=person(c.target);return!!p&&units.includes(p.dept)}
 if(row.kind==='dept'&&c.kind==='dept')return deptUnits(c).every(u=>units.includes(u[0]));
 return false};
/* 부서 기본 템플릿이 만드는 규칙(읽기 전용 표시) */
function tmplRows(dept,g){const T=(kind,target,level,sub=false)=>({kind,target,level,sub,effect:'allow',from:'',to:'',scope:''});
 return[[T('group','전사 전체',1),T('dept',dept,2,true),T('role',`${dept} 문서 관리자`,3)],
  [T('dept',dept,1,true),T('role',`${DEPT_P[dept]} 관리자`,0),T('role',`${dept} 문서 관리자`,3)],
  [T('dept',dept,0,true),T('role',`${dept} 팀장`,1),T('group',`${dept} 지정 담당자`,0),T('role',`${dept} 문서 관리자`,3)],
  [T('dept',dept,0,true),T('group','지정 인원(등록자 포함)',0),T('role',`${dept} 문서 관리자`,3)]][g]}


/* 물려받는 폴더(위→아래). 문서 등급이 폴더보다 높으면 폴더 규칙을 물려받지 않는다(좁은 쪽) */
function inhChain(o){if(o.broken)return[];if(!o.owner)return fLine(fd(o.parent)).reverse();const f=fd(o.folder);if(!f||o.grade>fGrade(f))return[];return fLine(f).reverse()}
const isOn=r=>r.status==='active';
/* 규칙 평가: 허용을 먼저 더하고 제외를 나중에 뺀다(제외 우선). 등급보다 열람 등급이 낮은 대상은 허용해도 늘지 않는다 */
/* 열람 범위(목록·검색 노출용): 허용 부서를 더하고 제외를 뺀다(제외 우선). 인원은 세지 않는다 */
function aclEval(o,b){const rules=[...inhChain(o).flatMap(f=>(f.rules||[]).filter(isOn)),...(o.rules||[]).filter(isOn)];
 const S=new Set(b.g===0?ALL_DEPTS:[...(b.g===1?[b.dept]:[]),...b.extra]),denied=new Set(),ok=cl=>b.g===0||cl>=b.g;let meAllow=false,meDeny=false;
 rules.filter(r=>r.effect==='allow').forEach(r=>{
  if(r.kind==='person'){const p=person(r.target);if(p&&ok(p.cl)&&p.name===meName())meAllow=true}
  else if(b.g>0&&r.kind==='dept')deptUnits(r).forEach(([u,,cl])=>{if(ok(cl))S.add(u)})});
 rules.filter(r=>r.effect==='deny'&&r.level===0).forEach(r=>{
  if(r.kind==='dept')deptUnits(r).forEach(([u])=>{S.delete(u);denied.add(u)});
  else if(r.kind==='person'&&r.target===meName())meDeny=true});
 const depts=(b.g===0?ALL_DEPTS:[...new Set([b.dept,...S])]).filter(x=>!denied.has(x)&&XDEPT_H[x]!=null);
 return Object.assign(b,{depts,meAllow,meDeny})}
const pendOf=o=>[...(o.rules||[]).filter(r=>r.status==='pending'||r.pend||r.pendDel),...(o.relinkPend?[o.relinkPend]:[])];

/* ---------- 변경 방향: 인원을 세지 않고 규칙을 비교한다 ----------
   넓어짐 = 허용 추가 · 수준 상향 · 제외 삭제/완화 · 만료 연장/삭제 · 범위 확대 · 하위 포함 · 등급 낮춤 → 승인 후 적용
   좁아짐 = 그 반대만 있을 때 → 바로 적용 · 변화 없음 = 규칙이 같음 */
const rkey=r=>r.kind+'|'+r.target;
const liveRules=o=>aclRows(o).rows.filter(x=>x.r.status!=='pending').map(x=>x.r);
const inDeptRole=(row,c)=>row.kind==='dept'&&(c.kind==='role'||c.kind==='group')&&deptUnits(row).some(u=>c.target.startsWith(u[0]+' '));
const covBy=(row,c)=>covers(row,c)||inDeptRole(row,c);
function ruleDiff(B,A,gb,ga){const al=L=>L.filter(r=>r.effect==='allow'),dn=L=>L.filter(r=>r.effect==='deny');
 const lv=(L,c)=>Math.max(-1,...al(L).filter(r=>covBy(r,c)).map(r=>r.level)),dlv=(L,c)=>Math.min(9,...dn(L).filter(r=>rkey(r)===rkey(c)).map(r=>r.level));
 const add=[],rm=[],ex=[],unex=[],chg=[];let wide=false,narrow=false;
 al(A).forEach(r=>{if(r.level>lv(B,r)){add.push(r);wide=true;return}const o=al(B).find(x=>rkey(x)===rkey(r));if(!o)return;const w=[];
  if(o.to&&(!r.to||r.to>o.to))w.push(r.to?'기간 연장':'만료 삭제');if(o.scope&&o.scope!==r.scope)w.push('범위 확대');if(r.sub&&!o.sub)w.push('하위 포함');if(o.from&&(!r.from||r.from<o.from))w.push('시작 앞당김');
  if(w.length){wide=true;chg.push([r,w.join('·')])}});
 al(B).forEach(r=>{const a=lv(A,r);if(r.level>a){rm.push(Object.assign({},r,{now:a}));narrow=true;return}const n=al(A).find(x=>rkey(x)===rkey(r));if(!n)return;const w=[];
  if(n.to&&(!r.to||n.to<r.to))w.push('기간 단축');if(n.scope&&n.scope!==r.scope)w.push('범위 한정');if(r.sub&&!n.sub)w.push('하위 포함 해제');
  if(w.length){narrow=true;chg.push([n,w.join('·')])}});
 dn(A).forEach(r=>{if(r.level<dlv(B,r)){ex.push(r);narrow=true}});
 dn(B).forEach(r=>{if(r.level<dlv(A,r)){unex.push(r);wide=true}});
 if(gb!=null&&ga!=null&&ga!==gb){if(ga<gb)wide=true;else narrow=true}
 return{dir:wide?'wide':narrow?'narrow':'same',add,rm,ex,unex,chg,gb,ga}}
const diffPatch=(o,patch)=>ruleDiff(liveRules(o),withO(o,patch,()=>liveRules(o)),acl(o).g,withO(o,patch,()=>acl(o).g));
const diffObj=(o,sim)=>ruleDiff(liveRules(o),liveRules(sim),acl(o).g,acl(sim).g);
function diffList(d){const uq=a=>{const m=new Map();a.forEach(r=>m.set(rkey(r)+'|'+r.level,r));return[...m.values()]},nm=r=>esc(r.target),parts=[];
 if(d.ga!=null&&d.gb!==d.ga)parts.push(`등급: ${GRADE[d.gb][0]} → ${GRADE[d.ga][0]}`);
 if(d.add.length)parts.push('추가: '+uq(d.add).map(r=>`${nm(r)} ${LV[r.level][0]}`).join(', '));
 if(d.unex.length)parts.push('제외 해제: '+uq(d.unex).map(nm).join(', '));
 if(d.chg.length)parts.push('변경: '+d.chg.map(([r,w])=>`${nm(r)} ${w}`).join(', '));
 if(d.ex.length)parts.push('제외: '+uq(d.ex).map(r=>`${nm(r)}${r.level>0?` ${LV[r.level][0]} 이상`:''}`).join(', '));
 const lo=d.rm.filter(r=>r.now>=0),gone=d.rm.filter(r=>r.now<0);
 if(lo.length)parts.push('하향: '+uq(lo).map(r=>`${nm(r)} ${LV[r.level][0]} → ${LV[r.now][0]}`).join(', '));
 if(gone.length)parts.push('삭제: '+uq(gone).map(nm).join(', '));
 return parts.join(' · ')}
const DIRL={wide:'넓어짐',narrow:'좁아짐',same:'변화 없음'},DIRN={wide:'승인 후 적용',narrow:'바로 적용',same:'바로 적용 · 볼 수 있는 범위 그대로'};
const dirBadge=dir=>`<span class="dirb ${dir}">${DIRL[dir]}</span>`;
function chgBox(d,note,extra=''){const l=diffList(d);return `<div class="chg"><div class="chg-h">${dirBadge(d.dir)}<span class="chg-note">${note??DIRN[d.dir]}</span></div>${l?`<div class="chg-list">${l}</div>`:''}${extra}<div class="ai-sync small">검색·AI 답변 반영: ${d.dir==='wide'?'승인 즉시':'저장 즉시'}</div></div>`}   // 권한은 원장에서 바로 조인 → 색인 작업 없이 다음 검색·답변부터
/* 사람 수 대신 보여 주는 권한 요약: 소유 부서 · 등급 · 출처(템플릿/상위 폴더) */
function ruleFrom(o){const a=acl(o),isF=!o.owner,f=isF?(o.parent?fd(o.parent):null):fd(o.folder);
 return o.broken?'상속 끊김 · 직접 관리':isF?(f?`상위 폴더 ‘${esc(f.name)}’`:`템플릿 ‘${tmplName(a.dept,a.g)}’`):(f&&!a.narrowed?`폴더 ‘${esc(f.name)}’`:`템플릿 ‘${tmplName(a.dept,a.g)}’`)}
const g3Note=dept=>`제한(3): 소유 부서(${dept}) 규칙은 유지되지만, 실제로는 열람 등급 3인 사람만 봅니다.`;
/* 권한 관리 권한(MANAGE_ACL): 관리자, 또는 그 폴더·문서 소유 부서의 담당자(부서 문서 관리 책임) */
const ownerOf=o=>o.owner||o.dept;
const canAcl=o=>isAdm()||(state.role==='handler'&&ownerOf(o)===myDept());
const aclObj=(k,id)=>k==='nf'?nfObj():k==='folder'?fd(id):dd(id);
/* 객체를 잠시 바꿔 계산하고 되돌린다(시뮬레이션) */
function withO(o,patch,fn){const old=Object.keys(patch).map(k=>[k,o[k]]);Object.assign(o,patch);try{return fn()}finally{old.forEach(([k,v])=>o[k]=v)}}
/* 소유 부서는 항상 최소 보기: 소유 부서를 덮는 허용 규칙이 남아 있고, 소유 부서 제외 규칙이 없어야 한다(부서 안의 개인 제외는 가능) */
const ownerMsg=o=>`소유 부서(${ownerOf(o)})는 최소 보기 권한을 가져야 합니다`;
function ownerOk(o,patch){return withO(o,patch||{},()=>{const own=ownerOf(o),rows=aclRows(o).rows,hit=r=>r.kind==='dept'&&deptUnits(r).some(u=>u[0]===own),on=r=>r.status!=='pending';
 return rows.some(x=>x.r.effect==='allow'&&on(x.r)&&hit(x.r))&&!rows.some(x=>x.r.effect==='deny'&&on(x.r)&&hit(x.r))})}
/* 상속 끊기: 물려받은 규칙(템플릿·상위 폴더)을 모두 직접 규칙으로 복사한다. 복사만 하므로 권한은 그대로 */
const cpId=(o,rid)=>'c'+o.id+'.'+rid;
function breakPatch(o,why){const a=acl(o),inh=aclRows(o).rows.filter(x=>x.inh),ex=[],rules=[];
 inh.forEach(x=>{const r=x.r;if(r.id.startsWith('x:')){if(!(o.extra||[]).includes(r.target))ex.push(r.target);return}
  rules.push({id:cpId(o,r.id),kind:r.kind,target:r.target,sub:!!r.sub,level:r.level,effect:r.effect,from:r.from||'',to:r.to||'',scope:r.scope||'',status:'active',tp:x.tp,copied:x.src,reason:`상속 끊기 · ${why||''}`,by:meName(),at:clock()})});
 return{broken:{by:meName(),at:clock(),why:why||''},grade0:o.grade,grade:a.g,rules:[...(o.rules||[]),...rules],extra:[...(o.extra||[]),...ex],copiedExtra:ex}}
const relinkPatch=o=>({broken:null,grade:o.grade0??o.grade,rules:(o.rules||[]).filter(r=>!r.copied),extra:(o.extra||[]).filter(x=>!(o.copiedExtra||[]).includes(x)),copiedExtra:null,relinkPend:null});

const ymd=s=>s?s.slice(5).replace('-','.'):'';
const period=r=>!r.from&&!r.to?(r.effect==='deny'?'상시 · 만료 없음':'상시'):`${r.from?ymd(r.from):'지금'} ~ ${r.to?ymd(r.to):''}`;
const lvChip=(l,deny)=>`<span class="lv lv${l}${deny?' deny':''}">${LV[l][0]}${deny&&l<3?' 이상':''}</span>`;
/* 목록 행: 템플릿 → 상위 폴더 → 직접 */
function aclRows(o){const a=acl(o),isF=!o.owner,rows=[];
 const tsrc=`템플릿 ‘${tmplName(a.dept,a.g)}’`+(a.narrowed?' (문서 등급이 폴더보다 높아 좁은 쪽)':'');
 if(!o.broken)tmplRows(a.dept,a.g).forEach((r,i)=>rows.push({r:Object.assign({id:'t'+i,status:'active'},r),inh:true,tp:i,src:tsrc}));
 inhChain(o).forEach(f=>{const s=`${isF?'상위 폴더':'폴더'} ‘${f.name}’`;
  if(a.g>0)f.extra.filter(x=>x!==a.dept).forEach(x=>rows.push({r:{id:'x:'+x,kind:'dept',target:x,level:0,effect:'allow',from:'',to:'',scope:''},inh:true,src:s}));
  (f.rules||[]).filter(isOn).forEach(r=>rows.push({r,inh:true,src:s}))});
 if(a.g>0)(o.extra||[]).filter(x=>x!==a.dept).forEach(x=>rows.push({r:{id:'x:'+x,kind:'dept',target:x,level:0,effect:'allow',from:'',to:'',scope:'',status:'active'},legacy:true,src:(o.copiedExtra||[]).includes(x)?'상속 끊기로 복사':`직접 추가 · ${o.extraWhy||'공유 확대 승인'}`}));
 (o.rules||[]).forEach(r=>rows.push({r,src:r.copied?`${r.orig?'조정 · ':''}상속 끊기로 복사 · ${r.copied}`:`직접 추가 · ${r.by||meName()} · ${(r.at||clock()).slice(0,5)}`}));
 return{a,rows}}
function aclRow(k,o,x,a,can){const r=x.r,pend=r.status==='pending',obj=k==='doc'?'문서':'폴더';
 const nfw=k==='nf'&&!x.inh?nfRuleWiden(r):null;
 const out=x.inh&&r.effect==='allow'&&(o.rules||[]).some(d=>d.effect==='deny'&&d.status==='active'&&d.kind===r.kind&&d.target===r.target&&d.level===r.level);
 const who=`<div class="acl-who">${picon(r.kind)}<div><b>${esc(r.target)}</b><span>${PK[r.kind]}${r.kind==='dept'&&r.sub?' <i class="subc">하위 포함</i>':''}</span></div></div>`;
 const st=nfw!=null?(nfw?`${tag('승인 필요','purple')}<span class="small">넓히는 규칙 · 만든 뒤 승인 후 적용</span>`:'<span class="small vp-ok">만들 때 바로 적용</span>'):pend?`${tag('승인 대기','purple')}<span class="small">추가 요청 · 승인 전 미적용</span>`:r.pend?`${tag('승인 대기','purple')}<span class="small">변경 요청: ${LV[r.pend.level][0]} ${r.pend.effect==='deny'?'제외':'허용'}${r.pend.to!==r.to?' · 기간 '+period(r.pend):''}</span>`:r.pendDel?`${tag('승인 대기','purple')}<span class="small">삭제 요청 · 승인 후 해제</span>`:'';
 const src=x.inh?`<span class="acl-src">${LOCK}${esc(x.src)}에서 물려받음</span>${out?`<span class="acl-out">이 ${obj}에서 제외됨</span>`:''}`:`<span class="acl-src own">${esc(x.src)}</span>`;
 const acts=x.inh?(!can?'<span class="small muted">읽기 전용</span>':`${r.id.startsWith('x:')?'':`<button type="button" class="btn small" onclick="${k==='nf'?`nfAdj('${r.id}')`:`openAclAdd('${k}','${o.id}','${r.id}',1)`}">조정</button>`}${r.effect==='allow'&&!out?`<button type="button" class="btn small danger" onclick="${k==='nf'?`nfOut('${r.id}')`:`openAclOut('${k}','${o.id}','${r.id}')`}">빼기</button>`:''}`):k==='nf'?`<button type="button" class="btn small danger" onclick="nfDel('${r.id}')">삭제</button>`:!can?'<span class="small muted">보기만</span>':(pend||r.pend||r.pendDel)?`<button class="btn small" onclick="aclCancel('${k}','${o.id}','${r.id}')">요청 취소</button>`:`<button class="btn small" onclick="openAclAdd('${k}','${o.id}','${r.id}')">편집</button><button class="btn small danger" onclick="openAclDel('${k}','${o.id}','${r.id}')">삭제</button>`;
 return `<tr class="${x.inh?'inh'+(out?' out':''):pend||nfw?'pend':''}"><td>${who}</td><td><div class="lvc">${lvChip(r.level,r.effect==='deny')}${r.effect==='deny'?tag('제외','red'):''}${r.from||r.to?`<span class="tag ptag">${period(r)}</span>`:''}${r.scope?tag(esc(r.scope)):''}</div></td><td class="small">${src}${st?`<div class="acl-st">${st}</div>`:''}</td><td class="nowrap acl-acts">${acts}</td></tr>`}
function aclPanel(k,o){const{a,rows}=aclRows(o),can=canAcl(o),isF=k==='folder',fo=isF?null:fd(o.folder);
 const pn=pendOf(o).length,own=rows.filter(x=>!x.inh).length;
 const why=o.broken?`상속 끊김 · 물려받던 규칙을 복사해 직접 관리 (${o.broken.by} · ${o.broken.at.slice(0,5)}) · 상위 변경은 반영되지 않음`:isF?(o.parent?`상위 폴더 ‘${esc(fd(o.parent).name)}’ 권한 상속`:'폴더 생성 시 부서 기본 템플릿'):a.src==='예외'?'폴더 권한 + 이 문서 예외 규칙(OVERRIDE)':a.src==='폴더 상속'?`폴더 ‘${esc(fo.name)}’ 권한 상속`:'부서 기본 템플릿';
 const inhDocs=isF?state.db.docs.filter(d=>!d.archived&&inhChain(d).includes(o)).length:0;
 const sum=`<div class="acl-sum"><div><span>소유 부서</span><b>${ownerOf(o)}</b></div><div><span>보안 등급</span><b>${gradeChip(a.g)}</b></div><div><span>권한 출처</span><b>${srcTag(a.src)}</b><small>${why}</small></div><div><span>적용 규칙</span><b class="rfrom">${ruleFrom(o)}</b><small>규칙 ${rows.length}줄 · ${pn?`승인 대기 ${pn}건은 아직 반영되지 않음`:own?`직접 규칙 ${own}개 반영`:'물려받은 규칙만 적용'}</small></div></div>${a.g===3?`<p class="small acl-g3">${LOCK} ${g3Note(ownerOf(o))}</p>`:''}`;
 const note=!can?`<div class="notice acl-ro">${LOCK} <b>권한 관리 권한이 없어 보기만 가능합니다.</b> <span>규칙 편집은 소유 부서 담당자(문서 관리 책임)와 관리자만 할 수 있습니다.</span></div>`
  :isF?`<p class="small muted acl-hint">이 폴더에서 바꾼 규칙은 상속 중인 문서 ${inhDocs}건 · 하위 폴더 ${fDesc(o.id).filter(x=>inhChain(fd(x)).includes(o)).length}개에 물려받은 규칙으로 함께 반영됩니다. 직접 규칙을 더한 문서는 그 규칙을 유지한 채 함께 계산하고, 상속을 끊은 문서·폴더는 반영되지 않습니다.</p>`
  :`<p class="small muted acl-hint">이 문서에 규칙을 더하면 이 문서만 예외(OVERRIDE)가 되고 상속은 유지되어, 이후 폴더 변경은 직접 규칙과 함께 계산합니다. 물려받은 규칙을 빼거나 조정하면 상속이 끊겨 폴더 변경이 반영되지 않습니다.</p>`;
 return `<div class="panel-body acl">${sum}
 <div class="acl-bar"><h3 class="sub0">권한 규칙 <span class="muted">${rows.length}</span></h3>${can?`<span class="acl-bact">${o.broken?(o.relinkPend?'':`<button class="btn small" onclick="openAclRelink('${k}','${o.id}')">상속 다시 연결</button>`):rows.some(x=>x.inh)?`<button class="btn small" onclick="openAclBreak('${k}','${o.id}')">상속 끊기</button>`:''}<button class="btn small primary" onclick="openAclAdd('${k}','${o.id}')">＋ 대상 추가</button></span>`:''}</div>${note}${o.relinkPend?`<div class="notice purple acl-relink">${tag('승인 대기','purple')} <b>상속 다시 연결 요청</b> · ${dirBadge('wide')} 넓히는 변경이라 독립 승인 후 다시 연결합니다. 그 전까지 복사한 규칙 그대로. ${can?`<button class="btn small" onclick="aclRelinkCancel('${k}','${o.id}')">요청 취소</button>`:''}</div>`:''}
 <div class="table-wrap"><table class="acl-table"><thead><tr><th>대상</th><th>권한 수준</th><th>출처</th><th>작업</th></tr></thead><tbody>${rows.map(x=>aclRow(k,o,x,a,can)).join('')}</tbody></table></div></div>`}
const dTabs=(k,o)=>{const t=state.dtab||'info',pn=pendOf(o).length;return `<div class="tabs dtabs" role="tablist"><button role="tab" aria-selected="${t!=='acl'}" class="${t!=='acl'?'active':''}" onclick="dTab('info')">개요</button><button role="tab" aria-selected="${t==='acl'}" class="${t==='acl'?'active':''}" onclick="dTab('acl')">${LOCK} 권한 설정${pn?` <span class="cnt">승인 대기 ${pn}</span>`:''}</button></div>`};
function dTab(t){state.dtab=t;render()}

/* ---------- 규칙 찾기 ---------- */
const findRule=(o,rid)=>rid.startsWith('x:')?{r:{id:rid,kind:'dept',target:rid.slice(2),level:0,effect:'allow',from:'',to:'',scope:'',sub:false},legacy:true}:{r:(o.rules||[]).find(r=>r.id===rid)};

/* ---------- [대상 추가] / 규칙 편집 ---------- */
let AD=null;
function openAclAdd(k,id,rid,adj){const o=aclObj(k,id);if(!canAcl(o)){toast('권한 관리 권한이 없어 보기만 가능합니다.');return}
 const ed=rid?(adj?aclRows(o).rows.find(x=>x.inh&&x.r.id===rid):findRule(o,rid)):null,r=ed&&ed.r,a=acl(o);
 AD={k,id,rid:rid||null,adj:!!adj,old:r||null,tk:r?r.kind:'dept',target:r?r.target:'',sub:r?!!r.sub:true,level:r?r.level:0,effect:'allow',from:r?r.from:'',to:r?r.to:'',scope:r?r.scope:'',q:''};
 const nf=k==='nf';
 modal(adj?'물려받은 규칙 조정':rid?'권한 규칙 편집':'대상 추가',`${adj?`<div class="notice amber ad-adj">물려받은 규칙을 조정하면 이 ${k==='doc'?'문서':'폴더'}의 상속이 끊어지고, 물려받은 규칙이 모두 직접 규칙으로 복사된 뒤 이 규칙만 바뀝니다. 이후 상위 폴더 변경은 반영되지 않습니다.</div>`:''}<p class="small ad-obj">${k!=='doc'?'<span class="fic" aria-hidden="true"></span>':fileIcon(o.ext)} <b>${nf?'새 폴더 · ':''}${esc(o.title?docName(o):o.name)}</b> ${gradeChip(a.g)} <span class="muted">· ${ruleFrom(o)}${k==='folder'?' · 상속 중인 문서에 함께 반영':nf?' · 추가한 규칙은 새 폴더 화면으로 돌아갑니다':''}</span></p>
 <div class="ad-grid"><section class="ad-col"><div class="ad-h"><b>1</b> 대상</div>
  <div class="seg ad-kinds" role="tablist" aria-label="대상 종류">${Object.keys(PK).map(x=>`<button type="button" role="tab" data-k="${x}" onclick="adKind('${x}')">${picon(x)}${PK[x]}</button>`).join('')}</div>
  <input id="ad-q" class="org-search ad-q" placeholder="이름·부서로 검색" aria-label="대상 검색" oninput="AD.q=this.value;adList()">
  <div id="ad-list" class="ad-list" role="listbox" aria-label="검색 결과"></div>
  <label class="check ad-sub" id="ad-subw"><input type="checkbox" id="ad-sub" onchange="AD.sub=this.checked;adSync()"> <span><b>하위 포함</b> <span class="small muted">본부를 고르면 소속 팀까지 함께</span></span></label></section>
 <section class="ad-col"><div class="ad-h"><b>2</b> 권한</div>
  <p class="small muted ad-allow" id="ad-effnote">허용 규칙만 저장합니다 · 규칙에 없는 대상은 볼 수 없습니다</p>
  <div class="ad-lab">권한 수준 <span class="small muted">누적 · 위 수준은 아래 수준을 모두 포함</span></div>
  <div class="ad-levels">${LV.map((l,i)=>`<label class="ad-lv"><input type="radio" name="ad-lv" value="${i}" onchange="AD.level=${i};adSync()"><b>${l[0]}</b><span>${l[1]}</span></label>`).join('')}</div>
  <div class="ad-three"><label class="field">시작 <span class="muted">(선택)</span><input type="date" id="ad-from" min="2025-10-07" onchange="AD.from=this.value;adSync()"></label><label class="field">만료 <span class="muted">(선택)</span><input type="date" id="ad-to" min="2025-10-07" onchange="AD.to=this.value;adSync()"></label>
  <label class="field">고객·프로젝트 범위 <span class="muted">(선택)</span><select id="ad-scope" onchange="AD.scope=this.value;adSync()"><option value="">전체</option>${SCOPES.map(s=>`<option>${s}</option>`).join('')}</select></label></div></section></div>
 <div id="ad-prev"></div>
 ${nf?'':`<label class="field ad-reason">사유 <b class="req">*</b><input id="ad-reason" placeholder="예: 장애 대응 TF가 절차를 함께 봐야 함" oninput="$('ad-error').textContent=''"></label>`}<div id="ad-error" class="error" role="alert"></div>
 <div class="intake-foot"><span class="small muted">${nf?'아직 저장하지 않습니다 · 새 폴더 목록에 규칙으로 넣고, 사유는 새 폴더 화면에서 한 번 입력합니다':'저장하면 감사 기록에 남습니다'}</span><div class="actions">${btn('취소',"$('modal').close()")}<button id="ad-save" class="btn primary" onclick="adSave()">저장</button></div></div>`,true);
 $('ad-from').value=AD.from;$('ad-to').value=AD.to;$('ad-scope').value=AD.scope;adList();adSync();
 if(nf)$('modal').onclose=()=>{$('modal').onclose=null;if(NF)nfOpen()}}   // 취소·닫기·추가 모두 새 폴더 화면으로 돌아간다
function adKind(k){if(AD.tk===k)return;AD.tk=k;AD.target='';AD.q='';$('ad-q').value='';adList();adSync()}
function adEff(e){AD.effect=e;if(e==='deny')AD.to='';adSync()}
function adPick(n){AD.target=n;adList();adSync()}
function adList(){const q=AD.q.trim(),ts=aclTargets(AD.tk).filter(t=>!q||t.name.includes(q)||t.meta.includes(q)),g=acl(aclObj(AD.k,AD.id)).g;
 $('ad-list').innerHTML=ts.map(t=>`<button type="button" role="option" aria-selected="${t.name===AD.target}" class="ad-opt ${t.name===AD.target?'on':''}" data-n="${esc(t.name)}" onclick="adPick(this.dataset.n)">${picon(AD.tk)}<span><b>${esc(t.name)}</b><small>${esc(t.meta)}</small></span><span class="ad-cl ${g>0&&t.cl<g?'low':''}">열람 ${t.cl} ${GRADE[t.cl][0]}</span></button>`).join('')||'<p class="small muted ad-none">검색 결과가 없습니다.</p>'}
function adCand(){return{id:AD.rid&&!AD.rid.startsWith('x:')?AD.rid:'new',kind:AD.tk,target:AD.target,sub:AD.tk==='dept'&&AD.sub,level:AD.level,effect:AD.effect,from:AD.from,to:AD.effect==='deny'?'':AD.to,scope:AD.scope,status:'active'}}
function adCalc(){const o=aclObj(AD.k,AD.id),a=acl(o),c=adCand(),legacy=!AD.adj&&AD.rid&&AD.rid.startsWith('x:');
 let patch;if(AD.adj){const cid=cpId(o,AD.rid);patch=breakPatch(o,'');patch.rules=patch.rules.map(r=>r.id===cid?Object.assign({},c,{id:cid,tp:r.tp,copied:r.copied}):r)}   // 조정 = 상속 끊기(복사) + 이 규칙만 변경
 else patch={rules:AD.rid&&!legacy?(o.rules||[]).map(r=>r.id===AD.rid?c:r):[...(o.rules||[]),c],extra:legacy?o.extra.filter(x=>'x:'+x!==AD.rid):o.extra};
 const d=c.target?diffPatch(o,patch):null,ownerBad=!!c.target&&!ownerOk(o,patch);
 const widen=!!d&&d.dir==='wide';
 const cl=c.target?(c.kind==='dept'?deptUnits(c).filter(u=>a.g>0&&u[2]<a.g).map(u=>u[0]):(a.g>0&&tgtCl(c.kind,c.target)<a.g?[c.target]:[])):[];
 const docs=AD.k==='folder'?state.db.docs.filter(d=>!d.archived&&inhChain(d).includes(o)):[];
 return{o,a,c,d,widen,cl,docs,subs:AD.k==='folder'?fDesc(o.id).length:0,legacy,ownerBad}}
function adSync(){document.querySelectorAll('.ad-kinds button').forEach(b=>{const on=b.dataset.k===AD.tk;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
 document.querySelectorAll('.ad-eff button').forEach(b=>b.classList.toggle('on',b.dataset.e===AD.effect));
 document.querySelectorAll('input[name=ad-lv]').forEach(r=>{r.checked=+r.value===AD.level;r.closest('label').classList.toggle('on',r.checked)});
 $('ad-subw').hidden=AD.tk!=='dept';$('ad-sub').checked=AD.sub;
 const to=$('ad-to');to.disabled=AD.effect==='deny';if(AD.effect==='deny')to.value='';
 const p=adCalc(),g=p.a.g;
 if(!p.c.target){$('ad-prev').innerHTML=`<div class="vprev"><div class="vp-h">${LOCK} 저장 전 미리보기</div><div class="small muted">대상을 고르면 넓어짐·좁아짐과 바뀌는 대상을${AD.k==='folder'?' 영향 받는 하위 문서 수와 함께':''} 미리 보여 줍니다.</div></div>`;$('ad-save').textContent=AD.k==='nf'?'규칙 추가':'저장';$('ad-save').disabled=false;return}
 const warn=[];
 if(p.cl.length)warn.push(`<div class="vp-warn red"><b>열람 등급 상한</b> — ${p.cl.join('·')}의 열람 등급이 이 ${AD.k!=='doc'?'폴더':'문서'} 등급(${g} ${GRADE[g][0]})보다 낮아 허용해도 열 수 없습니다.</div>`);
 if(p.c.effect==='allow'&&p.c.level>=1&&g>=2)warn.push(`<div class="small muted">등급 정책: ${g===3?'제한(3) 등급은 다운로드 수준이어도 내려받을 수 없습니다(열람만).':'대외비(2) 등급은 내려받으면 워터마크가 붙습니다.'}</div>`);
 if(p.ownerBad)warn.push(`<div class="vp-warn red ad-owner" role="alert"><b>${ownerMsg(p.o)}</b> — 소유 부서를 덮는 마지막 허용 규칙을 없애거나 낮출 수 없습니다.</div>`);
 if(p.c.scope)warn.push(`<div class="small muted">범위 한정: ‘${esc(p.c.scope)}’ 문서에만 적용합니다(iam.resource_scope_values).</div>`);
 const nfw=AD.k==='nf'&&(AD.adj?p.widen:nfWiden(p.c)),note=AD.adj&&AD.k!=='nf'?(p.widen?'상속은 바로 끊고(복사 · 권한 그대로) 이 규칙 변경만 독립 승인 후 적용':'상속을 끊고 규칙을 복사한 뒤 이 변경을 바로 적용'):AD.k==='nf'?(nfw?'시작 권한보다 넓힘 · 폴더는 바로 만들고 이 규칙만 승인 후 적용':'폴더를 만들 때 바로 적용'):p.widen?'승인 대기로 저장 · 독립 승인 후 적용, 그 전까지 지금 권한 그대로':`저장하면 바로 적용${AD.k==='doc'?' · 이 문서는 예외(OVERRIDE)가 됩니다':''}`;
 const dd=AD.k==='nf'&&!AD.adj?Object.assign({},p.d,{dir:nfw?'wide':p.d.dir==='wide'?'same':p.d.dir}):p.d;
 $('ad-prev').innerHTML=`<div class="vprev"><div class="vp-h">${LOCK} 저장 전 미리보기</div>${chgBox(dd,note)}${AD.k==='folder'?`<div class="ad-stats"><span>영향 받는 하위 문서 <b>${p.docs.length}건</b> · 하위 폴더 ${p.subs}개</span></div>`:''}${warn.join('')}</div>`;
 $('ad-save').textContent=AD.k==='nf'?(AD.adj?'조정':'규칙 추가'):p.widen?'승인 요청':'저장';$('ad-save').disabled=p.ownerBad}
function adSave(){const p=adCalc(),r=AD.k==='nf'?'':$('ad-reason').value.trim(),err=s=>{$('ad-error').textContent=s};
 if(!p.c.target)return err('대상을 고르세요.');
 if(p.ownerBad)return err(ownerMsg(p.o));
 if(p.c.effect==='deny'&&p.c.kind==='dept'&&deptUnits(p.c).some(u=>u[0]===ownerOf(p.o)))return err('소유 부서는 제외할 수 없습니다.');
 if(p.c.from&&p.c.to&&p.c.to<p.c.from)return err('만료일이 시작일보다 빠릅니다.');
 if(AD.k==='nf'&&AD.adj){const o=nfObj(),bp=breakPatch(o,''),cid=cpId(o,AD.rid);   // 새 폴더: 시작 규칙을 복사한 뒤 이 규칙만 조정
  NF.broken=true;NF.bkey=nfKey();NF.extra=bp.extra;NF.rules=bp.rules.map(r=>r.id===cid?Object.assign({},p.c,{id:cid,tp:r.tp,copied:r.copied,orig:r,by:meName(),at:clock()}):r);$('modal').close();return}
 if(AD.k==='nf'){NF.rules.push(Object.assign(p.c,{id:'n'+(++state.dseq),by:meName(),at:clock()}));$('modal').close();return}
 if(!r)return err('사유를 입력해주세요.');
 const o=p.o,nr=Object.assign(p.c,{reason:r,by:meName(),at:clock()});o.rules=o.rules||[];
 if(AD.adj){Object.assign(o,breakPatch(o,r));const cur=o.rules.find(x=>x.id===cpId(o,AD.rid));if(p.widen)cur.pend=Object.assign(nr,{id:cur.id});else Object.assign(cur,nr,{id:cur.id,tp:cur.tp,copied:cur.copied});
  $('modal').close();render();toast(p.widen?`상속을 끊고 규칙을 복사했습니다 · ${p.c.target} 변경은 승인 대기 — 승인 전까지 권한 그대로`:`상속을 끊고 바로 적용 · ${DIRL[p.d.dir]} · 검색·AI 답변에 즉시 반영 · 이후 상위 폴더 변경은 반영되지 않습니다`);return}
 if(AD.rid&&!p.legacy){const cur=o.rules.find(x=>x.id===AD.rid);if(p.widen)cur.pend=nr;else Object.assign(cur,nr,{id:cur.id})}
 else if(p.legacy){const t=AD.rid.slice(2),id='r'+(++state.dseq);o.extra=o.extra.filter(x=>x!==t);   // 기존 공유 예외를 규칙 한 줄로 바꿔 저장
  o.rules.push(p.widen?{id,kind:'dept',target:t,sub:false,level:0,effect:'allow',from:'',to:'',scope:'',status:'active',reason:o.extraWhy||'',by:'공유 승인',at:clock(),pend:nr}:Object.assign(nr,{id}))}
 else{nr.id='r'+(++state.dseq);if(p.widen)nr.status='pending';o.rules.push(nr)}
 if(!p.widen&&AD.k==='doc')o.override=true;
 $('modal').close();render();
 toast(p.widen?`승인 대기 · ${p.c.target} ${LV[p.c.level][0]} — 넓어짐 · 독립 승인 후 적용됩니다. 그 전까지 권한 그대로`:`바로 적용 · ${DIRL[p.d.dir]} · 검색·AI 답변에 즉시 반영${AD.k==='folder'?` · 상속 중인 문서 ${p.docs.length}건에 함께 반영`:' · 권한 출처: 예외'}`)}

/* ---------- 규칙 삭제 · 요청 취소 ---------- */
function openAclDel(k,id,rid){const o=aclObj(k,id);if(!canAcl(o)){toast('권한 관리 권한이 없어 보기만 가능합니다.');return}
 const{r,legacy}=findRule(o,rid),dp={rules:(o.rules||[]).filter(x=>x.id!==rid),extra:legacy?o.extra.filter(x=>'x:'+x!==rid):o.extra},d=diffPatch(o,dp),widen=r.effect==='deny'||d.dir==='wide',bad=!ownerOk(o,dp);
 const docs=k==='folder'?state.db.docs.filter(x=>!x.archived&&inhChain(x).includes(o)).length:0;
 modal('권한 규칙 삭제',`<p class="small">${picon(r.kind)} <b>${esc(r.target)}</b> · ${LV[r.level][0]} ${r.effect==='deny'?'제외':'허용'} · ${period(r)} 규칙을 지웁니다.</p>
 <div class="vprev"><div class="vp-h">${LOCK} 저장 전 미리보기</div>${chgBox(d,widen?'승인 대기로 저장 · 제외 규칙을 지우면 권한이 넓어지므로 독립 승인 후 해제':'좁히는 변경 → 바로 적용')}${k==='folder'?`<div class="ad-stats"><span>영향 받는 하위 문서 <b>${docs}건</b></span></div>`:''}
 ${bad?`<div class="vp-warn red ad-owner" role="alert"><b>${ownerMsg(o)}</b> — 소유 부서를 덮는 마지막 허용 규칙이라 지울 수 없습니다. 수준을 ‘보기’로 낮추는 것은 가능합니다.</div>`:''}</div>
 <label class="field">사유 <b class="req">*</b><input id="dl-reason" placeholder="예: 공유 기간 종료" oninput="$('dl-error').textContent=''"></label><div id="dl-error" class="error" role="alert"></div>
 <div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}<button id="dl-go" class="btn danger" ${bad?'disabled':''} onclick="aclDelDo('${k}','${id}','${rid}')">${widen?'삭제 승인 요청':'삭제'}</button></div>`)}
function aclDelDo(k,id,rid){const o=aclObj(k,id),why=$('dl-reason').value.trim();
 const{r,legacy}=findRule(o,rid);if(!ownerOk(o,{rules:(o.rules||[]).filter(x=>x.id!==rid),extra:legacy?o.extra.filter(x=>'x:'+x!==rid):o.extra})){$('dl-error').textContent=ownerMsg(o);return}
 if(!why){$('dl-error').textContent='사유를 입력해주세요.';return}
 if(r.effect==='deny'){r.pendDel={reason:why,by:meName(),at:clock()};$('modal').close();render();toast(`삭제 승인 대기 · ${r.target} 제외 규칙은 승인 후 해제됩니다.`);return}
 if(legacy)o.extra=o.extra.filter(x=>'x:'+x!==rid);else o.rules=o.rules.filter(x=>x.id!==rid);
 if(k==='doc')o.override=true;$('modal').close();render();toast(`규칙을 지웠습니다 · 좁아짐 · 검색·AI 답변에 즉시 반영${k==='folder'?' · 상속 중인 문서에 함께 반영':' · 권한 출처: 예외'}`)}
function aclCancel(k,id,rid){const o=aclObj(k,id),r=(o.rules||[]).find(x=>x.id===rid);if(!r)return;
 if(r.status==='pending')o.rules=o.rules.filter(x=>x!==r);else{delete r.pend;delete r.pendDel}render();toast('변경 요청을 취소했습니다 · 권한은 그대로입니다.')}

/* ---------- [빼기] 물려받은 규칙 제외 · [상속 끊기] · [상속 다시 연결] ---------- */
const objName=k=>k==='doc'?'문서':'폴더';
const prevBoxA=(d,note,extra='')=>`<div class="vp-h">${LOCK} 저장 전 미리보기</div>${chgBox(d,note)}${extra?`<div class="ad-stats">${extra}</div>`:''}`;
const belowOf=(k,o)=>k==='folder'?{docs:state.db.docs.filter(d=>!d.archived&&inhChain(d).includes(o)).length,subs:fDesc(o.id).filter(x=>!fd(x).broken).length}:{docs:0,subs:0};
/* [빼기](허용만 저장): 상속을 끊고(물려받은 규칙을 직접 규칙으로 복사) 이 허용 규칙만 지운다 → 좁히는 변경, 바로 적용 */
function outPatch(o,rid,why){const bp=breakPatch(o,why||''),cid=cpId(o,rid);
 if(rid.startsWith('x:')){const t=rid.slice(2);bp.extra=bp.extra.filter(x=>x!==t);bp.copiedExtra=(bp.copiedExtra||[]).filter(x=>x!==t)}
 else bp.rules=bp.rules.filter(r=>r.id!==cid);return bp}
function outCalc(k,id,rid){const o=aclObj(k,id),x=aclRows(o).rows.find(x=>x.inh&&x.r.id===rid);if(!x)return null;const patch=outPatch(o,rid);
 return{o,x,c:x.r,patch,n:aclRows(o).rows.filter(y=>y.inh).length-1,d:diffPatch(o,patch),bad:!ownerOk(o,patch)}}
function openAclOut(k,id,rid){const p=outCalc(k,id,rid);if(!p||!canAcl(p.o))return;const r=p.x.r,b=belowOf(k,p.o);
 modal('물려받은 규칙 빼기',`<p class="small">${picon(r.kind)} <b>${esc(r.target)}</b> · ${LV[r.level][0]} 허용 · ${esc(p.x.src)}에서 물려받음</p>
 <p class="small ot-what"><b>상속을 끊고 이 허용 규칙을 지웁니다.</b> <span class="muted">물려받던 나머지 규칙 ${p.n}개는 이 ${objName(k)}의 직접 규칙으로 복사되어 그대로 유지됩니다. 이후 상위 변경은 반영되지 않으며, [상속 다시 연결]로 되돌릴 수 있습니다.</span></p>
 <div class="vprev">${prevBoxA(p.d,'좁히는 변경 → 바로 적용',k==='folder'?`<span>영향 받는 하위 문서 <b>${b.docs}건</b> · 하위 폴더 ${b.subs}개</span>`:'')}${p.bad?`<div class="vp-warn red ad-owner" role="alert"><b>${ownerMsg(p.o)}</b> — 소유 부서를 덮는 마지막 허용 규칙은 뺄 수 없습니다.</div>`:''}</div>
 <label class="field">사유 <b class="req">*</b><input id="ot-reason" placeholder="예: 외부 인원 열람 종료" oninput="$('ot-error').textContent=''"></label><div id="ot-error" class="error" role="alert"></div>
 <div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}<button id="ot-go" class="btn danger" ${p.bad?'disabled':''} onclick="aclOutDo('${k}','${id}','${rid}')">상속 끊고 빼기</button></div>`)}
function aclOutDo(k,id,rid){const p=outCalc(k,id,rid),why=$('ot-reason').value.trim(),err=s=>{$('ot-error').textContent=s};if(!p)return;
 if(p.bad)return err(ownerMsg(p.o));if(!why)return err('사유를 입력해주세요.');
 Object.assign(p.o,outPatch(p.o,rid,why));if(k==='doc')p.o.override=true;
 $('modal').close();render();toast(`상속을 끊고 허용 규칙을 지웠습니다 · ${DIRL[p.d.dir]} · 삭제: ${p.c.target} · 검색·AI 답변에 즉시 반영`)}
function openAclBreak(k,id){const o=aclObj(k,id);if(!canAcl(o)||o.broken)return;const inh=aclRows(o).rows.filter(x=>x.inh),b=belowOf(k,o),a=acl(o),d=diffPatch(o,breakPatch(o,''));
 const from=k==='doc'?(inhChain(o).length?`폴더 ‘${esc(fd(o.folder).name)}’`:'부서 기본 템플릿'):o.parent?`상위 폴더 ‘${esc(fd(o.parent).name)}’`:'부서 기본 템플릿';
 modal('상속 끊기',`<p class="small"><b>${esc(o.title||o.name)}</b> ${gradeChip(a.g)} · ${from}에서 물려받는 규칙 <b>${inh.length}개</b>를 이 ${objName(k)}의 직접 규칙으로 복사합니다. 복사한 규칙은 편집·삭제할 수 있고, 권한 출처는 <b>예외</b>가 됩니다.</p>
 <div class="vprev">${prevBoxA(d,'복사만 하므로 권한은 바뀌지 않습니다 → 바로 적용',k==='folder'?`<span>이제 이 폴더를 물려받는 하위 문서 <b>${b.docs}건</b> · 하위 폴더 <b>${b.subs}개</b></span>`:'')}
 <div class="vp-warn">끊은 뒤에는 ${from}의 규칙·등급 변경이 이 ${objName(k)}에 반영되지 않습니다.${k==='folder'?` 아래 문서·폴더는 상위 대신 이 폴더의 규칙을 물려받습니다.`:''} [상속 다시 연결]로 되돌릴 수 있습니다.</div></div>
 <label class="field">사유 <b class="req">*</b><input id="br-reason" placeholder="예: 이 폴더만 별도 공유 범위로 관리" oninput="$('br-error').textContent=''"></label><div id="br-error" class="error" role="alert"></div>
 <div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}${btn('상속 끊기',`aclBreakDo('${k}','${id}')`,'primary')}</div>`)}
function aclBreakDo(k,id){const o=aclObj(k,id),why=$('br-reason').value.trim();if(!why){$('br-error').textContent='사유를 입력해주세요.';return}
 Object.assign(o,breakPatch(o,why));$('modal').close();render();toast('상속을 끊었습니다 · 물려받던 규칙을 직접 규칙으로 복사 · 변화 없음 · 검색·AI 답변에 즉시 반영')}
/* 다시 연결: 상위에 지금 없는(또는 더 높은) 허용이 있거나, 지금 있는 제외가 상위에 없으면 넓어짐 */
function relinkCalc(k,id){const o=aclObj(k,id),rp=relinkPatch(o),d=diffPatch(o,rp);
 return{o,d,widen:d.dir==='wide',bad:!ownerOk(o,rp),drop:(o.rules||[]).filter(r=>r.copied).length+(o.copiedExtra||[]).length,keep:(o.rules||[]).filter(r=>!r.copied).length}}
function openAclRelink(k,id){const p=relinkCalc(k,id),o=p.o;if(!canAcl(o)||!o.broken)return;
 const from=k==='doc'?`폴더 ‘${esc((fd(o.folder)||{name:'-'}).name)}’`:o.parent?`상위 폴더 ‘${esc(fd(o.parent).name)}’`:'부서 기본 템플릿';
 modal('상속 다시 연결',`<p class="small"><b>${esc(o.title||o.name)}</b> · 복사해 둔 규칙 <b>${p.drop}개</b>를 지우고 다시 ${from}에서 물려받습니다. 직접 추가한 다른 규칙 ${p.keep}개는 예외로 남습니다.</p>
 <div class="vprev">${prevBoxA(p.d,p.widen?'승인 대기로 저장 · 독립 승인 후 연결, 그 전까지 지금 규칙 그대로':'바로 다시 연결합니다')}${p.bad?`<div class="vp-warn red ad-owner" role="alert"><b>${ownerMsg(o)}</b></div>`:''}</div>
 <label class="field">사유 <b class="req">*</b><input id="rl-reason" placeholder="예: 별도 관리 종료 · 상위 폴더 규칙으로 통일" oninput="$('rl-error').textContent=''"></label><div id="rl-error" class="error" role="alert"></div>
 <div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}<button id="rl-go" class="btn primary" ${p.bad?'disabled':''} onclick="aclRelinkDo('${k}','${id}')">${p.widen?'승인 요청':'다시 연결'}</button></div>`)}
function aclRelinkDo(k,id){const p=relinkCalc(k,id),o=p.o,why=$('rl-reason').value.trim();if(p.bad){$('rl-error').textContent=ownerMsg(o);return}if(!why){$('rl-error').textContent='사유를 입력해주세요.';return}
 if(p.widen){o.relinkPend={reason:why,by:meName(),at:clock()};$('modal').close();render();toast('승인 대기 · 상속 다시 연결은 넓히는 변경이라 독립 승인 후 적용됩니다.');return}
 Object.assign(o,relinkPatch(o));$('modal').close();render();toast(`상속을 다시 연결했습니다 · ${DIRL[p.d.dir]} · 검색·AI 답변에 즉시 반영`)}
function aclRelinkCancel(k,id){const o=aclObj(k,id);o.relinkPend=null;render();toast('변경 요청을 취소했습니다 · 권한은 그대로입니다.')}

/* 지식·문서 자산(S06): 문서 원본 관리는 문서함으로 */
const knowledgePageV22=knowledgePage;
knowledgePage=function(){const h=knowledgePageV22();
 /* 통계 타일·상단 안내·하단 안내 없이 검색 결과만 */
 return rx(rx(h,/<div class="stat-grid">(?:<div class="stat">[\s\S]*?<\/strong><\/div>)*<\/div>/,()=>''),/<div class="scope">게시 지식이 회수[\s\S]*?<\/div>$/,()=>'')};

const renderV22=render;
render=function(){
 if(state.page!=='docbox'){renderV22();return}
 state.page='knowledge';renderV22();state.page='docbox';
 document.querySelectorAll('.nav-btn').forEach(b=>{const on=b.getAttribute('onclick')==="go('docbox')";b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});
 $('mobile-menu').value='docbox';$('crumb').textContent='워크스페이스 / '+pages.docbox[1];
 $('main').innerHTML=docboxPage()+$('main').querySelector('.footer').outerHTML};

/* ================= 간소화 (v2.2) · 화면마다 한 가지 일만 보이도록 ================= */
/* S12 배포 현황: 4개 타일 · 본부별 표는 본부·대상·전달 상태만 */
dashboardPage=function(){
 const scope=state.role==='admin'?'전사 집계 · 관리자':'내가 승인·배포한 지식 · 검토자';
 const stat=(l,v,s)=>`<div class="stat"><small>${l}</small><strong>${v}</strong><div class="small muted">${s}</div></div>`;
 const dept=DASH_DEPT.map(([n,t,r])=>`<tr><th scope="row">${n}</th><td>${t}명</td><td>${r<t?tag(r?`범위 밖 ${t-r}명`:'공유 범위 밖','amber'):tag('전달 완료','green')}</td></tr>`).join('');
 const rows=DASH_ROWS.filter(x=>!/^비공개/.test(x[0])).map(([id,ti,tr,tg,t,r,st])=>`<tr><td><b>${id}</b><div class="small muted">${ti}</div></td><td>${tag(tr,tr==='수동'?'amber':'')}</td><td>${tg}</td><td>${r}/${t}명</td><td>${tag(st,st.startsWith('전달 완료')?'green':st.includes('실패')?'red':'amber')}</td></tr>`).join('');
 return head('05 / DELIVERY DASHBOARD','배포 현황 대시보드','지식이 필요한 부서에 닿았는지, 어디서 막혔는지 봅니다.',`<label class="small">기간 <select><option>최근 30일</option><option>최근 90일</option></select></label>`)
 +`<div class="context"><b>${scope}</b><span>본문을 읽을 권한이 없는 지식은 목록에 나타나지 않습니다.</span></div>`
 +`<div class="dash-stats four">${stat('전달 완료','22건','완료율 92%')}${stat('진행 중','2건','확대 승인 대기 1 · 색인 대기 1')}${stat('실패','1건','부분 실패 · 재시도 대기')}${stat('후속 업무 재사용','34건','전일 기준')}</div>`
 +`<div class="grid" style="margin-top:20px">${panel('본부별 전달',`<div class="table-wrap"><table><thead><tr><th>본부</th><th>대상</th><th>전달 상태</th></tr></thead><tbody>${dept}</tbody></table></div><p class="small muted" style="margin-top:10px">5명 미만 부서는 개인이 드러나지 않도록 상위 부서에 합산합니다.</p>`)}
 ${panel('조치가 필요한 항목',`<div class="info-row"><span>${tag('실패','red')} K-2038 인프라팀 일부 전달 실패</span>${btn('실패 대상만 재시도',"toast('실패한 사용자에게만 다시 전달을 시도합니다.')",'small')}</div><div class="info-row"><span>${tag('지연','amber')} K-2040 확대 승인 3일째 대기</span>${btn('승인자에게 알림',"toast('정책 승인자에게 확대 승인 요청을 다시 알렸습니다.')",'small')}</div><div class="info-row"><span>${tag('조직 변경','amber')} 폐지된 VOC운영팀이 대상인 배포 1건</span>${btn('대상 다시 지정',"toast('배포 대상 지정 화면으로 이동합니다.')",'small')}</div><div class="info-row"><span>${tag('범위 밖','amber')} 영업본부 72명이 공유 범위 밖이라 3건을 받지 못함</span><span class="small muted">확대 여부는 지식 담당자가 판단</span></div>`)}</div>`
 +`<section class="panel" style="margin-top:20px"><div class="panel-head"><h2>최근 배포</h2>${tag('지식 버전 기준')}</div><div class="table-wrap"><table><thead><tr><th>지식</th><th>방식</th><th>대상 규칙</th><th>전달 / 대상</th><th>상태</th></tr></thead><tbody>${rows}</tbody></table></div></section>`};

/* ‘하나의 업무 여정’ 줄은 모든 화면에서 뺀다(진행 표시는 S03·S04·S09의 STEP 1–4 한 줄) */
context=function(){return ''};
/* S04 공유 확대 승인: 한 줄 안내 */
sharingText=function(){const ex=state.expanded.length?` + ${state.expanded.map(u=>org(u).n).join(', ')}`:state.policy==='EXPAND'?` + ${cover().outU.map(u=>org(u).n).join(', ')}`:'';
 return `제안 공유 범위(고객경험본부 · 운영본부 · 검색개발팀${ex})가 원본보다 넓어 두 승인이 모두 필요합니다.`};
/* S04 배포 대상·조직도 선택: 인원 합계 대신 예외가 있을 때만 경고, 없으면 선택한 부서 수 */
function coverFix(html,n){return rx(html,/<div class="cover"><span>대상 <b>\d+<\/b>명<\/span><span>열람 가능 <b>\d+<\/b>명<\/span><span class="[^"]*">공유 범위 밖 <b>(\d+)<\/b>명<\/span><span>보안등급 미달 <b>(\d+)<\/b>명 · 전달 제외<\/span><\/div>/g,(m,o,c)=>{
 const w=[+o?`공유 범위 밖 ${o}명`:'',+c?`보안등급 미달 ${c}명`:''].filter(Boolean);
 return w.length?`<div class="cover warn"><span class="deny">${w.join(' · ')}</span></div>`:`<div class="cover"><span>선택한 부서 <b>${n}</b>개</span></div>`})}
const targetPanelV21=targetPanel,pickerBodyV21=pickerBody,manualPanelV21=manualPanel;
targetPanel=function(){return coverFix(targetPanelV21(),state.sel.length)};
pickerBody=function(){return coverFix(pickerBodyV21(),pick.sel.length).replace(/<span class="small muted">\d+명<\/span>/g,'')};
manualPanel=function(){return coverFix(manualPanelV21(),state.mSel.length)};

/* ---------- 다이얼로그 목록을 다시 그려도 스크롤 위치 유지 ---------- */
function withScroll(sels,fn){return function(...a){const st=sels.map(s=>{const e=document.querySelector(s);return e?e.scrollTop:0});const r=fn.apply(this,a);sels.forEach((s,i)=>{const e=document.querySelector(s);if(e)e.scrollTop=st[i]});return r}}
refreshRelPicker=withScroll(['#modal .org-list','#modal'],refreshRelPicker);
refreshPicker=withScroll(['#modal .org-list','#modal'],refreshPicker);
adList=withScroll(['#ad-list','#modal'],adList);

/* ================= v17 · AI 접점 우선 · 피드백 · 평가 관문(S08) · 재검토 기한 · 이전 답변 재검사 =================
   모든 수치·실행 기록은 가상 예시다. 평가 판정은 DB(eval_runs)가 원장, 실행 기록은 MLflow(로컬)에 남긴다는 가정. */
Object.assign(state,{fb:{},fbMeta:{},fbSeq:120,reviewDue:{open:true,done:''},
 fbQ:[{id:'FB-118',kind:'답변',what:'“검색 지연 점검” 근거 답변',reason:'오래된 정보',fix:'캐시 TTL 기본값이 5.2에서 바뀌었습니다',by:'고객지원팀 · 박서연',st:''},
  {id:'FB-117',kind:'분류 제안',what:'V-2039 분류 제안',reason:'메인 부서가 틀림',fix:'결제·환불 문의는 결제운영 담당',by:'고객지원팀 · 김도윤',st:''},
  {id:'FB-115',kind:'지식 초안',what:'K-2033 v2 지식 초안',reason:'빠진 단계가 있음',fix:'',by:'운영팀 · 오민준',st:''}],
 ev:{active:'P-12',
  cfg:{'P-10':'소형 dense 8B · 프롬프트 v2','P-11':'소형 dense 8B · 프롬프트 v3','P-12':'중형 dense 14B · 프롬프트 v4','P-13':'중형 dense 14B · 프롬프트 v5 · Reranker 교체','P-14':'MoE 20B · 프롬프트 v5'},
  runs:[{id:'E-31',cfg:'P-13',verdict:'PASS',leak:0,sec:'',at:'10.08'},
   {id:'E-30',cfg:'P-14',verdict:'FAIL',leak:1,sec:'출력 반출',at:'10.07'},
   {id:'E-29',cfg:'P-12',verdict:'PASS',leak:0,sec:'',at:'10.02'},
   {id:'E-25',cfg:'P-11',verdict:'PASS',leak:0,sec:'',at:'09.20'}],
  hist:[{kind:'ACTIVATE',cfg:'P-12',prev:'P-11',run:'E-29',at:'10.02'},{kind:'ACTIVATE',cfg:'P-11',prev:'P-10',run:'E-25',at:'09.20'}]}});

/* ---------- AI 결과 피드백: [도움됨] [도움 안 됨] → 이유·수정 내용 → 보내기 (자동으로 평가셋이 되지 않음) ---------- */
const FB_K={answer:'답변',draft:'지식 초안',class:'분류 제안'};
const FB_Q={answer:'이 답변이 도움이 되었나요?',draft:'이 AI 초안이 도움이 되었나요?',class:'이 분류 제안이 도움이 되었나요?'};
const FB_R={answer:['근거와 답이 맞지 않음','근거가 부족함','내용이 틀림','오래된 정보','기타'],
 draft:['사실과 다름','빠진 단계가 있음','적용 조건이 불명확함','민감정보가 남아 있음','기타'],
 class:['분류가 틀림','메인 부서가 틀림','긴급도가 틀림','관련 부서 누락','기타']};
const FB_MSG='피드백을 보냈습니다. 검토 후 평가 항목으로 쓰일 수 있습니다';
const fbId=key=>'fb-'+key.replace(/[^A-Za-z0-9_-]/g,'_');
function fbCtl(key,kind,what){if(what)state.fbMeta[key]=what;const f=state.fb[key]||{},id=fbId(key);
 if(f.sent)return `<div class="fb sent" id="${id}" data-kind="${kind}"><span class="small">${f.up?'도움됨':'도움 안 됨'} · ${FB_MSG}</span></div>`;
 return `<div class="fb" id="${id}" data-kind="${kind}"><div class="fb-q"><span class="small muted">${FB_Q[kind]}</span><button type="button" class="btn small fb-up" onclick="fbVote('${key}','${kind}',1)">도움됨</button><button type="button" class="btn small fb-down${f.open?' on':''}" aria-expanded="${!!f.open}" onclick="fbVote('${key}','${kind}',0)">도움 안 됨</button></div>${f.open?`<div class="fb-form"><label class="field">이유<select id="${id}-r">${FB_R[kind].map(r=>`<option>${r}</option>`).join('')}</select></label><label class="field">수정 내용 <span class="muted">(선택)</span><textarea id="${id}-t" rows="2" placeholder="맞는 내용이나 고칠 점을 적어 주세요"></textarea></label><div class="fb-act">${btn('보내기',`fbSend('${key}','${kind}')`,'small primary')}<span class="small muted">사람이 검토한 피드백만 평가 항목이 됩니다</span></div></div>`:''}</div>`}
function fbRefresh(key,kind){const e=$(fbId(key));if(e)e.outerHTML=fbCtl(key,kind)}
function fbVote(key,kind,up){if(up){fbDone(key,kind,true,'','');return}const f=state.fb[key]=state.fb[key]||{};f.open=!f.open;fbRefresh(key,kind)}
function fbSend(key,kind){const id=fbId(key);fbDone(key,kind,false,$(id+'-r').value,$(id+'-t').value.trim())}
function fbDone(key,kind,up,reason,fix){state.fb[key]={sent:true,up};
 if(!up)state.fbQ.unshift({id:'FB-'+(++state.fbSeq),kind:FB_K[kind],what:state.fbMeta[key]||FB_K[kind],reason,fix,by:`${myDept()} · ${myName()}`,st:''});
 fbRefresh(key,kind);toast(FB_MSG)}

/* S02 분류 제안 · S04 지식 초안 · S05 근거 답변에 피드백 붙이기 */
const triagePanelV17=triagePanel;
triagePanel=function(v){const h=triagePanelV17(v);if(!v.ai)return h;
 return rx(h,/(<p class="small muted ai-why">[\s\S]*?<\/p>)/,m=>m+fbCtl('cls-'+v.id,'class',`${v.id} 분류 제안`))};
const reviewPageV17=reviewPage;
reviewPage=function(){const h=reviewPageV17();if(!state.draft)return h;
 return rx(h,/(<h2>공유할 지식 · K-2041 v1<\/h2>[\s\S]*?<div class="scope">[\s\S]*?<\/div>)/,m=>m+fbCtl('draft-K-2041','draft','K-2041 v1 지식 초안'))};
/* 이전 답변: 다시 열 때 그 답변이 쓴 근거의 권한을 지금 기준으로 다시 확인한다(권한을 잃으면 본문·근거 정보 없이 안내만) */
const PREV_ANS=[{id:'A-0931',q:'검색 지연 시 캐시 TTL은 얼마로 되돌리나요?',at:'10.06 16:20',ok:true},{id:'A-0927',q:'지난 장애 때 캐시 설정값은 어땠나요?',at:'10.03 11:05',ok:false}];
function prevAnswers(){return `<section class="panel prev-ans"><div class="panel-head"><h2>이전 답변</h2>${tag('다시 열 때 권한 재확인')}</div><div class="panel-body">${PREV_ANS.map(a=>a.ok
 ?`<div class="pa-row"><div><b>${esc(a.q)}</b><span class="small muted">${a.at}</span></div>${btn('다시 보기',`state.query='검색 지연 점검';state.searched=true;render()`,'small')}</div>`
 :`<div class="pa-row revoked"><div><b>${esc(a.q)}</b><span class="small muted">${a.at}</span><p class="pa-msg">${LOCK} 권한이 바뀌어 이 답변을 볼 수 없습니다. 다시 질문하세요.</p></div>${btn('다시 질문',`$('query').value=${JSON.stringify(a.q).replace(/"/g,"&quot;")};$('query').focus()`,'small')}</div>`).join('')}</div></section>`}
const searchPageV17=searchPage;
searchPage=function(){let h=searchPageV17();
 h=h.replace('기존 문서 / VOC 지식 출처 구분</span>','키워드·의미 검색 · 기존 문서 / VOC 지식 출처 구분</span>');
 h=rx(h,/(<div class="answer">[\s\S]*?<span class="small muted">실제 검색·모델 실행이 아닌 가상 시연 응답입니다\.<\/span>)/,m=>m+fbCtl('ans-'+state.query.replace(/[^A-Za-z0-9가-힣]/g,'_'),'answer',`“${state.query}” 근거 답변`));
 return h+prevAnswers()};

/* ---------- S01 홈: AI 접점을 먼저 (AI 제안 대기 · 근거 답변 진입 · 평가 관문 한 줄) ---------- */
const evRun=id=>state.ev.runs.find(r=>r.id===id);
const evPass=r=>r.verdict==='PASS'&&r.leak===0&&!r.sec;
const evBack=()=>{const h=state.ev.hist.find(x=>x.cfg===state.ev.active);return h?h.prev:null};
function gateLine(){const r=state.ev.runs[0],can=roles[state.role].menus.includes('quality'),b=evBack();
 return `<div class="gate-line"><span class="gl-k">평가 관문</span><span>활성 구성 <b>${state.ev.active}</b></span><span>최근 평가 ${tag(r.verdict,r.verdict==='PASS'?'green':'red')}</span><span>${b?'롤백 가능':'롤백 대상 없음'}</span>${can?btn('품질·평가 보기',"go('quality')",'small text'):''}</div>`}
function aiPending(){const L=[],m=roles[state.role].menus;
 if(canTriage())state.vq.filter(v=>v.st.tri==='분류 대기'&&v.ai).slice(0,3).forEach(v=>L.push([tag('분류 제안','purple'),`${v.id} · ${esc(v.ai.cat)} → ${esc(v.ai.dept)}`,esc(v.title),btn('확인',`state.vsel='${v.id}';go('voice')`,'small')]));
 if(state.draft&&!state.retired&&m.includes('review')){const st=!state.submitted?'제출 전 확인':!state.approved?'승인 진행 중':!state.published?'게시 대기':'';
  if(st)L.push([tag('지식 초안','purple'),'K-2041 v1 · 검색 지연 대응 가이드',`C-2041 결과 검증으로 생성 · ${st}`,btn('검토',"go('review')",'small')])}
 if(m.includes('quality')){const n=state.fbQ.filter(x=>!x.st).length;if(n)L.push([tag('피드백','amber'),`피드백 검토 대기 ${n}건`,'승인한 것만 평가 항목(DEV)으로 승격',btn('검토',"go('quality')",'small')])}
 return L}
function aiHome(){const m=roles[state.role].menus,L=aiPending(),srch=m.includes('search');
 const list=L.length?L.map(([t,a,b,c])=>`<div class="ai-row">${t}<div><b>${a}</b><span class="small muted">${b}</span></div>${c}</div>`).join(''):'<p class="small muted">사람 확인을 기다리는 AI 제안이 없습니다.</p>';
 const q=srch?`<div class="ai-col"><h3 class="sub0">근거 답변·지식 검색</h3><form class="search ai-q" onsubmit="event.preventDefault();state.query=$('ai-q').value.trim()||'검색 지연 점검';state.searched=true;go('search')"><input id="ai-q" aria-label="근거 답변 질문" placeholder="검색 속도가 느릴 때 어떤 순서로 확인하나요?"><button class="btn primary small" type="submit">근거 찾기</button></form><p class="small muted">허용된 게시 지식·문서만 근거로 답합니다 · 키워드·의미 검색</p></div>`:'';
 return `<section class="panel ai-home"><div class="panel-head"><h2>AI 작업</h2>${tag('로컬 AI · 사람 확인','purple')}</div><div class="panel-body"><div class="ai-grid${q?'':' one'}"><div class="ai-col"><h3 class="sub0">AI 제안 대기 <span class="small muted">· 사람 확인 전</span></h3>${list}</div>${q}</div>${gateLine()}</div></section>`}
/* 재검토 기한(review_due_at): 지식은 게시 상태 그대로 · 소유 부서 작업 목록에 한 줄 */
function reviewDueRow(){const d=state.reviewDue;if(!['handler','reviewer'].includes(state.role))return '';
 if(!d.open)return `<div class="work-row due-row"><span class="bullet"></span><div><strong>환불 규정 안내 v3 · 재검토 완료</strong><p>K-1031 · ${esc(d.done)} · 게시 유지</p></div></div>`;
 return `<div class="work-row due-row"><span class="bullet amber"></span><div><strong>환불 규정 안내 v3 · 재검토 기한 도달 (10/12)</strong><p>K-1031 · 소유 고객지원팀 · 게시 유지 · 검색·배포는 계속됩니다</p></div>${btn('재검토',"openReviewDue()",'small')}</div>`}
function openReviewDue(){modal('지식 재검토 · 환불 규정 안내 v3',`<p class="small">K-1031 v3 · 소유 고객지원팀 · 재검토 기한 10/12 도달. 재검토 중에도 지식은 게시 상태로 검색·배포됩니다(만료일이 지나야 검색에서 빠집니다).</p>
 <fieldset class="track-pick"><legend>재검토 결과</legend><label class="on"><input type="radio" name="rd" value="keep" checked onchange="document.querySelectorAll('.track-pick label').forEach(l=>l.classList.toggle('on',l.contains(this)))">내용 유지 <small>다음 기한 2026.04.12로 갱신</small></label><label><input type="radio" name="rd" value="new" onchange="document.querySelectorAll('.track-pick label').forEach(l=>l.classList.toggle('on',l.contains(this)))">새 버전으로 개정 <small>v4 초안을 만들고 검토를 거쳐 게시</small></label></fieldset>
 <div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}${btn('확인','saveReviewDue()','primary')}</div>`)}
function saveReviewDue(){const v=document.querySelector('input[name=rd]:checked').value;state.reviewDue={open:false,done:v==='keep'?'다음 기한 2026.04.12':'v4 개정 초안 작성 중'};$('modal').close();render();
 toast(v==='keep'?'재검토 완료 · 다음 재검토 기한 2026.04.12 · 지식은 계속 게시됩니다':'v4 개정 초안을 만들었습니다 · v3는 게시 상태를 유지합니다')}
const homePageV17=homePage;
homePage=function(){let h=homePageV17();
 h=rx(h,/<\/header>/,m=>m+aiHome());
 const due=reviewDueRow();if(due)h=rx(h,/(<h2>다음 행동이 필요한 업무<\/h2>[\s\S]*?)(<\/section>)/,(m,a,b)=>a+due+b);
 return h};

/* ---------- S08 품질·운영: 평가셋 실행 · 관문 · 활성화/롤백 · 피드백 승격 · 모델 3점 비교 ---------- */
const SEC_ITEMS='인젝션·RAG 오염·출력 반출';
function evRow(r){const act=r.cfg===state.ev.active,pass=evPass(r),why=[r.leak?`ACL 누출 ${r.leak}건`:'',r.sec?`${r.sec} 실패`:''].filter(Boolean).join(' · ');
 const op=act?tag('활성','green'):pass?`<button class="btn small primary" onclick="openActivate('${r.id}')">활성화</button>`:`<button class="btn small" disabled title="관문 미통과: ${why}">활성화</button><span class="small muted ev-why">관문 미통과 · ${why}</span>`;
 return `<tr class="${act?'active':''}"><td class="mono nowrap">${r.id}<div class="small muted">${r.at}</div></td><td><b class="mono">${r.cfg}</b><div class="small muted">${state.ev.cfg[r.cfg]}</div></td><td>${tag(r.verdict,r.verdict==='PASS'?'green':'red')}</td><td>${r.leak?tag(`누출 ${r.leak}건`,'red'):'0건'}</td><td>${r.sec?tag(`${r.sec} 실패`,'red'):tag('통과','green')}</td><td class="ev-op">${op}</td></tr>`}
function openActivate(id){const r=evRun(id);if(!r||!evPass(r)){toast('PASS 실행(ACL 누출 0 · 보안 항목 통과)이 있어야 활성화할 수 있습니다.');return}
 modal(`${r.cfg} 활성화`,`<p class="small"><b>${r.cfg}</b> · ${state.ev.cfg[r.cfg]}<br>관문 통과 실행 ${r.id} · 판정 PASS · ACL 누출 0건 · ${SEC_ITEMS} 통과</p><p class="small muted">지금 활성 구성 ${state.ev.active}는 롤백 대상으로 남습니다. 활성화 이력이 기록됩니다.</p><div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}${btn('활성화',`doActivate('${id}')`,'primary')}</div>`)}
function doActivate(id){const r=evRun(id),ev=state.ev;ev.hist.unshift({kind:'ACTIVATE',cfg:r.cfg,prev:ev.active,run:r.id,at:'10.09'});ev.active=r.cfg;$('modal').close();render();toast(`${r.cfg}를 활성화했습니다 · 관문 통과 ${r.id} · 이력 기록`)}
function openRollback(){const b=evBack();if(!b){toast('되돌릴 이전 구성이 없습니다.');return}
 modal('이전 구성으로 롤백',`<p class="small"><b>${state.ev.active} → ${b}</b> · ${state.ev.cfg[b]}</p><p class="small muted">${b}는 이전에 평가 관문을 통과해 활성화된 구성입니다. 새 평가 없이 바로 되돌리고, 롤백 이력(이전·이후 구성)이 남습니다.</p><label class="field">사유 <b class="req">*</b><input id="rb-reason" placeholder="예: 답변 근거 일치 하락 보고" oninput="$('rb-error').textContent=''"></label><div id="rb-error" class="error" role="alert"></div><div class="actions" style="justify-content:flex-end">${btn('취소',"$('modal').close()")}<button id="rb-go" class="btn danger" onclick="doRollback()">롤백</button></div>`)}
function doRollback(){const b=evBack(),why=$('rb-reason').value.trim();if(!why){$('rb-error').textContent='사유를 입력해주세요.';return}const ev=state.ev;
 ev.hist.unshift({kind:'ROLLBACK',cfg:b,prev:ev.active,run:'',at:'10.09',why});ev.active=b;$('modal').close();render();toast(`${b}로 롤백했습니다 · 이력 기록`)}
function fbAct(id,ok){const f=state.fbQ.find(x=>x.id===id);if(!f)return;f.st=ok?'승격':'반려';render();toast(ok?`${id}를 평가 항목(DEV)으로 승격했습니다 · 승인자 ${myName()} 기록`:`${id}를 반려했습니다 · 평가셋에 쓰지 않습니다`)}
function qualityPage(){const ev=state.ev,b=evBack(),a=ev.runs.find(r=>r.cfg===ev.active&&evPass(r));
 const runs=`<div class="table-wrap"><table class="ev-table"><thead><tr><th>실행</th><th>구성</th><th>판정</th><th>ACL 누출</th><th>보안 항목</th><th>작업</th></tr></thead><tbody>${ev.runs.map(evRow).join('')}</tbody></table></div><p class="small muted ev-note">PASS 조건: ACL 누출 0건 · ${SEC_ITEMS} 통과. 판정은 eval_runs에, 지표는 MLflow(로컬)에 기록합니다.</p>`;
 const fq=state.fbQ.map(f=>`<div class="fbq-row"><div><b>${f.id} · ${esc(f.what)}</b><span class="small muted">${tag(f.kind)} ${esc(f.reason)}${f.fix?` · 수정안: ${esc(f.fix)}`:''} · ${esc(f.by)}</span></div><div class="actions">${f.st?tag(f.st==='승격'?'평가 항목(DEV) 승격':'반려',f.st==='승격'?'green':''):`${btn('평가 항목으로 승격',`fbAct('${f.id}',1)`,'small')}${btn('반려',`fbAct('${f.id}',0)`,'small text')}`}</div></div>`).join('')||'<p class="small muted">검토할 피드백이 없습니다.</p>';
 const M=[['소형 dense 8B','Qwen3-8B · Llama 3.1 8B급','0.71','0.80','약 70','약 6GB'],['중형 dense 14B','Qwen3-14B급','0.78','0.87','약 42','약 10GB'],['MoE 20~30B','gpt-oss-20b · Qwen3-30B-A3B급','0.80','0.86','약 55','13~16GB + RAM']];
 const cmp=`<div class="table-wrap"><table class="m3"><thead><tr><th>구분</th><th>답변 품질</th><th>근거 일치</th><th>초당 토큰</th><th>VRAM</th></tr></thead><tbody>${M.map(r=>`<tr><th scope="row">${r[0]}<div class="small muted">${r[1]}</div></th>${r.slice(2).map(x=>`<td class="exv">${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="small muted ev-note">모든 값은 예시입니다(실측 필요) · RTX 5080 16GB · 4bit 양자화 · 같은 평가셋·프롬프트·Reranker로 측정해 기록합니다.</p>`;
 const hist=ev.hist.slice(0,3).map(h=>`${h.at} ${h.kind==='ROLLBACK'?'롤백':'활성화'} ${h.prev} → ${h.cfg}${h.run?` (${h.run})`:''}`).join(' · ');
 return head('OPERATIONS / QUALITY · EVAL GATE','평가 없이 바꾸지 않습니다','모델·프롬프트·파이프라인 구성은 평가셋 PASS 실행이 있어야 활성화하고, 언제든 이전 구성으로 되돌립니다.',tag('예시 데이터 · 실측 필요','amber'))
 +`<section class="panel gate-bar"><div class="gb-k"><span>활성 구성</span><b class="mono">${ev.active}</b><small>${ev.cfg[ev.active]}${a?` · 관문 통과 ${a.id}`:''}</small></div><div class="gb-h"><span>활성화·롤백 이력</span><small>${hist}</small></div><div class="gb-act"><button class="btn danger small" ${b?'':'disabled'} onclick="openRollback()">이전 구성으로 롤백${b?` (${b})`:''}</button></div></section>`
 +`<section class="panel" style="margin-top:20px"><div class="panel-head"><h2>평가셋 실행</h2>${tag('고정 평가셋 · 보안 항목 포함')}</div><div class="panel-body">${runs}</div></section>`
 +`<div class="grid ev-grid" style="margin-top:20px">${panel('피드백 검토 대기',`<p class="small muted">피드백은 자동으로 평가셋·학습 데이터가 되지 않습니다. 검토·승인한 것만 평가 항목(DEV)으로 승격하며, 작성자 본인은 승인할 수 없습니다.</p>${fq}`,tag('사람 검토','purple'))}${panel('모델 3점 비교',cmp,tag('예시','amber'))}</div>`}
// 제품명 표기: Enterprise Knowledge Loop (회사명 'Knowledge Loop 주식회사'는 그대로)
function entBrandText(root){const w=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);const re=/(^|[^A-Za-z])Knowledge Loop(?! 주식회사)/g;let n;while((n=w.nextNode())){if(n.parentElement&&n.parentElement.closest('.brand'))continue;if(n.nodeValue.includes('Knowledge Loop')&&!n.nodeValue.includes('Enterprise Knowledge Loop')){n.nodeValue=n.nodeValue.replace(re,'$1Enterprise Knowledge Loop')}}}
render=(function(f){return function(...a){const r=f.apply(this,a);entBrandText();return r}})(render);
showLogin=(function(f){return function(...a){const r=f.apply(this,a);entBrandText(document.getElementById('modal')||document.body);return r}})(showLogin);
