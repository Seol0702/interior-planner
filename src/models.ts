// 가구 모양 만들기.
// 가구 하나를 "부품(박스·원기둥·공)" 여러 개로 조립한다. 3D 모델 파일 없이도
// 의자·침대 같은 모양이 나오고, 치수(W×D×H)를 바꾸면 모양이 따라 바뀐다(파라메트릭).
import type { ShapeId } from './types'
import { shade } from './colors'

/** 부품의 색 역할 */
export type Tone =
  | 'main' // 본체 색
  | 'accent' // 포인트 색
  | 'glow' // 조명의 빛나는 부분 (포인트 색, 켜지면 빛남)
  | 'dark' // 본체보다 어두운 색 (다리 등)
  | 'metal'
  | 'screen'
  | 'white'
  | 'leaf'
  | 'wood'
  | 'book1'
  | 'book2'
  | 'book3'
  | 'mirror' // 거울·유리
  | 'glass' // 색유리 상판 (포인트 색, 반투명)

/** 부품 하나. x,y,z는 부품 중심 (가구 바닥 중심이 0,0,0 / y가 위쪽 / +z가 가구 앞쪽), 단위 mm */
export type Part = {
  kind: 'box' | 'cyl' | 'ball'
  tone: Tone
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  axis?: 'x' | 'y' | 'z' // 원기둥이 놓인 방향 (y = 세워짐)
  rot?: [number, number, number] // 비스듬히 돌린 부품 (x·y·z축 회전, 라디안). 있으면 axis 대신 쓴다
}

const box = (tone: Tone, x: number, y: number, z: number, w: number, h: number, d: number): Part =>
  ({ kind: 'box', tone, x, y, z, w, h, d })
const cyl = (tone: Tone, x: number, y: number, z: number, dia: number, h: number, axis: 'x' | 'y' | 'z' = 'y'): Part =>
  ({ kind: 'cyl', tone, x, y, z, w: dia, h, d: dia, axis })
const ball = (tone: Tone, x: number, y: number, z: number, dia: number): Part =>
  ({ kind: 'ball', tone, x, y, z, w: dia, h: dia, d: dia })
/** 찌그러진 공 (빈백 등) */
const blob = (tone: Tone, x: number, y: number, z: number, w: number, h: number, d: number): Part =>
  ({ kind: 'ball', tone, x, y, z, w, h, d })

/** 부품을 비스듬히 돌린다 (의자 다리 갈래, 뒤로 누운 등받이 등) */
const turned = (p: Part, rot: [number, number, number]): Part => ({ ...p, rot })

/**
 * 바퀴 달린 의자 다리: 가운데에서 n갈래로 뻗은 다리 + 끝마다 바퀴.
 * reach: 가운데에서 바퀴까지 거리, start: 첫 갈래의 각도
 */
const starBase = (n: number, reach: number, start: number): Part[] =>
  Array.from({ length: n }, (_, i) => {
    const a = start + (i / n) * Math.PI * 2
    const [cx, cz] = [Math.cos(a), Math.sin(a)]
    return [
      turned(box('dark', (cx * reach) / 2, 75, (cz * reach) / 2, reach, 35, 45), [0, -a, 0]), // 다리 갈래
      box('dark', cx * reach, 52, cz * reach, 22, 30, 22), // 바퀴 축
      turned(cyl('dark', cx * reach, 28, cz * reach, 55, 32, 'y'), [Math.PI / 2, -a, 0]), // 바퀴
    ]
  }).flat()

/** 네 귀퉁이 다리 */
const legs = (tone: Tone, lx: number, lz: number, h: number, t: number): Part[] =>
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => box(tone, sx * lx, h / 2, sz * lz, t, h, t))

type Builder = (W: number, D: number, H: number) => Part[]

