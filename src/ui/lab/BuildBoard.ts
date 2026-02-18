// ─── BuildBoard: 중앙 빌드 보드 (항상 고정) ───
// 2×2 시퀀스 슬롯 + 플라스미드 카드

import Phaser from 'phaser';
import type { Creature, Sequence, Plasmid } from '../../data/types';
import { THEME } from './theme';
import { SequenceSlot } from './SequenceSlot';
import { PlasmidCard } from './PlasmidCard';

const BOARD_W = 400;
const BOARD_H = 400;

export class BuildBoard extends Phaser.GameObjects.Container {
  private creature: Creature;
  private bg!: Phaser.GameObjects.Graphics;
  private plasmidCard!: PlasmidCard;
  private slots: SequenceSlot[] = [];
  private buildSlots: (Sequence | null)[] = [null, null, null, null];
  private selectedPlasmid: Plasmid | null = null;
  private activeSlotIndex: number | null = null;
  private statusText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, creature: Creature) {
    super(scene, x, y);
    this.creature = creature;
    this.buildUI();
  }

  private buildUI() {
    // 보드 배경
    this.bg = this.scene.add.graphics();
    this.bg.fillStyle(THEME.colors.bg, 1);
    this.bg.fillRoundedRect(0, 0, BOARD_W, BOARD_H, 6);
    this.bg.lineStyle(1, THEME.colors.tabBorder, 0.3);
    this.bg.strokeRoundedRect(0, 0, BOARD_W, BOARD_H, 6);
    this.add(this.bg);

    // 플라스미드 카드
    this.selectedPlasmid = this.creature.plasmidPool[0] ?? null;
    this.plasmidCard = new PlasmidCard(this.scene, 10, 4, this.selectedPlasmid);
    this.plasmidCard.on('changeClick', () => {
      this.scene.events.emit('plasmidChangeRequested');
    });
    this.add(this.plasmidCard);

    // 2×2 시퀀스 슬롯
    const slotW = THEME.layout.seqSlotW;
    const slotH = THEME.layout.seqSlotH;
    const gap = THEME.layout.seqSlotGap;
    const gridStartX = 10;
    const gridStartY = 48;

    const positions = [
      { x: gridStartX, y: gridStartY },
      { x: gridStartX + slotW + gap, y: gridStartY },
      { x: gridStartX, y: gridStartY + slotH + 8 },
      { x: gridStartX + slotW + gap, y: gridStartY + slotH + 8 },
    ];

    for (let i = 0; i < 4; i++) {
      const slot = new SequenceSlot(this.scene, positions[i].x, positions[i].y, i);
      slot.on('slotClick', (phaseIndex: number) => {
        this.selectSlot(phaseIndex);
        this.scene.events.emit('slotSelected', { slotIndex: phaseIndex });
      });
      slot.on('codonPosClick', (data: { phaseIndex: number; position: number }) => {
        this.selectSlot(data.phaseIndex);
        this.scene.events.emit('codonPositionSelected', data);
      });
      slot.on('swapClick', (phaseIndex: number) => {
        this.scene.events.emit('sequenceSwapRequested', { slotIndex: phaseIndex });
      });
      slot.on('clearClick', (phaseIndex: number) => {
        this.clearSlot(phaseIndex);
      });
      this.add(slot);
      this.slots.push(slot);
    }

    // 상태 텍스트 (하단)
    this.statusText = this.scene.add.text(BOARD_W / 2, BOARD_H - 18, '', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    }).setOrigin(0.5);
    this.add(this.statusText);

    this.updateStatus();
  }

  // ─── Public API ───

  setBuildSlots(slots: (Sequence | null)[]) {
    this.buildSlots = [...slots];
    for (let i = 0; i < 4; i++) {
      this.slots[i]?.setSequence(this.buildSlots[i] ?? null);
    }
    this.updateStatus();
  }

  setSlotSequence(index: number, seq: Sequence | null) {
    if (index < 0 || index >= this.buildSlots.length) return;
    this.buildSlots[index] = seq;
    this.slots[index]?.setSequence(seq);
    this.updateStatus();
  }

  getSlotSequence(index: number): Sequence | null {
    return this.buildSlots[index] ?? null;
  }

  getBuildSlots(): (Sequence | null)[] {
    return [...this.buildSlots];
  }

  setPlasmid(plasmid: Plasmid | null) {
    this.selectedPlasmid = plasmid;
    this.plasmidCard.setPlasmid(plasmid);
  }

  getPlasmid(): Plasmid | null {
    return this.selectedPlasmid;
  }

  highlightSlot(index: number | null) {
    this.activeSlotIndex = index;
    this.slots.forEach((slot, i) => slot.setHighlighted(i === index));
  }

  getActiveSlotIndex(): number | null {
    return this.activeSlotIndex;
  }

  /** 슬롯 내 코돈 칩 플래시 */
  flashCodon(slotIndex: number, codonPos: number) {
    this.slots[slotIndex]?.flashChip(codonPos);
  }

  /** 상호작용 아이콘 팝인 */
  popInteraction(slotIndex: number, pairIndex: number) {
    this.slots[slotIndex]?.popInteractionIcon(pairIndex);
  }

  refresh() {
    this.slots.forEach((slot, i) => slot.setSequence(this.buildSlots[i] ?? null));
    this.plasmidCard.setPlasmid(this.selectedPlasmid);
    this.updateStatus();
  }

  getRequiredSlotCount(): number {
    if (!this.selectedPlasmid) return 4;
    if (this.selectedPlasmid.id === 'overcharge') return 5;
    if (this.selectedPlasmid.id === 'compress') return 2;
    return 4;
  }

  // ─── Private ───

  private selectSlot(index: number) {
    this.highlightSlot(index);
  }

  private clearSlot(phaseIndex: number) {
    this.buildSlots[phaseIndex] = null;
    this.slots[phaseIndex].setSequence(null);
    this.updateStatus();
    this.scene.events.emit('slotCleared', { slotIndex: phaseIndex });
  }

  private updateStatus() {
    const filled = this.buildSlots.filter(s => s !== null).length;
    const required = this.getRequiredSlotCount();
    if (filled >= required) {
      this.statusText.setText('빌드 완성').setStyle({ color: THEME.colors.textGold });
    } else {
      this.statusText.setText(`시퀀스 ${required - filled}개 더 필요`)
        .setStyle({ color: THEME.colors.textDim });
    }
  }
}
