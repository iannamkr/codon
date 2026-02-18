# 플라스미드대 Mewgenics 스타일 개선 계획

## Context

플라스미드대(실험체대)가 현재 정적인 데이터 나열 수준이다. Mewgenics의 '유기적이고 살아있는 듯한' 느낌을 코드로 구현하여 4가지 개선을 적용한다:
1. 실험체 동적 렌더링 (흔들림 + 열화 시각화)
2. 스탯 델타 프리뷰 (플라스미드 호버 시)
3. 드래그 & 인젝트 (물리적 주입)
4. 유기적 패널 스타일 (비정형 윈도우)

## 설계 결정

- **스탯 델타**: `statMultiplier` 변경 플라스미드(순수 서열)는 수치 델타 표시, 나머지는 BattleConfig 변경 텍스트 요약
- **드래그**: 클릭 선택을 fallback으로 유지, 드래그는 추가 레이어
- **유기적 테두리**: 정적 노이즈 (렌더 시 1회 생성, 프레임당 재계산 안 함)

## 구현 순서 및 병렬화

```
[병렬] Step 1: organic-rect.ts (유틸리티)
[병렬] Step 2: getDegradationVisuals() (degradation.ts 추가)
[병렬] Step 3: plasmid-preview.ts (순수 함수)
  ↓ 모두 완료 후
[순차] Step 4~8: PlasmidBench.ts 수정 (4→1a→1b→2→3 순서)
```

## 수정 파일

### 1. 새 파일: `src/ui/lab/organic-rect.ts`

유기적 사각형 렌더링 유틸리티. `fillRoundedRect` 대체.

```typescript
export interface OrganicRectOptions {
  seed?: number;        // 노이즈 시드 (같은 시드 = 같은 형태)
  amplitude?: number;   // 변형 크기 (px, 기본 1.5)
  segments?: number;    // 변당 분할 수 (기본 8)
}

// 순수 함수 (테스트 가능)
export function generateOrganicVertices(
  x: number, y: number, w: number, h: number,
  options?: OrganicRectOptions,
): { x: number; y: number }[]

// Phaser Graphics에 그리기
export function drawOrganicRect(graphics, x, y, w, h, options?): void
export function strokeOrganicRect(graphics, x, y, w, h, options?): void
```

알고리즘: 사각형 4변을 segments개로 분할 → 각 정점에 수직 방향으로 `seededRandom * amplitude` 오프셋 → `beginPath/moveTo/lineTo/closePath/fillPath`

### 2. 수정: `src/systems/degradation.ts` — `getDegradationVisuals()` 추가

```typescript
export function getDegradationVisuals(creature: Creature): {
  darkenFactor: number;      // 0~0.4
  borderColor: number | null; // null = 테두리 없음
  borderAlpha: number;
}
```

- Level 0: darken 0, border null
- Level 3: darken 0.24, border 0xcc9933
- Level 4+: darken 0.32+, border 0xcc3333

### 3. 새 파일: `src/systems/plasmid-preview.ts`

플라스미드 효과 미리보기 순수 함수. 기존 `deriveStats()` + `applyPlasmidRules()` 재사용.

```typescript
export interface StatDelta {
  key: string; label: string;
  before: number; after: number; delta: number;
}

export interface ConfigChange {
  key: string; label: string;
  before: string; after: string;
}

export interface PlasmidPreviewResult {
  statDeltas: StatDelta[];
  configChanges: ConfigChange[];
  hasStatChange: boolean;
}

export function previewPlasmidEffect(
  plasmid: Plasmid, baseStats: Stats, constitution: Constitution,
): PlasmidPreviewResult
```

로직:
1. `deriveStats(baseStats, constitution)` → before 기준
2. `applyPlasmidRules(plasmid.id, createDefaultConfig())` → config 변경
3. `statMultiplier !== 1.0`이면 파생 스탯에 곱하기 → 델타 계산
4. 기본 config와 다른 필드마다 한글 레이블로 ConfigChange 생성

### 4. 수정: `src/ui/lab/PlasmidBench.ts` — 주요 변경

#### Feature 4: 유기적 패널 (organic-rect 적용)

`buildCreatureInfo()`, `buildPlasmidSelector()`, `buildPoolSummary()`의 `fillRoundedRect` → `drawOrganicRect()`로 교체. `redrawCreatureBg()`에서 열화 어둡기 + 유기적 형태 통합 렌더.

