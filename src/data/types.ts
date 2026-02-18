// ─── Gene (염기) ───

/** DNA 염기 4종. 코돈의 구성 재료 */
export type Gene = "A" | "T" | "G" | "C";

export const GENES: readonly Gene[] = ["A", "T", "G", "C"] as const;

// ─── Gene 역할 (2축 시스템) ───

/** A-T 축 = 뭘 하느냐 (파괴 vs 생존), G-C 축 = 어떻게 하느냐 (질서 vs 혼돈) */
export enum GeneRole {
  Destroy = "Destroy", // A (파괴)
  Survive = "Survive", // T (생존)
  Order = "Order",     // G (질서)
  Chaos = "Chaos",     // C (혼돈)
}

export const GENE_TO_ROLE: Record<Gene, GeneRole> = {
  A: GeneRole.Destroy,
  T: GeneRole.Survive,
  G: GeneRole.Order,
  C: GeneRole.Chaos,
};

// ─── 코돈 역할 태그 (Gene 명칭과 별개) ───

/** 코돈(아미노산 효과)에 부여되는 역할 태그. Gene 명칭(A/T/G/C)과 혼동 방지를 위해 영문 풀네임 */
export type CodonRoleTag = "Destroy" | "Survive" | "Order" | "Chaos";

// ─── 하위 Gene ───

export interface SubGene {
  id: string;          // 예: "A_strike"
  gene: Gene;          // 소속 Gene
  nameKo: string;      // 한글명 (예: "강타")
  nameEn: string;      // 영문명 (예: "Strike")
  description: string; // 보너스 효과 설명
}

// ─── 아미노산 ───

/** 아미노산 = 코돈의 스킬 효과 그룹 (20종 + 정지) */
export interface AminoAcid {
  id: string;          // 예: "Met"
  nameKo: string;      // 예: "메티오닌"
  nameEn: string;      // 예: "Methionine"
  skillName: string;   // 예: "기폭"
  description: string; // 효과 설명
  pathCount: number;   // 경로 수 (희귀도)
  roleTag: CodonRoleTag;
}

// ─── 코돈 ───

/** 코돈 = Gene 3개 조합 = 스킬 1개 */
export interface Codon {
  /** 코돈 문자열 (예: "ATG") */
  triplet: string;
  /** 매핑된 아미노산 ID */
  aminoAcidId: string;
  /** 3자리 각각의 하위 Gene (런타임에 결정) */
  subGenes: [SubGene, SubGene, SubGene];
}

// ─── 속성 ───

export enum Element {
  Fire = "Fire",
  Water = "Water",
  Earth = "Earth",
  Plant = "Plant",
}

// ─── 스탯 ───

/** 기본 4스탯 */
export interface Stats {
  str: number;  // 힘 → HP, 데미지
  dex: number;  // 민첩 → SPD, 선공
  res: number;  // 내성 → DEF, 속성 저항
  mut: number;  // 변이 → 변이 확률, 크리티컬
}

/** 전투 파생 스탯 */
export interface DerivedStats {
  hp: number;
  atk: number;
  spd: number;
  defPct: number;     // 방어율 (0~1)
  critPct: number;    // 크리티컬 확률 (0~1)
  critDmg: number;    // 크리티컬 배율
  mutChance: number;  // 변이 확률 (0~1)
}

// ─── 시퀀스 ───

/** 시퀀스 = 코돈 3개 세트 */
export interface Sequence {
  id: string;
  codons: [Codon, Codon, Codon];
}

// ─── 인접 상호작용 ───

export enum InteractionType {
  Resonance = "Resonance", // 공명: 같은 역할 태그
  Opposition = "Opposition", // 대립: 같은 축 반대 (A↔T, G↔C)
  Fusion = "Fusion",       // 융합: 다른 축 (A↔G, A↔C, T↔G, T↔C)
}

// ─── 플라스미드 ───

export enum PlasmidCategory {
  Combat = "Combat",       // 전투 규칙 변경
  Mutation = "Mutation",   // 변이 규칙 변경
  Attribute = "Attribute", // 속성/상성 변경
  Structure = "Structure", // 빌드 구조 변경
  Meta = "Meta",           // 메타 카운터
}

