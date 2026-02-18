// ─── 생명주기 관리 시스템 ───
// 은퇴(코돈 보존)와 사망(코돈 손실) 처리를 담당한다.

import type { Creature, Codon } from "../data/types";

// ─── 헬퍼 ───

/** degradation이 없으면 초기 상태를 생성한다 */
function ensureDegradation(creature: Creature): void {
  if (!creature.degradation) {
    creature.degradation = {
      expeditionCount: 0,
      degradationLevel: 0,
      isRetired: false,
      isDead: false,
    };
  }
}

// ─── 공개 API ───

/**
 * 은퇴 처리: 코돈 풀 전부를 보존 목록으로 반환하고 실험체를 은퇴 상태로 변경한다.
 * 사망한 실험체는 은퇴 불가 (빈 배열 반환).
 */
export function retireCreature(creature: Creature): { retiredCodons: Codon[] } {
  ensureDegradation(creature);

  // 사망 상태에서는 은퇴 불가
  if (creature.degradation!.isDead) {
    return { retiredCodons: [] };
  }

  // 이미 은퇴 상태면 남은 코돈만 반환 (보통 0개)
  const retiredCodons = [...creature.codonPool];
  creature.codonPool.length = 0;
  creature.degradation!.isRetired = true;

  return { retiredCodons };
}

/**
 * 사망 처리: 코돈/시퀀스 풀을 비우고 사망 상태로 변경한다.
 * 전투 중 사망 시 모든 코돈이 손실된다.
 */
export function handleDeath(creature: Creature): void {
  ensureDegradation(creature);

  creature.codonPool.length = 0;
  creature.sequencePool.length = 0;
  creature.degradation!.isDead = true;
}
