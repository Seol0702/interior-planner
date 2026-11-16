import type { FurnitureLibraryItem, ShapeId } from './types'

const item = (
  id: string, name: string, category: string, shape: ShapeId,
  width: number, depth: number, height: number, color: string, accent: string,
  extra: Partial<FurnitureLibraryItem> = {},
): FurnitureLibraryItem => ({ id, name, category, shape, width, depth, height, color, accent, layer: 'furniture', ...extra })

// 기본 가구 라이브러리 (치수는 흔한 제품 크기 기준, mm)
// 나중에 3단계에서 가격·구매 링크·사용자 등록 가구를 붙일 예정
export const LIBRARY: FurnitureLibraryItem[] = [
  item('sofa-3', '3인 소파', '거실', 'sofa', 2100, 900, 800, '#7f8ea3', '#a9b5c6'),
  item('sofa-1', '1인 소파', '거실', 'sofa', 900, 900, 800, '#a08a76', '#c4b3a2'),
  item('coffee-table', '소파 테이블', '거실', 'table', 1000, 600, 400, '#a58a6d', '#a58a6d'),
  item('tv-stand', 'TV장 + TV', '거실', 'tvUnit', 1800, 400, 1250, '#b59b7c', '#e9e2d6'),
  item('rug', '러그', '거실', 'rug', 2000, 1400, 12, '#c9bba8', '#e6dccb'),
  item('plant', '화분', '거실', 'plant', 500, 500, 1200, '#c08a6a', '#5c8a50'),

  item('bed-queen', '퀸 침대', '침실', 'bed', 1600, 2100, 900, '#b39b82', '#8fa3b5'),
  item('bed-ss', '슈퍼싱글 침대', '침실', 'bed', 1100, 2100, 900, '#b39b82', '#c7b199'),
  item('wardrobe', '옷장', '침실', 'wardrobe', 1000, 600, 2000, '#cdbfae', '#ece5da'),
  item('nightstand', '협탁', '침실', 'drawers', 450, 400, 500, '#b39b82', '#d9ccba'),
  item('dresser', '서랍장', '침실', 'drawers', 800, 450, 800, '#c2ae96', '#ece5da'),

  item('desk', '책상', '서재', 'desk', 1200, 600, 740, '#b08e68', '#d3bfa3'),
  item('office-chair', '사무용 의자', '서재', 'officeChair', 600, 600, 950, '#3f3f46', '#52525b'),
  item('bookshelf', '책장', '서재', 'bookshelf', 800, 300, 1800, '#b89a78', '#b89a78'),

  item('dining-4', '4인 식탁', '주방', 'table', 1400, 800, 750, '#b08e68', '#b08e68'),
  item('dining-chair', '식탁 의자', '주방', 'chair', 450, 500, 850, '#8a6a4a', '#d6c7b2'),
  item('round-table', '원형 테이블', '주방', 'roundTable', 900, 900, 740, '#e7e2d8', '#e7e2d8'),
  item('stool', '스툴', '주방', 'stool', 350, 350, 450, '#8a6a4a', '#c9b79f'),
  item('fridge', '양문형 냉장고', '주방', 'fridge', 900, 900, 1800, '#8d939b', '#b8bec6'),

  item('washer', '세탁기', '가전', 'washer', 600, 650, 850, '#eceef0', '#cfd4da'),
  item('box', '수납 박스', '가전', 'box', 600, 400, 400, '#c9b79f', '#c9b79f'),

  item('floor-lamp', '플로어 램프', '조명', 'lamp', 400, 400, 1600, '#3f3f46', '#f3e9d2', { light: true }),
  item('ceiling-light', '천장등', '조명', 'ceilingLight', 500, 500, 90, '#e7e5e4', '#fff7e6', { light: true, mount: 'ceiling' }),

  item('power-strip', '멀티탭', '전기', 'powerStrip', 300, 60, 40, '#f4f4f5', '#dc2626', { layer: 'electric' }),
]

/** 다른 가구와 겹쳐도 되는 물건인가 (러그, 천장등, 멀티탭) */
export const isPassable = (i: FurnitureLibraryItem) => i.shape === 'rug' || i.mount === 'ceiling' || i.shape === 'powerStrip'

/** 가구 분류 목록 (라이브러리에 나온 순서대로) */
export const FURNITURE_CATEGORIES = [...new Set(LIBRARY.map((i) => i.category))]

/** id로 라이브러리 가구 찾기 */
export const findLibraryItem = (id: string) => LIBRARY.find((i) => i.id === id)
