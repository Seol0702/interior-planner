// 여러 개 고르기 클릭 판단.
// 마우스 신호에 함께 실려 오는 Ctrl(맥은 ⌘) 표시만 본다.
// (키보드 상태를 따로 기억하면, 키를 뗀 신호를 놓쳤을 때 보통 클릭까지 "더하기"로 바뀌는 문제가 생긴다)

/** 지금 Ctrl(⌘)을 누르고 있나 (마우스 신호 기준) */
export function ctrlHeld(e: { ctrlKey: boolean; metaKey: boolean }) {
  return e.ctrlKey || e.metaKey
}

/**
 * 여러 개 고르기 클릭인가: Ctrl(⌘) + 왼쪽 버튼.
 * 맥에서 Ctrl+왼쪽 클릭이 오른쪽 버튼(2)으로 바뀌어 올 때도 받는다.
 */
export function isAddClick(e: { button: number; ctrlKey: boolean; metaKey: boolean }) {
  return ctrlHeld(e) && (e.button === 0 || e.button === 2)
}
