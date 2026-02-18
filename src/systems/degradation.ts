// ─── 열화 추적 시스템 ───
// 출격 횟수를 추적하고 열화 레벨/은퇴 조건을 판정한다.
// 열화 곡선과 은퇴 임계치는 플레이스홀더 (기획 논의 필요).

import type { Creature, DegradationState } from "../data/types";

// ─── 상수 (플레이스홀더, 밸런싱 미정) ───

/** 은퇴 트리거 출격 횟수 */
export const DEFAULT_RETIREMENT_THRESHOLD = 10;

// ─── 헬퍼 ───

/** degradation이 없으면 초기 상태를 생성한다 */
function ensureDegradation(creature: Creature): DegradationState {
  if (!creature.degradation) {
    creature.degradation = {
      expeditionCount: 0,
      degradationLevel: 0,
      isRetired: false,
      isDead: false,
    };
  }
  return creature.degradation;
}

/**
 * 열화 레벨 계산 (플레이스홀더 곡선)
 * 현재는 단순히 출격 횟수의 절반 (소수점 버림)
 */
function calculateDegradationLevel(expeditionCount: number): number {
  return Math.floor(expeditionCount / 2);
}

// ─── 공개 API ───

/** 출격 횟수 +1 및 열화 상태 갱신. 은퇴/사망 상태면 무시 */
export function trackExpedition(creature: Creature): DegradationState {
  const state = ensureDegradation(creature);

  // 은퇴/사망 상태에서는 출격 불가
  if (state.isRetired || state.isDead) {
    return state;
  }

  state.expeditionCount += 1;
  state.degradationLevel = calculateDegradationLevel(state.expeditionCount);

  return state;
}

/** 현재 열화 레벨 반환 (degradation 미설정 시 0) */
export function getDegradationLevel(creature: Creature): number {
  if (!creature.degradation) return 0;
  return creature.degradation.degradationLevel;
}

/** 은퇴 조건 충족 여부 */
export function isRetirementReady(creature: Creature): boolean {
  if (!creature.degradation) return false;
  if (creature.degradation.isRetired) return true;
  return creature.degradation.expeditionCount >= DEFAULT_RETIREMENT_THRESHOLD;
}

/** 열화 시각화 데이터 (UI 렌더링용) */
export function getDegradationVisuals(creature: Creature): {
  darkenFactor: number;      // 0~0.4
  borderColor: number | null; // null = 테두리 없음
  borderAlpha: number;
} {
  const level = getDegradationLevel(creature);

  // darkenFactor: level * 0.08, clamped to 0.4
  const darkenFactor = Math.min(level * 0.08, 0.4);

  // borderColor: none for level<3, gold for level 3, red for level 4+
  let borderColor: number | null = null;
  let borderAlpha = 0;

  if (level >= 4) {
    borderColor = 0xcc3333;
    borderAlpha = 0.8;
  } else if (level >= 3) {
    borderColor = 0xcc9933;
    borderAlpha = 0.6;
  }

  return { darkenFactor, borderColor, borderAlpha };
}
