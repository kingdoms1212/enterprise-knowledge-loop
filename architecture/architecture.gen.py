from html import escape as E
W=1600
C={'core':('#eef4fd','#2f6fdb'),'ai':('#f3efff','#7c4dff'),'store':('#fdf6e3','#b7791f'),'model':('#eaf6ee','#2e7d4f'),
   'ext':('#e9f6f6','#0f766e'),'future':('#f6f8fa','#8c959f'),'no':('#fdecec','#c62828'),'plain':('#ffffff','#8c959f'),'new':('#fff4e5','#e8590c')}
o=[]
def t(x,y,s,size=13,w=400,fill='#57606a',anchor='start'):
    o.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{w}" fill="{fill}" text-anchor="{anchor}">{E(s)}</text>')
def box(x,y,w,h,kind='plain',title=None,lines=(),dash=False,sw=1.5,ts=17,ls=13.5,lh=22,rx=10,badge=None):
    f,s=C[kind]
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{f}" stroke="{s}" stroke-width="{sw}"{" stroke-dasharray=\"6 4\"" if dash else ""}/>')
    yy=y+28
    if title: t(x+16,yy,title,ts,700,'#1f2328'); yy+=lh+2
    if badge:
        bw=len(badge)*12+14; bf,bs=C[badge[1]] if isinstance(badge,tuple) else C['new']
        lab=badge[0] if isinstance(badge,tuple) else badge
        bw=len(lab)*12+14
        o.append(f'<rect x="{x+w-bw-10}" y="{y+10}" width="{bw}" height="20" rx="10" fill="{bs}"/>')
        t(x+w-bw/2-10,y+24,lab,11.5,700,'#ffffff','middle')
    for l in lines: t(x+16,yy,l,ls); yy+=lh
def arrow(x1,y1,x2,y2,dash=False,label=None,lx=None,ly=None):
    o.append(f'<path d="M{x1},{y1} L{x2},{y2}" stroke="#57606a" stroke-width="1.6" fill="none"{" stroke-dasharray=\"5 4\"" if dash else ""} marker-end="url(#ar)"/>')
    if label: t(lx if lx else x1+8,ly if ly else (y1+y2)/2+4,label,12.5)
def chev(x,y,w,h,kind,title,sub=None,first=False,ts=14,ss=12):
    f,s=C[kind];p=14
    pts=[(x,y),(x+w-p,y),(x+w,y+h/2),(x+w-p,y+h),(x,y+h)]+([] if first else [(x+p,y+h/2)])
    o.append(f'<polygon points="{" ".join(f"{a},{b}" for a,b in pts)}" fill="{f}" stroke="{s}" stroke-width="1.5"/>')
    cx=x+w/2+(0 if first else p/2)-p/2
    if sub:
        t(cx,y+h/2-4,title,ts,700,'#1f2328','middle'); 
        for i,sl in enumerate(sub if isinstance(sub,list) else [sub]): t(cx,y+h/2+15+i*16,sl,ss,400,'#57606a','middle')
    else: t(cx,y+h/2+5,title,ts,700,'#1f2328','middle')
def lane(y,title,items,kind,h=62,x0=40,x1=1560,gap=6):
    t(x0,y,title,17,700,'#1f2328')
    n=len(items);w=(x1-x0-gap*(n-1))/n
    for i,it in enumerate(items):
        k=it[2] if len(it)>2 else kind
        chev(x0+i*(w+gap),y+14,w,h,k,it[0],it[1],first=i==0)
    return y+14+h
# ---------- header
t(40,56,'Enterprise Knowledge Loop · 전체 아키텍처',28,700,'#1f2328')
t(40,88,'기획서 v1.5 · 시안 v2.1 기준 (2026-10-07) · 개발·MVP 검증은 단일 노드, 운영은 N중화(하단 배포 구성) · 모든 AI 연산 내부 실행 · 업무 원장은 Spring Core만 소유',15)
lg=[('core','업무 Core'),('new','v1.5 추가·변경'),('ai','AI 서비스'),('store','저장소·색인'),('model','로컬 모델'),('ext','사내 연동 시스템'),('future','고도화(인터페이스만)'),('no','사용 안 함')]
x=40
for k,l in lg:
    f,s=C[k];o.append(f'<rect x="{x}" y="106" width="18" height="18" rx="4" fill="{f}" stroke="{s}" stroke-width="1.5"{" stroke-dasharray=\"4 3\"" if k=="future" else ""}/>');t(x+26,120,l,13);x+=26+len(l)*13.2+24
