// 사람 모형(마네킹) 자세들.
// 관절 위치(mm, 키 170cm 기준)만 정해 두면, 관절 사이를 둥근 팔다리(길쭉한 공)로 이어서 매끈한 인형을 만든다.
// 좌표: x = 오른쪽, y = 위, z = 앞쪽
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'

type P = [number, number, number]

/** 자세 하나: 머리·목·골반 + 양팔(어깨→팔꿈치→손) + 양다리(엉덩이→무릎→발목) + 발끝 */
type Pose = {
  name: string
  head: P
  neck: P
  pelvis: P
  arms: [P, P, P][] // [어깨, 팔꿈치, 손]
  legs: [P, P, P, P][] // [엉덩이, 무릎, 발목, 발끝]
}

const STAND_LEGS: [P, P, P, P][] = [
  [[-100, 880, 0], [-110, 480, 0], [-110, 80, 0], [-110, 40, 130]],
  [[100, 880, 0], [110, 480, 0], [110, 80, 0], [110, 40, 130]],
]

export const POSES = {
  poseHandHip: {
    name: '허리에 손 얹고 서기',
    head: [0, 1580, 0],
    neck: [0, 1420, 0],
    pelvis: [0, 900, 0],
    arms: [
      [[-190, 1370, 0], [-230, 1100, 0], [-240, 840, 10]],
      [[190, 1370, 0], [350, 1140, -20], [170, 930, 30]],
    ],
    legs: STAND_LEGS,
  },
  poseWave: {
    name: '손 들기',
    head: [0, 1580, 0],
    neck: [0, 1420, 0],
    pelvis: [0, 900, 0],
    arms: [
      [[-190, 1370, 0], [-250, 1640, 0], [-210, 1900, 10]],
      [[190, 1370, 0], [230, 1100, 0], [240, 840, 10]],
    ],
    legs: STAND_LEGS,
  },
  poseSquat: {
    name: '쪼그려 앉기',
    head: [0, 1160, 40],
    neck: [0, 1010, 30],
    pelvis: [0, 500, -40],
    arms: [
      [[-190, 970, 30], [-330, 760, 90], [-330, 560, 120]],
      [[190, 970, 30], [330, 760, 90], [330, 560, 120]],
    ],
    legs: [
      [[-120, 490, -40], [-360, 520, 80], [-340, 80, 40], [-350, 40, 170]],
      [[120, 490, -40], [360, 520, 80], [340, 80, 40], [350, 40, 170]],
    ],
  },
  poseKick: {
    name: '발차기',
    head: [-130, 1560, 0],
    neck: [-90, 1400, 0],
    pelvis: [0, 900, 0],
    arms: [
      [[-280, 1350, 0], [-420, 1230, 160], [-480, 1080, 280]],
      [[100, 1360, 0], [370, 1380, 60], [630, 1390, 100]],
    ],
    legs: [
      [[-100, 880, 0], [-110, 480, 0], [-110, 80, 0], [-110, 40, 130]],
      [[100, 880, 0], [390, 650, 0], [680, 420, 0], [760, 360, 80]],
    ],
  },
  poseBend: {
    name: '허리 숙이기',
    head: [0, 370, 190],
    neck: [0, 520, 170],
    pelvis: [0, 900, -20],
    arms: [
      [[-190, 560, 160], [-200, 330, 190], [-190, 110, 200]],
      [[190, 560, 160], [200, 330, 190], [190, 110, 200]],
    ],
    legs: [
      [[-100, 880, -20], [-110, 480, 0], [-110, 80, 0], [-110, 40, 130]],
      [[100, 880, -20], [110, 480, 0], [110, 80, 0], [110, 40, 130]],
    ],
  },
  poseBridge: {
    name: '브릿지·뒤로 젖히기',
    head: [0, 470, 420],
    neck: [0, 650, 320],
    pelvis: [0, 760, -160],
    arms: [
      [[-190, 640, 330], [-200, 360, 470], [-200, 70, 600]],
      [[190, 640, 330], [200, 360, 470], [200, 70, 600]],
    ],
    legs: [
      [[-110, 740, -160], [-120, 460, -380], [-120, 80, -520], [-120, 40, -390]],
      [[110, 740, -160], [120, 460, -380], [120, 80, -520], [120, 40, -390]],
    ],
  },
  poseCrossLegged: {
    name: '책상다리 앉기',
    head: [0, 860, 0],
    neck: [0, 710, 0],
    pelvis: [0, 180, -20],
    arms: [
      [[-190, 670, 0], [-250, 400, 120], [60, 300, 230]],
      [[190, 670, 0], [250, 400, 120], [-60, 320, 230]],
    ],
    legs: [
      [[-120, 160, -20], [-340, 120, 140], [120, 80, 260], [200, 60, 300]],
      [[120, 160, -20], [340, 120, 140], [-120, 90, 240], [-200, 70, 290]],
    ],
  },
  poseSitLegsOut: {
    name: '다리 펴고 앉기',
    head: [0, 860, -40],
    neck: [0, 710, -40],
    pelvis: [0, 170, -60],
    arms: [
      [[-190, 670, -40], [-250, 420, -60], [-260, 180, 0]],
      [[190, 670, -40], [250, 420, -60], [260, 180, 0]],
    ],
    legs: [
      [[-110, 150, -60], [-110, 120, 360], [-110, 90, 780], [-110, 180, 860]],
      [[110, 150, -60], [110, 120, 360], [110, 90, 780], [110, 180, 860]],
    ],
  },
} satisfies Record<string, Pose>

