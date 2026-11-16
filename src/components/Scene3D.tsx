import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Lighting, Point, Project, Selection, Tool } from '../types'
import type { Guide } from '../guides'
import type { Issue } from '../drc'
import { daylight, sunDirection, type Sun, type SunPatch } from '../sun'
import { bounds, type WallPiece } from '../plan'
import { findLibraryItem } from '../library'
import { posePosition, viewPose } from '../camera'
import { mm } from '../units'
import Plan3D from './Plan3D'
import FurnitureMesh from './FurnitureMesh'
import Guides3D from './Guides3D'
import CameraRig, { type ViewRequest } from './CameraRig'
import Compass from './Compass'

export type Visible = { walls: boolean; furniture: boolean; electric: boolean; notes: boolean; expandNotes: boolean }

type Props = {
  project: Project
  pieces: WallPiece[]
  selection: Selection
  guides: Guide[]
  issues: Issue[]
  visible: Visible
  tool: Tool
  draft: Point[] | null // 그리고 있는 전선
  lighting: Lighting
  sun: Sun
  patches: SunPatch[] // 창문으로 햇빛이 드는 자리
  viewRequest: ViewRequest | null
  cameraRef: RefObject<THREE.Camera | null>
  onSelect: (selection: Selection) => void
  onFloorClick: (roomId: string, x: number, y: number) => void
  onMoveFurniture: (id: string, x: number, y: number) => void
  onDragEnd: () => void
}

