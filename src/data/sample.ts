// ─── 샘플 데이터 팩토리 ───
// 빌드 테스트용 샘플 실험체, 코돈, 시퀀스, 빌드 생성

import type { Codon, Creature, Sequence, Stats, Build, SubGene, Gene } from "./types";
import { Element, Constitution } from "./types";
import { CODON_TABLE, AMINO_ACIDS } from "./codons";
import { getSubGenesForGene } from "./sub-genes";
import { PLASMIDS } from "./plasmids";

// ─── 유틸리티 ───

/** 배열에서 랜덤 요소 1개 */
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 배열에서 중복 없이 n개 선택 */
function pickRandomN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/** min~max 사이 정수 랜덤 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 해당 Gene 자리에 랜덤 하위 Gene 1개 반환 */
function randomSubGene(gene: Gene): SubGene {
  const pool = getSubGenesForGene(gene);
  return pickRandom(pool);
}

/** 고정 하위 Gene 선택 (ID 기반) */
function pickSubGene(gene: Gene, index: number): SubGene {
  const pool = getSubGenesForGene(gene);
  return pool[index % pool.length];
}

// ─── 팩토리 함수 ───

/** 코돈 생성: triplet 문자열로부터 아미노산 매핑 + 각 자리에 랜덤 하위 Gene */
export function createSampleCodon(triplet: string): Codon {
  const upper = triplet.toUpperCase();
  const aminoAcidId = CODON_TABLE[upper];
  if (!aminoAcidId) {
    throw new Error(`유효하지 않은 코돈: ${triplet}`);
  }
  const genes = upper.split("") as [Gene, Gene, Gene];
  return {
    triplet: upper,
    aminoAcidId,
    subGenes: [
      randomSubGene(genes[0]),
      randomSubGene(genes[1]),
      randomSubGene(genes[2]),
    ],
  };
}

/** 고정 하위 Gene으로 코돈 생성 (재현 가능한 샘플용) */
function createFixedCodon(
  triplet: string,
  subGeneIndices: [number, number, number]
): Codon {
  const upper = triplet.toUpperCase();
  const aminoAcidId = CODON_TABLE[upper];
  if (!aminoAcidId) {
    throw new Error(`유효하지 않은 코돈: ${triplet}`);
  }
  const genes = upper.split("") as [Gene, Gene, Gene];
  return {
    triplet: upper,
    aminoAcidId,
    subGenes: [
      pickSubGene(genes[0], subGeneIndices[0]),
      pickSubGene(genes[1], subGeneIndices[1]),
      pickSubGene(genes[2], subGeneIndices[2]),
    ],
  };
}

/** 시퀀스 생성: 코돈 3개 조합 */
export function createSampleSequence(
  id: string,
  triplets: [string, string, string]
): Sequence {
  return {
    id,
    codons: [
      createSampleCodon(triplets[0]),
      createSampleCodon(triplets[1]),
      createSampleCodon(triplets[2]),
    ],
  };
}

/** 랜덤 스탯 생성 (20~40 범위) */
function randomStats(): Stats {
  return {
    str: randInt(20, 40),
    dex: randInt(20, 40),
    res: randInt(20, 40),
    mut: randInt(20, 40),
  };
}

/** 실험체 랜덤 생성 */
export function createSampleCreature(): Creature {
  const allTriplets = Object.keys(CODON_TABLE);
  // 정지 코돈 제외
  const validTriplets = allTriplets.filter(
    (t) => CODON_TABLE[t] !== "Stop"
  );
  const selectedTriplets = pickRandomN(validTriplets, 15);
  const codonPool = selectedTriplets.map((t) => createSampleCodon(t));

  // 시퀀스 6개: 코돈 풀에서 순서대로 3개씩 묶기
  const sequencePool: Sequence[] = [];
  for (let i = 0; i < 6; i++) {
    const c0 = codonPool[i * 2 % codonPool.length];
    const c1 = codonPool[(i * 2 + 1) % codonPool.length];
    const c2 = codonPool[(i * 2 + 2) % codonPool.length];
    sequencePool.push({
      id: `seq_rand_${i + 1}`,
      codons: [c0, c1, c2],
    });
  }

  const elements = Object.values(Element);
  const constitutions = Object.values(Constitution);

  return {
    id: `creature_${Date.now()}_${randInt(0, 9999)}`,
    name: `실험체-${randInt(100, 999)}`,
    generation: randInt(1, 4),
    constitution: pickRandom(constitutions),
    primaryElement: pickRandom(elements),
    stats: randomStats(),
    codonPool,
    sequencePool,
    plasmidPool: pickRandomN(PLASMIDS, 4),
    parentIds: [],
  };
}

