// ─── 전투 엔진 ───
// PhaseManager + BattleEngine 통합 모듈.
// 전투 흐름 구조를 구현한다. 데미지 공식은 플레이스홀더.

import type {
  BattleState,
  BattleResult,
  PhaseResult,
  SlotResult,
  MutationRecord,
  Build,
  DerivedStats,
  Codon,
  CodonRoleTag,
} from "../data/types";
import { AMINO_ACIDS } from "../data/codons";
import { getElementMultiplier } from "../data/elements";
import { determineOrder } from "./turn-order";
import { resolveTransition } from "./transition-resolver";
import { checkMutation } from "./mutation-checker";
import { calculateDamage } from "./damage-calculator";
import { createDefaultConfig } from "./plasmid-rules";
import type { BattleConfig } from "./plasmid-rules";

/** 코돈에서 역할 태그 추출 */
function getRoleTag(codon: Codon): CodonRoleTag {
  const amino = AMINO_ACIDS[codon.aminoAcidId];
  return amino?.roleTag ?? "Chaos";
}

/**
 * 전투 초기 상태 생성.
 * config 미지정 시 기본 설정 사용.
 */
export function createBattleState(
  myBuild: Build,
  enemyBuild: Build,
  myDerived: DerivedStats,
  enemyDerived: DerivedStats,
  config?: BattleConfig,
): BattleState {
  const c = config ?? createDefaultConfig();
  return {
    myBuild,
    enemyBuild,
    myDerived,
    enemyDerived,
    myHp: myDerived.hp,
    enemyHp: enemyDerived.hp,
    currentPhase: 0,
    maxPhases: c.maxPhases,
    activeTransition: null,
    mutations: [],
    phases: [],
    isComplete: false,
  };
}

/**
 * 단일 페이즈 실행. 불변 — 새 상태를 반환한다.
 *
 * 1. 양쪽 시퀀스 가져오기 (currentPhase 기반)
 * 2. 변이 체크 (MutationChecker)
 * 3. 슬롯 충돌 (선후공 → 데미지 계산 → HP 갱신)
 * 4. 전이 효과 계산 (TransitionResolver)
 * 5. HP<=0 체크 → 조기 종료
 * 6. currentPhase++, isComplete 판정
 */
