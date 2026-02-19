# Codon 구현 계획서

> 최종 갱신: 2026-02-19
> 상태: **Phase 1 착수 대기**
> 방법론: TDD (테스트 먼저 → 구현 → 통과 → 리팩터)

---

## 코드베이스 현황 분석

### 유효한 모듈 (그대로 사용)

| 파일 | 상태 | 비고 |
|------|------|------|
| `src/data/codons.ts` | ✅ 유효 | `CODON_TABLE` 64→20 매핑 정확. `AMINO_ACIDS`는 v1 설명 → 재작성 필요 |
| `src/data/sub-genes.ts` | ✅ 유효 | 40종 하위Gene 이름/구조. description 업데이트 필요 |
| `src/data/types.ts` | 부분 유효 | `Gene`, `GeneRole`, `SubGene`, `AminoAcid`, `Stats`, `Constitution` 유효. 나머지 전면 재정의 |

### 무효 → 삭제 대상

| 파일 | 이유 |
|------|------|
| `src/systems/interaction.ts` | 인접 상호작용(공명/대립/융합) 폐기 |
| `src/systems/sequence-builder.ts` | 시퀀스 개념 폐기 |
| `src/systems/transition-resolver.ts` | 전이 효과 폐기 |
| `src/systems/turn-order.ts` | 선후공 시스템 변경 |
| `src/systems/damage-calculator.ts` | 데미지 공식 전면 변경 (012) |
| `src/systems/battle-engine.ts` | 전투 엔진 전면 재작성 |
| `src/systems/build-manager.ts` | 빌드 구조 변경 (12Gene + 효소4) |
| `src/systems/build-analyzer.ts` | 분석 기준 변경 |
| `src/systems/mutation-checker.ts` | 변이 시스템 전면 재설계 (013) |
| `src/systems/pool-manager.ts` | 풀 구조 변경 |
| `src/systems/plasmid-rules.ts` | 플라스미드 전면 재설계 (015) |
| `src/systems/plasmid-preview.ts` | 플라스미드 프리뷰 재작성 |
| `src/data/plasmids.ts` | 12종 플라스미드 완전 무효 |
| `src/data/elements.ts` | 속성 시스템 폐기 (상성 = Gene 타입 기반) |
| 대응 테스트 파일 전부 | 시스템 변경으로 무효 |

### 유효하지만 업데이트 필요

| 파일 | 변경 내용 |
|------|---------|
| `src/systems/stats.ts` | 014 체질 계수 변경 공식으로 재작성 |
| `src/systems/creature-factory.ts` | 새 타입(DNAChain, Enzyme) 반영 |
| `src/systems/degradation.ts` | 잠김(결정화) 기반으로 재작성 |
| `src/systems/lifecycle.ts` | 세대 교체 규칙 업데이트 |

---

## Phase 1: 코어 데이터 레이어

> **목표**: 전투 엔진이 참조할 모든 데이터 타입과 상수를 확정
> **의존성**: 없음 (첫 번째 단계)
> **예상 파일**: 5개 수정/생성, 5개 테스트

### Task 1.1: `src/data/types.ts` 재정의

기존 유효 타입 유지 + 무효 타입 제거 + 새 타입 추가.

**유지하는 타입:**
```typescript
Gene, GENES, GeneRole, GENE_TO_ROLE, CodonRoleTag
SubGene, AminoAcid, Stats, Constitution
```

**제거하는 타입:**
```typescript
Codon (재정의), Element, InteractionType, PlasmidCategory (재정의)
Sequence, Build (재정의), TransitionEffect
SlotResult, PhaseResult, BattleState, BattleResult (재정의)
MutationRecord (재정의)
```

**새로 정의할 타입:**

