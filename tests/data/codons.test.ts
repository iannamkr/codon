import { describe, it, expect } from "vitest";
import { AMINO_ACIDS, CODON_TABLE, getAminoAcid } from "../../src/data/codons";

describe("코돈 테이블", () => {
  it("CODON_TABLE이 정확히 64개 항목을 가진다", () => {
    expect(Object.keys(CODON_TABLE)).toHaveLength(64);
  });

  it("모든 코돈이 유효한 아미노산 ID를 가리킨다", () => {
    for (const [triplet, aminoAcidId] of Object.entries(CODON_TABLE)) {
      expect(AMINO_ACIDS[aminoAcidId], `코돈 ${triplet} → ${aminoAcidId} 가 AMINO_ACIDS에 없음`).toBeDefined();
    }
  });

  it("각 아미노산의 pathCount가 실제 매핑된 코돈 수와 일치한다", () => {
    // 실제 코돈 수 집계
    const actualCounts: Record<string, number> = {};
    for (const aminoAcidId of Object.values(CODON_TABLE)) {
      actualCounts[aminoAcidId] = (actualCounts[aminoAcidId] ?? 0) + 1;
    }

    for (const [id, aa] of Object.entries(AMINO_ACIDS)) {
      const actual = actualCounts[id] ?? 0;
      expect(actual, `${id}(${aa.nameKo}): pathCount=${aa.pathCount}, 실제=${actual}`).toBe(aa.pathCount);
    }
  });

  it("정지 코돈 3개(TAA, TAG, TGA)가 Stop에 매핑된다", () => {
    expect(CODON_TABLE["TAA"]).toBe("Stop");
    expect(CODON_TABLE["TAG"]).toBe("Stop");
    expect(CODON_TABLE["TGA"]).toBe("Stop");
  });

  it("희귀 코돈 ATG → Met, TGG → Trp 검증", () => {
    expect(CODON_TABLE["ATG"]).toBe("Met");
    expect(CODON_TABLE["TGG"]).toBe("Trp");
  });
});

describe("getAminoAcid()", () => {
  it("유효한 코돈으로 아미노산 정보를 반환한다", () => {
    const met = getAminoAcid("ATG");
    expect(met).toBeDefined();
    expect(met!.id).toBe("Met");
    expect(met!.nameKo).toBe("메티오닌");
  });

  it("소문자 코돈도 정상 처리한다", () => {
    const trp = getAminoAcid("tgg");
    expect(trp).toBeDefined();
    expect(trp!.id).toBe("Trp");
  });

  it("유효하지 않은 코돈은 undefined를 반환한다", () => {
    expect(getAminoAcid("XYZ")).toBeUndefined();
    expect(getAminoAcid("")).toBeUndefined();
    expect(getAminoAcid("AT")).toBeUndefined();
  });
});
