// 시점(카메라) 위치 계산
import type { RoomShape, ViewName } from './types'
import { bounds } from './plan'
import { mm } from './units'

export type Pose = {
  target: [number, number, number] // 바라보는 지점
  theta: number // 수평 각도 (0 = 남쪽에서 북쪽을 봄)
  phi: number // 수직 각도 (0 = 바로 위, 90° = 옆)
  radius: number // 거리
}

/** 시점 이름 → 방 전체가 화면에 들어오는 카메라 자세 */
export function viewPose(view: ViewName, rooms: RoomShape[], aspect = 1.5): Pose {
  const b = bounds(rooms)
  // 화면이 세로로 길면(aspect가 작으면) 좌우가 잘리므로 그만큼 더 멀리서 본다
  const size = Math.max(mm(b.w), mm(b.d)) * Math.max(1, 1.3 / aspect)
  const target: [number, number, number] = [mm(b.cx), 0, mm(b.cy)]
  if (view === 'top') return { target, theta: 0, phi: 0.001, radius: size * 1.2 + 1.5 }
  if (view === 'iso') return { target, theta: 0.6, phi: 0.95, radius: size * 1.25 + 3 }
  const degrees = Number(view.replace('side', ''))
  return { target, theta: (degrees * Math.PI) / 180, phi: 1.2, radius: size * 1.15 + 3 }
}

/** 자세 → 카메라 좌표 */
export function posePosition(p: Pose): [number, number, number] {
  return [
    p.target[0] + p.radius * Math.sin(p.phi) * Math.sin(p.theta),
    p.target[1] + p.radius * Math.cos(p.phi),
    p.target[2] + p.radius * Math.sin(p.phi) * Math.cos(p.theta),
  ]
}