// ─── 고정 샘플 실험체: SAMPLE_CREATURE ───

// 코돈 풀 15개 — 다양한 아미노산, 희귀도 골고루
const SAMPLE_CODONS: Codon[] = [
  // ★ 희귀 (1경로)
  createFixedCodon("ATG", [0, 0, 0]),   // [0] Met (기폭) — Destroy
  createFixedCodon("TGG", [1, 1, 1]),   // [1] Trp (변이촉발) — Chaos

  // 일반 (2경로)
  createFixedCodon("TTT", [2, 2, 2]),   // [2] Phe (폭발) — Destroy
  createFixedCodon("TAT", [3, 3, 3]),   // [3] Tyr (각인) — Order
  createFixedCodon("CAT", [4, 4, 4]),   // [4] His (상성폭발) — Destroy
  createFixedCodon("CAA", [5, 5, 5]),   // [5] Gln (반사) — Survive
  createFixedCodon("AAT", [6, 6, 6]),   // [6] Asn (유전) — Order
  createFixedCodon("GAT", [7, 7, 7]),   // [7] Asp (반격) — Chaos
  createFixedCodon("GAA", [8, 8, 8]),   // [8] Glu (환경지배) — Order
  createFixedCodon("TGT", [9, 9, 9]),   // [9] Cys (결합) — Survive

  // 보통 (3경로)
  createFixedCodon("ATA", [0, 1, 2]),   // [10] Ile (침식) — Destroy

  // 흔함 (4경로)
  createFixedCodon("GTA", [3, 4, 5]),   // [11] Val (흡수) — Survive
  createFixedCodon("ACA", [6, 7, 8]),   // [12] Thr (관통) — Destroy
  createFixedCodon("GCA", [9, 0, 1]),   // [13] Ala (경화) — Survive
  createFixedCodon("CCA", [2, 3, 4]),   // [14] Pro (강직) — Order
];

// 시퀀스 풀 6개 — 각각 뚜렷한 전략 방향
const SAMPLE_SEQUENCES: Sequence[] = [
  // SEQ1: 공격형 — Destroy 코돈 위주 (기폭 + 폭발 + 상성폭발)
  {
    id: "seq_atk",
    codons: [SAMPLE_CODONS[0], SAMPLE_CODONS[2], SAMPLE_CODONS[4]],
  },
  // SEQ2: 방어형 — Survive 코돈 위주 (반사 + 흡수 + 경화)
  {
    id: "seq_def",
    codons: [SAMPLE_CODONS[5], SAMPLE_CODONS[11], SAMPLE_CODONS[13]],
  },
  // SEQ3: 빠른형 — Order 코돈 위주 (각인 + 유전 + 강직)
  {
    id: "seq_spd",
    codons: [SAMPLE_CODONS[3], SAMPLE_CODONS[6], SAMPLE_CODONS[14]],
  },
  // SEQ4: 카오스형 — Chaos 코돈 위주 (변이촉발 + 반격 + 침식)
  {
    id: "seq_chaos",
    codons: [SAMPLE_CODONS[1], SAMPLE_CODONS[7], SAMPLE_CODONS[10]],
  },
  // SEQ5: 혼합형1 — Destroy+Survive 대립 (관통 + 결합 + 침식)
  {
    id: "seq_mix1",
    codons: [SAMPLE_CODONS[12], SAMPLE_CODONS[9], SAMPLE_CODONS[10]],
  },
  // SEQ6: 혼합형2 — Order+Chaos 대립 (환경지배 + 반격 + 강직)
  {
    id: "seq_mix2",
    codons: [SAMPLE_CODONS[8], SAMPLE_CODONS[7], SAMPLE_CODONS[14]],
  },
];

/** 미리 생성된 고정 샘플 실험체 */
export const SAMPLE_CREATURE: Creature = {
  id: "sample_alpha_001",
  name: "알파-001",
  generation: 2,
  constitution: Constitution.Aggro,
  primaryElement: Element.Fire,
  stats: { str: 35, dex: 28, res: 22, mut: 30 },
  codonPool: SAMPLE_CODONS,
  sequencePool: SAMPLE_SEQUENCES,
  plasmidPool: [
    PLASMIDS[0],  // 역행 (Combat)
    PLASMIDS[4],  // 불안정 서열 (Mutation)
    PLASMIDS[7],  // 무속성 (Attribute)
    PLASMIDS[9],  // 과부하 (Structure)
  ],
  parentIds: ["ancestor_fire_x", "ancestor_mut_y"],
};

// ─── 고정 샘플 적: SAMPLE_ENEMY ───

