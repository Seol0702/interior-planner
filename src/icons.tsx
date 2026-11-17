// 선으로 그린 작은 아이콘 모음 (그림 파일 없이 SVG로 직접 그린다)
import type { ReactNode } from 'react'

const PATHS = {
  rooms: <path d="M3 4h18v16H3z M3 12h8 M11 4v10 M15 20v-6h6" />,
  sofa: <path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3 M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z M6 18v2 M18 18v2" />,
  finish: <path d="M4 4h13v5H4z M17 6h3v6h-8v3 M10.5 15h3v6h-3z" />,
  door: <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17 M4 21h16 M14.5 12.5v.01" />,
  window: <path d="M4 4h16v16H4z M12 4v16 M4 12h16" />,
  plug: <path d="M9 3v5 M15 3v5 M6 8h12v3a6 6 0 0 1-12 0z M12 17v4" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6 7 7 M17 17l1.4 1.4 M5.6 18.4 7 17 M17 7l1.4-1.4" />
    </>
  ),
  check: <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z M8.5 12l2.5 2.5 4.5-5" />,
  note: <path d="M5 4h14v11l-5 5H5z M14 20v-5h5 M8 9h8 M8 13h4" />,
  idea: <path d="M9 18h6 M10 21h4 M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />,
  save: <path d="M12 4v11 M7 10l5 5 5-5 M5 20h14" />,
  open: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  reset: <path d="M4 12a8 8 0 1 0 2.5-5.8 M4 4v5h5" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7 M12 17v.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </>
  ),
  plus: <path d="M12 5v14 M5 12h14" />,
  trash: <path d="M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13" />,
  rotate: <path d="M20 12a8 8 0 1 1-2.5-5.8 M20 4v5h-5" />,
  copy: <path d="M9 9h11v11H9z M5 15H4V4h11v1" />,
  play: <path d="M7 5l12 7-12 7z" />,
  pause: <path d="M8 5v14 M16 5v14" />,
  wire: <path d="M4 18c4 0 4-12 8-12s4 12 8 12" />,
  pin: (
    <>
      <path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z" />
      <circle cx="12" cy="11" r="2" />
    </>
  ),
  outlet: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 12v.01 M14.5 12v.01" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  close: <path d="M6 6l12 12 M18 6L6 18" />,
  image: (
    <>
      <path d="M4 5h16v14H4z M4 16l4-4 4 4 3-3 5 5" />
      <circle cx="9" cy="9.5" r="1.5" />
    </>
  ),
  external: <path d="M14 5h5v5 M19 5l-8 8 M11 7H5v12h12v-6" />,
  walk: (
    <>
      <circle cx="13" cy="4.5" r="1.8" />
      <path d="M10 21l2.5-6 2.5 2.5V21 M12.5 15l-1-5 M11.5 10l-3.5 2.5V15 M11.5 10l2.5-1.5 2 3 2.5 1" />
    </>
  ),
  map: <path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z M9 4v13.5 M15 6.5V20" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="7" r="3.2" />
      <path d="M5 20.5a7 7 0 0 1 14 0" />
    </>
  ),
  exit: <path d="M14 4h5v16h-5 M10 8l-4 4 4 4 M6 12h10" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