const builders: Record<ShapeId, Builder> = {
  box: (W, D, H) => [box('main', 0, H / 2, 0, W, H, D)],

  chair: (W, D, H) => {
    const sh = Math.min(460, H * 0.55) // 앉는 높이
    const t = 40
    const st = 50
    const lx = W / 2 - t / 2
    const lz = D / 2 - t / 2
    const bh = H - sh
    return [
      ...legs('main', lx, lz, sh - st, t),
      box('accent', 0, sh - st / 2, 0, W, st, D), // 좌판
      box('main', -lx, sh + bh / 2, -lz, t, bh, t), // 등받이 기둥
      box('main', lx, sh + bh / 2, -lz, t, bh, t),
      box('main', 0, H - 20 - bh * 0.25, -lz, W - 2 * t, bh * 0.5, 25), // 등받이 판
    ]
  },

  // 사무용·메쉬 의자: 바퀴 달린 4갈래 다리 + 기둥 + 좌판 + 등받이 + 팔걸이
  officeChair: (W, D, H) => {
    const sh = Math.min(480, H * 0.5)
    return [
      ...starBase(4, Math.min(W, D) * 0.46, Math.PI / 4), // 4갈래 다리 (대각선 방향)
      cyl('dark', 0, 95, 0, 80, 50), // 다리 가운데
      cyl('metal', 0, 100 + (sh - 180) / 2, 0, 50, sh - 180), // 기둥
      box('accent', 0, sh - 40, 0, W * 0.85, 80, D * 0.8), // 좌판
      box('accent', 0, sh + 60 + (H - sh - 60) / 2, -D * 0.36, W * 0.75, H - sh - 60, 60), // 등받이
      ...[-1, 1].flatMap((s) => [
        box('dark', s * W * 0.42, sh + 120, 0, 40, 30, D * 0.5), // 팔걸이
        box('dark', s * W * 0.42, sh + 40, -D * 0.05, 30, 150, 30), // 팔걸이 기둥
      ]),
    ]
  },

  // 게이밍 의자: 바퀴 달린 5갈래 다리 + 가스 기둥 + 볼록한 버킷 좌석 + 뒤로 살짝 누운 높은 등받이(양옆 날개·머리받침) + 기둥형 팔걸이
  gamingChair: (W, D, H) => {
    const sh = Math.min(520, H * 0.4) // 앉는 높이
    const tilt = 0.16 // 등받이가 뒤로 누운 각도 (라디안, 약 9°)
    const back = (H - sh) / Math.cos(tilt) // 등받이 길이
    const pivot = { y: sh - 20, z: -D * 0.3 } // 등받이가 꺾이는 곳
    // 등받이 부품 놓기: u = 등받이를 따라 위로, v = 등받이 앞쪽으로
    const onBack = (tone: Tone, x: number, u: number, v: number, w: number, h: number, d: number) =>
      turned(box(tone, x, pivot.y + u * Math.cos(tilt) + v * Math.sin(tilt), pivot.z - u * Math.sin(tilt) + v * Math.cos(tilt), w, h, d), [-tilt, 0, 0])
    return [
      ...starBase(5, Math.min(W, D) * 0.47, Math.PI / 2), // 5갈래 다리
      cyl('dark', 0, 100, 0, 90, 60), // 다리 가운데
      cyl('dark', 0, 130 + (sh - 280) / 2, 0, 70, sh - 280), // 가스 기둥 덮개
      cyl('metal', 0, sh - 150 + 30, 0, 45, 60), // 기둥 윗부분
      box('dark', 0, sh - 110, 10, 240, 40, 260), // 좌석 밑 틀
      box('dark', W * 0.2, sh - 115, D * 0.22, 160, 14, 30), // 높이 조절 손잡이
      box('accent', 0, sh - 45, D * 0.05, W * 0.52, 90, D * 0.74), // 좌석 가운데
      ...[-1, 1].map((s) => box('main', s * W * 0.31, sh - 35, D * 0.05, W * 0.1, 110, D * 0.74)), // 좌석 양옆 (살짝 볼록)
      onBack('accent', 0, back * 0.46, 45, W * 0.44, back * 0.92, 80), // 등받이 가운데 (머리까지)
      ...[-1, 1].map((s) => onBack('main', s * W * 0.29, back * 0.38, 30, W * 0.15, back * 0.7, 120)), // 등받이 양옆 날개 (허리~가슴)
      ...[-1, 1].map((s) => onBack('main', s * W * 0.25, back * 0.79, 30, W * 0.08, back * 0.16, 110)), // 어깨 (위로 갈수록 좁아짐)
      onBack('main', 0, back * 0.95, 30, W * 0.46, back * 0.1, 105), // 머리받침 윗부분
      onBack('dark', 0, back * 0.47, -35, W * 0.66, back * 0.92, 30), // 등받이 뒷판
      ...[-1, 1].flatMap((s) => [
        box('dark', s * W * 0.4, sh + 40, 0, 50, 200, 60), // 팔걸이 기둥
        box('dark', s * W * 0.4, sh + 150, D * 0.04, 90, 30, D * 0.36), // 팔걸이 패드
        box('dark', s * W * 0.37, sh - 60, -10, 40, 50, 160), // 팔걸이 받침
      ]),
    ]
  },

  stool: (W, D, H) => [cyl('accent', 0, H - 20, 0, W, 40), ...legs('main', W * 0.28, D * 0.28, H - 40, 30)],

  sofa: (W, D, H) => {
    const lh = 60 // 다리 높이
    const sb = H * 0.3 // 받침 두께
    const aw = Math.min(180, W * 0.14) // 팔걸이 폭
    const bt = Math.min(220, D * 0.28) // 등받이 두께
    const ah = H * 0.72 // 팔걸이 높이
    const inner = W - 2 * aw
    const n = Math.max(1, Math.round(inner / 700)) // 쿠션 개수
    const cw = inner / n
    const seatTop = lh + sb
    const parts: Part[] = [
      box('main', 0, lh + sb / 2, 0, W, sb, D),
      box('main', 0, seatTop + (H - seatTop) / 2, -D / 2 + bt / 2, W, H - seatTop, bt),
      box('main', -W / 2 + aw / 2, lh + (ah - lh) / 2, 0, aw, ah - lh, D),
      box('main', W / 2 - aw / 2, lh + (ah - lh) / 2, 0, aw, ah - lh, D),
      ...legs('dark', W / 2 - 60, D / 2 - 60, lh, 50),
    ]
    for (let i = 0; i < n; i++) {
      const x = -inner / 2 + cw * (i + 0.5)
      parts.push(box('accent', x, seatTop + 55, bt / 2, cw - 16, 110, D - bt - 16)) // 방석
      parts.push(box('accent', x, seatTop + 110 + (H - seatTop - 110) * 0.42, -D / 2 + bt + 50, cw - 16, (H - seatTop - 110) * 0.8, 100)) // 등쿠션
    }
    return parts
  },

  bed: (W, D, H) => {
    const lh = 80
    const fh = 220 // 프레임 두께
    const mt = 200 // 매트리스 두께
    const hb = 80 // 헤드보드 두께
    const top = lh + fh + mt
    const n = W >= 1300 ? 2 : 1 // 베개 개수
    const pw = Math.min(650, (W - 100) / n - 40)
    const parts: Part[] = [
      box('main', 0, lh + fh / 2, 0, W, fh, D),
      ...legs('dark', W / 2 - 60, D / 2 - 60, lh, 60),
      box('main', 0, H / 2, -D / 2 + hb / 2, W, H, hb), // 헤드보드
      box('white', 0, lh + fh + mt / 2, hb / 2, W - 40, mt, D - hb - 40), // 매트리스
      box('accent', 0, top + 14, D / 2 - (D - hb) * 0.31, W - 20, 30, (D - hb) * 0.6), // 이불
    ]
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : (i === 0 ? -1 : 1) * (W / 4 - 10)
      parts.push(box('white', x, top + 50, -D / 2 + hb + 250, pw, 100, 380))
    }
    return parts
  },

  table: (W, D, H) => [box('main', 0, H - 20, 0, W, 40, D), ...legs('main', W / 2 - 70, D / 2 - 70, H - 40, 60)],

  roundTable: (W, _D, H) => [
    cyl('main', 0, H - 20, 0, W, 40),
    cyl('dark', 0, 30 + (H - 70) / 2, 0, 90, H - 70),
    cyl('dark', 0, 15, 0, W * 0.55, 30),
  ],

  desk: (W, D, H) => {
    const fh = (H - 30) / 3 // 서랍 한 칸 높이
    const dx = W / 2 - 200 // 서랍장 중심 x
    const parts: Part[] = [
      box('main', 0, H - 15, 0, W, 30, D), // 상판
      box('main', -W / 2 + 15, (H - 30) / 2, 0, 30, H - 30, D - 40), // 왼쪽 옆판
      box('main', dx, (H - 30) / 2, 0, 400, H - 30, D - 40), // 서랍장
    ]
    if (W - 430 > 100) parts.push(box('main', -185, H - 180, -D / 2 + 40, W - 430, 300, 18)) // 가림판
    for (let i = 0; i < 3; i++) {
      parts.push(box('accent', dx, fh * (i + 0.5), D / 2 - 15, 380, fh - 12, 10))
      parts.push(cyl('dark', dx, fh * (i + 0.5), D / 2 - 6, 24, 12, 'z'))
    }
    return parts
  },

  // 컴퓨터: 모니터(받침대 포함) + 키보드 + 마우스. 책상 위에 올려 쓴다
  computer: (W, D, H) => {
    const mh = H * 0.72 // 모니터 높이
    const mz = -D / 2 + 60 // 모니터 위치 (뒤쪽)
    return [
      box('dark', 0, H - mh / 2, mz, W, mh, 30), // 모니터 테두리
      box('screen', 0, H - mh / 2, mz + 16, W - 24, mh - 24, 2), // 화면
      box('metal', 0, (H - mh) / 2 + 20, mz - 10, 50, H - mh + 40, 24), // 받침 기둥
      box('metal', 0, 6, mz + 20, 240, 12, 170), // 받침
      box('main', -W * 0.08, 12, D / 2 - 90, Math.min(440, W * 0.75), 24, 140), // 키보드
      box('accent', -W * 0.08, 25, D / 2 - 90, Math.min(420, W * 0.72), 2, 120), // 자판
      box('main', Math.min(W * 0.4, 280), 15, D / 2 - 90, 60, 30, 100), // 마우스
    ]
  },

  // 컴퓨터 본체 (데스크톱 케이스): 상자 + 앞판 + 전원 단추 + 옆 유리
  pcTower: (W, D, H) => [
    box('main', 0, H / 2 + 10, 0, W, H - 20, D),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box('dark', sx * (W / 2 - 25), 5, sz * (D / 2 - 40), 30, 10, 30))), // 발
    box('accent', 0, H / 2 + 10, D / 2 + 1, W - 30, H - 50, 4), // 앞판
    cyl('screen', 0, H - 50, D / 2 + 4, 24, 6, 'z'), // 전원 단추
    box('glass', -W / 2 - 1, H / 2 + 10, 0, 4, H - 70, D - 70), // 옆 유리
  ],

  // 노트북: 본체 + 자판 + 세운 화면
  laptop: (W, D, H) => [
    box('main', 0, 9, 0, W, 18, D),
    box('dark', 0, 19, D * 0.08, W - 40, 2, D * 0.5),
    box('main', 0, 18 + (H - 18) / 2, -D / 2 + 6, W, H - 18, 8),
    box('screen', 0, 18 + (H - 18) / 2, -D / 2 + 11, W - 24, H - 44, 2),
  ],

  // 인두기(납땜 스테이션): 온도 조절기 + 인두 거치대(코일) + 세운 인두 + 청소용 스펀지
  solderStation: (W, D, H) => {
    const cx = -W / 2 + Math.min(80, W * 0.27) // 조절기 위치
    const hx = W / 2 - Math.min(60, W * 0.2) // 거치대 위치
    const ch = Math.min(110, H * 0.5) // 조절기 높이
    return [
      box('main', cx, ch / 2, 0, Math.min(150, W * 0.5), ch, D - 20), // 조절기
      box('screen', cx, ch * 0.62, D / 2 - 9, 80, 30, 2), // 온도 화면
      cyl('accent', cx, ch * 0.28, D / 2 - 5, 30, 12, 'z'), // 다이얼
      box('dark', hx, 10, 0, 110, 20, Math.min(110, D)), // 거치대 받침
      box('book3', hx, 24, D / 2 - 30, 70, 8, 40), // 스펀지
      cyl('metal', hx, 20 + (H * 0.55) / 2, -15, 40, H * 0.55), // 코일 거치대
      cyl('accent', hx, 20 + H * 0.55 + (H * 0.42 - 20) / 2, -15, 22, H * 0.42 - 20), // 인두 손잡이
    ]
  },

  // 벽걸이 거울: 얇은 틀 + 거울 (벽에 붙여 쓴다)
  wallMirror: (W, D, H) => [box('main', 0, H / 2, 0, W, H, D), box('mirror', 0, H / 2, D / 2 + 1, W - 50, H - 50, 4)],

  // 원형 벽걸이 거울
  roundMirror: (W, D, H) => [
    cyl('main', 0, H / 2, 0, Math.min(W, H), D, 'z'),
    cyl('mirror', 0, H / 2, D / 2 + 1, Math.min(W, H) - 40, 4, 'z'),
  ],

  // 생수통 정수기: 본체 + 물 받는 곳 + 냉·온수 꼭지 + 위에 거꾸로 꽂은 생수통
  waterCooler: (W, D, H) => {
    const bh = Math.min(1000, H * 0.7) // 본체 높이
    return [
      box('main', 0, bh / 2, 0, W, bh, D),
      box('dark', 0, bh * 0.72, D / 2 + 1, W - 90, bh * 0.2, 4), // 물 받는 곳
      box('book1', -W * 0.15, bh * 0.78, D / 2 + 14, 30, 40, 26), // 온수 꼭지
      box('book2', W * 0.15, bh * 0.78, D / 2 + 14, 30, 40, 26), // 냉수 꼭지
      box('metal', 0, bh * 0.62, D / 2 + 20, W - 100, 12, 50), // 물받이
      cyl('main', 0, bh + 10, 0, 120, 20), // 생수통 꽂는 목
      cyl('glass', 0, bh + 20 + (H - bh - 20) / 2, 0, Math.min(W, D) * 0.85, H - bh - 20), // 생수통
    ]
  },

  // 문 없는 오픈 캐비닛·철제 책장: 옆판·윗판·뒤판으로 막고 앞은 뚫린 선반장. 넓으면 가운데 칸막이
  openCabinet: (W, D, H) => {
    const t = Math.min(25, W * 0.03) // 판 두께
    const base = Math.min(70, H * 0.08) // 맨 아래 받침 높이
    const n = Math.max(1, Math.round((H - base) / 360) - 1) // 중간 선반 개수
    const cols = W > 1100 ? 2 : 1
    const inner = W - 2 * t
    const parts: Part[] = [
      ...[-1, 1].map((s) => box('main', s * (W / 2 - t / 2), H / 2, 0, t, H, D)), // 옆판
      box('main', 0, H - t / 2, 0, W, t, D), // 윗판
      box('dark', 0, base / 2, 0, inner, base, D - 30), // 받침
      box('main', 0, base + t / 2, 0, inner, t, D), // 바닥판
      box('accent', 0, H / 2, -D / 2 + 6, inner, H - t, 12), // 뒤판 (안쪽 색)
    ]
    const step = (H - t - base - t) / (n + 1)
    for (let i = 1; i <= n; i++) parts.push(box('main', 0, base + t + step * i, 6, inner, t, D - 12)) // 선반
    if (cols === 2) parts.push(box('main', 0, (H + base) / 2, 6, t, H - base - t, D - 12)) // 가운데 칸막이
    return parts
  },

  // 철제 앵글 선반: 네 모서리 기둥 + 선반 판 (옆·뒤가 뚫려 있다)
  steelShelf: (W, D, H) => {
    const post = Math.min(40, W * 0.05) // 기둥 굵기
    const n = Math.max(3, Math.round(H / 420)) // 선반 단 수
    const parts: Part[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => box('main', sx * (W / 2 - post / 2), H / 2, sz * (D / 2 - post / 2), post, H, post)))
    for (let i = 0; i < n; i++) {
      const y = 90 + ((H - 110) * i) / (n - 1) // 맨 아래(바닥 가까이)부터 맨 위까지 고르게
      parts.push(box('accent', 0, y, 0, W - 4, 18, D - 4)) // 선반 판
      parts.push(box('main', 0, y - 20, D / 2 - post / 2, W - 2 * post, 30, 6)) // 앞쪽 테두리 (앵글)
    }
    return parts
  },

  // 유리 진열장: 틀 + 선반 + 유리문 (안쪽 선반이 비쳐 보인다)
  glassCabinet: (W, D, H) => {
    const t = 25
    const base = Math.min(80, H * 0.06)
    const n = Math.max(1, Math.round((H - base) / 380) - 1) // 선반 개수
    const doors = Math.max(1, Math.round(W / 450))
    const dw = (W - 2 * t) / doors
    const ih = H - base - 2 * t // 안쪽 높이
    const parts: Part[] = [
      ...[-1, 1].map((s) => box('main', s * (W / 2 - t / 2), H / 2, 0, t, H, D)), // 옆판
      box('main', 0, H - t / 2, 0, W, t, D), // 윗판
      box('main', 0, base / 2 + t / 2, 0, W - 2 * t, base + t, D), // 바닥판·받침
      box('main', 0, H / 2, -D / 2 + 8, W - 2 * t, H - t, 16), // 뒤판
    ]
    for (let i = 1; i <= n; i++) parts.push(box('accent', 0, base + t + (ih * i) / (n + 1), -10, W - 2 * t, 10, D - 50)) // 유리 선반
    for (let i = 0; i < doors; i++) {
      const x = -W / 2 + t + dw * (i + 0.5)
      parts.push(box('glass', x, base + t + ih / 2, D / 2 - 8, dw - 12, ih - 10, 6)) // 유리문
      parts.push(box('main', x - dw / 2 + 5, base + t + ih / 2, D / 2 - 8, 10, ih, 10)) // 문틀
      parts.push(box('metal', x + (i % 2 === 0 ? dw / 2 - 30 : -dw / 2 + 30), base + t + ih * 0.5, D / 2, 12, 160, 14)) // 손잡이
    }
    return parts
  },

  // 와인셀러: 본체 + 칸마다 누운 와인병 + 짙은 유리문 + 손잡이
  wineCellar: (W, D, H) => {
    const racks = Math.max(2, Math.floor((H - 160) / 120))
    const per = Math.max(2, Math.floor((W - 60) / 90)) // 한 칸에 눕힌 병 수
    const t = 30 // 틀 두께 (속이 비어 있어야 유리문 너머로 병이 보인다)
    const parts: Part[] = [
      ...[-1, 1].map((s) => box('main', s * (W / 2 - t / 2), H / 2, 0, t, H, D)), // 옆판
      box('main', 0, H - t / 2, 0, W, t, D), // 윗판
      box('main', 0, 30, 0, W, 60, D), // 아랫부분
      box('dark', 0, H / 2, -D / 2 + 10, W - 2 * t, H - t, 20), // 안쪽 뒤판
    ]
    for (let r = 0; r < racks; r++) {
      const y = 90 + ((H - 180) * r) / (racks - 1)
      parts.push(box('wood', 0, y, 0, W - 60, 12, D - 80)) // 나무 선반
      for (let b = 0; b < per; b++) parts.push(cyl('leaf', -W / 2 + 30 + ((W - 60) * (b + 0.5)) / per, y + 45, 0, 70, D - 120, 'z')) // 와인병
    }
    parts.push(box('glass', 0, H / 2 + 10, D / 2 - 6, W - 30, H - 60, 8)) // 짙은 유리문
    parts.push(box('screen', 0, H - 30, D / 2 - 2, 80, 20, 4)) // 온도 표시
    parts.push(box('metal', W / 2 - 40, H / 2, D / 2 + 2, 14, H * 0.5, 16)) // 손잡이
    return parts
  },

  // 통돌이 세탁기: 본체 + 위로 여는 뚜껑(유리창) + 뒤쪽 조작부
  topLoader: (W, D, H) => {
    const body = H - 70 // 본체 높이 (위에 조작부가 솟아 있다)
    return [
      box('main', 0, body / 2 + 20, 0, W, body - 40, D), // 본체
      box('dark', 0, 10, 0, W - 60, 20, D - 60), // 받침
      box('accent', 0, body + 8, 40, W - 50, 16, D - 220), // 뚜껑
      box('glass', 0, body + 17, 40, W * 0.55, 4, (D - 220) * 0.6), // 뚜껑 유리창
      box('main', 0, body + 35, -D / 2 + 70, W, 70, 140), // 뒤쪽 조작부
      box('screen', 0, body + 40, -D / 2 + 141, W * 0.4, 30, 4), // 표시창
    ]
  },

  // 무선청소기 거치대: 받침판 + 세운 기둥 + 걸어 둔 청소기(본체·막대·바닥 솔)
  vacuumStand: (W, D, H) => [
    box('main', 0, 10, 0, W, 20, D), // 받침판
    box('main', 0, H / 2, -D / 2 + 30, 40, H, 30), // 기둥
    box('dark', 0, 40, D / 2 - 70, W * 0.85, 40, 100), // 바닥 솔
    cyl('metal', 0, 60 + (H * 0.55) / 2, -D / 2 + 80, 34, H * 0.55), // 막대
    cyl('accent', 0, H * 0.72, -D / 2 + 90, 90, 240), // 청소기 본체(먼지통)
    box('dark', 0, H - 70, -D / 2 + 90, 40, 140, 40), // 손잡이
  ],

  // 스탠드 스피커: 통 + 앞 그릴 + 울림판(우퍼 2개·트위터)
  speaker: (W, D, H) => [
    box('main', 0, H / 2, 0, W, H, D),
    box('dark', 0, H / 2, D / 2 + 1, W - 20, H - 20, 4), // 그릴
    cyl('accent', 0, H * 0.28, D / 2 + 5, W * 0.72, 8, 'z'), // 우퍼
    cyl('accent', 0, H * 0.55, D / 2 + 5, W * 0.62, 8, 'z'), // 우퍼
    cyl('metal', 0, H * 0.8, D / 2 + 5, W * 0.26, 8, 'z'), // 트위터
  ],

  // 반려동물 하우스: 벽 + 계단식 지붕 + 둥근 출입구
  petHouse: (W, D, H) => {
    const wallH = H * 0.6
    const roofH = H - wallH
    const parts: Part[] = [box('main', 0, wallH / 2, 0, W, wallH, D)]
    for (let i = 0; i < 4; i++) parts.push(box('accent', 0, wallH + (roofH * (i + 0.5)) / 4, 0, W * (1.06 - i * 0.26), roofH / 4, D + 30)) // 지붕
    parts.push(box('dark', 0, wallH * 0.32, D / 2 + 1, W * 0.42, wallH * 0.64, 6)) // 출입구
    parts.push(cyl('dark', 0, wallH * 0.64, D / 2 + 1, W * 0.42, 6, 'z')) // 출입구 둥근 윗부분
    return parts
  },

  // 대형 부품 보관함: 철제 틀 + 작은 투명 서랍이 바둑판처럼 (가운데 칸막이로 위·아래 두 덩어리) + 밝은 옆판 + 바퀴
  partsCabinet: (W, D, H) => {
    const f = 40 // 틀 두께
    const wheel = Math.min(110, H * 0.07) // 바퀴 높이
    const bar = 30 // 가운데 칸막이
    const cols = Math.max(2, Math.round((W - 2 * f) / 115))
    const half = Math.max(2, Math.round((H - wheel - 2 * f - bar) / 2 / 90)) // 한 덩어리의 서랍 줄 수
    const cw = (W - 2 * f) / cols
    const bankH = (H - wheel - 2 * f - bar) / 2
    const rh = bankH / half
    const parts: Part[] = [
      ...[-1, 1].map((s) => box('main', s * (W / 2 - f / 2), wheel + (H - wheel) / 2, 0, f, H - wheel, D)), // 옆 틀
      ...[-1, 1].map((s) => box('accent', s * (W / 2 + 1), wheel + (H - wheel) / 2, 0, 2, H - wheel - 80, D - 60)), // 밝은 옆판
      box('main', 0, H - f / 2, 0, W, f, D), // 윗판
      box('main', 0, wheel + f / 2, 0, W, f, D), // 아랫판
      box('dark', 0, wheel + (H - wheel) / 2, -D / 2 + 10, W - 2 * f, H - wheel - 2 * f, 20), // 안쪽 뒤판
      box('accent', 0, wheel + f + bankH + bar / 2, D / 2 - 15, W - 2 * f, bar, 30), // 가운데 칸막이
    ]
    for (let bank = 0; bank < 2; bank++) {
      const y0 = wheel + f + bank * (bankH + bar)
      for (let r = 0; r < half; r++) {
        const y = y0 + rh * (r + 0.5)
        for (let c = 0; c < cols; c++) {
          const x = -W / 2 + f + cw * (c + 0.5)
          parts.push(box('glass', x, y, D / 2 - 30, cw - 8, rh - 8, 50)) // 투명 서랍
          parts.push(box('white', x, y + rh / 2 - 14, D / 2 - 3, cw - 16, 8, 4)) // 이름표 칸
        }
      }
    }
    // 바퀴 4개 (모서리) + 받침
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push(cyl('dark', sx * (W / 2 - 60), wheel / 2, sz * (D / 2 - 50), wheel * 0.8, 30, 'x'))
        parts.push(box('metal', sx * (W / 2 - 60), wheel - 6, sz * (D / 2 - 50), 40, 12, 40))
      }
    }
    return parts
  },

  // 3D 프린터: 회색 상자 몸체 + 짙은 유리문 + 터치 화면, 위에 필라멘트 보관함(반투명 덮개 안에 실타래 4개)
  printer3d: (W, D, H) => {
    const bodyH = H * 0.64 // 프린터 몸체 높이
    const topH = H - bodyH // 위 보관함 높이
    const spoolW = (W * 0.86) / 4
    const spools: Tone[] = ['white', 'book2', 'leaf', 'book1'] // 필라멘트 색 (흰·파랑·초록·빨강)
    return [
      box('main', 0, bodyH / 2, 0, W, bodyH, D), // 몸체
      box('screen', -W * 0.08, bodyH * 0.47, D / 2 + 1, W * 0.7, bodyH * 0.84, 4), // 짙은 유리문
      box('white', W * 0.28, bodyH * 0.55, D / 2 + 6, 34, 12, 10), // 문 손잡이
      box('dark', -W * 0.3, bodyH - 25, D / 2 + 14, W * 0.36, H * 0.085, 14), // 터치 화면 틀
      box('accent', -W * 0.3, bodyH - 25, D / 2 + 22, W * 0.32, H * 0.065, 2), // 터치 화면
      box('dark', 0, 6, D / 2 - 30, W * 0.2, 12, 20), // 아래 통풍구
      box('accent', 0, bodyH + topH * 0.27, 0, W * 1.02, topH * 0.54, D * 0.92), // 보관함 아랫부분
      ...spools.map((tone, i) => cyl(tone, -W * 0.43 + spoolW * (i + 0.5), bodyH + topH * 0.6, -D * 0.04, topH * 0.72, spoolW * 0.82, 'x')), // 실타래
      cyl('glass', 0, bodyH + topH * 0.58, -D * 0.04, topH * 0.84, W * 0.98, 'x'), // 반투명 덮개
    ]
  },

  // 프린터(복합기): 몸체 + 위 스캐너 덮개 + 조작부 + 종이 나오는 곳 + 앞 출력 받침
  printer: (W, D, H) => [
    box('main', 0, (H - 30) / 2, -30, W, H - 30, D - 60), // 몸체
    box('accent', 0, H - 15, -30, W - 10, 30, D - 70), // 스캐너 덮개
    box('dark', W * 0.28, H - 45, D / 2 - 55, W * 0.32, 40, 30), // 조작부
    box('screen', W * 0.28, H - 40, D / 2 - 39, W * 0.2, 22, 2), // 작은 화면
    box('dark', 0, H * 0.42, D / 2 - 59, W * 0.7, 24, 4), // 종이 나오는 곳
    box('accent', 0, H * 0.3, D / 2 - 30, W * 0.55, 8, 60), // 출력 받침
    box('accent', 0, 20, D / 2 - 59, W * 0.8, 30, 4), // 아래 용지함 앞판
  ],

  // 전자레인지: 몸체 + 문(창) + 오른쪽 조작부 + 문 손잡이
  microwave: (W, D, H) => [
    box('main', 0, H / 2 + 5, 0, W, H - 10, D), // 몸체
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box('dark', sx * (W / 2 - 40), 3, sz * (D / 2 - 40), 30, 6, 30))), // 발
    box('accent', -W * 0.12, H / 2 + 5, D / 2 + 2, W * 0.74, H * 0.88, 6), // 문
    box('screen', -W * 0.14, H / 2 + 5, D / 2 + 6, W * 0.56, H * 0.6, 2), // 문 창
    box('dark', W * 0.37, H / 2 + 5, D / 2 + 2, W * 0.22, H * 0.88, 6), // 조작부
    box('glow', W * 0.37, H * 0.75, D / 2 + 6, W * 0.14, H * 0.08, 2), // 표시창
    cyl('metal', W * 0.37, H * 0.42, D / 2 + 8, W * 0.08, 10, 'z'), // 다이얼
    box('metal', W * 0.22, H / 2 + 5, D / 2 + 10, 14, H * 0.5, 10), // 문 손잡이
  ],

  // 샤워 바구니: 손잡이 달린 바구니 + 샴푸·린스(펌프)·바디워시·스펀지
  showerCaddy: (W, D, H) => {
    const bh = H * 0.38 // 바구니 높이
    const hb = H * 0.7 // 큰 병 높이
    return [
      box('main', 0, 5, 0, W, 10, D), // 바닥
      ...[-1, 1].map((s) => box('main', 0, bh / 2, s * (D / 2 - 4), W, bh, 8)), // 앞·뒤 벽
      ...[-1, 1].map((s) => box('main', s * (W / 2 - 4), bh / 2, 0, 8, bh, D)), // 옆 벽
      ...[-1, 1].map((s) => box('main', s * W * 0.06, (H + bh) / 2 - 10, 0, 12, H - bh, 12)), // 손잡이 기둥
      box('main', 0, H - 10, 0, W * 0.24, 16, 16), // 손잡이
      cyl('accent', -W * 0.32, 10 + hb / 2, -D * 0.12, Math.min(75, W * 0.24), hb), // 샴푸
      cyl('white', -W * 0.32, 10 + hb + 15, -D * 0.12, 22, 30), // 샴푸 펌프
      cyl('white', -W * 0.19, 10 + (hb * 0.9) / 2, D * 0.12, Math.min(60, W * 0.18), hb * 0.9), // 린스
      cyl('accent', -W * 0.19, 10 + hb * 0.9 + 15, D * 0.12, 20, 30), // 린스 펌프
      box('book2', W * 0.22, 10 + (hb * 0.78) / 2, -D * 0.12, Math.min(85, W * 0.26), hb * 0.78, Math.min(50, D * 0.3)), // 바디워시
      cyl('white', W * 0.22, 10 + hb * 0.78 + 10, -D * 0.12, 30, 20), // 바디워시 뚜껑
      box('book3', W * 0.34, 10 + 25, D * 0.2, Math.min(80, W * 0.24), 50, Math.min(50, D * 0.3)), // 스펀지
    ]
  },

  // 벽걸이 칠판(화이트보드): 틀(본체 색) + 판(포인트 색) + 아래 받침 + 마커·지우개 (뒤쪽을 벽에 붙여 쓴다)
  wallBoard: (W, D, H) => {
    const back = -D / 2 // 벽에 닿는 면
    const tray = Math.min(60, D * 0.6) // 받침이 튀어나온 길이
    return [
      box('main', 0, H / 2, back + 15, W, H, 30), // 틀
      box('accent', 0, H / 2, back + 32, W - 60, H - 60, 4), // 판
      box('main', 0, 20, back + 30 + tray / 2, W * 0.8, 14, tray), // 받침
      box('white', W * 0.15, 33, back + 30 + tray / 2, 70, 12, 12), // 분필·마커
      box('book1', W * 0.2, 33, back + 30 + tray / 2, 70, 12, 12),
      box('dark', -W * 0.22, 42, back + 30 + tray / 2, 130, 30, 45), // 지우개
    ]
  },

  // 소형 2도어 냉장고: 위 냉동실(작은 문) + 아래 냉장실(큰 문). 문 사이 틈과 손잡이
  fridgeTopFreezer: (W, D, H) => {
    const foot = 30 // 바닥과 띄운 높이
    const doors = H - foot - 10 // 문 전체 높이
    const upper = doors * 0.34 // 냉동실 문
    const lower = doors - upper - 8 // 냉장실 문
    const z = D / 2 - 25 // 문 앞면 위치
    const lowerY = foot + lower / 2
    const upperY = foot + lower + 8 + upper / 2
    return [
      box('main', 0, H / 2 + foot / 2, -25, W, H - foot, D - 50), // 본체
      box('dark', 0, foot / 2, -25, W - 40, foot, D - 90), // 아래 받침
      box('accent', 0, upperY, z, W - 8, upper, 30), // 냉동실 문
      box('accent', 0, lowerY, z, W - 8, lower, 30), // 냉장실 문
      box('dark', 0, foot + lower + 4, z - 4, W - 8, 8, 22), // 문 사이 틈
      box('dark', W / 2 - 40, upperY - upper * 0.25, D / 2 - 4, 16, upper * 0.4, 18), // 냉동실 손잡이 (아래쪽)
      box('dark', W / 2 - 40, lowerY + lower * 0.3, D / 2 - 4, 16, lower * 0.3, 18), // 냉장실 손잡이 (위쪽)
    ]
  },

  // 판다리 책상: 컴퓨터 책상과 같은 상판에, 다리만 양옆 통판으로 + 뒤쪽 가림판 (다리·가림판은 포인트 색이라 상판과 다른 색으로 바꿀 수 있다)
  panelLegDesk: (W, D, H) => {
    const top = 30 // 상판 두께 (컴퓨터 책상과 같다)
    const t = Math.min(30, W * 0.03) // 옆판 두께
    const ph = H - top // 옆판 높이
    const mh = Math.min(350, ph * 0.45) // 가림판 높이
    return [
      box('main', 0, H - top / 2, 0, W, top, D), // 상판
      ...[-1, 1].map((s) => box('accent', s * (W / 2 - t / 2), ph / 2, 0, t, ph, D)), // 옆판 다리
      box('accent', 0, ph - mh / 2, -D / 2 + 60, W - 2 * t, mh, 18), // 가림판
    ]
  },

  // 판다리 유리 책상: 양옆이 통판 다리, 위는 색유리 상판, 다리 사이에 가림판
  panelDesk: (W, D, H) => {
    const g = 12 // 유리 두께
    const t = Math.min(50, W * 0.04) // 옆판 두께
    const ph = H - g // 옆판 높이 (유리 바로 밑까지)
    const px = W / 2 - Math.min(80, W * 0.05) - t / 2 // 유리가 옆판보다 조금 튀어나오게
    const pd = D - Math.min(100, D * 0.12) // 옆판 깊이
    const inner = 2 * px - t // 옆판 사이 너비
    // 혼자 쓰는 책상은 뒤쪽, 마주 앉는 큰 테이블은 가운데에 가림판
    const mz = D >= 1000 ? 0 : -pd / 2 + 60
    return [
      box('glass', 0, H - g / 2, 0, W, g, D), // 유리 상판
      ...[-1, 1].map((s) => box('main', s * px, ph / 2, 0, t, ph, pd)), // 옆판 다리
      box('main', 0, ph - Math.min(200, ph * 0.28), mz, inner, Math.min(400, ph * 0.55), 22), // 가림판
      box('metal', 0, ph - 10, pd / 2 - 30, inner, 20, 30), // 유리 받침대 (앞)
      box('metal', 0, ph - 10, -pd / 2 + 30, inner, 20, 30), // 유리 받침대 (뒤)
    ]
  },

  wardrobe: (W, D, H) => {
    const n = Math.max(1, Math.round(W / 500)) // 문짝 개수
    const dw = W / n
    const parts: Part[] = [box('main', 0, H / 2, -20, W, H, D - 40)]
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + dw * (i + 0.5)
      parts.push(box('accent', x, H / 2 + 20, D / 2 - 30, dw - 8, H - 80, 20))
      parts.push(box('dark', x + (i % 2 === 0 ? dw / 2 - 40 : -dw / 2 + 40), H * 0.5, D / 2 - 12, 14, 220, 16)) // 손잡이
    }
    return parts
  },

  bookshelf: (W, D, H) => {
    const t = 25
    const inner = W - 2 * t
    const base = 60 + t // 맨 아래 칸 바닥 높이
    const n = Math.max(1, Math.round(H / 380) - 1) // 중간 선반 개수
    const lh = (H - t - base) / (n + 1) // 한 칸 높이
    const parts: Part[] = [
      box('dark', 0, H / 2, -D / 2 + 6, W, H, 12), // 뒤판
      box('main', -W / 2 + t / 2, H / 2, 0, t, H, D),
      box('main', W / 2 - t / 2, H / 2, 0, t, H, D),
      box('main', 0, H - t / 2, 0, W, t, D),
      box('main', 0, 60 + t / 2, 0, inner, t, D),
    ]
    const tones: Tone[] = ['book1', 'book2', 'book3']
    for (let j = 0; j <= n; j++) {
      const floorY = base + lh * j
      if (j > 0) parts.push(box('main', 0, floorY - 10, 6, inner, 20, D - 12)) // 선반
      const bw = inner * [0.55, 0.7, 0.4, 0.62][j % 4]
      const bh = Math.min(lh - 50, 240) * [0.9, 0.75, 0.85][j % 3]
      if (bh > 60) parts.push(box(tones[j % 3], -inner / 2 + bw / 2 + 10, floorY + bh / 2, 0, bw, bh, D * 0.6)) // 책
    }
    return parts
  },

  tvUnit: (W, D, H) => {
    const sh = Math.min(450, H * 0.38) // TV장 높이
    const lh = 80
    const n = Math.max(2, Math.round(W / 600))
    const dw = W / n
    const tw = Math.min(W * 0.8, 1450) // TV 폭
    const th = Math.min(tw * 0.58, H - sh - 70)
    const parts: Part[] = [
      box('main', 0, lh + (sh - lh) / 2, -10, W, sh - lh, D - 20),
      ...legs('dark', W / 2 - 80, D / 2 - 70, lh, 40),
      box('dark', 0, sh + 10, 0, tw * 0.35, 20, Math.min(D * 0.6, 240)), // TV 받침
      box('dark', 0, sh + 45, 0, 80, 50, 40),
      box('screen', 0, sh + 70 + th / 2, 0, tw, th, 45), // 화면
    ]
    for (let i = 0; i < n; i++) parts.push(box('accent', -W / 2 + dw * (i + 0.5), lh + (sh - lh) / 2, D / 2 - 15, dw - 10, sh - lh - 14, 10))
    return parts
  },

  lamp: (W, _D, H) => [
    cyl('dark', 0, 15, 0, W * 0.65, 30),
    cyl('metal', 0, 30 + (H - 310) / 2, 0, 24, H - 310),
    cyl('glow', 0, H - 140, 0, W, 280), // 갓
  ],

  // 천장등: 부품 좌표는 0~H이고, 그릴 때 천장 높이에 맞춰 올려 붙인다
  ceilingLight: (W, _D, H) => [cyl('main', 0, H * 0.8, 0, W * 0.9, H * 0.4), cyl('glow', 0, H * 0.3, 0, W, H * 0.6)],

  powerStrip: (W, D, H) => {
    const n = Math.max(2, Math.floor((W - 60) / 55)) // 구멍 개수
    const parts: Part[] = [box('main', 0, H / 2, 0, W, H, D)]
    for (let i = 0; i < n; i++) parts.push(cyl('dark', -W / 2 + 70 + i * 55, H + 1, 0, 34, 3))
    parts.push(box('accent', -W / 2 + 22, H + 3, 0, 20, 8, 28)) // 스위치
    return parts
  },

  plant: (W, _D, H) => {
    const ph = H * 0.28 // 화분 높이
    return [
      cyl('main', 0, ph / 2, 0, W * 0.55, ph),
      cyl('wood', 0, ph + (H * 0.25) / 2, 0, 36, H * 0.25),
      ball('leaf', 0, H - W * 0.42, 0, W * 0.84),
      ball('leaf', -W * 0.2, H * 0.56, W * 0.12, W * 0.6),
      ball('leaf', W * 0.22, H * 0.6, -W * 0.1, W * 0.55),
    ]
  },

  // 러그: 가로세로가 같으면 둥근 러그로
  rug: (W, D) =>
    W === D
      ? [cyl('main', 0, 6, 0, W, 12), cyl('accent', 0, 8, 0, W - 240, 12)]
      : [box('main', 0, 6, 0, W, 12, D), box('accent', 0, 8, 0, W - 240, 12, D - 240)],

  fridge: (W, D, H) => {
    const parts: Part[] = [box('main', 0, H / 2, -25, W, H, D - 50)]
    if (W >= 800) {
      // 양문형
      for (const s of [-1, 1]) {
        parts.push(box('accent', (s * W) / 4, H / 2 + 10, D / 2 - 35, W / 2 - 8, H - 40, 30))
        parts.push(box('dark', s * 30, H * 0.55, D / 2 - 10, 16, H * 0.4, 20))
      }
    } else {
      // 위아래 문
      const upper = (H - 40) * 0.62
      parts.push(box('accent', 0, H - 10 - upper / 2, D / 2 - 35, W - 8, upper - 6, 30))
      parts.push(box('accent', 0, 30 + (H - 40 - upper) / 2, D / 2 - 35, W - 8, H - 40 - upper - 6, 30))
      parts.push(box('dark', W / 2 - 40, H - 10 - upper * 0.6, D / 2 - 10, 16, upper * 0.4, 20))
    }
    return parts
  },

  drawers: (W, D, H) => {
    const lh = H > 600 ? 80 : 50
    const n = Math.max(1, Math.round((H - lh) / 220)) // 서랍 개수
    const fh = (H - lh - 16) / n
    const parts: Part[] = [box('main', 0, lh + (H - lh) / 2, -10, W, H - lh, D - 20), ...legs('dark', W / 2 - 40, D / 2 - 45, lh, 40)]
    for (let i = 0; i < n; i++) {
      const y = lh + 8 + fh * (i + 0.5)
      parts.push(box('accent', 0, y, D / 2 - 15, W - 24, fh - 10, 10))
      for (const x of W > 700 ? [-W * 0.25, W * 0.25] : [0]) parts.push(cyl('dark', x, y, D / 2 - 6, 26, 12, 'z'))
    }
    return parts
  },

  washer: (W, D, H) => [
    box('main', 0, H / 2, -10, W, H, D - 20),
    cyl('dark', 0, H * 0.48, D / 2 - 14, W * 0.62, 12, 'z'), // 문 테두리
    cyl('screen', 0, H * 0.48, D / 2 - 10, W * 0.46, 12, 'z'), // 유리
    box('accent', 0, H - 70, D / 2 - 16, W - 60, 70, 8), // 조작부
  ],

  // ───────── 아래부터 인기 가구용 모양 ─────────

  // 이동식 TV (스탠바이미형): 바퀴 받침 + 기둥 + 화면
  standbyMe: (W, D, H) => {
    const sh = W * 0.58 // 화면 높이
    const top = H - sh
    return [
      cyl('main', 0, 25, 0, D * 0.9, 50), // 받침
      ...[0, 1, 2, 3, 4].map((i) => ball('dark', Math.sin((i / 5) * Math.PI * 2) * D * 0.38, 18, Math.cos((i / 5) * Math.PI * 2) * D * 0.38, 36)), // 바퀴
      cyl('main', 0, 50 + (top + sh * 0.4 - 50) / 2, -20, 46, top + sh * 0.4 - 50), // 기둥
      box('main', 0, top + sh / 2, -10, W * 0.4, sh * 0.3, 40), // 뒤판 받침
      box('main', 0, top + sh / 2, 18, W, sh, 26), // 화면 테두리
      box('screen', 0, top + sh / 2, 32, W - 24, sh - 24, 4), // 화면
    ]
  },

  // 카우치 소파: 등받이 쪽 긴 소파 + 오른쪽 앞으로 튀어나온 긴 의자
  cornerSofa: (W, D, H) => {
    const lh = 60
    const sb = H * 0.3
    const bt = 200
    const sd = Math.min(950, D * 0.6) // 일반 좌석 깊이
    const cw = Math.min(850, W * 0.35) // 긴 의자 폭
    const aw = 160
    const seatTop = lh + sb
    const parts: Part[] = [
      box('main', 0, lh + sb / 2, -D / 2 + sd / 2, W, sb, sd),
      box('main', W / 2 - cw / 2, lh + sb / 2, -D / 2 + sd + (D - sd) / 2, cw, sb, D - sd),
      box('main', 0, seatTop + (H - seatTop) / 2, -D / 2 + bt / 2, W, H - seatTop, bt),
      box('main', -W / 2 + aw / 2, lh + (H * 0.7 - lh) / 2, -D / 2 + sd / 2, aw, H * 0.7 - lh, sd),
      // 다리: 받침이 있는 자리에만 (왼쪽 앞은 좌석 깊이까지만 온다)
      ...[[-W / 2 + 60, -D / 2 + 60], [W / 2 - 60, -D / 2 + 60], [-W / 2 + 60, -D / 2 + sd - 60], [W / 2 - 60, D / 2 - 60], [W / 2 - cw + 60, D / 2 - 60]].map(
        ([x, z]) => box('dark', x, lh / 2, z, 50, lh, 50),
      ),
    ]
    const inner = W - aw - cw // 긴 의자를 뺀 좌석 폭
    const n = Math.max(1, Math.round(inner / 700))
    const w = inner / n
    for (let i = 0; i < n; i++) parts.push(box('accent', -W / 2 + aw + w * (i + 0.5), seatTop + 55, -D / 2 + bt + (sd - bt) / 2, w - 16, 110, sd - bt - 16))
    parts.push(box('accent', W / 2 - cw / 2, seatTop + 55, (-D / 2 + bt + D / 2) / 2, cw - 16, 110, D - bt - 16))
    const bn = Math.max(2, Math.round((W - aw) / 700))
    const bw = (W - aw) / bn
    for (let i = 0; i < bn; i++) parts.push(box('accent', -W / 2 + aw + bw * (i + 0.5), seatTop + 110 + (H - seatTop - 110) * 0.42, -D / 2 + bt + 50, bw - 16, (H - seatTop - 110) * 0.8, 100))
    return parts
  },

  // 리클라이너: 1인 소파 + 앞으로 펼쳐진 발받침
  recliner: (W, D, H) => [
    ...builders.sofa(W, D * 0.82, H).map((p) => ({ ...p, z: p.z - D * 0.09 })),
    box('main', 0, 260, D / 2 - 110, W * 0.62, 90, 200),
    box('dark', 0, 130, D / 2 - 160, 50, 200, 40),
  ],

  // 빈백: 둥근 쿠션 두 덩어리
  beanbag: (W, D, H) => [
    blob('main', 0, H * 0.36, D * 0.05, W, H * 0.72, D * 0.9),
    blob('accent', 0, H * 0.62, -D * 0.2, W * 0.78, H * 0.62, D * 0.5),
  ],

  // 큐브 선반 (칼락스형): 정사각 칸 + 일부 칸에 수납 바구니
  cubeShelf: (W, D, H) => {
    const t = 22
    const cols = Math.max(1, Math.round(W / 380))
    const rows = Math.max(1, Math.round(H / 380))
    const parts: Part[] = [
      box('main', 0, H - t / 2, 0, W, t, D),
      box('main', 0, t / 2, 0, W, t, D),
      box('main', -W / 2 + t / 2, H / 2, 0, t, H, D),
      box('main', W / 2 - t / 2, H / 2, 0, t, H, D),
    ]
    for (let i = 1; i < cols; i++) parts.push(box('main', -W / 2 + (W * i) / cols, H / 2, 0, t, H - 2 * t, D))
    for (let j = 1; j < rows; j++) parts.push(box('main', 0, (H * j) / rows, 0, W - 2 * t, t, D))
    const cw = (W - t) / cols - t
    const ch = (H - t) / rows - t
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i + j * 2) % 3 !== 0) continue
        parts.push(box('accent', -W / 2 + (W * (i + 0.5)) / cols, (H * (j + 0.5)) / rows, D * 0.05, cw * 0.88, ch * 0.88, D * 0.85))
      }
    }
    return parts
  },

  // 매트리스·토퍼: 두툼한 판 + 윗면 커버
  mattress: (W, D, H) => [box('white', 0, H * 0.42, 0, W, H * 0.84, D), box('accent', 0, H * 0.92, 0, W - 20, H * 0.16, D - 20)],

  // 화장대: 책상 + 서랍 + 위쪽 거울
  vanity: (W, D, H) => {
    const th = 750 // 상판 높이
    return [
      box('main', 0, th - 15, 0, W, 30, D),
      box('main', W / 2 - 200, (th - 30) / 2, 0, 380, th - 30, D - 20),
      box('accent', W / 2 - 200, (th - 30) / 2, D / 2 - 12, 360, th - 60, 8),
      box('main', -W / 2 + 25, (th - 30) / 2, D / 2 - 40, 40, th - 30, 40),
      box('main', -W / 2 + 25, (th - 30) / 2, -D / 2 + 40, 40, th - 30, 40),
      box('main', 0, th + (H - th) / 2, -D / 2 + 20, W * 0.62, H - th, 30), // 거울 틀
      box('mirror', 0, th + (H - th) / 2, -D / 2 + 37, W * 0.62 - 50, H - th - 50, 6),
    ]
  },

  // 전신거울: 세워 둔 긴 거울 + 받침
  mirror: (W, D, H) => [
    box('main', 0, 20, 0, W * 0.9, 40, D),
    box('main', 0, H / 2 + 20, -D / 2 + 25, W, H - 40, 40),
    box('mirror', 0, H / 2 + 20, -D / 2 + 48, W - 60, H - 100, 6),
  ],

  // 행거: 양쪽 기둥 + 위 봉 + 걸린 옷 + 아래 선반
  hanger: (W, D, H) => {
    const parts: Part[] = [
      box('metal', -W / 2 + 20, 15, 0, 40, 30, D),
      box('metal', W / 2 - 20, 15, 0, 40, 30, D),
      cyl('metal', -W / 2 + 20, H / 2, 0, 30, H),
      cyl('metal', W / 2 - 20, H / 2, 0, 30, H),
      cyl('metal', 0, H - 30, 0, 26, W - 40, 'x'), // 옷 거는 봉
      box('main', 0, 260, 0, W - 60, 20, D - 40), // 아래 선반
    ]
    const tones: Tone[] = ['accent', 'book2', 'main', 'book1', 'accent', 'book3']
    const n = Math.max(1, Math.floor((W - 160) / 120))
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + 80 + ((W - 160) * (i + 0.5)) / n
      const len = H * (i % 2 === 0 ? 0.48 : 0.36)
      parts.push(box(tones[i % tones.length], x, H - 80 - len / 2, 0, 60, len, D * 0.82))
    }
    return parts
  },

  // 모션데스크: 상판 + T자 다리 2개 + 가로대 + 조작부
  standingDesk: (W, D, H) => [
    box('main', 0, H - 15, 0, W, 30, D),
    ...[-1, 1].flatMap((s) => [
      box('metal', s * (W / 2 - 160), (H - 30) / 2 + 15, 0, 70, H - 60, 70),
      box('metal', s * (W / 2 - 160), 15, 0, 70, 30, D - 60),
    ]),
    box('metal', 0, H - 70, 0, W - 330, 40, 40),
    box('dark', W / 2 - 180, H - 40, D / 2 - 40, 140, 20, 60),
  ],

  // 디지털 피아노: 다리 + 건반대 + 건반 + 뒤판 + 페달
  piano: (W, D, H) => [
    box('main', -W / 2 + 20, 360, 0, 40, 720, D),
    box('main', W / 2 - 20, 360, 0, 40, 720, D),
    box('main', 0, H / 2, -D / 2 + 50, W, H, 100),
    box('main', 0, 760, 20, W, 80, D - 40),
    box('white', 0, 810, D / 2 - 110, W - 100, 22, 180),
    box('dark', 0, 30, -D / 2 + 170, W * 0.28, 60, 120),
  ],

  // 아일랜드·홈바: 수납장 + 넓은 상판 + 문
  counter: (W, D, H) => {
    const n = Math.max(2, Math.round(W / 450))
    const dw = (W - 40) / n
    const parts: Part[] = [box('main', 0, (H - 40) / 2, -20, W - 40, H - 40, D - 80), box('accent', 0, H - 20, 0, W, 40, D)]
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + 20 + dw * (i + 0.5)
      parts.push(box('main', x, (H - 40) / 2, D / 2 - 55, dw - 8, H - 80, 10))
      parts.push(box('dark', x + dw / 2 - 40, H - 140, D / 2 - 46, 12, 120, 12))
    }
    return parts
  },

  // 세로로 긴 가전 (공기청정기·스탠드 에어컨): 몸통 + 위쪽 송풍구 + 표시창
  tower: (W, D, H) => [
    box('main', 0, H / 2, 0, W, H, D),
    box('accent', 0, H - 6, 0, W - 40, 14, D - 40),
    box('accent', 0, H * 0.72, D / 2 + 1, W - 60, H * 0.32, 4),
    box('screen', 0, H * 0.5, D / 2 + 2, Math.min(90, W * 0.3), 40, 4),
  ],

  // 선풍기: 받침 + 기둥 + 모터 + 날개 덮개
  fan: (W, D, H) => [
    cyl('dark', 0, 20, 0, Math.min(W, D) * 0.7, 40),
    cyl('metal', 0, 40 + (H - W / 2 - 80) / 2, 0, 30, H - W / 2 - 80),
    box('main', 0, H - W / 2, -60, 120, 140, 150),
    cyl('accent', 0, H - W / 2, 40, W, 60, 'z'),
    cyl('main', 0, H - W / 2, 75, W * 0.18, 20, 'z'),
  ],

  // 납작한 원통 (로봇청소기 등)
  puck: (W, _D, H) => [cyl('main', 0, H * 0.42, 0, W, H * 0.84), cyl('accent', 0, H * 0.9, 0, W * 0.35, H * 0.14)],

  // 펜던트 조명: 천장 덮개 + 줄 + 갓 (부품 좌표 0~H, 그릴 때 천장 높이에 맞춰 올림)
  pendant: (W, _D, H) => [
    cyl('main', 0, H - 15, 0, 120, 30),
    cyl('dark', 0, 260 + (H - 290) / 2, 0, 12, H - 290),
    cyl('main', 0, 200, 0, W * 0.35, 120),
    cyl('glow', 0, 90, 0, W, 180),
  ],

  // 캣타워: 받침 + 기둥 2개 + 층판 + 숨숨집
  catTower: (W, D, H) => [
    box('main', 0, 30, 0, W, 60, D),
    cyl('accent', -W * 0.3, H / 2, 0, 100, H - 60),
    cyl('accent', W * 0.25, (H * 0.65) / 2 + 30, D * 0.1, 90, H * 0.65 - 60),
    box('main', W * 0.05, H * 0.38, 0, W * 0.85, 30, D * 0.8),
    box('main', 0, H * 0.65, 0, W * 0.7, 30, D * 0.75),
    box('main', -W * 0.25, H - 15, 0, W * 0.5, 30, D * 0.6),
    box('main', W * 0.2, 60 + 150, 0, W * 0.5, 300, D * 0.7), // 숨숨집
    cyl('dark', W * 0.2, 60 + 140, D * 0.35 + 3, 150, 6, 'z'),
  ],

  // 스탠드 옷걸이: 받침 + 기둥 + 고리 + 걸린 목도리
  coatStand: (W, _D, H) => [
    cyl('dark', 0, 15, 0, W * 0.7, 30),
    cyl('main', 0, H / 2, 0, 40, H),
    ...[0, 1, 2, 3].map((i) => ball('main', Math.sin((i * Math.PI) / 2) * 110, H - 120, Math.cos((i * Math.PI) / 2) * 110, 50)),
    box('accent', 120, H - 420, 0, 50, 560, 200),
  ],

  // 사다리 선반: 뒤쪽 기둥 2개 + 아래로 갈수록 깊어지는 선반 + 소품
  ladderShelf: (W, D, H) => {
    const parts: Part[] = [box('main', -W / 2 + 20, H / 2, -D / 2 + 20, 40, H, 40), box('main', W / 2 - 20, H / 2, -D / 2 + 20, 40, H, 40)]
    const n = 4
    for (let i = 0; i < n; i++) {
      const d = D * (0.45 + (0.55 * (n - 1 - i)) / (n - 1)) // 맨 아래가 가장 깊다
      const y = 120 + ((H - 300) * i) / (n - 1)
      parts.push(box('main', 0, y, -D / 2 + d / 2, W - 80, 24, d))
      parts.push(box(i % 2 ? 'book2' : 'accent', -W * 0.15, y + 110, -D / 2 + d * 0.45, W * 0.35, 200, d * 0.6))
    }
    return parts
  },

  // 2층 침대: 기둥 4개 + 아래·위 침대 + 위쪽 난간 + 사다리
  bunkBed: (W, D, H) => {
    const lower = 250
    const upper = H * 0.6
    const parts: Part[] = [...legs('main', W / 2 - 35, D / 2 - 35, H, 70)]
    for (const y of [lower, upper]) {
      parts.push(box('main', 0, y, 0, W, 140, D))
      parts.push(box('white', 0, y + 160, 0, W - 90, 180, D - 90))
      parts.push(box('accent', 0, y + 260, D * 0.15, W - 70, 24, D * 0.6))
      parts.push(box('white', 0, y + 300, -D / 2 + 260, W * 0.6, 90, 340))
    }
    parts.push(box('main', -W / 2 + 20, upper + 380, 0, 40, 160, D - 70)) // 난간
    parts.push(box('main', W / 2 - 20, upper + 380, -D * 0.15, 40, 160, D * 0.6))
    for (let i = 1; i <= 4; i++) parts.push(box('main', W / 2 - 20, lower + ((upper - lower + 200) * i) / 5, D / 2 - 330, 40, 30, 400)) // 사다리 발판
    return parts
  },

  // 싱크대: 수납장 + 상판 + 개수대 + 수전 + 쿡탑
  sinkCounter: (W, D, H) => [
    ...builders.counter(W, D, H),
    box('metal', -W / 4, H + 2, 10, Math.min(700, W * 0.35), 6, D * 0.62),
    box('dark', -W / 4, H + 4, 10, Math.min(620, W * 0.3), 6, D * 0.52),
    cyl('metal', -W / 4, H + 140, -D / 2 + 80, 30, 280),
    box('metal', -W / 4, H + 270, -D / 2 + 160, 30, 30, 170),
    box('screen', W / 4, H + 4, 10, Math.min(600, W * 0.3), 6, D * 0.75),
  ],

  // 욕조: 바깥 몸통 + 물 + 수전
  bathtub: (W, D, H) => [
    box('white', 0, H / 2, 0, W, H, D),
    box('accent', 0, H - 50, 0, W - 160, 20, D - 160),
    cyl('metal', -W / 2 + 60, H + 90, 0, 30, 180),
    box('metal', -W / 2 + 120, H + 170, 0, 140, 30, 30),
  ],

  // 변기: 물탱크 + 받침 + 둥근 몸통 + 시트
  toilet: (W, D, H) => [
    box('white', 0, H - 200, -D / 2 + 100, W * 0.9, 400, 200),
    cyl('white', 0, 100, D * 0.05, W * 0.5, 200),
    blob('white', 0, 260, D * 0.1, W, 300, D * 0.68),
    blob('accent', 0, 410, D * 0.1, W * 0.96, 30, D * 0.64),
  ],

  // 세면대: 하부장 + 세면볼 + 수전
  washbasin: (W, D, H) => [
    box('main', 0, (H - 150) / 2, -10, W, H - 150, D - 20),
    box('accent', 0, (H - 150) / 2, D / 2 - 25, W - 30, H - 190, 10),
    box('white', 0, H - 75, 0, W, 150, D),
    blob('dark', 0, H - 10, 20, W * 0.6, 30, D * 0.55),
    cyl('metal', 0, H + 100, -D / 2 + 60, 30, 200),
    box('metal', 0, H + 190, -D / 2 + 120, 30, 30, 120),
  ],

  // 아기 침대: 기둥 + 매트리스 + 양옆 살 + 앞뒤 판
  crib: (W, D, H) => {
    const base = 320
    const parts: Part[] = [
      ...legs('main', W / 2 - 25, D / 2 - 25, H, 50),
      box('main', 0, base, 0, W, 60, D),
      box('white', 0, base + 90, 0, W - 60, 120, D - 60),
      box('main', 0, base + (H - base) / 2, -D / 2 + 15, W, H - base, 30),
      box('main', 0, base + (H - base) / 2, D / 2 - 15, W, H - base, 30),
    ]
    for (const s of [-1, 1]) {
      parts.push(box('main', s * (W / 2 - 20), H - 20, 0, 40, 40, D))
      for (let z = -D / 2 + 110; z < D / 2 - 80; z += 110) parts.push(cyl('main', s * (W / 2 - 20), base + (H - 40 - base) / 2, z, 24, H - 40 - base))
    }
    return parts
  },

  // 러닝머신: 발판 + 벨트 + 양쪽 기둥 + 계기판
  treadmill: (W, D, H) => [
    box('dark', 0, 90, 0, W * 0.85, 180, D),
    box('screen', 0, 184, D * 0.05, W * 0.6, 8, D * 0.82),
    box('main', -W / 2 + 30, 180 + (H - 180) / 2, -D / 2 + 150, 60, H - 180, 60),
    box('main', W / 2 - 30, 180 + (H - 180) / 2, -D / 2 + 150, 60, H - 180, 60),
    box('main', 0, H - 100, -D / 2 + 180, W, 200, 260),
    box('accent', 0, H - 60, -D / 2 + 300, W * 0.4, 110, 10),
  ],
}

/** 모양 + 치수 → 부품 목록 */
export const buildParts = (shape: ShapeId, W: number, D: number, H: number): Part[] => builders[shape](W, D, H)

/** 부품의 색 역할 → 실제 색 */
export function toneColor(tone: Tone, main: string, accent: string): string {
  switch (tone) {
    case 'main': return main
    case 'accent':
    case 'glow':
    case 'glass': return accent
    case 'dark': return shade(main, -0.4)
    case 'metal': return '#a1a1aa'
    case 'screen': return '#1f2125'
    case 'white': return '#f5f3ee'
    case 'leaf': return '#5c8a50'
    case 'wood': return '#7a5c40'
    case 'book1': return '#b5544a'
    case 'book2': return '#4f6f8f'
    case 'book3': return '#d9b65c'
    case 'mirror': return '#cfdfe8'
  }
}
