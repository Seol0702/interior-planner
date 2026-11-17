import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Finish, RoomShape, Selection, WallItem } from '../types'
import { WALL_THICKNESS, findPiece, wallItemSpan, type Span, type WallPiece } from '../plan'
import { buildWallGeometry, type Hole } from '../wallgeo'
import { patternCanvas } from '../finishes'
import { mm } from '../units'

type Props = {
  rooms: RoomShape[]
  pieces: WallPiece[]
  wallItems: WallItem[]
  wallHeight: number
  selection: Selection
  showWalls: boolean // 벽·문·창문 보이기
  showElectric: boolean // 콘센트 보이기
  shadows: boolean // 햇빛 효과가 켜져 있는가
  interactive: boolean // 선택 도구일 때만 문·창문·콘센트를 끌어서 옮길 수 있다
  walking?: boolean // 걷기 모드: 천장을 덮고, 벽을 숨기지 않고, 문을 열어 둔다
  onFloorClick: (roomId: string, x: number, y: number) => void
  onSelect: (selection: Selection) => void
  onMoveWallItem: (id: string, along: number, height: number) => void // along: 벽 방향 위치, height: 바닥에서 높이 (mm)
  onDragEnd: () => void
}

type Attached = { item: WallItem; span: Span; piece: WallPiece }

// 화면에는 안 보이지만 그림자는 만드는 재질 (천장, 숨겨진 벽이 햇빛을 막도록)
const SHADOW_ONLY = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })

/** 평면도(방들)를 3D로: 바닥 + 벽 + 문·창문·콘센트 */
export default function Plan3D(props: Props) {
  const { rooms, pieces, wallItems, wallHeight, selection, showWalls, showElectric, shadows, interactive, walking = false, onFloorClick, onSelect, onMoveWallItem, onDragEnd } = props
  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])

  // 문·창문·콘센트가 각각 어느 벽 조각에 붙어 있는지 찾는다
  const attached = useMemo(() => {
    const list: Attached[] = []
    for (const item of wallItems) {
      const room = roomById.get(item.roomId)
      if (!room) continue
      const span = wallItemSpan(item, room)
      const piece = findPiece(pieces, span)
      if (piece) list.push({ item, span, piece })
    }
    return list
  }, [wallItems, pieces, roomById])

  const T = mm(WALL_THICKNESS)
  const H = mm(wallHeight)

  return (
    <group>
      {rooms.map((room, i) => (
        <Floor
          key={room.id}
          room={room}
          lift={i * 0.0005} // 겹친 방의 바닥이 깜빡이지 않게 아주 조금씩 높이 차이를 둔다
          selected={selection?.type === 'room' && selection.id === room.id}
          onClick={(x, y) => onFloorClick(room.id, x, y)}
        />
      ))}

      {showWalls &&
        pieces.map((piece) => (
          <Wall
            key={piece.key}
            piece={piece}
            height={wallHeight}
            finish={roomById.get(piece.roomId)!.wall}
            otherFinish={piece.otherRoomId ? roomById.get(piece.otherRoomId)?.wall : undefined}
            holes={attached.filter((a) => a.piece === piece && a.item.kind !== 'outlet')}
            shadows={shadows}
            cutaway={!walking}
          />
        ))}

      {attached.map((a) =>
        (a.item.kind === 'outlet' ? showElectric : showWalls) ? (
          <WallItemMesh
            key={a.item.id}
            attached={a}
            selected={selection?.type === 'wallItem' && selection.id === a.item.id}
            interactive={interactive}
            walking={walking}
            onSelect={() => onSelect({ type: 'wallItem', id: a.item.id })}
            onMove={(along, height) => onMoveWallItem(a.item.id, along, height)}
            onDragEnd={onDragEnd}
          />
        ) : null,
      )}

      {/* 걷기 모드의 천장: 아래(방 안)에서만 보이는 흰 판 */}
      {walking &&
        rooms.map((room) => (
          <mesh key={room.id} rotation={[Math.PI / 2, 0, 0]} position={[mm(room.x + room.width / 2), H, mm(room.y + room.depth / 2)]}>
            <planeGeometry args={[mm(room.width), mm(room.depth)]} />
            <meshStandardMaterial color="#f6f5f2" roughness={0.95} />
          </mesh>
        ))}

      {/* 천장: 보이지 않지만 햇빛을 막는다 → 빛이 창문으로만 들어온다 */}
      {shadows &&
        showWalls &&
        rooms.map((room) => (
          <mesh
            key={room.id}
            castShadow
            material={SHADOW_ONLY}
            position={[mm(room.x + room.width / 2), H + 0.03, mm(room.y + room.depth / 2)]}
          >
            <boxGeometry args={[mm(room.width) + 2 * T, 0.05, mm(room.depth) + 2 * T]} />
          </mesh>
        ))}
    </group>
  )
}

