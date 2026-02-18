import { describe, it, expect } from "vitest";
import {
  createCodon,
  createRandomCodon,
  createCreature,
  generateRandomCreature,
  type CreatureConfig,
} from "../../src/systems/creature-factory";
import { CODON_TABLE, AMINO_ACIDS } from "../../src/data/codons";
import { Element, Constitution } from "../../src/data/types";
import type { Gene } from "../../src/data/types";

// ─── 코돈 생성 ───

describe("createCodon()", () => {
  it("유효한 triplet으로 코돈을 생성한다", () => {
    const codon = createCodon("ATG");
    expect(codon.triplet).toBe("ATG");
    expect(codon.aminoAcidId).toBe("Met");
    expect(codon.subGenes).toHaveLength(3);
  });

  it("소문자 triplet도 대문자로 정규화한다", () => {
    const codon = createCodon("atg");
    expect(codon.triplet).toBe("ATG");
    expect(codon.aminoAcidId).toBe("Met");
  });

  it("각 자리의 하위 Gene이 해당 Gene에 속한다", () => {
    const codon = createCodon("ATG");
    expect(codon.subGenes[0].gene).toBe("A");
    expect(codon.subGenes[1].gene).toBe("T");
    expect(codon.subGenes[2].gene).toBe("G");
  });

  it("subGeneIndices를 지정하면 해당 하위 Gene이 선택된다", () => {
    const codon1 = createCodon("ATG", [0, 0, 0]);
    const codon2 = createCodon("ATG", [1, 1, 1]);
    expect(codon1.subGenes[0].id).not.toBe(codon2.subGenes[0].id);
  });

  it("유효하지 않은 triplet은 에러를 던진다", () => {
    expect(() => createCodon("XYZ")).toThrow();
    expect(() => createCodon("")).toThrow();
    expect(() => createCodon("AT")).toThrow();
  });

  it("정지 코돈도 생성 가능하다 (createCodon은 제한 없음)", () => {
    const stop = createCodon("TAA");
    expect(stop.aminoAcidId).toBe("Stop");
  });
});

describe("createRandomCodon()", () => {
  it("정지 코돈을 제외한 코돈을 생성한다", () => {
    for (let i = 0; i < 100; i++) {
      const codon = createRandomCodon();
      expect(codon.aminoAcidId).not.toBe("Stop");
    }
  });

  it("유효한 triplet과 아미노산을 가진다", () => {
    const codon = createRandomCodon();
    expect(CODON_TABLE[codon.triplet]).toBeDefined();
    expect(AMINO_ACIDS[codon.aminoAcidId]).toBeDefined();
  });

  it("하위 Gene 3개가 올바른 Gene에 속한다", () => {
    const codon = createRandomCodon();
    const genes = codon.triplet.split("") as Gene[];
    for (let i = 0; i < 3; i++) {
      expect(codon.subGenes[i].gene).toBe(genes[i]);
    }
  });
});

// ─── 실험체 생성 ───

describe("createCreature()", () => {
  it("설정 기반으로 실험체를 생성한다", () => {
    const config: CreatureConfig = {
      name: "테스트-001",
      generation: 3,
      constitution: Constitution.Aggro,
      primaryElement: Element.Fire,
      stats: { str: 30, dex: 25, res: 20, mut: 35 },
    };

    const creature = createCreature(config);
    expect(creature.name).toBe("테스트-001");
    expect(creature.generation).toBe(3);
    expect(creature.constitution).toBe(Constitution.Aggro);
    expect(creature.primaryElement).toBe(Element.Fire);
    expect(creature.stats).toEqual({ str: 30, dex: 25, res: 20, mut: 35 });
  });

  it("고유 ID가 생성된다", () => {
    const c1 = createCreature({});
    const c2 = createCreature({});
    expect(c1.id).toBeTruthy();
    expect(c2.id).toBeTruthy();
    expect(c1.id).not.toBe(c2.id);
  });

  it("코돈 풀이 15개이다", () => {
    const creature = createCreature({});
    expect(creature.codonPool).toHaveLength(15);
  });

  it("코돈 풀에 정지 코돈이 없다", () => {
    const creature = createCreature({});
    for (const codon of creature.codonPool) {
      expect(codon.aminoAcidId).not.toBe("Stop");
    }
  });

  it("시퀀스 풀이 6개이다", () => {
    const creature = createCreature({});
    expect(creature.sequencePool).toHaveLength(6);
  });

  it("시퀀스의 코돈이 코돈 풀의 triplet에 포함된다", () => {
    const creature = createCreature({});
    const poolTriplets = new Set(creature.codonPool.map((c) => c.triplet));
    for (const seq of creature.sequencePool) {
      for (const codon of seq.codons) {
        expect(poolTriplets.has(codon.triplet)).toBe(true);
      }
    }
  });

  it("플라스미드 풀이 4개이다", () => {
    const creature = createCreature({});
    expect(creature.plasmidPool).toHaveLength(4);
  });

  it("미지정 필드에 기본값이 적용된다", () => {
    const creature = createCreature({});
    expect(creature.name).toBeTruthy();
    expect(creature.generation).toBe(1);
    expect(creature.parentIds).toEqual([]);
  });

  it("스탯이 20~40 범위 내에서 생성된다 (미지정 시)", () => {
    for (let i = 0; i < 20; i++) {
      const creature = createCreature({});
      const { str, dex, res, mut } = creature.stats;
      for (const val of [str, dex, res, mut]) {
        expect(val).toBeGreaterThanOrEqual(20);
        expect(val).toBeLessThanOrEqual(40);
      }
    }
  });

  it("체질이 유효한 Constitution 값이다 (미지정 시)", () => {
    const validConstitutions = Object.values(Constitution);
    for (let i = 0; i < 10; i++) {
      const creature = createCreature({});
      expect(validConstitutions).toContain(creature.constitution);
    }
  });

  it("속성이 유효한 Element 값이다 (미지정 시)", () => {
    const validElements = Object.values(Element);
    for (let i = 0; i < 10; i++) {
      const creature = createCreature({});
      expect(validElements).toContain(creature.primaryElement);
    }
  });

  it("degradation 필드는 설정되지 않는다", () => {
    const creature = createCreature({});
    expect(creature.degradation).toBeUndefined();
  });
});

describe("generateRandomCreature()", () => {
  it("유효한 실험체를 생성한다", () => {
    const creature = generateRandomCreature();
    expect(creature.id).toBeTruthy();
    expect(creature.codonPool).toHaveLength(15);
    expect(creature.sequencePool).toHaveLength(6);
    expect(creature.plasmidPool).toHaveLength(4);
  });

  it("매번 다른 ID를 생성한다", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      ids.add(generateRandomCreature().id);
    }
    expect(ids.size).toBe(10);
  });

  it("코돈 풀에 정지 코돈이 없다", () => {
    for (let i = 0; i < 5; i++) {
      const creature = generateRandomCreature();
      for (const codon of creature.codonPool) {
        expect(codon.aminoAcidId).not.toBe("Stop");
      }
    }
  });
});
