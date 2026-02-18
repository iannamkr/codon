---
phase: "2"
modules: [build-manager, sequence-builder, build-analyzer]
date: 2026-02-18
---
# Phase 2: Build System 학습 기록

## 결정 사항

### 1. 플라스미드별 시퀀스 수 분기
- `overcharge` (과부하): 시퀀스 5개 필요 (5페이즈)
- `compress` (압축): 시퀀스 2개 필요 (2페이즈)
- 기본: 시퀀스 4개 (4페이즈)
- 플라스미드 ID 문자열로 분기 처리. 향후 플라스미드 추가 시 `getRequiredSequenceCount()` 함수만 수정하면 됨

### 2. 불변 반환 패턴
- `swapSequence`, `swapPlasmid`, `reorderSequences` 모두 원본 Build를 수정하지 않고 새 객체 반환
- 스프레드 연산자 `[...build.sequences]`로 시퀀스 배열 복사
- Phaser 씬에서 상태 관리 시 예측 가능한 동작 보장

### 3. 역할 태그 조회 방식
- `AMINO_ACIDS[codon.aminoAcidId].roleTag`로 조회
- `interaction.ts`의 `analyzeSequence()`는 `getTagFn` 의존성 주입 방식 → `getCodonRoleTag` 함수를 주입
- sequence-builder와 build-analyzer 모두 같은 패턴 사용

### 4. 검증은 풀 ID 기반
- 시퀀스/플라스미드 검증 시 참조 비교(===)가 아닌 `id` 필드 기반 Set 조회
- 같은 데이터를 다른 객체로 생성해도 검증 통과

## 주의점

### 테스트 데이터 의존성
- SAMPLE_CREATURE와 SAMPLE_ENEMY의 코돈 풀/시퀀스 풀 구성을 정확히 파악해야 테스트 작성 가능
- 특히 SAMPLE_CREATURE의 plasmidPool[3]이 `overcharge`, SAMPLE_ENEMY의 plasmidPool[3]이 `compress`인 점 확인 필요
- sample.ts의 `createFixedCodon`은 하위 Gene 인덱스로 재현 가능한 샘플 생성

### 기존 테스트 깨짐 주의
- 레거시 모듈(RunManager, StorageManager 등) 삭제로 인해 해당 테스트 파일들이 import 에러 발생
- 새 테스트는 반드시 기존 통과하는 테스트와 함께 실행하여 회귀 확인

## 패턴

### 함수형 모듈 구조
- 클래스 대신 순수 함수 export (createBuild, validateBuild 등)
- 상태를 인자로 받고 결과를 반환 → 테스트 용이
- Phaser 의존성 없는 순수 TypeScript

### TDD 흐름
1. 테스트 파일 작성 (import할 함수 시그니처 확정)
2. 구현 파일 작성 (테스트가 요구하는 인터페이스 충족)
3. 테스트 실행 → 전부 통과 확인
4. 기존 테스트도 함께 실행 → 회귀 없음 확인

### 코돈 필터링 패턴
- `filterByRole`, `filterByAminoAcid`, `filterByRarity` 모두 `Array.filter()` + AMINO_ACIDS 조회
- 빈 결과는 빈 배열 반환 (예외 없음)
- UI에서 코돈 풀 검색/필터에 직접 사용 가능
