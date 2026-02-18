---
phase: "5"
modules: [LabScene]
date: 2026-02-18
---
# Phase 5: LabScene 시스템 연동 학습 기록

## 결정 사항

### SAMPLE_CREATURE 제거 → CreatureFactory 연동
- `generateRandomCreature()`로 실험체 3마리 자동 생성 (첫 진입 시)
- `sample.ts`의 `SAMPLE_CREATURE` import 완전 제거
- 실험체 목록(`creatures: Creature[]`)과 활성 인덱스(`activeCreatureIndex`)로 관리
- `get creature()` 접근자로 현재 선택 실험체 참조

### 실험체 전환 UI
- 좌측 패널 상단에 이전/다음 버튼 (◀ ▶) 배치
- `switchCreature(delta)`: 은퇴/사망 실험체를 건너뛰고 활성 실험체만 순환
- 실험체 전환 시 빌드 슬롯 리셋 + `scene.restart()`로 UI 전체 재구성
- 네비게이션 텍스트: `"1/3 (활성:3)"` 형식

### 열화 정보 표시
- `getDegradationLevel(creature)`, `isRetirementReady(creature)` 활용
- 출격 횟수 + 열화 레벨 표시, 열화 3 초과 시 경고색(#ffaa44)
- 은퇴 권장 상태면 빨간 경고 텍스트 + 이름도 빨간색

### 빌드 유효성 검증 → 출격 게이트
- `createBuild(plasmid, sequences)`로 빌드 생성
- `validateBuild(build, creature)`로 유효성 검증
- 검증 실패 시 요약 텍스트에 첫 번째 에러 표시, 출격 차단
- 검증 통과 후 `trackExpedition(creature)`로 출격 기록 → BattleScene 전환

### BuildAnalyzer 연동 (빌드 요약)
- 빌드 완성 시(4시퀀스 + 1플라스미드) `getRoleDistribution(build)` 호출
- `getInteractionDistribution(build)` 호출
- 요약 텍스트에 역할 태그 분포(`D:N S:N O:N C:N`)와 상호작용 분포(`공명:N 대립:N 융합:N`) 표시
- 미완성 빌드에서는 기본 요약만 표시

### 풀 요약 표시
- 실험체 패널 하단에 코돈/시퀀스/촉매 풀 현황 (`코돈: 15  시퀀스: 6  촉매: 4`)

## 주의점

1. **scene.restart() 사용**: 실험체 전환 시 Phaser scene 재시작으로 전체 UI 재구성. `creatures` 배열은 인스턴스 변수라 유지됨. 성능 최적화가 필요하면 부분 갱신으로 전환 가능
2. **BattleScene에 데이터 전달**: `scene.start("BattleScene", { build, creature })` — build와 creature를 씬 데이터로 전달. BattleScene에서 `this.scene.settings.data`로 수신
3. **빌드 분석은 요약 갱신마다 재계산**: createBuild + getRoleDistribution + getInteractionDistribution이 매번 호출됨. 현재 빌드 크기(4시퀀스 × 3코돈)에서는 성능 문제 없음
4. **은퇴/사망 실험체 필터링**: switchCreature에서만 필터링. 직접 activeCreatureIndex를 조작하면 은퇴 실험체가 선택될 수 있음

## 패턴

### 씬 상태 유지 패턴
Phaser scene의 인스턴스 변수(`creatures`, `activeCreatureIndex`)는 `scene.restart()` 후에도 유지됨. `create()`에서 `creatures.length === 0` 체크로 첫 진입과 재진입을 구분.

### 빌드 완성 검증 흐름
```
plasmid 선택 → 시퀀스 4개 배치 → updateSummary()
  → isComplete? → createBuild() → validateBuild()
  → 통과 시 출격 버튼 활성화 + 분석 결과 표시
  → 클릭 시 trackExpedition() → BattleScene 전환
```

### 연동된 시스템 모듈
| 모듈 | import | 사용처 |
|------|--------|--------|
| creature-factory | `generateRandomCreature` | 실험체 초기 생성 |
| build-manager | `createBuild`, `validateBuild` | 빌드 생성 + 검증 |
| build-analyzer | `getRoleDistribution`, `getInteractionDistribution` | 빌드 요약 표시 |
| degradation | `getDegradationLevel`, `isRetirementReady`, `trackExpedition` | 열화 표시 + 출격 기록 |
| stats | `deriveStats` | 파생 스탯 계산 |
| interaction | `analyzeSequence` | 시퀀스 내 인접 상호작용 분석 |
