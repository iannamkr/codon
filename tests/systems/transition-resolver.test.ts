import { describe, it, expect } from "vitest";
import { resolveTransition } from "../../src/systems/transition-resolver";
import { TransitionEffect } from "../../src/data/types";
import type { CodonRoleTag } from "../../src/data/types";

describe("전이 효과 판정: resolveTransition()", () => {
  it("3슬롯 모두 같은 전이 → 해당 전이 효과", () => {
    // Destroy vs Destroy = Rampage (3개)
    const myTags: CodonRoleTag[] = ["Destroy", "Destroy", "Destroy"];
    const enemyTags: CodonRoleTag[] = ["Destroy", "Destroy", "Destroy"];
    expect(resolveTransition(myTags, enemyTags)).toBe(TransitionEffect.Rampage);
  });

  it("2:1 다수결 → 다수 전이 효과", () => {
    // Slot 0: Destroy vs Survive = Neutralize
    // Slot 1: Destroy vs Survive = Neutralize
    // Slot 2: Order vs Chaos = Disruption
    const myTags: CodonRoleTag[] = ["Destroy", "Destroy", "Order"];
    const enemyTags: CodonRoleTag[] = ["Survive", "Survive", "Chaos"];
    expect(resolveTransition(myTags, enemyTags)).toBe(TransitionEffect.Neutralize);
  });

  it("3개 모두 다른 전이 → 첫 번째 것 사용 (임시 규칙)", () => {
    // Slot 0: Destroy vs Destroy = Rampage
    // Slot 1: Survive vs Survive = Stalemate
    // Slot 2: Order vs Chaos = Disruption
    const myTags: CodonRoleTag[] = ["Destroy", "Survive", "Order"];
    const enemyTags: CodonRoleTag[] = ["Destroy", "Survive", "Chaos"];
    expect(resolveTransition(myTags, enemyTags)).toBe(TransitionEffect.Rampage);
  });

  it("Survive+Order 조합 → RegenField", () => {
    const myTags: CodonRoleTag[] = ["Survive", "Survive", "Survive"];
    const enemyTags: CodonRoleTag[] = ["Order", "Order", "Order"];
    expect(resolveTransition(myTags, enemyTags)).toBe(TransitionEffect.RegenField);
  });

  it("Chaos+Chaos 조합 → ChaosField", () => {
    const myTags: CodonRoleTag[] = ["Chaos", "Chaos", "Chaos"];
    const enemyTags: CodonRoleTag[] = ["Chaos", "Chaos", "Chaos"];
    expect(resolveTransition(myTags, enemyTags)).toBe(TransitionEffect.ChaosField);
  });

  it("Order+Order → AccelField (2:1 다수결)", () => {
    const myTags: CodonRoleTag[] = ["Order", "Order", "Destroy"];
    const enemyTags: CodonRoleTag[] = ["Order", "Order", "Chaos"];
    // Slot 0: Order+Order = AccelField
    // Slot 1: Order+Order = AccelField
    // Slot 2: Destroy+Chaos = Critical
    expect(resolveTransition(myTags, enemyTags)).toBe(TransitionEffect.AccelField);
  });
});
