# 시퀀스 피커 팝업 — 기존 시퀀스 선택 + 새 시퀀스 조립

## Context

빌드대에서 시퀀스 슬롯에 시퀀스를 배치할 때, 현재는 `sequencePool`에서 **이미 만들어진** 시퀀스만 선택 가능. 코돈풀에서 코돈 3개를 골라 새 시퀀스를 조립하는 흐름이 아예 없음.

**목표**: 하나의 팝업에서 기존 시퀀스 선택 OR 코돈 3개 골라 새 시퀀스 조립, 양쪽 다 가능하게.

## 팝업 레이아웃 (700×460, 중앙)

```
+── SequencePickerPopup (700×460) ─────────────────────────+
│ Phase N 시퀀스                                     ✕     │
│─────────────────────┬────────────────────────────────────│
│ 기존 시퀀스          │ 새 시퀀스 조립                      │
│                     │                                    │
│ ┌ ATG—TTT—CAT ────┐│ [Pos1: ???] ◎ [Pos2: ???] · [Pos3] │
│ │ Des/Des/Des      ││                                    │
│ │ ◎공명 ◈융합      ││ [전체][Des][Sur][Ord][Cha]         │
│ └──────────────────┘│ ┌ ATG 기폭 ★  Destroy ─┐         │
│ ┌ CAA—GTA—GCA ────┐│ ├ TTT 폭발    Destroy  ┤         │
│ │ Sur/Sur/Sur      ││ ├ TAT 각인 ☆  Order    ┤         │
│ │ ◎공명 ◎공명      ││ ├ ...      (스크롤)     ┤         │
│ └──────────────────┘│ └───────────────────────┘         │
│ ...                 │                                    │
│ (최대 6개, 스크롤)   │              [확정]                 │
│                     │                                    │
│─────────────────────┴────────────────────────────────────│
+──────────────────────────────────────────────────────────+
```

왼쪽(270px): 기존 시퀀스 목록 (사용중 표시, 클릭→즉시 배치+닫기)
오른쪽(400px): 코돈 3개 슬롯 + 상호작용 미리보기 + 필터 + 코돈풀 리스트 + [확정]

## 핵심 로직

### 코돈 배치 흐름
1. 활성 Pos (금색 테두리)에 코돈풀 목록에서 코돈 클릭 → 해당 Pos에 배치
2. 자동으로 다음 빈 Pos로 이동
3. Pos 클릭으로 수동 전환 가능
4. 3자리 다 채우면 상호작용 미리보기 표시 + [확정] 활성화

### 시퀀스풀 관리 (확정 시)
- 풀에 빈 자리 있으면 (`< 6`): 그냥 추가
- 풀 가득 참 (`= 6`) + 해당 슬롯에 기존 시퀀스 있음: 기존 시퀀스를 풀에서 제거 후 새 시퀀스 추가
- 풀 가득 참 + 슬롯 비어있음: 빌드에 사용되지 않는 시퀀스 1개 제거 후 추가. 전부 사용중이면 불가 (경고)

### 빈 슬롯 클릭 시 자동 팝업
- `slotSelected` 이벤트에서 해당 슬롯이 비어있으면 → 팝업 자동 오픈

## 수정 파일

| 파일 | 변경 |
|------|------|
| `src/ui/lab/SequencePickerPopup.ts` | **신규** — 분할 팝업 컴포넌트 |
| `src/scenes/LabScene.ts` | `showSequencePopup` 삭제 → `SequencePickerPopup` 사용, `onSlotSelected`에서 빈 슬롯이면 팝업 오픈 |

## 재사용하는 기존 코드

- `createSequence()` — `src/systems/sequence-builder.ts:15`
- `previewInteractions()` — `src/systems/sequence-builder.ts:23`
- `filterByRole()` — `src/systems/sequence-builder.ts:31`
- `addSequence()` / `removeSequence()` — `src/systems/pool-manager.ts:42,51`
- `SEQUENCE_POOL_MAX` — `src/systems/pool-manager.ts:9`
- `AMINO_ACIDS` — `src/data/codons.ts`
- `getRoleColor()`, `getRarityLabel()`, `getInteractionColor()` — `src/ui/lab/theme.ts`

## SequencePickerPopup 클래스 설계

```typescript
class SequencePickerPopup extends Phaser.GameObjects.Container {
  // 상태
  codonSlots: (Codon | null)[]  // [null, null, null]
  activePos: number             // 0~2
  activeFilter: FilterType      // 'all' | role
  scrollY: number

  // 이벤트
  emit('pick', { slotIndex, sequence, isNew })
  emit('closed')

  // 외부에서 호출
  constructor(scene, creature, slotIndex, usedSequenceIds)
  destroy()
}
```

**상태 변경 시 오른쪽 섹션 전체 rebuild** — 개별 요소 추적 없이 `rightContainer.removeAll(true)` 후 재생성. 팝업 내 인터랙션 빈도가 낮으므로 성능 문제 없음.

## LabScene 수정 사항

```typescript
// showSequencePopup → showSequencePicker 교체
private showSequencePicker(slotIndex: number) {
  const usedIds = new Set(this.buildSlots.filter(s => s).map(s => s!.id));
  const picker = new SequencePickerPopup(this, this.creature, slotIndex, usedIds);
  this.add.existing(picker);

  picker.on('pick', (data) => this.handleSequencePick(data));
  picker.on('closed', () => { /* cleanup */ });
}

// 빈 슬롯 클릭 → 팝업 자동 오픈
private onSlotSelected(data: { slotIndex: number }) {
  this.activeSlotIndex = data.slotIndex;
  this.buildBoard.highlightSlot(data.slotIndex);
  if (!this.buildSlots[data.slotIndex]) {
    this.showSequencePicker(data.slotIndex);
  }
}

// 새 시퀀스 풀 관리
private handleSequencePick(data: { slotIndex, sequence, isNew }) {
  if (data.isNew) {
    const pool = this.creature.sequencePool;
    if (pool.length >= SEQUENCE_POOL_MAX) {
      // 기존 슬롯의 시퀀스를 풀에서 제거
      const current = this.buildSlots[data.slotIndex];
      if (current) {
        removeSequence(pool, current.id);
      } else {
        // 빌드에서 미사용인 시퀀스 1개 제거
        const usedInBuild = new Set(this.buildSlots.filter(s=>s).map(s=>s!.id));
        const unused = pool.findIndex(s => !usedInBuild.has(s.id));
        if (unused !== -1) pool.splice(unused, 1);
        else return; // 불가
      }
    }
    addSequence(pool, data.sequence);
  }
  this.assignSequence(data.slotIndex, data.sequence);
}
```

## 구현 순서

1. `src/ui/lab/SequencePickerPopup.ts` 작성
2. `src/scenes/LabScene.ts` 수정 (import, 팝업 교체, 이벤트 핸들러)
3. `npx tsc --noEmit` + `npm run test`

## 검증

1. `npx tsc --noEmit` — 에러 0
2. `npm run test` — 177 테스트 통과
3. 브라우저:
   - 빈 슬롯 클릭 → 팝업 열림
   - 왼쪽: 기존 시퀀스 클릭 → 배치 + 닫힘
   - 오른쪽: 코돈 3개 선택 → 상호작용 미리보기 → [확정] → 배치 + 닫힘
   - [교체] 버튼 → 같은 팝업 열림
   - 풀 가득 참 상태에서 새 시퀀스 만들기 → 기존 시퀀스 교체됨
