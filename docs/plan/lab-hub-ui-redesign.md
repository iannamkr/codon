# LabScene 허브 UI 리디자인 기획

## 배경

기존 LabScene은 4개 탭 전환 방식(합성/코돈풀/시퀀스/빌드)으로 구현됨. 문제점:
- "시뮬레이터 설정 화면"처럼 보임 → 게임 느낌 부족
- 화면 이동이 많아 몰입 깨짐
- 리스트/텍스트 중심 → 오브젝트/보드 느낌 없음
- 빌드 변경 시 시각적 피드백 부족

## 목표

**단일 연구실 허브 + 중앙 빌드보드 고정 + 패널 모드 전환**으로 "유전자 슬롯머신 연구실" 게임 느낌 달성.

핵심 UX 원칙:
- 화면 수 최소화 (1개 허브), 작업 모드만 분리
- 중앙 '빌드 보드'는 절대 사라지지 않음
- 리스트/텍스트 → 오브젝트/보드/트레이 중심
- 변경 즉시 시각적 피드백 (빛/연결선/아이콘/애니메이션)
- 숫자 나열 → 그래프/면적 중심

## 레이아웃 (960×540)

```
+─── TopHUD (960×56) ──────────────────────────────────────────+
│  알파-001  G1  [Fire]  맹공   ■STR:35  ■DEX:28  ■RES:22     │
+──────────────────────────────────────────────────────────────+
│ LeftPanel   │     CenterBoard (BuildBoard)    │  RightPanel  │
│   (280px)   │          (400px)                │   (280px)    │
│             │  [플라스미드: 역행 — 전투]       │              │
│  모드별     │  ┌─Phase1─┐  ┌─Phase2─┐        │  모드별      │
│  내용 변경  │  │[■][■][■]│  │[■][■][■]│       │  내용 변경   │
│             │  └────────┘  └────────┘        │              │
│             │  ┌─Phase3─┐  ┌─Phase4─┐        │              │
│             │  │[■][■][■]│  │[■][■][■]│       │              │
│             │  └────────┘  └────────┘        │              │
│   h=400     │       h=400                    │    h=400     │
+──────────────────────────────────────────────────────────────+
│ [초기화]     [====  출격 >>>  ====]    [빌드][합성][인벤]     │
│              ✅ 출격 가능                        코돈:12/15  │
+─── ActionBar (960×84) ───────────────────────────────────────+
```

### 영역별 크기

| 영역 | Y | H | W | 비고 |
|------|---|---|---|------|
| TopHUD | 0 | 56 | 960 | 실험체 정보 |
| MiddleArea | 56 | 400 | 960 | 3컬럼 |
| - LeftPanel | 56 | 400 | 280 | x=0 |
| - CenterBoard | 56 | 400 | 400 | x=280 |
| - RightPanel | 56 | 400 | 280 | x=680 |
| ActionBar | 456 | 84 | 960 | 출격/모드/상태 |

## 모드 시스템

탭 제거. 모드 버튼(ActionBar 우측)으로 전환. 중앙 BuildBoard는 항상 보임.

| 모드 | 좌 패널 | 우 패널 | 설명 |
|------|---------|---------|------|
| **BUILD** (기본) | CodonTray (필터+칩 그리드) | BuildAnalysis (그래프+검증) | 빌드 조립 |
| **SYNTH** | SynthesisBench (Gene 3선택) | GeneInfo (하위 Gene 선택) | 코돈 합성 |
| **INVENTORY** | CodonInventory (목록+삭제) | CodonDetail (상세 정보) | 코돈 관리 |

모드 전환 시 좌/우 패널이 **슬라이드 애니메이션**으로 교체됨. 중앙은 그대로.

## 주요 컴포넌트 설계

### BuildBoard (중앙 고정, 400×400)

게임의 심장. 빌드 상태를 시각적으로 보여주는 중앙 보드.

