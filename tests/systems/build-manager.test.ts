import { describe, it, expect } from "vitest";
import {
  createBuild,
  validateBuild,
  swapSequence,
  swapPlasmid,
  reorderSequences,
} from "../../src/systems/build-manager";
import { SAMPLE_CREATURE, SAMPLE_ENEMY } from "../../src/data/sample";
import { PLASMIDS } from "../../src/data/plasmids";
import type { Sequence, Creature } from "../../src/data/types";

// ─── createBuild ───

describe("createBuild()", () => {
  it("플라스미드 1개 + 시퀀스 4개로 빌드를 생성한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    const sequences = SAMPLE_CREATURE.sequencePool.slice(0, 4);
    const build = createBuild(plasmid, sequences);

    expect(build.plasmid).toBe(plasmid);
    expect(build.sequences).toHaveLength(4);
    expect(build.sequences).toEqual(sequences);
  });
});

// ─── validateBuild ───

describe("validateBuild()", () => {
  it("유효한 빌드 (플라스미드 1 + 시퀀스 4)는 통과한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    const sequences = SAMPLE_CREATURE.sequencePool.slice(0, 4);
    const build = createBuild(plasmid, sequences);
    const result = validateBuild(build, SAMPLE_CREATURE);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("시퀀스 부족 시 에러를 반환한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    const sequences = SAMPLE_CREATURE.sequencePool.slice(0, 2);
    const build = createBuild(plasmid, sequences);
    const result = validateBuild(build, SAMPLE_CREATURE);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("시퀀스"))).toBe(true);
  });

  it("시퀀스 초과 시 에러를 반환한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    const sequences = SAMPLE_CREATURE.sequencePool.slice(0, 5);
    const build = createBuild(plasmid, sequences);
    const result = validateBuild(build, SAMPLE_CREATURE);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("시퀀스"))).toBe(true);
  });

  it("중복 시퀀스는 검증 실패한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    const seq = SAMPLE_CREATURE.sequencePool[0];
    const sequences = [seq, seq, SAMPLE_CREATURE.sequencePool[1], SAMPLE_CREATURE.sequencePool[2]];
    const build = createBuild(plasmid, sequences);
    const result = validateBuild(build, SAMPLE_CREATURE);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("중복"))).toBe(true);
  });

  it("실험체 시퀀스 풀에 없는 시퀀스는 검증 실패한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    // 적의 시퀀스를 사용 — 내 풀에 없음
    const foreignSeq = SAMPLE_ENEMY.sequencePool[0];
    const sequences = [
      foreignSeq,
      SAMPLE_CREATURE.sequencePool[1],
      SAMPLE_CREATURE.sequencePool[2],
      SAMPLE_CREATURE.sequencePool[3],
    ];
    const build = createBuild(plasmid, sequences);
    const result = validateBuild(build, SAMPLE_CREATURE);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("풀"))).toBe(true);
  });

  it("실험체 플라스미드 풀에 없는 플라스미드는 검증 실패한다", () => {
    // SAMPLE_CREATURE의 plasmidPool에 없는 플라스미드
    const foreignPlasmid = PLASMIDS[1]; // 공명체 — SAMPLE_CREATURE에 없음
    const sequences = SAMPLE_CREATURE.sequencePool.slice(0, 4);
    const build = createBuild(foreignPlasmid, sequences);
    const result = validateBuild(build, SAMPLE_CREATURE);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("플라스미드"))).toBe(true);
  });

  it("과부하 플라스미드: 시퀀스 5개가 필요하다 (id='overcharge')", () => {
    // SAMPLE_CREATURE.plasmidPool[3] = 과부하 (PLASMIDS[9])
    const overcharge = SAMPLE_CREATURE.plasmidPool[3];
    expect(overcharge.id).toBe("overcharge");

    // 4개면 실패
    const sequences4 = SAMPLE_CREATURE.sequencePool.slice(0, 4);
    const build4 = createBuild(overcharge, sequences4);
    const result4 = validateBuild(build4, SAMPLE_CREATURE);
    expect(result4.valid).toBe(false);
    expect(result4.errors.some((e) => e.includes("5"))).toBe(true);

    // 5개면 성공
    const sequences5 = SAMPLE_CREATURE.sequencePool.slice(0, 5);
    const build5 = createBuild(overcharge, sequences5);
    const result5 = validateBuild(build5, SAMPLE_CREATURE);
    expect(result5.valid).toBe(true);
  });

  it("압축 플라스미드: 시퀀스 2개가 필요하다 (id='compress')", () => {
    // SAMPLE_ENEMY.plasmidPool[3] = 압축 (PLASMIDS[10])
    const compress = SAMPLE_ENEMY.plasmidPool[3];
    expect(compress.id).toBe("compress");

    // 4개면 실패
    const sequences4 = SAMPLE_ENEMY.sequencePool.slice(0, 4);
    const build4 = createBuild(compress, sequences4);
    const result4 = validateBuild(build4, SAMPLE_ENEMY);
    expect(result4.valid).toBe(false);

    // 2개면 성공
    const sequences2 = SAMPLE_ENEMY.sequencePool.slice(0, 2);
    const build2 = createBuild(compress, sequences2);
    const result2 = validateBuild(build2, SAMPLE_ENEMY);
    expect(result2.valid).toBe(true);
  });
});

