import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'

// 집의 실제 위치(위도·경도)와 주변 풍경.
// - 지도 링크·좌표 글자에서 위치 읽기
// - OpenStreetMap 주변 건물 모양·높이 받아오기 (무료, 키 필요 없음)
//   1순위: OpenFreeMap 벡터 타일 (CDN이라 빠르고 안정적) / 2순위: Overpass API (느리고 자주 바쁨)
// - 바닥에 깔 위성사진 타일 주소 계산 (Esri World Imagery, 무료)

/** 집 위치 */
export type Site = {
  lat: number // 위도
  lng: number // 경도
  floor: number // 우리 집이 몇 층인지 (창밖 높이)
  label?: string // 검색한 주소 등 (보여주기용)
  show: boolean // 주변 풍경을 3D에 그릴지
}

export const STOREY = 2.9 // 한 층 높이 (m)

/** 주변 건물 하나: 집 위치를 원점으로 한 동(E)·북(N) 좌표(m)의 바닥 모양 + 높이 */
export type Building = { points: [number, number][]; holes?: [number, number][][]; height: number }

/** 받아 온 건물 정보 (높이를 아직 정하지 않은 상태) */
type RawBuilding = { points: [number, number][]; holes?: [number, number][][]; height?: number; tags?: Record<string, string> }

// ───────── 좌표 읽기 ─────────

const validLatLng = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 85 && Math.abs(lng) <= 180

/** 웹 지도에서 쓰는 메르카토르 좌표(m) → 위도·경도 (네이버 지도 옛 링크용) */
function fromMercator(x: number, y: number) {
  const lng = (x / 6378137) * (180 / Math.PI)
  const lat = (2 * Math.atan(Math.exp(y / 6378137)) - Math.PI / 2) * (180 / Math.PI)
  return { lat, lng }
}

/**
 * 붙여 넣은 글자에서 위치를 찾는다. 이런 것들을 알아본다:
 * - 좌표 글자: "37.5665, 126.9780" (구글 지도에서 우클릭하면 나오는 숫자)
 * - 구글 지도 주소: .../@37.5665,126.978,17z  ·  !3d37.5665!4d126.978  ·  ?q=37.5,126.9
 * - 네이버 지도 주소: ?c=126.97,37.56,15,...  ·  ?c=14135024,4518195,...  ·  lat=..&lng=..
 */
export function parseLocation(text: string): { lat: number; lng: number } | null {
  const t = text.trim()
  const num = '(-?\\d{1,3}(?:\\.\\d+)?)'
  const tries: [RegExp, (m: RegExpMatchArray) => { lat: number; lng: number }][] = [
    [new RegExp(`!3d${num}!4d${num}`), (m) => ({ lat: +m[1], lng: +m[2] })], // 구글: 찍은 장소의 정확한 좌표
    [new RegExp(`@${num},${num}`), (m) => ({ lat: +m[1], lng: +m[2] })], // 구글: 지도 가운데
    [new RegExp(`[?&](?:q|ll|query|center)=${num}(?:,|%2C)\\s*${num}`, 'i'), (m) => ({ lat: +m[1], lng: +m[2] })],
    [/[?&]lat=(-?\d+(?:\.\d+)?).*?[?&]lng=(-?\d+(?:\.\d+)?)/i, (m) => ({ lat: +m[1], lng: +m[2] })],
    [/[?&]lng=(-?\d+(?:\.\d+)?).*?[?&]lat=(-?\d+(?:\.\d+)?)/i, (m) => ({ lat: +m[2], lng: +m[1] })],
    [
      // 네이버: c=경도,위도,... 또는 c=메르카토르x,메르카토르y,...
      /[?&]c=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)(?:,|%2C)/i,
      (m) => (Math.abs(+m[1]) > 360 ? fromMercator(+m[1], +m[2]) : { lat: +m[2], lng: +m[1] }),
    ],
    [new RegExp(`^${num}\\s*[,\\s]\\s*${num}$`), (m) => ({ lat: +m[1], lng: +m[2] })], // 숫자 두 개
  ]
  for (const [re, pick] of tries) {
    const m = t.match(re)
    if (!m) continue
    let { lat, lng } = pick(m)
    // 한국 근처인데 순서를 바꿔 적은 경우 (126.97, 37.56) → 바로잡기
    if (Math.abs(lat) > 85 && Math.abs(lng) <= 85) [lat, lng] = [lng, lat]
    if (validLatLng(lat, lng)) return { lat, lng }
  }
  return null
}

