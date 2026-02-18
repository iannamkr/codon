import { describe, it, expect } from "vitest";
import { getInteractionType, getSynergyHints } from "../../src/systems/interaction";
import { InteractionType } from "../../src/data/types";
import type { CodonRoleTag } from "../../src/data/types";

// ─── getInteractionType (기존 함수 검증) ───

describe("getInteractionType()", () => {
  it("같은 역할 → Resonance", () => {
    expect(getInteractionType("Destroy", "Destroy")).toBe(InteractionType.Resonance);
    expect(getInteractionType("Survive", "Survive")).toBe(InteractionType.Resonance);
    expect(getInteractionType("Order", "Order")).toBe(InteractionType.Resonance);
    expect(getInteractionType("Chaos", "Chaos")).toBe(InteractionType.Resonance);
  });

  it("같은 축 반대 → Opposition", () => {
    expect(getInteractionType("Destroy", "Survive")).toBe(InteractionType.Opposition);
    expect(getInteractionType("Survive", "Destroy")).toBe(InteractionType.Opposition);
    expect(getInteractionType("Order", "Chaos")).toBe(InteractionType.Opposition);
    expect(getInteractionType("Chaos", "Order")).toBe(InteractionType.Opposition);
  });

  it("다른 축 → Fusion", () => {
    expect(getInteractionType("Destroy", "Order")).toBe(InteractionType.Fusion);
    expect(getInteractionType("Destroy", "Chaos")).toBe(InteractionType.Fusion);
    expect(getInteractionType("Survive", "Order")).toBe(InteractionType.Fusion);
    expect(getInteractionType("Survive", "Chaos")).toBe(InteractionType.Fusion);
  });
});

// ─── getSynergyHints ───

describe("getSynergyHints()", () => {
  it("인접 태그가 없으면 빈 배열 반환", () => {
    const hints = getSynergyHints("Destroy", []);
    expect(hints).toEqual([]);
  });

  it("인접 태그 1개 — 같은 역할이면 Resonance", () => {
    const hints = getSynergyHints("Destroy", ["Destroy"]);
    expect(hints).toHaveLength(1);
    expect(hints[0].interactionType).toBe(InteractionType.Resonance);
    expect(hints[0].withTags).toEqual(["Destroy"]);
  });

  it("인접 태그 1개 — 같은 축 반대면 Opposition", () => {
    const hints = getSynergyHints("Destroy", ["Survive"]);
    expect(hints).toHaveLength(1);
    expect(hints[0].interactionType).toBe(InteractionType.Opposition);
    expect(hints[0].withTags).toEqual(["Survive"]);
  });

  it("인접 태그 1개 — 다른 축이면 Fusion", () => {
    const hints = getSynergyHints("Destroy", ["Order"]);
    expect(hints).toHaveLength(1);
    expect(hints[0].interactionType).toBe(InteractionType.Fusion);
    expect(hints[0].withTags).toEqual(["Order"]);
  });

  it("인접 태그 2개 — 양쪽 모두와 상호작용 반환", () => {
    const hints = getSynergyHints("Destroy", ["Destroy", "Order"]);
    expect(hints).toHaveLength(2);
    expect(hints[0].interactionType).toBe(InteractionType.Resonance);
    expect(hints[0].withTags).toEqual(["Destroy"]);
    expect(hints[1].interactionType).toBe(InteractionType.Fusion);
    expect(hints[1].withTags).toEqual(["Order"]);
  });

  it("인접 태그 2개 — 양쪽 모두 같은 타입이면 동일 타입 2개", () => {
    const hints = getSynergyHints("Order", ["Order", "Order"]);
    expect(hints).toHaveLength(2);
    expect(hints[0].interactionType).toBe(InteractionType.Resonance);
    expect(hints[1].interactionType).toBe(InteractionType.Resonance);
  });

  it("인접 태그 2개 — 대립 + 융합 혼합", () => {
    const hints = getSynergyHints("Order", ["Chaos", "Destroy"]);
    expect(hints).toHaveLength(2);
    expect(hints[0].interactionType).toBe(InteractionType.Opposition);
    expect(hints[1].interactionType).toBe(InteractionType.Fusion);
  });
});