```typescript
// ─── Gene 슬롯 (12칸 서열의 1칸) ───
interface GeneSlot {
  type: Gene;                     // A/T/G/C
  subGeneId: string;              // 하위Gene ID (예: "A_strike")
  subGeneIndex: number;           // 하위Gene 인덱스 (0~9)
  locked: boolean;                // 잠김 여부 (★)
  atkBonus: number;               // 하위Gene ATK 보정 (0~5)
  // 키메라 전용
  chimera?: {
    secondaryType: Gene;          // 2차 타입
    secondarySubGeneId: string;   // 2차 하위Gene
  };
  // 진화 상태
  evolved: boolean;               // A⁺ 여부
  evolvedAtk: number;             // 진화 ATK (기본 ATK × 1.5)
  mergedSubGenes: string[];       // 병합된 하위Gene ID 목록 (최대 2~3개)
}

// ─── DNA 체인 (12칸 서열) ───
interface DNAChain {
  slots: GeneSlot[];              // 12칸 (과부하 시 16칸)
  maxSlots: number;               // 기본 12
}

// ─── 아미노산 패시브 (010 기반) ───
type AminoAcidTriggerType = "aura" | "instant" | "stack";

interface AminoAcidPassive {
  id: string;                     // "Met", "Phe", ...
  nameKo: string;                 // 바이오펑크명 ("발화샘")
  academicNameKo: string;         // 학술명 ("메티오닌")
  academicNameEn: string;         // "Methionine"
  triplets: string[];             // 가능한 코돈 목록 ["ATG"]
  pathCount: number;              // 경로 수 (희귀도)
  roleTag: CodonRoleTag;          // 역할 태그
  triggerType: AminoAcidTriggerType;
  description: string;            // 효과 설명
  // 수치 파라미터 (효과 엔진이 참조)
  params: Record<string, number>;
}

// ─── 효소 (011 기반) ───
type EnzymeTriggerType = "pattern" | "condition" | "event";
type EnzymeRoleGroup = "destroy" | "survive" | "order" | "chaos" | "stop";

interface Enzyme {
  id: string;                     // "concentrated_fire_catalyst"
  nameKo: string;                 // "농축 발화 촉매제"
  roleGroup: EnzymeRoleGroup;
  triggerType: EnzymeTriggerType;
  triggerCondition: string;       // 트리거 조건 설명
  effectDescription: string;      // 효과 설명
  params: Record<string, number>; // 수치 파라미터
}

// ─── 플라스미드 (015 기반) ───
type PlasmidId =
  | "reversal" | "overgrowth" | "null_type"
  | "overload" | "reflux" | "recombination"
  | "unstable" | "pure" | "adaptive"
  | "inverter" | "dormancy" | "parasite";

interface Plasmid {
  id: PlasmidId;
  nameKo: string;
  removedRule: string;
  newRule: string;
  description: string;
  params: Record<string, number>;
}

// ─── 빌드 (새 구조) ───
interface Build {
  chain: DNAChain;                // 12칸 Gene 서열
  enzymes: [Enzyme | null, Enzyme | null, Enzyme | null, Enzyme | null];
  plasmid: Plasmid | null;
}

// ─── 전투 상태 (012/013 기반) ───
type MatchupResult = "advantage" | "disadvantage" | "same_type" | "neutral";

interface RoundResult {
  roundIndex: number;
  myGene: GeneSlot;
  enemyGene: GeneSlot;
  matchup: MatchupResult;
  myDamageDealt: number;
  enemyDamageDealt: number;
  // 진화 발생 여부
  evolutionOccurred: boolean;
  evolvedGene?: GeneSlot;
  // 변이 이벤트
  mutationEvent?: MutationEvent;
}

interface PhaseResult {
  phaseIndex: number;
  codonTriplet: string;
  aminoAcidId: string;
  rounds: RoundResult[];
  aminoAcidEffect: string;        // 발동된 아미노산 효과 설명
  enzymeEffects: string[];        // 발동된 효소 효과 목록
  myHpAfter: number;
  enemyHpAfter: number;
}

// ─── 변이 이벤트 (013 기반) ───
type MutationType = "point" | "inversion" | "transposition" | "duplication" | "chimera";

interface MutationEvent {
  type: MutationType;
  trigger: string;                // 트리거 이벤트
  choices: MutationChoice[];      // 선택지 (1~3개)
  accepted: boolean;
  chosenIndex: number;            // 선택된 인덱스
}

interface MutationChoice {
  description: string;
  preview: {                      // 변이 전후 프리뷰
    before: string;
    after: string;
  };
  lockedGeneCount: number;        // 잠기는 Gene 수
}

// ─── 전투 전체 상태 ───
interface BattleState {
  myBuild: Build;
  enemyBuild: Build;
  myCreature: Creature;
  enemyCreature: Creature;
  myHp: number;
  enemyHp: number;
  myMaxHp: number;
  enemyMaxHp: number;
  // 서열 상태 (전투 중 동적 변경)
  myChain: GeneSlot[];            // 현재 남은 서열
  enemyChain: GeneSlot[];
  mySurvivorQueue: GeneSlot[];    // 꼬리 귀환 대기열
  enemySurvivorQueue: GeneSlot[];
  // 진행 상태
  currentWindowStart: number;     // 현재 윈도우 시작 인덱스
  currentPhase: number;
  currentRound: number;           // 페이즈 내 라운드 (0~2)
  cycleCount: number;             // 순환 횟수 (탈진 계산용)
  // 기록
  phases: PhaseResult[];
  mutations: MutationEvent[];
  // 종료
  isComplete: boolean;
  winner: "my" | "enemy" | "draw" | null;
}

// ─── 실험체 (새 구조) ───
interface Creature {
  id: string;
  name: string;
  generation: number;
  constitution: Constitution;
  stats: Stats;
  build: Build;
  // 결정화 상태
  lockedSlotCount: number;        // 잠긴 슬롯 수
  totalBattles: number;           // 총 전투 수
  isRetired: boolean;
  isDead: boolean;
  parentIds: string[];
}
```

