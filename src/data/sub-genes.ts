import type { Gene, SubGene } from "./types";

// ─── 하위 Gene 40종 데이터 ───

export const SUB_GENES: SubGene[] = [
  // ── A (파괴) 10종 ──
  {
    id: "A_strike",
    gene: "A",
    nameKo: "강타",
    nameEn: "Strike",
    description: "위력 배율 증가",
  },
  {
    id: "A_blast",
    gene: "A",
    nameKo: "폭발",
    nameEn: "Blast",
    description: "남은 슬롯에 스플래시 데미지",
  },
  {
    id: "A_pierce",
    gene: "A",
    nameKo: "관통",
    nameEn: "Pierce",
    description: "상대 DEF 일부 무시",
  },
  {
    id: "A_erode",
    gene: "A",
    nameKo: "침식",
    nameEn: "Erode",
    description: "지속 피해 추가 (이후 슬롯까지 누적)",
  },
  {
    id: "A_weaken",
    gene: "A",
    nameKo: "약화",
    nameEn: "Weaken",
    description: "상대 스탯 디버프",
  },
  {
    id: "A_execute",
    gene: "A",
    nameKo: "처형",
    nameEn: "Execute",
    description: "상대 HP 낮을수록 데미지 증가",
  },
  {
    id: "A_sacrifice",
    gene: "A",
    nameKo: "희생",
    nameEn: "Sacrifice",
    description: "자기 HP를 소모해서 추가 데미지",
  },
  {
    id: "A_preempt",
    gene: "A",
    nameKo: "선제",
    nameEn: "Preempt",
    description: "선공 시 위력 대폭 증폭",
  },
  {
    id: "A_shatter",
    gene: "A",
    nameKo: "파쇄",
    nameEn: "Shatter",
    description: "상대 실드/버프를 파괴",
  },
  {
    id: "A_overload",
    gene: "A",
    nameKo: "과부하",
    nameEn: "Overload",
    description: "이전 슬롯에서 데미지 줬으면 이번 위력 누적 증가",
  },

  // ── T (생존) 10종 ──
  {
    id: "T_protect",
    gene: "T",
    nameKo: "보호",
    nameEn: "Protect",
    description: "받는 데미지 감소",
  },
  {
    id: "T_heal",
    gene: "T",
    nameKo: "회복",
    nameEn: "Heal",
    description: "HP 회복",
  },
  {
    id: "T_counter",
    gene: "T",
    nameKo: "반격",
    nameEn: "Counter",
    description: "받은 데미지 일부 반사",
  },
  {
    id: "T_drain",
    gene: "T",
    nameKo: "흡혈",
    nameEn: "Drain",
    description: "준 데미지의 일부를 HP로 회복",
  },
  {
    id: "T_barrier",
    gene: "T",
    nameKo: "장벽",
    nameEn: "Barrier",
    description: "다음 피해를 흡수하는 실드 생성",
  },
  {
    id: "T_endure",
    gene: "T",
    nameKo: "인내",
    nameEn: "Endure",
    description: "치명적 피해 시 HP 1로 생존 (1회)",
  },
  {
    id: "T_stealth",
    gene: "T",
    nameKo: "은신",
    nameEn: "Stealth",
    description: "다음 공격 1회 회피",
  },
  {
    id: "T_adapt",
    gene: "T",
    nameKo: "적응",
    nameEn: "Adapt",
    description: "같은 속성 공격 반복 시 저항 증가",
  },
  {
    id: "T_purify",
    gene: "T",
    nameKo: "정화",
    nameEn: "Purify",
    description: "자신에게 걸린 디버프 제거",
  },
  {
    id: "T_symbiosis",
    gene: "T",
    nameKo: "공생",
    nameEn: "Symbiosis",
    description: "HP 낮을수록 방어력 증가",
  },

  // ── G (질서) 10종 ──
  {
    id: "G_accel",
    gene: "G",
    nameKo: "가속",
    nameEn: "Accel",
    description: "SPD 보너스",
  },
  {
    id: "G_precision",
    gene: "G",
    nameKo: "정밀",
    nameEn: "Precision",
    description: "스킬 효과 수치 증폭",
  },
  {
    id: "G_stabilize",
    gene: "G",
    nameKo: "안정",
    nameEn: "Stabilize",
    description: "변이 저항 + 효과 변동 감소",
  },
  {
    id: "G_sustain",
    gene: "G",
    nameKo: "지속",
    nameEn: "Sustain",
    description: "버프/디버프 지속시간 연장",
  },
  {
    id: "G_focus",
    gene: "G",
    nameKo: "집중",
    nameEn: "Focus",
    description: "이번 약하지만 다음 코돈 효과 강화",
  },
  {
    id: "G_suppress",
    gene: "G",
    nameKo: "억제",
    nameEn: "Suppress",
    description: "상대 버프 제거/무효화",
  },
  {
    id: "G_resonance",
    gene: "G",
    nameKo: "공명",
    nameEn: "Resonance",
    description: "인접 코돈이 같은 ATGC면 시너지 보너스",
  },
  {
    id: "G_environment",
    gene: "G",
    nameKo: "환경",
    nameEn: "Environment",
    description: "환경 효과 강화",
  },
  {
    id: "G_bond",
    gene: "G",
    nameKo: "결속",
    nameEn: "Bond",
    description: "인접 코돈과 보너스 효과 공유",
  },
  {
    id: "G_priority",
    gene: "G",
    nameKo: "선독",
    nameEn: "Priority",
    description: "선공권 보장 (SPD 무시)",
  },

  // ── C (혼돈) 10종 ──
  {
    id: "C_frenzy",
    gene: "C",
    nameKo: "폭주",
    nameEn: "Frenzy",
    description: "크리티컬 확률/배율 증가",
  },
  {
    id: "C_spread",
    gene: "C",
    nameKo: "전파",
    nameEn: "Spread",
    description: "효과가 인접 슬롯으로 전파",
  },
  {
    id: "C_distort",
    gene: "C",
    nameKo: "왜곡",
    nameEn: "Distort",
    description: "랜덤 추가 효과 발동",
  },
  {
    id: "C_chain",
    gene: "C",
    nameKo: "연쇄",
    nameEn: "Chain",
    description: "같은 코돈 효과가 2회 발동",
  },
  {
    id: "C_provoke",
    gene: "C",
    nameKo: "도발",
    nameEn: "Provoke",
    description: "상대 다음 코돈의 행동 변경",
  },
  {
    id: "C_clone",
    gene: "C",
    nameKo: "복제",
    nameEn: "Clone",
    description: "아미노산 효과를 복사해 추가 적용",
  },
  {
    id: "C_devour",
    gene: "C",
    nameKo: "잠식",
    nameEn: "Devour",
    description: "상대 코돈의 보너스 효과를 훔침",
  },
  {
    id: "C_reversal",
    gene: "C",
    nameKo: "역전",
    nameEn: "Reversal",
    description: "후공 시 오히려 위력 대폭 증가",
  },
  {
    id: "C_parasite",
    gene: "C",
    nameKo: "기생",
    nameEn: "Parasite",
    description: "상대에게 시한폭탄 심기 (N슬롯 후 폭발)",
  },
  {
    id: "C_split",
    gene: "C",
    nameKo: "분열",
    nameEn: "Split",
    description: "효과가 여러 약한 효과로 분산 (다중 타격)",
  },
];

// ─── 도우미 함수 ───

/** 해당 Gene의 하위 Gene 10종 반환 */
export function getSubGenesForGene(gene: Gene): SubGene[] {
  return SUB_GENES.filter((sg) => sg.gene === gene);
}

/** id로 하위 Gene 검색 */
export function getSubGeneById(id: string): SubGene | undefined {
  return SUB_GENES.find((sg) => sg.id === id);
}
