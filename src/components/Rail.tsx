import Icon, { type IconName } from '../icons'

export type Section = 'rooms' | 'furniture' | 'finish' | 'openings' | 'electric' | 'sun' | 'site' | 'check' | 'notes' | 'ideas'

const ITEMS: { id: Section; name: string; icon: IconName }[] = [
  { id: 'rooms', name: '방', icon: 'rooms' },
  { id: 'furniture', name: '가구', icon: 'sofa' },
  { id: 'finish', name: '벽지·바닥', icon: 'finish' },
  { id: 'openings', name: '문·창문', icon: 'door' },
  { id: 'electric', name: '전기', icon: 'plug' },
  { id: 'sun', name: '햇빛', icon: 'sun' },
  { id: 'site', name: '창밖', icon: 'map' },
  { id: 'check', name: '검사', icon: 'check' },
  { id: 'notes', name: '메모', icon: 'note' },
  { id: 'ideas', name: '추천', icon: 'idea' },
]

type Props = {
  section: Section
  badges: Partial<Record<Section, number>> // 메뉴 옆에 붙는 숫자 (검사에서 걸린 개수 등)
  onSection: (section: Section) => void
}

/** 왼쪽 세로 메뉴. 하나를 고르면 옆 패널의 내용이 바뀐다 */
export default function Rail({ section, badges, onSection }: Props) {
  return (
    <nav className="rail" aria-label="메뉴">
      {ITEMS.map((item) => (
        <button key={item.id} className={`rail-item ${section === item.id ? 'on' : ''}`} aria-current={section === item.id} onClick={() => onSection(item.id)}>
          <Icon name={item.icon} size={21} />
          <span>{item.name}</span>
          {badges[item.id] ? <span className="rail-badge">{badges[item.id]}</span> : null}
        </button>
      ))}
    </nav>
  )
}
