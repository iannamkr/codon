# Codon 개발 계획서

> 최종 갱신: 2026-02-19
> 상태: **기획 설계 완료** — 코어 데이터 구현 단계 진입 가능

---

## 설계 완료 현황

| # | 문서 | 상태 | 내용 |
|---|------|------|------|
| 009 | `docs/discussion/009-Gene배열-전투시스템-재설계.md` | ✅ 완료 | 전투 시스템 전면 재설계 (9대 결정) |
| 010 | `docs/design/010-amino-acid-passives.md` | ✅ 완료 | 아미노산 패시브 20종 (바이오펑크 네이밍, 컬러코딩) |
| 011 | `docs/design/011-enzyme-effects.md` | ✅ 완료 | 효소(조커) 26종 (4역할×6 + Stop×2, 연구원 도구 테마) |
| 012 | `docs/design/012-combat-formulas.md` | ✅ 완료 | 전투 공식 (HP 듀얼 트랙, 동종 진화 ×1.5+옵션 병합, 꼬리 귀환+탈진) |
| 013 | `docs/design/013-mutation-system.md` | ✅ 완료 | 변이 시스템 (5등급 변이 풀, MUT 3축 제어, 키메라 이중 타입) |
| 014 | `docs/design/014-attribute-system.md` | ✅ 완료 | 체질 시스템 (6종 계수 변경, 유전+환경, 혼합 불가) |
| 015 | `docs/design/015-plasmid-redesign.md` | ✅ 완료 | 플라스미드 12종 역설계 (코어 규칙 1:1 매핑, 매운맛 튜닝) |

→ **전 설계 문서 완료** → 코어 데이터부터 전투 엔진까지 구현 착수 가능

---

## ⚠️ 기존 구현 상태

### 무효화된 모듈

| 모듈 | 상태 | 이유 |
|------|------|------|
| `src/systems/interaction.ts` | **무효** | 인접 상호작용(공명/대립/융합) 폐기 |
| `src/systems/sequence-builder.ts` | **무효** | 시퀀스 개념 폐기 |
| `src/systems/build-manager.ts` | **재작성 필요** | 빌드 = 12 Gene + 효소 4개로 변경 |
| `src/systems/build-analyzer.ts` | **재작성 필요** | 분석 기준 변경 |
| `src/data/plasmids.ts` | **보류** | 플라스미드 재설계 대기 |
| `src/data/elements.ts` | 전이 효과 부분 무효 | 속성 상성은 유효, 전이 효과 테이블 무효 |
| `src/ui/lab/*` | **재작성 필요** | UI 구조 전면 변경 |

### 유효한 모듈

| 모듈 | 상태 | 비고 |
|------|------|------|
| `src/data/types.ts` | 부분 유효 | Gene/Codon 타입은 유효, Sequence/Build 타입 재정의 필요 |
| `src/data/codons.ts` | ✅ 유효 | 64 코돈 → 20 아미노산 매핑 그대로 |
| `src/data/sub-genes.ts` | ✅ 유효 | 40종 하위 Gene 이름/설명 그대로 |
| `src/systems/stats.ts` | ✅ 유효 | 스탯 파생 공식 그대로 |

---

## 새 개발 계획

### 우선순위 1: 코어 데이터 재작성 ⬅️ **다음 단계**

기획 확정 완료. 구현 착수 가능.

```
src/data/types.ts            → Gene/DNAChain/Enzyme 타입 재정의
src/data/amino-acids.ts      → 20종 아미노산 기본 패시브 효과 데이터 (010 기반)
src/data/enzymes.ts          → 26종 효소 목록 (011 기반)
```

### 우선순위 2: 전투 엔진 재작성

```
src/systems/battle/
  ├── chain-scanner.ts       → 3칸 윈도우 스캐닝 + 코돈 판정
  ├── matchup-resolver.ts    → 순환 상성 A>T>G>C>A 판정
  ├── combat-round.ts        → Gene 1:1 전투 (돌파/교대/동등)
  ├── phase-manager.ts       → 3라운드 = 1페이즈, 코돈 효과 재평가
  ├── amino-acid-engine.ts   → 아미노산 패시브 발동 (오라/즉발/스택)
  ├── enzyme-trigger.ts      → 효소 조건 체크 + 효과 발동 (패턴/조건/이벤트)
  ├── frameshift.ts          → 프레임시프트 처리
  ├── survivor-pool.ts       → Survivor Pool 관리
  └── battle-engine.ts       → 통합 엔진
```

### 우선순위 3: 실험체 시스템

```
src/systems/creature/
  ├── crystallization.ts     → 12칸 결정화 (잠김 관리)
  ├── splicing.ts            → CRISPR/Splicing (빈 칸에 Gene 삽입)
  └── lifecycle.ts           → 탄생/성장/노화/결정화/은퇴
```

### 우선순위 4: 연구실 UI 재작성

```
DNA Chain 12칸 배치 UI (컬러코딩: 🔴🟢🔵🟣)
효소(조커) 4슬롯 장착 UI (역할 색상 라벨 + 트리거 아이콘)
아미노산 패시브 프리뷰 (바이오펑크 기관 이름 + 툴팁에 학술명)
Gene 인벤토리 (일체형 아이템 목록)
족보 프리뷰 + 효소 매칭 상태
```

### 우선순위 5: 플라스미드 역설계

코돈(아미노산) + 효소 확립 완료 → 역설계 조건 충족.
유저 선호 콤보 파악 → 그 콤보를 비트는 플라스미드 설계.

---

## 병렬화 전략

```
[완료] 010: 아미노산 패시브 20종  ─┐
[완료] 011: 효소 26종              ─┤
                                   ├→ [구현] 코어 데이터 → 전투 엔진 → 실험체 → UI
[구현] types.ts 재정의             ─┘  (순차)
                                          ↓
                                   [기획] 플라스미드 역설계 (병렬 가능)
```

기획 완료. 구현은 데이터 → 엔진 → 실험체 → UI 순차.
플라스미드 기획은 구현과 병렬 진행 가능.