// 적 전용 코돈 풀 15개 — 방어/질서 중심 빌드
const ENEMY_CODONS: Codon[] = [
  // ★ 희귀
  createFixedCodon("TGG", [5, 3, 7]),   // [0] Trp (변이촉발) — Chaos
  createFixedCodon("ATG", [8, 6, 4]),   // [1] Met (기폭) — Destroy

  // 일반
  createFixedCodon("CAA", [2, 0, 8]),   // [2] Gln (반사) — Survive
  createFixedCodon("TGT", [1, 7, 3]),   // [3] Cys (결합) — Survive
  createFixedCodon("AAA", [4, 9, 6]),   // [4] Lys (선제) — Order
  createFixedCodon("GAA", [7, 2, 0]),   // [5] Glu (환경지배) — Order
  createFixedCodon("AAT", [3, 5, 1]),   // [6] Asn (유전) — Order
  createFixedCodon("GAT", [9, 8, 2]),   // [7] Asp (반격) — Chaos
  createFixedCodon("TAC", [6, 1, 5]),   // [8] Tyr (각인) — Order
  createFixedCodon("CAC", [0, 4, 9]),   // [9] His (상성폭발) — Destroy

  // 보통
  createFixedCodon("ATC", [5, 6, 3]),   // [10] Ile (침식) — Destroy

  // 흔함
  createFixedCodon("GCT", [8, 2, 7]),   // [11] Ala (경화) — Survive
  createFixedCodon("GGT", [1, 9, 0]),   // [12] Gly (경량화) — Survive
  createFixedCodon("TCT", [4, 0, 6]),   // [13] Ser (재생) — Survive
  createFixedCodon("CGA", [7, 3, 8]),   // [14] Arg (적응) — Order
];

const ENEMY_SEQUENCES: Sequence[] = [
  // SEQ1: 탱커형 — Survive 중심 (반사 + 경화 + 경량화)
  {
    id: "seq_e_tank",
    codons: [ENEMY_CODONS[2], ENEMY_CODONS[11], ENEMY_CODONS[12]],
  },
  // SEQ2: 질서형 — Order 중심 (선제 + 환경지배 + 적응)
  {
    id: "seq_e_order",
    codons: [ENEMY_CODONS[4], ENEMY_CODONS[5], ENEMY_CODONS[14]],
  },
  // SEQ3: 카운터형 — Chaos+Survive (반격 + 결합 + 재생)
  {
    id: "seq_e_counter",
    codons: [ENEMY_CODONS[7], ENEMY_CODONS[3], ENEMY_CODONS[13]],
  },
  // SEQ4: 버스트형 — Destroy 집중 (기폭 + 상성폭발 + 침식)
  {
    id: "seq_e_burst",
    codons: [ENEMY_CODONS[1], ENEMY_CODONS[9], ENEMY_CODONS[10]],
  },
  // SEQ5: 혼합형 — Order+Chaos (각인 + 변이촉발 + 유전)
  {
    id: "seq_e_mix1",
    codons: [ENEMY_CODONS[8], ENEMY_CODONS[0], ENEMY_CODONS[6]],
  },
  // SEQ6: 지구력형 — Survive+Order (경량화 + 재생 + 환경지배)
  {
    id: "seq_e_endure",
    codons: [ENEMY_CODONS[12], ENEMY_CODONS[13], ENEMY_CODONS[5]],
  },
];

/** 미리 생성된 고정 적 샘플 실험체 */
export const SAMPLE_ENEMY: Creature = {
  id: "sample_beta_001",
  name: "베타-001",
  generation: 3,
  constitution: Constitution.Fortress,
  primaryElement: Element.Water,
  stats: { str: 24, dex: 32, res: 36, mut: 22 },
  codonPool: ENEMY_CODONS,
  sequencePool: ENEMY_SEQUENCES,
  plasmidPool: [
    PLASMIDS[1],   // 공명체 (Combat)
    PLASMIDS[5],   // 순수 서열 (Mutation)
    PLASMIDS[8],   // 키메라 (Attribute)
    PLASMIDS[10],  // 압축 (Structure)
  ],
  parentIds: ["ancestor_water_a", "ancestor_res_b"],
};

// ─── 빌드 생성 ───

/** 실험체의 풀에서 시퀀스 4개 + 플라스미드 1개로 빌드 생성 */
export function createSampleBuild(creature: Creature): Build {
  if (creature.sequencePool.length < 4) {
    throw new Error("빌드에 시퀀스 최소 4개 필요");
  }
  if (creature.plasmidPool.length < 1) {
    throw new Error("빌드에 플라스미드 최소 1개 필요");
  }

  const sequences = creature.sequencePool.slice(0, 4);
  const plasmid = creature.plasmidPool[0];

  return { plasmid, sequences };
}