구성:
- **PlasmidCard** (상단, 380×36): 선택된 플라스미드 + [변경] 버튼
- **SequenceSlot 4개** (2×2 그리드, 각 186×155):
  - Phase 라벨
  - CodonChip 3개 수평 배치 (52×68 each)
  - 코돈 사이 상호작용 아이콘 2개 (공명/대립/융합)
  - [교체][비우기] 버튼
  - 역할태그 요약
- **검증 요약** (하단): ✅/❌ + 메시지

빈 슬롯: 점선 외곽 + "시퀀스 선택" 텍스트

### CodonChip (공용 컴포넌트)

2가지 모드:
- **보드 모드** (52×68): 컴팩트. 좌측 역할 컬러바 + triplet + 스킬명 + 역할태그
- **트레이 모드** (130×50): 넓은 형태. "ATG 기폭 ★" + "Destroy" 2줄

### TopHUD (56px)

HeaderBar 대체. 2줄 레이아웃:
- Row1: 실험체 이름 + 세대 뱃지 + 속성(컬러 아이콘) + 체질
- Row2: STR/DEX/RES/MUT 미니 막대 + 풀 카운터(우측)

### ActionBar (84px)

FooterBar+TabBar 통합. 3영역:
- 좌(x=8~200): [빌드 초기화] + 1줄 상태 메시지
- 중앙(x=320~640): **출격 버튼**(200×48, 네온 글로우 맥동/잠금)
- 우(x=700~952): 모드 버튼 [빌드][합성][인벤] (76×32 each)

### 패널 6개 (각 280×400)

| 패널 | 모드 | 위치 | 핵심 내용 |
|------|------|------|----------|
| CodonTray | BUILD | 좌 | 필터칩 5개 + 2열 코돈 칩 그리드 + 풀카운터 |
| BuildAnalysis | BUILD | 우 | 역할 막대 4줄 + 상호작용 막대 3줄 + 희귀도 + 검증 |
| SynthesisBench | SYNTH | 좌 | Gene 슬롯 3행(×4 버튼) + 미리보기 + 합성 |
| GeneInfo | SYNTH | 우 | 하위 Gene 제목 + 10개 라디오 + 설명 |
| CodonInventory | INVENTORY | 좌 | 필터바 + 리스트(36px/항목) + 삭제 |
| CodonDetail | INVENTORY | 우 | 풀사이즈 카드 + 시퀀스 참조 + 삭제 |

## 코돈 배치 플로우 (BUILD 모드 핵심)

1. BuildBoard의 SequenceSlot 클릭 → 해당 슬롯 **금색 테두리 하이라이트**
2. 슬롯 내 빈 CodonChip 위치 자동선택 (또는 직접 클릭으로 위치 지정)
3. CodonTray에서 코돈 칩 클릭 → 선택
4. LabScene이 시퀀스 데이터 갱신 → BuildBoard 갱신
5. 해당 칩 **흰색 플래시** + 상호작용 아이콘 **팝인** 애니메이션
6. BuildAnalysis **즉시 갱신** (그래프 값 변경)
7. 다음 빈 위치로 자동 이동

자동 배치 단축: 슬롯 미선택 시 첫 번째 빈 위치에 자동 배치.

## 시각 피드백 (필수 애니메이션)

| 상황 | 효과 | 사양 |
|------|------|------|
| 코돈 배치 | 흰색 플래시 | alpha 0.6→0, 0.3s fade |
| 상호작용 생성 | 아이콘 팝인 | scale 0→1, Back.easeOut, 0.2s |
| 모드 전환 | 패널 슬라이드 | 좌: x -280↔0, 우: x 960↔680, 0.2s |
| 출격 버튼 유효 | 네온 글로우 맥동 | alpha 0.15↔0.5, Sine, 1s, 반복 |
| 슬롯 선택 | 금색 테두리 맥동 | alpha 0.5↔1.0, 0.6s, 반복 |
| 합성 완료 | 코돈 트레이 진입 | y +20→0, alpha 0→1, 0.3s |

### 상호작용 시각 언어

| 타입 | 색상 | 아이콘 느낌 |
|------|------|------------|
| 공명(Resonance) | 금색(0xffcc00) | 전류/링 |
| 대립(Opposition) | 주황(0xff6633) | 번개/크랙 |
| 융합(Fusion) | 시안(0x33ccff) | 파동/소용돌이 |