# ---------- boundary
o.append('<rect x="340" y="145" width="1230" height="1050" rx="14" fill="none" stroke="#8c959f" stroke-width="1.5" stroke-dasharray="8 6"/>')
t(360,170,'사내망 경계 · 외부 반출 없음',13.5,700)
# ---------- left column
box(40,185,270,300,'plain','사내 사용자',['담당자(AGENT) · 의견 작성자','검토·승인자(APPROVER)','원본 소유 측 · 정책 담당','지식 관리자 · 운영 ADMIN','타 부서 VIEWER(수신 부서)','본직/겸직 소속 전환','','입력: VOC·내부 의견(수동·CSV)','사내 문서 PDF·DOCX·TXT','역할만으로 권한 우회 불가'],ls=13)
box(40,505,270,165,'ext','사내 연동 시스템',['인사·조직 원천','  초기 Dummy/CSV → 인사 API','사내 IdP','  사번 로그인 → OIDC/SAML','staging → 검증 → diff → 적용'],ls=13)
box(40,690,270,200,'future','메일 · 메신저 (고도화)',['부서 간 업무 스레드 자산화','EmlFileConnector(수동 반입)','ImapConnector · 메신저 채널','opt-in 채널만, 개인함 임의 열람 X','이번 범위: 인터페이스만 정의','구현 착수 조건: 기획서 8.2'],dash=True,ls=13)
box(40,1040,270,125,'no','외부 AI · 클라우드',['외부 LLM·임베딩 API','클라우드 모델·인터넷 검색','외부 fallback 없음'],dash=True,ls=13)
o.append('<path d="M314,1092 L334,1112 M334,1092 L314,1112" stroke="#c62828" stroke-width="3"/>')
# ---------- row1
box(360,190,770,120,'plain','React / TypeScript 웹 · 12개 화면 (시안 v2.1)',['순환·업무: 지식 순환 현황 · 접수된 VOC · 부서 협업·해결','지식: 지식화 검토 · 부서 지식함(배포 현황·직접 지정) · 통합 검색 · 지식·문서 자산','운영: 배포 현황 대시보드 · 수집·처리 흐름 · 조직·사용자 연동 · 권한·감사 · 품질·운영'],ls=13)
box(1160,190,390,120,'plain','내부 HTTPS Reverse Proxy',['TLS · HttpOnly 세션 쿠키 · CSRF','AI·DB·모델 포트는 노출하지 않음'],ls=13)
arrow(310,250,358,250); arrow(1130,250,1158,250); arrow(1355,310,1355,338)
# ---------- core
box(360,340,1010,420,'core','Spring Core · Modular Monolith',['Java 21 · /api/v1 · 업무 원장 단일 소유 · Flyway V1~V8 · 낙관적 잠금 · Idempotency-Key'],sw=2,ts=18)
mods=[('Identity · Organization','core',['사번 로그인 · 인증 어댑터','조직·발령 동기화 · 겸직'],None),
 ('Permission · AuthzGate','core',['RBAC·ABAC·ACL 중앙 판정','정책 승인 · 검색 자격'],None),
 ('Intake (Document/Voice)','core',['원본 · 정제 · 출처 계보','권한 기반 수집 · 격리'],None),
 ('Triage','new',['처리 경로 3갈래 확정','지식화 후보 자동 감지'],'신규'),
 ('Casework','new',['결정·의견 반영 · Outcome 검증','바로 종결 · 경로 변경 이력'],'변경'),
 ('Knowledge','new',['초안 자동 생성 → 제출','조건부 확대 승인 → 승인하고 게시'],'변경'),
 ('Distribution','new',['자동 배포(승인 시 예약)','조직도 대상 규칙 · 대시보드'],'변경'),
 ('Retrieval · Reuse','core',['검색 조정 · 재검증 · 출처','후속 Case 지식 적용 기록'],None),
 ('Job · outbox worker','core',['lease · 재시도 · 멱등 · 계보','게시→색인→배포 연쇄'],None),
 ('Audit · Evaluation','core',['감사 이벤트 · 고정 평가셋','실행 그래프(운영 화면)'],None),
 ('WorkThread 포트','future',['Connector · Import · AclMapper','OpinionExtraction (고도화)'],None),
 ('contracts/','plain',['OpenAPI · JSON Schema','Java DTO ↔ Pydantic 계약 테스트'],None)]
