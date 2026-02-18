import { describe, it, expect, beforeEach } from "vitest";
import {
  createBattleState,
  runPhase,
  runFullBattle,
  isBattleOver,
  getWinner,
} from "../../src/systems/battle-engine";
import { SAMPLE_CREATURE, SAMPLE_ENEMY, createSampleBuild } from "../../src/data/sample";
import { deriveStats } from "../../src/systems/stats";
import type { BattleState, Build, DerivedStats } from "../../src/data/types";
import { createDefaultConfig } from "../../src/systems/plasmid-rules";
import type { BattleConfig } from "../../src/systems/plasmid-rules";

// ─── 헬퍼 ───

function setupBattle(configOverride?: Partial<BattleConfig>): BattleState {
  const myBuild = createSampleBuild(SAMPLE_CREATURE);
  const enemyBuild = createSampleBuild(SAMPLE_ENEMY);
  const myDerived = deriveStats(SAMPLE_CREATURE.stats, SAMPLE_CREATURE.constitution);
  const enemyDerived = deriveStats(SAMPLE_ENEMY.stats, SAMPLE_ENEMY.constitution);
  const config = configOverride
    ? { ...createDefaultConfig(), ...configOverride }
    : undefined;
  return createBattleState(myBuild, enemyBuild, myDerived, enemyDerived, config);
}

// ─── 테스트 ───

describe("BattleEngine: createBattleState()", () => {
  it("초기 상태가 올바르다", () => {
    const state = setupBattle();

    expect(state.currentPhase).toBe(0);
    expect(state.maxPhases).toBe(4);
    expect(state.isComplete).toBe(false);
    expect(state.phases).toHaveLength(0);
    expect(state.mutations).toHaveLength(0);
    expect(state.activeTransition).toBeNull();
    expect(state.myHp).toBeGreaterThan(0);
    expect(state.enemyHp).toBeGreaterThan(0);
  });

  it("HP가 파생 스탯에서 올바르게 설정된다", () => {
    const myDerived = deriveStats(SAMPLE_CREATURE.stats, SAMPLE_CREATURE.constitution);
    const state = setupBattle();
    expect(state.myHp).toBe(myDerived.hp);
  });
});

describe("BattleEngine: runPhase()", () => {
  it("단일 페이즈 실행 후 상태가 변한다", () => {
    const state = setupBattle();
    const next = runPhase(state, () => 0.99); // rng: 크리 불발, 변이 불발

    expect(next.currentPhase).toBe(1);
    expect(next.phases).toHaveLength(1);
    expect(next.isComplete).toBe(false);
    // 데미지가 발생했으므로 HP가 변할 수 있다
    expect(next.phases[0].slots.length).toBeGreaterThan(0);
  });

  it("불변성: 원본 상태가 변경되지 않는다", () => {
    const state = setupBattle();
    const originalPhase = state.currentPhase;
    const originalPhasesLen = state.phases.length;

    runPhase(state, () => 0.99);

    expect(state.currentPhase).toBe(originalPhase);
    expect(state.phases.length).toBe(originalPhasesLen);
  });

  it("페이즈 결과에 전이 효과가 포함된다", () => {
    const state = setupBattle();
    const next = runPhase(state, () => 0.99);

    expect(next.phases[0].transitionEffect).toBeDefined();
    expect(next.activeTransition).not.toBeNull();
  });

  it("변이 rng < mutChance 이면 mutationTriggered = true", () => {
    const state = setupBattle();
    // rng = 0.01 → 변이 발동 (mutChance > 0.01 이면)
    const next = runPhase(state, () => 0.01);
    // SAMPLE_CREATURE의 MUT=30 → mutChance = 30/130 ≈ 0.23 > 0.01
    expect(next.phases[0].mutationTriggered).toBe(true);
  });
});

describe("BattleEngine: HP 0 조기 종료", () => {
  it("myHp가 0 이하면 전투 종료", () => {
    const state = setupBattle();
    // HP를 인위적으로 1로 설정
    const lowHpState: BattleState = { ...state, myHp: 1 };
    // 여러 페이즈 돌려서 HP 0 이하 도달
    let current = lowHpState;
    for (let i = 0; i < 10 && !current.isComplete; i++) {
      current = runPhase(current, () => 0.99);
    }
    // HP가 0 이하이거나 maxPhases에 도달하면 isComplete
    expect(current.isComplete).toBe(true);
  });

  it("enemyHp가 0 이하면 전투 종료", () => {
    const state = setupBattle();
    const lowHpState: BattleState = { ...state, enemyHp: 1 };
    let current = lowHpState;
    for (let i = 0; i < 10 && !current.isComplete; i++) {
      current = runPhase(current, () => 0.99);
    }
    expect(current.isComplete).toBe(true);
  });
});

