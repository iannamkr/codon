import { describe, it, expect } from "vitest";
import {
  trackExpedition,
  getDegradationLevel,
  isRetirementReady,
  DEFAULT_RETIREMENT_THRESHOLD,
} from "../../src/systems/degradation";
import { generateRandomCreature } from "../../src/systems/creature-factory";
import type { Creature, DegradationState } from "../../src/data/types";

// ─── 출격 추적 ───

describe("trackExpedition()", () => {
  it("출격 횟수가 1 증가한다", () => {
    const creature = generateRandomCreature();
    const state = trackExpedition(creature);
    expect(state.expeditionCount).toBe(1);
  });

  it("연속 출격 시 횟수가 누적된다", () => {
    const creature = generateRandomCreature();
    trackExpedition(creature);
    trackExpedition(creature);
    const state = trackExpedition(creature);
    expect(state.expeditionCount).toBe(3);
  });

  it("degradation이 없으면 초기화 후 추적한다", () => {
    const creature = generateRandomCreature();
    expect(creature.degradation).toBeUndefined();

    const state = trackExpedition(creature);
    expect(creature.degradation).toBeDefined();
    expect(state.expeditionCount).toBe(1);
    expect(state.degradationLevel).toBeGreaterThanOrEqual(0);
    expect(state.isRetired).toBe(false);
    expect(state.isDead).toBe(false);
  });

  it("기존 degradation이 있으면 그 위에 누적한다", () => {
    const creature = generateRandomCreature();
    creature.degradation = {
      expeditionCount: 5,
      degradationLevel: 2,
      isRetired: false,
      isDead: false,
    };

    const state = trackExpedition(creature);
    expect(state.expeditionCount).toBe(6);
  });

  it("은퇴/사망 상태인 실험체는 출격 추적하지 않는다", () => {
    const creature = generateRandomCreature();
    creature.degradation = {
      expeditionCount: 10,
      degradationLevel: 5,
      isRetired: true,
      isDead: false,
    };

    const state = trackExpedition(creature);
    // 은퇴 상태에서는 변하지 않음
    expect(state.expeditionCount).toBe(10);
  });
});

// ─── 열화 레벨 ───

describe("getDegradationLevel()", () => {
  it("degradation이 없으면 0을 반환한다", () => {
    const creature = generateRandomCreature();
    expect(getDegradationLevel(creature)).toBe(0);
  });

  it("출격 후 열화 레벨이 0 이상이다", () => {
    const creature = generateRandomCreature();
    trackExpedition(creature);
    expect(getDegradationLevel(creature)).toBeGreaterThanOrEqual(0);
  });

  it("출격 횟수가 많을수록 열화 레벨이 높거나 같다", () => {
    const creature = generateRandomCreature();
    for (let i = 0; i < 8; i++) {
      trackExpedition(creature);
    }
    const level8 = getDegradationLevel(creature);

    for (let i = 0; i < 2; i++) {
      trackExpedition(creature);
    }
    const level10 = getDegradationLevel(creature);

    expect(level10).toBeGreaterThanOrEqual(level8);
  });
});

// ─── 은퇴 판정 ───

describe("isRetirementReady()", () => {
  it("출격 횟수가 임계치 미만이면 false", () => {
    const creature = generateRandomCreature();
    for (let i = 0; i < DEFAULT_RETIREMENT_THRESHOLD - 1; i++) {
      trackExpedition(creature);
    }
    expect(isRetirementReady(creature)).toBe(false);
  });

  it("출격 횟수가 임계치 이상이면 true", () => {
    const creature = generateRandomCreature();
    for (let i = 0; i < DEFAULT_RETIREMENT_THRESHOLD; i++) {
      trackExpedition(creature);
    }
    expect(isRetirementReady(creature)).toBe(true);
  });

  it("degradation이 없으면 false", () => {
    const creature = generateRandomCreature();
    expect(isRetirementReady(creature)).toBe(false);
  });

  it("이미 은퇴한 상태면 true", () => {
    const creature = generateRandomCreature();
    creature.degradation = {
      expeditionCount: 5,
      degradationLevel: 3,
      isRetired: true,
      isDead: false,
    };
    expect(isRetirementReady(creature)).toBe(true);
  });
});

// ─── 상수 ───

describe("기본 상수", () => {
  it("DEFAULT_RETIREMENT_THRESHOLD = 10", () => {
    expect(DEFAULT_RETIREMENT_THRESHOLD).toBe(10);
  });
});
