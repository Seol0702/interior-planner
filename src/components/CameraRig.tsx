import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { RoomShape, ViewName } from '../types'
import { viewPose } from '../camera'

export type ViewRequest = { view: ViewName; nonce: number }

type Controls = { target: THREE.Vector3; update: () => void }
type Animation = {
  t: number
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
  from: THREE.Spherical
  to: THREE.Spherical
}

const DURATION = 0.5 // 시점 전환 시간 (초)

/** 시점 버튼(위·옆 등)을 누르면 카메라를 부드럽게 그 자리로 옮긴다 */
export default function CameraRig({ request, rooms }: { request: ViewRequest | null; rooms: RoomShape[] }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as Controls | null
  const size = useThree((s) => s.size)
  const aspect = useRef(1.5)
  aspect.current = size.width / Math.max(1, size.height)
  const started = useRef(false)
  const anim = useRef<Animation | null>(null)
  const roomsRef = useRef(rooms)
  roomsRef.current = rooms

  // 처음 한 번: 실제 화면 비율에 맞춰 방 전체가 보이게 카메라를 놓는다
  useEffect(() => {
    if (!controls || started.current) return
    started.current = true
    const pose = viewPose('iso', roomsRef.current, aspect.current)
    controls.target.set(...pose.target)
    camera.position.setFromSpherical(new THREE.Spherical(pose.radius, pose.phi, pose.theta)).add(controls.target)
    controls.update()
  }, [controls, camera])

  useEffect(() => {
    if (!request || !controls) return
    const pose = viewPose(request.view, roomsRef.current, aspect.current)
    const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target))
    const to = new THREE.Spherical(pose.radius, pose.phi, pose.theta)
    // 가까운 쪽으로 돌도록 각도 차이를 -180°~180°로 맞춘다
    const diff = ((((to.theta - from.theta + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
    to.theta = from.theta + diff
    anim.current = { t: 0, fromTarget: controls.target.clone(), toTarget: new THREE.Vector3(...pose.target), from, to }
  }, [request, controls, camera])

  useFrame((_, dt) => {
    const a = anim.current
    if (!a || !controls) return
    a.t = Math.min(1, a.t + dt / DURATION)
    const k = 1 - (1 - a.t) ** 3 // 처음엔 빠르게, 끝에서 천천히
    const s = new THREE.Spherical(
      THREE.MathUtils.lerp(a.from.radius, a.to.radius, k),
      THREE.MathUtils.lerp(a.from.phi, a.to.phi, k),
      THREE.MathUtils.lerp(a.from.theta, a.to.theta, k),
    )
    controls.target.lerpVectors(a.fromTarget, a.toTarget, k)
    camera.position.setFromSpherical(s).add(controls.target)
    controls.update()
    if (a.t >= 1) anim.current = null
  })

  return null
}