/**
 * 마감재 무늬를 3D 표면에 입힐 그림(텍스처)으로 만든다.
 * repeat: 표면에 무늬가 몇 번 반복되는지, offset: 무늬 시작 위치
 */
function useFinishTexture(finish: Finish, repeatX: number, repeatY: number, offsetX = 0, offsetY = 0) {
  const texture = useMemo(() => {
    if (finish.pattern === 'solid') return null // 단색은 그림이 필요 없다
    const t = new THREE.CanvasTexture(patternCanvas(finish))
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish.pattern, finish.color, finish.accent])

  useEffect(() => () => texture?.dispose(), [texture])
  if (texture) {
    texture.repeat.set(repeatX, repeatY)
    texture.offset.set(offsetX, offsetY)
  }
  return texture
}

type FloorProps = { room: RoomShape; lift: number; selected: boolean; onClick: (x: number, y: number) => void }

function Floor({ room, lift, selected, onClick }: FloorProps) {
  const W = mm(room.width)
  const D = mm(room.depth)
  const x = mm(room.x)
  const z = mm(room.y)
  const size = mm(room.floor.size)
  // 무늬 시작점을 "방 모서리"가 아니라 "집 전체 기준"으로 잡아서 옆방과 무늬가 이어지게 한다
  const texture = useFinishTexture(room.floor, W / size, D / size, x / size, -(z + D) / size)
  const y = 0.012

  return (
    <group>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[x + W / 2, lift, z + D / 2]}
        onClick={(e) => {
          // 화면을 끌다가 뗀 경우(delta가 큼)는 클릭으로 치지 않는다
          if (e.delta > 4) return
          e.stopPropagation()
          onClick(e.point.x * 1000, e.point.z * 1000)
        }}
      >
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial key={texture ? 'pattern' : 'solid'} color={texture ? '#ffffff' : room.floor.color} map={texture} roughness={0.85} />
      </mesh>
      {selected && (
        <Line
          points={[[x, y, z], [x + W, y, z], [x + W, y, z + D], [x, y, z + D], [x, y, z]]}
          color="#2563eb"
          lineWidth={2.5}
        />
      )}
    </group>
  )
}

type WallProps = { piece: WallPiece; height: number; finish: Finish; otherFinish?: Finish; holes: Attached[]; shadows: boolean; cutaway: boolean }

const WALL_TOP = '#deddd9' // 벽 윗면(잘린 단면) 색

/**
 * 벽 조각 하나 (문·창문 자리는 구멍이 뚫린다).
 * 바깥벽은 카메라가 벽 바깥쪽에 있으면 숨겨서 방 안이 보이게 한다(컷어웨이).
 */
