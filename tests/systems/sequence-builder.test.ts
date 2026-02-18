import { describe, it, expect } from "vitest";
import {
  createSequence,
  previewInteractions,
  filterByRole,
  filterByAminoAcid,
  filterByRarity,
} from "../../src/systems/sequence-builder";
import { SAMPLE_CREATURE } from "../../src/data/sample";
import { InteractionType } from "../../src/data/types";
import type { Codon } from "../../src/data/types";

const pool = SAMPLE_CREATURE.codonPool;

// ─── createSequence ───

describe("createSequence()", () => {
  it("코돈 3개로 시퀀스를 생성한다", () => {
    const codons: [Codon, Codon, Codon] = [pool[0], pool[1], pool[2]];
    const seq = createSequence("test-seq-1", codons);

    expect(seq.id).toBe("test-seq-1");
    expect(seq.codons).toHaveLength(3);
    expect(seq.codons[0]).toBe(pool[0]);
    expect(seq.codons[1]).toBe(pool[1]);
    expect(seq.codons[2]).toBe(pool[2]);
  });
});

// ─── previewInteractions ───

describe("previewInteractions()", () => {
  it("모두 같은 역할(Destroy) → 양쪽 Resonance", () => {
    // pool[0]=ATG(Met/Destroy), pool[2]=TTT(Phe/Destroy), pool[4]=CAT(His/Destroy)
    const codons: [Codon, Codon, Codon] = [pool[0], pool[2], pool[4]];
    const result = previewInteractions(codons);

    expect(result.pair1).toBe(InteractionType.Resonance);
    expect(result.pair2).toBe(InteractionType.Resonance);
  });

  it("Destroy-Survive-Order → Opposition + Fusion", () => {
    // pool[0]=ATG(Met/Destroy), pool[5]=CAA(Gln/Survive), pool[3]=TAT(Tyr/Order)
    const codons: [Codon, Codon, Codon] = [pool[0], pool[5], pool[3]];
    const result = previewInteractions(codons);

    expect(result.pair1).toBe(InteractionType.Opposition); // Destroy↔Survive
    expect(result.pair2).toBe(InteractionType.Fusion);     // Survive↔Order
  });

  it("Order-Chaos-Order → Opposition + Opposition", () => {
    // pool[3]=TAT(Tyr/Order), pool[1]=TGG(Trp/Chaos), pool[6]=AAT(Asn/Order)
    const codons: [Codon, Codon, Codon] = [pool[3], pool[1], pool[6]];
    const result = previewInteractions(codons);

    expect(result.pair1).toBe(InteractionType.Opposition); // Order↔Chaos
    expect(result.pair2).toBe(InteractionType.Opposition); // Chaos↔Order
  });
});

// ─── filterByRole ───

describe("filterByRole()", () => {
  it("Destroy 필터 시 Destroy 코돈만 반환한다", () => {
    const result = filterByRole(pool, "Destroy");

    expect(result.length).toBeGreaterThan(0);
    // pool에서 Destroy: Met(0), Phe(2), His(4), Ile(10), Thr(12) = 5개
    expect(result).toHaveLength(5);
    for (const codon of result) {
      // AMINO_ACIDS에서 roleTag 확인 — 모든 결과가 Destroy여야 함
      expect(["ATG", "TTT", "CAT", "ATA", "ACA"]).toContain(codon.triplet);
    }
  });

  it("Survive 필터 시 Survive 코돈만 반환한다", () => {
    const result = filterByRole(pool, "Survive");

    // pool에서 Survive: Gln(5), Cys(9), Val(11), Ala(13) = 4개
    expect(result).toHaveLength(4);
  });

  it("해당 역할이 없으면 빈 배열을 반환한다", () => {
    // Destroy만 있는 풀
    const destroyOnly = pool.filter((_, i) => [0, 2, 4].includes(i));
    const result = filterByRole(destroyOnly, "Survive");

    expect(result).toHaveLength(0);
  });
});

// ─── filterByAminoAcid ───

describe("filterByAminoAcid()", () => {
  it("Met 필터 시 ATG만 반환한다", () => {
    const result = filterByAminoAcid(pool, "Met");

    expect(result).toHaveLength(1);
    expect(result[0].triplet).toBe("ATG");
  });

  it("존재하지 않는 아미노산은 빈 배열을 반환한다", () => {
    const result = filterByAminoAcid(pool, "NonExistent");

    expect(result).toHaveLength(0);
  });
});

// ─── filterByRarity ───

describe("filterByRarity()", () => {
  it("maxPathCount=1 → Met/Trp만 반환한다", () => {
    const result = filterByRarity(pool, 1);

    expect(result).toHaveLength(2);
    const triplets = result.map((c) => c.triplet).sort();
    expect(triplets).toEqual(["ATG", "TGG"]);
  });

  it("maxPathCount=2 → pathCount 1~2인 코돈을 반환한다", () => {
    const result = filterByRarity(pool, 2);

    // pathCount 1: Met(0), Trp(1) = 2개
    // pathCount 2: Phe(2), Tyr(3), His(4), Gln(5), Asn(6), Asp(7), Glu(8), Cys(9) = 8개
    expect(result).toHaveLength(10);
  });

  it("maxPathCount=0 → 빈 배열", () => {
    const result = filterByRarity(pool, 0);

    expect(result).toHaveLength(0);
  });
});