export interface Plasmid {
  id: string;
  nameKo: string;
  nameEn: string;
  category: PlasmidCategory;
  description: string;
  /** 제거하는 규칙 */
  removedRule: string;
  /** 새로운 규칙 */
  newRule: string;
}

// ─── 빌드 ───

/** 빌드 = 플라스미드 1개 + 시퀀스 4개 (플라스미드에 따라 구조 변동 가능) */
export interface Build {
  plasmid: Plasmid;
  sequences: Sequence[];
}

// ─── 전이 효과 ───

export enum TransitionEffect {
  Rampage = "Rampage",           // 폭주: Destroy+Destroy
  Neutralize = "Neutralize",     // 상쇄: Destroy+Survive
  Focus = "Focus",               // 집중: Destroy+Order
  Critical = "Critical",         // 임계: Destroy+Chaos
  Stalemate = "Stalemate",       // 교착: Survive+Survive
  RegenField = "RegenField",     // 재생장: Survive+Order
  ErosionField = "ErosionField", // 침식장: Survive+Chaos
  AccelField = "AccelField",     // 가속장: Order+Order
  Disruption = "Disruption",     // 교란장: Order+Chaos
  ChaosField = "ChaosField",     // 혼돈장: Chaos+Chaos
}

// ─── 체질 ───

export enum Constitution {
  Aggro = "Aggro",       // 맹공
  Fortress = "Fortress", // 철벽
  Swift = "Swift",       // 신속
  Regen = "Regen",       // 재생
  Mutant = "Mutant",     // 변이
  Balance = "Balance",   // 균형
}

// ─── 실험체 ───

export interface Creature {
  id: string;
  name: string;
  generation: number;
  constitution: Constitution;
  primaryElement: Element;
  stats: Stats;
  codonPool: Codon[];       // 최대 15개
  sequencePool: Sequence[];  // 최대 6개
  plasmidPool: Plasmid[];    // 최대 4개
  parentIds: string[];
  /** 열화 상태 (Phase 4). 미설정 시 기본값 사용 */
  degradation?: DegradationState;
}

// ─── 열화 상태 (Phase 4) ───

/** 실험체 열화 추적 */
export interface DegradationState {
  /** 출격 횟수 */
  expeditionCount: number;
  /** 열화 단계 (0=정상, 높을수록 열화) */
  degradationLevel: number;
  /** 은퇴 여부 */
  isRetired: boolean;
  /** 사망 여부 */
  isDead: boolean;
}

// ─── 전투 상태 (Phase 3) ───

/** 단일 슬롯 충돌 결과 */
export interface SlotResult {
  slotIndex: number;
  myCodon: Codon;
  enemyCodon: Codon;
  /** 내가 적에게 준 데미지 */
  myDamageDealt: number;
  /** 적이 나에게 준 데미지 */
  enemyDamageDealt: number;
  myCrit: boolean;
  enemyCrit: boolean;
  elementMultiplier: number;
}

/** 변이 기록 — 변이 내용 자체는 미확정 (CLAUDE.md: "돌연변이: 변이 시스템의 재설계") */
export interface MutationRecord {
  phaseIndex: number;
  codonTriplet: string;
  accepted: boolean;
}

/** 페이즈 결과 */
export interface PhaseResult {
  phaseIndex: number;
  slots: SlotResult[];
  transitionEffect: TransitionEffect;
  mutationTriggered: boolean;
  mutationAccepted: boolean;
  myHpAfter: number;
  enemyHpAfter: number;
}

/** 전투 전체 상태 */
export interface BattleState {
  myBuild: Build;
  enemyBuild: Build;
  myDerived: DerivedStats;
  enemyDerived: DerivedStats;
  myHp: number;
  enemyHp: number;
  currentPhase: number;
  /** 기본 4, 플라스미드(과부하=5, 압축=2)에 따라 변동 */
  maxPhases: number;
  activeTransition: TransitionEffect | null;
  mutations: MutationRecord[];
  phases: PhaseResult[];
  isComplete: boolean;
}

/** 전투 최종 결과 */
export interface BattleResult {
  winner: "my" | "enemy" | "draw";
  myHpRemaining: number;
  enemyHpRemaining: number;
  totalPhases: number;
  phases: PhaseResult[];
  mutations: MutationRecord[];
}