/** 3D 화면 전체 */
export default function Scene3D(props: Props) {
  const { project, pieces, selection, guides, issues, visible, tool, draft, lighting, sun, patches, viewRequest, cameraRef } = props
  const compass = useRef<HTMLDivElement>(null)
  const { onSelect, onFloorClick, onMoveFurniture, onDragEnd } = props
  // 처음 켰을 때의 카메라 자세 (한 번만 계산)
  const [pose] = useState(() => viewPose('iso', project.rooms))
  const lampsOn = lighting.enabled && lighting.lamps

  // 3D 위치에 붙여서 보여줄 글자·단추들 (메모 점, 검사 표시, 선택한 가구 이름표)
  const nodes = useRef(new Map<string, HTMLDivElement>())
  const anchors: Anchor[] = []
  if (visible.notes) {
    for (const note of project.notes) {
      const selected = selection?.type === 'note' && selection.id === note.id
      anchors.push({
        id: `note:${note.id}`,
        pos: [mm(note.x), 0.05, mm(note.y)],
        node: (
          <div className="note-pin">
            <button className={`note-dot ${selected ? 'selected' : ''}`} aria-label="메모" onClick={() => onSelect({ type: 'note', id: note.id })} />
            {(selected || visible.expandNotes) && <div className="note-bubble">{note.text || '(내용 없음)'}</div>}
          </div>
        ),
      })
    }
  }
  for (const issue of issues) {
    anchors.push({
      id: `issue:${issue.id}`,
      pos: [mm(issue.x), 0.05, mm(issue.y)],
      node: (
        <button className={`issue-dot ${issue.level}`} title={issue.message} onClick={() => onSelect(issue.target)}>
          !
        </button>
      ),
    })
  }
  const picked = selection?.type === 'furniture' ? project.furniture.find((f) => f.id === selection.id) : undefined
  const pickedItem = picked && findLibraryItem(picked.libraryId)
  if (picked && pickedItem) {
    const top = pickedItem.mount === 'ceiling' ? project.wallHeight : pickedItem.height
    anchors.push({ id: 'tag', pos: [mm(picked.x), mm(top) + 0.25, mm(picked.y)], node: <div className="tag">{pickedItem.name}</div> })
  }

  return (
    <div className="scene">
    {/* onPointerMissed: 아무것도 없는 곳을 클릭하면 선택 해제 */}
    <Canvas
      shadows
      camera={{ position: posePosition(pose), fov: 50, near: 0.05, far: 300 }}
      onCreated={({ camera }) => {
        cameraRef.current = camera
      }}
      onPointerMissed={() => tool === 'select' && onSelect(null)}
    >
      <Lights project={project} lighting={lighting} sun={sun} />
      {lighting.enabled && !lighting.night && <SunSky project={project} lighting={lighting} sun={sun} patches={patches} />}
      <CompassSync target={compass} north={project.north} />

      <Plan3D
        rooms={project.rooms}
        pieces={pieces}
        wallItems={project.wallItems}
        wallHeight={project.wallHeight}
        selection={selection}
        showWalls={visible.walls}
        showElectric={visible.electric}
        shadows={lighting.enabled}
        onFloorClick={onFloorClick}
        onSelect={(s) => tool === 'select' && onSelect(s)}
      />

      {project.furniture.map((f) => {
        const item = findLibraryItem(f.libraryId)
        if (!item || !(item.layer === 'electric' ? visible.electric : visible.furniture)) return null
        return (
          <FurnitureMesh
            key={f.id}
            instance={f}
            item={item}
            selected={selection?.type === 'furniture' && selection.id === f.id}
            wallHeight={project.wallHeight}
            lit={lampsOn}
            interactive={tool === 'select'}
            onSelect={() => onSelect({ type: 'furniture', id: f.id })}
            onMove={(x, y) => onMoveFurniture(f.id, x, y)}
            onDragEnd={onDragEnd}
          />
        )
      })}

      {/* 전선: 바닥에 붙은 선 */}
      {visible.electric &&
        project.wires.map((wire) => (
          <Line
            key={wire.id}
            points={wire.points.map((p): [number, number, number] => [mm(p.x), 0.02, mm(p.y)])}
            color={selection?.type === 'wire' && selection.id === wire.id ? '#2563eb' : '#f59e0b'}
            lineWidth={selection?.type === 'wire' && selection.id === wire.id ? 5 : 3.5}
            onClick={(e) => {
              if (tool !== 'select' || e.delta > 4) return
              e.stopPropagation()
              onSelect({ type: 'wire', id: wire.id })
            }}
          />
        ))}
      {draft && draft.length >= 2 && (
        <Line points={draft.map((p): [number, number, number] => [mm(p.x), 0.02, mm(p.y)])} color="#f59e0b" lineWidth={3.5} dashed dashSize={0.1} gapSize={0.06} />
      )}
      {draft?.map((p, i) => (
        <mesh key={i} position={[mm(p.x), 0.02, mm(p.y)]}>
          <sphereGeometry args={[0.035, 12, 8]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      ))}

      <Projector anchors={anchors} nodes={nodes} />

      <Guides3D guides={guides} />

      {/* 마우스: 왼쪽 드래그 = 시점 이동, 오른쪽 드래그 = 회전, 휠 = 확대/축소 */}
      <OrbitControls
        makeDefault
        target={pose.target}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        screenSpacePanning={false}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={0.5}
        maxDistance={120}
      />
      <CameraRig request={viewRequest} rooms={project.rooms} />
    </Canvas>

    {/* 3D 화면 위에 겹쳐 놓는 층. 각 항목의 화면 위치는 Projector가 매 순간 맞춰 준다 */}
    <div className="overlay">
      <Compass innerRef={compass} />
      {anchors.map((a) => (
        <div
          key={a.id}
          className="anchor"
          ref={(el) => {
            if (el) nodes.current.set(a.id, el)
            else nodes.current.delete(a.id)
          }}
        >
          {a.node}
        </div>
      ))}
    </div>
    </div>
  )
}

type Anchor = { id: string; pos: [number, number, number]; node: ReactNode }

/** 3D 좌표를 화면 좌표로 바꿔서, 겹쳐 놓은 글자·단추들을 제자리에 옮긴다 */
function Projector({ anchors, nodes }: { anchors: Anchor[]; nodes: RefObject<Map<string, HTMLDivElement>> }) {
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    for (const a of anchors) {
      const el = nodes.current.get(a.id)
      if (!el) continue
      v.set(...a.pos).project(camera) // 결과: 화면 가운데가 0, 가장자리가 ±1
      const x = (v.x * 0.5 + 0.5) * size.width
      const y = (-v.y * 0.5 + 0.5) * size.height
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      el.style.visibility = v.z < 1 ? 'visible' : 'hidden' // 카메라 뒤에 있으면 숨김
    }
  })
  return null
}

/** 시점이 돌 때마다 나침반 바늘이 북쪽을 가리키도록 각도를 맞춘다 */
function CompassSync({ target, north }: { target: RefObject<HTMLDivElement | null>; north: number }) {
  const dir = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    if (!target.current) return
    camera.getWorldDirection(dir)
    let x = dir.x
    let z = dir.z
    if (Math.hypot(x, z) < 0.05) {
      // 바로 위에서 내려다볼 때는 화면 위쪽 방향을 기준으로 삼는다
      up.set(0, 1, 0).applyQuaternion(camera.quaternion)
      x = up.x
      z = up.z
    }
    const azimuth = (Math.atan2(-x, -z) * 180) / Math.PI // 카메라가 도는 각도
    target.current.style.setProperty('--rot', `${(azimuth - north).toFixed(1)}deg`)
  })
  return null
}

const BEAM = new THREE.MeshBasicMaterial({ color: '#fff0b3', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide })

