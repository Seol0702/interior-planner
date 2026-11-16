import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { FurnitureInstance, Project, Room } from './types'
import { DEFAULT_PROJECT, loadFromBrowser, saveToBrowser } from './project'
import { mm } from './units'
import { findLibraryItem } from './library'
import { newId, placeInRoom } from './layout'
import RoomView from './components/RoomView'
import RoomForm from './components/RoomForm'
import LibraryPanel from './components/LibraryPanel'
import SelectionPanel from './components/SelectionPanel'
import FurnitureMesh from './components/FurnitureMesh'
import FilePanel from './components/FilePanel'

export default function App() {
  // useState: 화면에 영향을 주는 값. 바뀌면 화면이 자동으로 다시 그려진다
  // 처음 켤 때 브라우저에 저장돼 있던 작업을 불러온다
  const [project, setProject] = useState<Project>(loadFromBrowser)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // 불러오기 할 때마다 1씩 올려서 3D 화면(카메라)을 새로 시작시키는 번호
  const [viewKey, setViewKey] = useState(0)

  // project가 바뀔 때마다 브라우저에 자동 저장
  useEffect(() => saveToBrowser(project), [project])

  /** 파일에서 불러온 프로젝트로 통째로 바꾸기 */
  const replaceProject = (next: Project) => {
    // 파일 속 가구도 방 안·그리드에 맞게 정리해서 넣기
    const furniture = next.furniture.map((f) => {
      const item = findLibraryItem(f.libraryId)
      return item ? placeInRoom(f, item, next.room) : f
    })
    setProject({ ...next, furniture })
    setSelectedId(null)
    setViewKey((k) => k + 1)
  }

  const { room, furniture } = project
  const selected = furniture.find((f) => f.id === selectedId) ?? null
  const selectedItem = selected ? findLibraryItem(selected.libraryId) : undefined

  /** 가구 하나를 고쳐서(위치·회전) 방 안으로 다시 맞춰 넣기 */
  const updateFurniture = (id: string, change: (f: FurnitureInstance) => FurnitureInstance) => {
    setProject((p) => ({
      ...p,
      furniture: p.furniture.map((f) => {
        if (f.id !== id) return f
        const item = findLibraryItem(f.libraryId)
        return item ? placeInRoom(change(f), item, p.room) : f
      }),
    }))
  }

  const addFurniture = (libraryId: string) => {
    const item = findLibraryItem(libraryId)
    if (!item) return
    const instance = placeInRoom(
      { id: newId(), libraryId, x: room.width / 2, y: room.depth / 2, rotation: 0 },
      item,
      room,
    )
    setProject((p) => ({ ...p, furniture: [...p.furniture, instance] }))
    setSelectedId(instance.id)
  }

  const rotateSelected = () => {
    if (selectedId) updateFurniture(selectedId, (f) => ({ ...f, rotation: (f.rotation + 90) % 360 }))
  }

  const deleteSelected = () => {
    if (!selectedId) return
    setProject((p) => ({ ...p, furniture: p.furniture.filter((f) => f.id !== selectedId) }))
    setSelectedId(null)
  }

  /** 방 크기가 바뀌면 모든 가구를 새 방 안으로 다시 맞춰 넣기 */
  const changeRoom = (nextRoom: Room) => {
    setProject((p) => ({
      ...p,
      room: nextRoom,
      furniture: p.furniture.map((f) => {
        const item = findLibraryItem(f.libraryId)
        return item ? placeInRoom(f, item, nextRoom) : f
      }),
    }))
  }

  // 단축키: R 회전, Delete/Backspace 삭제, Esc 선택 해제
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 입력칸에 글자를 치는 중이면 단축키 무시
      if (e.target instanceof HTMLInputElement) return
      // e.code는 한/영 입력 상태와 상관없이 "자판 위치"로 판단 (한글 모드에서 R = ㄱ)
      if (e.code === 'KeyR') rotateSelected()
      else if (e.code === 'Delete' || e.code === 'Backspace') deleteSelected()
      else if (e.code === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey) // 정리(청소)
  })

  const center: [number, number, number] = [mm(room.width) / 2, 0, mm(room.depth) / 2]

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>3D 인테리어 플래너</h1>
        {/* key가 바뀌면 입력칸도 새 방 크기로 다시 채워진다 */}
        <RoomForm key={viewKey} room={room} onChange={changeRoom} />
        <LibraryPanel onAdd={addFurniture} />
        {selected && selectedItem && (
          <SelectionPanel
            instance={selected}
            item={selectedItem}
            onRotate={rotateSelected}
            onDelete={deleteSelected}
          />
        )}
        <FilePanel
          project={project}
          onLoad={replaceProject}
          onReset={() => replaceProject(DEFAULT_PROJECT)}
        />
        <section className="panel help">
          <h2>조작법</h2>
          <ul>
            <li>가구 드래그: 이동 (10mm 단위)</li>
            <li>빈 곳 드래그: 화면 회전 · 휠: 확대/축소</li>
            <li>R: 회전 · Delete: 삭제 · Esc: 선택 해제</li>
          </ul>
        </section>
      </aside>

      <main className="viewport">
        {/* onPointerMissed: 가구가 아닌 빈 곳을 클릭하면 선택 해제 */}
        <Canvas
          key={viewKey}
          camera={{ position: [center[0] + 4, 5, center[2] + 6], fov: 50 }}
          onPointerMissed={() => setSelectedId(null)}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 10, 4]} intensity={1.1} />
          <RoomView room={room} />
          {furniture.map((f) => {
            const item = findLibraryItem(f.libraryId)
            if (!item) return null
            return (
              <FurnitureMesh
                key={f.id}
                instance={f}
                item={item}
                selected={f.id === selectedId}
                onSelect={() => setSelectedId(f.id)}
                onMove={(x, y) => updateFurniture(f.id, (old) => ({ ...old, x, y }))}
              />
            )
          })}
          <OrbitControls makeDefault target={center} maxPolarAngle={Math.PI / 2 - 0.05} />
        </Canvas>
      </main>
    </div>
  )
}
