import { useMemo, useRef, useState } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import type { FurnitureInstance, FurnitureLibraryItem } from '../types'
import { bottomOf } from '../library'
import { buildParts, toneColor } from '../models'
import { mm, toMm } from '../units'
import { ctrlHeld, isAddClick } from '../keys'

type Props = {
  instance: FurnitureInstance
  item: FurnitureLibraryItem
  selected: boolean
  multi?: boolean // 여러 개 고른 것 중 하나 (테두리를 더 두껍게)
  wallHeight: number
  lit: boolean // 조명이 켜져 있는가
  interactive: boolean // 선택 도구일 때만 잡아서 옮길 수 있다
  onSelect: (additive?: boolean) => void // additive: Ctrl+클릭 (더 고르기·빼기)
  onMove: (x: number, y: number) => void
  onDragEnd: () => void
}


/** 배치된 가구 하나. 부품 여러 개로 조립해서 그리고, 드래그로 이동할 수 있다 */
export default function FurnitureMesh({ instance, item, selected, multi = false, wallHeight, lit, interactive, onSelect, onMove, onDragEnd }: Props) {
  const [hover, setHover] = useState(false) // Ctrl을 누르고 마우스를 올렸나 (더해질 것 미리 보기)
  // 카메라 조작기. 가구를 끄는 동안에는 꺼서 화면이 같이 움직이지 않게 한다
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null
  // useRef: 화면을 다시 그리지 않아도 되는 값 보관 (드래그 상태)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  const parts = useMemo(
    () => buildParts(item.shape, item.width, item.depth, item.height),
    [item.shape, item.width, item.depth, item.height],
  )
  // 테두리: 상자의 모서리 12개 (굵기를 정할 수 있는 선으로 그린다)
  const outline = useMemo(() => {
    const [w, h, d] = [mm(item.width) / 2, mm(item.height), mm(item.depth) / 2]
    const c = [
      [-w, 0, -d], [w, 0, -d], [w, 0, d], [-w, 0, d],
      [-w, h, -d], [w, h, -d], [w, h, d], [-w, h, d],
    ] as [number, number, number][]
    const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
    return edges.flatMap(([a, b]) => [c[a], c[b]])
  }, [item.width, item.height, item.depth])
  const main = instance.color ?? item.color
  const accent = instance.accent ?? item.accent

  // 천장등은 천장에 붙이고, 책상 위 물건은 띄운다
  const baseY = mm(bottomOf(item, wallHeight))

  /** 마우스 위치 → 가구 바닥 높이의 평면 위 좌표(mm). 띄운 물건도 잡은 자리 그대로 따라오게 */
  const floorPoint = (e: ThreeEvent<PointerEvent>) => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), item.mount === 'ceiling' ? 0 : -baseY)
    const hit = e.ray.intersectPlane(plane, new THREE.Vector3())
    return hit ? { x: toMm(hit.x), y: toMm(hit.z) } : null
  }

  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    // Ctrl(⌘)+왼쪽 클릭: 누르는 순간 바로 여러 개 고르기에 더하거나 뺀다 (잡아서 끌지는 않는다)
    if (interactive && isAddClick(e)) {
      e.stopPropagation()
      onSelect(true)
      return
    }
    // 왼쪽 버튼만 가구를 잡는다. (오른쪽 버튼·Shift+드래그는 화면 회전용)
    if (!interactive || e.button !== 0 || e.shiftKey) return
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
    onDragEnd()
  }

  const glowing = lit && item.light === true

  return (
    <group
      position={[mm(instance.x), baseY, mm(instance.y)]}
      rotation={[0, THREE.MathUtils.degToRad(-instance.rotation), 0]}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      // 손을 뗄 때 생기는 클릭이 뒤에 있는 바닥까지 전달돼 방이 선택되지 않게 막는다
      onClick={(e) => interactive && e.stopPropagation()}
      // 짧은 우클릭(끌지 않음)도 가구 선택. 끌면 화면 회전이라 무시
      onContextMenu={(e) => {
        if (!interactive || e.delta > 4) return
        e.stopPropagation()
        if (ctrlHeld(e)) return // Ctrl+클릭은 누르는 순간 이미 처리했다 (맥은 우클릭으로도 한 번 더 온다)
        onSelect()
      }}
      onPointerOver={() => (document.body.style.cursor = 'grab')}
      onPointerMove={(e) => {
        handleMove(e)
        const want = interactive && ctrlHeld(e)
        if (want !== hover) setHover(want)
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
        setHover(false)
      }}
    >
      {parts.map((p, i) => (
        <mesh
          key={i}
          castShadow={item.mount !== 'ceiling' && p.tone !== 'glass'}
          receiveShadow
          position={[mm(p.x), mm(p.y), mm(p.z)]}
          rotation={p.axis === 'z' ? [Math.PI / 2, 0, 0] : p.axis === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0]}
          scale={p.kind === 'ball' ? [mm(p.w), mm(p.h), mm(p.d)] : [1, 1, 1]}
        >
          {p.kind === 'box' && <boxGeometry args={[mm(p.w), mm(p.h), mm(p.d)]} />}
          {p.kind === 'cyl' && <cylinderGeometry args={[mm(p.w) / 2, mm(p.w) / 2, mm(p.h), 28]} />}
          {p.kind === 'ball' && <sphereGeometry args={[0.5, 24, 16]} />}
          <meshStandardMaterial
            color={toneColor(p.tone, main, accent)}
            roughness={p.tone === 'glass' ? 0.08 : 0.8}
            metalness={p.tone === 'glass' ? 0.15 : 0}
            transparent={p.tone === 'glass'}
            opacity={p.tone === 'glass' ? 0.55 : 1}
            depthWrite={p.tone !== 'glass'}
            emissive={glowing && p.tone === 'glow' ? '#ffd28a' : '#000000'}
            emissiveIntensity={glowing && p.tone === 'glow' ? 1.4 : 0}
          />
        </mesh>
      ))}

      {/* 켜진 조명은 주변을 실제로 밝힌다 */}
      {glowing && (
        <pointLight
          position={[0, item.mount === 'ceiling' ? -0.12 : mm(item.height) - 0.14, 0]}
          intensity={item.mount === 'ceiling' ? 14 : 7}
          decay={2}
          color="#ffe2b8"
        />
      )}

      {/* 잡기 쉽게: 가구 전체를 감싸는 투명 상자 (다리 사이 빈 곳을 눌러도 잡힌다) */}
      <mesh position={[0, mm(item.height) / 2, 0]}>
        <boxGeometry args={[mm(item.width), mm(item.height), mm(item.depth)]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {(selected || hover) && (
        <Line
          points={outline}
          segments
          color={selected ? '#2563eb' : '#60a5fa'}
          lineWidth={selected ? (multi ? 4.5 : 2.5) : 2}
          raycast={() => null} // 테두리는 클릭을 받지 않는다
        />
      )}
    </group>
  )
}
