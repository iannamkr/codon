---
phase: "1+4"
modules: [creature-factory, pool-manager, degradation, lifecycle]
date: 2026-02-18
---
# Phase 1+4: Foundation 학습 기록

## 결정 사항

### CreatureFactory (`src/systems/creature-factory.ts`)
- `createCodon(triplet, subGeneIndices?)`: triplet 문자열 기반 코돈 생성. 대소문자 정규화(대문자). subGeneIndices 미지정 시 랜덤 하위 Gene 선택
- `createRandomCodon()`: 정지 코돈(TAA/TAG/TGA) 제외한 랜덤 코돈 생성
- `createCreature(config: CreatureConfig)`: 설정 기반 실험체 생성. 미지정 필드는 기본값 적용
- `generateRandomCreature()`: 완전 랜덤 실험체 생성 (설정 없이)
- CreatureConfig 인터페이스: 모든 필드 optional (`name`, `generation`, `constitution`, `primaryElement`, `stats`, `parentIds`)
- ID 생성: `creature_${Date.now()}_${counter}` 형식으로 유니크 보장
- 스탯 범위: 20~40 (STAT_MIN/STAT_MAX 상수)
- degradation 필드는 팩토리에서 설정하지 않음 (Phase 4 모듈이 관리)

### PoolManager (`src/systems/pool-manager.ts`)
- 풀 크기 상수: `CODON_POOL_MAX=15`, `SEQUENCE_POOL_MAX=6`, `PLASMID_POOL_MAX=4`
- 모든 연산이 `PoolResult { success: boolean; reason?: string }` 반환
- 코돈 풀: 인덱스 기반 제거 (`removeCodon(pool, index)`)
- 시퀀스/플라스미드 풀: ID 기반 제거 (`removeSequence(pool, seqId)`, `removePlasmid(pool, plasmidId)`)
- 풀을 직접 mutate하는 방식 (배열 참조 변경). 불변 패턴이 아닌 가변 패턴 채택 -- 게임 시스템에서 성능 우선

### DegradationTracker (`src/systems/degradation.ts`)
- `DEFAULT_RETIREMENT_THRESHOLD = 10` (플레이스홀더, 기획 논의 필요)
- 열화 곡선: `Math.floor(expeditionCount / 2)` (플레이스홀더)
- 은퇴/사망 상태에서는 출격 추적 무시 (expeditionCount 고정)
- `ensureDegradation()` 내부 헬퍼로 degradation 미설정 시 자동 초기화

### LifecycleManager (`src/systems/lifecycle.ts`)
- 은퇴 시: `isRetired=true`, 코돈 풀 전부 반환 (유전자 뱅크 대기용)
- 사망 시: `isDead=true`, 코돈 풀 + 시퀀스 풀 비움 (전부 손실)
- 사망한 실험체는 은퇴 불가 (빈 코돈 배열 반환)
- 은퇴한 실험체는 사망 처리 가능

## 주의점

1. **레거시 테스트 파일 20개가 실패 중**: `tests/systems/` 내 `CreatureFactory` (대문자), `BattleEngine`, `StorageManager` 등 삭제된 모듈을 참조하는 테스트. 이번 작업과 무관한 기존 문제
2. **sample.ts와의 관계**: `src/data/sample.ts`는 하드코딩된 테스트용 팩토리. `creature-factory.ts`는 이를 대체하는 시스템 팩토리. 둘 다 공존 가능하지만, LabScene 연동 시 sample.ts를 creature-factory.ts로 교체 예정 (Phase 5)
3. **열화 수치는 모두 플레이스홀더**: 은퇴 임계치(10), 열화 곡선(출격/2) 등. 기획 논의 후 조정 필요
4. **코돈 풀 시퀀스 참조**: 시퀀스의 코돈은 코돈 풀의 객체를 직접 참조. 풀에서 코돈 제거 시 시퀀스 정합성 주의 필요 (Phase 2 BuildManager에서 검증)

## 패턴

### TDD 플로우
1. 테스트 작성 (import할 모듈 경로와 함수명 확정)
2. 모듈 구현 (테스트가 요구하는 인터페이스 충족)
3. `npx vitest run <test-file>` 으로 단일 파일 검증
4. 전체 테스트 `npx vitest run` 으로 회귀 확인

### 파일 구조 규칙
- 시스템 모듈: `src/systems/<kebab-case>.ts`
- 테스트: `tests/systems/<kebab-case>.test.ts`
- 데이터: `src/data/` (types, codons, sub-genes, plasmids, elements, sample)
- import: 상대경로, type import 분리 (`import type { ... }`)

### PoolResult 패턴
성공/실패를 boolean + 선택적 reason으로 표현. 예외를 던지지 않고 호출자가 결과를 확인하는 패턴. 게임 UI에서 "왜 추가가 안 됐는지" 사용자에게 보여줄 때 reason 활용 가능.

### ensureDegradation 패턴
Creature.degradation이 optional이므로, 조작 전에 항상 존재를 보장하는 내부 헬퍼. 방어적 프로그래밍 패턴으로 null 체크 반복을 방지.
