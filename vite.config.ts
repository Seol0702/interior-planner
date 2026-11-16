import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages 주소(seol0702.github.io/interior-planner/)에 맞춘 경로. 개발 서버는 그대로 '/'
  base: command === 'build' ? '/interior-planner/' : '/',
}))
