import { describe, it, expect } from "vitest";
import {
  addCodon,
  removeCodon,
  addSequence,
  removeSequence,
  addPlasmid,
  removePlasmid,
  CODON_POOL_MAX,
  SEQUENCE_POOL_MAX,
  PLASMID_POOL_MAX,
} from "../../src/systems/pool-manager";
import { createCodon, createRandomCodon } from "../../src/systems/creature-factory";
import { PLASMIDS } from "../../src/data/plasmids";
import type { Codon, Sequence, Plasmid } from "../../src/data/types";

// ─── 헬퍼 ───

function makeSequence(id: string): Sequence {
  return {
    id,
    codons: [createCodon("ATG"), createCodon("GCA"), createCodon("TTT")],
  };
}

// ─── 코돈 풀 관리 ───

describe("코돈 풀: addCodon / removeCodon", () => {
  it("빈 풀에 코돈을 추가하면 성공한다", () => {
    const pool: Codon[] = [];
    const codon = createCodon("ATG");
    const result = addCodon(pool, codon);
    expect(result.success).toBe(true);
    expect(pool).toHaveLength(1);
  });

  it("최대 15개까지 추가 가능하다", () => {
    const pool: Codon[] = [];
    for (let i = 0; i < CODON_POOL_MAX; i++) {
      const result = addCodon(pool, createRandomCodon());
      expect(result.success).toBe(true);
    }
    expect(pool).toHaveLength(CODON_POOL_MAX);
  });

  it("15개 초과 시 추가가 거부된다", () => {
    const pool: Codon[] = [];
    for (let i = 0; i < CODON_POOL_MAX; i++) {
      addCodon(pool, createRandomCodon());
    }
    const result = addCodon(pool, createRandomCodon());
    expect(result.success).toBe(false);
    expect(pool).toHaveLength(CODON_POOL_MAX);
  });

  it("인덱스로 코돈을 제거하면 풀 크기가 줄어든다", () => {
    const pool: Codon[] = [];
    addCodon(pool, createCodon("ATG"));
    addCodon(pool, createCodon("GCA"));
    expect(pool).toHaveLength(2);

    const result = removeCodon(pool, 0);
    expect(result.success).toBe(true);
    expect(pool).toHaveLength(1);
  });

  it("유효하지 않은 인덱스 제거 시 실패한다", () => {
    const pool: Codon[] = [];
    addCodon(pool, createCodon("ATG"));

    expect(removeCodon(pool, -1).success).toBe(false);
    expect(removeCodon(pool, 1).success).toBe(false);
    expect(removeCodon(pool, 100).success).toBe(false);
    expect(pool).toHaveLength(1);
  });

  it("빈 풀에서 제거 시 실패한다", () => {
    const pool: Codon[] = [];
    expect(removeCodon(pool, 0).success).toBe(false);
  });
});

// ─── 시퀀스 풀 관리 ───

describe("시퀀스 풀: addSequence / removeSequence", () => {
  it("빈 풀에 시퀀스를 추가하면 성공한다", () => {
    const pool: Sequence[] = [];
    const result = addSequence(pool, makeSequence("seq_1"));
    expect(result.success).toBe(true);
    expect(pool).toHaveLength(1);
  });

  it("최대 6개까지 추가 가능하다", () => {
    const pool: Sequence[] = [];
    for (let i = 0; i < SEQUENCE_POOL_MAX; i++) {
      const result = addSequence(pool, makeSequence(`seq_${i}`));
      expect(result.success).toBe(true);
    }
    expect(pool).toHaveLength(SEQUENCE_POOL_MAX);
  });

  it("6개 초과 시 추가가 거부된다", () => {
    const pool: Sequence[] = [];
    for (let i = 0; i < SEQUENCE_POOL_MAX; i++) {
      addSequence(pool, makeSequence(`seq_${i}`));
    }
    const result = addSequence(pool, makeSequence("seq_extra"));
    expect(result.success).toBe(false);
    expect(pool).toHaveLength(SEQUENCE_POOL_MAX);
  });

  it("ID로 시퀀스를 제거하면 풀 크기가 줄어든다", () => {
    const pool: Sequence[] = [];
    addSequence(pool, makeSequence("seq_1"));
    addSequence(pool, makeSequence("seq_2"));

    const result = removeSequence(pool, "seq_1");
    expect(result.success).toBe(true);
    expect(pool).toHaveLength(1);
    expect(pool[0].id).toBe("seq_2");
  });

  it("존재하지 않는 ID 제거 시 실패한다", () => {
    const pool: Sequence[] = [];
    addSequence(pool, makeSequence("seq_1"));

    expect(removeSequence(pool, "seq_999").success).toBe(false);
    expect(pool).toHaveLength(1);
  });

  it("빈 풀에서 제거 시 실패한다", () => {
    const pool: Sequence[] = [];
    expect(removeSequence(pool, "seq_1").success).toBe(false);
  });
});

// ─── 플라스미드 풀 관리 ───

describe("플라스미드 풀: addPlasmid / removePlasmid", () => {
  it("빈 풀에 플라스미드를 추가하면 성공한다", () => {
    const pool: Plasmid[] = [];
    const result = addPlasmid(pool, PLASMIDS[0]);
    expect(result.success).toBe(true);
    expect(pool).toHaveLength(1);
  });

  it("최대 4개까지 추가 가능하다", () => {
    const pool: Plasmid[] = [];
    for (let i = 0; i < PLASMID_POOL_MAX; i++) {
      const result = addPlasmid(pool, PLASMIDS[i]);
      expect(result.success).toBe(true);
    }
    expect(pool).toHaveLength(PLASMID_POOL_MAX);
  });

  it("4개 초과 시 추가가 거부된다", () => {
    const pool: Plasmid[] = [];
    for (let i = 0; i < PLASMID_POOL_MAX; i++) {
      addPlasmid(pool, PLASMIDS[i]);
    }
    const result = addPlasmid(pool, PLASMIDS[4]);
    expect(result.success).toBe(false);
    expect(pool).toHaveLength(PLASMID_POOL_MAX);
  });

  it("ID로 플라스미드를 제거하면 풀 크기가 줄어든다", () => {
    const pool: Plasmid[] = [];
    addPlasmid(pool, PLASMIDS[0]);
    addPlasmid(pool, PLASMIDS[1]);

    const result = removePlasmid(pool, PLASMIDS[0].id);
    expect(result.success).toBe(true);
    expect(pool).toHaveLength(1);
    expect(pool[0].id).toBe(PLASMIDS[1].id);
  });

  it("존재하지 않는 ID 제거 시 실패한다", () => {
    const pool: Plasmid[] = [];
    addPlasmid(pool, PLASMIDS[0]);

    expect(removePlasmid(pool, "nonexistent").success).toBe(false);
    expect(pool).toHaveLength(1);
  });

  it("빈 풀에서 제거 시 실패한다", () => {
    const pool: Plasmid[] = [];
    expect(removePlasmid(pool, "reverse").success).toBe(false);
  });
});

// ─── 상수 검증 ───

describe("풀 크기 상수", () => {
  it("CODON_POOL_MAX = 15", () => {
    expect(CODON_POOL_MAX).toBe(15);
  });

  it("SEQUENCE_POOL_MAX = 6", () => {
    expect(SEQUENCE_POOL_MAX).toBe(6);
  });

  it("PLASMID_POOL_MAX = 4", () => {
    expect(PLASMID_POOL_MAX).toBe(4);
  });
});
