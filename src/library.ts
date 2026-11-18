import type { FurnitureInstance, FurnitureLibraryItem, ShapeId } from './types'

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
  item('gaming-chair', '게이밍 의자', '서재', 'gamingChair', 700, 700, 1300, '#17171a', '#2f2f34'),
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
  item('fridge-2door-small', '소형 2도어 냉장고 (냉동·냉장)', '주방', 'fridgeTopFreezer', 480, 550, 1250, '#eceef0', '#f6f7f8'),
  item('microwave', '전자레인지', '주방', 'microwave', 480, 360, 280, '#e8e8e6', '#cfd2d6', { base: 850, onTop: true }),

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


  // ═════════ 추가 100종 ═════════

  // ── 거실 ──
  item('sofa-4', '4인 소파', '거실', 'sofa', 2400, 950, 820, '#8c96a3', '#b9c1cb'),
  item('sofa-low', '로우 모듈 소파', '거실', 'sofa', 2700, 1000, 700, '#e3dccf', '#f1ece3'),
  item('couch-large', '대형 카우치 소파', '거실', 'cornerSofa', 3000, 1700, 820, '#6f7a70', '#97a297'),
  item('sofa-leather', '가죽 3인 소파', '거실', 'sofa', 2100, 920, 850, '#7a4f35', '#946247'),
  item('sofa-bed', '소파베드', '거실', 'sofa', 1900, 950, 820, '#a4a9ae', '#c6cacd'),
  item('sofa-boucle', '부클레 2인 소파', '거실', 'sofa', 1700, 900, 760, '#efebe3', '#f7f4ee'),
  item('ottoman', '오토만 (발받침)', '거실', 'box', 600, 450, 420, '#b3a08b', '#b3a08b'),
  item('pouf', '푸프', '거실', 'beanbag', 500, 500, 400, '#c97b5a', '#d99677'),
  item('lounge-chair', '라운지 체어', '거실', 'recliner', 800, 850, 850, '#3f3a36', '#5a524c'),
  item('armchair', '패브릭 암체어', '거실', 'sofa', 750, 800, 800, '#7a8b72', '#9aaa92'),
  item('nesting-table', '네스팅 테이블', '거실', 'roundTable', 500, 500, 450, '#3f3f46', '#3f3f46'),
  item('coffee-table-large', '대형 소파 테이블', '거실', 'table', 1200, 700, 380, '#7a5c40', '#7a5c40'),
  item('low-table', '좌식 테이블', '거실', 'table', 1000, 600, 330, '#c9a67a', '#c9a67a'),
  item('floor-cushion', '좌식 방석', '거실', 'beanbag', 600, 600, 150, '#d9cbb6', '#ebe1d1'),
  item('tv-stand-long', '와이드 TV장 + TV', '거실', 'tvUnit', 2000, 400, 1300, '#f1efe9', '#f7f6f2'),
  item('tv-75', '75인치 TV + 거실장', '거실', 'tvUnit', 2400, 450, 1500, '#5b4636', '#7a604b'),
  item('display-cabinet', '유리 진열장', '거실', 'glassCabinet', 800, 400, 1800, '#3f3f46', '#cfdfe8'),
  item('rug-large', '대형 러그', '거실', 'rug', 2400, 1700, 12, '#bfb3a3', '#d9cfc1'),
  item('rug-small', '소형 러그', '거실', 'rug', 1200, 800, 12, '#9fb3c8', '#c4d2e0'),
  item('plant-small', '소형 화분', '거실', 'plant', 300, 300, 600, '#f1ede6', '#6f9a62'),
  item('olive-tree', '올리브나무', '거실', 'plant', 600, 600, 1500, '#c4734f', '#8aa070'),
  item('coat-stand', '스탠드 옷걸이', '거실', 'coatStand', 450, 450, 1750, '#a07c5a', '#c9b79f'),
  item('ladder-shelf', '사다리 선반', '거실', 'ladderShelf', 600, 400, 1700, '#b08e68', '#d6c7b2'),

  // ── 침실 ──
  item('bed-queen-white', '화이트 퀸 침대', '침실', 'bed', 1600, 2100, 900, '#f1efe9', '#c9d3dc'),
  item('bed-queen-low', '저상형 퀸 침대', '침실', 'bed', 1600, 2100, 550, '#d6c4a8', '#e5ded2'),
  item('bed-ss-storage', '수납형 슈퍼싱글 침대', '침실', 'bed', 1100, 2100, 950, '#ece7df', '#a9b5c6'),
  item('bunk-bed', '2층 침대', '침실', 'bunkBed', 1100, 2100, 1650, '#c9a67a', '#9db0a1'),
  item('mattress-queen', '퀸 매트리스', '침실', 'mattress', 1500, 2000, 250, '#f5f3ee', '#e5e7eb'),
  item('mattress-ss', '슈퍼싱글 매트리스', '침실', 'mattress', 1100, 2000, 250, '#f5f3ee', '#e5e7eb'),
  item('nightstand-round', '원형 협탁', '침실', 'roundTable', 400, 400, 550, '#e9e4dc', '#e9e4dc'),
  item('nightstand-2', '2단 협탁', '침실', 'drawers', 400, 350, 450, '#f4f4f2', '#e2ddd3'),
  item('dresser-wide', '와이드 서랍장', '침실', 'drawers', 1200, 450, 800, '#b39b82', '#d9ccba'),
  item('dresser-tall', '높은 서랍장', '침실', 'drawers', 800, 450, 1200, '#f1ede6', '#e2d6c6'),
  item('wardrobe-2', '2문 옷장', '침실', 'wardrobe', 800, 580, 1900, '#e2d6c6', '#efe6d8'),
  item('wardrobe-sliding', '슬라이딩 옷장', '침실', 'wardrobe', 1800, 620, 2100, '#8a7b6c', '#a39586'),
  item('mirror-wide', '와이드 거울', '침실', 'mirror', 1000, 300, 1500, '#2f2f33', '#2f2f33'),
  item('wall-mirror', '벽걸이 거울', '침실', 'wallMirror', 600, 30, 900, '#c8b49a', '#c8b49a', { base: 900 }),
  item('whiteboard', '벽걸이 칠판 (화이트보드)', '서재', 'wallBoard', 1500, 90, 900, '#c9ccd0', '#f7f7f4', { base: 900 }),
  item('wall-mirror-round', '원형 벽걸이 거울', '침실', 'roundMirror', 600, 30, 600, '#2f2f33', '#2f2f33', { base: 1100 }),
  item('vanity-compact', '미니 화장대', '침실', 'vanity', 800, 400, 1350, '#e8dfd2', '#f1ede6'),
  item('hanger-mini', '미니 행거', '침실', 'hanger', 800, 400, 1500, '#e4e4e7', '#d9cbb6'),

  // ── 서재 ──
  item('desk-compact', '컴팩트 책상', '서재', 'desk', 1000, 500, 740, '#f1efe9', '#e2ddd3'),
  item('desk-wide', '와이드 책상', '서재', 'desk', 1600, 700, 740, '#7a5c40', '#a58a6d'),
  item('desk-computer', '컴퓨터 책상', '서재', 'standingDesk', 1200, 600, 740, '#3f3f46', '#3f3f46'),
  item('desk-computer-panel', '판다리 컴퓨터 책상', '서재', 'panelLegDesk', 1200, 600, 740, '#3f3f46', '#3f3f46'),
  item('desk-study', '학생 책상', '서재', 'desk', 1200, 600, 740, '#e9e4dc', '#9fb3c8'),
  item('desk-glass-panel', '판다리 유리 책상', '서재', 'panelDesk', 1400, 700, 740, '#e4e1da', '#3f9f6c'),
  item('table-glass-panel', '판다리 유리 회의 테이블', '서재', 'panelDesk', 2400, 1200, 750, '#e4e1da', '#3f9f6c'),
  // 책상 위에 올려 쓰는 것 (base: 책상 높이만큼 띄움, 선택 카드에서 바꿀 수 있다)
  item('computer-desktop', '컴퓨터 (모니터·키보드)', '서재', 'computer', 600, 450, 470, '#2f2f33', '#4b4f57', { base: 740, onTop: true }),
  item('pc-tower', '컴퓨터 본체', '서재', 'pcTower', 210, 450, 460, '#26272b', '#3a3d44'),
  item('laptop', '노트북', '서재', 'laptop', 340, 240, 230, '#b9bcc2', '#2f2f33', { base: 740, onTop: true }),
  item('soldering-station', '인두기 (납땜 스테이션)', '서재', 'solderStation', 300, 180, 220, '#3a3d44', '#d14b3d', { base: 740, onTop: true }),
  item('printer-3d', '3D 프린터 (필라멘트 보관함)', '서재', 'printer3d', 420, 420, 720, '#8e9399', '#3a3d42', { base: 740, onTop: true }),
  item('printer', '프린터 (복합기)', '서재', 'printer', 430, 380, 240, '#eceef0', '#d4d7db', { base: 740, onTop: true }),
  item('chair-mesh', '메쉬 의자', '서재', 'officeChair', 620, 620, 1050, '#52525b', '#71717a'),
  item('chair-study', '원목 공부 의자', '서재', 'chair', 450, 500, 820, '#b08e68', '#b08e68'),
  item('bookshelf-wide', '와이드 책장', '서재', 'bookshelf', 1200, 300, 1800, '#f1efe9', '#f1efe9'),
  item('bookshelf-low', '낮은 책장', '서재', 'bookshelf', 800, 300, 800, '#c9a67a', '#c9a67a'),
  item('bookshelf-empty', '빈 원목 책장', '서재', 'openCabinet', 800, 300, 1800, '#b89a78', '#c9ad8a'),
  item('cube-shelf-1x4', '4칸 큐브 선반', '서재', 'cubeShelf', 390, 390, 1470, '#f4f4f2', '#c9b79f'),
  item('cube-shelf-4x4', '큐브 선반 4×4', '서재', 'cubeShelf', 1470, 390, 1470, '#3f3f46', '#c9b79f'),
  item('file-cabinet', '이동식 서랍', '서재', 'drawers', 400, 500, 600, '#e4e4e7', '#f4f4f5'),

  // ── 주방 ──
  item('dining-round-4', '4인 원형 식탁', '주방', 'roundTable', 1000, 1000, 740, '#c9a67a', '#c9a67a'),
  item('dining-marble', '대리석 식탁', '주방', 'table', 1600, 850, 750, '#efede8', '#efede8'),
  item('dining-ext', '확장형 식탁', '주방', 'table', 1600, 900, 750, '#9a7b5a', '#9a7b5a'),
  item('chair-cushion', '쿠션 식탁 의자', '주방', 'chair', 460, 520, 820, '#3f3f46', '#c9bba8'),
  item('chair-plastic', '플라스틱 의자', '주방', 'chair', 450, 500, 800, '#f4f4f2', '#f4f4f2'),
  item('bench-cushion', '쿠션 벤치', '주방', 'table', 1300, 380, 450, '#a58a6d', '#d6c7b2'),
  item('stool-wood', '원목 스툴', '주방', 'stool', 320, 320, 450, '#c9a67a', '#c9a67a'),
  item('sink-counter', '싱크대', '주방', 'sinkCounter', 2400, 600, 850, '#f1efe9', '#d8d2c6'),
  item('base-cabinet', '주방 하부장', '주방', 'counter', 1200, 600, 850, '#e8e4dc', '#cfc8bc'),
  item('pantry', '키큰장 (팬트리)', '주방', 'wardrobe', 600, 600, 2100, '#f1efe9', '#f7f6f2'),
  item('microwave-rack', '전자레인지 수납장', '주방', 'cubeShelf', 600, 400, 1200, '#f4f4f2', '#9fb3c8'),
  item('fridge-4door', '4도어 냉장고', '주방', 'fridge', 920, 920, 1850, '#e9e4dc', '#f4f1ec'),
  item('wine-fridge', '와인셀러', '주방', 'wineCellar', 500, 550, 850, '#27272a', '#8a96a3'),

  // ── 욕실 ──
  item('bathtub', '욕조', '욕실', 'bathtub', 1500, 750, 550, '#f6f6f4', '#a9d3ee'),
  item('toilet', '변기', '욕실', 'toilet', 400, 700, 750, '#f6f6f4', '#ececea'),
  item('washbasin', '세면대', '욕실', 'washbasin', 600, 480, 850, '#c9a67a', '#ddc4a3'),
  item('bath-cabinet', '욕실 수납장', '욕실', 'wardrobe', 400, 300, 1500, '#f4f4f2', '#f7f7f5'),
  item('shower-caddy', '샤워 바구니 (욕실 용품)', '욕실', 'showerCaddy', 320, 180, 300, '#e9e7e2', '#7fb3d5'),
  item('laundry-basket', '빨래 바구니', '욕실', 'puck', 400, 400, 550, '#d9c7ad', '#c4ae90'),

  // ── 가전 ──
  item('washer-top', '통돌이 세탁기', '가전', 'topLoader', 600, 620, 980, '#eceef0', '#cfd4da'),
  item('air-purifier-large', '대형 공기청정기', '가전', 'tower', 450, 450, 900, '#e9e4dc', '#d6cfc3'),
  item('dehumidifier', '제습기', '가전', 'tower', 400, 300, 650, '#f4f4f2', '#d4d4d8'),
  item('humidifier', '가습기', '가전', 'puck', 300, 300, 400, '#f4f4f2', '#a9d3ee'),
  item('circulator', '서큘레이터', '가전', 'fan', 300, 300, 500, '#f4f4f2', '#e4e4e7'),
  item('aircon-2in1', '투인원 스탠드 에어컨', '가전', 'tower', 450, 450, 1850, '#e9e4dc', '#f4f1ec'),
  item('styler-mini', '미니 의류관리기', '가전', 'wardrobe', 400, 550, 1200, '#cfc8bc', '#e2ddd3'),
  item('vacuum-station', '무선청소기 거치대', '가전', 'vacuumStand', 300, 300, 1200, '#e4e4e7', '#71717a'),
  item('speaker', '스탠드 스피커', '가전', 'speaker', 250, 300, 1000, '#27272a', '#52525b'),
  item('water-purifier', '스탠드 정수기', '가전', 'tower', 300, 400, 1300, '#f4f4f2', '#a9d3ee'),
  item('water-cooler', '생수통 정수기', '가전', 'waterCooler', 320, 340, 1400, '#f1f1ef', '#8cc4ea'),

  // ── 수납 ──
  item('storage-cabinet', '수납장', '수납', 'wardrobe', 800, 400, 1100, '#e8dfd2', '#f1ede6'),
  item('steel-cabinet', '철제 캐비닛 (양문형)', '수납', 'wardrobe', 900, 450, 1800, '#c9ccd0', '#d6d9dd'),
  item('file-cabinet-tall', '서랍형 서류 캐비닛', '수납', 'drawers', 470, 620, 1330, '#c9ccd0', '#d6d9dd'),
  item('wood-cabinet', '원목 캐비닛', '수납', 'wardrobe', 1000, 420, 1200, '#9b7653', '#b48d68'),
  // 문 없는 선반장
  item('steel-bookshelf', '철제 책장 (문 없음)', '수납', 'openCabinet', 900, 400, 1800, '#c9ccd0', '#b7bbc1'),
  item('steel-open-cabinet-low', '오픈 철제 캐비닛 (낮은형)', '수납', 'openCabinet', 900, 400, 900, '#c9ccd0', '#b7bbc1'),
  item('steel-open-cabinet-wide', '오픈 철제 캐비닛 (와이드)', '수납', 'openCabinet', 1200, 450, 1800, '#3f4349', '#2f3237'),
  item('wood-open-cabinet', '원목 오픈 수납장', '수납', 'openCabinet', 800, 350, 1200, '#b08e68', '#c9ad8a'),
  item('steel-angle-shelf', '철제 앵글 선반', '수납', 'steelShelf', 900, 450, 1800, '#8d939b', '#c3c7cc'),
  item('parts-cabinet', '대형 부품 보관함 (투명 서랍)', '수납', 'partsCabinet', 1000, 300, 1600, '#4a4f57', '#d4d8dd'),
  item('open-shelf', '오픈 선반', '수납', 'bookshelf', 900, 350, 1200, '#3f3f46', '#3f3f46'),
  item('shoe-cabinet-tall', '키큰 신발장', '수납', 'wardrobe', 900, 380, 2000, '#efe9df', '#f7f3ec'),
  item('shoe-rack', '신발 선반', '수납', 'cubeShelf', 800, 300, 800, '#c9a67a', '#a58a6d'),
  item('storage-box-large', '대형 수납함', '수납', 'box', 700, 450, 500, '#e4e4e7', '#e4e4e7'),
  item('drawer-unit-3', '3단 수납함', '수납', 'drawers', 450, 400, 650, '#f4f4f2', '#e2ddd3'),
  item('entry-bench', '현관 의자', '수납', 'table', 900, 350, 450, '#b08e68', '#b08e68'),

  // ── 조명 ──
  item('floor-lamp-arc', '아치형 플로어 램프', '조명', 'lamp', 400, 400, 1900, '#a1a1aa', '#f3e9d2', { light: true }),
  item('floor-lamp-tripod', '삼각대 조명', '조명', 'lamp', 500, 500, 1500, '#a58a6d', '#f5ead6', { light: true }),
  item('table-lamp-glass', '유리 무드등', '조명', 'lamp', 250, 250, 400, '#cfdfe8', '#fff4e0', { light: true }),
  item('pendant-large', '대형 펜던트 조명', '조명', 'pendant', 600, 600, 900, '#f4f4f2', '#fff1d6', { light: true, mount: 'ceiling' }),
  item('pendant-mini', '미니 펜던트 조명', '조명', 'pendant', 250, 250, 700, '#b08e68', '#fff1d6', { light: true, mount: 'ceiling' }),
  item('ceiling-light-large', '대형 천장등', '조명', 'ceilingLight', 700, 700, 100, '#e7e5e4', '#fff7e6', { light: true, mount: 'ceiling' }),

  // ── 아이방 ──
  item('crib', '아기 침대', '아이방', 'crib', 700, 1300, 950, '#f1efe9', '#f6e3d8'),
  item('kids-desk', '어린이 책상', '아이방', 'desk', 1000, 550, 600, '#f4f4f2', '#a9d3ee'),
  item('kids-chair', '어린이 의자', '아이방', 'chair', 350, 380, 600, '#f2c94c', '#f2c94c'),
  item('toy-shelf', '장난감 정리함', '아이방', 'cubeShelf', 1000, 350, 750, '#f4f4f2', '#f2b8a2'),
  item('kids-bed', '어린이 침대', '아이방', 'bed', 1000, 1800, 700, '#f1efe9', '#bfd8c2'),
  item('play-mat', '놀이 매트', '아이방', 'rug', 2000, 1400, 12, '#d9e8f2', '#f6e3d8'),

  // ── 운동 ──
  item('treadmill', '러닝머신', '운동', 'treadmill', 800, 1800, 1350, '#3f3f46', '#a1a1aa'),
  item('yoga-mat', '요가 매트', '운동', 'rug', 610, 1830, 6, '#8fa3b5', '#a9b9c8'),
  item('workout-bench', '운동 벤치', '운동', 'table', 1200, 350, 450, '#27272a', '#27272a'),

  // ── 반려동물 ──
  item('cat-tower-small', '소형 캣타워', '반려동물', 'catTower', 450, 400, 900, '#f1ede6', '#c9b79f'),
  item('pet-bed', '강아지 방석', '반려동물', 'beanbag', 700, 550, 200, '#b39b82', '#e6dccb'),
  item('pet-house', '반려동물 하우스', '반려동물', 'petHouse', 600, 500, 550, '#e8dfd2', '#b5654a'),

  // ── 전기 ──
  item('power-strip', '멀티탭', '전기', 'powerStrip', 300, 60, 40, '#f4f4f5', '#dc2626', { layer: 'electric' }),
]

