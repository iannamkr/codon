# Phase 7: SequenceAssembler 구현 학습 기록

## 개요
조립대 오른쪽 패널 — 코돈풀에서 코돈 3개를 골라 시퀀스를 조립하는 컴포넌트.

## 핵심 패턴

### 1. 섹션별 갱신 전략
- 전체 rebuild 대신 각 섹션(슬롯/상호작용/리스트/요약/버튼)을 독립적으로 갱신
- `redrawSlots()`, `updateInteractionPreview()`, `rebuildList()`, `updateSummary()`, `updateConfirmBtn()` 각각 호출
- 사용자 액션에 따라 필요한 섹션만 갱신하여 성능 확보

### 2. 코돈 배치 흐름
- 활성 Pos(금색 테두리)에 코돈풀 목록에서 클릭 → 배치
- `moveToNextEmptyPos()`: 배치 후 자동으로 다음 빈 Pos로 이동 (순환 탐색)
- 슬롯 클릭: 배치된 코돈 → 해제, 빈 슬롯 → 활성 전환
- 동일 코돈 중복 배치 방지: `isPlaced` 참조 비교로 체크

### 3. 상호작용 미리보기
- 3자리 모두 채워진 경우: `previewInteractions()` 시스템 함수 활용
- 부분 채움: `getInteractionForPair()` 로 각 쌍 독립 계산 (양쪽 코돈 있을 때만)
- 심볼: ◎(공명) / ⚡(대립) / ◈(융합)

### 4. TypeScript 타입 주의사항
- `THEME.colors.textDim`은 string 리터럴 타입(`'#808090'`)
- `getInteractionColor()`는 number 반환
- 같은 `let` 변수에 두 타입을 혼용하면 `as string` 캐스팅 필요
- 해결: 처음부터 hex string 변수를 사용하고, number → string 변환은 즉시 수행

### 5. 마스크 좌표
- 마스크는 월드 좌표 기준 — 컨테이너 로컬 좌표가 아님
- `THEME.layout.workbench.assemble.assemblerX` + `THEME.layout.workbench.contentY` 사용
- CraftingInventory의 `poolX` 기반 마스크 패턴 참고

### 6. poolChanged 이벤트 핸들링
- 외부에서 코돈 삭제 시 슬롯에 배치된 코돈이 무효화될 수 있음
- `onPoolChanged`에서 `creature.codonPool.includes()` 로 검증 후 null 처리
- 이벤트 구독 해제는 `destroy()`에서 반드시 수행

## 파일 의존성
- `src/data/types.ts` — Codon, Sequence, InteractionType
- `src/data/codons.ts` — AMINO_ACIDS
- `src/systems/sequence-builder.ts` — createSequence, previewInteractions, filterByRole
- `src/systems/pool-manager.ts` — SEQUENCE_POOL_MAX
- `src/ui/lab/theme.ts` — THEME, getRoleColor, getRarityLabel, getInteractionColor
