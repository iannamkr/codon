import { describe, it, expect } from "vitest";
import { retireCreature, handleDeath } from "../../src/systems/lifecycle";
import { generateRandomCreature } from "../../src/systems/creature-factory";
import { trackExpedition } from "../../src/systems/degradation";

// ─── 은퇴 ───

describe("retireCreature()", () => {
  it("은퇴 시 isRetired가 true가 된다", () => {
    const creature = generateRandomCreature();
    trackExpedition(creature); // degradation 초기화
    retireCreature(creature);
    expect(creature.degradation!.isRetired).toBe(true);
  });

  it("은퇴 시 코돈 풀 전부를 반환한다", () => {
    const creature = generateRandomCreature();
    trackExpedition(creature);
    const originalPoolSize = creature.codonPool.length;
    expect(originalPoolSize).toBe(15);

    const { retiredCodons } = retireCreature(creature);
    expect(retiredCodons).toHaveLength(originalPoolSize);
  });

  it("은퇴 후 코돈 풀이 비어 있다", () => {
    const creature = generateRandomCreature();
    trackExpedition(creature);
    retireCreature(creature);
    expect(creature.codonPool).toHaveLength(0);
  });

  it("은퇴한 코돈의 triplet이 원래 풀의 것과 동일하다", () => {
    const creature = generateRandomCreature();
    trackExpedition(creature);
    const originalTriplets = creature.codonPool.map((c) => c.triplet);

    const { retiredCodons } = retireCreature(creature);
    const retiredTriplets = retiredCodons.map((c) => c.triplet);

    expect(retiredTriplets).toEqual(originalTriplets);
  });

  it("이미 은퇴한 실험체를 다시 은퇴시키면 빈 코돈을 반환한다", () => {
    const creature = generateRandomCreature();
    trackExpedition(creature);
    retireCreature(creature);

    const { retiredCodons } = retireCreature(creature);
    expect(retiredCodons).toHaveLength(0);
  });

  it("degradation이 없으면 초기화 후 은퇴 처리한다", () => {
    const creature = generateRandomCreature();
    expect(creature.degradation).toBeUndefined();

    retireCreature(creature);
    expect(creature.degradation).toBeDefined();
    expect(creature.degradation!.isRetired).toBe(true);
  });

  it("사망한 실험체는 은퇴할 수 없다", () => {
    const creature = generateRandomCreature();
    creature.degradation = {
      expeditionCount: 5,
      degradationLevel: 2,
      isRetired: false,
      isDead: true,
    };

    const { retiredCodons } = retireCreature(creature);
    expect(retiredCodons).toHaveLength(0);
    expect(creature.degradation.isRetired).toBe(false);
  });
});

// ─── 사망 ───

describe("handleDeath()", () => {
  it("사망 시 isDead가 true가 된다", () => {
    const creature = generateRandomCreature();
    trackExpedition(creature);
    handleDeath(creature);
    expect(creature.degradation!.isDead).toBe(true);
  });

  it("사망 시 코돈 풀이 비워진다 (전부 손실)", () => {
    const creature = generateRandomCreature();
    trackExpedition(creature);
    expect(creature.codonPool.length).toBeGreaterThan(0);

    handleDeath(creature);
    expect(creature.codonPool).toHaveLength(0);
  });

  it("사망 시 시퀀스 풀도 비워진다", () => {
    const creature = generateRandomCreature();
    trackExpedition(creature);
    handleDeath(creature);
    expect(creature.sequencePool).toHaveLength(0);
  });

  it("이미 사망한 실험체를 다시 사망 처리해도 에러가 나지 않는다", () => {
    const creature = generateRandomCreature();
    trackExpedition(creature);
    handleDeath(creature);
    expect(() => handleDeath(creature)).not.toThrow();
    expect(creature.degradation!.isDead).toBe(true);
  });

  it("degradation이 없으면 초기화 후 사망 처리한다", () => {
    const creature = generateRandomCreature();
    expect(creature.degradation).toBeUndefined();

    handleDeath(creature);
    expect(creature.degradation).toBeDefined();
    expect(creature.degradation!.isDead).toBe(true);
  });

  it("은퇴한 실험체도 사망 처리 가능하다", () => {
    const creature = generateRandomCreature();
    creature.degradation = {
      expeditionCount: 10,
      degradationLevel: 5,
      isRetired: true,
      isDead: false,
    };

    handleDeath(creature);
    expect(creature.degradation.isDead).toBe(true);
  });
});
