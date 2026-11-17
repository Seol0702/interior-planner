import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { RoomShape } from '../types'
import { bounds } from '../plan'
import { fromLocal, isShortLink, parseLocation, RADIUS, type Site } from '../site'
import Icon from '../icons'

export type SiteStatus = { state: 'idle' | 'loading' | 'ready' | 'error'; count: number; message?: string }

type Props = {
  site: Site | undefined
  north: number
  rooms: RoomShape[]
  status: SiteStatus
  onChange: (site: Site | null) => void
  onNorth: (north: number) => void
  onWalk: () => void
  onRetry: () => void
}

type Found = { lat: number; lng: number; name: string }

/** 위치를 정하지 않았을 때 지도가 처음 보여 줄 곳 (서울 시청 부근) */
const START: L.LatLngExpression = [37.5663, 126.9779]

/**
 * 창밖 풍경 설정: 집 위치(지도 클릭·링크·주소 검색), 층수, 집 방향.
 * 위치를 정하면 OpenStreetMap의 주변 건물과 위성사진으로 창밖을 꾸민다.
 */
export default function SitePanel({ site, north, rooms, status, onChange, onNorth, onWalk, onRetry }: Props) {
  const mapBox = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Found[]>([])
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [searching, setSearching] = useState(false)

  // 최신 값을 지도 클릭 처리에서 쓰려고 ref에 둔다
  const latest = useRef({ site, onChange })
  latest.current = { site, onChange }

  /** 위치 정하기 (층수·보이기 설정은 그대로) */
  const place = (lat: number, lng: number, label?: string) => {
    const prev = latest.current.site
    latest.current.onChange({ lat, lng, label, floor: prev?.floor ?? 1, show: true })
    setResults([])
    map.current?.setView([lat, lng], Math.max(map.current.getZoom(), 18))
  }

  // 지도 만들기 (처음 한 번)
  useEffect(() => {
    if (!mapBox.current) return
    const m = L.map(mapBox.current, { zoomControl: true, attributionControl: true }).setView(
      latest.current.site ? [latest.current.site.lat, latest.current.site.lng] : START,
      latest.current.site ? 18 : 15,
    )
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => {
      const prev = latest.current.site
      latest.current.onChange({ lat: e.latlng.lat, lng: e.latlng.lng, floor: prev?.floor ?? 1, show: true })
    })
    map.current = m
    // 패널이 그려진 직후 크기를 다시 재야 지도가 비지 않는다
    const id = setTimeout(() => m.invalidateSize(), 50)
    return () => {
      clearTimeout(id)
      m.remove()
      map.current = null
    }
  }, [])

  // 집 위치 점 + 실제 크기·방향의 집 모양(파란 사각형)
  useEffect(() => {
    const g = layer.current
    if (!g) return
    g.clearLayers()
    if (!site) return
    const b = bounds(rooms)
    const a = (north * Math.PI) / 180
    // 평면도 좌표(m, 가운데 기준) → 동·북 거리 → 위도·경도
    const corner = (px: number, py: number) => {
      const right = px
      const up = -py
      const e = right * Math.cos(a) + up * Math.sin(a)
      const n = -right * Math.sin(a) + up * Math.cos(a)
      const p = fromLocal(site.lat, site.lng, e, n)
      return [p.lat, p.lng] as L.LatLngTuple
    }
    const hw = b.w / 2000
    const hd = b.d / 2000
    L.polygon([corner(-hw, -hd), corner(hw, -hd), corner(hw, hd), corner(-hw, hd)], {
      color: '#2563eb',
      weight: 2,
      fillOpacity: 0.25,
    }).addTo(g)
    // 평면도 위쪽 변을 진하게 표시 (방향을 맞추기 쉽게)
    L.polyline([corner(-hw, -hd), corner(hw, -hd)], { color: '#1e3a8a', weight: 4 }).addTo(g)
    L.circleMarker([site.lat, site.lng], { radius: 4, color: '#1d4ed8', fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(g)
    L.circle([site.lat, site.lng], { radius: RADIUS, color: '#64748b', weight: 1, dashArray: '4 4', fill: false, interactive: false }).addTo(g)
  }, [site, rooms, north])

  /** 찾기: 링크·좌표면 바로, 아니면 주소·장소 이름으로 검색 */
  const search = async () => {
    const text = query.trim()
    if (!text) return
    setMessage(null)
    const loc = parseLocation(text)
    if (loc) {
      place(loc.lat, loc.lng)
      setMessage({ text: '링크에서 위치를 찾았어요', error: false })
      return
    }
    if (isShortLink(text)) {
      setMessage({ text: '짧은 공유 링크(naver.me, maps.app.goo.gl 등)는 읽을 수 없어요. 아래 방법으로 좌표를 복사해 주세요.', error: true })
      return
    }
    if (/^https?:\/\//i.test(text)) {
      setMessage({ text: '이 링크에는 좌표가 없어요. 지도를 직접 눌러 주세요.', error: true })
      return
    }
    setSearching(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(text)}`
      const res = await fetch(url)
      const list = (await res.json()) as { lat: string; lon: string; display_name: string }[]
      const found = list.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), name: r.display_name }))
      setResults(found)
      if (found.length === 0) setMessage({ text: '찾지 못했어요. 아파트 이름·동네 이름으로 찾거나 지도를 직접 눌러 주세요.', error: true })
    } catch {
      setMessage({ text: '검색 서버에 연결하지 못했어요. 지도를 직접 눌러 주세요.', error: true })
    } finally {
      setSearching(false)
    }
  }

  const update = (patch: Partial<Site>) => site && onChange({ ...site, ...patch })

  return (
    <>
      <div className="panel-head">
        <div>
          <h2>창밖 풍경</h2>
          <p className="sub">집 위치를 찍으면 창밖에 실제 주변 건물이 보여요</p>
        </div>
      </div>

      <div className="site-search">
        <input
          type="text"
          value={query}
          placeholder="주소·아파트 이름, 지도 링크, 좌표"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button className="btn primary" onClick={search} disabled={searching}>
          {searching ? '찾는 중' : '찾기'}
        </button>
      </div>
      {message && <p className={`site-msg ${message.error ? 'error' : ''}`}>{message.text}</p>}
      {results.length > 0 && (
        <ul className="site-results">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button onClick={() => place(r.lat, r.lng, r.name.split(',').slice(0, 3).join(','))}>{r.name}</button>
            </li>
          ))}
        </ul>
      )}

      <div className="site-map" ref={mapBox} />
      <p className="hint">
        지도에서 우리 집 건물을 누르세요. 구글 지도에서는 집을 <b>우클릭 → 맨 위 숫자(좌표)</b>를 누르면 복사되고, 네이버 지도는 주소창의 긴 주소를
        붙여 넣으면 돼요.
      </p>

      {site && (
        <>
          <div className="divider" />
          {site.label && <p className="site-label">{site.label}</p>}
          <div className="fields two">
            <label className="field">
              우리 집 층수
              <span className="unit-input">
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={site.floor}
                  onChange={(e) => {
                    const v = Math.round(Number(e.target.value))
                    if (v >= 1 && v <= 80) update({ floor: v })
                  }}
                />
                <span>층</span>
              </span>
            </label>
            <label className="field">
              평면도 위쪽 방위
              <span className="unit-input">
                <input
                  type="number"
                  min={0}
                  max={359}
                  value={north}
                  onChange={(e) => {
                    const v = Math.round(Number(e.target.value))
                    if (Number.isFinite(v)) onNorth(((v % 360) + 360) % 360)
                  }}
                />
                <span>°</span>
              </span>
            </label>
          </div>
          <input type="range" min={0} max={359} value={north} onChange={(e) => onNorth(Number(e.target.value))} aria-label="집 방향" />
          <p className="hint">파란 사각형이 실제 집과 같은 방향이 되게 돌려 주세요. 진한 변이 평면도의 위쪽이에요.</p>

          <label className="switch">
            <input type="checkbox" checked={site.show} onChange={(e) => update({ show: e.target.checked })} />
            <span className="track" />
            주변 풍경 보이기
          </label>

          <p className={`site-status ${status.state}`}>
            {status.state === 'loading' && '주변 건물과 위성사진을 받는 중… (서버가 바쁘면 30초쯤 걸려요)'}
            {status.state === 'ready' && `주변 건물 ${status.count}개를 불러왔어요`}
            {status.state === 'error' && (
              <>
                {status.message}{' '}
                <button className="btn sm" onClick={onRetry}>
                  다시 시도
                </button>
              </>
            )}
            {status.state === 'idle' && (site.show ? '' : '꺼져 있어요')}
          </p>

          <div className="site-actions">
            <button className="btn primary" onClick={onWalk}>
              <Icon name="walk" size={16} /> 걸어 들어가서 창밖 보기
            </button>
            <button className="btn ghost" onClick={() => onChange(null)}>
              위치 지우기
            </button>
          </div>
        </>
      )}

      <div className="divider" />
      <p className="hint">
        사진 같은 실제 풍경이 아니라, OpenStreetMap에 등록된 건물 모양과 높이로 세운 모형 + Esri 위성사진 땅이에요. 높이 정보가 없는 건물은 종류로 짐작해요.
        좌표는 지도·건물 정보를 받을 때 OpenStreetMap·Esri 서버로 보내지고, 저장 파일에도 들어가요.
      </p>
    </>
  )
}
