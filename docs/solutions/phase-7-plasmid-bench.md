# Phase 7: PlasmidBench 구현 학습 기록

## 사용한 Phaser API 패턴

### Container 기반 복합 UI
- `Phaser.GameObjects.Container` 상속 + 내부에 하위 Container 분리 (creatureContainer, selectorContainer)
- 하위 Container를 사용하면 영역별 `removeAll(true)` + 재구성이 깔끔함

### Graphics를 이용한 카드 UI
- `fillRoundedRect` + `strokeRoundedRect`로 카드 배경 + 테두리
- 선택 상태에 따라 `lineStyle` 두께/색상 변경 (금색 2px vs 회색 1px)
- 왼쪽 카테고리 색상 바: `fillRect`로 4px 너비 컬러바

### 클릭 영역 (Zone)
- `scene.add.zone().setInteractive({ useHandCursor: true })` 패턴
- zone은 반드시 selectorContainer에 `add()`해야 컨테이너 이동 시 함께 움직임

## 주의할 점

### 컨테이너 좌표 체계
- Container에 추가된 자식 요소의 좌표는 Container 기준 로컬 좌표
- 클릭 Zone도 Container 안에 넣어야 정확한 위치에 반응

### removeAll(true) 사용 시
- `true`를 넘겨야 자식 GameObject가 파괴됨 (메모리 정리)
- Graphics, Text, Zone 모두 파괴 대상
- 단, Container 자체에 붙은 이벤트 리스너는 유지됨

### THEME 레이아웃 상수
- `THEME.layout.workbench.plasmid`에 작업대별 위치/크기 정의
- `as const` 타입이므로 직접 숫자 리터럴 타입이 추론됨

## 향후 개선 아이디어
- 플라스미드 카드 호버 시 상세 설명 툴팁
- 카드 선택 시 좌측 CreatureInfo에 플라스미드 효과 미리보기 반영
- 열화 상태 바를 시각적 게이지로 표현
- 역할 분포를 PoolSummary에서 색상 바로 시각화