function Wall({ piece, height, finish, otherFinish, holes, shadows, cutaway }: WallProps) {
  const ref = useRef<THREE.Mesh>(null)
  const H = mm(height)
  const T = mm(WALL_THICKNESS)
  const { rect } = piece

  // 구멍 위치를 "벽 시작점부터의 거리(m)"로 바꾼다
  const holeKey = holes.map((h) => `${h.span.a}:${h.span.b}:${h.item.sill}:${h.item.height}`).join('|')
  const geometry = useMemo(() => {
    const list: Hole[] = holes.map((h) => ({
      a: mm(h.span.a - piece.from),
      b: mm(h.span.b - piece.from),
      bottom: mm(h.item.sill),
      top: mm(h.item.sill + h.item.height),
    }))
    return buildWallGeometry(mm(piece.length), H, T, list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece.length, piece.from, H, T, holeKey])
  useEffect(() => () => geometry.dispose(), [geometry])

  // 벽의 앞면(+z)·뒷면(-z)이 각각 어느 방을 향하는지에 따라 벽지를 고른다.
  // 세로 벽은 90° 돌려 세우므로 앞면이 서쪽을 향한다.
  const far = otherFinish ?? finish
  const front = piece.horizontal ? finish : far
  const back = piece.horizontal ? far : finish
  // 무늬 좌표가 m 단위라서 "1m에 무늬가 몇 번"만 정하면 된다
  const frontTexture = useFinishTexture(front, 1 / mm(front.size), 1 / mm(front.size))
  const backTexture = useFinishTexture(back, 1 / mm(back.size), 1 / mm(back.size))

  const center = useMemo(
    () => new THREE.Vector3(mm(rect.x + rect.w / 2), H / 2, mm(rect.y + rect.d / 2)),
    [rect.x, rect.y, rect.w, rect.d, H],
  )
  const outward = useMemo(() => new THREE.Vector3(piece.nx, 0, piece.ny), [piece.nx, piece.ny])
  const toCamera = useMemo(() => new THREE.Vector3(), [])

  // useFrame: 화면을 다시 그릴 때마다(초당 약 60번) 실행
  useFrame(({ camera }) => {
    if (!ref.current || piece.interior) return
    if (!cutaway) {
      ref.current.visible = true
      return
    }
    toCamera.subVectors(camera.position, center)
    ref.current.visible = toCamera.dot(outward) < 0
  })

  // 벽 모양은 "x = 길이 방향"으로 만들었으므로, 세로 벽은 돌려서 세운다
  const position: [number, number, number] = piece.horizontal
    ? [mm(piece.from), 0, mm(rect.y + rect.d / 2)]
    : [mm(rect.x + rect.w / 2), 0, mm(piece.from)]
  const rotation: [number, number, number] = piece.horizontal ? [0, 0, 0] : [0, -Math.PI / 2, 0]

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={ref} geometry={geometry} receiveShadow>
        <meshStandardMaterial key={`f-${frontTexture ? 'p' : 's'}`} attach="material-0" color={frontTexture ? '#ffffff' : front.color} map={frontTexture} roughness={0.95} />
        <meshStandardMaterial key={`b-${backTexture ? 'p' : 's'}`} attach="material-1" color={backTexture ? '#ffffff' : back.color} map={backTexture} roughness={0.95} />
        <meshStandardMaterial attach="material-2" color={WALL_TOP} roughness={0.95} />
        <meshStandardMaterial attach="material-3" color={finish.color} roughness={0.95} />
      </mesh>
      {/* 컷어웨이로 숨겨진 벽도 햇빛은 막아야 하므로, 그림자 전용 벽을 하나 더 둔다 */}
      {shadows && <mesh geometry={geometry} material={SHADOW_ONLY} castShadow />}
    </group>
  )
}

const FRAME = '#f1f0ec'
const DOOR = '#c9a37a'

type WallItemMeshProps = {
  attached: Attached
  selected: boolean
  interactive: boolean
  walking: boolean
  onSelect: () => void
  onMove: (along: number, height: number) => void
  onDragEnd: () => void
}

