import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type {
  Finish, FurnitureInstance, LayerView, Lighting, Note, Point, Project, RoomShape, Selection, Tool, ViewMode, ViewName, WallItem,
} from './types'
import { DEFAULT_PROJECT, loadFromBrowser, saveToBrowser } from './project'
import { LIBRARY, findLibraryItem, resolveItem } from './library'
import {
  bounds, clampWallItem, contains, edgeLength, footprint, nearestEdge, newId, placeInPlan, roomRect, unionArea, wallItemSpan, wallPieces,
} from './plan'
import { smartSnap, type Box, type Guide } from './guides'
import { runChecks, type Issue } from './drc'
import { daylight, sunDirection, sunPatches } from './sun'
import { WALL_ITEM_PRESETS, type WallItemPreset } from './structures'
import { furnitureThumbnails } from './thumbnails'
import { snap, toPyeong } from './units'
import Scene3D, { type Outside, type Visible, type WalkState } from './components/Scene3D'
import type { WalkAction, WalkView } from './components/WalkControls'
import WalkBar from './components/WalkBar'
import SitePanel from './components/SitePanel'
import { useSurroundings } from './useSurroundings'
import { DEFAULT_BODY_HEIGHT, bodySize } from './walk'
import { distance, type MeasureState, type P3 } from './measure'
import Plan2D from './components/Plan2D'
import Header from './components/Header'
import Rail, { type Section } from './components/Rail'
import CanvasBar, { LAYERS } from './components/CanvasBar'
import Compass from './components/Compass'
import RoomsPanel from './components/RoomsPanel'
import FurniturePanel from './components/FurniturePanel'
import FinishPanel from './components/FinishPanel'
import OpeningsPanel from './components/OpeningsPanel'
import ElectricPanel from './components/ElectricPanel'
import SunPanel from './components/SunPanel'
import DrcPanel from './components/DrcPanel'
import NotesPanel from './components/NotesPanel'
import RecommendPanel from './components/RecommendPanel'
import SelectionPanel from './components/SelectionPanel'
import { GroupCard, NoteCard, WallItemCard, WireCard } from './components/ItemCard'
import type { ViewRequest } from './components/CameraRig'

const BODY_KEY = 'interior-planner:body-height'

/** 걷는 사람의 키: 예전에 바꿔 둔 값이 있으면 그것, 없으면 170cm */
function loadBodyHeight() {
  try {
    const v = Number(localStorage.getItem(BODY_KEY))
    return v >= 1000 && v <= 2200 ? v : DEFAULT_BODY_HEIGHT
  } catch {
    return DEFAULT_BODY_HEIGHT
  }
}

/** 모든 가구를 (바뀐) 방 안으로 다시 맞춰 넣기 */
const refit = (furniture: FurnitureInstance[], rooms: RoomShape[]) => {
  const pieces = wallPieces(rooms)
  return furniture.map((f) => {
    const item = resolveItem(f)
    return item ? placeInPlan(f, item, rooms, pieces) : f
  })
}

/** 문·창문·콘센트를 (바뀐) 방의 변 안으로 다시 맞추고, 사라진 방의 것은 지운다 */
const refitWallItems = (items: WallItem[], rooms: RoomShape[]) =>
  items.flatMap((i) => {
    const room = rooms.find((r) => r.id === i.roomId)
    return room ? [clampWallItem(i, room)] : []
  })

/** 가구가 바닥에서 차지하는 자리 (중심 + 크기) */
const boxOf = (f: FurnitureInstance): Box | null => {
  const item = resolveItem(f)
  if (!item) return null
  const { w, d } = footprint(item, f.rotation)
  return { x: f.x, y: f.y, w, d }
}

/** 레이어 보기 → 무엇을 보여줄지 */
const layerFlags = (layer: LayerView) => ({
  walls: true,
  furniture: layer === 'all' || layer === 'furniture',
  electric: layer === 'all' || layer === 'electric',
})

