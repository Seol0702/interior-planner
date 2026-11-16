import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type {
  Finish, FurnitureInstance, LayerView, Lighting, Note, Point, Project, RoomShape, Selection, Tool, ViewMode, ViewName, WallItem,
} from './types'
import { DEFAULT_PROJECT, loadFromBrowser, saveToBrowser } from './project'
import { findLibraryItem } from './library'
import {
  bounds, clampWallItem, contains, edgeLength, footprint, nearestEdge, newId, placeInPlan, roomRect, unionArea, wallItemSpan, wallPieces,
} from './plan'
import { smartSnap, type Box, type Guide } from './guides'
import { runChecks, type Issue } from './drc'
import { sunDirection, sunPatches } from './sun'
import type { WallItemPreset } from './structures'
import { snap, toPyeong } from './units'
import Scene3D, { type Visible } from './components/Scene3D'
import Plan2D from './components/Plan2D'
import RoomsPanel from './components/RoomsPanel'
import LibraryPanel from './components/LibraryPanel'
import SelectionPanel from './components/SelectionPanel'
import { NoteCard, WallItemCard, WireCard } from './components/ItemCard'
import FilePanel from './components/FilePanel'
import SunPanel from './components/SunPanel'
import DrcPanel from './components/DrcPanel'
import NotesPanel from './components/NotesPanel'
import RecommendPanel from './components/RecommendPanel'
import ViewBar, { LAYERS } from './components/ViewBar'
import type { ViewRequest } from './components/CameraRig'

type SideTab = 'build' | 'check' | 'more'

