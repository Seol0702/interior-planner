import { useState, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Project, Selection } from '../types'
import type { Guide } from '../guides'
import { findLibraryItem } from '../library'
import { posePosition, viewPose } from '../camera'
import Plan3D from './Plan3D'
import FurnitureMesh from './FurnitureMesh'
import Guides3D from './Guides3D'
import CameraRig, { type ViewRequest } from './CameraRig'

type Props = {
  project: Project
  selection: Selection
  guides: Guide[]
  viewRequest: ViewRequest | null
  cameraRef: RefObject<THREE.Camera | null>
  onSelect: (selection: Selection) => void
  onMoveFurniture: (id: string, x: number, y: number) => void
  onDragEnd: () => void
}

/** 3D 화면 전체 */
export default function Scene3D(props: Props) {
  const { project, selection, guides, viewRequest, cameraRef, onSelect, onMoveFurniture, onDragEnd } = props
  // 처음 켰을 때의 카메라 자세 (한 번만 계산)
  const [pose] = useState(() => viewPose('iso', project.rooms))

  return (
    // onPointerMissed: 아무것도 없는 곳을 클릭하면 선택 해제
    <Canvas
      camera={{ position: posePosition(pose), fov: 50, near: 0.05, far: 300 }}
      onCreated={({ camera }) => {
        cameraRef.current = camera
      }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#eef0f3']} />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={['#ffffff', '#b9b2a6', 0.6]} />
      <directionalLight position={[6, 12, 5]} intensity={1.1} />

      <Plan3D
        rooms={project.rooms}
        wallHeight={project.wallHeight}
        selection={selection}
        onSelectRoom={(id) => onSelect({ type: 'room', id })}
      />

      {project.furniture.map((f) => {
        const item = findLibraryItem(f.libraryId)
        if (!item) return null
        return (
          <FurnitureMesh
            key={f.id}
            instance={f}
            item={item}
            selected={selection?.type === 'furniture' && selection.id === f.id}
            onSelect={() => onSelect({ type: 'furniture', id: f.id })}
            onMove={(x, y) => onMoveFurniture(f.id, x, y)}
            onDragEnd={onDragEnd}
          />
        )
      })}

      <Guides3D guides={guides} />

      {/* 마우스: 왼쪽 드래그 = 시점 이동, 오른쪽 드래그 = 회전, 휠 = 확대/축소 */}
      <OrbitControls
        makeDefault
        target={pose.target}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        screenSpacePanning={false}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={0.5}
        maxDistance={120}
      />
      <CameraRig request={viewRequest} rooms={project.rooms} />
    </Canvas>
  )
}
