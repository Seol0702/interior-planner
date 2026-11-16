// 가구 사진에서 대표 색 2가지를 뽑는다 (본체 색 + 포인트 색).
// 사진을 작게 줄인 뒤, 비슷한 색끼리 묶어서 가장 많이 나온 색을 고르는 방식.
import { rgbToHex, shade } from './colors'

type Bucket = { count: number; r: number; g: number; b: number }

const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

export async function extractColors(file: Blob): Promise<{ main: string; accent: string }> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('이미지 파일을 읽을 수 없어요')
  }
  const N = 80
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = N
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0, N, N)
  bitmap.close()
  const { data } = ctx.getImageData(0, 0, N, N)
  const pixel = (x: number, y: number) => {
    const i = (y * N + x) * 4
    return [data[i], data[i + 1], data[i + 2], data[i + 3]]
  }

  // 배경 추정: 사진 테두리 색이 거의 한 가지면(흰 배경 제품 사진 등) 그 색은 빼고 센다
  const border: number[][] = []
  for (let i = 0; i < N; i++) border.push(pixel(i, 0), pixel(i, N - 1), pixel(0, i), pixel(N - 1, i))
  const bg = [0, 1, 2].map((c) => border.reduce((sum, p) => sum + p[c], 0) / border.length)
  const uniformBorder = border.filter((p) => distance(p, bg) < 40).length / border.length > 0.8

  // 색을 16단계씩으로 뭉뚱그려 묶음(bucket)별로 센다
  const buckets = new Map<number, Bucket>()
  let total = 0
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const [r, g, b, a] = pixel(x, y)
      if (a < 128) continue // 투명한 부분
      if (uniformBorder && distance([r, g, b], bg) < 45) continue // 배경
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
      bucket.count++
      bucket.r += r
      bucket.g += g
      bucket.b += b
      buckets.set(key, bucket)
      total++
    }
  }
  if (total === 0) throw new Error('사진에서 색을 찾지 못했어요')

  const ranked = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .map((b) => ({ rgb: [b.r / b.count, b.g / b.count, b.b / b.count], count: b.count }))
  const main = ranked[0]
  // 포인트 색: 본체 색과 충분히 다르면서 어느 정도 넓게 쓰인 색
  const second = ranked.find((c) => distance(c.rgb, main.rgb) > 60 && c.count > total * 0.03)
  const mainHex = rgbToHex(main.rgb[0], main.rgb[1], main.rgb[2])
  return {
    main: mainHex,
    accent: second ? rgbToHex(second.rgb[0], second.rgb[1], second.rgb[2]) : shade(mainHex, 0.3),
  }
}
