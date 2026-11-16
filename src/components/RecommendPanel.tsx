import { useState } from 'react'

const STYLES = ['', '미니멀', '북유럽', '우드톤', '모던', '빈티지', '화이트']
const SPACES = ['원룸', '거실', '침실', '아파트', '오피스텔']

// 검색어를 넣어 바로 결과 화면이 열리는 주소들
const SITES: { name: string; note: string; url: (q: string) => string }[] = [
  { name: '유튜브', note: '집 꾸미기 영상', url: (q) => `https://www.youtube.com/results?search_query=${q}` },
  { name: '오늘의집', note: '실제 집 사진·가구', url: (q) => `https://ohou.se/search/index?query=${q}` },
  { name: '핀터레스트', note: '사진 모음', url: (q) => `https://www.pinterest.co.kr/search/pins/?q=${q}` },
  { name: '네이버', note: '블로그·카페 후기', url: (q) => `https://search.naver.com/search.naver?query=${q}` },
  { name: '구글 이미지', note: '사진 검색', url: (q) => `https://www.google.com/search?tbm=isch&q=${q}` },
]

/** 지금 그린 집의 평수에 맞는 인테리어 자료를 찾아 주는 바로가기 */
export default function RecommendPanel({ pyeong, roomCount }: { pyeong: number; roomCount: number }) {
  const [space, setSpace] = useState(roomCount > 1 ? '아파트' : '원룸')
  const [style, setStyle] = useState('')
  const size = Math.max(1, Math.round(pyeong))
  const query = [`${size}평`, space, style, '인테리어'].filter(Boolean).join(' ')

  return (
    <section className="panel">
      <h2>인테리어 추천 자료</h2>
      <p className="hint">
        지금 집은 약 <strong>{size}평</strong>이에요. 같은 평수의 인테리어 자료를 찾아봐요.
      </p>
      <div className="fields two">
        <label>
          공간
          <select value={space} onChange={(e) => setSpace(e.target.value)}>
            {SPACES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          분위기
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            {STYLES.map((s) => (
              <option key={s} value={s}>
                {s || '상관없음'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="query">검색어: “{query}”</p>
      <ul className="links">
        {SITES.map((site) => (
          <li key={site.name}>
            <a href={site.url(encodeURIComponent(query))} target="_blank" rel="noreferrer">
              <strong>{site.name}</strong>
              <span>{site.note}</span>
              <span aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="hint">누르면 새 창에서 검색 결과가 열려요.</p>
    </section>
  )
}
