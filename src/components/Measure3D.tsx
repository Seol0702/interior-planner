import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Project } from '../types'
import type { WallPiece } from '../plan'
import { alignAngle, distance, fmtLength, lengthParts, lockAxis, snapPlan, snapTargets, type MeasureState, type P3 } from '../measure'
import { mm, snap } from '../units'

type Props = {
  project: Project
  pieces: WallPiece[]
  measure: MeasureState
  active: boolean // 줄자 도구를 들고 있나 (아니면 잰 것만 보여 준다)
  labelLayer: RefObject<HTMLDivElement | null> // 길이 글자를 붙일 화면 위 층
  selectedId: string | null // 고른 줄자
  pickable: boolean // 선택 도구일 때: 줄자 선·글자를 눌러 고를 수 있다
  onPick: (id: string) => void
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
export default function Measure3D({ project, pieces, measure, active, labelLayer, selectedId, pickable, onPick, onMeasure }: Props) {
  const pickRef = useRef(onPick)
  pickRef.current = onPick
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
    if (!measure.start) return p
    return shift ? lockAxis(measure.start, p) : alignAngle(measure.start, p, tol)
  }

  useEffect(() => {
    if (!active) return
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
      pointer.current.inside = false
      setAim(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, scene, active])

  // 마우스가 움직이면 한 화면에 한 번만 다시 겨눈다 (물체가 많으면 계산이 무겁다)
  useFrame(() => {
    const p = pointer.current
    if (!p.dirty || !p.inside || !active) return
    p.dirty = false
    const next = pick(p.ndc, p.shift)
    setAim((prev) => (prev && next && prev.x === next.x && prev.y === next.y && prev.z === next.z ? prev : next))
  })

  // 시작점을 새로 찍거나 지우면 미리보기도 다시
  useEffect(() => {
    pointer.current.dirty = true
  }, [measure.start])

  // 길이 글자: 화면 위 층에 글자 상자를 만들어 두고, 매 화면마다 3D 위치에 맞춰 옮긴다
  const live = active && measure.start && aim ? { id: 'live', a: measure.start, b: aim } : null
  const labels = useMemo(
    () =>
      [...measure.list, ...(live ? [live] : [])]
        .filter((m) => distance(m.a, m.b) >= 5)
        .map((m) => ({
          id: m.id,
          live: m.id === 'live',
          pos: new THREE.Vector3(...toVec({ x: (m.a.x + m.b.x) / 2, y: (m.a.y + m.b.y) / 2, z: (m.a.z + m.b.z) / 2 })),
          text: fmtLength(distance(m.a, m.b)),
          sub: lengthParts(m.a, m.b),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measure.list, live?.a, live?.b],
  )
  const nodes = useRef<HTMLDivElement[]>([])
  useEffect(() => {
    const layer = labelLayer.current
    if (!layer) return
    const els = labels.map((l) => {
      const el = document.createElement('div')
      el.className = `measure-label ${l.live ? 'live' : ''} ${l.id === selectedId ? 'selected' : ''} ${pickable && !l.live ? 'pickable' : ''}`
      if (pickable && !l.live) el.addEventListener('click', () => pickRef.current(l.id)) // 글자를 누르면 그 줄자를 고른다
      const b = document.createElement('b')
      b.textContent = l.text
      el.appendChild(b)
      if (l.sub) {
        const span = document.createElement('span')
        span.textContent = l.sub
        el.appendChild(span)
      }
      el.style.visibility = 'hidden' // 첫 위치를 잡기 전에는 숨김
      layer.appendChild(el)
      return el
    })
    nodes.current = els
    return () => els.forEach((el) => el.remove())
  }, [labels, labelLayer, selectedId, pickable])
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    labels.forEach((l, i) => {
      const el = nodes.current[i]
      if (!el) return
      v.copy(l.pos).project(camera)
      el.style.transform = `translate(${((v.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * size.height).toFixed(1)}px) translate(-50%, -50%)`
      el.style.visibility = v.z < 1 ? 'visible' : 'hidden'
    })
  })

  return (
    <group userData={{ noMeasure: true }}>
      {measure.list.map((m) => (
        <Dimension3D key={m.id} a={m.a} b={m.b} selected={m.id === selectedId} onClick={pickable ? () => onPick(m.id) : undefined} />
      ))}
      {active && measure.start && aim && <Dimension3D a={measure.start} b={aim} live />}
      {active && measure.start && !aim && <Dot p={measure.start} />}
      {active && aim && (
        <mesh position={toVec(aim)} renderOrder={20}>
          <sphereGeometry args={[0.045, 16, 10]} />
          <meshBasicMaterial color={COLOR} transparent opacity={0.45} depthTest={false} />
        </mesh>
      )}
    </group>
  )
}

function Dot({ p, color = COLOR }: { p: P3; color?: string }) {
  return (
    <mesh position={toVec(p)} renderOrder={20}>
      <sphereGeometry args={[0.028, 14, 10]} />
      <meshBasicMaterial color={color} depthTest={false} />
    </mesh>
  )
}

/** 3D 치수선: 선 + 양 끝 점 (물체에 가려도 보이게 맨 앞에 그린다). 길이 글자는 화면 위 층에 따로 붙인다 */
function Dimension3D({ a, b, live = false, selected = false, onClick }: { a: P3; b: P3; live?: boolean; selected?: boolean; onClick?: () => void }) {
  const color = selected ? '#2563eb' : COLOR // 고른 줄자는 파랗게
  // 누를 자리: 선을 감싸는 보이지 않는 막대 (가는 선은 누르기 어렵고, 바닥 위 선은 바닥과 겹친다)
  const hit = useMemo(() => {
    const from = new THREE.Vector3(...toVec(a))
    const to = new THREE.Vector3(...toVec(b))
    const dir = to.clone().sub(from)
    const length = dir.length()
    return {
      length,
      center: from.clone().add(to).multiplyScalar(0.5),
      rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), length > 0 ? dir.normalize() : new THREE.Vector3(1, 0, 0)),
    }
  }, [a, b])
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!onClick || e.delta > 4) return
    e.stopPropagation()
    onClick()
  }
  return (
    <group>
      {onClick && hit.length > 0 && (
        <mesh position={hit.center} quaternion={hit.rotation} onClick={click}>
          <boxGeometry args={[hit.length, 0.09, 0.09]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <Line
        points={[toVec(a), toVec(b)]}
        color={color}
        lineWidth={selected ? 4 : 2.5}
        dashed={live}
        dashSize={0.08}
        gapSize={0.05}
        depthTest={false}
        renderOrder={19}
      />
      <Dot p={a} color={color} />
      <Dot p={b} color={color} />
    </group>
  )
}
