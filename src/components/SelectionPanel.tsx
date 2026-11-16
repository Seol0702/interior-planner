import { useRef } from 'react'
import type { FurnitureInstance, FurnitureLibraryItem } from '../types'
import { extractColors } from '../image'
import { fmtCm } from '../units'
import Icon from '../icons'

type Props = {
  instance: FurnitureInstance
  item: FurnitureLibraryItem
  thumb?: string
  onRotate: () => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
  onRecolor: (colors: { color?: string; accent?: string }) => void
  onToast: (text: string, error?: boolean) => void
}

/** 선택한 가구의 속성 카드 */
export default function SelectionPanel({ instance, item, thumb, onRotate, onDuplicate, onDelete, onClose, onRecolor, onToast }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const changed = instance.color !== undefined || instance.accent !== undefined

  // 사진을 고르면 대표 색 2가지를 뽑아서 가구에 입힌다
  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { main, accent } = await extractColors(file)
      onRecolor({ color: main, accent })
      onToast('사진의 색을 가구에 입혔어요')
    } catch (err) {
      onToast((err as Error).message, true)
    }
  }

  return (
    <section className="inspector" aria-label="선택한 가구">
      <div className="inspector-head">
        {thumb && <img className="inspector-thumb" src={thumb} alt="" />}
        <div className="inspector-title">
          <strong>{item.name}</strong>
          <span>
            {item.width / 10} × {item.depth / 10} × {item.height / 10} cm
          </span>
        </div>
        <button className="btn ghost icon-only" aria-label="선택 해제" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>

      <dl className="props">
        <dt>위치</dt>
        <dd>
          x {fmtCm(instance.x)} · y {fmtCm(instance.y)} cm
        </dd>
        <dt>회전</dt>
        <dd>{instance.rotation}°</dd>
      </dl>

      <div className="fields two">
        <label className="field">
          본체 색
          <input type="color" value={instance.color ?? item.color} onChange={(e) => onRecolor({ color: e.target.value })} />
        </label>
        <label className="field">
          포인트 색
          <input type="color" value={instance.accent ?? item.accent} onChange={(e) => onRecolor({ accent: e.target.value })} />
        </label>
      </div>
      <div className="inline-actions">
        <button className="btn sm" onClick={() => fileInput.current?.click()}>
          <Icon name="image" size={15} />
          사진에서 색 가져오기
        </button>
        {changed && (
          <button className="btn ghost sm" onClick={() => onRecolor({ color: undefined, accent: undefined })}>
            원래 색
          </button>
        )}
      </div>
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickImage} />

      <div className="inspector-actions">
        <button className="btn sm" onClick={onRotate} title="R">
          <Icon name="rotate" size={15} />
          회전
        </button>
        <button className="btn sm" onClick={onDuplicate}>
          <Icon name="copy" size={15} />
          복제
        </button>
        <button className="btn danger sm" onClick={onDelete} title="Delete">
          <Icon name="trash" size={15} />
          삭제
        </button>
      </div>
    </section>
  )
}