export default function App() {
  // useState: 화면에 영향을 주는 값. 바뀌면 화면이 자동으로 다시 그려진다
  const [project, setProject] = useState<Project>(loadFromBrowser) // 처음 켤 때 자동 저장분 불러오기
  const [selection, setSelectionOnly] = useState<Selection>(null)
  const [multi, setMulti] = useState<string[]>([]) // Ctrl+클릭으로 함께 고른 가구들 (2개 이상일 때만)
  const clipboard = useRef<{ items: FurnitureInstance[]; pastes: number } | null>(null) // Ctrl+C로 복사한 가구
  const [guides, setGuides] = useState<Guide[]>([]) // 지금 떠 있는 스마트 가이드
  const [mode, setMode] = useState<ViewMode>('3d')
  const [viewRequest, setViewRequest] = useState<ViewRequest | null>(null)
  const [sceneKey, setSceneKey] = useState(0) // 불러오기 때 방 목록 패널을 새로 시작시키는 번호
  const [section, setSection] = useState<Section>('rooms') // 왼쪽 메뉴에서 고른 것
  const [thumbs, setThumbs] = useState<Record<string, string>>({}) // 가구 미리보기 그림
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null) // 잠깐 떴다 사라지는 알림
  const [layer, setLayer] = useState<LayerView>('all')
  const [tool, setTool] = useState<Tool>('select')
  const [draft, setDraft] = useState<Point[] | null>(null) // 그리고 있는 전선의 점들
  const [measureStart, setMeasureStart] = useState<P3 | null>(null) // 줄자: 찍어 둔 시작점 (끝점을 기다리는 중)
  const [notesVisible, setNotesVisible] = useState(true)
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [lighting, setLighting] = useState<Lighting>({ enabled: false, time: 14, season: 'equinox', night: false, lamps: false })
  const cameraRef = useRef<THREE.Camera | null>(null)
  const [walkView, setWalkView] = useState<WalkView | null>(null) // 걷기 모드 (null = 꺼짐)
  const [bodyHeight, setBodyHeight] = useState(loadBodyHeight) // 걷는 사람의 키 (mm)
  const walkInput = useRef(new Set<WalkAction>()) // 지금 누르고 있는 걷기 단추들

  // 마우스를 빠르게 움직이면 화면이 다시 그려지기 전에 다음 이벤트가 올 수 있다.
  // 그래서 "가장 최신 프로젝트"를 ref에도 따로 들고 있는다.
  const latest = useRef(project)

  // ───────── 되돌리기 (Ctrl+Z) ─────────
  // 바뀌기 전 프로젝트를 쌓아 둔다. 마우스를 한 번 누르고 떼는 동안(끌기)의 변화는 한 번으로 친다
  const past = useRef<Project[]>([])
  const future = useRef<Project[]>([])
  const newStep = useRef(true) // 다음 변경은 새 되돌리기 단계인가
  const [history, setHistory] = useState({ undo: 0, redo: 0 }) // 단추를 켜고 끄려고 개수만 화면에 알린다
  const syncHistory = () => setHistory({ undo: past.current.length, redo: future.current.length })
  useEffect(() => {
    // 마우스를 누르거나 키를 누를 때마다 "여기서부터 새 단계"
    const mark = (e: Event) => {
      if (!(e instanceof KeyboardEvent && e.repeat)) newStep.current = true
    }
    window.addEventListener('pointerdown', mark, true)
    window.addEventListener('keydown', mark, true)
    return () => {
      window.removeEventListener('pointerdown', mark, true)
      window.removeEventListener('keydown', mark, true)
    }
  }, [])

  const commit = (next: Project) => {
    if (next === latest.current) return
    if (newStep.current) {
      past.current.push(latest.current)
      if (past.current.length > 100) past.current.shift() // 너무 많이 쌓이지 않게 최근 100번까지만
      newStep.current = false
    }
    future.current = []
    latest.current = next
    setProject(next)
    syncHistory()
  }

  /** 되돌리기(back = true) / 다시 하기 */
  const travel = (back: boolean) => {
    const from = back ? past.current : future.current
    const to = back ? future.current : past.current
    const target = from.pop()
    if (!target) return
    to.push(latest.current)
    latest.current = target
    setProject(target)
    newStep.current = true
    setGuides([])
    setDraft(null)
    setMeasureStart(null)
    syncHistory()
  }

  /** 하나만 고르기 (함께 고른 무리는 풀린다) */
  const setSelection = (next: Selection) => {
    setSelectionOnly(next)
    setMulti([])
  }

  /** 가구 여러 개를 한꺼번에 고르기 */
  const selectMany = (ids: string[]) => {
    setSelectionOnly(ids.length ? { type: 'furniture', id: ids[ids.length - 1] } : null)
    setMulti(ids.length >= 2 ? ids : [])
  }

  // project가 바뀔 때마다 브라우저에 자동 저장
  useEffect(() => saveToBrowser(project), [project])

  // 처음 한 번: 가구 미리보기 그림을 만들어 둔다
  useEffect(() => setThumbs(furnitureThumbnails(LIBRARY)), [])

  // 알림은 3초 뒤에 사라진다
  const showToast = (text: string, error = false) => setToast({ text, error })
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  const { rooms, furniture, wallItems, wires, notes } = project
  const find = <T extends { id: string }>(type: NonNullable<Selection>['type'], list: T[]) =>
    selection?.type === type ? list.find((o) => o.id === selection.id) : undefined
  const selectedRoom = find('room', rooms)
  const selectedFurniture = find('furniture', furniture)
  const selectedItem = selectedFurniture ? resolveItem(selectedFurniture) : undefined
  const selectedWallItem = find('wallItem', wallItems)
  const selectedWire = find('wire', wires)
  const selectedNote = find('note', notes)
  // 지금 고른 가구들 (Ctrl로 여러 개 골랐으면 전부, 아니면 하나)
  const groupIds = multi.length >= 2 ? multi.filter((id) => furniture.some((f) => f.id === id)) : selectedFurniture ? [selectedFurniture.id] : []
  const multiSelected = groupIds.length >= 2
  const measure: MeasureState = { list: project.measures ?? [], start: measureStart }

  // useMemo: 계산이 무거운 값은 재료(rooms 등)가 바뀔 때만 다시 계산
  const pieces = useMemo(() => wallPieces(rooms), [rooms])
  const issues = useMemo(() => runChecks(project, pieces), [project, pieces])
  const sun = useMemo(() => sunDirection(lighting.time, lighting.season, project.north), [lighting.time, lighting.season, project.north])
  const patches = useMemo(
    () => (lighting.enabled && !lighting.night ? sunPatches(project, pieces, sun) : []),
    [lighting.enabled, lighting.night, project, pieces, sun],
  )
  // 창밖 풍경: 집 위치가 정해져 있으면 주변 건물·위성사진을 받아 온다
  const houseBounds = bounds(rooms)
  const surroundings = useSurroundings(project.site, Math.hypot(houseBounds.w, houseBounds.d) / 2000 + 2)
  const outside: Outside | null =
    project.site?.show && (surroundings.buildings.length > 0 || surroundings.ground)
      ? { buildings: surroundings.buildings, ground: surroundings.ground, floor: project.site.floor }
      : null
  const walk: WalkState | null = walkView ? { view: walkView, body: bodySize(bodyHeight) } : null

  const visible: Visible = { ...layerFlags(layer), notes: notesVisible, expandNotes: notesExpanded }
  const shownIssues = layer === 'all' ? issues : []

  /** 물건을 놓을 방: 선택한 방 → 선택한 것이 있는 방 → 첫 번째 방 */
  const targetRoom = () => {
    const p = latest.current
    if (selectedRoom) return selectedRoom
    if (selectedWallItem) return p.rooms.find((r) => r.id === selectedWallItem.roomId) ?? p.rooms[0]
    if (selectedFurniture) return p.rooms.find((r) => contains(roomRect(r), selectedFurniture.x, selectedFurniture.y)) ?? p.rooms[0]
    return p.rooms[0]
  }

  // ───────── 방 ─────────

  /** 방 목록을 바꾸고, 가구와 문·창문을 새 방 모양에 맞춘다 */
  const commitRooms = (nextRooms: RoomShape[], nextFurniture = latest.current.furniture) => {
    const p = latest.current
    commit({ ...p, rooms: nextRooms, furniture: refit(nextFurniture, nextRooms), wallItems: refitWallItems(p.wallItems, nextRooms) })
  }

  const addRoom = () => {
    const p = latest.current
    const b = bounds(p.rooms)
    const last = p.rooms[p.rooms.length - 1]
    const room: RoomShape = {
      id: newId(),
      name: `방 ${p.rooms.length + 1}`,
      x: b.maxX, // 지금 있는 방들의 오른쪽에 붙여서 놓는다
      y: b.minY,
      width: 3000,
      depth: 3000,
      wall: last.wall,
      floor: last.floor,
    }
    commitRooms([...p.rooms, room])
    setSelection({ type: 'room', id: room.id })
    setViewRequest({ view: 'iso', nonce: Date.now() }) // 새 방까지 한눈에 보이게 시점을 다시 맞춘다
    return room.id
  }

  const updateRoom = (id: string, patch: Partial<RoomShape>) => {
    commitRooms(latest.current.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const deleteRoom = (id: string) => {
    const p = latest.current
    if (p.rooms.length <= 1) return
    commitRooms(p.rooms.filter((r) => r.id !== id))
    setSelection(null)
  }

  /** 2D 평면도에서 방을 끌어 옮기기. 다른 방의 모서리 근처에서는 착 붙는다 */
  const moveRoom = (id: string, wantX: number, wantY: number) => {
    const p = latest.current
    const room = p.rooms.find((r) => r.id === id)
    if (!room) return
    const others = p.rooms.filter((r) => r.id !== id)
    const NEAR = 150

    // 한 축에서 붙을 자리 찾기: 내 왼쪽/오른쪽 변 ↔ 다른 방의 왼쪽/오른쪽 변
    const snapEdge = (want: number, size: number, edges: number[]) => {
      let best: number | null = null
      for (const edge of edges) {
        for (const candidate of [edge, edge - size]) {
          if (Math.abs(candidate - want) <= NEAR && (best === null || Math.abs(candidate - want) < Math.abs(best - want))) {
            best = candidate
          }
        }
      }
      return best ?? snap(want, 100) // 붙을 곳이 없으면 10cm 모눈에 맞춤
    }
    const x = snapEdge(wantX, room.width, others.flatMap((o) => [o.x, o.x + o.width]))
    const y = snapEdge(wantY, room.depth, others.flatMap((o) => [o.y, o.y + o.depth]))
    const dx = x - room.x
    const dy = y - room.y
    if (dx === 0 && dy === 0) return

    // 그 방 안에 있던 가구는 방과 함께 옮긴다
    const rect = roomRect(room)
    const moved = p.furniture.map((f) => (contains(rect, f.x, f.y) ? { ...f, x: f.x + dx, y: f.y + dy } : f))
    commitRooms(p.rooms.map((r) => (r.id === id ? { ...r, x, y } : r)), moved)
  }

  /** 벽지·장판 바르기. 방을 선택했으면 그 방만, 아니면 모든 방 */
  const applyFinish = (kind: 'wall' | 'floor', finish: Finish) => {
    const p = latest.current
    commit({ ...p, rooms: p.rooms.map((r) => (!selectedRoom || r.id === selectedRoom.id ? { ...r, [kind]: finish } : r)) })
  }

  // ───────── 문·창문·콘센트 ─────────

  const addWallItem = (preset: WallItemPreset) => {
    const p = latest.current
    const room = targetRoom()
    // 처음 붙일 벽: 창문은 햇빛이 드는 남쪽 벽, 문은 그 맞은편, 콘센트는 왼쪽 벽.
    // 같은 벽에 이미 있으면 옆으로 비켜 놓는다
    const sides = ['S', 'E', 'N', 'W'] as const // 평면도 방위(0·90·180·270)별 남쪽 벽
    const south = sides[(Math.round(p.north / 90) % 4 + 4) % 4]
    const opposite = { S: 'N', N: 'S', E: 'W', W: 'E' } as const
    const side = preset.kind === 'window' ? south : preset.kind === 'door' ? opposite[south] : 'W'
    const same = p.wallItems.filter((i) => i.roomId === room.id && i.side === side).length
    const length = edgeLength(room, side)
    const item = clampWallItem(
      { id: newId(), kind: preset.kind, roomId: room.id, side, offset: length / 2 + same * (preset.width + 200), width: preset.width, height: Math.min(preset.height, p.wallHeight - preset.sill), sill: preset.sill },
      room,
    )
    commit({ ...p, wallItems: [...p.wallItems, item] })
    setSelection({ type: 'wallItem', id: item.id })
  }

  const changeWallItem = (id: string, patch: Partial<WallItem>) => {
    const p = latest.current
    commit({
      ...p,
      wallItems: p.wallItems.map((i) => {
        if (i.id !== id) return i
        const next = { ...i, ...patch }
        // 문은 바닥에 붙어 있고, 창문·콘센트는 바닥과 천장 사이에서만 움직인다
        next.sill = next.kind === 'door' ? 0 : Math.min(Math.max(0, next.sill), Math.max(0, p.wallHeight - next.height))
        const room = p.rooms.find((r) => r.id === next.roomId)
        return room ? clampWallItem(next, room) : i
      }),
    })
  }

  /** 2D에서 끌기: 마우스에서 가장 가까운 벽(방의 변)에 붙인다 */
  const moveWallItem = (id: string, x: number, y: number) => {
    const edge = nearestEdge(latest.current.rooms, x, y)
    if (edge) changeWallItem(id, { roomId: edge.roomId, side: edge.side, offset: snap(edge.offset) })
  }

  /** 3D에서 끌기: 같은 벽 위에서 옆으로(along), 위아래로(height) 움직인다 */
  const moveWallItemOnWall = (id: string, along: number, height: number) => {
    const p = latest.current
    const item = p.wallItems.find((i) => i.id === id)
    const room = item && p.rooms.find((r) => r.id === item.roomId)
    if (!item || !room) return
    const start = item.side === 'N' || item.side === 'S' ? room.x : room.y // 그 변이 시작하는 좌표
    changeWallItem(id, { offset: snap(along - start), sill: snap(height) })
  }

  // ───────── 가구 ─────────

  const addFurniture = (libraryId: string) => {
    const p = latest.current
    const item = findLibraryItem(libraryId)
    if (!item) return
    const room = targetRoom()
    const instance = placeInPlan(
      { id: newId(), libraryId, x: snap(room.x + room.width / 2), y: snap(room.y + room.depth / 2), rotation: 0 },
      item,
      p.rooms,
    )
    commit({ ...p, furniture: [...p.furniture, instance] })
    setSelection({ type: 'furniture', id: instance.id })
  }

  const changeFurniture = (id: string, change: (f: FurnitureInstance) => FurnitureInstance) => {
    const p = latest.current
    commit({
      ...p,
      furniture: p.furniture.map((f) => {
        if (f.id !== id) return f
        const next = change(f)
        const item = resolveItem(next) // 크기가 바뀌었을 수 있으니 바뀐 뒤 모습으로
        return item ? placeInPlan(next, item, p.rooms) : f
      }),
    })
  }

  /** 가구를 끌어서 옮기기: 스마트 가이드에 붙이고 → 안 붙은 축은 1cm 모눈 → 벽 밖으로 못 나가게 */
  const moveFurniture = (id: string, wantX: number, wantY: number) => {
    const p = latest.current
    const f = p.furniture.find((o) => o.id === id)
    const item = f && resolveItem(f)
    if (!f || !item) return
    const { w, d } = footprint(item, f.rotation)
    const members = multi.length >= 2 && multi.includes(id) ? multi : [id] // 함께 고른 무리 중 하나를 끌면 무리째
    const others = p.furniture.filter((o) => !members.includes(o.id)).map(boxOf).filter((b): b is Box => b !== null)
    const snapped = smartSnap({ x: wantX, y: wantY, w, d }, others, p.rooms.map(roomRect))
    const target = { ...f, x: snapped.x ?? snap(wantX), y: snapped.y ?? snap(wantY) }
    if (members.length >= 2) {
      const moved = shiftGroup(members, target.x - f.x, target.y - f.y)
      setGuides(snapped.guides.filter((g) => (g.axis === 'x' ? moved.dx === target.x - f.x : moved.dy === target.y - f.y)))
      return
    }
    const placed = placeInPlan(target, item, p.rooms)
    // 벽에 막혀서 붙으려던 자리에 못 갔으면 그 축의 안내선은 지운다
    setGuides(
      snapped.guides.filter((g) =>
        g.axis === 'x' ? Math.abs(placed.x - target.x) < 1 : Math.abs(placed.y - target.y) < 1,
      ),
    )
    if (placed.x !== f.x || placed.y !== f.y) {
      commit({ ...p, furniture: p.furniture.map((o) => (o.id === id ? placed : o)) })
    }
  }

  /**
   * 가구 무리를 함께 (dx, dy)만큼 옮긴다. 하나라도 벽에 막히면 무리 전체가 거기서 멈춘다 (모양이 흐트러지지 않게)
   * 돌려주는 값: 실제로 옮긴 거리
   */
  const shiftGroup = (ids: string[], dx: number, dy: number) => {
    const p = latest.current
    // 원하는 만큼(want) 중 실제로 갈 수 있는 만큼(got): 방향이 반대로 밀리면 0
    const limit = (want: number, got: number) => (want === 0 || Math.sign(got) !== Math.sign(want) ? 0 : Math.abs(got) < Math.abs(want) ? got : want)
    let ex = dx
    let ey = dy
    for (const f of p.furniture) {
      const item = ids.includes(f.id) ? resolveItem(f) : undefined
      if (!item) continue
      const placed = placeInPlan({ ...f, x: f.x + dx, y: f.y + dy }, item, p.rooms)
      ex = limit(ex, placed.x - f.x)
      ey = limit(ey, placed.y - f.y)
    }
    if (ex !== 0 || ey !== 0) {
      commit({ ...p, furniture: p.furniture.map((f) => (ids.includes(f.id) ? { ...f, x: f.x + ex, y: f.y + ey } : f)) })
    }
    return { dx: ex, dy: ey }
  }

  /** 고른 가구 무리를 가운데를 축으로 90° 돌린다 (가구끼리의 배치는 그대로) */
  const rotateGroup = () => {
    const p = latest.current
    const members = p.furniture.filter((f) => groupIds.includes(f.id))
    const xs = members.map((f) => f.x)
    const ys = members.map((f) => f.y)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
    commit({
      ...p,
      furniture: p.furniture.map((f) => {
        const item = groupIds.includes(f.id) ? resolveItem(f) : undefined
        if (!item) return f
        // 평면도는 y가 아래쪽이라, (x, y) → (-y, x)가 시계 방향 90°
        const turned = { ...f, x: snap(cx - (f.y - cy)), y: snap(cy + (f.x - cx)), rotation: (f.rotation + 90) % 360 }
        return placeInPlan(turned, item, p.rooms)
      }),
    })
  }

  /** 가구들을 같은 색·크기·방향 그대로 offset만큼 비켜서 붙여 넣고, 붙여 넣은 것들을 고른다 */
  const pasteFurniture = (items: FurnitureInstance[], offset: number) => {
    const p = latest.current
    const copies = items.flatMap((f) => {
      const item = resolveItem(f)
      return item ? [placeInPlan({ ...f, id: newId(), x: f.x + offset, y: f.y + offset }, item, p.rooms)] : []
    })
    if (copies.length === 0) return
    commit({ ...p, furniture: [...p.furniture, ...copies] })
    selectMany(copies.map((c) => c.id))
  }

  /** Ctrl+C: 고른 가구(들)를 기억해 둔다 */
  const copySelected = () => {
    const items = latest.current.furniture.filter((f) => groupIds.includes(f.id))
    if (items.length === 0) return
    clipboard.current = { items, pastes: 0 }
    showToast(`가구 ${items.length}개를 복사했어요 · Ctrl+V로 붙여 넣기`)
  }

  /** Ctrl+V: 복사한 가구를 붙여 넣는다. 여러 번 붙이면 30cm씩 더 비켜 놓는다 */
  const pasteClipboard = () => {
    const c = clipboard.current
    if (!c) {
      showToast('먼저 가구를 고르고 Ctrl+C로 복사해 주세요', true)
      return
    }
    c.pastes += 1
    pasteFurniture(c.items, 300 * c.pastes)
  }

  /** 가구 고르기. additive(Ctrl+클릭)면 무리에 더하거나 뺀다 */
  const pick = (next: Selection, additive = false) => {
    if (next?.type !== 'furniture') return setSelection(next)
    if (additive) {
      const current = groupIds.length ? groupIds : []
      selectMany(current.includes(next.id) ? current.filter((id) => id !== next.id) : [...current, next.id])
      return
    }
    // 무리 중 하나를 누르면 무리는 그대로 두고 (그대로 끌면 무리째 옮겨진다)
    if (multi.includes(next.id)) setSelectionOnly(next)
    else setSelection(next)
  }

  const rotateSelected = () => {
    if (multiSelected) rotateGroup()
    else if (selectedFurniture) changeFurniture(selectedFurniture.id, (f) => ({ ...f, rotation: (f.rotation + 90) % 360 }))
  }

  const duplicateSelected = () => {
    if (!selectedFurniture || !selectedItem) return
    const p = latest.current
    const copy = placeInPlan(
      { ...selectedFurniture, id: newId(), x: selectedFurniture.x + 300, y: selectedFurniture.y + 300 },
      selectedItem,
      p.rooms,
    )
    commit({ ...p, furniture: [...p.furniture, copy] })
    setSelection({ type: 'furniture', id: copy.id })
  }

  const recolorSelected = (colors: { color?: string; accent?: string }) => {
    if (!selectedFurniture) return
    changeFurniture(selectedFurniture.id, (f) => {
      const next = { ...f, ...colors }
      // "원래 색"으로 되돌릴 때는 항목 자체를 지운다
      if (next.color === undefined) delete next.color
      if (next.accent === undefined) delete next.accent
      return next
    })
  }

  /** 크기 바꾸기. 원래 크기와 같아지면 저장하지 않는다 (null이면 원래 크기로) */
  const resizeSelected = (size: { width?: number; depth?: number; height?: number } | null) => {
    if (!selectedFurniture) return
    const base = findLibraryItem(selectedFurniture.libraryId)
    if (!base) return
    changeFurniture(selectedFurniture.id, (f) => {
      const next = { ...f, ...(size ?? {}) }
      for (const key of ['width', 'depth', 'height'] as const) {
        if (size === null || next[key] === base[key]) delete next[key]
      }
      return next
    })
  }

  /** 방향키 이동. 3D에서는 "지금 보는 방향" 기준으로 위쪽 키 = 화면 안쪽 */
  const nudge = (right: number, forward: number, step: number) => {
    // 문·창문·콘센트: ←→ 벽을 따라 이동, ↑↓ 높이 (문은 바닥에 붙어 있어 높이는 그대로)
    if (selectedWallItem) {
      // 키를 빠르게 연달아 누를 때도 밀리지 않게 "가장 최신" 값에서 계산한다
      const now = latest.current.wallItems.find((i) => i.id === selectedWallItem.id)
      if (now) changeWallItem(now.id, { offset: now.offset + right * step, sill: now.sill + forward * step })
      return
    }
    if (!selectedFurniture) return
    let fx = 0
    let fy = -1 // 2D 평면도 기준: 위쪽 키 = 평면도 위쪽
    const camera = cameraRef.current
    if (mode === '3d' && camera) {
      const dir = camera.getWorldDirection(new THREE.Vector3())
      let vx = dir.x
      let vz = dir.z
      if (Math.hypot(vx, vz) < 0.3) {
        // 거의 수직으로 내려다볼 때는 화면의 위쪽 방향을 쓴다
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
        vx = up.x
        vz = up.z
      }
      // 가장 가까운 동서남북 방향으로 맞춘다
      if (Math.abs(vx) > Math.abs(vz)) [fx, fy] = [Math.sign(vx), 0]
      else [fx, fy] = [0, Math.sign(vz)]
    }
    const dx = (forward * fx + right * -fy) * step
    const dy = (forward * fy + right * fx) * step
    if (multiSelected) {
      shiftGroup(groupIds, dx, dy)
      return
    }
    changeFurniture(selectedFurniture.id, (f) => ({ ...f, x: f.x + dx, y: f.y + dy }))
  }

  // ───────── 전선·메모 ─────────

  /** 전선의 점을 붙일 만한 자리: 콘센트, 멀티탭, 조명 */
  const wireAnchors = (): Point[] => {
    const p = latest.current
    const anchors: Point[] = []
    for (const i of p.wallItems) {
      const room = p.rooms.find((r) => r.id === i.roomId)
      if (i.kind === 'outlet' && room) {
        const s = wallItemSpan(i, room)
        anchors.push({ x: s.cx, y: s.cy })
      }
    }
    for (const f of p.furniture) {
      const item = resolveItem(f)
      if (item && (item.layer === 'electric' || item.light)) anchors.push({ x: f.x, y: f.y })
    }
    return anchors
  }

  const addWirePoint = (x: number, y: number) => {
    const points = draft ?? []
    const last = points[points.length - 1]
    let next: Point = { x: snap(x), y: snap(y) }
    // 콘센트·멀티탭 근처면 거기에 붙이고, 아니면 앞 점과 가로·세로가 거의 맞을 때 반듯하게 맞춘다
    const anchor = wireAnchors().find((a) => Math.hypot(a.x - x, a.y - y) < 200)
    if (anchor) next = anchor
    else if (last) {
      if (Math.abs(next.x - last.x) < 80) next.x = last.x
      if (Math.abs(next.y - last.y) < 80) next.y = last.y
    }
    if (last && last.x === next.x && last.y === next.y) return // 같은 자리를 두 번 누른 경우
    setDraft([...points, next])
  }

  const finishWire = () => {
    if (draft && draft.length >= 2) {
      const p = latest.current
      const wire = { id: newId(), points: draft }
      commit({ ...p, wires: [...p.wires, wire] })
      setSelection({ type: 'wire', id: wire.id })
    }
    setDraft(null)
    setTool('select')
  }

  const addNote = (x: number, y: number) => {
    const p = latest.current
    const note: Note = { id: newId(), x: snap(x), y: snap(y), text: '' }
    commit({ ...p, notes: [...p.notes, note] })
    setSelection({ type: 'note', id: note.id })
    setNotesVisible(true)
    setTool('select')
  }

  const changeNote = (id: string, patch: Partial<Note>) => {
    const p = latest.current
    commit({ ...p, notes: p.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })
  }

  /** 도구를 든 채로 바닥(평면)을 눌렀을 때 */
  const planClick = (x: number, y: number) => {
    if (tool === 'wire') addWirePoint(x, y)
    else if (tool === 'note') addNote(x, y)
  }

  /** 줄자: 첫 번째 누름은 시작점, 두 번째 누름은 끝점 (다 재면 다음 줄자를 또 잴 수 있다) */
  const addMeasurePoint = (p: P3) => {
    if (!measureStart) return setMeasureStart(p)
    if (distance(measureStart, p) < 1) return // 같은 자리를 두 번 누른 경우
    const now = latest.current
    commit({ ...now, measures: [...(now.measures ?? []), { id: newId(), a: measureStart, b: p }] })
    setMeasureStart(null)
  }

  /** 잰 줄자 지우기: keep개만 남긴다 (0 = 모두 지우기) */
  const trimMeasures = (keep: number) => {
    const { measures: list = [], ...rest } = latest.current
    if (list.length === 0) return
    commit(keep > 0 ? { ...rest, measures: list.slice(0, keep) } : rest)
  }

  /** 줄자: 찍다 만 시작점 → 마지막으로 잰 것 순서로 지운다 */
  const undoMeasure = () => {
    if (measureStart) setMeasureStart(null)
    else trimMeasures((latest.current.measures?.length ?? 1) - 1)
  }

  const changeTool = (next: Tool) => {
    setTool(next)
    setDraft(null)
    setMeasureStart(null)
    if (next !== 'select') {
      setSelection(null)
      setLayer('all') // 전선·메모가 보이는 상태에서 그리게
    }
  }

  /** 선택한 것 지우기 (방은 방 목록에서만 지운다) */
  const deleteSelected = () => {
    if (!selection || selection.type === 'room') return
    const p = latest.current
    if (multiSelected) {
      commit({ ...p, furniture: p.furniture.filter((f) => !groupIds.includes(f.id)) })
      setSelection(null)
      return
    }
    const without = <T extends { id: string }>(list: T[]) => list.filter((o) => o.id !== selection.id)
    if (selection.type === 'furniture') commit({ ...p, furniture: without(p.furniture) })
    if (selection.type === 'wallItem') commit({ ...p, wallItems: without(p.wallItems) })
    if (selection.type === 'wire') commit({ ...p, wires: without(p.wires) })
    if (selection.type === 'note') commit({ ...p, notes: without(p.notes) })
    setSelection(null)
  }

  /** 2D 평면도에서 무언가를 끌어 옮길 때 */
  const moveOnPlan = (type: 'room' | 'furniture' | 'wallItem' | 'note', id: string, x: number, y: number) => {
    if (type === 'room') moveRoom(id, x, y)
    else if (type === 'furniture') moveFurniture(id, x, y)
    else if (type === 'wallItem') moveWallItem(id, x, y)
    else changeNote(id, { x: snap(x), y: snap(y) })
  }

  /** 하루 재생: 시각을 5분 앞으로. 해가 지면 다시 해 뜰 때로 */
  const stepTime = () =>
    setLighting((l) => {
      const { sunrise, sunset } = daylight(l.season)
      const next = l.time + 1 / 12
      return { ...l, night: false, time: next > sunset ? sunrise : Math.max(sunrise, next) }
    })

  /** 검사 목록에서 항목을 누르면 문제가 된 것을 선택하고 보이게 한다 */
  const pickIssue = (issue: Issue) => {
    setSelection(issue.target)
    setLayer('all')
  }

  // ───────── 파일 ─────────

  /** 파일에서 불러온 프로젝트로 통째로 바꾸기 */
  const replaceProject = (next: Project) => {
    commit({ ...next, furniture: refit(next.furniture, next.rooms), wallItems: refitWallItems(next.wallItems, next.rooms) })
    setSelection(null)
    setGuides([])
    setDraft(null)
    setTool('select')
    setSceneKey((k) => k + 1) // 방 목록의 펼침 상태를 처음으로
    setViewRequest({ view: 'iso', nonce: Date.now() }) // 새 집 전체가 보이게 시점을 맞춘다
  }

  // ───────── 걷기 모드 ─────────

  const startWalk = () => {
    if (mode === '2d') setMode('3d')
    changeTool('select')
    setSelection(null)
    setGuides([])
    setWalkView((v) => v ?? 'first')
  }

  const exitWalk = () => {
    setWalkView(null)
    setViewRequest({ view: 'iso', nonce: Date.now() }) // 다시 집 전체가 보이게
  }

  const changeBodyHeight = (height: number) => {
    setBodyHeight(height)
    try {
      localStorage.setItem(BODY_KEY, String(height))
    } catch {
      // 저장이 안 돼도 이번에는 그대로 쓴다
    }
  }

  // ───────── 단축키 ─────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 입력칸에 글자를 치는 중이면 단축키 무시
      const el = e.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return
      // Ctrl(맥은 ⌘) + C·V·A: 가구 복사·붙여넣기·모두 고르기
      // 자판 위치(code)로 보고, 없으면 글자로 (한글 모드면 ㅋ·ㅛ·ㅊ·ㅍ·ㅁ)
      const is = (code: string, ...keys: string[]) => e.code === code || keys.includes(e.key.toLowerCase())
      // Ctrl(맥은 ⌘) + Z: 되돌리기, Ctrl + Shift + Z 또는 Ctrl + Y: 다시 하기
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !walkView && (is('KeyZ', 'z', 'ㅋ') || is('KeyY', 'y', 'ㅛ'))) {
        e.preventDefault()
        travel(is('KeyZ', 'z', 'ㅋ') && !e.shiftKey)
        return
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && !walkView && tool === 'select') {
        if (is('KeyC', 'c', 'ㅊ') && groupIds.length > 0 && !window.getSelection()?.toString()) {
          e.preventDefault()
          copySelected()
        } else if (is('KeyV', 'v', 'ㅍ')) {
          e.preventDefault()
          pasteClipboard()
        } else if (is('KeyA', 'a', 'ㅁ') && furniture.length > 0) {
          e.preventDefault()
          selectMany(furniture.map((f) => f.id))
        }
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      // 걷기 중에는 걷기용 키만 (걷기·둘러보기 키는 WalkControls가 처리)
      if (walkView) {
        if (e.code === 'Escape') exitWalk()
        if (e.code === 'KeyC') setWalkView(walkView === 'first' ? 'third' : 'first')
        return
      }
      const step = e.shiftKey ? 100 : 10 // 방향키: 1cm, Shift와 함께: 10cm
      // e.code는 한/영 입력 상태와 상관없이 "자판 위치"로 판단 (한글 모드에서 R = ㄱ)
      switch (e.code) {
        case 'KeyR': rotateSelected(); break
        case 'KeyV': {
          // 보기 전환: 전체 → 가구 → 전기 → 구조 → 전체 …
          const i = LAYERS.findIndex((l) => l.id === layer)
          setLayer(LAYERS[(i + 1) % LAYERS.length].id)
          break
        }
        case 'KeyM': changeTool(tool === 'measure' ? 'select' : 'measure'); break
        case 'Delete':
        case 'Backspace':
          if (tool === 'measure') undoMeasure()
          else deleteSelected()
          break
        case 'Enter': if (tool === 'wire') finishWire(); break
        case 'Escape':
          if (tool === 'measure' && measureStart) undoMeasure() // 찍다 만 시작점만 취소
          else if (tool !== 'select') changeTool('select')
          else setSelection(null)
          break
        case 'ArrowUp': nudge(0, 1, step); break
        case 'ArrowDown': nudge(0, -1, step); break
        case 'ArrowLeft': nudge(-1, 0, step); break
        case 'ArrowRight': nudge(1, 0, step); break
        default: return
      }
      if (e.code.startsWith('Arrow') && (selectedFurniture || selectedWallItem)) e.preventDefault() // 페이지가 스크롤되지 않게
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey) // 정리(청소)
  })

  const finishSource = selectedRoom ?? rooms[0]
  const target = targetRoom()
  const errorCount = issues.filter((i) => i.level !== 'info').length
  const wallItemRoom = selectedWallItem && rooms.find((r) => r.id === selectedWallItem.roomId)
  const hasWindows = wallItems.some((i) => i.kind === 'window')
  const deselect = () => setSelection(null)

  return (
    <div className="app">
      <Header mode={mode} project={project} onMode={(m) => {
          if (m === '2d' && walkView) setWalkView(null) // 평면도만 보면 걷기를 끝낸다
          setMode(m)
        }} onLoad={replaceProject} onReset={() => replaceProject(DEFAULT_PROJECT)} onToast={showToast}
        canUndo={history.undo > 0} canRedo={history.redo > 0} onUndo={() => travel(true)} onRedo={() => travel(false)} />

      <div className="body">
        <Rail section={section} badges={{ check: errorCount, notes: notes.length }} onSection={setSection} />

        <aside className="panel">
          {section === 'rooms' && (
            <RoomsPanel
              key={sceneKey}
              rooms={rooms}
              wallHeight={project.wallHeight}
              selection={selection}
              onSelect={(id) => setSelection({ type: 'room', id })}
              onChange={updateRoom}
              onAdd={addRoom}
              onDelete={deleteRoom}
              onWallHeight={(wallHeight) => commit({ ...latest.current, wallHeight })}
            />
          )}
          {section === 'furniture' && <FurniturePanel thumbs={thumbs} targetName={target.name} onAdd={addFurniture} />}
          {section === 'finish' && (
            <FinishPanel
              targetLabel={selectedRoom ? selectedRoom.name : rooms.length > 1 ? '모든 방' : rooms[0].name}
              wall={finishSource.wall}
              floor={finishSource.floor}
              onApply={applyFinish}
            />
          )}
          {section === 'openings' && <OpeningsPanel targetName={target.name} onAdd={addWallItem} />}
          {section === 'electric' && (
            <ElectricPanel
              thumbs={thumbs}
              wires={wires}
              wiring={tool === 'wire'}
              onAddWallItem={addWallItem}
              onAddFurniture={addFurniture}
              onToggleWire={() => changeTool(tool === 'wire' ? 'select' : 'wire')}
            />
          )}
          {section === 'sun' && (
            <SunPanel
              lighting={lighting}
              north={project.north}
              rooms={rooms}
              patches={patches}
              hasWindows={hasWindows}
              onChange={(patch) => setLighting((l) => ({ ...l, ...patch }))}
              onStep={stepTime}
              onNorth={(north) => commit({ ...latest.current, north })}
              onAddWindow={() => addWallItem(WALL_ITEM_PRESETS.find((p) => p.id === 'window-large')!)}
            />
          )}
          {section === 'site' && (
            <SitePanel
              site={project.site}
              north={project.north}
              rooms={rooms}
              status={surroundings.status}
              onChange={(site) => {
                const { site: _old, ...rest } = latest.current // eslint-disable-line @typescript-eslint/no-unused-vars
                commit(site ? { ...rest, site } : rest)
              }}
              onNorth={(north) => commit({ ...latest.current, north })}
              onWalk={startWalk}
              onRetry={surroundings.retry}
            />
          )}
          {section === 'check' && <DrcPanel issues={issues} onPick={pickIssue} />}
          {section === 'notes' && (
            <NotesPanel
              notes={notes}
              selection={selection}
              placing={tool === 'note'}
              visible={notesVisible}
              expanded={notesExpanded}
              onTogglePlacing={() => changeTool(tool === 'note' ? 'select' : 'note')}
              onVisible={setNotesVisible}
              onExpanded={setNotesExpanded}
              onSelect={(id) => {
                setSelection({ type: 'note', id })
                setNotesVisible(true)
              }}
            />
          )}
          {section === 'ideas' && <RecommendPanel pyeong={toPyeong(unionArea(rooms.map(roomRect)))} roomCount={rooms.length} />}
        </aside>

        <main className="stage">
          <div className="views">
            {mode !== '3d' && (
              <div className="view">
                <Plan2D
                  project={project}
                  pieces={pieces}
                  selection={selection}
                  multi={multiSelected ? groupIds : []}
                  guides={guides}
                  issues={shownIssues}
                  patches={patches}
                  visible={visible}
                  tool={tool}
                  draft={draft}
                  measure={measure}
                  onMeasure={addMeasurePoint}
                  onSelect={pick}
                  onPlanClick={planClick}
                  onFinishWire={finishWire}
                  onMove={moveOnPlan}
                  onDragEnd={() => setGuides([])}
                />
                {/* 평면도의 나침반은 고정: 북쪽이 가리키는 방향만 보여 준다 */}
                <Compass rotation={-project.north} />
              </div>
            )}
            {mode !== '2d' && (
              <div className="view">
                <Scene3D
                  project={project}
                  pieces={pieces}
                  selection={selection}
                  multi={multiSelected ? groupIds : []}
                  guides={guides}
                  issues={shownIssues}
                  visible={visible}
                  tool={tool}
                  draft={draft}
                  measure={measure}
                  onMeasure={addMeasurePoint}
                  lighting={lighting}
                  sun={sun}
                  patches={patches}
                  viewRequest={viewRequest}
                  cameraRef={cameraRef}
                  walk={walk}
                  walkInput={walkInput}
                  outside={outside}
                  onWalkFail={() => {
                    setWalkView(null)
                    showToast('설 자리가 없어요. 가구 사이에 몸 폭만큼 빈 바닥이 필요해요', true)
                  }}
                  onSelect={pick}
                  onFloorClick={(roomId, x, y) => (tool === 'select' ? setSelection({ type: 'room', id: roomId }) : planClick(x, y))}
                  onMoveFurniture={moveFurniture}
                  onMoveWallItem={moveWallItemOnWall}
                  onDragEnd={() => setGuides([])}
                />
              </div>
            )}
          </div>

          {/* 화면 위쪽 가운데: 지금 든 도구나 알아둘 점을 알려 주는 띠 */}
          {walkView ? null : tool !== 'select' ? (
            <div className="notice tool" role="status">
              {tool === 'wire'
                ? `전선 그리기 · 바닥을 차례로 눌러 주세요${draft ? ` (${draft.length}개)` : ''} · Enter로 끝, Esc로 취소`
                : tool === 'measure'
                  ? `줄자 · ${measureStart ? '끝점을 눌러 주세요' : '시작점을 눌러 주세요'} · 수평·수직 근처는 자동 맞춤 · Esc로 끝`
                  : '메모 찍기 · 메모할 자리를 눌러 주세요 · Esc로 취소'}
              {tool === 'measure' && measure.list.length > 0 && (
                <button className="btn sm" onClick={() => trimMeasures(0)}>
                  모두 지우기
                </button>
              )}
              {tool === 'wire' && draft && draft.length >= 2 && (
                <button className="btn primary sm" onClick={finishWire}>
                  완료
                </button>
              )}
            </div>
          ) : lighting.enabled && !lighting.night && !hasWindows ? (
            <div className="notice" role="status">
              창문이 없어서 햇빛이 들어오지 않아요
              <button className="btn primary sm" onClick={() => addWallItem(WALL_ITEM_PRESETS.find((p) => p.id === 'window-large')!)}>
                남쪽 벽에 창문 달기
              </button>
            </div>
          ) : null}

          {walkView ? (
            <WalkBar view={walkView} bodyHeight={bodyHeight} input={walkInput} onView={setWalkView} onBodyHeight={changeBodyHeight} onExit={exitWalk} />
          ) : (
            <CanvasBar
              mode={mode}
              layer={layer}
              measuring={tool === 'measure'}
              measureCount={measure.list.length}
              onClearMeasures={() => trimMeasures(0)}
              onView={(view: ViewName) => setViewRequest({ view, nonce: Date.now() })}
              onLayer={setLayer}
              onMeasure={() => changeTool(tool === 'measure' ? 'select' : 'measure')}
              onWalk={startWalk}
            />
          )}

          {/* 선택한 것의 속성 카드 (화면 오른쪽) */}
          {multiSelected && (
            <GroupCard
              names={groupIds.map((id) => {
                const f = furniture.find((o) => o.id === id)
                return (f && resolveItem(f)?.name) ?? '가구'
              })}
              onRotate={rotateGroup}
              onDuplicate={() => pasteFurniture(furniture.filter((f) => groupIds.includes(f.id)), 300)}
              onDelete={deleteSelected}
              onClose={deselect}
            />
          )}
          {!multiSelected && selectedFurniture && selectedItem && (
            <SelectionPanel
              key={selectedFurniture.id}
              instance={selectedFurniture}
              item={selectedItem}
              thumb={thumbs[selectedItem.id]}
              onRotate={rotateSelected}
              onDuplicate={duplicateSelected}
              onDelete={deleteSelected}
              onClose={deselect}
              onRecolor={recolorSelected}
              onResize={resizeSelected}
              onToast={showToast}
            />
          )}
          {selectedWallItem && wallItemRoom && (
            <WallItemCard
              key={selectedWallItem.id}
              item={selectedWallItem}
              room={wallItemRoom}
              onChange={(patch) => changeWallItem(selectedWallItem.id, patch)}
              onDelete={deleteSelected}
              onClose={deselect}
            />
          )}
          {selectedWire && <WireCard wire={selectedWire} onDelete={deleteSelected} onClose={deselect} />}
          {selectedNote && (
            <NoteCard key={selectedNote.id} note={selectedNote} onChange={(text) => changeNote(selectedNote.id, { text })} onDelete={deleteSelected} onClose={deselect} />
          )}

          {toast && (
            <div className={`toast ${toast.error ? 'error' : ''}`} role="status">
              {toast.text}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
