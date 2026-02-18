# LabScene 재구축 계획

## 해상도: 960×540 (확정, 유지)

## Context

사용자가 기존 Scene 파일(BootScene, LabScene, BattleScene)을 모두 삭제함. 핵심 문제: 이전 구현에서 **게임의 코어 메커닉이 빠져있었음** — Gene(A/T/G/C) 3개를 선택해서 코돈을 조합하고, 코돈 3개로 시퀀스를 구성하는 기능이 없었음. 시스템 레이어(12개 모듈)와 데이터 레이어는 정상 작동 중(177 테스트 통과). Scene만 처음부터 재구축.

## 사전 작업: 갭 분석 문서 저장

`docs/plan/lab-scene-gap-analysis.md`에 아래 갭 분석 결과를 저장:

1. **Gene → Codon 합성 UI** — Gene 3개 선택 → 아미노산 미리보기 → 하위 Gene 선택 → 코돈 생성
2. **코돈 풀 관리 UI** — 15개 코돈 조회/삭제/필터
3. **Codon → Sequence 구성 UI** — 코돈 3개 배치 → 인접 상호작용 실시간 프리뷰
4. **시퀀스 풀 관리 UI** — 6개 시퀀스 조회/편집/삭제
5. **플라스미드 선택** — 촉매 풀 4개에서 1개 선택
6. **빌드 조립** — 시퀀스 4개 배치 (플라스미드에 따라 2/4/5개 변동)
7. **빌드 분석 요약** — CLAUDE.md 형식에 따른 상세 데이터 표시
8. **출격 버튼** — 빌드 검증 → BattleScene 전환

## 아키텍처

**단일 Phaser Scene + 탭 패널 시스템**

- LabScene 1개 안에서 4개 탭 전환 (패널 show/hide)
- Scene 전환 없이 상태 공유 (Creature 객체 1개)
- 모달 오버레이로 상세 정보 표시
- 이미지 에셋 없음 → 모든 UI는 Phaser Graphics + Text로 코드 드로잉

### 화면 레이아웃 (960×540)

```
+--[ HEADER BAR (960×48) ]---------------------------------------------+
| 실험체: 알파-001  G1  Fire  맹공   STR:35 DEX:28 RES:22 MUT:30       |
+----------------------------------------------------------------------+
| [합성]  [코돈 풀]  [시퀀스]  [빌드]                                   |
+----------------------------------------------------------------------+
|                                                                      |
|                    WORKSPACE (960×412)                                |
|               (탭에 따라 내용 변경)                                    |
|                                                                      |
+----------------------------------------------------------------------+
| [출격 >>>]                                          코돈: 12/15      |
+----------------------------------------------------------------------+
```

## 파일 구조

```
src/scenes/
  BootScene.ts          — 폰트 로딩 + LabScene 전환
  LabScene.ts           — 메인 Scene (탭 관리, 실험체 상태)
  BattleScene.ts        — 스텁 (추후 구현)

src/ui/lab/
  theme.ts              — 색상/폰트/레이아웃 상수
  HeaderBar.ts          — 실험체 정보 (이름, 세대, 속성, 체질, 스탯)
  FooterBar.ts          — 출격 버튼, 풀 카운터
  TabBar.ts             — 4탭 네비게이션
  SynthesisPanel.ts     — [탭1] Gene→Codon 합성
  CodonPoolPanel.ts     — [탭2] 코돈 풀 관리
  SequencePanel.ts      — [탭3] 시퀀스 구성 + 풀 관리
  BuildPanel.ts         — [탭4] 플라스미드 선택 + 빌드 조립 + 분석

src/ui/shared/
  CodonCard.ts          — 코돈 카드 컴포넌트 (triplet + 아미노산 + 하위Gene + 역할태그)
  SequenceStrip.ts      — 코돈 3개 + 인접 상호작용 표시
  GeneButton.ts         — A/T/G/C 선택 버튼
  SubGeneList.ts        — 하위 Gene 10개 선택 리스트
  ScrollContainer.ts    — 마스크 기반 스크롤 컨테이너
```