export type PoseId = keyof typeof POSES
export const POSE_IDS = Object.keys(POSES) as PoseId[]

/** 몸 부위 굵기 (mm) */
const T = { head: 265, torsoW: 360, torsoD: 240, upperArm: 150, foreArm: 135, thigh: 195, shin: 160, foot: 120 }

/** 둥근 팔다리 한 토막: a에서 b까지 이어지는 길쭉한 공 (굵기 tx·tz) */
export type Limb = { c: P; size: P; rot: P }

function limb(a: P, b: P, tx: number, tz = tx): Limb {
  const from = new Vector3(...a)
  const to = new Vector3(...b)
  const dir = to.clone().sub(from)
  const len = dir.length()
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())
  const e = new Euler().setFromQuaternion(q, 'XYZ')
  const mid = from.add(to).multiplyScalar(0.5)
  return { c: [mid.x, mid.y, mid.z], size: [tx, len + Math.min(tx, tz) * 0.85, tz], rot: [e.x, e.y, e.z] }
}

/** 자세 → 몸 토막들 (원래 크기) */
function rawLimbs(pose: Pose): Limb[] {
  const parts: Limb[] = [
    { c: pose.head, size: [T.head, T.head * 1.08, T.head], rot: [0, 0, 0] }, // 머리
    limb(pose.neck, pose.head, 140), // 목
    limb(pose.pelvis, pose.neck, T.torsoW, T.torsoD), // 몸통
    { c: pose.pelvis, size: [T.torsoW * 0.95, 230, T.torsoD * 1.05], rot: limb(pose.pelvis, pose.neck, 1).rot }, // 골반
  ]
  for (const [shoulder, elbow, hand] of pose.arms) {
    parts.push(limb(pose.neck, shoulder, 150)) // 어깨
    parts.push(limb(shoulder, elbow, T.upperArm))
    parts.push(limb(elbow, hand, T.foreArm))
  }
  for (const [hip, knee, ankle, toe] of pose.legs) {
    parts.push(limb(hip, knee, T.thigh))
    parts.push(limb(knee, ankle, T.shin))
    parts.push(limb(ankle, toe, T.foot))
  }
  return parts
}

/** 자세가 차지하는 상자 (가운데를 0으로, 바닥을 0으로 맞추기 위해). 돌아간 길쭉한 공의 실제 폭을 계산한다 */
function bounds(parts: Limb[]) {
  const lo: P = [Infinity, Infinity, Infinity]
  const hi: P = [-Infinity, -Infinity, -Infinity]
  const m = new Matrix4()
  for (const p of parts) {
    m.makeRotationFromEuler(new Euler(...p.rot, 'XYZ'))
    const e = m.elements // 열 우선: e[col*4 + row]
    const half = [p.size[0] / 2, p.size[1] / 2, p.size[2] / 2]
    for (let k = 0; k < 3; k++) {
      const ext = Math.hypot(e[0 * 4 + k] * half[0], e[1 * 4 + k] * half[1], e[2 * 4 + k] * half[2])
      lo[k] = Math.min(lo[k], p.c[k] - ext)
      hi[k] = Math.max(hi[k], p.c[k] + ext)
    }
  }
  return { lo, hi }
}

/** 자세의 기본 크기 (폭·깊이·높이, mm) */
export function poseSize(id: PoseId): [number, number, number] {
  const parts = rawLimbs(POSES[id])
  const { lo, hi } = bounds(parts)
  return [Math.round(hi[0] - lo[0]), Math.round(hi[2] - lo[2]), Math.round(hi[1] - lo[1])]
}

/** 자세를 높이 H에 맞춰 키우거나 줄인 몸 토막들 (바닥 y=0, 가운데 x·z=0) */
export function poseLimbs(id: PoseId, H: number): Limb[] {
  const parts = rawLimbs(POSES[id])
  const { lo, hi } = bounds(parts)
  const [, , h] = poseSize(id)
  const s = H / h
  const cx = (lo[0] + hi[0]) / 2
  const cz = (lo[2] + hi[2]) / 2
  const floor = lo[1] // 가장 낮은 곳을 바닥에 닿게
  return parts.map((p) => ({
    c: [(p.c[0] - cx) * s, (p.c[1] - floor) * s, (p.c[2] - cz) * s],
    size: [p.size[0] * s, p.size[1] * s, p.size[2] * s],
    rot: p.rot,
  }))
}