for i,(n,k,ls_,b) in enumerate(mods):
    c,r=i%4,i//4; x=380+c*(237+8); y=410+r*(105+10)
    box(x,y,237,105,k,n,ls_,dash=k=='future',ts=15,ls=12.5,lh=21,badge=b)
box(1390,340,160,420,'plain','관측 (선택)',['Prometheus','Grafana','','request · job ID','p50 / p95','index lag','timeout','실패 수','배포 대기 건수'],ls=13)
# arrows from left
arrow(310,590,378,470,label=None); 
arrow(310,800,378,700,dash=True); 
# ---------- row3
box(360,800,300,175,'store','PostgreSQL 16',['유일한 업무 원장 · 스키마 8개','iam · audit · ops · intake','casework · knowledge','distribution · eval','track · 후보 · 배포 계획(V8)'],ls=13)
box(680,800,240,175,'store','내부 파일 저장',['원본 · 정제문','랜덤 키 · 로컬 볼륨','ObjectStore 어댑터'],ls=13)
arrow(510,760,510,798); arrow(800,760,800,798); arrow(1245,760,1245,798,label='/internal/* · 서비스 인증',lx=1255,ly=784)
box(940,800,610,250,'ai','FastAPI AI · 내부 전용',['Python 3.12 · request nonce · deadline · 원장을 직접 바꾸지 않고 결과를 Core에 반환'],sw=2,ts=18,ls=13)
ai=[('parse · clean','파싱 · 마스킹 · 품질 검사'),('analyze · triage','분류 · 경로·부서 제안'),('draft','검증 결과 → 지식 초안'),
    ('embed · index','청킹 · 임베딩 · 두 색인'),('retrieve · rerank','자격 목록 사전 필터'),('generate · evaluate','검증 문맥만 생성 · 평가')]
for i,(n,d) in enumerate(ai):
    c,r=i%3,i//3; x=958+c*(192+6); y=880+r*(76+10)
    box(x,y,192,76,'new' if n in('analyze · triage','draft') else 'ai',n,[d],ts=14.5,ls=12.5,lh=20)
box(360,995,560,180,'plain','실행 장비 (개발 기준)',['Ryzen 9800X3D · RAM 64GB · RTX 5080 VRAM 16GB','Windows 개발 도구 + WSL2/Linux 컨테이너','Core · AI · DB · 검색은 Compose로 구성','DB·검색·Core/AI 메모리 예산 20–28GB(출발점)','Local LLM 7–8B 4bit부터 실측'],ls=13)
for i,(n,k,ls_) in enumerate([('Qdrant','store',['벡터 색인','index_revision_id','IN 자격 목록 필터']),('OpenSearch','store',['BM25 색인','bool.filter에','같은 자격 목록']),('로컬 모델 런타임','model',['Ollama 생성 · NO_CLOUD','임베딩 · Reranker','(CPU 우선)'])]):
    x=940+i*(197+10); box(x,1070,197,105,k,n,ls_,ts=15,ls=12.5,lh=20)
    arrow(x+98,1050,x+98,1068)
# ---------- lanes
y=1235
t(40,y,'VOC 처리 경로 3갈래 · AI가 제안하고 담당자가 확정 (기본 일반 처리, 지식화는 선택 경로)',17,700,'#1f2328')
rows=[('바로 종결',[('기존 지식 매칭','AI가 게시 지식 제시'),('지식 선택 · 적용 사유','권한·게시 상태 확인'),('1클릭 종결','Case·결정·Outcome 일괄'),('재사용 기록','지식 효과 집계')]),
      ('일반 처리',[('Case 생성','부서 배정'),('결정 · 조치','의견 반영/보류 함께'),('결과 기록 · 종결','지식화 안 함'),('반복 감지','30일 3건 → 지식화 후보')]),
      ('지식화',[('① 접수','경로 확정 · Case'),('② 처리','결정 · 증거 검증'),('③ 승인','제출 · 승인하고 게시'),('④ 공유 (자동)','게시 → 색인 → 전달')])]
yy=y+14
for name,its in rows:
    o.append(f'<rect x="40" y="{yy}" width="140" height="54" rx="8" fill="{C["new"][1]}"/>');t(110,yy+33,name,15,700,'#ffffff','middle')
    w=(1560-196-6*3)/4
    for i,(a,b) in enumerate(its): chev(196+i*(w+6),yy,w,54,'new' if name=='지식화' else 'core',a,b,first=i==0,ts=13.5,ss=12)
    yy+=62
