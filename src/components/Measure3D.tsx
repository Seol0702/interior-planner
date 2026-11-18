import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Project } from '../types'
import type { WallPiece } from '../plan'
import { distance, fmtLength, lengthParts, lockAxis, snapPlan, snapTargets, type MeasureState, type P3 } from '../measure'
import { mm, snap } from '../units'

type Props = {
  project: Project
  pieces: WallPiece[]
  measure: MeasureState
  onMeasure: (p: P3) => void
}

const COLOR = '#e11d48'
const CLICK_SLOP = 5 // 이만큼(px) 넘게 움직였으면 화면을 끈 것이지 누른 것이 아님

/** 줄자 점(mm) → 3D 좌표(m) */
const toVec = (p: P3): [number, number, number] => [mm(p.x), mm(p.z), mm(p.y)]

/** 줄자가 닿을 수 있는 물체인가: 보이는 면만 (숨긴 벽, 그림자 전용 벽, 선, 반투명 빛줄기는 빼고) */
function measurable(hit: THREE.Object3D) {
  for (let o: THREE.Object3D | null = hit; o; o = o.parent) {
    if (!o.visible || o.userData.noMeasure) return false
  }
  const mesh = hit as THREE.Mesh & { isLine2?: boolean; isLineSegments2?: boolean }
  if (!mesh.isMesh || mesh.isLine2 || mesh.isLineSegments2) return false
  const material = mesh.material
  if (Array.isArray(material)) return true
  if (material.colorWrite === false || !material.visible) return false
  return !(material.transparent && material.opacity < 0.35)
}

/**
 * 3D 화면의 줄자: 바닥·벽·가구 어디든 두 점을 눌러 거리를 잰다.
 * 화면을 끄는 것(시점 이동)과 누르는 것을 구분하려고, 마우스 이벤트를 캔버스에서 직접 받는다.
 */
export default function Measure3D({ project, pieces, measure, onMeasure }: Props) {
  const { camera, scene, gl } = useThree()
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const targets = useMemo(() => snapTargets(project, pieces), [project, pieces])
  const [aim, setAim] = useState<P3 | null>(null) // 마우스가 가리키는 자리
  // 이벤트 처리에서 최신 값을 쓰려고 ref에 둔다
  const latest = useRef({ measure, onMeasure, targets, wallHeight: project.wallHeight })
  latest.current = { measure, onMeasure, targets, wallHeight: project.wallHeight }
  const pointer = useRef({ ndc: new THREE.Vector2(), shift: false, inside: false, dirty: false })

  /** 화면 위치 → 물체 표면의 점 (벽·가구 모서리에 붙이고, Shift면 똑바로) */
  const pick = (ndc: THREE.Vector2, shift: boolean): P3 | null => {
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(scene.children, true).find((h) => measurable(h.object))
    if (!hit) return null
    const { targets, wallHeight, measure } = latest.current
    // 멀리 있는 것을 잴수록 넉넉하게 붙인다 (화면에서 비슷한 크기가 되게)
    const tol = Math.min(150, Math.max(15, hit.distance * 1000 * 0.015))
    const s = snapPlan(targets, { x: hit.point.x * 1000, y: hit.point.z * 1000 }, tol)
    let z = hit.point.y * 1000
    z = Math.abs(z) < tol ? 0 : Math.abs(z - wallHeight) < tol ? wallHeight : snap(z)
    const p = { x: s.x, y: s.y, z }
    return shift && measure.start ? lockAxis(measure.start, p) : p
  }

  useEffect(() => {
    const el = gl.domElement
    const down = { x: 0, y: 0, id: -1 }
    const setNdc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      pointer.current.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      pointer.current.shift = e.shiftKey
      pointer.current.inside = true
      pointer.current.dirty = true
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      down.x = e.clientX
      down.y = e.clientY
      down.id = e.pointerId
    }
    const onUp = (e: PointerEvent) => {
      if (e.button !== 0 || e.pointerId !== down.id) return
      down.id = -1
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP) return
      setNdc(e)
      const p = pick(pointer.current.ndc, e.shiftKey)
      if (p) latest.current.onMeasure(p)
    }
    const onLeave = () => {
      pointer.current.inside = false
      setAim(null)
    }
    // Shift를 누르거나 떼면 바로 미리보기를 다시 계산
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') return
      pointer.current.shift = e.type === 'keydown'
      pointer.current.dirty = true
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointermove', setNdc)
    el.addEventListener('pointerleave', onLeave)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    el.style.cursor = 'crosshair'
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointermove', setNdc)
      el.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      el.style.cursor = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, scene])

  // 마우스가 움직이면 한 화면에 한 번만 다시 겨눈다 (물체가 많으면 계산이 무겁다)
  useFrame(() => {
    const p = pointer.current
    if (!p.dirty || !p.inside) return
    p.dirty = false
    const next = pick(p.ndc, p.shift)
    setAim((prev) => (prev && next && prev.x === next.x && prev.y === next.y && prev.z === next.z ? prev : next))
  })

  // 시작점을 새로 찍거나 지우면 미리보기도 다시
  useEffect(() => {
    pointer.current.dirty = true
  }, [measure.start])

  return (
    <group userData={{ noMeasure: true }}>
      {measure.list.map((m) => (
        <Dimension3D key={m.id} a={m.a} b={m.b} />
      ))}
      {measure.start && aim && <Dimension3D a={measure.start} b={aim} live />}
      {measure.start && !aim && <Dot p={measure.start} />}
      {aim && (
        <mesh position={toVec(aim)} renderOrder={20}>
          <sphereGeometry args={[0.045, 16, 10]} />
          <meshBasicMaterial color={COLOR} transparent opacity={0.45} depthTest={false} />
        </mesh>
      )}
    </group>
  )
}

function Dot({ p }: { p: P3 }) {
  return (
    <mesh position={toVec(p)} renderOrder={20}>
      <sphereGeometry args={[0.028, 14, 10]} />
      <meshBasicMaterial color={COLOR} depthTest={false} />
    </mesh>
  )
}

/** 3D 치수선: 선 + 양 끝 점 + 가운데 길이 글자 (물체에 가려도 보이게 맨 앞에 그린다) */
function Dimension3D({ a, b, live = false }: { a: P3; b: P3; live?: boolean }) {
  const len = distance(a, b)
  const sub = lengthParts(a, b)
  const mid: [number, number, number] = [mm((a.x + b.x) / 2), mm((a.z + b.z) / 2), mm((a.y + b.y) / 2)]
  return (
    <group>
      <Line points={[toVec(a), toVec(b)]} color={COLOR} lineWidth={2.5} dashed={live} dashSize={0.08} gapSize={0.05} depthTest={false} renderOrder={19} />
      <Dot p={a} />
      <Dot p={b} />
      {len >= 5 && (
        <Html position={mid} center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`measure-label ${live ? 'live' : ''}`}>
            <b>{fmtLength(len)}</b>
            {sub && <span>{sub}</span>}
          </div>
        </Html>
      )}
    </group>
  )
}