**테스트**: `tests/data/types.test.ts`
- 타입 임포트 정합성 검증
- GeneSlot/DNAChain 팩토리 함수 테스트

### Task 1.2: `src/data/amino-acids.ts` 생성

010 문서 기반 20종 + Stop 아미노산 패시브 데이터.

```typescript
// 파일 구조:
export const AMINO_ACID_PASSIVES: Record<string, AminoAcidPassive> = {
  Met: {
    id: "Met",
    nameKo: "발화샘",
    academicNameKo: "메티오닌",
    academicNameEn: "Methionine",
    triplets: ["ATG"],
    pathCount: 1,
    roleTag: "Destroy",
    triggerType: "instant",
    description: "이번 페이즈의 첫 상성 승리 시 확정 크리티컬 (데미지 2배)",
    params: { critMultiplier: 2.0 },
  },
  // ... 20종 + Stop
};
```

기존 `src/data/codons.ts`의 `AMINO_ACIDS`는 이 파일로 대체.
`CODON_TABLE`은 `codons.ts`에 유지 (64→20 매핑).

**테스트**: `tests/data/amino-acids.test.ts`
- 20종 + Stop 모두 존재
- 각 아미노산의 triplets가 CODON_TABLE과 정합
- pathCount와 실제 경로 수 일치
- roleTag 분포 검증 (Destroy 5, Survive 5, Order 5, Chaos 5)

### Task 1.3: `src/data/enzymes.ts` 생성

011 문서 기반 26종 효소 데이터.

```typescript
export const ENZYMES: Record<string, Enzyme> = {
  concentrated_fire_catalyst: {
    id: "concentrated_fire_catalyst",
    nameKo: "농축 발화 촉매제",
    roleGroup: "destroy",
    triggerType: "pattern",
    triggerCondition: "Destroy 그룹 아미노산 발동 시",
    effectDescription: "이번 페이즈 30% 확률 치명타 (데미지 2배)",
    params: { critChance: 0.3, critMultiplier: 2.0 },
  },
  // ... 26종
};

export function getEnzymesByRole(role: EnzymeRoleGroup): Enzyme[] { ... }
export function getEnzymesByTrigger(trigger: EnzymeTriggerType): Enzyme[] { ... }
```

**테스트**: `tests/data/enzymes.test.ts`
- 26종 모두 존재 (Destroy 6, Survive 6, Order 6, Chaos 6, Stop 2)
- 트리거 카테고리별 분류 검증
- 중복 ID 없음

### Task 1.4: `src/data/plasmids.ts` 재작성

015 문서 기반 12종 플라스미드 데이터.

**테스트**: `tests/data/plasmids.test.ts`
- 12종 모두 존재
- 각 플라스미드의 removedRule/newRule 비어있지 않음
- ID 유니크

### Task 1.5: `src/systems/stats.ts` 재작성

014 문서 기반 체질별 공식 계수 변경.

```typescript
// 체질별 계수 테이블
interface AttributeCoefficients {
  hpBase: number;          // 기본 HP (80)
  hpPerStr: number;        // STR당 HP 증가
  dmgBase: number;         // 기본 데미지 (10)
  dmgPerStr: number;       // STR당 데미지 증가
  spdBase: number;         // 기본 SPD (10)
  spdPerDex: number;       // DEX당 SPD 증가
  defPerRes: number;       // RES당 DEF% (0~0.3)
  mutDenominator: number;  // MUT 분모 (기본 100)
}

const ATTRIBUTE_COEFFICIENTS: Record<Constitution, AttributeCoefficients> = {
  Balance:  { hpBase:80, hpPerStr:2.0, dmgBase:10, dmgPerStr:0.10, spdBase:10, spdPerDex:0.5, defPerRes:0.30, mutDenominator:100 },
  Aggro:    { hpBase:80, hpPerStr:1.5, dmgBase:10, dmgPerStr:0.18, spdBase:10, spdPerDex:0.5, defPerRes:0.20, mutDenominator:100 },
  Fortress: { hpBase:80, hpPerStr:2.5, dmgBase:10, dmgPerStr:0.05, spdBase:10, spdPerDex:0.4, defPerRes:0.45, mutDenominator:100 },
  Swift:    { hpBase:80, hpPerStr:1.5, dmgBase:10, dmgPerStr:0.10, spdBase:10, spdPerDex:0.8, defPerRes:0.30, mutDenominator:100 },
  Regen:    { hpBase:80, hpPerStr:2.5, dmgBase:10, dmgPerStr:0.10, spdBase:10, spdPerDex:0.3, defPerRes:0.30, mutDenominator:100 },
  Mutant:   { hpBase:80, hpPerStr:2.0, dmgBase:10, dmgPerStr:0.10, spdBase:10, spdPerDex:0.5, defPerRes:0.20, mutDenominator:70  },
};

export function deriveStats(base: Stats, constitution: Constitution): DerivedStats { ... }
export function calculateMutationChance(mut: number, constitution: Constitution): number { ... }
```

