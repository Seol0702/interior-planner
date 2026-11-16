import type { FurnitureLibraryItem } from './types'

// 기본 가구 라이브러리 (치수는 흔한 제품 크기 기준, mm)
// 나중에 3단계에서 3D 모델·가격·구매 링크를 붙일 예정
export const LIBRARY: FurnitureLibraryItem[] = [
  { id: 'sofa-3', name: '3인 소파', category: '거실', width: 2100, depth: 900, height: 800, color: '#8b9bb4' },
  { id: 'tv-stand', name: 'TV장', category: '거실', width: 1800, depth: 400, height: 450, color: '#a58a6d' },
  { id: 'bed-queen', name: '퀸 침대', category: '침실', width: 1600, depth: 2100, height: 450, color: '#c9b8a6' },
  { id: 'wardrobe', name: '옷장', category: '침실', width: 1000, depth: 600, height: 2000, color: '#b7a58f' },
  { id: 'desk', name: '책상', category: '서재', width: 1200, depth: 600, height: 740, color: '#9c7b5b' },
  { id: 'bookshelf', name: '책장', category: '서재', width: 800, depth: 300, height: 1800, color: '#a0825f' },
  { id: 'dining-4', name: '4인 식탁', category: '주방', width: 1400, depth: 800, height: 750, color: '#b08e68' },
]

/** id로 라이브러리 가구 찾기 */
export const findLibraryItem = (id: string) => LIBRARY.find((item) => item.id === id)