## 탭별 상세 설계

### 탭 1: 합성 (SynthesisPanel)

Gene 3개를 선택하여 코돈을 조합하는 핵심 크래프팅 UI.

```
STEP 1: 염기 선택 (왼쪽)        STEP 2: 하위 Gene 선택 (오른쪽)
+-------+-------+-------+      +---------------------------+
| [ A ] | [ T ] | [ G ] |      | Pos1(A): ○강타 ○폭발 ●관통 ...|
| 파괴  | 생존  | 질서  |      | Pos2(T): ●보호 ○회복 ○반격 ...|
+-------+-------+-------+      | Pos3(G): ○가속 ●정밀 ○안정 ...|
 Slot1   Slot2   Slot3         +---------------------------+

STEP 3: 결과 미리보기 (하단)
+------------------------------------------------------+
| ATG = 메티오닌 [기폭★]  Destroy  "첫 발동 시 위력 ×2.0"  |
| A-관통(DEF-10% 무시)  T-보호(방어+10%)  G-정밀(크리+5%)  |
+------------------------------------------------------+
                                       [ 합성하기 ]
```

**사용하는 API:**
- `CODON_TABLE[triplet]` → 아미노산 ID 조회
- `AMINO_ACIDS[id]` → 스킬명, 설명, 희귀도, 역할태그
- `getSubGenesForGene(gene)` → 하위 Gene 10개
- `createCodon(triplet, [i0, i1, i2])` → 코돈 생성
- `addCodon(pool, codon)` → 풀에 추가

### 탭 2: 코돈 풀 (CodonPoolPanel)

```
필터: [전체] [Destroy] [Survive] [Order] [Chaos]
+-------------+ +-------------+ +-------------+ +-------------+
| ATG 기폭 ★  | | TTT 폭발    | | CAA 반사    | | CTA 가속    |
| Destroy     | | Destroy     | | Survive     | | Order       |
| A-관통      | | T-보호      | | C-폭주      | | C-전파      |
| T-보호      | | T-회복      | | A-처형      | | T-은신      |
| G-정밀      | | T-반격      | | A-관통      | | A-처형      |
+------[X]----+ +------[X]----+ +------[X]----+ +------[X]----+
                                              [ 12/15 코돈 ]
```

4열 그리드, 스크롤 가능. 필터/삭제/탭 전환.

**사용하는 API:** `filterByRole()`, `removeCodon()`

### 탭 3: 시퀀스 (SequencePanel)

두 가지 서브모드: **구성 모드** + **풀 보기**

구성 모드:
```
시퀀스 슬롯:
[코돈1: ATG 기폭★] —융합— [코돈2: CTA 가속] —공명— [코돈3: AAA 선제]
  Destroy              Order              Order

인접 상호작용:
  1-2: 융합(Destroy+Order) → "집중" → 크리확률 +10%
  2-3: 공명(Order+Order) → "가속장" → SPD 보너스

─── 코돈 풀에서 선택 ───
[ATG★] [TTT] [CAA] [CTA] [CAT] [AAT] ...
                                        [ 시퀀스 생성 ]
```

**사용하는 API:** `previewInteractions()`, `createSequence()`, `addSequence()`

### 탭 4: 빌드 (BuildPanel)

```
플라스미드: [역행] "SPD 선후공 제거 → 슬롯 역순 발동"  [변경]

Phase 1: [SEQ: 공격형]  Phase 2: [SEQ: 방어형]
Phase 3: [SEQ: 빠른형]  Phase 4: [SEQ: 카오스형]

빌드 분석:
  역할: Destroy 3 | Survive 3 | Order 3 | Chaos 3
  상호작용: 공명 4 | 대립 2 | 융합 2
```

**사용하는 API:** `createBuild()`, `validateBuild()`, `swapSequence()`, `swapPlasmid()`, `getRoleDistribution()`, `getInteractionDistribution()`, `getRarityDistribution()`