y=yy+34
y=lane(y,'지식화 흐름 · 사람 동작 5회(공유 확대 시 7회), 공유는 자동, 진행 표시는 4단계 바 하나',[
 ('AI 분석 · 경로 제안',['반입·정제·분류']),('담당자 확정',['Case 생성/연결']),('결정 저장',['의견 반영 토글']),('결과·증거 검증',['→ 초안·대상 자동 제안']),
 ('초안·배포 대상 확정',['제출 = 승인 hash 포함']),('조건부 확대 승인',['원본 소유·정책 병렬']),('승인하고 게시',['게시·배포 함께 실행']),('게시 → 양 색인',['준비 후 수신함 전달'],'core'),('게시 후 직접 지정',['S09 · 사유 필수'])],'new',h=66)+44
y=lane(y,'배포 상태 · 자동 배포와 수동 지정이 같은 상태를 쓴다 (대상 지정은 권한 부여가 아님, 수신 확인 기본 미요청)',[
 ('PLANNED',['제출 시 · 범위 밖 수동 지정']),('QUEUED',['승인·게시 · 범위 안 수동 지정']),('색인 준비 대기',['한 색인 실패 시 QUEUED 유지']),('DELIVERED',['READ 가능자만 수신함 생성']),
 ('PARTIAL_FAILED·FAILED',['실패 부서만 재배포']),('SUPERSEDED·WITHDRAWN',['새 버전 이어 전달 · 폐기 철회']),('CANCELLED',['반려 · 확대 승인 반려'],'plain')],'core',h=62)+44
y=lane(y,'RAG 요청 경로 · 권한은 검색 전부터 매 전달 경계마다 다시 확인',[
 ('① 인증',['세션 · 현재 소속']),('② AuthzGate',['자격 revision 산출']),('③ 사전 필터 검색',['Qdrant + OpenSearch']),('④ Core 재검증',['ID · 버전 · 권한']),('⑤ 로컬 Rerank',['검증 청크만']),
 ('⑥ 문맥 예산',['출처 매핑 확인']),('⑦ 로컬 LLM 생성',['검증 문맥만']),('⑧ 출력 검사',['citation 키 · 상태']),('⑨ 답변 반환',['근거 없음 별도 처리'])],'core',h=58)+44
y=lane(y,'권한 판정 · 모든 조건이 AND, 하나라도 실패하면 거부 (관리자도 동일)',[
 ('① 인증·활성',['조직 일치']),('② 역할 행위',['RBAC']),('③ 상태 허용',['행위별']),('④ 보안등급',['clearance ≥ 등급']),('⑤ 업무 범위',['부서·고객·프로젝트']),
 ('⑥ DENY 없음',['부모 DENY 우선']),('⑦ ALLOW 존재',['직접 또는 상속']),('⑧ 출처 의존',['복수 출처 교집합']),('⑨ 시간 경계',['valid_until 재평가'])],'core',h=58)+40

# ---------- N중화 배포 구성
def stack(x,y,w,h,kind,title,lines,n='×N',ts=15,ls=12.5):
    f,s_=C[kind]
    for d in (8,4):
        o.append(f'<rect x="{x+d}" y="{y-d}" width="{w}" height="{h}" rx="10" fill="{f}" stroke="{s_}" stroke-width="1.2" opacity="0.7"/>')
    box(x,y,w,h,kind,title,lines,ts=ts,ls=ls,lh=20,badge=(n,kind) if n else None)
y+=10
o.append(f'<rect x="20" y="{y-30}" width="1560" height="2" fill="#d0d7de"/>')
t(40,y+8,'운영 N중화 배포 구성 (ADR11) · 무상태 계층은 N대 Active-Active, 상태 계층은 복제·쿼럼 3노드',20,700,'#1f2328')
t(40,y+34,'각 계층의 N대는 최소 2대 물리 서버(가능하면 랙·전원 분리)에 흩어 둔다 · N·RPO·RTO·DR·Kubernetes 여부는 O08에서 확정 · 기본 가정: 노드별 Compose + L4 VIP',14)
y+=62
rowsH=[('진입',150),('애플리케이션',165),('상태 · 저장',190),('운영',120)]
ys=[];yy=y
for lab,h in rowsH:
    o.append(f'<rect x="40" y="{yy}" width="130" height="{h}" rx="8" fill="#f6f8fa" stroke="#d0d7de"/>');t(105,yy+h/2+5,lab,15,700,'#1f2328','middle')
    ys.append(yy);yy+=h+22
