import { describe, it, expect } from "vitest";
import { SUB_GENES, getSubGenesForGene, getSubGeneById } from "../../src/data/sub-genes";
import type { Gene } from "../../src/data/types";
import { GENES } from "../../src/data/types";

describe("하위 Gene 데이터", () => {
  it("SUB_GENES가 정확히 40개이다", () => {
    expect(SUB_GENES).toHaveLength(40);
  });

  it("Gene별로 정확히 10개씩이다", () => {
    for (const gene of GENES) {
      const count = SUB_GENES.filter((sg) => sg.gene === gene).length;
      expect(count, `Gene ${gene}의 하위 Gene 수`).toBe(10);
    }
  });

  it("모든 id가 유니크하다", () => {
    const ids = SUB_GENES.map((sg) => sg.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("getSubGenesForGene()", () => {
  it.each(["A", "T", "G", "C"] as Gene[])("Gene '%s'에 대해 10개를 반환한다", (gene) => {
    const result = getSubGenesForGene(gene);
    expect(result).toHaveLength(10);
    for (const sg of result) {
      expect(sg.gene).toBe(gene);
    }
  });
});

describe("getSubGeneById()", () => {
  it("존재하는 id로 하위 Gene을 반환한다", () => {
    const sg = getSubGeneById("A_strike");
    expect(sg).toBeDefined();
    expect(sg!.gene).toBe("A");
    expect(sg!.nameKo).toBe("강타");
  });

  it("존재하지 않는 id는 undefined를 반환한다", () => {
    expect(getSubGeneById("Z_nonexist")).toBeUndefined();
    expect(getSubGeneById("")).toBeUndefined();
  });
});
