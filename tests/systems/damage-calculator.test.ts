import { describe, it, expect } from "vitest";
import { calculateDamage } from "../../src/systems/damage-calculator";
import type { DamageParams } from "../../src/systems/damage-calculator";

describe("데미지 계산: calculateDamage()", () => {
  it("기본 데미지 = ATK * (1 - DEF%) * elementMul * damageMul", () => {
    const params: DamageParams = {
      attackerAtk: 40,
      defenderDefPct: 0.2,
      critPct: 0, // 크리 없음
      critDmg: 1.5,
      elementMultiplier: 1.0,
      damageMultiplier: 1.0,
      rng: () => 0.99, // 크리 불발
    };
    const result = calculateDamage(params);
    // 40 * (1 - 0.2) * 1.0 * 1.0 = 32
    expect(result.damage).toBeCloseTo(32, 5);
    expect(result.isCrit).toBe(false);
  });

  it("크리티컬 적용: rng < critPct 일 때 damage * critDmg", () => {
    const params: DamageParams = {
      attackerAtk: 40,
      defenderDefPct: 0,
      critPct: 0.5,
      critDmg: 1.75,
      elementMultiplier: 1.0,
      damageMultiplier: 1.0,
      rng: () => 0.3, // 크리 발동 (0.3 < 0.5)
    };
    const result = calculateDamage(params);
    // 40 * 1.0 * 1.0 * 1.0 * 1.75 = 70
    expect(result.damage).toBeCloseTo(70, 5);
    expect(result.isCrit).toBe(true);
  });

  it("크리티컬 미발동: rng >= critPct", () => {
    const params: DamageParams = {
      attackerAtk: 40,
      defenderDefPct: 0,
      critPct: 0.5,
      critDmg: 1.75,
      elementMultiplier: 1.0,
      damageMultiplier: 1.0,
      rng: () => 0.5, // 크리 불발 (0.5 >= 0.5)
    };
    const result = calculateDamage(params);
    expect(result.damage).toBeCloseTo(40, 5);
    expect(result.isCrit).toBe(false);
  });

  it("속성 배율 적용 (유리 1.2)", () => {
    const params: DamageParams = {
      attackerAtk: 40,
      defenderDefPct: 0,
      critPct: 0,
      critDmg: 1.5,
      elementMultiplier: 1.2,
      damageMultiplier: 1.0,
      rng: () => 0.99,
    };
    const result = calculateDamage(params);
    // 40 * 1.0 * 1.2 * 1.0 = 48
    expect(result.damage).toBeCloseTo(48, 5);
  });

  it("플라스미드 배율 적용 (선독 x4)", () => {
    const params: DamageParams = {
      attackerAtk: 40,
      defenderDefPct: 0,
      critPct: 0,
      critDmg: 1.5,
      elementMultiplier: 1.0,
      damageMultiplier: 4.0,
      rng: () => 0.99,
    };
    const result = calculateDamage(params);
    // 40 * 1.0 * 1.0 * 4.0 = 160
    expect(result.damage).toBeCloseTo(160, 5);
  });

  it("DEF 100%면 데미지 0", () => {
    const params: DamageParams = {
      attackerAtk: 40,
      defenderDefPct: 1.0,
      critPct: 0,
      critDmg: 1.5,
      elementMultiplier: 1.0,
      damageMultiplier: 1.0,
      rng: () => 0.99,
    };
    const result = calculateDamage(params);
    expect(result.damage).toBe(0);
  });

  it("모든 배율 복합 적용", () => {
    const params: DamageParams = {
      attackerAtk: 50,
      defenderDefPct: 0.25,
      critPct: 1.0, // 항상 크리
      critDmg: 2.0,
      elementMultiplier: 1.2,
      damageMultiplier: 1.3,
      rng: () => 0.0,
    };
    const result = calculateDamage(params);
    // 50 * (1 - 0.25) * 1.2 * 1.3 * 2.0 = 50 * 0.75 * 1.2 * 1.3 * 2.0 = 117
    expect(result.damage).toBeCloseTo(117, 5);
    expect(result.isCrit).toBe(true);
  });
});
