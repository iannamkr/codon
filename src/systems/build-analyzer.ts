// ─── 빌드 분석 시스템 ───
// 빌드 내 역할 태그, 상호작용, 희귀도 분포 분석

import type { Build, CodonRoleTag } from "../data/types";
import { InteractionType } from "../data/types";
import { AMINO_ACIDS } from "../data/codons";
import { analyzeSequence } from "./interaction";

/** 코돈에서 역할 태그를 조회 */
function getCodonRoleTag(codon: { aminoAcidId: string }): CodonRoleTag {
  return AMINO_ACIDS[codon.aminoAcidId].roleTag;
}

/** 빌드 내 전체 코돈의 역할 태그 분포 */
export function getRoleDistribution(
  build: Build,
): Record<CodonRoleTag, number> {
  const dist: Record<CodonRoleTag, number> = {
    Destroy: 0,
    Survive: 0,
    Order: 0,
    Chaos: 0,
  };

  for (const seq of build.sequences) {
    for (const codon of seq.codons) {
      const tag = getCodonRoleTag(codon);
      dist[tag]++;
    }
  }

  return dist;
}

/** 각 시퀀스의 인접 상호작용 집계 */
export function getInteractionDistribution(
  build: Build,
): Record<InteractionType, number> {
  const dist: Record<InteractionType, number> = {
    [InteractionType.Resonance]: 0,
    [InteractionType.Opposition]: 0,
    [InteractionType.Fusion]: 0,
  };

  for (const seq of build.sequences) {
    const { pair1, pair2 } = analyzeSequence(seq, getCodonRoleTag);
    dist[pair1]++;
    dist[pair2]++;
  }

  return dist;
}

/** pathCount별 코돈 수 분포 */
export function getRarityDistribution(
  build: Build,
): Record<number, number> {
  const dist: Record<number, number> = {};

  for (const seq of build.sequences) {
    for (const codon of seq.codons) {
      const pathCount = AMINO_ACIDS[codon.aminoAcidId].pathCount;
      dist[pathCount] = (dist[pathCount] ?? 0) + 1;
    }
  }

  return dist;
}
