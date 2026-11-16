import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Room } from './types'
import { mm } from './units'
import RoomView from './components/RoomView'
import RoomForm from './components/RoomForm'

export default function App() {
  // useState: 화면에 영향을 주는 값. 바뀌면 화면이 자동으로 다시 그려진다
  const [room, setRoom] = useState<Room>({ width: 4000, depth: 3500, height: 2400 })

  const center: [number, number, number] = [mm(room.width) / 2, 0, mm(room.depth) / 2]

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>3D 인테리어 플래너</h1>
        <RoomForm room={room} onChange={setRoom} />
      </aside>

      <main className="viewport">
        <Canvas camera={{ position: [center[0] + 4, 5, center[2] + 6], fov: 50 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 10, 4]} intensity={1.1} />
          <RoomView room={room} />
          <OrbitControls makeDefault target={center} maxPolarAngle={Math.PI / 2 - 0.05} />
        </Canvas>
      </main>
    </div>
  )
}