// ─── swapSequence ───

describe("swapSequence()", () => {
  it("지정 슬롯의 시퀀스를 교체하고 불변 반환한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    const sequences = SAMPLE_CREATURE.sequencePool.slice(0, 4);
    const build = createBuild(plasmid, sequences);

    const newSeq = SAMPLE_CREATURE.sequencePool[4]; // seq_mix1
    const swapped = swapSequence(build, 1, newSeq);

    // 원본 불변
    expect(build.sequences[1]).toBe(sequences[1]);
    // 새 빌드 반영
    expect(swapped.sequences[1]).toBe(newSeq);
    // 다른 슬롯 유지
    expect(swapped.sequences[0]).toBe(sequences[0]);
    expect(swapped.sequences[2]).toBe(sequences[2]);
    expect(swapped.sequences[3]).toBe(sequences[3]);
    // 플라스미드 유지
    expect(swapped.plasmid).toBe(plasmid);
  });
});

// ─── swapPlasmid ───

describe("swapPlasmid()", () => {
  it("플라스미드를 교체하고 불변 반환한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    const sequences = SAMPLE_CREATURE.sequencePool.slice(0, 4);
    const build = createBuild(plasmid, sequences);

    const newPlasmid = SAMPLE_CREATURE.plasmidPool[1];
    const swapped = swapPlasmid(build, newPlasmid);

    // 원본 불변
    expect(build.plasmid).toBe(plasmid);
    // 새 빌드 반영
    expect(swapped.plasmid).toBe(newPlasmid);
    // 시퀀스 유지
    expect(swapped.sequences).toEqual(sequences);
  });
});

// ─── reorderSequences ───

describe("reorderSequences()", () => {
  it("시퀀스 순서를 변경하고 불변 반환한다", () => {
    const plasmid = SAMPLE_CREATURE.plasmidPool[0];
    const sequences = SAMPLE_CREATURE.sequencePool.slice(0, 4);
    const build = createBuild(plasmid, sequences);

    const newOrder = [3, 2, 1, 0];
    const reordered = reorderSequences(build, newOrder);

    // 원본 불변
    expect(build.sequences[0]).toBe(sequences[0]);
    // 새 빌드 반영
    expect(reordered.sequences[0]).toBe(sequences[3]);
    expect(reordered.sequences[1]).toBe(sequences[2]);
    expect(reordered.sequences[2]).toBe(sequences[1]);
    expect(reordered.sequences[3]).toBe(sequences[0]);
    // 플라스미드 유지
    expect(reordered.plasmid).toBe(plasmid);
  });
});