describe("BattleEngine: 4페이즈 정상 종료", () => {
  it("4페이즈 완료 후 isComplete = true", () => {
    let state = setupBattle();
    // 충분한 HP로 4페이즈 완주
    state = { ...state, myHp: 99999, enemyHp: 99999 };

    for (let i = 0; i < 4; i++) {
      state = runPhase(state, () => 0.99);
    }

    expect(state.currentPhase).toBe(4);
    expect(state.isComplete).toBe(true);
    expect(state.phases).toHaveLength(4);
  });

  it("isComplete=true 후에는 runPhase가 상태를 변경하지 않는다", () => {
    let state = setupBattle();
    state = { ...state, myHp: 99999, enemyHp: 99999 };

    for (let i = 0; i < 4; i++) {
      state = runPhase(state, () => 0.99);
    }
    expect(state.isComplete).toBe(true);

    const afterExtra = runPhase(state, () => 0.99);
    expect(afterExtra.currentPhase).toBe(state.currentPhase);
    expect(afterExtra.phases.length).toBe(state.phases.length);
  });
});

describe("BattleEngine: runFullBattle()", () => {
  it("전체 전투를 실행하고 BattleResult를 반환한다", () => {
    const state = setupBattle();
    const result = runFullBattle(state, () => 0.99);

    expect(result.winner).toMatch(/^(my|enemy|draw)$/);
    expect(result.totalPhases).toBeGreaterThanOrEqual(1);
    expect(result.totalPhases).toBeLessThanOrEqual(4);
    expect(result.phases.length).toBe(result.totalPhases);
    expect(result.myHpRemaining).toBeDefined();
    expect(result.enemyHpRemaining).toBeDefined();
  });
});

describe("BattleEngine: isBattleOver()", () => {
  it("HP > 0 + currentPhase < maxPhases → false", () => {
    const state = setupBattle();
    expect(isBattleOver(state)).toBe(false);
  });

  it("myHp <= 0 → true", () => {
    const state = setupBattle();
    expect(isBattleOver({ ...state, myHp: 0 })).toBe(true);
    expect(isBattleOver({ ...state, myHp: -5 })).toBe(true);
  });

  it("enemyHp <= 0 → true", () => {
    const state = setupBattle();
    expect(isBattleOver({ ...state, enemyHp: 0 })).toBe(true);
  });

  it("currentPhase >= maxPhases → true", () => {
    const state = setupBattle();
    expect(isBattleOver({ ...state, currentPhase: 4 })).toBe(true);
  });
});

describe("BattleEngine: getWinner()", () => {
  it("myHp > enemyHp → my 승리", () => {
    const state = setupBattle();
    expect(getWinner({ ...state, myHp: 100, enemyHp: 50 })).toBe("my");
  });

  it("enemyHp > myHp → enemy 승리", () => {
    const state = setupBattle();
    expect(getWinner({ ...state, myHp: 50, enemyHp: 100 })).toBe("enemy");
  });

  it("HP 동점 → draw", () => {
    const state = setupBattle();
    expect(getWinner({ ...state, myHp: 100, enemyHp: 100 })).toBe("draw");
  });

  it("양쪽 HP 0 → draw", () => {
    const state = setupBattle();
    expect(getWinner({ ...state, myHp: 0, enemyHp: 0 })).toBe("draw");
  });
});

describe("BattleEngine: 플라스미드 규칙 적용", () => {
  it("과부하(overcharge): 5페이즈 전투", () => {
    const state = setupBattle({ maxPhases: 5, codonsPerSequence: 2 });
    expect(state.maxPhases).toBe(5);

    // 충분한 HP로 5페이즈 완주
    let current: BattleState = { ...state, myHp: 99999, enemyHp: 99999 };
    for (let i = 0; i < 5; i++) {
      current = runPhase(current, () => 0.99);
    }
    expect(current.currentPhase).toBe(5);
    expect(current.isComplete).toBe(true);
    expect(current.phases).toHaveLength(5);
  });

  it("압축(compress): 2페이즈 전투", () => {
    const state = setupBattle({ maxPhases: 2, codonsPerSequence: 6 });
    expect(state.maxPhases).toBe(2);

    let current: BattleState = { ...state, myHp: 99999, enemyHp: 99999 };
    for (let i = 0; i < 2; i++) {
      current = runPhase(current, () => 0.99);
    }
    expect(current.currentPhase).toBe(2);
    expect(current.isComplete).toBe(true);
    expect(current.phases).toHaveLength(2);
  });
});
