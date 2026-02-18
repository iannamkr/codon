import type { AminoAcid, CodonRoleTag } from "./types";

// ─── 아미노산 정의 (20종 + 정지) ───

export const AMINO_ACIDS: Record<string, AminoAcid> = {
  // ★ 희귀 — 1경로
  Met: {
    id: "Met",
    nameKo: "메티오닌",
    nameEn: "Methionine",
    skillName: "기폭",
    description: "첫 발동 시 위력 ×2.0. 생물학의 시작 코돈",
    pathCount: 1,
    roleTag: "Destroy",
  },
  Trp: {
    id: "Trp",
    nameKo: "트립토판",
    nameEn: "Tryptophan",
    skillName: "변이촉발",
    description: "돌연변이 확률 100% (확정 변이)",
    pathCount: 1,
    roleTag: "Chaos",
  },

  // 일반 — 2경로
  Phe: {
    id: "Phe",
    nameKo: "페닐알라닌",
    nameEn: "Phenylalanine",
    skillName: "폭발",
    description: "위력 ×1.5, 단 후공 시 ×0.8",
    pathCount: 2,
    roleTag: "Destroy",
  },
  Tyr: {
    id: "Tyr",
    nameKo: "타이로신",
    nameEn: "Tyrosine",
    skillName: "각인",
    description: "디버프가 전투 종료까지 지속",
    pathCount: 2,
    roleTag: "Order",
  },
  His: {
    id: "His",
    nameKo: "히스티딘",
    nameEn: "Histidine",
    skillName: "상성폭발",
    description: "속성 유리 시 배율 ×1.5 → ×2.0",
    pathCount: 2,
    roleTag: "Destroy",
  },
  Gln: {
    id: "Gln",
    nameKo: "글루타민",
    nameEn: "Glutamine",
    skillName: "반사",
    description: "받은 데미지의 40% 반사",
    pathCount: 2,
    roleTag: "Survive",
  },
  Asn: {
    id: "Asn",
    nameKo: "아스파라긴",
    nameEn: "Asparagine",
    skillName: "유전",
    description: "승리 시 이 코돈의 Gene 구성이 유전 우선",
    pathCount: 2,
    roleTag: "Order",
  },
  Lys: {
    id: "Lys",
    nameKo: "라이신",
    nameEn: "Lysine",
    skillName: "선제",
    description: "선공 시 위력 ×1.3",
    pathCount: 2,
    roleTag: "Order",
  },
  Asp: {
    id: "Asp",
    nameKo: "아스파르트산",
    nameEn: "Aspartic acid",
    skillName: "반격",
    description: "후공 시 위력 ×1.5",
    pathCount: 2,
    roleTag: "Chaos",
  },
  Glu: {
    id: "Glu",
    nameKo: "글루탐산",
    nameEn: "Glutamic acid",
    skillName: "환경지배",
    description: "환경 판정 승리 시 효과 ×2",
    pathCount: 2,
    roleTag: "Order",
  },
  Cys: {
    id: "Cys",
    nameKo: "시스테인",
    nameEn: "Cysteine",
    skillName: "결합",
    description: "인접 코돈과 효과 공유",
    pathCount: 2,
    roleTag: "Survive",
  },

  // 보통 — 3경로
  Ile: {
    id: "Ile",
    nameKo: "이소류신",
    nameEn: "Isoleucine",
    skillName: "침식",
    description: "매 턴 대상 방어력 10% 누적 감소",
    pathCount: 3,
    roleTag: "Destroy",
  },

  // 흔함 — 4경로
  Val: {
    id: "Val",
    nameKo: "발린",
    nameEn: "Valine",
    skillName: "흡수",
    description: "데미지의 15%를 HP로 회복",
    pathCount: 4,
    roleTag: "Survive",
  },
  Thr: {
    id: "Thr",
    nameKo: "트레오닌",
    nameEn: "Threonine",
    skillName: "관통",
    description: "상대 방어 효과 50% 무시",
    pathCount: 4,
    roleTag: "Destroy",
  },
  Ala: {
    id: "Ala",
    nameKo: "알라닌",
    nameEn: "Alanine",
    skillName: "경화",
    description: "받는 데미지 20% 감소",
    pathCount: 4,
    roleTag: "Survive",
  },
  Gly: {
    id: "Gly",
    nameKo: "글리신",
    nameEn: "Glycine",
    skillName: "경량화",
    description: "HP 소모 30% 감소",
    pathCount: 4,
    roleTag: "Survive",
  },
  Pro: {
    id: "Pro",
    nameKo: "프롤린",
    nameEn: "Proline",
    skillName: "강직",
    description: "다음 턴 선공 보장",
    pathCount: 4,
    roleTag: "Order",
  },

  // 최흔 — 6경로
  Leu: {
    id: "Leu",
    nameKo: "류신",
    nameEn: "Leucine",
    skillName: "가속",
    description: "SPD +20%",
    pathCount: 6,
    roleTag: "Order",
  },
  Ser: {
    id: "Ser",
    nameKo: "세린",
    nameEn: "Serine",
    skillName: "재생",
    description: "턴 종료 후 HP 5% 회복",
    pathCount: 6,
    roleTag: "Survive",
  },
  Arg: {
    id: "Arg",
    nameKo: "아르기닌",
    nameEn: "Arginine",
    skillName: "적응",
    description: "상대에 따라 유리한 효과 자동 선택",
    pathCount: 6,
    roleTag: "Order",
  },

  // ■ 정지 코돈
  Stop: {
    id: "Stop",
    nameKo: "정지",
    nameEn: "Stop",
    skillName: "유전자 침묵",
    description: "이 코돈 비활성화 (스킬 없음)",
    pathCount: 3,
    roleTag: "Chaos",
  },
} as const;

