import { describe, it, expect } from "vitest";
import { checkMutation, generateMutationProposal, applyMutation } from "../../src/systems/mutation-checker";
import type { Creature } from "../../src/data/types";
import { SAMPLE_CREATURE } from "../../src/data/sample";

describe("변이 발동 판정: checkMutation()", () => {
  it("MUT=0이면 항상 false", () => {
    // mutChance = 0 / (0 + 100) = 0
    expect(checkMutation(0, () => 0.0)).toBe(false);
    expect(checkMutation(0, () => 0.5)).toBe(false);
    expect(checkMutation(0, () => 0.99)).toBe(false);
  });

  it("MUT=100이면 50% 확률 (mutChance = 100/(100+100) = 0.5)", () => {
    const mutChance = 100 / (100 + 100); // 0.5
    expect(checkMutation(mutChance, () => 0.49)).toBe(true);
    expect(checkMutation(mutChance, () => 0.5)).toBe(false);
    expect(checkMutation(mutChance, () => 0.99)).toBe(false);
  });

  it("mutChance=1이면 항상 true", () => {
    expect(checkMutation(1, () => 0.0)).toBe(true);
    expect(checkMutation(1, () => 0.5)).toBe(true);
    expect(checkMutation(1, () => 0.99)).toBe(true);
  });

  it("mutChance=0.3이면 rng < 0.3일 때만 true", () => {
    expect(checkMutation(0.3, () => 0.29)).toBe(true);
    expect(checkMutation(0.3, () => 0.3)).toBe(false);
    expect(checkMutation(0.3, () => 0.5)).toBe(false);
  });
});

describe("변이 제안: generateMutationProposal()", () => {
  it("스텁: 항상 null을 반환한다 (기획 미확정)", () => {
    expect(generateMutationProposal()).toBeNull();
  });
});

describe("변이 적용: applyMutation()", () => {
  it("스텁: 실험체를 그대로 반환한다 (기획 미확정)", () => {
    const result = applyMutation(SAMPLE_CREATURE, {
      targetCodonIndex: 0,
      description: "테스트 변이",
    });
    expect(result).toBe(SAMPLE_CREATURE);
  });
});
