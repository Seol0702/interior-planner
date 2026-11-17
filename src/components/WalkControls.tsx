import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { canStand, clearDistance, findStandingSpot, walk, type Obstacles } from '../walk'

/** 걷기 동작 (키보드와 화면 단추가 함께 쓴다) */
export type WalkAction = 'forward' | 'back' | 'left' | 'right' | 'turnLeft' | 'turnRight' | 'run'
export type WalkView = 'first' | 'third'

type Props = {
  view: WalkView
  body: { height: number; eye: number; width: number } // mm
  obstacles: Obstacles
  wallHeight: number // mm
  input: RefObject<Set<WalkAction>>
  onFail: () => void // 설 자리를 못 찾았을 때
}

// 키보드 자판 위치 → 동작 (한/영 상태와 상관없이 e.code로 판단)
const KEYS: Record<string, WalkAction> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  KeyD: 'right',
  ArrowLeft: 'turnLeft',
  KeyQ: 'turnLeft',
  ArrowRight: 'turnRight',
  KeyE: 'turnRight',
  ShiftLeft: 'run',
  ShiftRight: 'run',
}

const WALK_SPEED = 1300 // 걷는 속도 (mm/초) - 보통 걸음 약 4.7km/h
const RUN_SPEED = 2600
const TURN_SPEED = 1.9 // 방향키로 도는 속도 (라디안/초)
const LOOK_SPEED = 0.0045 // 마우스로 둘러보는 감도
const FOV = 70 // 걷기 모드 시야각 (사람 눈에 가깝게 넓힘)

/**
 * 걷기 모드: 카메라를 사람 눈높이에 두고 키보드·마우스로 집 안을 돌아다닌다.
 * 벽(문 자리 제외)과 가구에는 부딪혀서 몸 폭보다 좁은 틈은 지나가지 못한다.
 */
