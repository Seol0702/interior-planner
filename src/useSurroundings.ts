import { useEffect, useState } from 'react'
import { fetchBuildings, satelliteGround, type Building, type Site } from './site'
import type { Ground } from './components/Surroundings'
import type { SiteStatus } from './components/SitePanel'

type Data = { key: string; buildings: Building[]; ground: Ground | null; status: SiteStatus }

const EMPTY: Data = { key: '', buildings: [], ground: null, status: { state: 'idle', count: 0 } }

/**
 * 집 위치가 정해지면 주변 건물과 위성사진을 받아 온다.
 * houseRadius(m): 이 거리 안의 건물은 "우리 집 건물"로 보고 뺀다.
 */
export function useSurroundings(site: Site | undefined, houseRadius: number) {
  const [data, setData] = useState<Data>(EMPTY)
  const [attempt, setAttempt] = useState(0) // "다시 시도"를 누를 때마다 1씩 늘어 새로 받는다
  const radius = Math.round(houseRadius)
  const key = site?.show ? `${site.lat.toFixed(6)},${site.lng.toFixed(6)},${radius},${attempt}` : ''

  useEffect(() => {
    if (!site || !key) return
    let cancelled = false
    setData({ ...EMPTY, key, status: { state: 'loading', count: 0 } })
    // 위성사진(빠름)과 건물(서버가 바쁘면 느림)을 따로 받아서, 먼저 온 것부터 보여 준다
    const patch = (change: (d: Data) => Data) => !cancelled && setData((d) => (d.key === key ? change(d) : d))
    satelliteGround(site.lat, site.lng)
      .then((ground) => patch((d) => ({ ...d, ground })))
      .catch(() => {}) // 위성사진이 없어도 건물은 보여 줄 수 있다
    fetchBuildings(site.lat, site.lng, radius)
      .then((buildings) => patch((d) => ({ ...d, buildings, status: { state: 'ready', count: buildings.length } })))
      .catch((err: Error) => patch((d) => ({ ...d, status: { state: 'error', count: 0, message: err.message } })))
    return () => {
      cancelled = true
    }
    // site 전체가 아니라 위치·크기(key)가 바뀔 때만 다시 받는다 (층수만 바꾸면 그대로)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const retry = () => setAttempt((a) => a + 1)
  const current = key && data.key === key ? data : key ? { ...EMPTY, status: { state: 'loading', count: 0 } as SiteStatus } : EMPTY
  return { ...current, retry }
}
