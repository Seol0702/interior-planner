// 가구 미리보기 그림 만들기.
// 화면에 보이지 않는 작은 3D 화면에 가구를 하나씩 놓고 "사진"을 찍어 둔다.
// (실제 3D 모델과 똑같은 부품으로 찍으므로, 목록의 그림과 방에 놓인 모습이 일치한다)
import * as THREE from 'three'
import type { FurnitureLibraryItem } from './types'
import { buildParts, toneColor } from './models'

let cache: Record<string, string> | null = null

export function furnitureThumbnails(items: FurnitureLibraryItem[], size = 192): Record<string, string> {
  if (cache) return cache
  const result: Record<string, string> = {}
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
  } catch {
    return result // 3D를 못 쓰는 환경이면 그림 없이 진행
  }
  renderer.setPixelRatio(1)
  renderer.setSize(size, size, false)

  const scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight('#ffffff', 1.1))
  const key = new THREE.DirectionalLight('#ffffff', 2.2)
  key.position.set(3, 6, 4)
  scene.add(key)
  const fill = new THREE.DirectionalLight('#ffffff', 0.7)
  fill.position.set(-4, 2, -2)
  scene.add(fill)
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100)
  const direction = new THREE.Vector3(0.9, 0.75, 1.25).normalize() // 살짝 위에서 비스듬히

  for (const item of items) {
    const group = new THREE.Group()
    const disposables: { dispose: () => void }[] = []
    for (const p of buildParts(item.shape, item.width, item.depth, item.height)) {
      const geometry =
        p.kind === 'box'
          ? new THREE.BoxGeometry(p.w / 1000, p.h / 1000, p.d / 1000)
          : p.kind === 'cyl'
            ? new THREE.CylinderGeometry(p.w / 2000, p.w / 2000, p.h / 1000, 28)
            : new THREE.SphereGeometry(0.5, 24, 16)
      const glass = p.tone === 'glass' // 색유리는 반투명하게
      const material = new THREE.MeshStandardMaterial({
        color: toneColor(p.tone, item.color, item.accent),
        roughness: glass ? 0.1 : 0.75,
        transparent: glass,
        opacity: glass ? 0.6 : 1,
        depthWrite: !glass,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(p.x / 1000, p.y / 1000, p.z / 1000)
      if (p.rot) mesh.rotation.set(...p.rot) // 비스듬히 돌린 부품
      else if (p.axis === 'z') mesh.rotation.x = Math.PI / 2
      else if (p.axis === 'x') mesh.rotation.z = Math.PI / 2
      if (p.kind === 'ball') mesh.scale.set(p.w / 1000, p.h / 1000, p.d / 1000)
      group.add(mesh)
      disposables.push(geometry, material)
    }
    scene.add(group)

    // 가구가 화면에 꽉 차도록 카메라 거리를 맞춘다
    const sphere = new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere())
    const distance = (sphere.radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.02
    camera.position.copy(sphere.center).addScaledVector(direction, distance)
    camera.lookAt(sphere.center)
    renderer.render(scene, camera)
    result[item.id] = renderer.domElement.toDataURL('image/png')

    scene.remove(group)
    disposables.forEach((d) => d.dispose())
  }
  renderer.dispose()
  renderer.forceContextLoss()
  cache = result
  return result
}
