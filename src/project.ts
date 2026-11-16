// 프로젝트 저장·불러오기 (JSON 파일 + 브라우저 자동 저장)
import type { FurnitureInstance, Project, Room } from './types'
import { findLibraryItem } from './library'

export const DEFAULT_PROJECT: Project = {
  version: 1,
  room: { width: 4000, depth: 3500, height: 2400 },
  furniture: [],
}

const STORAGE_KEY = 'interior-planner:project'

/** 프로젝트를 보기 좋은 JSON 글자로 바꾸기 */
export const toJson = (project: Project) => JSON.stringify(project, null, 2)

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
  if (!isObject(data) || data.version !== 1) throw new Error('이 프로그램의 저장 파일이 아니에요')

  const room = data.room
  if (!isObject(room) || !isNum(room.width) || !isNum(room.depth) || !isNum(room.height)) {
    throw new Error('방 크기 정보가 잘못됐어요')
  }
  if (!Array.isArray(data.furniture)) throw new Error('가구 목록이 잘못됐어요')

  const furniture: FurnitureInstance[] = data.furniture
    .filter(
      (f): f is FurnitureInstance =>
        isObject(f) &&
        typeof f.id === 'string' &&
        typeof f.libraryId === 'string' &&
        isNum(f.x) &&
        isNum(f.y) &&
        isNum(f.rotation) &&
        findLibraryItem(f.libraryId) !== undefined, // 모르는 가구는 건너뜀
    )
    .map(({ id, libraryId, x, y, rotation }) => ({ id, libraryId, x, y, rotation }))

  const cleanRoom: Room = { width: room.width, depth: room.depth, height: room.height }
  return { version: 1, room: cleanRoom, furniture }
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

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