**테스트**: `tests/systems/stats.test.ts`
- 균형 체질 기본 계산 (STR 30 → HP 140, 데미지 13)
- 맹공 체질 (STR 30 → HP 125, 데미지 15.4)
- 변이 체질 MUT 분모 (MUT 50 → 확률 42%)
- 모든 6종 체질 기본값 스냅샷 테스트

### Task 1.6: 무효 파일 정리

무효 시스템 파일 및 대응 테스트 삭제.

```
삭제 대상:
  src/systems/interaction.ts
  src/systems/sequence-builder.ts
  src/systems/transition-resolver.ts
  src/systems/turn-order.ts
  src/systems/damage-calculator.ts
  src/systems/battle-engine.ts (Phase 2에서 재작성)
  src/systems/build-manager.ts (Phase 2에서 재작성)
  src/systems/build-analyzer.ts (Phase 2에서 재작성)
  src/systems/mutation-checker.ts (Phase 2에서 재작성)
  src/systems/pool-manager.ts (Phase 2에서 재작성)
  src/systems/plasmid-rules.ts (Phase 2에서 재작성)
  src/systems/plasmid-preview.ts
  src/data/plasmids.ts (Task 1.4에서 재작성)
  src/data/elements.ts
  + 대응 테스트 파일 전부
```

---

## Phase 2: 전투 엔진

> **목표**: 012/013 설계대로 동작하는 완전한 전투 시뮬레이션 엔진
> **의존성**: Phase 1 완료
> **예상 파일**: 10개 생성, 10개 테스트

### Task 2.1: `src/systems/battle/matchup-resolver.ts`

순환 상성 A>T>G>C>A 판정 + 키메라 이중 타입 처리.

```typescript
export function resolveMatchup(myGene: GeneSlot, enemyGene: GeneSlot): MatchupResult { ... }
export function resolveChimeraAttack(chimera: GeneSlot, target: GeneSlot): MatchupResult { ... }
export function resolveChimeraDefense(chimera: GeneSlot, attacker: GeneSlot): MatchupResult { ... }
// 반전체(Inverter) 플라스미드용
export function resolveMatchupInverted(myGene: GeneSlot, enemyGene: GeneSlot): MatchupResult { ... }
// 무속성(Null-Type) 플라스미드용
export function resolveMatchupByAtk(myGene: GeneSlot, enemyGene: GeneSlot): MatchupResult { ... }
```

**테스트**: 상성 16조합 (4×4) + 키메라 공격/수비 + 반전체 + 무속성 = 약 40 케이스

### Task 2.2: `src/systems/battle/chain-scanner.ts`

3칸 윈도우 스캐닝 + 코돈 판정.

```typescript
export function scanWindow(chain: GeneSlot[], windowStart: number, windowSize?: number): string { ... }
// 윈도우 내 3칸의 Gene 타입으로 코돈 triplet 생성
export function getCodonFromWindow(chain: GeneSlot[], windowStart: number): { triplet: string; aminoAcidId: string } { ... }
// 족보(고정 윈도우 4코돈) 계산
export function calculatePedigree(chain: GeneSlot[]): string[] { ... }
// 과성장(4칸) 윈도우용
export function scanTetradWindow(chain: GeneSlot[], windowStart: number): { triplet: string; fourthGeneRole: CodonRoleTag; roleMatch: boolean } { ... }
```

**테스트**: 기본 스캔, 프레임시프트 후 스캔, 역행(역순) 스캔, 과성장(4칸) 스캔

### Task 2.3: `src/systems/battle/combat-round.ts`

Gene 1:1 전투 라운드 처리.

