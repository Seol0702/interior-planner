// 프로그램 전체에서 쓰는 "데이터 모양" 정의.
// 길이 단위는 전부 mm(밀리미터)로 통일한다.

/** 직사각형 방 (안쪽 치수) */
export type Room = {
  width: number // 가로 (x 방향)
  depth: number // 세로 (y 방향, 3D에서는 z축)
  height: number // 천장 높이
}

/** 가구 라이브러리에 들어있는 "부품" (KiCad의 심볼+풋프린트 같은 것) */
export type FurnitureLibraryItem = {
  id: string
  name: string
  category: string
  width: number // 폭 (W)
  depth: number // 깊이 (D)
  height: number // 높이 (H)
  color: string
}

/** 방에 실제로 배치된 가구 하나 */
export type FurnitureInstance = {
  id: string
  libraryId: string // 어떤 라이브러리 가구인지
  x: number // 가구 중심의 x 위치 (방 왼쪽 위 모서리 = 0)
  y: number // 가구 중심의 y 위치
  rotation: number // 회전 각도 (0, 90, 180, 270)
}

/** 저장 파일(JSON) 한 개에 들어가는 전체 내용 */
export type Project = {
  version: 1
  room: Room
  furniture: FurnitureInstance[]
}
