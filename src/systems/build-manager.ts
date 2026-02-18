// ─── 빌드 관리 시스템 ───
// 빌드 생성, 검증, 수정 (불변 반환)

import type { Build, Plasmid, Sequence, Creature } from "../data/types";

/** 플라스미드별 필요 시퀀스 수 */
function getRequiredSequenceCount(plasmid: Plasmid): number {
  if (plasmid.id === "overcharge") return 5; // 과부하: 5페이즈
  if (plasmid.id === "compress") return 2;   // 압축: 2페이즈
  return 4; // 기본: 4페이즈
}

/** 빌드 생성 */
export function createBuild(plasmid: Plasmid, sequences: Sequence[]): Build {
  return { plasmid, sequences: [...sequences] };
}

/** 빌드 유효성 검증 */
export function validateBuild(
  build: Build,
  creature: Creature,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const required = getRequiredSequenceCount(build.plasmid);

  // 시퀀스 수 체크
  if (build.sequences.length !== required) {
    errors.push(`시퀀스 ${required}개 필요 (현재 ${build.sequences.length}개)`);
  }

  // 중복 시퀀스 체크
  const seqIds = build.sequences.map((s) => s.id);
  const uniqueIds = new Set(seqIds);
  if (uniqueIds.size !== seqIds.length) {
    errors.push("중복 시퀀스가 있습니다");
  }

  // 시퀀스가 실험체 풀에 존재하는지 체크
  const poolIds = new Set(creature.sequencePool.map((s) => s.id));
  for (const seq of build.sequences) {
    if (!poolIds.has(seq.id)) {
      errors.push(`시퀀스 '${seq.id}'가 실험체의 시퀀스 풀에 없습니다`);
    }
  }

  // 플라스미드가 실험체 풀에 존재하는지 체크
  const plasmidIds = new Set(creature.plasmidPool.map((p) => p.id));
  if (!plasmidIds.has(build.plasmid.id)) {
    errors.push(`플라스미드 '${build.plasmid.id}'가 실험체의 플라스미드 풀에 없습니다`);
  }

  return { valid: errors.length === 0, errors };
}

/** 시퀀스 교체 — 불변 반환 */
export function swapSequence(
  build: Build,
  slotIndex: number,
  newSequence: Sequence,
): Build {
  const sequences = [...build.sequences];
  sequences[slotIndex] = newSequence;
  return { plasmid: build.plasmid, sequences };
}

/** 플라스미드 교체 — 불변 반환 */
export function swapPlasmid(build: Build, newPlasmid: Plasmid): Build {
  return { plasmid: newPlasmid, sequences: [...build.sequences] };
}

/** 시퀀스 순서 변경 — 불변 반환 */
export function reorderSequences(build: Build, newOrder: number[]): Build {
  const sequences = newOrder.map((i) => build.sequences[i]);
  return { plasmid: build.plasmid, sequences };
}