```typescript
export interface CombatRoundInput {
  myGene: GeneSlot;
  enemyGene: GeneSlot;
  matchup: MatchupResult;
  baseDamage: number;          // 기본 10 (과성장 시 0)
  modifiers: DamageModifier[]; // 아미노산/효소/하위Gene 보정
}

export interface CombatRoundOutput {
  myGeneDestroyed: boolean;
  enemyGeneDestroyed: boolean;
  myDamageDealt: number;
  enemyDamageDealt: number;
  evolutionResult?: EvolutionResult;
  survivorGenes: GeneSlot[];   // Survivor Pool에 추가할 Gene
}

export function executeCombatRound(input: CombatRoundInput): CombatRoundOutput { ... }
```

**테스트**: 상성 승리/패배/동종/비상성 각 케이스, 데미지 계산, 진화 발생

### Task 2.4: `src/systems/battle/evolution-engine.ts`

동종 진화 (A+A=A⁺) 처리 (012 기반).

```typescript
export interface EvolutionResult {
  evolvedGene: GeneSlot;       // A⁺
  newAtk: number;              // max(A₁, A₂) × 1.5
  mergedSubGenes: string[];    // 양쪽 하위Gene 병합 (최대 2개, 융합 점균 시 3개)
  owner: "my" | "enemy";      // 주도한 쪽이 소유
}

export function attemptEvolution(
  winner: GeneSlot,
  loser: GeneSlot,
  hasFusionSlimeMold: boolean, // 융합 점균 아미노산 활성 여부
): EvolutionResult { ... }

// ATK 비교 (동종 대결)
export function compareSameTypeAtk(gene1: GeneSlot, gene2: GeneSlot): "gene1" | "gene2" | "draw" { ... }
```

**테스트**: 기본 진화, 옵션 병합 (2개), 융합 점균 (3개), ATK 동일 시 처리

### Task 2.5: `src/systems/battle/survivor-pool.ts`

Survivor Pool + 꼬리 귀환/머리 귀환 처리.

```typescript
export function appendSurvivor(
  chain: GeneSlot[],
  survivor: GeneSlot,
  plasmidId: PlasmidId | null,
): { newChain: GeneSlot[]; hpCost: number } { ... }
// 꼬리 귀환 (기본): 서열 끝에 추가
// 역류(reflux): 서열 앞에 추가 + HP -2 반환

export function checkCycleComplete(
  chainLength: number,
  processedCount: number,
): boolean { ... }

export function calculateExhaustionDamage(
  cycleCount: number,
  plasmidId: PlasmidId | null,
): number { ... }
// 기본: cycleCount × 5
// 과부하: cycleCount × 10
```

**테스트**: 꼬리 귀환, 머리 귀환(역류), 순환 완료 판정, 탈진 데미지 계산

### Task 2.6: `src/systems/battle/frameshift.ts`

프레임시프트 처리.

```typescript
export function applyFrameshift(
  chain: GeneSlot[],
  removedIndex: number,
  plasmidId: PlasmidId | null,
): GeneSlot[] { ... }
// 기본: 제거 후 뒤에서 앞으로 당김
// 역류: 앞에서 뒤로 당김
// 역행: 뒤에서 앞으로 당김 (역순 스캔이므로)
```

**테스트**: 기본 프레임시프트, 역류 방향, 코돈 변경 전후 비교

### Task 2.7: `src/systems/battle/amino-acid-engine.ts`

아미노산 패시브 발동 엔진 (010 기반).

```typescript
export type AminoAcidContext = {
  currentPhase: number;
  battleState: BattleState;
  windowGenes: GeneSlot[];
  aminoAcidId: string;
};

export interface AminoAcidEffectResult {
  damageModifier: number;        // 데미지 보정
  healAmount: number;            // HP 회복량
  shieldAmount: number;          // 쉴드
  spdModifier: number;           // SPD 보정
  defModifier: number;           // DEF 보정
  specialEffects: string[];      // 특수 효과 목록
}

export function triggerAminoAcid(ctx: AminoAcidContext): AminoAcidEffectResult { ... }
// 잠복(Dormancy) 플라스미드: Phase 1~2에서 비활성 → Phase 3에서 축적 폭발
export function triggerDormancyBurst(accumulated: AminoAcidEffectResult[]): AminoAcidEffectResult { ... }
```

**테스트**: 20종 각각의 발동 조건/효과, 잠복 축적 폭발

### Task 2.8: `src/systems/battle/enzyme-trigger.ts`

효소 조건 체크 + 효과 발동 (011 기반).

```typescript
export function checkEnzymeTrigger(enzyme: Enzyme, battleState: BattleState): boolean { ... }
export function applyEnzymeEffect(enzyme: Enzyme, battleState: BattleState): BattleState { ... }
// 4개 효소 순차 처리
export function processAllEnzymes(enzymes: (Enzyme | null)[], battleState: BattleState): BattleState { ... }
```

