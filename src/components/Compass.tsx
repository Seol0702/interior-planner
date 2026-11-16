import type { CSSProperties, Ref } from 'react'

type Props = {
  rotation?: number // 북쪽이 화면에서 가리키는 각도 (0 = 위, 시계 방향)
  innerRef?: Ref<HTMLDivElement> // 3D 화면에서는 시점이 돌 때마다 각도를 직접 바꿔 준다
}

/** 나침반: 빨간 바늘과 "북"이 북쪽을 가리킨다. 글자는 돌아가도 똑바로 서 있다 */
export default function Compass({ rotation = 0, innerRef }: Props) {
  return (
    <div className="compass" ref={innerRef} style={{ '--rot': `${rotation}deg` } as CSSProperties} role="img" aria-label="나침반">
      <div className="compass-dial">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 15 L37 32 L27 32 Z" fill="#e03131" />
          <path d="M32 49 L37 32 L27 32 Z" fill="#c5cad3" />
          <circle cx="32" cy="32" r="2.6" fill="#fff" stroke="#8a919e" strokeWidth="1" />
        </svg>
        <span className="compass-letter n">북</span>
        <span className="compass-letter e">동</span>
        <span className="compass-letter s">남</span>
        <span className="compass-letter w">서</span>
      </div>
    </div>
  )
}
