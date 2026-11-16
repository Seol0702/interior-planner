import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Finish, FurnitureInstance, Project, RoomShape, Selection, ViewMode, ViewName } from './types'
import { DEFAULT_PROJECT, loadFromBrowser, saveToBrowser } from './project'
import { findLibraryItem } from './library'
import { bounds, contains, footprint, newId, placeInPlan, roomRect } from './plan'
import { smartSnap, type Box, type Guide } from './guides'
import { snap } from './units'
import Scene3D from './components/Scene3D'
import Plan2D from './components/Plan2D'
import RoomsPanel from './components/RoomsPanel'
import LibraryPanel from './components/LibraryPanel'
import SelectionPanel from './components/SelectionPanel'
import FilePanel from './components/FilePanel'
import ViewBar from './components/ViewBar'
import type { ViewRequest } from './components/CameraRig'

/** 모든 가구를 (바뀐) 방 안으로 다시 맞춰 넣기 */
const refit = (furniture: FurnitureInstance[], rooms: RoomShape[]) =>
  furniture.map((f) => {
    const item = findLibraryItem(f.libraryId)
    return item ? placeInPlan(f, item, rooms) : f
  })

/** 가구가 바닥에서 차지하는 자리 (중심 + 크기) */
const boxOf = (f: FurnitureInstance): Box | null => {
  const item = findLibraryItem(f.libraryId)
  if (!item) return null
  const { w, d } = footprint(item, f.rotation)
  return { x: f.x, y: f.y, w, d }
}

