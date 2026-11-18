// 키보드에서 Ctrl(맥은 ⌘도)을 누르고 있는지 기억해 둔다.
// 맥은 Ctrl+클릭을 "우클릭"으로 바꿔 보내서, 마우스 신호만 보면 Ctrl을 놓칠 때가 있다.
// 그래서 키보드 신호로도 따로 확인한다.

let held = false

if (typeof window !== 'undefined') {
  const update = (e: KeyboardEvent) => {
    held = e.ctrlKey || e.metaKey
  }
  window.addEventListener('keydown', update, true)
  window.addEventListener('keyup', update, true)
  window.addEventListener('blur', () => (held = false)) // 다른 창으로 가면 뗀 것으로
}

/** 지금 Ctrl(⌘)을 누르고 있나: 마우스 신호의 표시 또는 키보드에서 누른 상태 */
export function ctrlHeld(e?: { ctrlKey: boolean; metaKey: boolean }) {
  return held || !!e?.ctrlKey || !!e?.metaKey
}

/**
 * 여러 개 고르기 클릭인가: Ctrl(⌘) + 왼쪽 버튼.
 * 맥에서 Ctrl+왼쪽 클릭이 오른쪽 버튼(2)으로 바뀌어 올 때도 받는다.
 */
export function isAddClick(e: { button: number; ctrlKey: boolean; metaKey: boolean }) {
  return ctrlHeld(e) && (e.button === 0 || e.button === 2)
}
