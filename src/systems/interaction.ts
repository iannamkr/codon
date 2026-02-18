// ─── 시퀀스 내 인접 상호작용 시스템 ───
// 코돈 3개로 이루어진 시퀀스에서 인접 쌍(1↔2, 2↔3)의 상호작용을 분석한다.
// 같은 역할 → 공명, 같은 축 반대 → 대립, 다른 축 → 융합

import type { CodonRoleTag, Codon, Sequence } from "../data/types";
import { InteractionType } from "../data/types";

/** 같은 축의 반대쌍 정의 (A-T축: Destroy↔Survive, G-C축: Order↔Chaos) */
const OPPOSITION_PAIRS: ReadonlySet<string> = new Set([
  "Destroy:Survive",
  "Survive:Destroy",
  "Order:Chaos",
  "Chaos:Order",
]);

/**
 * 두 코돈 역할 태그의 상호작용 유형을 판정한다.
 *
 * - 같은 역할 → 공명 (Resonance)
 * - 같은 축 반대 (Destroy↔Survive, Order↔Chaos) → 대립 (Opposition)
 * - 다른 축 → 융합 (Fusion)
 */
export function getInteractionType(
  tag1: CodonRoleTag,
  tag2: CodonRoleTag,
): InteractionType {
  if (tag1 === tag2) {
    return InteractionType.Resonance;
  }

  if (OPPOSITION_PAIRS.has(`${tag1}:${tag2}`)) {
    return InteractionType.Opposition;
  }

  return InteractionType.Fusion;
}

/**
 * 시퀀스 내 인접 코돈 쌍의 상호작용을 분석한다.
 *
 * getTagFn: 코돈에서 역할 태그를 추출하는 함수 (아미노산 데이터 의존성을 외부에서 주입)
 *
 * 반환:
 *   pair1 = codons[0] ↔ codons[1] 상호작용
 *   pair2 = codons[1] ↔ codons[2] 상호작용
 */
export function analyzeSequence(
  seq: Sequence,
  getTagFn: (codon: Codon) => CodonRoleTag,
): { pair1: InteractionType; pair2: InteractionType } {
  const [c0, c1, c2] = seq.codons;

  const tag0 = getTagFn(c0);
  const tag1 = getTagFn(c1);
  const tag2 = getTagFn(c2);

  return {
    pair1: getInteractionType(tag0, tag1),
    pair2: getInteractionType(tag1, tag2),
  };
}
