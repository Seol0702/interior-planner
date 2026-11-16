// 구멍(문·창문 자리)이 뚫린 벽의 3D 모양 만들기.
// 벽을 여러 개의 상자로 나눠 붙이는 방식: 구멍 옆은 통째로, 구멍 위·아래는 짧은 상자로.
import * as THREE from 'three'

/** 벽에 뚫는 구멍 하나. 단위는 m, a~b는 벽 시작점부터의 거리 */
export type Hole = { a: number; b: number; bottom: number; top: number }

// 면 종류별로 따로 모아서, 종류마다 다른 재질(벽지 등)을 입힐 수 있게 한다
const FRONT = 0 // +z 쪽 넓은 면
const BACK = 1 // -z 쪽 넓은 면
const TOP = 2 // 벽 윗면
const OTHER = 3 // 나머지 (옆면, 구멍 안쪽 면)

type V = [number, number, number]

/**
 * 길이 L, 높이 H, 두께 T인 벽. x: 0~L(길이 방향), y: 0~H(위), z: -T/2~T/2(두께)
 * 넓은 면의 무늬 좌표(uv)는 m 단위 그대로라서, 구멍이 있어도 벽지 무늬가 끊기지 않는다.
 */
export function buildWallGeometry(L: number, H: number, T: number, holes: Hole[]): THREE.BufferGeometry {
  const quads: { verts: V[]; normal: V; uv: boolean }[][] = [[], [], [], []]
  const z0 = -T / 2
  const z1 = T / 2

  const addBox = (x0: number, x1: number, y0: number, y1: number) => {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4) return
    quads[FRONT].push({ verts: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], normal: [0, 0, 1], uv: true })
    quads[BACK].push({ verts: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], normal: [0, 0, -1], uv: true })
    quads[Math.abs(y1 - H) < 1e-4 ? TOP : OTHER].push({ verts: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], normal: [0, 1, 0], uv: false })
    quads[OTHER].push({ verts: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], normal: [0, -1, 0], uv: false })
    quads[OTHER].push({ verts: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], normal: [-1, 0, 0], uv: false })
    quads[OTHER].push({ verts: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], normal: [1, 0, 0], uv: false })
  }

  // 왼쪽부터 차례로: 구멍 앞의 온전한 벽 → 구멍 아래(창턱) → 구멍 위(인방)
  let cursor = 0
  for (const hole of [...holes].sort((p, q) => p.a - q.a)) {
    const a = Math.max(hole.a, cursor)
    const b = Math.min(hole.b, L)
    if (b - a < 1e-4) continue
    addBox(cursor, a, 0, H)
    addBox(a, b, 0, Math.min(hole.bottom, H))
    addBox(a, b, Math.min(hole.top, H), H)
    cursor = b
  }
  addBox(cursor, L, 0, H)

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const geometry = new THREE.BufferGeometry()
  quads.forEach((list, group) => {
    const startIndex = indices.length
    for (const q of list) {
      const base = positions.length / 3
      for (const v of q.verts) {
        positions.push(...v)
        normals.push(...q.normal)
        uvs.push(q.uv ? v[0] : 0, q.uv ? v[1] : 0)
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
    geometry.addGroup(startIndex, indices.length - startIndex, group)
  })
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}
