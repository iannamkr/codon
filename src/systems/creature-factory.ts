// ─── 실험체 팩토리 ───
// 코돈/시퀀스/플라스미드 풀을 갖춘 실험체를 생성한다.

import type { Codon, Creature, Gene, Sequence, Stats } from "../data/types";
import { Element, Constitution } from "../data/types";
import { CODON_TABLE } from "../data/codons";
import { getSubGenesForGene } from "../data/sub-genes";
import { PLASMIDS } from "../data/plasmids";

// ─── 상수 ───

const CODON_POOL_MAX = 15;
const SEQUENCE_POOL_MAX = 6;
const PLASMID_POOL_MAX = 4;
const STAT_MIN = 20;
const STAT_MAX = 40;

// ─── 유틸리티 ───

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let idCounter = 0;

function generateId(): string {
  return `creature_${Date.now()}_${++idCounter}`;
}

// ─── 코돈 생성 ───

/** triplet 문자열로 코돈 생성. subGeneIndices로 하위 Gene 지정 가능 */
export function createCodon(
  triplet: string,
  subGeneIndices?: [number, number, number],
): Codon {
  const upper = triplet.toUpperCase();
  const aminoAcidId = CODON_TABLE[upper];
  if (!aminoAcidId) {
    throw new Error(`유효하지 않은 코돈: ${triplet}`);
  }

  const genes = upper.split("") as [Gene, Gene, Gene];
  const subGenes = genes.map((gene, i) => {
    const pool = getSubGenesForGene(gene);
    if (subGeneIndices) {
      return pool[subGeneIndices[i] % pool.length];
    }
    return pickRandom(pool);
  }) as [typeof genes[0] extends Gene ? ReturnType<typeof getSubGenesForGene>[number] : never, any, any];

  return {
    triplet: upper,
    aminoAcidId,
    subGenes: subGenes as Codon["subGenes"],
  };
}

/** 정지 코돈을 제외한 랜덤 코돈 생성 */
export function createRandomCodon(): Codon {
  const validTriplets = Object.keys(CODON_TABLE).filter(
    (t) => CODON_TABLE[t] !== "Stop",
  );
  const triplet = pickRandom(validTriplets);
  return createCodon(triplet);
}

// ─── CreatureConfig ───

export interface CreatureConfig {
  name?: string;
  generation?: number;
  constitution?: Constitution;
  primaryElement?: Element;
  stats?: Stats;
  parentIds?: string[];
}

// ─── 실험체 생성 ───

/** 설정 기반 실험체 생성 */
export function createCreature(config: CreatureConfig): Creature {
  // 코돈 풀: 정지 코돈 제외, 15개 랜덤 선택
  const codonPool: Codon[] = [];
  for (let i = 0; i < CODON_POOL_MAX; i++) {
    codonPool.push(createRandomCodon());
  }

  // 시퀀스 풀: 코돈 풀에서 코돈을 참조해 6개 구성
  const sequencePool: Sequence[] = [];
  for (let i = 0; i < SEQUENCE_POOL_MAX; i++) {
    const c0 = codonPool[(i * 2) % codonPool.length];
    const c1 = codonPool[(i * 2 + 1) % codonPool.length];
    const c2 = codonPool[(i * 2 + 2) % codonPool.length];
    sequencePool.push({
      id: `seq_${i + 1}`,
      codons: [c0, c1, c2],
    });
  }

  // 플라스미드 풀: 전체에서 4개 랜덤 선택
  const plasmidPool = pickRandomN(PLASMIDS, PLASMID_POOL_MAX);

  const elements = Object.values(Element);
  const constitutions = Object.values(Constitution);

  return {
    id: generateId(),
    name: config.name ?? `실험체-${randInt(100, 999)}`,
    generation: config.generation ?? 1,
    constitution: config.constitution ?? pickRandom(constitutions),
    primaryElement: config.primaryElement ?? pickRandom(elements),
    stats: config.stats ?? {
      str: randInt(STAT_MIN, STAT_MAX),
      dex: randInt(STAT_MIN, STAT_MAX),
      res: randInt(STAT_MIN, STAT_MAX),
      mut: randInt(STAT_MIN, STAT_MAX),
    },
    codonPool,
    sequencePool,
    plasmidPool,
    parentIds: config.parentIds ?? [],
  };
}

/** 완전 랜덤 실험체 생성 (설정 없음) */
export function generateRandomCreature(): Creature {
  return createCreature({});
}