## 상태 관리

```typescript
enum LabMode { BUILD, SYNTH, INVENTORY }

// LabScene 중앙 상태
state = {
  mode: LabMode.BUILD,
  creature: Creature,
  buildSlots: (Sequence | null)[],  // 플라스미드에 따라 2/4/5개
  selectedPlasmid: Plasmid | null,
  activeSlotIndex: number | null,   // 선택된 시퀀스 슬롯 (0~3)
  activeCodonPos: number | null,    // 슬롯 내 코돈 위치 (0/1/2)
}
```

이벤트 버스: `scene.events` (Phaser 내장).
패널은 상태를 직접 변경하지 않음 → 이벤트 발행 → LabScene 처리 → UI 갱신.

### 주요 이벤트

| 이벤트 | 발행자 | 구독자 |
|--------|--------|--------|
| `modeChanged` | LabScene | 좌/우 패널, ActionBar |
| `slotSelected` | BuildBoard | CodonTray, BuildAnalysis |
| `codonPlaced` | LabScene | BuildBoard, BuildAnalysis |
| `codonRemoved` | BuildBoard | BuildAnalysis |
| `plasmidChanged` | BuildBoard | BuildAnalysis, ActionBar |
| `poolChanged` | SynthesisBench, CodonInventory | BuildBoard, CodonTray, ActionBar |
| `buildValidated` | LabScene | ActionBar, BuildAnalysis |
| `codonSelected` | CodonTray/CodonInventory | 우측 패널 |

## 파일 구조

```
src/scenes/
  LabScene.ts               ← 전면 리라이트

src/ui/lab/
  theme.ts                  ← 레이아웃 상수 추가
  TopHUD.ts                 ← 신규
  ActionBar.ts              ← 신규
  BuildBoard.ts             ← 신규 (핵심)
  SequenceSlot.ts           ← 신규
  CodonChip.ts              ← 신규
  PlasmidCard.ts            ← 신규
  panels/
    CodonTray.ts            ← 신규
    BuildAnalysis.ts        ← 신규
    SynthesisBench.ts       ← 신규
    GeneInfo.ts             ← 신규
    CodonInventory.ts       ← 신규
    CodonDetail.ts          ← 신규

유지:
  src/ui/shared/GeneButton.ts, SubGeneList.ts, ScrollContainer.ts
  src/scenes/BootScene.ts, BattleScene.ts
  src/systems/*, src/data/* (수정 없음)

삭제 (완료 후):
  HeaderBar.ts, TabBar.ts, FooterBar.ts
  SynthesisPanel.ts, CodonPoolPanel.ts, SequencePanel.ts, BuildPanel.ts
  CodonCard.ts, SequenceStrip.ts
```

## 구현 순서

### Phase A: 기반
- theme.ts 수정 (3컬럼 레이아웃 상수)
- LabScene.ts 골격 (모드 상태머신 + 이벤트 배선)

### Phase B: 핵심 컴포넌트 (Phase A 이후)
- CodonChip → PlasmidCard → SequenceSlot → BuildBoard

### Phase C: 크롬 (Phase A 이후, B와 병렬)
- TopHUD, ActionBar

### Phase D: 패널 (Phase A 이후, D1만 B 이후)
- D1: CodonTray + BuildAnalysis (CodonChip 필요)
- D2: SynthesisBench + GeneInfo (독립)
- D3: CodonInventory + CodonDetail (독립)

### Phase E: 통합 (B+C+D 완료 후)
- LabScene 완성 (배선 + 배치 플로우 + 모드 전환 + 애니메이션)
- 기존 파일 삭제

## 성공 기준

1. 코돈을 **"조립 부품"처럼** 만지는 느낌
2. 빌드 변경 시 텍스트 읽기 전에 **빛/아이콘/그래프로 이해** 가능
3. 빌드 작업이 **화면 이동 없이 10초 내 반복 실험** 가능
4. `npx tsc --noEmit` 에러 0, `npm run test` 177 테스트 전부 통과
