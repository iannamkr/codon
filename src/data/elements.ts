// ─── 속성 상성 + 전이 효과 데이터 ───

import { Element, TransitionEffect, CodonRoleTag } from "./types";

// ─── 속성 상성 테이블 ───

/** 속성 상성: 공격자 → 방어자 → 배율. Fire>Plant>Earth>Water>Fire */
const ELEMENT_ADVANTAGE: Record<Element, Record<Element, number>> = {
  [Element.Fire]: {
    [Element.Fire]: 1.0,
    [Element.Water]: 0.8,
    [Element.Earth]: 1.0,
    [Element.Plant]: 1.2,
  },
  [Element.Water]: {
    [Element.Fire]: 1.2,
    [Element.Water]: 1.0,
    [Element.Earth]: 0.8,
    [Element.Plant]: 1.0,
  },
  [Element.Earth]: {
    [Element.Fire]: 1.0,
    [Element.Water]: 1.2,
    [Element.Earth]: 1.0,
    [Element.Plant]: 0.8,
  },
  [Element.Plant]: {
    [Element.Fire]: 0.8,
    [Element.Plant]: 1.0,
    [Element.Earth]: 1.2,
    [Element.Water]: 1.0,
  },
};

/** 속성 상성 배율 반환 (1.2=유리, 0.8=불리, 1.0=중립) */
export function getElementMultiplier(
  attacker: Element,
  defender: Element
): number {
  return ELEMENT_ADVANTAGE[attacker][defender];
}

// ─── 전이 효과 테이블 ───

/** 역할 태그 쌍 → 키 생성 (순서 무관) */
function transitionKey(a: CodonRoleTag, b: CodonRoleTag): string {
  return a <= b ? `${a}+${b}` : `${b}+${a}`;
}

/** 코돈 역할 태그 조합 → 전이 효과 (10종, 순서 무관) */
const TRANSITION_TABLE: Record<string, TransitionEffect> = {
  [transitionKey("Destroy", "Destroy")]: TransitionEffect.Rampage,       // 폭주: 양쪽 데미지 증가
  [transitionKey("Destroy", "Survive")]: TransitionEffect.Neutralize,    // 상쇄: 효과 약화
  [transitionKey("Destroy", "Order")]: TransitionEffect.Focus,           // 집중: 크리 확률 증가
  [transitionKey("Destroy", "Chaos")]: TransitionEffect.Critical,        // 임계: 변이 확률 증가
  [transitionKey("Survive", "Survive")]: TransitionEffect.Stalemate,     // 교착: 양쪽 방어 증가
  [transitionKey("Survive", "Order")]: TransitionEffect.RegenField,      // 재생장: HP 회복 효과
  [transitionKey("Survive", "Chaos")]: TransitionEffect.ErosionField,    // 침식장: 방어 점진 감소
  [transitionKey("Order", "Order")]: TransitionEffect.AccelField,        // 가속장: SPD 보너스
  [transitionKey("Order", "Chaos")]: TransitionEffect.Disruption,        // 교란장: 버프/디버프 뒤섞임
  [transitionKey("Chaos", "Chaos")]: TransitionEffect.ChaosField,        // 혼돈장: 양쪽 랜덤 변이
};

/** 역할 태그 조합에 대한 전이 효과 반환 (순서 무관) */
export function getTransitionEffect(
  tag1: CodonRoleTag,
  tag2: CodonRoleTag
): TransitionEffect {
  return TRANSITION_TABLE[transitionKey(tag1, tag2)];
}

export { ELEMENT_ADVANTAGE, TRANSITION_TABLE };
