from pathlib import Path
from html import escape
from PIL import ImageFont
import base64,json
BASE=Path(__file__).parent
W,H=1600,1060
FONT=Path('C:/Windows/Fonts/NotoSansKR-VF.ttf')
C={'core':('#f0f5ff','#3774cf'),'ai':('#f5f0ff','#8658c9'),'store':('#fff7e8','#bf8a36'),'model':('#edf8f0','#4a9662'),'ops':('#f6f8fa','#98a3b2'),'plain':('#fff','#a4aeba')}
O=[];CHECK=[];LABELS=[]
def text(x,y,s,size=14,bold=False,color='#475569',anchor='start'):
 O.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}" text-anchor="{anchor}">{escape(s)}</text>')
def wrap(s,width,size):
 font=ImageFont.truetype(str(FONT),int(size));lines=[];line=''
 for c in s:
  if font.getlength(line+c)>width and line:
   at=line.rfind(' ')
   if at>len(line)*.5:lines.append(line[:at]);line=line[at+1:]+c
   else:lines.append(line);line=c
  else:line+=c
 if line:lines.append(line)
 return lines
def para(x,y,s,width,size=14,bold=False,leading=21):
 LABELS.append(s)
 for line in wrap(s,width,size):text(x,y,line,size,bold);y+=leading
 return y
def rect(x,y,w,h,kind='plain',radius=12):
 f,c=C[kind];O.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{f}" stroke="{c}" stroke-width="1.4"/>')
def badge(x,y,s,kind='core'):
 width=ImageFont.truetype(str(FONT),12).getlength(s)+20
 rect(x-width,y,width,24,kind,12);text(x-width/2,y+17,s,12,True,anchor='middle')
def box(x,y,w,h,title,body,kind='plain',bn=None,fs=14,ts=19):
 rect(x,y,w,h,kind)
 yy=para(x+16,y+30,title,w-32-(60 if bn=='×N' else 0),ts,True,26)
 if bn:badge(x+w-14,y+12,bn,kind)
 yy+=8
 for line in body:yy=para(x+16,yy,line,w-32,fs)+5
 CHECK.append({'title':title,'bottom':yy-23,'limit':y+h-10})
def arrow(d):O.append(f'<path d="{d}" fill="none" stroke="#8594a7" stroke-width="1.6" stroke-linejoin="round" marker-end="url(#arr)"/>')

title='운영 N중화 배포 구성(고도화) · 무상태 계층은 N대 Active-Active, 상태 계층은 복제·쿼럼'
para(28,42,title,1544,26,True,32)
para(28,75,'MVP는 단일 노드 Compose · 지금은 무상태 Core·DB 세션·파일 어댑터·단일 실행 잠금 규칙만 지켜 노드만 늘리면 되게 함 · N·RPO·RTO·DR은 결정 필요 사항 · 기본 가정: 노드별 Compose + L4 VIP(사내 Kubernetes가 있으면 이전)',1544,14,False,22)
x=28
for kind,label in [('core','업무 Core(파랑)'),('ai','AI 서비스(보라)'),('model','로컬 모델(초록)'),('store','저장소(주황)'),('ops','운영(회색)')]:
 rect(x,119,13,13,kind,3);text(x+20,131,label,13);x+=ImageFont.truetype(str(FONT),13).getlength(label)+47

# Entry: long labels are preserved without abbreviations.
box(28,154,260,120,'사내 사용자',['브라우저 · 사번 로그인 · TLS'])
box(328,154,575,120,'L4 VIP',['사내 L4 장비, 없으면 keepalived + HAProxy 2대 Active-Standby · 헬스체크로 노드 제외'])
box(943,154,629,120,'Reverse Proxy · 정적 웹',['TLS 종료 · CSRF · 내부 포트 비노출 · Core API N대로 분산, sticky session 없음'],bn='×N')
arrow('M288 214 H328');arrow('M903 214 H943')
arrow('M1248 274 V293 H213 V320')
text(500,288,'API 요청 → Core N대',13,True)

# Stateless services. Their execution connections are routed above the boxes.
box(28,320,370,216,'Spring Core API',[
'Active-Active · 세션은 DB에 저장(Spring Session JDBC)',
'멱등 키·낙관적 잠금·권한 판정 lock 모두 DB에 있어 어느 인스턴스가 받아도 같은 결과',
'권한 판단은 Core만'],'core','×N')
box(420,320,370,216,'Core worker',[
'outbox FOR UPDATE SKIP LOCKED · lease 만료 시 재획득 · 멱등·CAS',
'주기 작업(조직 동기화·만료 정리 등)은 DB lock으로 1회만'],'core','×N')
box(812,320,370,216,'FastAPI AI · CPU 풀',[
'parse · clean · embed · rerank · 무상태 · 내부 LB · deadline',
'결과 반영은 Core가 revision으로 판정'],'ai','×N')
box(1204,320,368,216,'AI GPU 풀 + 로컬 모델',[
'generate · Ollama(NO_CLOUD)',
'노드마다 같은 모델·checksum',
'장애 시 동시성 제한, 외부 fallback 없음'],'model','×N',ts=17)
arrow('M398 372 H409 V308 H997 V320')
arrow('M790 384 H801 V303 H1388 V320')

