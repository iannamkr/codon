// ─── 전이 효과 판정 ───
// 3슬롯의 (내 코돈 roleTag, 적 코돈 roleTag) 쌍에서 전이 효과 3개를 산출하고
// 다수결로 최종 전이 효과를 결정한다.

import type { CodonRoleTag } from "../data/types";
import { TransitionEffect } from "../data/types";
import { getTransitionEffect } from "../data/elements";

/**
 * 3슬롯 각각의 역할 태그 쌍으로 전이 효과를 산출하고 다수결 적용.
 * 모두 다르면 첫 번째 것을 사용 (임시 규칙).
 */
export function resolveTransition(
  myRoleTags: CodonRoleTag[],
  enemyRoleTags: CodonRoleTag[],
): TransitionEffect {
  const slotCount = Math.min(myRoleTags.length, enemyRoleTags.length);
  const effects: TransitionEffect[] = [];

  for (let i = 0; i < slotCount; i++) {
    effects.push(getTransitionEffect(myRoleTags[i], enemyRoleTags[i]));
  }

  // 다수결: 가장 많이 등장한 전이 효과
  const counts = new Map<TransitionEffect, number>();
  for (const e of effects) {
    counts.set(e, (counts.get(e) ?? 0) + 1);
  }

  let maxCount = 0;
  let winner = effects[0];
  for (const [effect, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      winner = effect;
    }
  }

  return winner;
}