/** 하늘의 해, 해가 하루 동안 지나가는 길, 창문으로 들어오는 빛줄기 */
function SunSky({ project, lighting, sun, patches }: { project: Project; lighting: Lighting; sun: Sun; patches: SunPatch[] }) {
  const b = useMemo(() => bounds(project.rooms), [project.rooms])
  const cx = mm(b.cx)
  const cz = mm(b.cy)
  const radius = Math.max(mm(b.w), mm(b.d)) / 2 + 4.5 // 해를 그릴 거리

  // 해 뜰 때부터 질 때까지의 길 (10분 간격으로 점을 찍어 잇는다)
  const path = useMemo(() => {
    const { sunrise, sunset } = daylight(lighting.season)
    const points: [number, number, number][] = []
    for (let t = sunrise; t <= sunset + 0.001; t += 1 / 6) {
      const s = sunDirection(Math.min(t, sunset), lighting.season, project.north)
      points.push([cx + s.x * radius, Math.max(0, s.y) * radius, cz + s.z * radius])
    }
    return points
  }, [lighting.season, project.north, cx, cz, radius])

  // 빛줄기: 창문 네 귀퉁이(near)와 빛이 닿는 네 점(far)을 이은 기둥
  const beams = useMemo(() => {
    const positions: number[] = []
    const indices: number[] = []
    for (const patch of patches) {
      const base = positions.length / 3
      for (const p of [...patch.beam.near, ...patch.beam.far]) positions.push(mm(p.x), mm(p.h), mm(p.y))
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4
        indices.push(base + i, base + j, base + 4 + j, base + i, base + 4 + j, base + 4 + i)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    return geometry
  }, [patches])
  useEffect(() => () => beams.dispose(), [beams])

  const up = sun.y > 0.02
  return (
    <group>
      {/* 바깥 땅: 집 그림자가 해를 따라 움직이는 것이 보인다 */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.02, cz]}>
        <circleGeometry args={[radius * 1.6, 72]} />
        <meshStandardMaterial color="#d9dee5" roughness={1} />
      </mesh>
      {path.length >= 2 && <Line points={path} color="#f5b301" lineWidth={1.5} dashed dashSize={0.25} gapSize={0.18} transparent opacity={0.7} />}
      {up && (
        <mesh position={[cx + sun.x * radius, sun.y * radius, cz + sun.z * radius]}>
          <sphereGeometry args={[0.38, 24, 16]} />
          <meshBasicMaterial color="#ffc21a" />
        </mesh>
      )}
      {up && patches.length > 0 && <mesh geometry={beams} material={BEAM} renderOrder={5} />}
    </group>
  )
}

/** 빛: 기본 조명(밝고 평평함) 또는 햇빛·그림자·밤 조명 */
function Lights({ project, lighting, sun }: { project: Project; lighting: Lighting; sun: Sun }) {
  const light = useRef<THREE.DirectionalLight>(null)
  const b = useMemo(() => bounds(project.rooms), [project.rooms])
  const cx = mm(b.cx)
  const cz = mm(b.cy)
  const reach = Math.max(mm(b.w), mm(b.d)) / 2 + 7 // 그림자를 계산할 범위
  const sunUp = lighting.enabled && !lighting.night && sun.y > 0.02

  // 해는 "방 가운데를 향해" 비춰야 한다. 빛이 향하는 지점(target)을 방 가운데로 옮긴다
  useEffect(() => {
    const l = light.current
    if (!l) return
    l.target.position.set(cx, 0, cz)
    l.target.updateMatrixWorld()
    l.shadow.camera.left = l.shadow.camera.bottom = -reach
    l.shadow.camera.right = l.shadow.camera.top = reach
    l.shadow.camera.updateProjectionMatrix()
  })

  if (!lighting.enabled) {
    return (
      <>
        <color attach="background" args={['#f1f3f6']} />
        <ambientLight intensity={0.8} />
        <hemisphereLight args={['#ffffff', '#b9b2a6', 0.6]} />
        <directionalLight position={[6, 12, 5]} intensity={1.1} />
      </>
    )
  }

  const height = Math.max(0, sun.y) // 해가 높을수록 1에 가까움
  const low = 1 - Math.min(1, height / 0.5) // 해가 낮을수록(아침·저녁) 1에 가까움
  const sunColor = new THREE.Color('#ffffff').lerp(new THREE.Color('#ffb066'), low * 0.8)
  return (
    <>
      <color attach="background" args={[sunUp ? '#' + new THREE.Color('#e3edf7').lerp(new THREE.Color('#f7e2cf'), low * 0.9).getHexString() : '#161a24']} />
      <ambientLight intensity={sunUp ? 0.5 + 0.2 * height : 0.12} />
      <hemisphereLight args={[sunUp ? '#dbe9ff' : '#3b4a6b', '#8a8173', sunUp ? 0.5 : 0.15]} />
      {sunUp && (
        <directionalLight
          ref={light}
          castShadow
          position={[cx + sun.x * 40, sun.y * 40, cz + sun.z * 40]}
          intensity={1.2 + 2.2 * Math.min(1, height * 1.6)}
          color={sunColor}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={1}
          shadow-camera-far={90}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
        />
      )}
    </>
  )
}