#### Feature 1a: 실험체 흔들림

```typescript
private wiggleTween: Phaser.Tweens.Tween | null = null;

private startWiggleAnimation(): void {
  if (this.wiggleTween) { this.wiggleTween.destroy(); this.wiggleTween = null; }
  const mutRatio = this.creature.stats.mut / STAT_MAX;
  if (mutRatio < 0.2) return; // 낮은 MUT은 흔들리지 않음

  const amplitude = mutRatio * 2;        // 최대 2px
  const rotAmplitude = mutRatio * 0.01;  // 최대 ~0.6도
  const speed = 400 + (1 - mutRatio) * 600; // 400~1000ms

  this.wiggleTween = this.scene.tweens.add({
    targets: this.creatureContainer,
    x: { from: L.creatureX - amplitude, to: L.creatureX + amplitude },
    rotation: { from: -rotAmplitude, to: rotAmplitude },
    duration: speed, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
}
```

호출 시점: `buildCreatureInfo()` 끝, `redrawCreatureInfo()` 끝

#### Feature 1b: 열화 시각화

`redrawCreatureBg()` 메서드 분리:
- `getDegradationVisuals()` 호출 → `darkenFactor`로 panelBg 색상 어둡게
- `borderColor` 있으면 `strokeOrganicRect()`로 경고 테두리
- `redrawCreatureInfo()` 시작에서 호출

#### Feature 2: 호버 프리뷰

플라스미드 카드 zone에 `pointerover`/`pointerout` 추가:

```typescript
zone.on('pointerover', () => this.showPlasmidPreview(index));
zone.on('pointerout', () => this.hidePlasmidPreview());
```

- `showPlasmidPreview(index)`: `previewPlasmidEffect()` 호출 → previewContainer에 델타값/config변경 오버레이
- `hidePlasmidPreview()`: previewContainer 파괴
- 스탯 델타: 파생 스탯 옆에 `(+N)` 녹색 / `(-N)` 적색 + pulse 트윈
- Config 변경: 열화 섹션 아래에 금색 텍스트 리스트

#### Feature 3: 드래그 & 인젝트

```typescript
private dragProxy: Phaser.GameObjects.Container | null = null;
private dropZoneGfx: Phaser.GameObjects.Graphics | null = null;
```

- `renderPlasmidCard()`에서 `scene.input.setDraggable(zone)` + drag 이벤트 연결
- `buildDropZone()`: 실험체 패널을 dropZone으로 설정
- `onDragStart()`: 반투명 카드 프록시 생성 + 드롭존 하이라이트 (pulse 테두리)
- `onDragMove()`: 프록시 위치 갱신 + 드롭존 히트 판정
- `onDragEnd()`: 드롭 성공 시 → 인젝트 애니메이션 (카메라 shake + 프록시 수축 + 흰색 플래시) → `selectPlasmid()` 호출. 실패 시 → ease-back 복귀
- 좌표 변환: `getWorldTransformMatrix()` 사용 (workbenchContainer 중첩 고려)

이벤트 흐름은 기존과 동일:
```
드래그 드롭 → playInjectAnimation() → selectPlasmid(index) → emit('plasmidSelected') → LabScene
```

### 5. 수정: `src/scenes/LabScene.ts`

변경 없음. PlasmidBench의 `plasmidSelected` 이벤트 인터페이스가 동일하므로 기존 배선 그대로 작동.

## TDD 순서

1. `tests/ui/organic-rect.test.ts` — `generateOrganicVertices()` 단위 테스트
   - 같은 시드 → 같은 결과
   - 모든 정점이 amplitude 범위 내
   - 정점 수 = segments * 4
2. `tests/systems/degradation.test.ts` — `getDegradationVisuals()` 추가
   - Level 0/3/4/5 케이스
3. `tests/systems/plasmid-preview.test.ts` — `previewPlasmidEffect()` 테스트
   - 순수 서열: hasStatChange=true, HP +20%
   - 역행: hasStatChange=false, configChanges 2개
   - 과부하: maxPhases 4→5, codonsPerSequence 3→2

## 검증

- `npx tsc --noEmit` 통과
- `npm run test` 전체 통과 (기존 187 + 신규 ~15개)
- dev server: 플라스미드대 진입 → 흔들림 확인 → 카드 호버 → 델타 표시 → 드래그 → 인젝트 효과