/** 짧은 공유 링크는 열어 봐야 좌표가 나오는데, 브라우저에서는 그럴 수 없다 */
export const isShortLink = (text: string) => /(naver\.me|maps\.app\.goo\.gl|goo\.gl\/maps|kko\.to|place\.map\.kakao)/i.test(text)

// ───────── 위도·경도 ↔ 미터 ─────────

const M_PER_DEG_LAT = 110_540
const mPerDegLng = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180)

/** 원점(lat0, lng0)에서 본 동쪽·북쪽 거리 (m) */
export const toLocal = (lat0: number, lng0: number, lat: number, lng: number): [number, number] => [
  (lng - lng0) * mPerDegLng(lat0),
  (lat - lat0) * M_PER_DEG_LAT,
]

/** 원점에서 동쪽 e, 북쪽 n(m)만큼 간 곳의 위도·경도 */
export const fromLocal = (lat0: number, lng0: number, e: number, n: number) => ({
  lat: lat0 + n / M_PER_DEG_LAT,
  lng: lng0 + e / mPerDegLng(lat0),
})

// ───────── 주변 건물 (OpenStreetMap) ─────────

export const RADIUS = 400 // 주변 건물을 불러올 범위 (m)

// 무료 공개 서버들. 자주 바빠서(502·504) 차례로 시도한다. 같은 서버를 두 번 넣은 건 잠깐 뒤 다시 해 보려고
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/** 정해진 시간 안에 답이 없으면 포기하는 fetch */
async function fetchJson(url: string, ms: number) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`서버 응답 ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(id)
  }
}

/** 높이 정보가 없을 때 건물 종류로 짐작 (층수) */
const GUESS_LEVELS: Record<string, number> = {
  apartments: 15,
  residential: 5,
  house: 2,
  detached: 2,
  terrace: 3,
  commercial: 6,
  retail: 3,
  office: 10,
  hotel: 12,
  school: 4,
  university: 5,
  hospital: 8,
  church: 3,
  industrial: 2,
  warehouse: 2,
  garage: 1,
  garages: 1,
  shed: 1,
  roof: 1,
  kiosk: 1,
}

/** 건물 태그 → 높이 (m) */
function heightOf(tags: Record<string, string>) {
  const h = parseFloat(tags.height ?? '')
  if (Number.isFinite(h) && h > 1 && h < 700) return h
  const levels = parseFloat(tags['building:levels'] ?? '')
  if (Number.isFinite(levels) && levels >= 1 && levels < 200) return levels * STOREY + 1
  return (GUESS_LEVELS[tags.building] ?? 3) * STOREY + 1
}

type OverpassWay = { type: string; tags?: Record<string, string>; geometry?: { lat: number; lon: number }[] }

/** 점이 다각형 안에 있는가 */
function inside(points: [number, number][], x: number, y: number) {
  let hit = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** 원점에서 다각형 테두리까지 가장 가까운 거리 */
function distanceToOrigin(points: [number, number][]) {
  let best = Infinity
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[j]
    const [bx, by] = points[i]
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)))
    best = Math.min(best, Math.hypot(ax + dx * t, ay + dy * t))
  }
  return best
}

const CACHE_KEY = 'interior-planner:buildings-v2'

/**
 * 집 주변 건물을 받아온다.
 * 우리 집이 들어 있는 건물(원점을 감싸거나 houseRadius보다 가까운 건물)은 빼야 창밖을 가리지 않는다.
 * 같은 위치는 다시 받지 않도록 브라우저에 한 곳만 보관해 둔다.
 */
export async function fetchBuildings(lat: number, lng: number, houseRadius: number): Promise<Building[]> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
  let raw: RawBuilding[] | null = null
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    if (cached && cached.key === key && Array.isArray(cached.raw)) raw = cached.raw
  } catch {
    // 보관본이 없거나 망가짐 → 새로 받는다
  }

  if (!raw) {
    // 같은 위치를 동시에 두 번 받지 않게 (화면이 두 번 그려질 때 등)
    let job = inflight.get(key)
    if (!job) {
      job = fromVectorTiles(lat, lng).catch(() => fromOverpass(lat, lng))
      inflight.set(key, job)
      job.finally(() => inflight.delete(key)).catch(() => {})
    }
    raw = await job
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ key, raw }))
    } catch {
      // 저장 공간이 모자라면 보관하지 않고 넘어감
    }
  }

  return raw
    .filter((w) => !inside(w.points, 0, 0) && distanceToOrigin(w.points) > houseRadius)
    .map((w) => ({ points: w.points, holes: w.holes, height: w.height ?? heightOf(w.tags ?? {}) }))
}

const inflight = new Map<string, Promise<RawBuilding[]>>()

const round = (v: number) => Math.round(v * 10) / 10

/** 위도·경도 목록 → 원점 기준 동·북(m). 마지막 점이 처음 점과 같으면 뺀다 */
function ringToLocal(lat: number, lng: number, ring: number[][]): [number, number][] {
  const pts = ring.map((c): [number, number] => {
    const [e, n] = toLocal(lat, lng, c[1], c[0])
    return [round(e), round(n)]
  })
  const [a, b] = [pts[0], pts[pts.length - 1]]
  if (pts.length > 1 && a[0] === b[0] && a[1] === b[1]) pts.pop()
  return pts
}

const BUILDING_ZOOM = 14 // OpenFreeMap 건물 정보가 가장 자세한 줌

/** 1순위: OpenFreeMap 벡터 타일에서 건물 읽기 */
async function fromVectorTiles(lat: number, lng: number): Promise<RawBuilding[]> {
  const meta = await fetchJson('https://tiles.openfreemap.org/planet', 15_000)
  const template: string | undefined = meta?.tiles?.[0]
  if (!template) throw new Error('타일 주소를 찾지 못했어요')

  // 집 둘레 RADIUS를 덮는 타일들
  const z = BUILDING_ZOOM
  const nw = fromLocal(lat, lng, -RADIUS, RADIUS)
  const se = fromLocal(lat, lng, RADIUS, -RADIUS)
  const a = tileXY(nw.lat, nw.lng, z)
  const b = tileXY(se.lat, se.lng, z)
  const tiles: [number, number][] = []
  for (let x = Math.floor(a.x); x <= Math.floor(b.x); x++) for (let y = Math.floor(a.y); y <= Math.floor(b.y); y++) tiles.push([x, y])

  const result: RawBuilding[] = []
  await Promise.all(
    tiles.map(async ([x, y]) => {
      const url = template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
      const ctrl = new AbortController()
      const id = setTimeout(() => ctrl.abort(), 20_000)
      try {
        const res = await fetch(url, { signal: ctrl.signal })
        if (!res.ok) throw new Error(`타일 ${res.status}`)
        const tile = new VectorTile(new PbfReader(new Uint8Array(await res.arrayBuffer())))
        const layer = tile.layers.building
        if (!layer) return
        for (let i = 0; i < layer.length; i++) {
          const feature = layer.feature(i)
          // 높이: OpenMapTiles는 높이 정보가 없으면 5m로 적어 둔다 → 그럴 땐 3층 건물로 짐작
          const h = Number(feature.properties.render_height)
          const height = Number.isFinite(h) && h > 0 && h !== 5 ? h : 3 * STOREY + 1
          const geom = feature.toGeoJSON(x, y, z).geometry
          const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []
          for (const poly of polygons) {
            const points = ringToLocal(lat, lng, poly[0])
            if (points.length < 3 || points.every(([e, n]) => Math.hypot(e, n) > RADIUS + 60)) continue
            const holes = poly.slice(1).map((r) => ringToLocal(lat, lng, r)).filter((r) => r.length >= 3)
            result.push(holes.length ? { points, holes, height } : { points, height })
          }
        }
      } finally {
        clearTimeout(id)
      }
    }),
  )
  return result
}

/** 2순위: Overpass API에서 건물 읽기 (건물 종류로 높이를 짐작할 수 있지만 서버가 자주 바쁘다) */
async function fromOverpass(lat: number, lng: number): Promise<RawBuilding[]> {
  const query = `[out:json][timeout:25];way["building"](around:${RADIUS},${lat},${lng});out tags geom;`
  let data: { elements: OverpassWay[] } | null = null
  let lastError: unknown = null
  for (const [i, url] of OVERPASS.entries()) {
    try {
      if (i > 0) await new Promise((r) => setTimeout(r, 800)) // 연달아 두드리지 않게 잠깐 쉬었다가
      data = await fetchJson(`${url}?data=${encodeURIComponent(query)}`, 35_000)
      break
    } catch (err) {
      lastError = err
    }
  }
  if (!data) {
    const reason = (lastError as Error)?.name === 'AbortError' ? '시간 초과' : ((lastError as Error)?.message ?? '연결 실패')
    throw new Error(`건물 정보 서버가 바빠서 받지 못했어요 (${reason}). 잠시 뒤 다시 시도해 주세요`)
  }
  const result: RawBuilding[] = []
  for (const el of data.elements) {
    if (el.type !== 'way' || !el.geometry || el.geometry.length < 4) continue
    const points = ringToLocal(lat, lng, el.geometry.map((g) => [g.lon, g.lat]))
    const tags: Record<string, string> = {}
    for (const k of ['building', 'height', 'building:levels']) if (el.tags?.[k]) tags[k] = el.tags[k]
    result.push({ tags, points })
  }
  return result
}

// ───────── 위성사진 타일 ─────────

export const SATELLITE_ZOOM = 18 // 한 칸(픽셀)이 약 0.5m

/** 위도·경도 → 타일 번호(소수점 포함) */
export function tileXY(lat: number, lng: number, z: number) {
  const n = 2 ** z
  const x = ((lng + 180) / 360) * n
  const r = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n
  return { x, y }
}

/** 타일 번호 → 그 타일 왼쪽 위 모서리의 위도·경도 */
export function tileCorner(x: number, y: number, z: number) {
  const n = 2 ** z
  const lng = (x / n) * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI
  return { lat, lng }
}

export const satelliteTileUrl = (x: number, y: number, z: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`

