// 벽에 붙이는 것(문·창문·콘센트)의 기본 제공 목록
import type { WallItemKind } from './types'

export type WallItemPreset = {
  id: string
  name: string
  kind: WallItemKind
  width: number
  height: number
  sill: number // 바닥에서 아랫부분까지 높이
  steel?: boolean // 철문
  double?: boolean // 양문
}

export const WALL_ITEM_PRESETS: WallItemPreset[] = [
  { id: 'door', name: '방문', kind: 'door', width: 900, height: 2100, sill: 0 },
  { id: 'door-wide', name: '현관문', kind: 'door', width: 1000, height: 2100, sill: 0 },
  { id: 'door-steel', name: '철문', kind: 'door', width: 900, height: 2100, sill: 0, steel: true },
  { id: 'door-steel-double', name: '양문형 철문', kind: 'door', width: 1800, height: 2100, sill: 0, steel: true, double: true },
  { id: 'window', name: '창문', kind: 'window', width: 1500, height: 1200, sill: 900 },
  { id: 'window-small', name: '작은 창', kind: 'window', width: 800, height: 800, sill: 1200 },
  { id: 'window-large', name: '거실 통창', kind: 'window', width: 2400, height: 2000, sill: 150 },
  { id: 'outlet', name: '콘센트', kind: 'outlet', width: 80, height: 120, sill: 300 },
]

export const KIND_NAME: Record<WallItemKind, string> = { door: '문', window: '창문', outlet: '콘센트' }
export const SIDE_NAME = { N: '위쪽(북) 벽', E: '오른쪽(동) 벽', S: '아래쪽(남) 벽', W: '왼쪽(서) 벽' } as const
