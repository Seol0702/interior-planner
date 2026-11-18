import { useEffect, useRef, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { isAddClick } from '../keys'

/** 범위 고르기 후보: 가구 하나의 가운데 (3D 좌표, m) */
export type BoxCandidate = { id: string; center: [number, number, number] }

type Props = {
  candidates: BoxCandidate[]
  picked: string[] // 지금 골라져 있는 가구들
  rectRef: RefObject<HTMLDivElement | null> // 화면 위에 그릴 점선 사각형
  onBoxSelect: (ids: string[]) => void
}

const SLOP = 5 // 이만큼(px) 넘게 끌어야 범위 고르기로 본다

/**
 * 3D 화면에서 Ctrl(⌘)+드래그: 사각형을 그려 그 안에 가운데가 들어온 가구를 모두 더한다.
 * Ctrl을 누르고 누르는 순간 시점 회전을 잠시 꺼서, 끄는 동안 화면이 돌지 않게 한다.
 */
export default function BoxSelect3D({ candidates, picked, rectRef, onBoxSelect }: Props) {
  const { gl, camera, controls } = useThree()
  const latest = useRef({ candidates, picked, onBoxSelect })
  latest.current = { candidates, picked, onBoxSelect }

  useEffect(() => {
    const el = gl.domElement
    const orbit = controls as unknown as { enabled: boolean } | null
    let start: { x: number; y: number; before: string[] } | null = null
    let dragging = false

    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }
    }
    const draw = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const box = rectRef.current
      if (!box) return
      box.style.display = 'block'
      box.style.left = `${Math.min(a.x, b.x)}px`
      box.style.top = `${Math.min(a.y, b.y)}px`
      box.style.width = `${Math.abs(b.x - a.x)}px`
      box.style.height = `${Math.abs(b.y - a.y)}px`
    }
    const hide = () => {
      if (rectRef.current) rectRef.current.style.display = 'none'
    }

    // 캔버스보다 먼저 받아서(capture) 시점 회전 조작기가 이 누름을 무시하게 한다
    const onDown = (e: PointerEvent) => {
      if (!isAddClick(e)) return
      if (orbit) orbit.enabled = false
      const p = local(e)
      start = { x: p.x, y: p.y, before: latest.current.picked }
      dragging = false
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }
    const onMove = (e: PointerEvent) => {
      if (!start) return
      const p = local(e)
      if (!dragging && Math.hypot(p.x - start.x, p.y - start.y) < SLOP) return
      dragging = true
      draw(start, p)
    }
    const onUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (orbit) orbit.enabled = true
      const s = start
      start = null
      hide()
      if (!s || !dragging) return // 그냥 클릭: 가구에서 이미 더하거나 뺐다
      const p = local(e)
      const [x0, x1] = [Math.min(s.x, p.x), Math.max(s.x, p.x)]
      const [y0, y1] = [Math.min(s.y, p.y), Math.max(s.y, p.y)]
      const v = new THREE.Vector3()
      const hit = latest.current.candidates
        .filter((c) => {
          v.set(...c.center).project(camera)
          if (v.z > 1) return false // 카메라 뒤
          const sx = (v.x * 0.5 + 0.5) * p.w
          const sy = (-v.y * 0.5 + 0.5) * p.h
          return sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1
        })
        .map((c) => c.id)
      // 누를 때 이미 골라져 있던 것 + 사각형 안의 것
      latest.current.onBoxSelect([...new Set([...s.before, ...hit])])
    }

    el.addEventListener('pointerdown', onDown, true)
    return () => {
      el.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (orbit) orbit.enabled = true
      hide()
    }
  }, [gl, camera, controls, rectRef])

  return null
}