**테스트**: 패턴/조건/이벤트 트리거 각 2~3개, 효소 효과 적용 검증

### Task 2.9: `src/systems/battle/mutation-engine.ts`

변이 시스템 (013 기반).

```typescript
export function rollMutation(
  mut: number,
  constitution: Constitution,
  trigger: string,
  plasmidId: PlasmidId | null,
): MutationEvent | null { ... }

export function applyMutation(
  chain: GeneSlot[],
  event: MutationEvent,
  choiceIndex: number,
): { newChain: GeneSlot[]; lockedGenes: number[] } { ... }

// 5종 변이 구현
export function applyPointMutation(chain: GeneSlot[], targetIndex: number, newType: Gene): GeneSlot[] { ... }
export function applyInversion(chain: GeneSlot[], windowStart: number): GeneSlot[] { ... }
export function applyTransposition(chain: GeneSlot[], index1: number, index2: number): GeneSlot[] { ... }
export function applyDuplication(chain: GeneSlot[], destroyedIndex: number, sourceIndex: number): GeneSlot[] { ... }
export function applyChimera(winner: GeneSlot, absorbed: GeneSlot): GeneSlot { ... }

// MUT 등급별 가중치
export function getMutationTierWeights(mut: number): Record<MutationType, number> { ... }
// 선택지 수 결정
export function getChoiceCount(mut: number): number { ... }
```

**테스트**: 5종 변이 각각의 적용, MUT 구간별 확률/등급/선택지 수, 플라스미드 연동 (불안정/순수/적응체)

### Task 2.10: `src/systems/battle/battle-engine.ts`

통합 전투 엔진.

```typescript
export function initBattle(myCreature: Creature, enemyCreature: Creature): BattleState { ... }

// 1라운드 진행
export function advanceRound(state: BattleState): BattleState { ... }

// 1페이즈 진행 (3라운드)
export function advancePhase(state: BattleState): BattleState { ... }

// 전투 종료 판정
export function checkBattleEnd(state: BattleState): { ended: boolean; winner: "my" | "enemy" | "draw" | null } { ... }

// 전체 전투 실행 (자동 진행, 변이 선택은 콜백)
export function runFullBattle(
  myCreature: Creature,
  enemyCreature: Creature,
  onMutation?: (event: MutationEvent) => number, // 선택지 인덱스 반환
): BattleState { ... }

// 플라스미드 효과 적용
export function applyPlasmidRules(state: BattleState): BattleState { ... }
```

**테스트**: 풀 배틀 시뮬레이션 (012 문서의 시뮬레이션 예시를 테스트로 구현), 종료 조건 (Gene 전소, HP 0, 탈진), 플라스미드별 규칙 변경 검증

---

## Phase 3: 실험체 시스템

> **목표**: 결정화/잠김, Gene 삽입, 세대 교체, 체질 유전
> **의존성**: Phase 1 완료 (Phase 2와 병렬 가능)
> **예상 파일**: 4개 생성/수정, 4개 테스트

### Task 3.1: `src/systems/creature/crystallization.ts`

12칸 결정화 (잠김 관리).

```typescript
export function lockGenesAfterBattle(creature: Creature, battleResult: BattleState): Creature { ... }
// 전투 참가한 Gene → 잠김
// 변이 수락한 Gene → 잠김
// 적응체 플라스미드 → 잠김 발생 안 함

export function getLockedPercentage(creature: Creature): number { ... }
export function canRetire(creature: Creature): boolean { ... }
// 잠긴 Gene > 10개 → 은퇴 가능
```

**테스트**: 전투 후 잠김 적용, 적응체 면제, 은퇴 조건

### Task 3.2: `src/systems/creature/splicing.ts`

CRISPR/Splicing (빈 칸에 Gene 삽입).

```typescript
export function getEditableSlots(creature: Creature): number[] { ... }
// 잠기지 않은 슬롯 인덱스 목록

export function insertGene(creature: Creature, slotIndex: number, gene: GeneSlot): Creature { ... }
// 잠기지 않은 슬롯에만 삽입 가능

export function removeGene(creature: Creature, slotIndex: number): Creature { ... }
// 잠기지 않은 슬롯에서만 제거 가능

// 재조합 플라스미드용
export function overwriteLockedGene(creature: Creature, slotIndex: number, gene: GeneSlot): { creature: Creature; hpCost: number } { ... }
```

**테스트**: 삽입/제거/잠김 슬롯 편집 차단, 재조합 HP 비용

