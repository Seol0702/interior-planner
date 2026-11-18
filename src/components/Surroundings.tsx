import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Building } from '../site'

export type Ground = { canvas: HTMLCanvasElement; west: number; east: number; north: number; south: number }

type Props = {
  buildings: Building[]
  ground: Ground | null
  groundY: number // 땅 높이 (m). 우리 집 바닥이 0이므로 높은 층일수록 아래로 내려간다
  north: number // 평면도 위쪽이 가리키는 방위 (도)
  center: [number, number] // 집 가운데 (3D 좌표 x, z)
  house: { w: number; d: number } // 집 전체 크기 (m) - 아래층 건물 덩어리용
}

const SKY_TOP = new THREE.Color('#8fb6e3')
const SKY_HORIZON = new THREE.Color('#dfe9f3')
const FOG = '#dde6ee'

/**
 * 창밖 풍경: 위성사진 땅 + 주변 건물(OpenStreetMap 높이로 세운 덩어리) + 하늘.
 * 안쪽은 "동(x)·북(-z)" 좌표로 만들고, 전체를 평면도 방위(north)만큼 돌려서 맞춘다.
 */
export default function Surroundings({ buildings, ground, groundY, north, center, house }: Props) {
  // 건물들을 한 덩어리 모양으로 합친다 (수백 개를 따로 그리면 느리다)
  const city = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    const color = new THREE.Color()
    buildings.forEach((b, i) => {
      if (b.points.length < 3) return
      const shape = new THREE.Shape(b.points.map(([e, n]) => new THREE.Vector2(e, n)))
      for (const hole of b.holes ?? []) shape.holes.push(new THREE.Path(hole.map(([e, n]) => new THREE.Vector2(e, n)))) // 안뜰
      const g = new THREE.ExtrudeGeometry(shape, { depth: b.height, bevelEnabled: false })
      g.rotateX(-Math.PI / 2) // 세워서 높이를 y로
      // 건물마다 살짝 다른 밝기의 흰색·베이지
      const shade = 0.8 + ((i * 37) % 17) / 100
      color.setRGB(shade, shade * 0.985, shade * 0.96)
      const colors = new Float32Array(g.attributes.position.count * 3)
      for (let k = 0; k < colors.length; k += 3) colors.set([color.r, color.g, color.b], k)
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      g.deleteAttribute('uv')
      parts.push(g)
    })
    const merged = parts.length ? mergeGeometries(parts) : null
    parts.forEach((g) => g.dispose())
    return merged
  }, [buildings])
  useEffect(() => () => city?.dispose(), [city])

  const texture = useMemo(() => {
    if (!ground) return null
    const t = new THREE.CanvasTexture(ground.canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [ground])
  useEffect(() => () => texture?.dispose(), [texture])

  // 하늘: 위는 파랗고 지평선 쪽은 옅은 큰 공 (안쪽 면만 그린다)
  const sky = useMemo(() => {
    const g = new THREE.SphereGeometry(900, 32, 16)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, pos.getY(i) / 900)
      c.copy(SKY_HORIZON).lerp(SKY_TOP, Math.pow(t, 0.6))
      colors.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [])
  useEffect(() => () => sky.dispose(), [sky])

  const [cx, cz] = center
  return (
    <>
      <fog attach="fog" args={[FOG, 160, 650]} />
      <mesh geometry={sky} position={[cx, 0, cz]} renderOrder={-1} userData={{ noMeasure: true }}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>

      <group position={[cx, groundY, cz]} rotation={[0, (north * Math.PI) / 180, 0]}>
        {/* 위성사진 바깥의 먼 땅 (안개에 묻혀 지평선처럼 보인다) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
          <circleGeometry args={[1400, 48]} />
          <meshStandardMaterial color="#8e968d" roughness={1} />
        </mesh>
        {/* 땅: 위성사진 */}
        {ground && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(ground.west + ground.east) / 2, -0.05, -(ground.north + ground.south) / 2]}>
            <planeGeometry args={[ground.east - ground.west, ground.north - ground.south]} />
            <meshStandardMaterial map={texture} roughness={1} />
          </mesh>
        )}
        {city && (
          <mesh geometry={city}>
            <meshStandardMaterial vertexColors roughness={0.9} />
          </mesh>
        )}
      </group>

      {/* 우리 집 아래층들: 집 바닥 밑을 받치는 건물 덩어리 */}
      {groundY < -0.5 && (
        <mesh position={[cx, groundY / 2 - 0.02, cz]}>
          <boxGeometry args={[house.w + 0.6, -groundY, house.d + 0.6]} />
          <meshStandardMaterial color="#e6e3dc" roughness={0.95} />
        </mesh>
      )}
    </>
  )
}