// ─── 코돈 → 아미노산 매핑 테이블 (64개) ───

export const CODON_TABLE: Record<string, string> = {
  // A로 시작 (16개)
  AAA: "Lys",
  AAT: "Asn",
  AAG: "Lys",
  AAC: "Asn",
  ATA: "Ile",
  ATT: "Ile",
  ATG: "Met", // ★ 시작 코돈
  ATC: "Ile",
  AGA: "Arg",
  AGT: "Ser",
  AGG: "Arg",
  AGC: "Ser",
  ACA: "Thr",
  ACT: "Thr",
  ACG: "Thr",
  ACC: "Thr",

  // T로 시작 (16개)
  TAA: "Stop", // ■ 정지
  TAT: "Tyr",
  TAG: "Stop", // ■ 정지
  TAC: "Tyr",
  TTA: "Leu",
  TTT: "Phe",
  TTG: "Leu",
  TTC: "Phe",
  TGA: "Stop", // ■ 정지
  TGT: "Cys",
  TGG: "Trp", // ★ 유일 경로
  TGC: "Cys",
  TCA: "Ser",
  TCT: "Ser",
  TCG: "Ser",
  TCC: "Ser",

  // G로 시작 (16개)
  GAA: "Glu",
  GAT: "Asp",
  GAG: "Glu",
  GAC: "Asp",
  GTA: "Val",
  GTT: "Val",
  GTG: "Val",
  GTC: "Val",
  GGA: "Gly",
  GGT: "Gly",
  GGG: "Gly",
  GGC: "Gly",
  GCA: "Ala",
  GCT: "Ala",
  GCG: "Ala",
  GCC: "Ala",

  // C로 시작 (16개)
  CAA: "Gln",
  CAT: "His",
  CAG: "Gln",
  CAC: "His",
  CTA: "Leu",
  CTT: "Leu",
  CTG: "Leu",
  CTC: "Leu",
  CGA: "Arg",
  CGT: "Arg",
  CGG: "Arg",
  CGC: "Arg",
  CCA: "Pro",
  CCT: "Pro",
  CCG: "Pro",
  CCC: "Pro",
} as const;

// ─── 헬퍼 함수 ───

/** 코돈 문자열(3글자)로 아미노산 정보 조회 */
export function getAminoAcid(triplet: string): AminoAcid | undefined {
  const id = CODON_TABLE[triplet.toUpperCase()];
  if (!id) return undefined;
  return AMINO_ACIDS[id];
}
