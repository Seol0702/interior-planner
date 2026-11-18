// 프로젝트 저장·불러오기 (JSON 파일 + 브라우저 자동 저장)
import type { Finish, FurnitureInstance, Note, PatternId, Project, RoomShape, Side, WallItem, Wire } from './types'
import { findLibraryItem } from './library'
import { ALL_PATTERNS, DEFAULT_FLOOR, DEFAULT_WALL } from './finishes'
import { isHex } from './colors'
import { newId } from './plan'
import type { Measurement } from './measure'

export const DEFAULT_PROJECT: Project = {
  version: 3,
  wallHeight: 2400,
  north: 0,
  rooms: [{ id: 'room-1', name: '거실', x: 0, y: 0, width: 4000, depth: 3500, wall: DEFAULT_WALL, floor: DEFAULT_FLOOR }],
  wallItems: [],
  furniture: [],
  wires: [],
  notes: [],
}

const STORAGE_KEY = 'interior-planner:project'

/** 프로젝트를 보기 좋은 JSON 글자로 바꾸기 */
export const toJson = (project: Project) => JSON.stringify(project, null, 2)

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** 마감재 정보가 이상하면 기본값으로 대신한다 */
function parseFinish(v: unknown, fallback: Finish): Finish {
  if (!isObject(v) || !ALL_PATTERNS.includes(v.pattern as PatternId) || !isHex(v.color)) return fallback
  return {
    pattern: v.pattern as PatternId,
    color: v.color,
    accent: isHex(v.accent) ? v.accent : fallback.accent,
    size: isNum(v.size) && v.size >= 20 && v.size <= 5000 ? v.size : fallback.size,
  }
}

function parseFurniture(list: unknown): FurnitureInstance[] {
  if (!Array.isArray(list)) throw new Error('가구 목록이 잘못됐어요')
  const result: FurnitureInstance[] = []
  for (const f of list) {
    if (!isObject(f) || typeof f.libraryId !== 'string' || !isNum(f.x) || !isNum(f.y)) continue
    if (!findLibraryItem(f.libraryId)) continue // 모르는 가구는 건너뜀
    const rotation = isNum(f.rotation) ? (((Math.round(f.rotation / 90) * 90) % 360) + 360) % 360 : 0
    const inst: FurnitureInstance = { id: typeof f.id === 'string' ? f.id : newId(), libraryId: f.libraryId, x: f.x, y: f.y, rotation }
    if (isHex(f.color)) inst.color = f.color
    if (isHex(f.accent)) inst.accent = f.accent
    for (const key of ['width', 'depth', 'height'] as const) {
      const v = f[key]
      if (isNum(v) && v >= 10 && v <= 10000) inst[key] = Math.round(v)
    }
    if (isNum(f.base) && f.base >= 0 && f.base <= 5000) inst.base = Math.round(f.base) // 바닥에서 띄운 높이
    if (f.locked === true) inst.locked = true // 고정
    result.push(inst)
  }
  return result
}

const validSize = (v: unknown): v is number => isNum(v) && v >= 500 && v <= 50000

/**
 * JSON 글자 → 프로젝트. 모양이 이상하면 오류를 던진다.
 * (다른 사람이 만든 파일이나 망가진 파일을 열 수도 있으니 꼼꼼히 검사)
 */
