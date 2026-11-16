// 프로그램 전체에서 쓰는 "데이터 모양" 정의.
// 길이는 내부적으로 전부 mm(밀리미터)로 저장한다. (화면에 보여줄 때만 m·cm로 바꿈)

/** 무늬 종류 */
export type PatternId = 'solid' | 'stripe' | 'check' | 'dot' | 'brick' | 'tile' | 'plank'

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
}

/** 가구 모양 종류 (박스가 아닌 실제 형태) */
export type ShapeId =
  | 'box'
  | 'chair'
  | 'officeChair'
  | 'stool'
  | 'sofa'
  | 'bed'
  | 'table'
  | 'roundTable'
  | 'desk'
  | 'wardrobe'
  | 'bookshelf'
  | 'tvUnit'
  | 'lamp'
  | 'plant'
  | 'rug'
  | 'fridge'
  | 'drawers'
  | 'washer'

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
}

/** 저장 파일(JSON) 한 개에 들어가는 전체 내용 */
export type Project = {
  version: 2
  wallHeight: number // 천장 높이
  rooms: RoomShape[]
  furniture: FurnitureInstance[]
}

/** 지금 선택된 것 (방 또는 가구) */
export type Selection = { type: 'room' | 'furniture'; id: string } | null

export type ViewMode = '3d' | '2d' | 'split'
export type ViewName = 'iso' | 'top' | 'side0' | 'side90' | 'side180' | 'side270'
