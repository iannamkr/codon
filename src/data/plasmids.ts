// ─── 플라스미드 12종 데이터 ───

import { Plasmid, PlasmidCategory } from "./types";

/** 전체 플라스미드 12종 */
export const PLASMIDS: readonly Plasmid[] = [
  // ── 전투 (Combat) ──
  {
    id: "reverse",
    nameKo: "역행",
    nameEn: "Reverse",
    category: PlasmidCategory.Combat,
    description: "SPD 선후공을 무시하고 슬롯 역순으로 발동한다",
    removedRule: "SPD 선후공 판정",
    newRule: "슬롯 역순(3→2→1) 발동",
  },
  {
    id: "resonator",
    nameKo: "공명체",
    nameEn: "Resonator",
    category: PlasmidCategory.Combat,
    description: "인접 상호작용 대신, 시퀀스 내 3코돈이 같은 역할 태그면 위력 ×3",
    removedRule: "인접 상호작용 (공명/대립/융합)",
    newRule: "3코돈 동일 역할 태그 시 위력 ×3",
  },
  {
    id: "mirror",
    nameKo: "거울",
    nameEn: "Mirror",
    category: PlasmidCategory.Combat,
    description: "내 시퀀스 배열을 무효화하고 상대 시퀀스를 복사한다. 하위 Gene만 내 것 유지",
    removedRule: "내 시퀀스 배열",
    newRule: "상대 시퀀스 복사 (하위 Gene은 내 것)",
  },
  {
    id: "venom",
    nameKo: "선독",
    nameEn: "Venom",
    category: PlasmidCategory.Combat,
    description: "Phase 1~3 전투를 제거하고 Phase 4에서만 싸우되, 위력 ×4",
    removedRule: "Phase 1~3 전투",
    newRule: "Phase 4만 전투, 위력 ×4",
  },

  // ── 변이 (Mutation) ──
  {
    id: "unstable",
    nameKo: "불안정 서열",
    nameEn: "Unstable",
    category: PlasmidCategory.Mutation,
    description: "변이 수락/거부 선택을 제거하고, 자동 수락 + 변이 확률 2배",
    removedRule: "변이 수락/거부 선택",
    newRule: "변이 자동 수락 + 발동 확률 2배",
  },
  {
    id: "pure",
    nameKo: "순수 서열",
    nameEn: "Pure",
    category: PlasmidCategory.Mutation,
    description: "변이 시스템을 완전히 제거하는 대신, 스탯 파생 +20%",
    removedRule: "변이 시스템 전체",
    newRule: "스탯 파생 +20%",
  },
  {
    id: "adaptive",
    nameKo: "적응체",
    nameEn: "Adaptive",
    category: PlasmidCategory.Mutation,
    description: "변이의 영구 적용을 제거하고, 전투 중에만 적용되되 효과 ×0.5",
    removedRule: "변이 영구 적용",
    newRule: "변이 전투 중만 적용, 효과 ×0.5",
  },

  // ── 속성 (Attribute) ──
  {
    id: "null_attr",
    nameKo: "무속성",
    nameEn: "Null",
    category: PlasmidCategory.Attribute,
    description: "상성 시스템을 제거하고, 항상 ×1.0 + 순수 데미지 +30%",
    removedRule: "속성 상성 판정",
    newRule: "상성 항상 ×1.0 + 순수 데미지 +30%",
  },
  {
    id: "chimera",
    nameKo: "키메라",
    nameEn: "Chimera",
    category: PlasmidCategory.Attribute,
    description: "단일 속성을 제거하고, 코돈마다 랜덤 속성 + 유리 시 ×1.5",
    removedRule: "단일 속성 고정",
    newRule: "코돈마다 랜덤 속성 부여, 유리 상성 시 ×1.5",
  },

  // ── 구조 (Structure) ──
  {
    id: "overcharge",
    nameKo: "과부하",
    nameEn: "Overcharge",
    category: PlasmidCategory.Structure,
    description: "시퀀스당 코돈을 3→2개로 줄이는 대신, 페이즈를 4→5로 늘린다",
    removedRule: "시퀀스당 코돈 3개, 4페이즈",
    newRule: "시퀀스당 코돈 2개, 5페이즈",
  },
  {
    id: "compress",
    nameKo: "압축",
    nameEn: "Compress",
    category: PlasmidCategory.Structure,
    description: "4페이즈를 2페이즈로 압축하고, 페이즈당 코돈 6개가 충돌한다",
    removedRule: "4페이즈 구조",
    newRule: "2페이즈, 페이즈당 코돈 6개 충돌",
  },

  // ── 메타 (Meta) ──
  {
    id: "parasite",
    nameKo: "기생체",
    nameEn: "Parasite",
    category: PlasmidCategory.Meta,
    description: "상대 플라스미드를 무효화하고 탈취한다",
    removedRule: "상대 플라스미드 효과",
    newRule: "상대 플라스미드 무효화 + 탈취",
  },
] as const;

/** ID로 플라스미드 검색 */
export function getPlasmidById(id: string): Plasmid | undefined {
  return PLASMIDS.find((p) => p.id === id);
}