/** 모든 가구를 (바뀐) 방 안으로 다시 맞춰 넣기 */
const refit = (furniture: FurnitureInstance[], rooms: RoomShape[]) => {
  const pieces = wallPieces(rooms)
  return furniture.map((f) => {
    const item = findLibraryItem(f.libraryId)
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
  const item = findLibraryItem(f.libraryId)
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
  const [selection, setSelection] = useState<Selection>(null)
  const [guides, setGuides] = useState<Guide[]>([]) // 지금 떠 있는 스마트 가이드
  const [mode, setMode] = useState<ViewMode>('3d')
  const [viewRequest, setViewRequest] = useState<ViewRequest | null>(null)
  const [sceneKey, setSceneKey] = useState(0) // 불러오기 때 방 목록 패널을 새로 시작시키는 번호
  const [sideTab, setSideTab] = useState<SideTab>('build')
  const [layer, setLayer] = useState<LayerView>('all')
  const [tool, setTool] = useState<Tool>('select')
  const [draft, setDraft] = useState<Point[] | null>(null) // 그리고 있는 전선의 점들
  const [notesVisible, setNotesVisible] = useState(true)
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [lighting, setLighting] = useState<Lighting>({ enabled: false, time: 14, season: 'equinox', night: false, lamps: false })
  const cameraRef = useRef<THREE.Camera | null>(null)

  // 마우스를 빠르게 움직이면 화면이 다시 그려지기 전에 다음 이벤트가 올 수 있다.
  // 그래서 "가장 최신 프로젝트"를 ref에도 따로 들고 있는다.
  const latest = useRef(project)
  const commit = (next: Project) => {
    latest.current = next
    setProject(next)
  }

  // project가 바뀔 때마다 브라우저에 자동 저장
  useEffect(() => saveToBrowser(project), [project])

  const { rooms, furniture, wallItems, wires, notes } = project
  const find = <T extends { id: string }>(type: NonNullable<Selection>['type'], list: T[]) =>
    selection?.type === type ? list.find((o) => o.id === selection.id) : undefined
  const selectedRoom = find('room', rooms)
  const selectedFurniture = find('furniture', furniture)
  const selectedItem = selectedFurniture ? findLibraryItem(selectedFurniture.libraryId) : undefined
  const selectedWallItem = find('wallItem', wallItems)
  const selectedWire = find('wire', wires)
  const selectedNote = find('note', notes)

  // useMemo: 계산이 무거운 값은 재료(rooms 등)가 바뀔 때만 다시 계산
  const pieces = useMemo(() => wallPieces(rooms), [rooms])
  const issues = useMemo(() => runChecks(project, pieces), [project, pieces])
  const sun = useMemo(() => sunDirection(lighting.time, lighting.season, project.north), [lighting.time, lighting.season, project.north])
  const patches = useMemo(
    () => (lighting.enabled && !lighting.night ? sunPatches(project, pieces, sun) : []),
    [lighting.enabled, lighting.night, project, pieces, sun],
  )
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
    // 처음 붙일 벽: 문은 아래쪽, 창문은 위쪽, 콘센트는 왼쪽 벽. 같은 벽에 이미 있으면 옆으로 비켜 놓는다
    const side = preset.kind === 'door' ? 'S' : preset.kind === 'window' ? 'N' : 'W'
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
        const item = findLibraryItem(f.libraryId)
        return item ? placeInPlan(change(f), item, p.rooms) : f
      }),
    })
  }

  /** 가구를 끌어서 옮기기: 스마트 가이드에 붙이고 → 안 붙은 축은 1cm 모눈 → 벽 밖으로 못 나가게 */
  const moveFurniture = (id: string, wantX: number, wantY: number) => {
    const p = latest.current
    const f = p.furniture.find((o) => o.id === id)
    const item = f && findLibraryItem(f.libraryId)
    if (!f || !item) return
    const { w, d } = footprint(item, f.rotation)
    const others = p.furniture.filter((o) => o.id !== id).map(boxOf).filter((b): b is Box => b !== null)
    const snapped = smartSnap({ x: wantX, y: wantY, w, d }, others, p.rooms.map(roomRect))
    const target = { ...f, x: snapped.x ?? snap(wantX), y: snapped.y ?? snap(wantY) }
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

  const rotateSelected = () => {
    if (selectedFurniture) changeFurniture(selectedFurniture.id, (f) => ({ ...f, rotation: (f.rotation + 90) % 360 }))
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

  /** 방향키 이동. 3D에서는 "지금 보는 방향" 기준으로 위쪽 키 = 화면 안쪽 */
  const nudge = (right: number, forward: number, step: number) => {
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
      const item = findLibraryItem(f.libraryId)
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

  const changeTool = (next: Tool) => {
    setTool(next)
    setDraft(null)
    if (next !== 'select') {
      setSelection(null)
      setLayer('all') // 전선·메모가 보이는 상태에서 그리게
    }
  }

  /** 선택한 것 지우기 (방은 방 목록에서만 지운다) */
  const deleteSelected = () => {
    if (!selection || selection.type === 'room') return
    const p = latest.current
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

  // ───────── 단축키 ─────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 입력칸에 글자를 치는 중이면 단축키 무시
      const el = e.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
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
        case 'Delete':
        case 'Backspace': deleteSelected(); break
        case 'Enter': if (tool === 'wire') finishWire(); break
        case 'Escape':
          if (tool !== 'select') changeTool('select')
          else setSelection(null)
          break
        case 'ArrowUp': nudge(0, 1, step); break
        case 'ArrowDown': nudge(0, -1, step); break
        case 'ArrowLeft': nudge(-1, 0, step); break
        case 'ArrowRight': nudge(1, 0, step); break
        default: return
      }
      if (e.code.startsWith('Arrow') && selectedFurniture) e.preventDefault() // 페이지가 스크롤되지 않게
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey) // 정리(청소)
  })

  const finishSource = selectedRoom ?? rooms[0]
  const target = targetRoom()
  const errorCount = issues.filter((i) => i.level !== 'info').length
  const wallItemRoom = selectedWallItem && rooms.find((r) => r.id === selectedWallItem.roomId)

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>3D 인테리어 플래너</h1>
        <div className="side-tabs" role="tablist">
          <button role="tab" aria-selected={sideTab === 'build'} className={sideTab === 'build' ? 'active' : ''} onClick={() => setSideTab('build')}>
            꾸미기
          </button>
          <button role="tab" aria-selected={sideTab === 'check'} className={sideTab === 'check' ? 'active' : ''} onClick={() => setSideTab('check')}>
            햇빛·검사{errorCount > 0 && <span className="count">{errorCount}</span>}
          </button>
          <button role="tab" aria-selected={sideTab === 'more'} className={sideTab === 'more' ? 'active' : ''} onClick={() => setSideTab('more')}>
            메모·추천
          </button>
        </div>

        {sideTab === 'build' && (
          <>
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
            <LibraryPanel
              targetLabel={selectedRoom ? selectedRoom.name : rooms.length > 1 ? `모든 방 / 놓을 때는 ${target.name}` : rooms[0].name}
              wall={finishSource.wall}
              floor={finishSource.floor}
              wiring={tool === 'wire'}
              onAddFurniture={addFurniture}
              onAddWallItem={addWallItem}
              onToggleWire={() => changeTool(tool === 'wire' ? 'select' : 'wire')}
              onApplyFinish={applyFinish}
            />
            <FilePanel project={project} onLoad={replaceProject} onReset={() => replaceProject(DEFAULT_PROJECT)} />
            <details className="panel help">
              <summary>조작법</summary>
              <ul>
                <li>가구 드래그: 이동 (가까운 정렬 위치에 붙고 안내선 표시)</li>
                <li>방향키: 1cm 이동 · Shift+방향키: 10cm</li>
                <li>R: 회전 · Delete: 삭제 · Esc: 선택 해제</li>
                <li>V: 보기 전환 (전체 → 가구 → 전기 → 구조)</li>
                <li>빈 곳 왼쪽 드래그: 시점 이동</li>
                <li>오른쪽 드래그 (또는 Ctrl+드래그): 시점 회전</li>
                <li>휠: 확대/축소</li>
                <li>2D 평면도에서 방·문·창문·콘센트·메모를 끌어 위치 변경</li>
                <li>전선 그리기: 차례로 클릭 → Enter 또는 더블클릭으로 끝</li>
              </ul>
            </details>
          </>
        )}

        {sideTab === 'check' && (
          <>
            <SunPanel
              lighting={lighting}
              north={project.north}
              rooms={rooms}
              patches={patches}
              hasWindows={wallItems.some((i) => i.kind === 'window')}
              onChange={(patch) => setLighting((l) => ({ ...l, ...patch }))}
              onNorth={(north) => commit({ ...latest.current, north })}
            />
            <DrcPanel issues={issues} onPick={pickIssue} />
          </>
        )}

        {sideTab === 'more' && (
          <>
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
            <RecommendPanel pyeong={toPyeong(unionArea(rooms.map(roomRect)))} roomCount={rooms.length} />
          </>
        )}
      </aside>

      <main className={`viewport mode-${mode}`}>
        <ViewBar
          mode={mode}
          layer={layer}
          tool={tool}
          onMode={setMode}
          onView={(view: ViewName) => setViewRequest({ view, nonce: Date.now() })}
          onLayer={setLayer}
          onTool={changeTool}
        />
        {tool !== 'select' && (
          <div className="toolhint" role="status">
            {tool === 'wire'
              ? `전선 그리기: 바닥을 차례로 눌러 점을 찍으세요${draft ? ` (${draft.length}개)` : ''} · Enter 또는 더블클릭으로 끝 · Esc 취소`
              : '메모 찍기: 메모를 남길 자리를 누르세요 · Esc 취소'}
            {tool === 'wire' && draft && draft.length >= 2 && (
              <button className="small" onClick={finishWire}>
                완료
              </button>
            )}
          </div>
        )}
        <div className="views">
          {mode !== '3d' && (
            <div className="view">
              <Plan2D
                project={project}
                pieces={pieces}
                selection={selection}
                guides={guides}
                issues={shownIssues}
                patches={patches}
                visible={visible}
                tool={tool}
                draft={draft}
                onSelect={setSelection}
                onPlanClick={planClick}
                onFinishWire={finishWire}
                onMove={moveOnPlan}
                onDragEnd={() => setGuides([])}
              />
            </div>
          )}
          {mode !== '2d' && (
            <div className="view">
              <Scene3D
                project={project}
                pieces={pieces}
                selection={selection}
                guides={guides}
                issues={shownIssues}
                visible={visible}
                tool={tool}
                draft={draft}
                lighting={lighting}
                sun={sun}
                viewRequest={viewRequest}
                cameraRef={cameraRef}
                onSelect={setSelection}
                onFloorClick={(roomId, x, y) => (tool === 'select' ? setSelection({ type: 'room', id: roomId }) : planClick(x, y))}
                onMoveFurniture={moveFurniture}
                onDragEnd={() => setGuides([])}
              />
            </div>
          )}
        </div>

        {/* 선택한 것의 정보 카드 (화면 오른쪽 아래) */}
        {selectedFurniture && selectedItem && (
          <SelectionPanel
            key={selectedFurniture.id}
            instance={selectedFurniture}
            item={selectedItem}
            onRotate={rotateSelected}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onRecolor={recolorSelected}
          />
        )}
        {selectedWallItem && wallItemRoom && (
          <WallItemCard
            key={selectedWallItem.id}
            item={selectedWallItem}
            room={wallItemRoom}
            onChange={(patch) => changeWallItem(selectedWallItem.id, patch)}
            onDelete={deleteSelected}
          />
        )}
        {selectedWire && <WireCard wire={selectedWire} onDelete={deleteSelected} />}
        {selectedNote && <NoteCard key={selectedNote.id} note={selectedNote} onChange={(text) => changeNote(selectedNote.id, { text })} onDelete={deleteSelected} />}
      </main>
    </div>
  )
}
