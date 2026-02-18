// ─── 시퀀스 구성 시스템 ───
// 시퀀스 생성, 상호작용 미리보기, 코돈 필터링

import type { Codon, Sequence, CodonRoleTag } from "../data/types";
import { InteractionType } from "../data/types";
import { AMINO_ACIDS } from "../data/codons";
import { analyzeSequence } from "./interaction";

/** 코돈에서 역할 태그를 조회하는 함수 (AMINO_ACIDS 기반) */
function getCodonRoleTag(codon: Codon): CodonRoleTag {
  return AMINO_ACIDS[codon.aminoAcidId].roleTag;
}

/** 시퀀스 생성: 코돈 3개 조합 */
export function createSequence(
  id: string,
  codons: [Codon, Codon, Codon],
): Sequence {
  return { id, codons };
}

/** 인접 상호작용 미리보기 — analyzeSequence 활용 */
export function previewInteractions(
  codons: [Codon, Codon, Codon],
): { pair1: InteractionType; pair2: InteractionType } {
  const seq: Sequence = { id: "__preview__", codons };
  return analyzeSequence(seq, getCodonRoleTag);
}

/** 역할 태그로 코돈 필터링 */
export function filterByRole(pool: Codon[], roleTag: CodonRoleTag): Codon[] {
  return pool.filter((c) => AMINO_ACIDS[c.aminoAcidId].roleTag === roleTag);
}

/** 아미노산 ID로 코돈 필터링 */
export function filterByAminoAcid(pool: Codon[], aminoAcidId: string): Codon[] {
  return pool.filter((c) => c.aminoAcidId === aminoAcidId);
}

/** 희귀도로 코돈 필터링 (pathCount ≤ maxPathCount) */
export function filterByRarity(pool: Codon[], maxPathCount: number): Codon[] {
  return pool.filter((c) => AMINO_ACIDS[c.aminoAcidId].pathCount <= maxPathCount);
}