/** 다른 가구와 겹쳐도 되는 물건인가 (러그, 천장등, 멀티탭) */
export const isPassable = (i: FurnitureLibraryItem) =>
  i.shape === 'rug' || i.mount === 'ceiling' || i.shape === 'powerStrip' || i.shape === 'puck'

/** 가구 바닥이 놓이는 높이 (mm): 천장 물건은 천장에서 매달고, 책상 위 물건은 띄운다 */
export const bottomOf = (i: FurnitureLibraryItem, wallHeight: number) => (i.mount === 'ceiling' ? wallHeight - i.height : (i.base ?? 0))

/** 가구 분류 목록 (라이브러리에 나온 순서대로) */
export const FURNITURE_CATEGORIES = [...new Set(LIBRARY.map((i) => i.category))]

/**
 * 배치된 가구의 "실제 모습": 라이브러리 원본에 이 가구만의 크기 변경을 덮어쓴 것.
 * (가구 하나의 크기를 바꿔도 라이브러리 원본은 그대로 둔다)
 */
export function resolveItem(f: FurnitureInstance): FurnitureLibraryItem | undefined {
  const base = findLibraryItem(f.libraryId)
  if (!base || (f.width === undefined && f.depth === undefined && f.height === undefined && f.base === undefined)) return base
  return { ...base, width: f.width ?? base.width, depth: f.depth ?? base.depth, height: f.height ?? base.height, base: f.base ?? base.base }
}

/** id로 라이브러리 가구 찾기 */
export const findLibraryItem = (id: string) => LIBRARY.find((i) => i.id === id)