/**
 * 집 둘레의 위성사진을 한 장으로 이어 붙인다.
 * 결과: 그림 + 그 그림이 덮는 범위(원점 기준 동·북 m)
 */
export async function satelliteGround(lat: number, lng: number, tiles = 7) {
  const z = SATELLITE_ZOOM
  const c = tileXY(lat, lng, z)
  const x0 = Math.floor(c.x) - Math.floor(tiles / 2)
  const y0 = Math.floor(c.y) - Math.floor(tiles / 2)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = tiles * 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#9aa39a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const jobs: Promise<void>[] = []
  for (let i = 0; i < tiles; i++) {
    for (let j = 0; j < tiles; j++) {
      jobs.push(
        new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous' // 3D 그림(텍스처)으로 쓰려면 필요
          img.onload = () => {
            ctx.drawImage(img, i * 256, j * 256)
            resolve()
          }
          img.onerror = () => resolve() // 한 장쯤 빠져도 나머지로 그린다
          img.src = satelliteTileUrl(x0 + i, y0 + j, z)
        }),
      )
    }
  }
  await Promise.all(jobs)
  const nw = tileCorner(x0, y0, z)
  const se = tileCorner(x0 + tiles, y0 + tiles, z)
  const [west, north] = toLocal(lat, lng, nw.lat, nw.lng)
  const [east, south] = toLocal(lat, lng, se.lat, se.lng)
  return { canvas, west, east, north, south }
}