## 색상 테마

```typescript
// Gene 역할 색상 (2축 시스템)
geneA: 0xff4444,  // 파괴 - 빨강
geneT: 0x44bb44,  // 생존 - 초록
geneG: 0x4488ff,  // 질서 - 파랑
geneC: 0xcc44cc,  // 혼돈 - 보라

// 상호작용 색상
resonance:  0xffcc00,  // 공명 - 금색
opposition: 0xff6633,  // 대립 - 주황
fusion:     0x33ccff,  // 융합 - 시안

// UI 기본
bg: 0x0a0a0f, panelBg: 0x14141f, cardBg: 0x1e1e2e
textMain: 0xe0e0e0, textDim: 0x808090, textGold: 0xffd700
```

## 구현 순서

### Phase A: 기반 (BootScene + LabScene 골격 + 공용 컴포넌트)

| 단계 | 파일 | 내용 |
|------|------|------|
| A1 | `src/ui/lab/theme.ts` | 색상, 폰트, 레이아웃 상수 |
| A2 | `src/scenes/BootScene.ts` | Galmuri11 폰트 로딩 → LabScene 전환 |
| A3 | `src/scenes/BattleScene.ts` | 최소 스텁 (main.ts 임포트 에러 방지) |
| A4 | `src/ui/lab/HeaderBar.ts` | 실험체 정보 표시 |
| A5 | `src/ui/lab/TabBar.ts` | 4탭 네비게이션 |
| A6 | `src/ui/lab/FooterBar.ts` | 출격 버튼 + 풀 카운터 |
| A7 | `src/scenes/LabScene.ts` | Scene 골격: 탭 전환, 실험체 상태 관리 |

### Phase B: 핵심 크래프팅 (합성 + 코돈 풀)

| 단계 | 파일 | 내용 |
|------|------|------|
| B1 | `src/ui/shared/GeneButton.ts` | A/T/G/C 선택 버튼 |
| B2 | `src/ui/shared/SubGeneList.ts` | 하위 Gene 10개 선택기 |
| B3 | `src/ui/shared/CodonCard.ts` | 코돈 카드 컴포넌트 |
| B4 | `src/ui/lab/SynthesisPanel.ts` | 합성 탭 전체 |
| B5 | `src/ui/shared/ScrollContainer.ts` | 마스크 기반 스크롤 |
| B6 | `src/ui/lab/CodonPoolPanel.ts` | 코돈 풀 탭 |

### Phase C: 시퀀스 빌딩

| 단계 | 파일 | 내용 |
|------|------|------|
| C1 | `src/ui/shared/SequenceStrip.ts` | 코돈 3개 + 상호작용 라벨 |
| C2 | `src/ui/lab/SequencePanel.ts` | 시퀀스 구성 + 풀 관리 |

### Phase D: 빌드 조립

| 단계 | 파일 | 내용 |
|------|------|------|
| D1 | `src/ui/lab/BuildPanel.ts` | 플라스미드 + 페이즈 배치 + 빌드 분석 |
| D2 | LabScene.ts 연동 | 출격 → validateBuild → BattleScene 전환 |

## 재사용할 기존 시스템 (수정 불필요)

| 파일 | 용도 |
|------|------|
| `src/data/codons.ts` | CODON_TABLE, AMINO_ACIDS, getAminoAcid() |
| `src/data/sub-genes.ts` | SUB_GENES, getSubGenesForGene() |
| `src/data/plasmids.ts` | PLASMIDS, getPlasmidById() |
| `src/data/elements.ts` | getElementMultiplier(), getTransitionEffect() |
| `src/data/sample.ts` | SAMPLE_CREATURE (개발 중 기본 데이터) |
| `src/data/types.ts` | 모든 타입 정의 |
| `src/systems/creature-factory.ts` | createCodon(), createRandomCodon() |
| `src/systems/pool-manager.ts` | addCodon(), removeCodon(), addSequence(), removeSequence() |
| `src/systems/sequence-builder.ts` | createSequence(), previewInteractions(), filterByRole() |
| `src/systems/build-manager.ts` | createBuild(), validateBuild(), swapSequence(), swapPlasmid() |
| `src/systems/build-analyzer.ts` | getRoleDistribution(), getInteractionDistribution() |
| `src/systems/interaction.ts` | getInteractionType(), analyzeSequence() |
| `src/systems/stats.ts` | deriveStats() |

