import type { FurnitureInstance, FurnitureLibraryItem } from '../types'

type Props = {
  instance: FurnitureInstance
  item: FurnitureLibraryItem
  onRotate: () => void
  onDelete: () => void
}

/** 선택한 가구의 정보와 조작 버튼 */
export default function SelectionPanel({ instance, item, onRotate, onDelete }: Props) {
  return (
    <section className="panel selection">
      <h2>선택한 가구</h2>
      <p className="selection-name">{item.name}</p>
      <dl>
        <dt>크기</dt>
        <dd>
          {item.width} × {item.depth} × {item.height} mm
        </dd>
        <dt>위치</dt>
        <dd>
          x {instance.x}, y {instance.y} mm
        </dd>
        <dt>회전</dt>
        <dd>{instance.rotation}°</dd>
      </dl>
      <div className="row">
        <button onClick={onRotate}>회전 (R)</button>
        <button className="danger" onClick={onDelete}>
          삭제 (Del)
        </button>
      </div>
    </section>
  )
}
