import { Line } from '@react-three/drei'
import type { Guide } from '../guides'
import { mm } from '../units'

const COLOR = '#e11d48'
const Y = 0.03 // 바닥보다 살짝 위

/** 스마트 가이드(정렬선·간격 표시)를 3D 바닥 위에 그린다 */
export default function Guides3D({ guides }: { guides: Guide[] }) {
  return (
    <group>
      {guides.map((g, i) => {
        // axis가 'x'인 정렬선은 x가 고정된 세로선, 간격 표시는 x 방향 토막
        const vertical = (g.kind === 'line') === (g.axis === 'x')
        const a: [number, number, number] = vertical ? [mm(g.at), Y, mm(g.from)] : [mm(g.from), Y, mm(g.at)]
        const b: [number, number, number] = vertical ? [mm(g.at), Y, mm(g.to)] : [mm(g.to), Y, mm(g.at)]
        return (
          <Line
            key={i}
            points={[a, b]}
            color={COLOR}
            lineWidth={g.kind === 'gap' ? 3 : 1.5}
            dashed={g.kind === 'line'}
            dashSize={0.08}
            gapSize={0.05}
            depthTest={false}
            renderOrder={10}
          />
        )
      })}
    </group>
  )
}
