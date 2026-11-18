// 프로그램 전체에서 쓰는 "데이터 모양" 정의.
// 길이는 내부적으로 전부 mm(밀리미터)로 저장한다. (화면에 보여줄 때만 m·cm로 바꿈)
import type { Site } from './site'
import type { Measurement } from './measure'

/** 무늬 종류 */
export type PatternId = 'solid' | 'stripe' | 'check' | 'dot' | 'brick' | 'tile' | 'plank' | 'terrazzo'

/** 마감재(벽지·장판) 한 가지: 무늬 + 색 2개 + 무늬 크기 */
export type Finish = {
  pattern: PatternId
  color: string // 바탕색
  accent: string // 무늬색
  size: number // 무늬 한 칸의 실제 크기 (mm)
}

/** 평면도에 놓인 직사각형 방 하나 */
export type RoomShape = {
  id: string
  name: string
  x: number // 왼쪽 위 모서리 위치
  y: number
  width: number // 가로
  depth: number // 세로
  wall: Finish // 벽지
  floor: Finish // 장판
  open?: boolean // true면 옆방과 벽 없이 이어진다 (ㄱ자 방 만들 때)
}

/** 방의 네 변: 북(위)·동(오른쪽)·남(아래)·서(왼쪽) */
export type Side = 'N' | 'E' | 'S' | 'W'

export type WallItemKind = 'door' | 'window' | 'outlet'

/** 벽에 붙는 것: 문·창문·콘센트. "어느 방의 어느 변, 모서리에서 얼마나 떨어진 곳"으로 위치를 적는다 */
export type WallItem = {
  id: string
  kind: WallItemKind
  roomId: string
  side: Side
  offset: number // 변의 시작(왼쪽 또는 위쪽) 모서리에서 중심까지 거리
  width: number
  height: number
  sill: number // 바닥에서 아랫부분까지 높이 (문은 0)
  flip?: boolean // 문: 경첩이 반대쪽
  outward?: boolean // 문: 방 바깥쪽으로 열림
  steel?: boolean // 문: 철문
  double?: boolean // 문: 양문 (가운데에서 양쪽으로 여는 두 짝)
}

export type Point = { x: number; y: number }

/** 전선: 바닥을 따라가는 꺾은선 */
export type Wire = { id: string; points: Point[] }

/** 메모: 원하는 자리에 찍는 점 + 글 */
export type Note = { id: string; x: number; y: number; text: string }

/** 가구 모양 종류 (박스가 아닌 실제 형태) */
export type ShapeId =
  | 'box'
  | 'chair'
  | 'officeChair'
  | 'gamingChair'
  | 'stool'
  | 'sofa'
  | 'bed'
  | 'table'
  | 'roundTable'
  | 'desk'
  | 'panelDesk'
  | 'wardrobe'
  | 'bookshelf'
  | 'tvUnit'
  | 'lamp'
  | 'plant'
  | 'rug'
  | 'fridge'
  | 'drawers'
  | 'washer'
  | 'powerStrip'
  | 'ceilingLight'
  | 'standbyMe'
  | 'cornerSofa'
  | 'recliner'
  | 'beanbag'
  | 'cubeShelf'
  | 'mattress'
  | 'vanity'
  | 'mirror'
  | 'hanger'
  | 'standingDesk'
  | 'piano'
  | 'counter'
  | 'tower'
  | 'fan'
  | 'puck'
  | 'pendant'
  | 'catTower'
  | 'coatStand'
  | 'ladderShelf'
  | 'bunkBed'
  | 'sinkCounter'
  | 'bathtub'
  | 'toilet'
  | 'washbasin'
  | 'crib'
  | 'treadmill'
  | 'computer'
  | 'pcTower'
  | 'laptop'
  | 'solderStation'
  | 'wallMirror'
  | 'roundMirror'
  | 'waterCooler'
  | 'openCabinet'
  | 'steelShelf'
  | 'panelLegDesk'
  | 'fridgeTopFreezer'
  | 'glassCabinet'
  | 'wineCellar'
  | 'topLoader'
  | 'vacuumStand'
  | 'speaker'
  | 'petHouse'
  | 'partsCabinet'
  | 'printer3d'
  | 'printer'
  | 'microwave'
  | 'showerCaddy'

/** 가구 라이브러리에 들어있는 "부품" (KiCad의 심볼+풋프린트 같은 것) */
export type FurnitureLibraryItem = {
  id: string
  name: string
  category: string
  shape: ShapeId
  width: number // 폭 (W)
  depth: number // 깊이 (D)
  height: number // 높이 (H)
  color: string // 본체 색
  accent: string // 포인트 색 (쿠션, 문짝 등)
  layer: 'furniture' | 'electric' // 어느 보기(레이어)에 속하는지
  mount?: 'ceiling' // 천장에 다는 물건
  base?: number // 바닥에서 띄운 높이 (mm). 책상 위 물건·벽걸이 거울 등
  light?: boolean // 빛을 내는 조명인지
}

/** 방에 실제로 배치된 가구 하나 */
export type FurnitureInstance = {
  id: string
  libraryId: string // 어떤 라이브러리 가구인지
  x: number // 가구 중심 위치
  y: number
  rotation: number // 회전 각도 (0, 90, 180, 270)
  color?: string // 색을 바꿨을 때만 저장
  accent?: string
  width?: number // 크기를 바꿨을 때만 저장 (mm)
  depth?: number
  height?: number
  base?: number // 바닥에서 띄운 높이를 바꿨을 때만 저장 (mm)
}

/** 저장 파일(JSON) 한 개에 들어가는 전체 내용 */
export type Project = {
  version: 3
  wallHeight: number // 천장 높이
  north: number // 평면도 위쪽이 가리키는 방위 (0 = 북, 90 = 동, 180 = 남, 270 = 서)
  rooms: RoomShape[]
  wallItems: WallItem[]
  furniture: FurnitureInstance[]
  wires: Wire[]
  notes: Note[]
  site?: Site // 집의 실제 위치 (창밖 풍경용, 정했을 때만)
  measures?: Measurement[] // 줄자로 잰 것들 (지우기 전까지 남는다)
}

/** 지금 선택된 것 */
export type Selection = { type: 'room' | 'furniture' | 'wallItem' | 'wire' | 'note' | 'measure'; id: string } | null

/** 마우스 도구: 선택(기본) / 전선 그리기 / 메모 찍기 / 줄자 */
export type Tool = 'select' | 'wire' | 'note' | 'measure'

/** 레이어 보기: KiCad에서 앞면·뒷면만 보듯, 보고 싶은 종류만 보기 */
export type LayerView = 'all' | 'furniture' | 'electric' | 'structure'

export type Season = 'summer' | 'equinox' | 'winter'

/** 햇빛·조명 설정 */
export type Lighting = {
  enabled: boolean // 햇빛·그림자 효과 켜기
  time: number // 시각 (시 단위, 예: 14.5 = 오후 2시 30분)
  season: Season
  night: boolean // 밤 (해 없음)
  lamps: boolean // 실내 조명 켜기
}

export type ViewMode = '3d' | '2d' | 'split'
export type ViewName = 'iso' | 'top' | 'side0' | 'side90' | 'side180' | 'side270'
