from pathlib import Path
from html import escape
from PIL import ImageFont
import base64,json

BASE=Path(__file__).parent
W,H=1600,2830
FONT=Path('C:/Windows/Fonts/NotoSansKR-VF.ttf')
C={'core':('#f0f5ff','#3774cf'),'ai':('#f5f0ff','#8658c9'),'store':('#fff7e8','#bf8a36'),'model':('#edf8f0','#4a9662'),'ext':('#edf8f8','#40918f'),'future':('#f8fafc','#8b99a9'),'no':('#fff6f5','#cf6862'),'plain':('#fff','#a4aeba')}
O=[]; LABELS=[]; CHECK=[]
def text(x,y,s,size=15,bold=False,color='#334155',anchor='start'):
    O.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}" text-anchor="{anchor}">{escape(s)}</text>')
def wrap(s,width,size):
    font=ImageFont.truetype(str(FONT),size)
    lines=[]; line=''
    for c in s:
        if font.getlength(line+c)>width and line:
            at=line.rfind(' ')
            if at>len(line)*.48:
                lines.append(line[:at]);line=line[at+1:]+c
            else:lines.append(line);line=c
        else:line+=c
    if line:lines.append(line)
    return lines
def para(x,y,s,width,size=15,bold=False,color='#475569',leading=None):
    LABELS.append(s)
    for line in wrap(s,width,size):
        text(x,y,line,size,bold,color);y+=leading or size*1.55
    return y
def rect(x,y,w,h,kind='plain',dash=False):
    f,c=C[kind]
    O.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{f}" stroke="{c}" stroke-width="1.4"'+(' stroke-dasharray="6 5"' if dash else '')+'/>')
def box(x,y,w,h,title,body,kind='plain',ts=18,fs=15,dash=False):
    rect(x,y,w,h,kind,dash)
    yy=para(x+16,y+29,title,w-32,ts,True,'#20354d')+8
    for s in body:yy=para(x+16,yy,s,w-32,fs)+4
    CHECK.append({'title':title,'bottom':yy-20,'limit':y+h-10})
