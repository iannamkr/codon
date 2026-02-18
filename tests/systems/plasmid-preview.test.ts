import { describe, it, expect } from "vitest";
import { previewPlasmidEffect } from "../../src/systems/plasmid-preview";
import { getPlasmidById } from "../../src/data/plasmids";
import { Constitution } from "../../src/data/types";
import type { Stats } from "../../src/data/types";

const baseStats: Stats = { str: 30, dex: 25, res: 20, mut: 28 };

describe("previewPlasmidEffect()", () => {
  it("순수 서열(pure): hasStatChange=true, 모든 파생 스탯 +20%", () => {
    const plasmid = getPlasmidById("pure")!;
    const result = previewPlasmidEffect(plasmid, baseStats, Constitution.Balance);

    expect(result.hasStatChange).toBe(true);
    expect(result.statDeltas.length).toBeGreaterThan(0);

    // HP should increase by 20%
    const hpDelta = result.statDeltas.find(d => d.key === "hp");
    expect(hpDelta).toBeDefined();
    expect(hpDelta!.delta).toBeGreaterThan(0);
    expect(hpDelta!.after).toBeCloseTo(hpDelta!.before * 1.2, 1);
  });

  it("역행(reverse): hasStatChange=false, configChanges 2개", () => {
    const plasmid = getPlasmidById("reverse")!;
    const result = previewPlasmidEffect(plasmid, baseStats, Constitution.Balance);

    expect(result.hasStatChange).toBe(false);
    expect(result.statDeltas.length).toBe(0);
    expect(result.configChanges.length).toBe(2);

    const keys = result.configChanges.map(c => c.key);
    expect(keys).toContain("reverseSlotOrder");
    expect(keys).toContain("useSpdForTurnOrder");
  });

  it("과부하(overcharge): maxPhases 4→5, codonsPerSequence 3→2", () => {
    const plasmid = getPlasmidById("overcharge")!;
    const result = previewPlasmidEffect(plasmid, baseStats, Constitution.Balance);

    expect(result.hasStatChange).toBe(false);

    const maxPhases = result.configChanges.find(c => c.key === "maxPhases");
    expect(maxPhases).toBeDefined();
    expect(maxPhases!.before).toBe("4");
    expect(maxPhases!.after).toBe("5");

    const codonsPerSeq = result.configChanges.find(c => c.key === "codonsPerSequence");
    expect(codonsPerSeq).toBeDefined();
    expect(codonsPerSeq!.before).toBe("3");
    expect(codonsPerSeq!.after).toBe("2");
  });

  it("체질 보정이 before/after 양쪽에 반영된다", () => {
    const plasmid = getPlasmidById("pure")!;
    const result = previewPlasmidEffect(plasmid, baseStats, Constitution.Aggro);

    // Aggro: atk *1.2, so before already has Aggro modifier
    const atkDelta = result.statDeltas.find(d => d.key === "atk");
    expect(atkDelta).toBeDefined();
    // After should be before * 1.2 (statMultiplier)
    expect(atkDelta!.after).toBeCloseTo(atkDelta!.before * 1.2, 1);
  });

  it("configChanges의 before/after가 문자열이다", () => {
    const plasmid = getPlasmidById("unstable")!;
    const result = previewPlasmidEffect(plasmid, baseStats, Constitution.Balance);

    for (const change of result.configChanges) {
      expect(typeof change.before).toBe("string");
      expect(typeof change.after).toBe("string");
    }
  });

  it("configChanges에 한글 label이 포함된다", () => {
    const plasmid = getPlasmidById("overcharge")!;
    const result = previewPlasmidEffect(plasmid, baseStats, Constitution.Balance);

    for (const change of result.configChanges) {
      expect(change.label.length).toBeGreaterThan(0);
    }
  });
});