export default function WalkControls({ view, body, obstacles, wallHeight, input, onFail }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const radius = body.width / 2

  // 사람의 상태 (화면을 다시 그리지 않아도 되는 값이라 ref에 둔다)
  const pos = useRef<{ x: number; y: number } | null>(null) // 평면 위치 (mm)
  const yaw = useRef(0) // 바라보는 수평 방향 (라디안)
  const pitch = useRef(0) // 위아래 (라디안)
  const stride = useRef(0) // 걸음 흔들림 위상
  const moving = useRef(0) // 0 = 서 있음, 1 = 걷는 중 (부드럽게 바뀜)
  const distance = useRef(2.4) // 3인칭 카메라 거리 (m)
  const shownDistance = useRef(2.4)
  const avatar = useRef<THREE.Group>(null)
  const limbs = useRef<(THREE.Object3D | null)[]>([])
  const latest = useRef({ obstacles, radius, onFail })
  latest.current = { obstacles, radius, onFail }

  // 처음 켤 때: 지금 보고 있던 곳 근처의 빈 바닥에 사람을 세운다 (한 번만)
  useEffect(() => {
    if (!pos.current) {
      const dir = camera.getWorldDirection(new THREE.Vector3())
      let x = camera.position.x
      let z = camera.position.z
      if (dir.y < -0.05) {
        const t = -camera.position.y / dir.y // 시선이 바닥(높이 0)에 닿는 곳
        x += dir.x * t
        z += dir.z * t
      }
      const { obstacles: o, radius: r, onFail: fail } = latest.current
      let px = x * 1000
      let py = z * 1000
      // 시선이 집 밖을 향하고 있었다면 가장 넓은 방 가운데에서 시작
      if (!o.rooms.some((room) => px >= room.x && px <= room.x + room.w && py >= room.y && py <= room.y + room.d)) {
        const big = [...o.rooms].sort((a, b) => b.w * b.d - a.w * a.d)[0]
        if (big) {
          px = big.x + big.w / 2
          py = big.y + big.d / 2
        }
      }
      const spot = findStandingSpot(o, px, py, r)
      if (!spot) {
        fail()
        return
      }
      pos.current = spot
      // 바라볼 방향: 원래 보던 방향이 바로 막혀 있으면, 가장 탁 트인 방향으로
      const open = (a: number) => clearDistance(o, spot.x, spot.y, -Math.sin(a), -Math.cos(a), 4000, r)
      let best = Math.atan2(-dir.x, -dir.z)
      if (open(best) < 1500) {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2
          if (open(a) > open(best)) best = a
        }
      }
      yaw.current = best
      pitch.current = 0
    }
    const oldFov = camera.fov
    camera.fov = FOV
    camera.updateProjectionMatrix()
    return () => {
      camera.fov = oldFov
      camera.updateProjectionMatrix()
    }
  }, [camera])

  // 가구가 바뀌어서 지금 자리에 못 서게 되면 가까운 빈자리로 옮긴다
  useEffect(() => {
    const p = pos.current
    if (p && !canStand(obstacles, p.x, p.y, radius)) {
      const spot = findStandingSpot(obstacles, p.x, p.y, radius)
      if (spot) pos.current = spot
    }
  }, [obstacles, radius])

  // 키보드: 누르고 있는 동안 걷는다
  useEffect(() => {
    const keys = input.current
    const typing = (e: KeyboardEvent) => ['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
    const down = (e: KeyboardEvent) => {
      const action = KEYS[e.code]
      if (!action || typing(e) || e.ctrlKey || e.metaKey) return
      keys.add(action)
      e.preventDefault() // 방향키로 페이지가 스크롤되지 않게
    }
    const up = (e: KeyboardEvent) => {
      const action = KEYS[e.code]
      if (action) keys.delete(action)
    }
    const clear = () => keys.clear() // 다른 창으로 갔다 오면 키가 눌린 채로 남지 않게
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      keys.clear()
    }
  }, [input])

  // 마우스(손가락)로 끌면 둘러보기, 휠은 3인칭 카메라 거리
  useEffect(() => {
    const el = gl.domElement
    let last: { x: number; y: number; id: number } | null = null
    const down = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY, id: e.pointerId }
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      if (!last || e.pointerId !== last.id) return
      yaw.current -= (e.clientX - last.x) * LOOK_SPEED
      pitch.current -= (e.clientY - last.y) * LOOK_SPEED
      last = { x: e.clientX, y: e.clientY, id: e.pointerId }
    }
    const up = (e: PointerEvent) => {
      if (!last || e.pointerId !== last.id) return
      last = null
      el.releasePointerCapture(e.pointerId)
      el.style.cursor = 'grab'
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      distance.current = THREE.MathUtils.clamp(distance.current * (e.deltaY > 0 ? 1.12 : 0.89), 1, 6)
    }
    const menu = (e: Event) => e.preventDefault() // 오른쪽 버튼으로 끌 때 메뉴가 뜨지 않게
    el.style.cursor = 'grab'
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('contextmenu', menu)
    return () => {
      el.style.cursor = ''
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('contextmenu', menu)
    }
  }, [gl])

  const forward = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, rawDt) => {
    const p = pos.current
    if (!p) return
    const dt = Math.min(rawDt, 0.1) // 탭을 오래 비웠다 돌아와도 한 번에 멀리 가지 않게
    const keys = input.current
    const on = (a: WalkAction) => (keys.has(a) ? 1 : 0)

    // 돌기
    yaw.current += (on('turnLeft') - on('turnRight')) * TURN_SPEED * dt
    const third = view === 'third'
    pitch.current = THREE.MathUtils.clamp(pitch.current, third ? -1.1 : -1.4, third ? 0.45 : 1.4)

    // 걷기: 앞(-z) 방향과 오른쪽 방향을 섞어서 움직인다
    const f = on('forward') - on('back')
    const s = on('right') - on('left')
    const sin = Math.sin(yaw.current)
    const cos = Math.cos(yaw.current)
    let mx = -sin * f + cos * s
    let my = -cos * f - sin * s
    const len = Math.hypot(mx, my)
    let walked = 0
    if (len > 0) {
      const step = ((keys.has('run') ? RUN_SPEED : WALK_SPEED) * dt) / len
      mx *= step
      my *= step
      const next = walk(obstacles, p.x, p.y, mx, my, radius)
      walked = Math.hypot(next.x - p.x, next.y - p.y)
      pos.current = next
    }
    const target = walked > 0.5 ? 1 : 0
    moving.current += (target - moving.current) * Math.min(1, dt * 8)
    stride.current += walked / 330 // 걸은 거리만큼 다리를 흔든다

    const now = pos.current ?? p
    const x = now.x / 1000
    const z = now.y / 1000
    const H = wallHeight / 1000
    camera.rotation.order = 'YXZ'
    camera.rotation.set(pitch.current, yaw.current, 0)

    if (!third) {
      // 1인칭: 눈높이 + 걸을 때 아주 살짝 위아래로 흔들림
      const bob = Math.abs(Math.sin(stride.current)) * 0.018 * moving.current
      camera.position.set(x, Math.min(body.eye / 1000, H - 0.08) + bob, z)
    } else {
      // 3인칭: 머리 근처를 중심으로 뒤에서 따라다닌다. 벽·천장 밖으로는 나가지 않는다
      const pivotY = Math.min(body.eye / 1000 + 0.1, H - 0.25)
      forward.set(-sin * Math.cos(pitch.current), Math.sin(pitch.current), -cos * Math.cos(pitch.current))
      let dist = distance.current
      const flat = Math.cos(pitch.current)
      if (flat > 0.01) {
        const free = clearDistance(obstacles, now.x, now.y, sin, cos, dist * flat * 1000, 120) / 1000
        dist = Math.min(dist, free / flat)
      }
      if (forward.y < 0) dist = Math.min(dist, (H - 0.12 - pivotY) / -forward.y) // 천장
      if (forward.y > 0) dist = Math.min(dist, (pivotY - 0.15) / forward.y) // 바닥
      dist = Math.max(0.3, dist)
      // 가까워질 때는 바로, 멀어질 때는 천천히 (벽에 붙었다 떨어질 때 화면이 튀지 않게)
      shownDistance.current = dist < shownDistance.current ? dist : shownDistance.current + (dist - shownDistance.current) * Math.min(1, dt * 4)
      const d = shownDistance.current
      camera.position.set(x - forward.x * d, pivotY - forward.y * d, z - forward.z * d)
    }

    // 사람 모형 (3인칭에서만 보임)
    const a = avatar.current
    if (a) {
      a.visible = third
      a.position.set(x, 0, z)
      a.rotation.y = yaw.current
      const swing = Math.sin(stride.current) * 0.55 * moving.current
      const [legL, legR, armL, armR] = limbs.current
      if (legL) legL.rotation.x = swing
      if (legR) legR.rotation.x = -swing
      if (armL) armL.rotation.x = -swing * 0.7
      if (armR) armR.rotation.x = swing * 0.7
    }
  })

  return <Avatar ref={avatar} limbs={limbs} height={body.height / 1000} width={body.width / 1000} />
}

