import { describe, it, expect } from "vitest";
import {
  getRoleDistribution,
  getInteractionDistribution,
  getRarityDistribution,
} from "../../src/systems/build-analyzer";
import { SAMPLE_CREATURE, SAMPLE_ENEMY } from "../../src/data/sample";
import { createBuild } from "../../src/systems/build-manager";
import { InteractionType } from "../../src/data/types";

// ─── getRoleDistribution ───

describe("getRoleDistribution()", () => {
  it("공격형 빌드는 Destroy 비율이 높다", () => {
    // SAMPLE_CREATURE 시퀀스: seq_atk(Destroy×3) + seq_def(Survive×3) + seq_spd(Order×3) + seq_chaos(Chaos+Chaos+Destroy)
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    const sequences = SAMPLE_CREATURE.sequencePool.slice(0, 4);
    const build = createBuild(plasmid, sequences);
    const dist = getRoleDistribution(build);

    // seq_atk: Met(Destroy) + Phe(Destroy) + His(Destroy) = 3 Destroy
    // seq_def: Gln(Survive) + Val(Survive) + Ala(Survive) = 3 Survive
    // seq_spd: Tyr(Order) + Asn(Order) + Pro(Order) = 3 Order
    // seq_chaos: Trp(Chaos) + Asp(Chaos) + Ile(Destroy) = 2 Chaos + 1 Destroy
    expect(dist.Destroy).toBe(4);
    expect(dist.Survive).toBe(3);
    expect(dist.Order).toBe(3);
    expect(dist.Chaos).toBe(2);
  });

  it("방어형 빌드는 Survive 비율이 높다", () => {
    // SAMPLE_ENEMY 시퀀스: seq_e_tank(Survive×3) + seq_e_order(Order×3) + seq_e_counter(Chaos+Survive+Survive) + seq_e_burst(Destroy×3)
    const plasmid = SAMPLE_ENEMY.plasmidPool[0];
    const sequences = SAMPLE_ENEMY.sequencePool.slice(0, 4);
    const build = createBuild(plasmid, sequences);
    const dist = getRoleDistribution(build);

    // seq_e_tank: Gln(Survive) + Ala(Survive) + Gly(Survive) = 3 Survive
    // seq_e_order: Lys(Order) + Glu(Order) + Arg(Order) = 3 Order
    // seq_e_counter: Asp(Chaos) + Cys(Survive) + Ser(Survive) = 1 Chaos + 2 Survive
    // seq_e_burst: Met(Destroy) + His(Destroy) + Ile(Destroy) = 3 Destroy
    expect(dist.Survive).toBe(5);
    expect(dist.Order).toBe(3);
    expect(dist.Destroy).toBe(3);
    expect(dist.Chaos).toBe(1);
  });
});

// ─── getInteractionDistribution ───

describe("getInteractionDistribution()", () => {
  it("상호작용 분포를 정확하게 집계한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    const sequences = SAMPLE_CREATURE.sequencePool.slice(0, 4);
    const build = createBuild(plasmid, sequences);
    const dist = getInteractionDistribution(build);

    // seq_atk: Destroy-Destroy-Destroy → pair1=Resonance, pair2=Resonance (2 Resonance)
    // seq_def: Survive-Survive-Survive → pair1=Resonance, pair2=Resonance (2 Resonance)
    // seq_spd: Order-Order-Order → pair1=Resonance, pair2=Resonance (2 Resonance)
    // seq_chaos: Chaos-Chaos-Destroy → pair1=Resonance, pair2=Fusion (1 Resonance, 1 Fusion)
    expect(dist[InteractionType.Resonance]).toBe(7);
    expect(dist[InteractionType.Fusion]).toBe(1);
    expect(dist[InteractionType.Opposition]).toBe(0);
  });

  it("대립이 포함된 빌드를 올바르게 집계한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    // seq_mix1: Thr(Destroy) + Cys(Survive) + Ile(Destroy) → pair1=Opposition, pair2=Opposition
    // seq_mix2: Glu(Order) + Asp(Chaos) + Pro(Order) → pair1=Opposition, pair2=Opposition
    const sequences = [
      SAMPLE_CREATURE.sequencePool[4], // seq_mix1
      SAMPLE_CREATURE.sequencePool[5], // seq_mix2
      SAMPLE_CREATURE.sequencePool[0], // seq_atk (all Resonance)
      SAMPLE_CREATURE.sequencePool[1], // seq_def (all Resonance)
    ];
    const build = createBuild(plasmid, sequences);
    const dist = getInteractionDistribution(build);

    expect(dist[InteractionType.Opposition]).toBe(4);
    expect(dist[InteractionType.Resonance]).toBe(4);
    expect(dist[InteractionType.Fusion]).toBe(0);
  });
});

// ─── getRarityDistribution ───

describe("getRarityDistribution()", () => {
  it("희귀도 분포를 pathCount별로 정확하게 집계한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    const sequences = SAMPLE_CREATURE.sequencePool.slice(0, 4);
    const build = createBuild(plasmid, sequences);
    const dist = getRarityDistribution(build);

    // seq_atk: Met(1) + Phe(2) + His(2) → 1경로×1, 2경로×2
    // seq_def: Gln(2) + Val(4) + Ala(4) → 2경로×1, 4경로×2
    // seq_spd: Tyr(2) + Asn(2) + Pro(4) → 2경로×2, 4경로×1
    // seq_chaos: Trp(1) + Asp(2) + Ile(3) → 1경로×1, 2경로×1, 3경로×1
    expect(dist[1]).toBe(2);  // Met, Trp
    expect(dist[2]).toBe(6);  // Phe, His, Gln, Tyr, Asn, Asp
    expect(dist[3]).toBe(1);  // Ile
    expect(dist[4]).toBe(3);  // Val, Ala, Pro
  });
});
