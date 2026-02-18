---
phase: "3"
modules: [turn-order, transition-resolver, mutation-checker, plasmid-rules, damage-calculator, battle-engine]
date: 2026-02-18
---
# Phase 3: Battle Engine 학습 기록

## 결정 사항

### 모듈 구조
- PhaseManager를 별도 파일로 분리하지 않고 BattleEngine에 통합. 전투 상태(BattleState)가 불변 데이터로 관리되므로, 별도 클래스로 상태를 관리할 필요 없이 순수 함수로 충분.
- 6개 모듈로 분리: turn-order, transition-resolver, mutation-checker, plasmid-rules, damage-calculator, battle-engine. 각각 독립적으로 테스트 가능.

### 불변 상태 설계
- `runPhase(state): BattleState` — 원본 state를 변경하지 않고 새 객체 반환.
- 스프레드 연산자(`...state`)로 shallow copy. phases 배열은 `[...state.phases, newPhase]`로 확장.
- 전투 리플레이, 디버깅, 시간 역행 기능에 유리.

### RNG 주입 패턴
- 모든 랜덤 로직에 `rng: () => number` 파라미터를 외부 주입 가능하게 설계.
- 테스트에서 결정적(deterministic) 실행 보장: `() => 0.99` (크리/변이 불발), `() => 0.01` (크리/변이 발동).
- Math.random을 기본값으로 사용.

### 데미지 계산 (플레이스홀더)
- `damage = ATK * (1 - DEF%) * elementMultiplier * damageMultiplier` — 단순한 플레이스홀더.
- 아미노산별 base power, 하위 Gene 보너스 등은 기획 미정이므로 인터페이스만 정의.
- DamageParams/DamageResult 인터페이스로 추후 교체 용이.

### 변이 시스템 (스텁)
- `checkMutation(mutChance, rng)` — 발동 여부만 판정.
- `generateMutationProposal()` — 항상 null (기획 미확정).
- `applyMutation(creature, proposal)` — 그대로 반환 (기획 미확정).
- 전투 엔진에서 mutationTriggered는 기록하지만 실제 변이 적용은 없음.

### 플라스미드 12종 규칙
- BattleConfig 인터페이스로 전투 규칙을 데이터화.
- `applyPlasmidRules(plasmidId, config)` — switch 문으로 12종 각각의 규칙 변경.
- 알 수 없는 plasmidId는 설정 변경 없이 그대로 반환 (안전).

### 전이 효과 다수결
- 3슬롯에서 전이 효과 3개 산출 → Map으로 카운트 → 최다 효과 선택.
- 모두 다르면 첫 번째 것 사용 (임시 규칙 — 추후 기획 논의).

## 주의점

- **속성 배율 미적용**: 현재 BattleEngine에서 elementMultiplier는 항상 1.0. Build에 primaryElement가 없고 Creature 레벨의 속성 정보가 Build에 전달되지 않으므로. Phase 6 (BattleScene 연동) 시 Creature 속성을 전투에 전달하는 구조 필요.
- **레거시 테스트 18개 실패**: 이전 버전의 모듈(BattleEngine/PascalCase, balance, passives 등)을 참조하는 레거시 테스트가 있음. 소스 파일이 삭제되어 import 실패. 정리 필요.
- **시퀀스 순환**: maxPhases가 sequences.length보다 클 때 (예: overcharge=5페이즈, sequences=4개) 모듈로 연산으로 순환. 의도적 설계이지만, 5번째 페이즈에서 1번 시퀀스가 재사용되는 점은 기획 확인 필요.
- **선공 KO 시 후공 면제**: 선공으로 상대 HP가 0 이하가 되면 후공 공격이 발생하지 않음. 동시 교전이 아닌 순차 교전 모델.

## 패턴

### 순수 함수 + 불변 상태 (함수형 전투 엔진)
```typescript
// 상태를 변경하지 않고 새 상태 반환
export function runPhase(state: BattleState, rng): BattleState {
  if (state.isComplete) return state; // 종료 상태는 그대로
  // ... 계산 ...
  return { ...state, /* 변경된 필드 */ };
}
```

### RNG 주입으로 테스트 결정성
```typescript
// 프로덕션: 기본 Math.random
runPhase(state);
// 테스트: 고정 값 주입
runPhase(state, () => 0.99); // 크리/변이 불발 보장
```

### BattleConfig를 통한 규칙 데이터화
```typescript
// 기본 설정 생성 → 플라스미드 규칙 적용 → 전투 엔진에 전달
const config = createDefaultConfig();
const modified = applyPlasmidRules("overcharge", config);
const state = createBattleState(myBuild, enemyBuild, myDerived, enemyDerived, modified);
```
