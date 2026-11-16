import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Finish, RoomShape, Selection } from '../types'
import { wallPieces, type WallPiece } from '../plan'
import { patternCanvas } from '../finishes'
import { mm } from '../units'

type Props = {
  rooms: RoomShape[]
  wallHeight: number
  selection: Selection
  onSelectRoom: (id: string) => void
}

/** 평면도(방들)를 3D로: 방마다 바닥 + 바깥 테두리 벽 */
export default function Plan3D({ rooms, wallHeight, selection, onSelectRoom }: Props) {
  const pieces = useMemo(() => wallPieces(rooms), [rooms])
  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])

  return (
    <group>
      {rooms.map((room, i) => (
        <Floor
          key={room.id}
          room={room}
          lift={i * 0.0005} // 겹친 방의 바닥이 깜빡이지 않게 아주 조금씩 높이 차이를 둔다
          selected={selection?.type === 'room' && selection.id === room.id}
          onSelect={() => onSelectRoom(room.id)}
        />
      ))}
      {pieces.map((piece) => (
        <Wall key={piece.key} piece={piece} height={wallHeight} finish={roomById.get(piece.roomId)!.wall} />
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

type FloorProps = { room: RoomShape; lift: number; selected: boolean; onSelect: () => void }

function Floor({ room, lift, selected, onSelect }: FloorProps) {
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
        rotation={[-Math.PI / 2, 0, 0]}
        position={[x + W / 2, lift, z + D / 2]}
        onClick={(e) => {
          // 화면을 끌다가 뗀 경우(delta가 큼)는 클릭으로 치지 않는다
          if (e.delta > 4) return
          e.stopPropagation()
          onSelect()
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

type WallProps = { piece: WallPiece; height: number; finish: Finish }

const WALL_TOP = '#deddd9' // 벽 윗면(잘린 단면) 색

/** 벽 조각 하나. 카메라가 벽 바깥쪽에 있으면 숨겨서 방 안이 보이게 한다(컷어웨이) */
function Wall({ piece, height, finish }: WallProps) {
  const ref = useRef<THREE.Mesh>(null)
  const H = mm(height)
  const { rect } = piece
  const size = mm(finish.size)
  const texture = useFinishTexture(finish, mm(piece.length) / size, H / size)

  const center = useMemo(
    () => new THREE.Vector3(mm(rect.x + rect.w / 2), H / 2, mm(rect.y + rect.d / 2)),
    [rect.x, rect.y, rect.w, rect.d, H],
  )
  const outward = useMemo(() => new THREE.Vector3(piece.nx, 0, piece.ny), [piece.nx, piece.ny])
  const toCamera = useMemo(() => new THREE.Vector3(), [])

  // useFrame: 화면을 다시 그릴 때마다(초당 약 60번) 실행
  useFrame(({ camera }) => {
    if (!ref.current) return
    toCamera.subVectors(camera.position, center)
    ref.current.visible = toCamera.dot(outward) < 0
  })

  // 박스의 6개 면: 0,1 = 좌우(±x) / 2,3 = 위아래 / 4,5 = 앞뒤(±z)
  // 벽지는 벽의 넓은 면에만 입힌다. 가로 벽은 앞뒤 면, 세로 벽은 좌우 면이 넓은 면
  const wide = piece.horizontal ? [4, 5] : [0, 1]
  return (
    <mesh ref={ref} position={center}>
      <boxGeometry args={[mm(rect.w), H, mm(rect.d)]} />
      {[0, 1, 2, 3, 4, 5].map((face) =>
        wide.includes(face) ? (
          <meshStandardMaterial
            key={`${face}-${texture ? 'pattern' : 'solid'}`}
            attach={`material-${face}`}
            color={texture ? '#ffffff' : finish.color}
            map={texture}
            roughness={0.95}
          />
        ) : (
          <meshStandardMaterial key={face} attach={`material-${face}`} color={face === 2 ? WALL_TOP : finish.color} roughness={0.95} />
        ),
      )}
    </mesh>
  )
}