### Task 3.3: `src/systems/creature/lifecycle.ts` 재작성

세대 교체 + 체질 유전.

```typescript
export interface BreedingResult {
  child: Creature;
  attributePool: Constitution[];  // 부모 유전 풀 (2~3종)
  mutationSlotActive: boolean;    // 돌연변이 슬롯 활성 여부
}

export function breed(parentA: Creature, parentB: Creature): BreedingResult { ... }
// 014: 부모 체질 풀 + MUT 기반 돌연변이 슬롯

export function injectAttribute(result: BreedingResult, chosen: Constitution): Creature { ... }
// 유저가 선택한 체질 주입

export function retire(creature: Creature): { geneBankDeposit: GeneSlot[] } { ... }
// 은퇴 시 Gene을 유전자 뱅크에 저장
```

**테스트**: 교배 풀 생성, 돌연변이 슬롯 MUT 확률, 체질 주입, 은퇴

### Task 3.4: `src/systems/creature/creature-factory.ts` 재작성

실험체 생성 팩토리.

```typescript
export function createCreature(params: {
  name: string;
  constitution: Constitution;
  stats: Stats;
  chain?: DNAChain;
}): Creature { ... }

export function createRandomCreature(generation: number): Creature { ... }
export function createTestCreature(overrides?: Partial<Creature>): Creature { ... }
```

**테스트**: 기본 생성, 랜덤 생성, 테스트용 생성

---

## Phase 4: 빌드 시스템

> **목표**: 연구실에서 Gene 배치 + 효소 장착 + 플라스미드 선택
> **의존성**: Phase 1 완료
> **예상 파일**: 3개 생성, 3개 테스트

### Task 4.1: `src/systems/build-manager.ts` 재작성

```typescript
export function createEmptyBuild(chainSize?: number): Build { ... }
export function setGene(build: Build, slotIndex: number, gene: GeneSlot): Build { ... }
export function setEnzyme(build: Build, slotIndex: number, enzyme: Enzyme | null): Build { ... }
export function setPlasmid(build: Build, plasmid: Plasmid | null): Build { ... }
export function validateBuild(build: Build): { valid: boolean; errors: string[] } { ... }
// 효소 중복 검사, 빈 슬롯 경고, 플라스미드 규칙 적용
```

### Task 4.2: `src/systems/build-analyzer.ts` 재작성

```typescript
export interface BuildAnalysis {
  pedigree: string[];              // 족보 4코돈
  aminoAcidDistribution: Record<string, number>;  // 아미노산 분포
  roleDistribution: Record<CodonRoleTag, number>; // 역할 분포
  geneTypeDistribution: Record<Gene, number>;     // Gene 타입 분포
  enzymeMatchStatus: string[];     // 효소 매칭 상태
  warnings: string[];              // 경고 (Stop 코돈, 불리한 배치 등)
}

export function analyzeBuild(build: Build): BuildAnalysis { ... }
```

### Task 4.3: `src/systems/codon-resolver.ts`

코돈 판정 + 아미노산 조회 통합.

```typescript
export function resolveCodon(gene1: Gene, gene2: Gene, gene3: Gene): {
  triplet: string;
  aminoAcid: AminoAcidPassive;
  isStop: boolean;
} { ... }

export function resolveAllCodons(chain: DNAChain): Array<{
  windowStart: number;
  triplet: string;
  aminoAcid: AminoAcidPassive;
}> { ... }
```

---

## Phase 5: UI 재작성

> **목표**: 새 데이터 구조에 맞춘 연구실 UI
> **의존성**: Phase 1, 4 완료
> **범위**: Phaser 씬/컴포넌트. TDD 대상은 아님 (수동 테스트).

### Task 5.1: 테마/레이아웃 업데이트 (`src/ui/lab/theme.ts`)
### Task 5.2: DNA Chain 12칸 배치 UI (컬러코딩 🔴🟢🔵🟣)
### Task 5.3: 효소 4슬롯 장착 UI (역할 색상 + 트리거 아이콘)
### Task 5.4: 아미노산 패시브 프리뷰 (바이오펑크 기관 이름 + 학술명 툴팁)
### Task 5.5: 플라스미드 선택 UI
### Task 5.6: 빌드 분석 패널 (족보, 역할 분포, 효소 매칭)
### Task 5.7: Gene 인벤토리 패널

---

## Phase 6: 전투 UI + 통합

> **목표**: 전투 시각화 + 전체 게임 루프 연결
> **의존성**: Phase 2, 5 완료

