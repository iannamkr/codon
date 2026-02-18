// ─── 변이 발동 판정 ───
// 변이 확률 체크 + 제안/적용 스텁 (기획 미확정)

import type { Creature } from "../data/types";

/** 변이 제안 (최소 스텁) */
export interface MutationProposal {
  targetCodonIndex: number;
  description: string;
}

/**
 * 변이 발동 여부 판정.
 * mutChance = MUT / (MUT + 100) — 이미 계산된 값을 받는다.
 * rng() < mutChance 이면 발동.
 */
export function checkMutation(
  mutChance: number,
  rng: () => number = Math.random,
): boolean {
  if (mutChance <= 0) return false;
  return rng() < mutChance;
}

/**
 * 변이 제안 생성 — 스텁 (기획 미확정).
 * 변이가 코돈의 무엇을 어떻게 바꾸는지 논의 필요.
 */
export function generateMutationProposal(): MutationProposal | null {
  return null;
}

/**
 * 변이 적용 — 스텁 (기획 미확정).
 * 실험체를 그대로 반환한다.
 */
export function applyMutation(
  creature: Creature,
  _proposal: MutationProposal,
): Creature {
  return creature;
}