# Only Core owns DB/file access. Parallel routed paths do not traverse AI boxes.
arrow('M170 536 V578');arrow('M602 536 V578')
arrow('M310 536 V558 H1376 V578')
text(990,550,'AI는 DB에 직접 접속하지 않음 · 결과는 Core에 반환',13,True)

rect(28,578,1040,200,'store')
para(44,609,'PostgreSQL 16 · 단일 원장 + 색인',1008,21,True,26)
badge(1054,590,'Primary + 동기 Standby (+선택 비동기)','store')
y=644
for s in [
'업무 원장 + pgvector(벡터) + FTS(키워드) 색인을 한 DB에',
'DB 복제가 색인 복제를 함께 맡음 · 별도 검색 클러스터 없음',
'Patroni + etcd ×3 자동 failover · 앱은 DB VIP로 Primary에만 접속',
'권한 판정·검색 SQL은 Primary에서만(읽기 복제본은 권한과 무관한 보고·평가 조회만)',
'failover 중 쓰기·검색 fail-closed, 동기 복제라 커밋된 승인·배포 유실 없음']:
 y=para(44,y,s,1008,14,False,23)
CHECK.append({'title':'PostgreSQL','bottom':y-23,'limit':768})
box(1090,578,482,200,'공유 파일 저장',[
'로컬 볼륨 → 공유 저장소',
'사내 NAS(이중 컨트롤러) 또는 S3 호환 분산 저장(erasure)',
'ObjectStore 어댑터만 교체'],'store')

# Operations.
box(28,800,340,124,'관측',['Prometheus ×2 · Grafana · 알림 · failover·복제 지연 감시'],'ops',fs=14,ts=18)
box(390,800,566,124,'백업·복구',[
'WAL 아카이브 PITR + 파일 스냅샷을 같은 복구 지점으로 · 색인은 PostgreSQL 안의 파생 데이터라 복구 후 원장에서 재생성'],'ops',fs=14,ts=18)
box(978,800,594,124,'배포',[
'롤링 배포 · Flyway는 단일 Job으로 1회 · 스키마는 확장 → 전환 → 축소(구·신 동시 동작) · Core–AI 계약 schema_version 앞뒤 1버전 허용'],'ops',fs=14,ts=18)

para(28,956,'장애 시 동작 · 인수 시험 T65~T69 (최소 Core 2 · worker 2 · AI 2 · PG Primary + 동기 Standby · etcd 3)',1544,18,True,25)
chips=[('① Core 1대 장애','세션 유지 · 재요청 성공'),('② DB failover','쓰기·검색 fail-closed · 회수한 권한 유지'),('③ worker 중복·lease','색인·배포 1회만'),('④ AI·GPU 노드 장애','다른 노드로 재시도 · 동시성 제한'),('⑤ 롤링 배포','구·신 동시 동작')]
for i,(a,b) in enumerate(chips):
 x=28+i*310;w=304;top=973;h=69;f,c=C['core']
 O.append(f'<polygon points="{x},{top} {x+w-12},{top} {x+w},{top+h/2} {x+w-12},{top+h} {x},{top+h} {x+10},{top+h/2}" fill="{f}" stroke="{c}" stroke-width="1.2"/>')
 text(x+w/2,998,a,15,True,anchor='middle');LABELS.extend([a,b])
 for j,line in enumerate(wrap(b,w-38,13)):text(x+w/2,1020+j*17,line,13,anchor='middle')

data=base64.b64encode(FONT.read_bytes()).decode()
header=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><title>{escape(title)}</title><defs><style>@font-face{{font-family:"Noto Sans KR";src:url(data:font/ttf;base64,{data}) format("truetype");font-weight:100 900}}text{{font-family:"Noto Sans KR",sans-serif}}</style><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#8594a7"/></marker></defs><rect width="100%" height="100%" fill="white"/>'
(BASE/'arch-2.svg').write_text(header+'\n'.join(O)+'</svg>',encoding='utf8')
(BASE/'deployment-labels.json').write_text(json.dumps(LABELS,ensure_ascii=False,indent=2),encoding='utf8')
bad=[c for c in CHECK if c['bottom']>c['limit']]
print(json.dumps({'overflow':bad},ensure_ascii=True))
