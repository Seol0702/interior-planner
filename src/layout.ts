// 가구 배치 계산 (화면과 상관없는 순수한 계산만 모아둠)
import type { FurnitureInstance, FurnitureLibraryItem, Room } from './types'
import { snap } from './units'

/** 회전을 반영한 바닥 점유 크기. 90°/270°면 폭과 깊이가 뒤바뀐다 */
export function footprint(item: FurnitureLibraryItem, rotation: number) {
  const sideways = rotation % 180 !== 0
  return sideways
    ? { w: item.depth, d: item.width }
    : { w: item.width, d: item.depth }
}

/** 가구가 방 밖으로 나가지 않도록 위치를 안쪽으로 밀어 넣고, 10mm 그리드에 맞춘다 */
export function placeInRoom(
  instance: FurnitureInstance,
  item: FurnitureLibraryItem,
  room: Room,
): FurnitureInstance {
  const { w, d } = footprint(item, instance.rotation)
  return {
    ...instance,
    x: clampAxis(snap(instance.x), w, room.width),
    y: clampAxis(snap(instance.y), d, room.depth),
  }
}

/** 한 축 방향으로 [size/2, roomSize - size/2] 범위에 가두기 */
function clampAxis(center: number, size: number, roomSize: number) {
  const min = size / 2
  const max = roomSize - size / 2
  if (min > max) return roomSize / 2 // 가구가 방보다 크면 그냥 가운데
  return Math.min(Math.max(center, min), max)
}

/** 겹치지 않는 고유 id 만들기 */
export const newId = () => crypto.randomUUID()