## 상태 관리

```typescript
// LabScene 내부 상태
class LabScene extends Phaser.Scene {
  creature: Creature;        // SAMPLE_CREATURE로 초기화
  currentBuild: Build | null;
  activeTab: number;         // 0~3

  // 풀 변경 시 이벤트로 UI 갱신
  // this.events.emit('poolChanged') → FooterBar 카운터 갱신
}
```

## 주의사항

1. **이미지 에셋 없음** — assets 디렉토리에 이미지 파일 없음. 모든 UI는 `Phaser.GameObjects.Graphics`와 `Text`로 그려야 함
2. **폰트** — `public/assets/fonts/Galmuri11.ttf` 존재. index.html에서 @font-face로 이미 로딩됨. BootScene에서 `document.fonts.ready` 대기
3. **pool-manager 배열 뮤테이션** — addCodon/removeCodon은 원본 배열을 직접 변경함. UI 갱신 필요
4. **코돈 재사용** — 같은 코돈이 여러 시퀀스에서 참조 가능. 삭제 시 시퀀스 참조 체크 필요
5. **플라스미드별 시퀀스 수** — 기본 4, 과부하 5, 압축 2 (getRequiredSequenceCount)
6. **main.ts** — BootScene, LabScene, BattleScene 모두 임포트하므로 3개 파일 모두 존재해야 함

## 팀 구성 (병렬 에이전트)

| 에이전트 | 담당 Phase | 작업 내용 |
|----------|-----------|----------|
| `foundation` | A (기반) | BootScene, BattleScene 스텁, theme.ts, HeaderBar, TabBar, FooterBar, LabScene 골격 |
| `crafting` | B (크래프팅) | GeneButton, SubGeneList, CodonCard, SynthesisPanel, ScrollContainer, CodonPoolPanel |
| `build-seq` | C+D (시퀀스+빌드) | SequenceStrip, SequencePanel, BuildPanel, 출격 연동 |

### 에이전트 규칙
- **Compound Engineering 개발 루프**: Research → Plan → Implement → Review → Compound
- **TDD**: 테스트 코드 먼저 작성 → 구현 → 리팩터
- **코드 주석**: 변경 시 주석으로 변경 사유 간략 명시
- **기존 기능 보호**: 시스템 레이어 수정 없음, 기존 177 테스트 전부 통과 유지
- **Phaser 아키텍처 유지**: 모든 UI는 Phaser GameObjects로 구현

### 의존관계
- `crafting`과 `build-seq`는 `foundation`의 theme.ts + LabScene 골격이 필요 → foundation 먼저 완료 후 시작

## 검증 방법

1. `npm run dev` → 브라우저에서 960×540 캔버스 확인
2. 합성 탭: Gene 3개 선택 → 아미노산 프리뷰 → 하위 Gene 선택 → 합성하기 → 코돈 풀에 추가 확인
3. 코돈 풀 탭: 코돈 카드 그리드 표시, 필터 동작, 삭제 동작
4. 시퀀스 탭: 코돈 3개 배치 → 상호작용 실시간 표시 → 시퀀스 생성
5. 빌드 탭: 플라스미드 선택 → 시퀀스 4개 배치 → 분석 표시
6. 출격 버튼: 빌드 미완성 시 경고, 완성 시 BattleScene 전환
7. `npm run test` → 기존 177 테스트 전부 통과 확인 (시스템 레이어 변경 없으므로)