export function runPhase(
  state: BattleState,
  rng: () => number = Math.random,
): BattleState {
  // 이미 종료된 전투는 상태 그대로 반환
  if (state.isComplete) return state;

  const phaseIdx = state.currentPhase;

  // 1. 양쪽 시퀀스 가져오기 (순환: 시퀀스가 maxPhases보다 적을 수 있음)
  const mySeq = state.myBuild.sequences[phaseIdx % state.myBuild.sequences.length];
  const enemySeq = state.enemyBuild.sequences[phaseIdx % state.enemyBuild.sequences.length];

  // 2. 변이 체크
  const mutationTriggered = checkMutation(state.myDerived.mutChance, rng);
  // 변이 내용 생성은 스텁 (항상 null) — 기획 미확정
  const mutationAccepted = false;
  const newMutations: MutationRecord[] = [...state.mutations];
  if (mutationTriggered) {
    newMutations.push({
      phaseIndex: phaseIdx,
      codonTriplet: mySeq.codons[0].triplet,
      accepted: mutationAccepted,
    });
  }

  // 3. 슬롯 충돌
  const slotCount = Math.min(mySeq.codons.length, enemySeq.codons.length);
  const slots: SlotResult[] = [];
  let myHp = state.myHp;
  let enemyHp = state.enemyHp;

  const myRoleTags: CodonRoleTag[] = [];
  const enemyRoleTags: CodonRoleTag[] = [];

  for (let i = 0; i < slotCount; i++) {
    const myCodon = mySeq.codons[i];
    const enemyCodon = enemySeq.codons[i];

    myRoleTags.push(getRoleTag(myCodon));
    enemyRoleTags.push(getRoleTag(enemyCodon));

    // 선후공 결정
    const first = determineOrder(state.myDerived.spd, state.enemyDerived.spd, rng);

    // 속성 배율
    const myElement = state.myBuild.plasmid.id === "null_attr"
      ? 1.0
      : getElementMultiplier(
          (state.myBuild as any).primaryElement ?? "Fire",
          (state.enemyBuild as any).primaryElement ?? "Fire",
        );
    // 플레이스홀더: 속성 배율은 실험체 속성 기반이지만 빌드에 속성이 없으므로 기본 1.0
    const elementMul = 1.0;

    // 내 공격
    const myAtk = calculateDamage({
      attackerAtk: state.myDerived.atk,
      defenderDefPct: state.enemyDerived.defPct,
      critPct: state.myDerived.critPct,
      critDmg: state.myDerived.critDmg,
      elementMultiplier: elementMul,
      damageMultiplier: 1.0,
      rng,
    });

    // 적 공격
    const enemyAtk = calculateDamage({
      attackerAtk: state.enemyDerived.atk,
      defenderDefPct: state.myDerived.defPct,
      critPct: state.enemyDerived.critPct,
      critDmg: state.enemyDerived.critDmg,
      elementMultiplier: elementMul,
      damageMultiplier: 1.0,
      rng,
    });

    // 선공 순서에 따라 HP 갱신
    if (first === "my") {
      enemyHp -= myAtk.damage;
      if (enemyHp > 0) {
        myHp -= enemyAtk.damage;
      }
    } else {
      myHp -= enemyAtk.damage;
      if (myHp > 0) {
        enemyHp -= myAtk.damage;
      }
    }

    slots.push({
      slotIndex: i,
      myCodon,
      enemyCodon,
      myDamageDealt: myAtk.damage,
      enemyDamageDealt: enemyAtk.damage,
      myCrit: myAtk.isCrit,
      enemyCrit: enemyAtk.isCrit,
      elementMultiplier: elementMul,
    });

    // 한쪽 HP <= 0이면 남은 슬롯 스킵
    if (myHp <= 0 || enemyHp <= 0) break;
  }

  // 4. 전이 효과 계산
  const transitionEffect = resolveTransition(myRoleTags, enemyRoleTags);

  // 5. 페이즈 결과
  const phaseResult: PhaseResult = {
    phaseIndex: phaseIdx,
    slots,
    transitionEffect,
    mutationTriggered,
    mutationAccepted,
    myHpAfter: myHp,
    enemyHpAfter: enemyHp,
  };

  // 6. 새 상태
  const nextPhase = phaseIdx + 1;
  const isComplete = myHp <= 0 || enemyHp <= 0 || nextPhase >= state.maxPhases;

  return {
    ...state,
    myHp,
    enemyHp,
    currentPhase: nextPhase,
    activeTransition: transitionEffect,
    mutations: newMutations,
    phases: [...state.phases, phaseResult],
    isComplete,
  };
}

/** 전체 전투 실행 후 BattleResult 반환 */
export function runFullBattle(
  state: BattleState,
  rng: () => number = Math.random,
): BattleResult {
  let current = state;
  while (!current.isComplete) {
    current = runPhase(current, rng);
  }
  return {
    winner: getWinner(current),
    myHpRemaining: current.myHp,
    enemyHpRemaining: current.enemyHp,
    totalPhases: current.phases.length,
    phases: current.phases,
    mutations: current.mutations,
  };
}

/** 전투 종료 판정: HP<=0 또는 maxPhases 도달 */
export function isBattleOver(state: BattleState): boolean {
  return state.myHp <= 0 || state.enemyHp <= 0 || state.currentPhase >= state.maxPhases;
}

/** 승자 판정: HP 비교 */
export function getWinner(state: BattleState): "my" | "enemy" | "draw" {
  if (state.myHp > state.enemyHp) return "my";
  if (state.enemyHp > state.myHp) return "enemy";
  return "draw";
}