### Task 6.1: 전투 씬 재작성 (`src/scenes/BattleScene.ts`)
- Gene 1:1 전투 애니메이션
- 코돈 효과/효소 발동 이펙트
- 변이 팝업 UI (수락/거부)
- 탈진 데미지 표시
- 죽음의 회전목마 시각화

### Task 6.2: 전투 결과 → 연구실 연결
- 잠김 처리
- HP 업데이트
- Gene 인벤토리 갱신

### Task 6.3: 교배 씬 (`src/scenes/BreedingScene.ts`)
- 체질 풀 UI
- 배양액 주입 선택

---

## 병렬화 전략

```
Phase 1 (코어 데이터) ──────────────────→ 완료
     │                                      │
     ├→ Phase 2 (전투 엔진) ────────────→   │
     │    2.1 matchup     (독립)            │
     │    2.2 chain-scan  (독립)            │
     │    2.3 combat-round (2.1 의존)       │
     │    2.4 evolution   (2.3 의존)        │
     │    2.5 survivor    (독립)            │
     │    2.6 frameshift  (독립)            │
     │    2.7 amino-acid  (독립)            │
     │    2.8 enzyme      (독립)            │
     │    2.9 mutation    (독립)            │
     │    2.10 engine     (2.1~2.9 의존)    │
     │                                      │
     ├→ Phase 3 (실험체) ────→ (2와 병렬)   │
     │                                      │
     ├→ Phase 4 (빌드) ──────→ (2와 병렬)   │
     │                                      │
     └→ Phase 5 (UI) ───────→ (1,4 완료 후) │
                                            │
                    Phase 6 (통합) ←─────────┘
```

**Phase 2 내부 병렬화**: 2.1~2.2, 2.5~2.9는 서로 독립 → 에이전트 팀으로 병렬 개발 가능.
**Phase 2+3+4 병렬**: Phase 1만 완료되면 동시 착수 가능.

---

## 테스트 전략

### 단위 테스트 (Phase 1~4)

```
tests/
├── data/
│   ├── types.test.ts           ← 타입 정합성
│   ├── amino-acids.test.ts     ← 20종 + CODON_TABLE 정합
│   ├── enzymes.test.ts         ← 26종 분류
│   ├── plasmids.test.ts        ← 12종 유니크
│   └── codons.test.ts          ← (기존 유지)
├── systems/
│   ├── stats.test.ts           ← 6종 체질 계수
│   ├── battle/
│   │   ├── matchup-resolver.test.ts  ← 상성 40+케이스
│   │   ├── chain-scanner.test.ts     ← 스캔 + 역행
│   │   ├── combat-round.test.ts      ← 라운드 처리
│   │   ├── evolution-engine.test.ts  ← 진화 + 옵션 병합
│   │   ├── survivor-pool.test.ts     ← 귀환 + 탈진
│   │   ├── frameshift.test.ts        ← 서열 당김
│   │   ├── amino-acid-engine.test.ts ← 20종 발동
│   │   ├── enzyme-trigger.test.ts    ← 트리거 체크
│   │   ├── mutation-engine.test.ts   ← 5종 변이
│   │   └── battle-engine.test.ts     ← 통합 시뮬레이션
│   ├── creature/
│   │   ├── crystallization.test.ts
│   │   ├── splicing.test.ts
│   │   ├── lifecycle.test.ts
│   │   └── creature-factory.test.ts
│   ├── build-manager.test.ts
│   ├── build-analyzer.test.ts
│   └── codon-resolver.test.ts
└── integration/
    └── full-battle-simulation.test.ts  ← 012 문서 시뮬레이션 재현
```

### 통합 테스트

`tests/integration/full-battle-simulation.test.ts`:
- 012 문서의 전투 시뮬레이션 예시를 코드로 재현
- 12 vs 12 Gene 풀 배틀, 프레임시프트, 진화, 탈진까지 검증
- 변이 이벤트 포함 시뮬레이션 (013)

---

## 예상 작업량

| Phase | 파일 수 | 테스트 수 | 비고 |
|-------|--------|---------|------|
| 1. 코어 데이터 | 5 | 5 | 독립, 즉시 착수 |
| 2. 전투 엔진 | 10 | 10 | 핵심. 내부 7개 병렬 가능 |
| 3. 실험체 | 4 | 4 | Phase 1 후 병렬 |
| 4. 빌드 | 3 | 3 | Phase 1 후 병렬 |
| 5. UI | 7+ | 수동 | Phase 1,4 후 |
| 6. 통합 | 3+ | 1 | Phase 2,5 후 |
| **합계** | **~32** | **~23** | |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-02-19 | 초안 작성 — 6 Phase, 코드베이스 분석, 상세 함수 시그니처 포함 |