def arrow(d,color='#8091a7',dash=False):
    O.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.7"'+(' stroke-dasharray="5 4"' if dash else '')+' marker-end="url(#arr)"/>')
def lane(y,title,items,kind='core',height=105,widths=None):
    para(32,y,title,1536,21,True,'#20354d')
    x=32; top=y+22;gap=6
    widths=widths or [(1536-gap*(len(items)-1))/len(items)]*len(items)
    for i,(s,w) in enumerate(zip(items,widths)):
        f,c=C[kind];end=x+w
        pts=f'{x},{top} {end-12},{top} {end},{top+height/2} {end-12},{top+height} {x},{top+height} {x+10},{top+height/2}'
        O.append(f'<polygon points="{pts}" fill="{f}" stroke="{c}" stroke-width="1.2"/>')
        lines=wrap(s,w-34,14);LABELS.append(s)
        yy=top+height/2-(len(lines)-1)*11+5
        for line in lines:text(x+w/2,yy,line,14,True,anchor='middle');yy+=22
        CHECK.append({'title':s,'bottom':yy-22,'limit':top+height-8})
        x+=w+gap
    return top+height

text(32,49,'Enterprise Knowledge Loop · 전체 아키텍처',32,True,'#142e4b')
para(32,82,'개발·MVP는 단일 노드, 운영 N중화는 고도화 · 모든 AI 연산 내부 실행 · 업무 원장은 Spring Core만 소유',1536,16)
para(32,119,'사내 문서에 바로 묻는 문서 LLM과 VOC RAG 파이프라인을 하나의 로컬 RAG·LLM 기반 위에 만들고, 기업 권한(ACL)을 검색과 AI 답변까지 그대로 적용한다.',1536,16)
para(32,147,'권한을 바꾸면 재색인 없이 다음 질문부터 답과 근거가 바뀐다. 외부 AI 없음.',1536,16,True,'#2f659e')
x=32
for kind,s in [('core','업무 Core(파랑)'),('ai','AI 서비스(보라)'),('store','저장소·색인(주황)'),('model','로컬 모델(초록)'),('ext','사내 연동(청록)'),('future','고도화 인터페이스만(회색 점선)'),('no','사용 안 함(빨강 점선)')]:
    rect(x,177,14,14,kind,kind in ('future','no'));text(x+21,190,s,13);x+=ImageFont.truetype(str(FONT),13).getlength(s)+43

# Internal boundary and people / systems.
O.append('<rect x="320" y="218" width="1248" height="1440" rx="18" fill="#fcfdff" stroke="#a7b1be" stroke-dasharray="8 6"/>')
text(340,245,'사내 온프렘 시스템',15,True)
box(32,263,260,348,'사내 사용자',['담당자 · 관련 부서 협업자','합의·최종 승인자','원본 소유 측·정책 승인자','지식 관리자·운영 ADMIN','일반 직원(검색·질의)','본직/겸직 소속 전환','입력: VOC(운영 반입·CSV·내부 테스트 접수)','사내 문서 PDF·DOCX·TXT'],fs=14)
box(32,637,260,220,'사내 연동 시스템',['인사·조직 원천(초기 CSV → 인사 API)','사내 IdP(사번 로그인 → OIDC/SAML)','staging → 검증 → diff → 적용'],'ext',fs=15)
box(32,883,260,122,'메일·메신저',['고도화(인터페이스만)'],'future',dash=True)
box(32,1093,260,168,'외부 AI·클라우드',['외부 LLM·임베딩 API','클라우드 모델 사용 안 함','외부 fallback 없음'],'no',dash=True)
O.append('<path d="M299 1162 l15 15 m0 -15 l-15 15" stroke="#c64e4e" stroke-width="3"/>')
box(32,1415,260,195,'실행 장비(개발)',['Ryzen 9800X3D · RAM 64GB · RTX 5080 16GB','Compose 단일 노드'],fs=16)

box(342,263,555,110,'Web(kl-web, React/TypeScript)',['문서 LLM · VOC 처리 · AI 지식화'],ts=20)
box(934,263,612,116,'내부 HTTPS Reverse Proxy',['TLS·HttpOnly 세션 쿠키·CSRF','AI·DB·모델 포트 비노출'],ts=20)
arrow('M292 316 H342');arrow('M897 316 H934');arrow('M1235 379 V405')

# Core: authority is explicitly centralized; 10 modules.
rect(342,405,980,775,'core')
para(360,438,'Spring Core(kl-core) · Modular Monolith',940,23,True,'#204b81')
para(360,470,'Java 21 · 업무 원장 단일 소유 · Flyway(Core 단독) · 낙관적 잠금 · Idempotency-Key',940,15)
rows=[
 [('Identity · Organization',['사번 로그인, 조직·발령 동기화, 겸직, 조직 변경 승계']),('Permission · AuthorizationService',['권한 판단은 Core만. 네 지점 = 요청 필터 · 메서드 보안 AOP · 질의 사전 필터(목록·검색·RAG) · 단계별 재검사. DB는 판단하지 않음'])],
 [('Document · 문서함',['폴더 권한 상속, 객체 예외(사유), 넓히는 변경은 승인']),('Intake · Triage',['VOC 반입·정제, AI 분류 제안(유형·긴급도·메인 부서·관련 부서) → 사람 확정 → Case'])],
 [('Casework',['메인·관련 부서 협업, 종결 유형 3가지(AI 지식 참조·일반 종결·종료), AI 지식화 설정']),('Knowledge · 결재',['AI 초안, 결재선 자동 구성(합의 → 최종 승인), 최종 승인 = 결과 검증 + 게시'])],
 [('Distribution',['승인 시 배포 예약, 조직도 대상 규칙, 색인 준비 후 부서 지식함 전달']),('Retrieval · Reuse',['ACL 사전 필터 하이브리드 검색(FTS + pgvector, RRF), 출처, 재사용 기록'])],
 [('Job · outbox worker',['재시도·멱등, 게시 → 색인 → 배포 연쇄, ACL_CHANGED 이벤트']),('Audit · Evaluation',['감사 이벤트(수정·삭제 금지), 고정 평가셋·평가 관문·롤백'])]
]
for r,row in enumerate(rows):
    for c,(title,body) in enumerate(row):box(360+c*474,500+r*132,456,120,title,body,'core',ts=17,fs=14)
arrow('M292 747 H320 V450 H342',dash=True)
arrow('M292 946 H326 V1160 H342',dash=True)
box(1344,405,202,255,'배치·평가',['Airflow(수집·색인·평가 배치, 권한 판단 안 함)','MLflow 로컬(지표만 기록)'],ts=18,fs=15)
box(1344,688,202,115,'관측(선택)',['Prometheus·Grafana'],ts=18,fs=14)
arrow('M1344 555 H1322',dash=True)
arrow('M1322 747 H1344',dash=True)

# Storage and internal AI execution. No AI -> DB edge.
box(342,1220,510,185,'PostgreSQL 16 (단일 원장)',['업무 원장 + pgvector(벡터) + FTS(키워드)','청크에는 권한 사본 없이 acl_id만.','업무 규칙은 DB 트리거가 아니라 Core에서, DB는 선언형 제약과 감사 이력 보호만.'],'store',ts=20)
box(874,1220,448,185,'내부 파일 저장',['원본·정제문, 랜덤 키, ObjectStore 어댑터'],'store',ts=20)
arrow('M585 1180 V1220');arrow('M1080 1180 V1220')
rect(342,1435,980,200,'ai')
para(360,1465,'FastAPI AI(kl-ai, 내부 전용)',940,22,True,'#614399')
para(360,1495,'원장을 직접 바꾸지 않고 결과를 Core에 반환, 검색 SQL·권한 판단 안 함.',940,15)
ai=[('parse·clean','파싱·마스킹'),('analyze·triage','분류·부서·종결 유형 제안'),('draft','종결 결과 → 지식 초안'),('embed·tokenize','임베딩·검색 토큰'),('rerank','Core가 넘긴 허용 청크만'),('generate·evaluate','허용 문맥만 생성·평가')]
for i,(title,body) in enumerate(ai):box(360+i*158,1515,148,102,title,[body],'ai',ts=13,fs=13)
arrow('M1322 1110 H1333 V1470 H1322')
arrow('M1322 1500 H1338 V1140 H1322')
box(1352,1435,194,200,'로컬 모델 런타임',['Ollama 생성 모델','로컬 임베딩·Reranker','NO_CLOUD'],'model',ts=18,fs=14)
arrow('M1322 1560 H1352')

# Flow ribbons: preserve supplied wording.
lane(1700,'VOC는 처리와 지식화를 분리 · AI는 제안, 사람이 확정',[
'① 접수 · AI 분류 제안','② 담당 지정 · Case(메인·관련 부서)','③ 처리 · 관련 부서 협업','④ 종결(유형 3가지: AI 지식 참조 / 일반 종결 / 종료)','⑤ AI 지식화 설정(처리 중이나 종결 후, 종결 유형과 별개)','⑥ AI 초안 + 결재선 자동 구성','⑦ 상신','⑧ 결재','⑨ 게시 · ACL 적용'],height=128,widths=[154,182,160,216,227,185,99,99,166])
arrow('M454 1850 V1870 H855 V1850',dash=True)
para(32,1901,'AI 지식 참조로 끝낸 건은 보통 지식화하지 않음(정책 안내, 차단 없음) · 지식화하지 않은 VOC도 종결은 그대로',1536,15)

lane(1961,'종결되면 결재선 자동 구성 · 같은 순서는 병렬',[
'기안(담당자 상신)','합의(관련 부서별, 병렬) ‖ 공유 확대 승인(원본 소유·정책, 조건부·병렬)','최종 승인하고 게시(메인 부서, 결과 검증 겸함)'],height=85,widths=[265,760,499])
para(32,2097,'상신 전 수기 조정: 합의 부서 추가·제외(사유 필수, 제외 기록은 최종 승인자에게 표시)',1536,15)
para(32,2126,'각 단계 결정: 승인 / 보완 요청(고쳐 재상신) / 반려(AI 지식화 반려됨, 초안은 기록만)',1536,15)
para(32,2155,'기안자 결재 금지 · 한 사람 한 단계',1536,15,True)

lane(2210,'공유', ['게시','두 색인 준비(FTS·벡터)','부서 지식함 전달(READ 가능자만)','다음 VOC·질문에서 재사용'],kind='store',height=64)
text(1568,2320,'대상 지정은 권한 부여가 아님',15,True,'#8b642b','end')

lane(2373,'권한은 검색 전부터 매 전달 경계마다 다시 확인',[
'① 인증·현재 소속','② Core 권한 문맥(허용 acl 계산)','③ 사전 필터 하이브리드 검색(PostgreSQL FTS + pgvector, 한 SQL)','④ Core 재검증(ID·버전·권한)','⑤ 로컬 Rerank(허용 청크만)','⑥ 문맥 구성','⑦ 로컬 LLM 생성','⑧ 출력 검사(인용·상태, 권한 재검사)','⑨ 답변(근거 없음 별도 처리)'],height=120,widths=[135,174,267,159,164,103,132,193,161])
box(32,2536,1536,65,'', ['권한 변경 = 같은 트랜잭션에서 청크 acl_id 교체 → 재색인 없이 다음 질문부터 반영 · 답변 중 권한을 잃은 근거는 빼고 다시 생성(ACL_CHANGED)'],'core',ts=1,fs=15)

lane(2640,'권한 판정 · 모든 조건 AND',[
'① 인증·활성','② 역할 행위(RBAC)','③ 상태 허용','④ 보안등급(clearance ≥ 등급)','⑤ 업무 범위(부서·고객·프로젝트)','⑥ ALLOW 존재(직접 또는 폴더 상속)','⑦ 출처 의존(복수 출처 교집합)','⑧ 시간 경계(valid_until)'],height=84)
para(32,2782,'제외 규칙은 기본 꺼진 내부 옵션 · 소유 부서는 최소 보기 유지',1536,15)

fontdata=base64.b64encode(FONT.read_bytes()).decode()
head=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><title>Enterprise Knowledge Loop · 전체 아키텍처</title><defs><style>@font-face{{font-family:"Noto Sans KR";src:url(data:font/ttf;base64,{fontdata}) format("truetype");font-weight:100 900}}text{{font-family:"Noto Sans KR",sans-serif}}</style><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#8091a7"/></marker></defs><rect width="100%" height="100%" fill="white"/>'
(BASE/'architecture.svg').write_text(head+'\n'.join(O)+'</svg>',encoding='utf8')
(BASE/'labels.json').write_text(json.dumps(LABELS,ensure_ascii=False,indent=2),encoding='utf8')
bad=[c for c in CHECK if c['bottom']>c['limit']]
print(json.dumps({'overflow':bad,'labels':len(LABELS)},ensure_ascii=True))