export function parseProject(text: string): Project {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('JSON 형식이 아닌 파일이에요')
  }
  if (!isObject(data)) throw new Error('이 프로그램의 저장 파일이 아니에요')

  // 예전(버전 1) 저장 파일: 방 하나짜리 → 새 형식으로 바꿔서 연다
  if (data.version === 1) {
    const room = data.room
    if (!isObject(room) || !validSize(room.width) || !validSize(room.depth) || !validSize(room.height)) {
      throw new Error('방 크기 정보가 잘못됐어요')
    }
    return {
      ...DEFAULT_PROJECT,
      wallHeight: room.height,
      rooms: [{ ...DEFAULT_PROJECT.rooms[0], width: room.width, depth: room.depth }],
      furniture: parseFurniture(data.furniture),
    }
  }

  if (data.version !== 2 && data.version !== 3) throw new Error('이 프로그램의 저장 파일이 아니에요')
  if (!Array.isArray(data.rooms)) throw new Error('방 정보가 잘못됐어요')
  const rooms: RoomShape[] = []
  for (const r of data.rooms) {
    if (!isObject(r) || !isNum(r.x) || !isNum(r.y) || !validSize(r.width) || !validSize(r.depth)) continue
    const room: RoomShape = {
      id: typeof r.id === 'string' ? r.id : newId(),
      name: typeof r.name === 'string' && r.name.trim() ? r.name.slice(0, 20) : `방 ${rooms.length + 1}`,
      x: r.x,
      y: r.y,
      width: r.width,
      depth: r.depth,
      wall: parseFinish(r.wall, DEFAULT_WALL),
      floor: parseFinish(r.floor, DEFAULT_FLOOR),
    }
    // 버전 2에서는 붙어 있는 방이 항상 벽 없이 이어졌다 → 그 모양을 그대로 유지
    if (data.version === 2 ? data.rooms.length > 1 : r.open === true) room.open = true
    rooms.push(room)
  }
  if (rooms.length === 0) throw new Error('방 정보가 잘못됐어요')
  const roomIds = new Set(rooms.map((r) => r.id))

  // 문·창문·콘센트
  const wallItems: WallItem[] = []
  for (const w of Array.isArray(data.wallItems) ? data.wallItems : []) {
    if (!isObject(w) || !['door', 'window', 'outlet'].includes(w.kind as string) || !['N', 'E', 'S', 'W'].includes(w.side as string)) continue
    if (typeof w.roomId !== 'string' || !roomIds.has(w.roomId) || !isNum(w.offset) || !isNum(w.width) || !isNum(w.height) || !isNum(w.sill)) continue
    if (w.width < 50 || w.width > 10000 || w.height < 50 || w.height > 6000 || w.sill < 0 || w.sill > 6000) continue
    const item: WallItem = {
      id: typeof w.id === 'string' ? w.id : newId(),
      kind: w.kind as WallItem['kind'],
      roomId: w.roomId,
      side: w.side as Side,
      offset: w.offset,
      width: w.width,
      height: w.height,
      sill: w.sill,
    }
    if (w.flip === true) item.flip = true
    if (w.outward === true) item.outward = true
    if (w.steel === true) item.steel = true
    if (w.double === true) item.double = true
    wallItems.push(item)
  }

  // 전선
  const wires: Wire[] = []
  for (const w of Array.isArray(data.wires) ? data.wires : []) {
    if (!isObject(w) || !Array.isArray(w.points)) continue
    const points = w.points.filter((p): p is { x: number; y: number } => isObject(p) && isNum(p.x) && isNum(p.y)).map((p) => ({ x: p.x, y: p.y }))
    if (points.length >= 2) wires.push({ id: typeof w.id === 'string' ? w.id : newId(), points })
  }

  // 메모
  const notes: Note[] = []
  for (const n of Array.isArray(data.notes) ? data.notes : []) {
    if (!isObject(n) || !isNum(n.x) || !isNum(n.y) || typeof n.text !== 'string') continue
    notes.push({ id: typeof n.id === 'string' ? n.id : newId(), x: n.x, y: n.y, text: n.text.slice(0, 500) })
  }

  return {
    version: 3,
    wallHeight: isNum(data.wallHeight) && data.wallHeight >= 1500 && data.wallHeight <= 6000 ? data.wallHeight : 2400,
    north: isNum(data.north) ? ((Math.round(data.north) % 360) + 360) % 360 : 0,
    rooms,
    wallItems,
    furniture: parseFurniture(data.furniture),
    wires,
    notes,
    ...parseSite(data.site),
    ...parseMeasures(data.measures),
  }
}

/** 줄자로 잰 것들 (이상한 것은 빼고) */
function parseMeasures(v: unknown): { measures?: Measurement[] } {
  if (!Array.isArray(v)) return {}
  const point = (p: unknown) => (isObject(p) && isNum(p.x) && isNum(p.y) && isNum(p.z) ? { x: p.x, y: p.y, z: p.z } : null)
  const measures: Measurement[] = []
  for (const m of v.slice(0, 200)) {
    if (!isObject(m)) continue
    const a = point(m.a)
    const b = point(m.b)
    if (a && b) measures.push({ id: typeof m.id === 'string' ? m.id : newId(), a, b })
  }
  return measures.length ? { measures } : {}
}

/** 집 위치 (없거나 이상하면 빼고 연다) */
function parseSite(v: unknown): { site?: Project['site'] } {
  if (!isObject(v) || !isNum(v.lat) || !isNum(v.lng) || Math.abs(v.lat) > 85 || Math.abs(v.lng) > 180) return {}
  const floor = isNum(v.floor) ? Math.min(80, Math.max(1, Math.round(v.floor))) : 1
  const site: NonNullable<Project['site']> = { lat: v.lat, lng: v.lng, floor, show: v.show !== false }
  if (typeof v.label === 'string' && v.label.trim()) site.label = v.label.slice(0, 120)
  return { site }
}

/** 프로젝트를 .json 파일로 내려받기 */
export function downloadProject(project: Project) {
  const blob = new Blob([toJson(project)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `interior-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** 브라우저에 자동 저장 (실패해도 프로그램은 계속 동작) */
export function saveToBrowser(project: Project) {
  try {
    localStorage.setItem(STORAGE_KEY, toJson(project))
  } catch {
    // 개인정보 보호 모드 등에서는 저장이 안 될 수 있음 → 조용히 넘어감
  }
}

/** 브라우저에 저장된 프로젝트 불러오기. 없거나 망가졌으면 기본값 */
export function loadFromBrowser(): Project {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    return text ? parseProject(text) : DEFAULT_PROJECT
  } catch {
    return DEFAULT_PROJECT
  }
}
