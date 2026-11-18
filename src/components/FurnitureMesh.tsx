import { useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { FurnitureInstance, FurnitureLibraryItem } from '../types'
import { buildParts, toneColor } from '../models'
import { mm, toMm } from '../units'

type Props = {
  instance: FurnitureInstance
  item: FurnitureLibraryItem
  selected: boolean
  wallHeight: number
  lit: boolean // 조명이 켜져 있는가
  interactive: boolean // 선택 도구일 때만 잡아서 옮길 수 있다
  onSelect: (additive?: boolean) => void // additive: Ctrl+클릭 (더 고르기·빼기)
  onMove: (x: number, y: number) => void
  onDragEnd: () => void
}

// 바닥 평면 (y = 0). 마우스 광선이 바닥의 어디에 닿는지 계산할 때 사용
const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

/** 배치된 가구 하나. 부품 여러 개로 조립해서 그리고, 드래그로 이동할 수 있다 */
export default function FurnitureMesh({ instance, item, selected, wallHeight, lit, interactive, onSelect, onMove, onDragEnd }: Props) {
  // 카메라 조작기. 가구를 끄는 동안에는 꺼서 화면이 같이 움직이지 않게 한다
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null
  // useRef: 화면을 다시 그리지 않아도 되는 값 보관 (드래그 상태)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const ctrlPress = useRef<{ x: number; y: number } | null>(null) // Ctrl을 누른 채 누른 자리

  const parts = useMemo(
    () => buildParts(item.shape, item.width, item.depth, item.height),
    [item.shape, item.width, item.depth, item.height],
  )
  const outline = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(mm(item.width), mm(item.height), mm(item.depth))),
    [item.width, item.height, item.depth],
  )
  const main = instance.color ?? item.color
  const accent = instance.accent ?? item.accent

  /** 마우스 위치 → 바닥 위 좌표(mm) */
  const floorPoint = (e: ThreeEvent<PointerEvent>) => {
    const hit = e.ray.intersectPlane(FLOOR, new THREE.Vector3())
    return hit ? { x: toMm(hit.x), y: toMm(hit.z) } : null
  }

  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    // Ctrl(⌘·Shift)+클릭은 여러 개 고르기. 끌면 화면 회전이 되도록 여기서 막지 않고, 손을 뗄 때 판단한다
    // (맥의 Ctrl+클릭은 오른쪽 버튼으로 올 때도 있다)
    if (interactive && (e.button === 0 || e.button === 2) && (e.ctrlKey || e.metaKey || e.shiftKey)) {
      ctrlPress.current = { x: e.clientX, y: e.clientY }
      return
    }
    ctrlPress.current = null
    // 왼쪽 버튼만 가구를 잡는다. (오른쪽 버튼·Ctrl+드래그는 화면 회전용)
    if (!interactive || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return
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
    const press = ctrlPress.current
    if (press) {
      ctrlPress.current = null
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) <= 4) {
        e.stopPropagation()
        onSelect(true)
      }
      return
    }
    if (!drag.current) return
    drag.current = null
    ;(e.target as unknown as Element).releasePointerCapture(e.pointerId)
    if (controls) controls.enabled = true
    onDragEnd()
  }

  // 천장등은 천장에 붙여서 그린다
  const baseY = item.mount === 'ceiling' ? mm(wallHeight - item.height) : 0
  const glowing = lit && item.light === true

  return (
    <group
      position={[mm(instance.x), baseY, mm(instance.y)]}
      rotation={[0, THREE.MathUtils.degToRad(-instance.rotation), 0]}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      // 손을 뗄 때 생기는 클릭이 뒤에 있는 바닥까지 전달돼 방이 선택되지 않게 막는다
      onClick={(e) => interactive && e.stopPropagation()}
      // 짧은 우클릭(끌지 않음)도 가구 선택. 끌면 화면 회전이라 무시
      onContextMenu={(e) => {
        if (!interactive || e.delta > 4) return
        e.stopPropagation()
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          // 맥의 Ctrl+클릭은 누르는 순간 우클릭(메뉴)으로 온다 → 여기서 더하고, 손 뗄 때는 다시 하지 않게
          if (ctrlPress.current) {
            ctrlPress.current = null
            onSelect(true)
          }
          return
        }
        onSelect()
      }}
      onPointerOver={() => (document.body.style.cursor = 'grab')}
      onPointerOut={() => (document.body.style.cursor = '')}
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

      {selected && (
        <lineSegments geometry={outline} position={[0, mm(item.height) / 2, 0]}>
          <lineBasicMaterial color="#2563eb" />
        </lineSegments>
      )}
    </group>
  )
}