# 진입
r=ys[0]+24
box(200,r,220,100,'plain','사내 사용자',['브라우저 · 사번 로그인','TLS'],ts=15,ls=12.5,lh=20)
box(470,r,420,100,'plain','L4 VIP',['사내 L4 장비, 없으면 keepalived + HAProxy','2대 Active-Standby · 헬스체크로 노드 제외'],ts=15,ls=12.5,lh=20)
stack(940,r,610,100,'plain','Reverse Proxy · 정적 웹',['TLS 종료 · CSRF · 내부 포트 비노출','Core API N대로 분산, sticky session 없음'])
arrow(420,r+50,468,r+50);arrow(890,r+50,938,r+50)
# 앱
r=ys[1]+28
stack(200,r,320,118,'core','Spring Core API',['Active-Active · 세션은 DB 공유(V9)','멱등 키·낙관적 잠금·AuthzGate lock','모두 DB에 있어 인스턴스 무관'])
stack(560,r,320,118,'core','Core worker',['outbox FOR UPDATE SKIP LOCKED','lease 만료 시 재획득 · 멱등·CAS','주기 작업은 DB lock으로 1회만'])
stack(920,r,300,118,'ai','FastAPI AI · CPU 풀',['parse · clean · embed · rerank','무상태 · 내부 LB · deadline','결과 반영은 Core가 revision 판정'])
stack(1260,r,290,118,'model','AI GPU 풀 + 로컬 모델',['generate · Ollama(NO_CLOUD)','노드마다 같은 모델·checksum','장애 시 동시성 제한, 외부 X'])
gy=ys[1]-11
o.append(f'<path d="M1000,{ys[0]+124} L1000,{gy} L360,{gy} L360,{ys[1]+20}" stroke="#57606a" stroke-width="1.6" fill="none" marker-end="url(#ar)"/>')
t(1010,gy-4,'API 요청 → Core N대',12.5)
# 상태
r=ys[2]+30
box(200,r,470,140,'store','PostgreSQL 16 · 유일한 원장',['Primary ⇄ 동기 Standby (+선택 비동기)','Patroni + etcd ×3 자동 failover · DB VIP','권한 판정은 Primary에서만 읽음(복제본 X)','failover 중 쓰기·검색 fail-closed, 유실 없음'],ts=15,ls=12.5,lh=20,badge=('×2+3','store'))
box(700,r,300,140,'store','공유 파일 저장',['로컬 볼륨 → 공유 저장소','사내 NAS(이중 컨트롤러) 또는','S3 호환 분산 저장(erasure)','ObjectStore 어댑터만 교체'],ts=15,ls=12.5,lh=20)
stack(1030,r,250,140,'store','Qdrant',['클러스터 3노드','replication_factor 2','전체 장애 시 원장에서 재색인'],n='×3')
stack(1300,r,250,140,'store','OpenSearch',['3노드 · 관리자 쿼럼','replica 1','한 엔진 장애 시 degraded'],n='×3')
for x in (360,720,1090,1405): arrow(x,ys[1]+28+118,x,ys[2]+22)
# 운영
r=ys[3]+20
box(200,r,430,82,'plain','관측',['Prometheus ×2 · Grafana · 알림 · index lag·failover 감시'],ts=15,ls=12.5,lh=20)
box(660,r,430,82,'plain','백업 · 복구',['WAL 아카이브 PITR + 파일 스냅샷을 같은 복구 지점으로','검색 색인은 복구 후 원장에서 재생성'],ts=15,ls=12.5,lh=20)
box(1120,r,430,82,'plain','배포',['롤링 배포 · Flyway는 단일 Job으로 1회','스키마는 확장 → 전환 → 축소(구·신 동시 동작)'],ts=15,ls=12.5,lh=20)
y=yy+20
y=lane(y,'장애 시 동작 · 인수 시험 T65~T69 (최소 Core 2 · worker 2 · AI 2 · PG Primary+Standby · Qdrant 3 · OpenSearch 3)',[
 ('Core 1대 장애',['세션 유지 · 재요청 성공']),('DB failover',['fail-closed · 회수 권한 유지']),('worker 중복·lease',['색인·배포 1회만']),
 ('검색·GPU 노드 장애',['계속 · 동시성 제한']),('롤링 배포',['구·신 동시 동작'])],'core',h=58)+40
H=int(y)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Noto Sans KR, sans-serif">
<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#57606a"/></marker></defs>
<rect width="{W}" height="{H}" fill="#ffffff"/>
'''+'\n'.join(o)+'\n</svg>\n'
open('architecture.svg','w',encoding='utf-8').write(svg)
print(H)
