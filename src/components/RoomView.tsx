import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import * as THREE from 'three'
import type { Room } from '../types'
import { mm } from '../units'

const WALL_THICKNESS = 100 // 벽 두께 (mm)

type Props = { room: Room }

/** 바닥 + 벽 4개. 방의 왼쪽 위 안쪽 모서리가 (0, 0) */
export default function RoomView({ room }: Props) {
  const W = mm(room.width)
  const D = mm(room.depth)
  const H = mm(room.height)
  const T = mm(WALL_THICKNESS)

  // 벽 4개: 위치(중심), 크기, 바깥쪽을 향하는 방향
  const walls = [
    { key: 'north', pos: [W / 2, H / 2, -T / 2], size: [W + 2 * T, H, T], normal: [0, 0, -1] },
    { key: 'south', pos: [W / 2, H / 2, D + T / 2], size: [W + 2 * T, H, T], normal: [0, 0, 1] },
    { key: 'west', pos: [-T / 2, H / 2, D / 2], size: [T, H, D], normal: [-1, 0, 0] },
    { key: 'east', pos: [W + T / 2, H / 2, D / 2], size: [T, H, D], normal: [1, 0, 0] },
  ] as const

  return (
    <group>
      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[W / 2, 0, D / 2]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#e7d8c4" />
      </mesh>

      {/* 바닥 위 그리드: 가는 선 10cm, 굵은 선 1m */}
      <Grid
        position={[W / 2, 0.001, D / 2]}
        args={[W, D]}
        cellSize={0.1}
        sectionSize={1}
        cellColor="#c9b79f"
        sectionColor="#9a8467"
        cellThickness={0.6}
        sectionThickness={1}
        fadeDistance={60}
      />

      {walls.map((wall) => (
        <CutawayWall key={wall.key} pos={wall.pos} size={wall.size} normal={wall.normal} />
      ))}
    </group>
  )
}

type WallProps = {
  pos: readonly number[]
  size: readonly number[]
  normal: readonly number[]
}

/**
 * 카메라가 벽 바깥쪽에 있으면 그 벽을 숨긴다.
 * (벽이 방 안을 가리지 않게 하는 "컷어웨이" 방식)
 */
function CutawayWall({ pos, size, normal }: WallProps) {
  const ref = useRef<THREE.Mesh>(null)
  const center = new THREE.Vector3(...pos)
  const outward = new THREE.Vector3(...normal)
  const toCamera = new THREE.Vector3()

  // useFrame: 화면을 다시 그릴 때마다(초당 약 60번) 실행
  useFrame(({ camera }) => {
    if (!ref.current) return
    toCamera.subVectors(camera.position, center)
    ref.current.visible = toCamera.dot(outward) < 0
  })

  return (
    <mesh ref={ref} position={[pos[0], pos[1], pos[2]]}>
      <boxGeometry args={[size[0], size[1], size[2]]} />
      <meshStandardMaterial color="#f8f8f6" />
    </mesh>
  )
}
