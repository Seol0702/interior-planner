import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'

// 단위 약속: 3D 화면 안에서는 1 = 1m(미터).
// 계획안의 치수는 mm라서, 화면에 넣을 때 1000으로 나눈다.
const mm = (value: number) => value / 1000

// 테스트용 가구: 소파 크기(폭 2100 × 깊이 900 × 높이 800 mm)의 회색 박스
const sofa = { width: 2100, depth: 900, height: 800 }

export default function App() {
  return (
    // Canvas = 3D를 그리는 도화지. camera는 처음 바라보는 위치(x, y, z)
    <Canvas camera={{ position: [3, 3, 4], fov: 50 }}>
      {/* 조명: 전체를 은은하게 밝히는 빛 + 한쪽에서 비추는 햇빛 */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 3]} intensity={1.2} />

      {/* 회색 박스. 높이의 절반만큼 올려야 바닥 위에 '놓인다' */}
      <mesh position={[0, mm(sofa.height) / 2, 0]}>
        <boxGeometry args={[mm(sofa.width), mm(sofa.height), mm(sofa.depth)]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>

      {/* 바닥 그리드: 가는 선 10cm, 굵은 선 1m 간격 */}
      <Grid
        args={[10, 10]}
        cellSize={0.1}
        sectionSize={1}
        cellColor="#d4d4d8"
        sectionColor="#71717a"
        fadeDistance={25}
        infiniteGrid
      />

      {/* 마우스 조작: 왼쪽 드래그 회전, 휠 확대/축소, 오른쪽 드래그 이동 */}
      <OrbitControls makeDefault />
    </Canvas>
  )
}