const SKIN = '#e9c7a5'
const SHIRT = '#5b7899'
const PANTS = '#3b404c'
const HAIR = '#2e2723'
const SHOE = '#26282e'

type AvatarProps = {
  ref: RefObject<THREE.Group | null>
  limbs: RefObject<(THREE.Object3D | null)[]>
  height: number // m
  width: number // 어깨 폭 (m)
}

/** 간단한 사람 모형. 앞쪽이 -z. 크기는 키와 어깨 폭에 맞춘다 */
function Avatar({ ref, limbs, height: h, width: w }: AvatarProps) {
  const k = h / 1.7 // 170cm 기준 비율
  const hip = 0.5 * h
  const shoulder = 0.815 * h
  const head = 0.115 * k // 머리 반지름
  const legR = 0.062 * k
  const armR = 0.042 * k
  const legLen = hip - 0.05 * k
  const armLen = 0.34 * h
  const set = (i: number) => (o: THREE.Object3D | null) => {
    limbs.current[i] = o
  }
  return (
    <group ref={ref} visible={false}>
      {/* 다리 (엉덩이를 축으로 흔들린다) */}
      {[-1, 1].map((side, i) => (
        <group key={side} ref={set(i)} position={[side * 0.085 * k, hip, 0]}>
          <mesh castShadow position={[0, -legLen / 2, 0]}>
            <capsuleGeometry args={[legR, legLen - legR * 2, 4, 10]} />
            <meshStandardMaterial color={PANTS} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -legLen + 0.02, -0.04 * k]}>
            <boxGeometry args={[0.1 * k, 0.06 * k, 0.24 * k]} />
            <meshStandardMaterial color={SHOE} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* 몸통: 위는 어깨 폭만큼 넓고 아래로 갈수록 좁다 */}
      <mesh castShadow position={[0, (hip + shoulder) / 2 + 0.01, 0]} scale={[1, 1, 0.55]}>
        <cylinderGeometry args={[w / 2 - armR * 2, 0.15 * k, shoulder - hip + 0.06, 18]} />
        <meshStandardMaterial color={SHIRT} roughness={0.75} />
      </mesh>
      {/* 팔 (어깨를 축으로 흔들린다) */}
      {[-1, 1].map((side, i) => (
        <group key={side} ref={set(i + 2)} position={[side * (w / 2 - armR), shoulder - 0.02, 0]}>
          <mesh castShadow position={[0, -armLen / 2, 0]}>
            <capsuleGeometry args={[armR, armLen - armR * 2, 4, 10]} />
            <meshStandardMaterial color={SHIRT} roughness={0.75} />
          </mesh>
          <mesh position={[0, -armLen - 0.02, 0]}>
            <sphereGeometry args={[armR * 1.05, 12, 10]} />
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* 목·머리·머리카락 */}
      <mesh position={[0, shoulder + 0.03 * k, 0]}>
        <cylinderGeometry args={[0.05 * k, 0.055 * k, 0.08 * k, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, h - head, 0]} scale={[0.92, 1.08, 1]}>
        <sphereGeometry args={[head, 20, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      {/* 머리카락: 정수리에서 뒤통수 쪽으로 기울여 덮는다 (앞쪽 -z는 얼굴) */}
      <mesh position={[0, h - head + 0.012 * k, 0.008 * k]} rotation={[0.6, 0, 0]} scale={[1.04, 1.04, 1.04]}>
        <sphereGeometry args={[head, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
        <meshStandardMaterial color={HAIR} roughness={0.9} />
      </mesh>
    </group>
  )
}
