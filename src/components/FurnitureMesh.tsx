import { useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Edges, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { FurnitureInstance, FurnitureLibraryItem } from '../types'
import { mm, toMm } from '../units'

type Props = {
  instance: FurnitureInstance
  item: FurnitureLibraryItem
  selected: boolean
  onSelect: () => void
  onMove: (x: number, y: number) => void
}

// 바닥 평면 (y = 0). 마우스 광선이 바닥의 어디에 닿는지 계산할 때 사용
const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

/** 배치된 가구 하나 (지금은 박스 모양). 드래그로 이동할 수 있다 */
export default function FurnitureMesh({ instance, item, selected, onSelect, onMove }: Props) {
  // 카메라 조작기. 드래그하는 동안에는 꺼서 화면이 같이 돌지 않게 한다
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null
  // useRef: 화면을 다시 그리지 않아도 되는 값 보관 (드래그 상태)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  /** 마우스 위치 → 바닥 위 좌표(mm) */
  const floorPoint = (e: ThreeEvent<PointerEvent>) => {
    const hit = e.ray.intersectPlane(FLOOR, new THREE.Vector3())
    return hit ? { x: toMm(hit.x), y: toMm(hit.z) } : null
  }

  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation() // 뒤에 있는 다른 물체까지 클릭되지 않게
    onSelect()
    const p = floorPoint(e)
    if (!p) return
    // 잡은 지점과 가구 중심의 차이를 기억 → 잡은 자리 그대로 따라오게
    drag.current = { dx: instance.x - p.x, dy: instance.y - p.y }
    ;(e.target as unknown as Element).setPointerCapture(e.pointerId)
    if (controls) controls.enabled = false
  }

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    const p = floorPoint(e)
    if (p) onMove(p.x + drag.current.dx, p.y + drag.current.dy)
  }

  const handleUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    drag.current = null
    ;(e.target as unknown as Element).releasePointerCapture(e.pointerId)
    if (controls) controls.enabled = true
  }

  return (
    <group
      position={[mm(instance.x), 0, mm(instance.y)]}
      rotation={[0, THREE.MathUtils.degToRad(-instance.rotation), 0]}
    >
      <mesh
        position={[0, mm(item.height) / 2, 0]}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerOver={() => (document.body.style.cursor = 'grab')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <boxGeometry args={[mm(item.width), mm(item.height), mm(item.depth)]} />
        <meshStandardMaterial color={item.color} />
        {/* 테두리 선. 선택되면 파란색 */}
        <Edges color={selected ? '#2563eb' : '#52525b'} lineWidth={selected ? 2.5 : 1} />
      </mesh>

      {/* 앞면 표시: 가구의 앞쪽(소파 앉는 쪽 등)을 알 수 있게 작은 띠 */}
      <mesh position={[0, mm(item.height) + 0.002, mm(item.depth) / 2 - 0.04]}>
        <boxGeometry args={[mm(item.width) * 0.6, 0.004, 0.05]} />
        <meshBasicMaterial color={selected ? '#2563eb' : '#3f3f46'} />
      </mesh>

      {selected && (
        <Html position={[0, mm(item.height) + 0.25, 0]} center className="tag">
          {item.name}
        </Html>
      )}
    </group>
  )
}
