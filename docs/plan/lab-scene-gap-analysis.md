# LabScene 갭 분석

## 이전 구현에서 누락된 핵심 기능

### 1. Gene → Codon 합성 UI
- **상태**: 완전 누락
- **필요**: Gene(A/T/G/C) 3개를 순서대로 선택 → 아미노산 미리보기 → 하위 Gene 선택(각 자리별 10종 중 택 1) → 코돈 생성
- **시스템 API**: `CODON_TABLE`, `AMINO_ACIDS`, `getSubGenesForGene()`, `createCodon()`, `addCodon()`

### 2. 코돈 풀 관리 UI
- **상태**: 완전 누락
- **필요**: 15개 코돈 조회, 역할 태그별 필터(Destroy/Survive/Order/Chaos), 삭제(시퀀스 참조 체크 포함)
- **시스템 API**: `filterByRole()`, `removeCodon()`

### 3. Codon → Sequence 구성 UI
- **상태**: 완전 누락
- **필요**: 코돈 풀에서 3개 선택 → 인접 상호작용(공명/대립/융합) 실시간 프리뷰 → 시퀀스 생성
- **시스템 API**: `previewInteractions()`, `createSequence()`, `addSequence()`

### 4. 시퀀스 풀 관리 UI
- **상태**: 완전 누락
- **필요**: 6개 시퀀스 조회, 편집(코돈 교체), 삭제
- **시스템 API**: `removeSequence()`

### 5. 플라스미드 선택 UI
- **상태**: 완전 누락
- **필요**: 촉매 풀 4개에서 1개 선택, 선택 시 규칙 변경 내용(removedRule/newRule) 표시
- **시스템 API**: `PLASMIDS`, `getPlasmidById()`

### 6. 빌드 조립 UI
- **상태**: 완전 누락
- **필요**: 플라스미드에 따라 시퀀스 2/4/5개 배치, 시퀀스 교체, 순서 변경
- **시스템 API**: `createBuild()`, `swapSequence()`, `swapPlasmid()`

### 7. 빌드 분석 요약
- **상태**: 완전 누락
- **필요**: CLAUDE.md 시퀀스 빌드 UI 데이터 표시 가이드에 따른 상세 표시
  - 역할 태그 분포 (Destroy/Survive/Order/Chaos 각 몇 개)
  - 상호작용 분포 (공명/대립/융합 각 몇 개)
  - 희귀도 분포 (pathCount별)
- **시스템 API**: `getRoleDistribution()`, `getInteractionDistribution()`, `getRarityDistribution()`

### 8. 출격 버튼 + 빌드 검증
- **상태**: 완전 누락
- **필요**: 빌드 미완성 시 에러 표시, 완성 시 BattleScene 전환
- **시스템 API**: `validateBuild()`

## 시스템 레이어 상태

| 모듈 | 테스트 | 상태 |
|------|--------|------|
| codons.ts | 8 pass | 정상 |
| sub-genes.ts | 9 pass | 정상 |
| creature-factory.ts | 24 pass | 정상 |
| pool-manager.ts | 21 pass | 정상 |
| sequence-builder.ts | 12 pass | 정상 |
| build-manager.ts | 12 pass | 정상 |
| build-analyzer.ts | 5 pass | 정상 |
| battle-engine.ts | 21 pass | 정상 |
| damage-calculator.ts | 12 pass | 정상 |
| turn-order.ts | 5 pass | 정상 |
| plasmid-rules.ts | 14 pass | 정상 |
| transition-resolver.ts | 12 pass | 정상 |
| mutation-checker.ts | 6 pass | 정상 |
| lifecycle.ts | 13 pass | 정상 |
| degradation.ts | 13 pass | 정상 |
| **합계** | **177 pass** | **전부 정상** |

## 결론

이전 구현은 시스템 레이어만 구축하고 UI/Scene은 빈 껍데기였다. 게임의 코어 메커닉(Gene 조합 → 코돈 → 시퀀스 → 빌드)을 플레이어가 직접 조작하는 UI가 완전히 빠져있었으므로, Scene을 처음부터 재구축해야 한다.
