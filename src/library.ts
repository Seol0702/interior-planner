import type { FurnitureLibraryItem, ShapeId } from './types'

const item = (
  id: string, name: string, category: string, shape: ShapeId,
  width: number, depth: number, height: number, color: string, accent: string,
  extra: Partial<FurnitureLibraryItem> = {},
): FurnitureLibraryItem => ({ id, name, category, shape, width, depth, height, color, accent, layer: 'furniture', ...extra })

// 기본 가구 라이브러리 (치수는 흔한 제품 크기 기준, mm)
// 오늘의집·유튜브 집꾸미기 영상·핀터레스트 등에서 자주 보이는 가구 위주로 골랐다.
// 특정 브랜드 제품이 아니라 "그런 종류"의 가구라서 이름에 "~형"을 붙였다.
// id는 저장 파일이 가리키는 이름이므로 한 번 정하면 바꾸지 않는다.
export const LIBRARY: FurnitureLibraryItem[] = [
  // ── 거실 ──
  item('sofa-3', '3인 소파', '거실', 'sofa', 2100, 900, 800, '#7f8ea3', '#a9b5c6'),
  item('sofa-2', '2인 소파', '거실', 'sofa', 1600, 880, 800, '#c9bba8', '#e6dccb'),
  item('sofa-1', '1인 소파', '거실', 'sofa', 900, 900, 800, '#a08a76', '#c4b3a2'),
  item('couch-sofa', '카우치 소파', '거실', 'cornerSofa', 2600, 1600, 820, '#9aa3ab', '#c3c9cf'),
  item('recliner', '리클라이너', '거실', 'recliner', 900, 1000, 1000, '#6f5a49', '#8b7360'),
  item('beanbag', '빈백 소파', '거실', 'beanbag', 900, 900, 700, '#d9cbb6', '#ebe1d1'),
  item('coffee-table', '소파 테이블', '거실', 'table', 1000, 600, 400, '#a58a6d', '#a58a6d'),
  item('round-coffee', '원형 커피테이블', '거실', 'roundTable', 800, 800, 400, '#f1ede6', '#f1ede6'),
  item('side-table', '사이드 테이블', '거실', 'roundTable', 450, 450, 550, '#b59b7c', '#b59b7c'),
  item('tv-stand', 'TV장 + TV', '거실', 'tvUnit', 1800, 400, 1250, '#b59b7c', '#e9e2d6'),
  item('standbyme', '스탠바이미형 이동식 TV', '거실', 'standbyMe', 620, 550, 1700, '#f1f1ee', '#f1f1ee'),
  item('sideboard', '거실장 (사이드보드)', '거실', 'wardrobe', 1600, 450, 750, '#d9c7ad', '#efe6d8'),
  item('rug', '러그', '거실', 'rug', 2000, 1400, 12, '#c9bba8', '#e6dccb'),
  item('round-rug', '원형 러그', '거실', 'rug', 1500, 1500, 12, '#b7c4b0', '#dbe3d5'),
  item('plant', '화분', '거실', 'plant', 500, 500, 1200, '#c08a6a', '#5c8a50'),
  item('plant-large', '대형 화분 (몬스테라)', '거실', 'plant', 800, 800, 1700, '#e7e2d8', '#5c8a50'),

  // ── 침실 ──
  item('bed-king', '킹 침대', '침실', 'bed', 1800, 2100, 900, '#b39b82', '#9db0a1'),
  item('bed-queen', '퀸 침대', '침실', 'bed', 1600, 2100, 900, '#b39b82', '#8fa3b5'),
  item('bed-ss', '슈퍼싱글 침대', '침실', 'bed', 1100, 2100, 900, '#b39b82', '#c7b199'),
  item('bed-single', '싱글 침대', '침실', 'bed', 1000, 2000, 850, '#e8e2d8', '#c9d3dc'),
  item('bed-family', '저상형 패밀리 침대', '침실', 'bed', 2800, 2100, 600, '#d6c4a8', '#e5ded2'),
  item('topper', '매트리스 토퍼', '침실', 'mattress', 1500, 2000, 120, '#f5f3ee', '#dfe6ee'),
  item('wardrobe', '옷장', '침실', 'wardrobe', 1000, 600, 2000, '#cdbfae', '#ece5da'),
  item('wardrobe-wide', '붙박이장형 옷장', '침실', 'wardrobe', 2400, 600, 2200, '#ecebe7', '#f7f6f3'),
  item('hanger', '행거', '침실', 'hanger', 1200, 500, 1700, '#d4d4d8', '#c9b79f'),
  item('system-hanger', '드레스룸 시스템 행거', '침실', 'hanger', 2000, 500, 2000, '#3f3f46', '#b8a48c'),
  item('nightstand', '협탁', '침실', 'drawers', 450, 400, 500, '#b39b82', '#d9ccba'),
  item('dresser', '서랍장', '침실', 'drawers', 800, 450, 800, '#c2ae96', '#ece5da'),
  item('vanity', '화장대', '침실', 'vanity', 1000, 450, 1450, '#f1ede6', '#e2d6c6'),
  item('mirror', '전신거울', '침실', 'mirror', 600, 300, 1700, '#c8b49a', '#c8b49a'),

  // ── 서재 ──
  item('desk', '책상', '서재', 'desk', 1200, 600, 740, '#b08e68', '#d3bfa3'),
  item('motion-desk', '모션데스크', '서재', 'standingDesk', 1400, 700, 740, '#e9e4dc', '#e9e4dc'),
  item('office-chair', '사무용 의자', '서재', 'officeChair', 600, 600, 950, '#3f3f46', '#52525b'),
  item('gaming-chair', '게이밍 의자', '서재', 'officeChair', 700, 700, 1300, '#27272a', '#b91c1c'),
  item('bookshelf', '책장', '서재', 'bookshelf', 800, 300, 1800, '#b89a78', '#b89a78'),
  item('cube-shelf-4x2', '큐브 선반 4×2 (칼락스형)', '서재', 'cubeShelf', 1470, 390, 770, '#f4f4f2', '#c9b79f'),
  item('cube-shelf-2x2', '큐브 선반 2×2', '서재', 'cubeShelf', 770, 390, 770, '#f4f4f2', '#9fb3c8'),
  item('piano', '디지털 피아노', '서재', 'piano', 1400, 430, 880, '#2f2a26', '#2f2a26'),

  // ── 주방 ──
  item('dining-2', '2인 원형 식탁', '주방', 'roundTable', 700, 700, 740, '#e7e2d8', '#e7e2d8'),
  item('dining-4', '4인 식탁', '주방', 'table', 1400, 800, 750, '#b08e68', '#b08e68'),
  item('dining-6', '6인 식탁', '주방', 'table', 1800, 900, 750, '#8f6c4c', '#8f6c4c'),
  item('round-table', '원형 테이블', '주방', 'roundTable', 900, 900, 740, '#e7e2d8', '#e7e2d8'),
  item('dining-chair', '식탁 의자', '주방', 'chair', 450, 500, 850, '#8a6a4a', '#d6c7b2'),
  item('bench', '식탁 벤치', '주방', 'table', 1200, 350, 450, '#a58a6d', '#a58a6d'),
  item('stool', '스툴', '주방', 'stool', 350, 350, 450, '#8a6a4a', '#c9b79f'),
  item('bar-stool', '바 스툴', '주방', 'stool', 380, 380, 750, '#2f2f33', '#c9b79f'),
  item('island', '아일랜드 식탁 (홈바)', '주방', 'counter', 1400, 700, 900, '#f1efe9', '#d8d2c6'),
  item('fridge', '양문형 냉장고', '주방', 'fridge', 900, 900, 1800, '#8d939b', '#b8bec6'),
  item('fridge-small', '일반 냉장고', '주방', 'fridge', 600, 650, 1700, '#eceef0', '#f6f7f8'),
  item('kimchi-fridge', '스탠드 김치냉장고', '주방', 'drawers', 700, 750, 1800, '#d8d4cc', '#ecebe7'),

  // ── 가전 ──
  item('washer', '세탁기', '가전', 'washer', 600, 650, 850, '#eceef0', '#cfd4da'),
  item('dryer', '건조기', '가전', 'washer', 600, 650, 850, '#d4d6d9', '#b9bdc3'),
  item('styler', '의류관리기 (스타일러형)', '가전', 'wardrobe', 450, 600, 1850, '#e7e2da', '#d6cfc3'),
  item('air-purifier', '공기청정기', '가전', 'tower', 350, 350, 700, '#f4f4f2', '#d4d4d8'),
  item('aircon', '스탠드 에어컨', '가전', 'tower', 400, 400, 1800, '#f4f4f2', '#e4e4e7'),
  item('fan', '선풍기', '가전', 'fan', 400, 400, 1100, '#f4f4f2', '#cfe3ee'),
  item('robot-vacuum', '로봇청소기', '가전', 'puck', 350, 350, 95, '#2f2f33', '#71717a'),

  // ── 수납 ──
  item('shoe-cabinet', '신발장', '수납', 'wardrobe', 900, 350, 1200, '#efe9df', '#f7f3ec'),
  item('drawer-chest', '5단 서랍장', '수납', 'drawers', 600, 450, 1100, '#f4f4f2', '#e2ddd3'),
  item('box', '수납 박스', '수납', 'box', 600, 400, 400, '#c9b79f', '#c9b79f'),

  // ── 조명 ──
  item('floor-lamp', '플로어 램프', '조명', 'lamp', 400, 400, 1600, '#3f3f46', '#f3e9d2', { light: true }),
  item('table-lamp', '무드등', '조명', 'lamp', 280, 280, 450, '#c9b79f', '#fff3dc', { light: true }),
  item('ceiling-light', '천장등', '조명', 'ceilingLight', 500, 500, 90, '#e7e5e4', '#fff7e6', { light: true, mount: 'ceiling' }),
  item('pendant', '펜던트 조명', '조명', 'pendant', 400, 400, 800, '#2f2f33', '#fff1d6', { light: true, mount: 'ceiling' }),

  // ── 반려동물 ──
  item('cat-tower', '캣타워', '반려동물', 'catTower', 600, 500, 1500, '#e8dfd2', '#b8a07e'),

  // ── 전기 ──
  item('power-strip', '멀티탭', '전기', 'powerStrip', 300, 60, 40, '#f4f4f5', '#dc2626', { layer: 'electric' }),
]

/** 다른 가구와 겹쳐도 되는 물건인가 (러그, 천장등, 멀티탭) */
export const isPassable = (i: FurnitureLibraryItem) =>
  i.shape === 'rug' || i.mount === 'ceiling' || i.shape === 'powerStrip' || i.shape === 'puck'

/** 가구 분류 목록 (라이브러리에 나온 순서대로) */
export const FURNITURE_CATEGORIES = [...new Set(LIBRARY.map((i) => i.category))]

/** id로 라이브러리 가구 찾기 */
export const findLibraryItem = (id: string) => LIBRARY.find((i) => i.id === id)
