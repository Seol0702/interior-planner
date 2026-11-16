import { useRef, useState } from 'react'
import type { FurnitureInstance, FurnitureLibraryItem } from '../types'
import { extractColors } from '../image'
import { fmtCm } from '../units'

type Props = {
  instance: FurnitureInstance
  item: FurnitureLibraryItem
  onRotate: () => void
  onDuplicate: () => void
  onDelete: () => void
  onRecolor: (colors: { color?: string; accent?: string }) => void
}

/** 선택한 가구의 정보와 조작 버튼 (3D 화면 위에 떠 있는 카드) */
export default function SelectionPanel({ instance, item, onRotate, onDuplicate, onDelete, onRecolor }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const changed = instance.color !== undefined || instance.accent !== undefined

  // 사진을 고르면 대표 색 2가지를 뽑아서 가구에 입힌다
  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { main, accent } = await extractColors(file)
      onRecolor({ color: main, accent })
      setMessage({ text: '사진의 색을 입혔어요', error: false })
    } catch (err) {
      setMessage({ text: (err as Error).message, error: true })
    }
  }

  return (
    <section className="selection">
      <p className="selection-name">{item.name}</p>
      <dl>
        <dt>크기</dt>
        <dd>
          {item.width} × {item.depth} × {item.height} mm
        </dd>
        <dt>위치</dt>
        <dd>
          x {fmtCm(instance.x)}, y {fmtCm(instance.y)} cm
        </dd>
        <dt>회전</dt>
        <dd>{instance.rotation}°</dd>
      </dl>

      <div className="fields two">
        <label>
          본체 색
          <input type="color" value={instance.color ?? item.color} onChange={(e) => onRecolor({ color: e.target.value })} />
        </label>
        <label>
          포인트 색
          <input type="color" value={instance.accent ?? item.accent} onChange={(e) => onRecolor({ accent: e.target.value })} />
        </label>
      </div>
      <div className="row wrap">
        <button className="small" onClick={() => fileInput.current?.click()}>
          사진에서 색 가져오기
        </button>
        {changed && (
          <button className="small" onClick={() => onRecolor({ color: undefined, accent: undefined })}>
            원래 색
          </button>
        )}
      </div>
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickImage} />
      {message && <p className={message.error ? 'error' : 'hint'}>{message.text}</p>}

      <div className="row wrap actions">
        <button onClick={onRotate}>회전 (R)</button>
        <button onClick={onDuplicate}>복제</button>
        <button className="danger" onClick={onDelete}>
          삭제
        </button>
      </div>
    </section>
  )
}
