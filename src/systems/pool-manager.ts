// ─── 풀 관리 시스템 ───
// 코돈/시퀀스/플라스미드 풀의 추가/제거를 관리한다.

import type { Codon, Sequence, Plasmid } from "../data/types";

// ─── 풀 크기 상수 ───

export const CODON_POOL_MAX = 15;
export const SEQUENCE_POOL_MAX = 6;
export const PLASMID_POOL_MAX = 4;

// ─── 결과 타입 ───

export interface PoolResult {
  success: boolean;
  reason?: string;
}

// ─── 코돈 풀 ───

/** 코돈 풀에 추가 (최대 15개) */
export function addCodon(pool: Codon[], codon: Codon): PoolResult {
  if (pool.length >= CODON_POOL_MAX) {
    return { success: false, reason: `코돈 풀 최대치(${CODON_POOL_MAX}) 초과` };
  }
  pool.push(codon);
  return { success: true };
}

/** 인덱스로 코돈 제거 */
export function removeCodon(pool: Codon[], index: number): PoolResult {
  if (index < 0 || index >= pool.length) {
    return { success: false, reason: `유효하지 않은 인덱스: ${index}` };
  }
  pool.splice(index, 1);
  return { success: true };
}

// ─── 시퀀스 풀 ───

/** 시퀀스 풀에 추가 (최대 6개) */
export function addSequence(pool: Sequence[], sequence: Sequence): PoolResult {
  if (pool.length >= SEQUENCE_POOL_MAX) {
    return { success: false, reason: `시퀀스 풀 최대치(${SEQUENCE_POOL_MAX}) 초과` };
  }
  pool.push(sequence);
  return { success: true };
}

/** ID로 시퀀스 제거 */
export function removeSequence(pool: Sequence[], seqId: string): PoolResult {
  const idx = pool.findIndex((s) => s.id === seqId);
  if (idx === -1) {
    return { success: false, reason: `시퀀스를 찾을 수 없음: ${seqId}` };
  }
  pool.splice(idx, 1);
  return { success: true };
}

// ─── 플라스미드 풀 ───

/** 플라스미드 풀에 추가 (최대 4개) */
export function addPlasmid(pool: Plasmid[], plasmid: Plasmid): PoolResult {
  if (pool.length >= PLASMID_POOL_MAX) {
    return { success: false, reason: `플라스미드 풀 최대치(${PLASMID_POOL_MAX}) 초과` };
  }
  pool.push(plasmid);
  return { success: true };
}

/** ID로 플라스미드 제거 */
export function removePlasmid(pool: Plasmid[], plasmidId: string): PoolResult {
  const idx = pool.findIndex((p) => p.id === plasmidId);
  if (idx === -1) {
    return { success: false, reason: `플라스미드를 찾을 수 없음: ${plasmidId}` };
  }
  pool.splice(idx, 1);
  return { success: true };
}