/** 문·창문·콘센트의 3D 모양. 끌면 벽을 따라 옆으로, 위아래로 움직인다 */
function WallItemMesh({ attached, selected, interactive, walking, onSelect, onMove, onDragEnd }: WallItemMeshProps) {
  const { item, span, piece } = attached
  const T = mm(WALL_THICKNESS)
  const w = mm(item.width)
  const h = mm(item.height)
  const sill = mm(item.sill)
  const f = 0.05 // 틀 두께

  // 벽 두께의 가운데에, 벽 방향에 맞춰 놓는다 (x = 벽 길이 방향)
  const across = piece.horizontal ? piece.rect.y + piece.rect.d / 2 : piece.rect.x + piece.rect.w / 2
  const along = (span.a + span.b) / 2
  const position: [number, number, number] = piece.horizontal ? [mm(along), 0, mm(across)] : [mm(across), 0, mm(along)]
  const rotation: [number, number, number] = piece.horizontal ? [0, 0, 0] : [0, -Math.PI / 2, 0]
  // 이 물건이 속한 방 안쪽이 z의 어느 쪽인지 (콘센트·문짝을 방 안쪽 면에 붙이기 위해)
  const inward = piece.horizontal ? -span.ny : span.nx
  // 문: 경첩이 있는 쪽(x의 -1 또는 +1)과 문이 열리는 쪽(z의 -1 또는 +1)
  const hinge = item.flip ? 1 : -1
  const swing = item.outward ? -inward : inward

  const outline = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.06, h + 0.06, T + 0.08)), [w, h, T])

  // 문·창문은 붙어 있는 바깥벽이 컷어웨이로 숨겨질 때 함께 숨긴다 (콘센트는 위치 확인용으로 남긴다)
  const ref = useRef<THREE.Group>(null)
  const center = useMemo(() => new THREE.Vector3(position[0], 0, position[2]), [position[0], position[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  const toCamera = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    if (!ref.current || piece.interior || item.kind === 'outlet') return
    if (walking) {
      ref.current.visible = true
      return
    }
    toCamera.subVectors(camera.position, center)
    ref.current.visible = toCamera.x * piece.nx + toCamera.z * piece.ny < 0
  })
  // ── 끌어서 옮기기 ──
  // 마우스 광선이 "벽면"(세로로 선 평면)의 어디에 닿는지로 위치를 정한다
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null
  const plane = useMemo(
    () =>
      piece.horizontal
        ? new THREE.Plane(new THREE.Vector3(0, 0, 1), -mm(span.line))
        : new THREE.Plane(new THREE.Vector3(1, 0, 0), -mm(span.line)),
    [piece.horizontal, span.line],
  )
  const drag = useRef<{ da: number; dh: number } | null>(null)
  /** 마우스 위치 → (벽 방향 위치, 바닥에서 높이) mm */
  const wallPoint = (e: ThreeEvent<PointerEvent>) => {
    const hit = e.ray.intersectPlane(plane, new THREE.Vector3())
    return hit ? { along: (piece.horizontal ? hit.x : hit.z) * 1000, height: hit.y * 1000 } : null
  }
  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return
    e.stopPropagation()
    onSelect()
    const p = wallPoint(e)
    if (!p) return
    // 잡은 지점과 물건 위치의 차이를 기억 → 잡은 자리 그대로 따라오게
    drag.current = { da: along - p.along, dh: item.sill - p.height }
    ;(e.target as unknown as Element).setPointerCapture(e.pointerId)
    if (controls) controls.enabled = false
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    const p = wallPoint(e)
    if (p) onMove(p.along + drag.current.da, p.height + drag.current.dh)
  }
  const up = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    drag.current = null
    ;(e.target as unknown as Element).releasePointerCapture(e.pointerId)
    if (controls) controls.enabled = true
    onDragEnd()
  }

  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      // 클릭이 뒤의 바닥·벽까지 전달되지 않게 + 짧은 우클릭으로도 선택
      onClick={(e) => interactive && e.stopPropagation()}
      onContextMenu={(e) => {
        if (!interactive || e.delta > 4) return
        e.stopPropagation()
        onSelect()
      }}
      onPointerOver={() => interactive && (document.body.style.cursor = 'grab')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {item.kind === 'window' && (
        <group position={[0, sill + h / 2, 0]}>
          {/* 창틀 4개 + 가운데 살 + 유리 */}
          <mesh position={[0, h / 2 - f / 2, 0]}><boxGeometry args={[w, f, T + 0.02]} /><meshStandardMaterial color={FRAME} /></mesh>
          <mesh position={[0, -h / 2 + f / 2, 0]}><boxGeometry args={[w, f, T + 0.04]} /><meshStandardMaterial color={FRAME} /></mesh>
          <mesh position={[-w / 2 + f / 2, 0, 0]}><boxGeometry args={[f, h, T + 0.02]} /><meshStandardMaterial color={FRAME} /></mesh>
          <mesh position={[w / 2 - f / 2, 0, 0]}><boxGeometry args={[f, h, T + 0.02]} /><meshStandardMaterial color={FRAME} /></mesh>
          {item.width > 1100 && <mesh><boxGeometry args={[f * 0.8, h, 0.04]} /><meshStandardMaterial color={FRAME} /></mesh>}
          <mesh>
            <boxGeometry args={[w - f, h - f, 0.012]} />
            <meshStandardMaterial color="#a9d3ee" transparent opacity={0.28} roughness={0.1} />
          </mesh>
        </group>
      )}

      {item.kind === 'door' && (
        <group position={[0, h / 2, 0]}>
          <mesh position={[0, h / 2 - f / 2, 0]}><boxGeometry args={[w, f, T + 0.02]} /><meshStandardMaterial color={FRAME} /></mesh>
          <mesh position={[-w / 2 + f / 2, 0, 0]}><boxGeometry args={[f, h, T + 0.02]} /><meshStandardMaterial color={FRAME} /></mesh>
          <mesh position={[w / 2 - f / 2, 0, 0]}><boxGeometry args={[f, h, T + 0.02]} /><meshStandardMaterial color={FRAME} /></mesh>
          {/* 문짝 + 손잡이. 평소엔 닫힌 모습, 걷기 모드에선 경첩을 축으로 90° 열린 모습 */}
          <group position={[hinge * (w / 2 - f), 0, walking ? swing * (T / 2) : 0]} rotation={[0, walking ? Math.asin(swing * hinge) : 0, 0]}>
            <mesh castShadow position={[-hinge * (w / 2 - f), -f / 2, 0]}>
              <boxGeometry args={[w - 2 * f, h - f, 0.04]} />
              <meshStandardMaterial color={DOOR} roughness={0.7} />
            </mesh>
            <mesh position={[-hinge * (w - 2 * f - 0.09), -h / 2 + 1.0, 0]}>
              <boxGeometry args={[0.12, 0.03, 0.12]} />
              <meshStandardMaterial color="#8f8f94" />
            </mesh>
          </group>
        </group>
      )}

      {item.kind === 'outlet' && (
        <group position={[0, sill + h / 2, inward * (T / 2 + 0.006)]}>
          <mesh><boxGeometry args={[w, h, 0.012]} /><meshStandardMaterial color="#fafafa" /></mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, s * h * 0.22, inward * 0.007]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[w * 0.28, w * 0.28, 0.004, 20]} />
              <meshStandardMaterial color="#52525b" />
            </mesh>
          ))}
        </group>
      )}

      {selected && (
        <lineSegments geometry={outline} position={[0, sill + h / 2, item.kind === 'outlet' ? inward * (T / 2) : 0]}>
          <lineBasicMaterial color="#2563eb" />
        </lineSegments>
      )}
    </group>
  )
}