export default function App() {
  // useState: 화면에 영향을 주는 값. 바뀌면 화면이 자동으로 다시 그려진다
  const [project, setProject] = useState<Project>(loadFromBrowser) // 처음 켤 때 자동 저장분 불러오기
  const [selection, setSelection] = useState<Selection>(null)
  const [guides, setGuides] = useState<Guide[]>([]) // 지금 떠 있는 스마트 가이드
  const [mode, setMode] = useState<ViewMode>('3d')
  const [viewRequest, setViewRequest] = useState<ViewRequest | null>(null)
  const [sceneKey, setSceneKey] = useState(0) // 불러오기 때 3D 화면을 새로 시작시키는 번호
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

  const { rooms, furniture } = project
  const selectedRoom = selection?.type === 'room' ? rooms.find((r) => r.id === selection.id) : undefined
  const selectedFurniture = selection?.type === 'furniture' ? furniture.find((f) => f.id === selection.id) : undefined
  const selectedItem = selectedFurniture ? findLibraryItem(selectedFurniture.libraryId) : undefined

  // ───────── 방 ─────────

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
    commit({ ...p, rooms: [...p.rooms, room] })
    setSelection({ type: 'room', id: room.id })
    setViewRequest({ view: 'iso', nonce: Date.now() }) // 새 방까지 한눈에 보이게 시점을 다시 맞춘다
    return room.id
  }

  const updateRoom = (id: string, patch: Partial<RoomShape>) => {
    const p = latest.current
    const nextRooms = p.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r))
    commit({ ...p, rooms: nextRooms, furniture: refit(p.furniture, nextRooms) })
  }

  const deleteRoom = (id: string) => {
    const p = latest.current
    if (p.rooms.length <= 1) return
    const nextRooms = p.rooms.filter((r) => r.id !== id)
    commit({ ...p, rooms: nextRooms, furniture: refit(p.furniture, nextRooms) })
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
    const nextRooms = p.rooms.map((r) => (r.id === id ? { ...r, x, y } : r))
    commit({ ...p, rooms: nextRooms, furniture: refit(moved, nextRooms) })
  }

  /** 벽지·장판 바르기. 방을 선택했으면 그 방만, 아니면 모든 방 */
  const applyFinish = (kind: 'wall' | 'floor', finish: Finish) => {
    const p = latest.current
    commit({ ...p, rooms: p.rooms.map((r) => (!selectedRoom || r.id === selectedRoom.id ? { ...r, [kind]: finish } : r)) })
  }

  // ───────── 가구 ─────────

  const addFurniture = (libraryId: string) => {
    const p = latest.current
    const item = findLibraryItem(libraryId)
    if (!item) return
    // 놓을 방: 선택한 방 → 선택한 가구가 있는 방 → 첫 번째 방
    const room =
      selectedRoom ??
      (selectedFurniture && p.rooms.find((r) => contains(roomRect(r), selectedFurniture.x, selectedFurniture.y))) ??
      p.rooms[0]
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

  const deleteSelected = () => {
    if (!selectedFurniture) return
    const p = latest.current
    commit({ ...p, furniture: p.furniture.filter((f) => f.id !== selectedFurniture.id) })
    setSelection(null)
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
    let fy = -1 // 2D 평면도 기준: 위쪽 키 = 북쪽
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

  // ───────── 파일 ─────────

  /** 파일에서 불러온 프로젝트로 통째로 바꾸기 */
  const replaceProject = (next: Project) => {
    commit({ ...next, furniture: refit(next.furniture, next.rooms) })
    setSelection(null)
    setGuides([])
    setSceneKey((k) => k + 1)
  }

  // ───────── 단축키 ─────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 입력칸에 글자를 치는 중이면 단축키 무시
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return
      const step = e.shiftKey ? 100 : 10 // 방향키: 1cm, Shift와 함께: 10cm
      // e.code는 한/영 입력 상태와 상관없이 "자판 위치"로 판단 (한글 모드에서 R = ㄱ)
      switch (e.code) {
        case 'KeyR': rotateSelected(); break
        case 'Delete':
        case 'Backspace': deleteSelected(); break
        case 'Escape': setSelection(null); break
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

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>3D 인테리어 플래너</h1>
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
          targetLabel={selectedRoom ? selectedRoom.name : rooms.length > 1 ? '모든 방 (방을 선택하면 그 방만)' : rooms[0].name}
          wall={finishSource.wall}
          floor={finishSource.floor}
          onAddFurniture={addFurniture}
          onApplyFinish={applyFinish}
        />
        <FilePanel project={project} onLoad={replaceProject} onReset={() => replaceProject(DEFAULT_PROJECT)} />
        <details className="panel help">
          <summary>조작법</summary>
          <ul>
            <li>가구 드래그: 이동 (가까운 정렬 위치에 붙고 안내선 표시)</li>
            <li>방향키: 1cm 이동 · Shift+방향키: 10cm</li>
            <li>R: 회전 · Delete: 삭제 · Esc: 선택 해제</li>
            <li>빈 곳 왼쪽 드래그: 시점 이동</li>
            <li>오른쪽 드래그 (또는 Ctrl+드래그): 시점 회전</li>
            <li>휠: 확대/축소</li>
            <li>2D 평면도에서 방을 끌어 위치 변경</li>
          </ul>
        </details>
      </aside>

      <main className={`viewport mode-${mode}`}>
        <ViewBar
          mode={mode}
          onMode={setMode}
          onView={(view: ViewName) => setViewRequest({ view, nonce: Date.now() })}
        />
        <div className="views">
          {mode !== '3d' && (
            <div className="view">
              <Plan2D
                rooms={rooms}
                furniture={furniture}
                selection={selection}
                guides={guides}
                onSelect={setSelection}
                onMoveFurniture={moveFurniture}
                onMoveRoom={moveRoom}
                onDragEnd={() => setGuides([])}
              />
            </div>
          )}
          {mode !== '2d' && (
            <div className="view">
              <Scene3D
                key={sceneKey}
                project={project}
                selection={selection}
                guides={guides}
                viewRequest={viewRequest}
                cameraRef={cameraRef}
                onSelect={setSelection}
                onMoveFurniture={moveFurniture}
                onDragEnd={() => setGuides([])}
              />
            </div>
          )}
        </div>
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
      </main>
    </div>
  )
}
