⚠️ **구 시스템 기반 문서** — 009 전투 시스템 재설계(2026-02-19)로 이 문서의 시퀀스/4페이즈/인접상호작용 관련 내용은 무효. 코어 패턴(TDD, 데이터/로직 분리, Phaser 독립성)은 여전히 유효.

# Phase 6: BattleScene 전투 엔진 연동

## 개요

BattleScene 프로토타입(S&D 슬롯머신 UI)을 Phase 3 BattleEngine과 연동하여 실제 전투 데이터를 표시하도록 개선.

## 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/scenes/BattleScene.ts` | BattleEngine 연동, DEMO 데이터 제거, CreatureFactory/BuildManager 연동 |

## 핵심 변경 사항

### 1. init() 시그니처 변경

```typescript
// Before
init(data: { build?: Build }): void

// After
init(data: { build: Build; creature: Creature }): void
```

LabScene에서 전달된 `creature`의 `stats`와 `constitution`으로 `deriveStats()` 호출. SAMPLE_CREATURE/SAMPLE_ENEMY 하드코딩 제거.

### 2. 적 빌드 생성

```typescript
this.enemyCreature = generateRandomCreature();
const enemyPlasmid = this.enemyCreature.plasmidPool[0];
const enemySequences = this.enemyCreature.sequencePool.slice(0, 4);
this.enemyBuild = createBuild(enemyPlasmid, enemySequences);
```

- `generateRandomCreature()` (creature-factory.ts)로 랜덤 적 생성
- `createBuild()` (build-manager.ts)로 적 빌드 구성 (플라스미드 풀 첫 번째 + 시퀀스 풀 앞 4개)

### 3. 파생 스탯 계산

```typescript
this.myDerived = deriveStats(this.myCreature.stats, this.myCreature.constitution);
this.enemyDerived = deriveStats(this.enemyCreature.stats, this.enemyCreature.constitution);
```

각 실험체의 실제 스탯/체질 사용.

### 4. BattleEngine 연동 (이전 Phase 6 구현 유지)

- `createBattleState()` → `runPhase()` → `getWinner()` 흐름
- `applyPlasmidRules()`로 전투 규칙 변형
- 릴 스핀 → 실제 코돈 표시 (`toCodonDisplay()`)
- LED → 적 코돈 타이핑 효과
- 데미지 팝업 → `SlotResult.myDamageDealt`/`enemyDamageDealt`
- HP 바 → `battleState.myHp`/`enemyHp`
- 전이 효과 → 10종 한글 라벨 + 색상
- 변이 팝업 (스텁 — 자동 거부)
- 전투 결과 화면 (승/패/무승부 + HP 잔량 + 페이즈 수 + 변이 수)

## 의존 관계

```
LabScene → BattleScene.init({ build, creature })
              ↓
         generateRandomCreature() (적 생성)
         createBuild() (적 빌드)
         deriveStats() (양쪽 파생 스탯)
         createBattleState() → runPhase() → getWinner()
```

## 제거된 의존성

- `SAMPLE_CREATURE`, `SAMPLE_ENEMY`, `createSampleBuild` (sample.ts) — BattleScene에서 더 이상 사용하지 않음

## 검증

- `tsc --noEmit`: 0 에러
- `vitest run`: 177 테스트 통과
- `vite build`: 정상 빌드
