// ─── SequenceAssembler: 조립대 오른쪽 패널 ───
// 코돈 3개를 배치하여 시퀀스를 조립하는 워크스테이션.
// 코돈 슬롯 3자리 + 상호작용 미리보기 + 배치 코돈 상세 + 시퀀스풀 요약 + 확정 버튼
// 코돈은 가운데 CraftingInventory에서 placeCodon() API를 통해 전달받음.

import Phaser from 'phaser';
import type { Creature, Codon, Sequence, CodonRoleTag } from '../../data/types';
import { InteractionType } from '../../data/types';
import { AMINO_ACIDS } from '../../data/codons';
import { createSequence, previewInteractions } from '../../systems/sequence-builder';
import { SEQUENCE_POOL_MAX } from '../../systems/pool-manager';
import { THEME, getRoleColor, getRarityLabel, getInteractionColor } from './theme';

// ─── 레이아웃 상수 ───

const PANEL_W = 340;
const PANEL_H = 440;
const PAD = 8;

const TITLE_Y = 8;

// 코돈 슬롯
const SLOTS_Y = 32;
const SLOT_CHIP_W = 80;
const SLOT_CHIP_H = 40;
const SLOT_GAP = 6;
const INTER_ICON_W = 20;

// 상호작용 미리보기
const INTERACTION_Y = 80;

// 구분선 1
const DIVIDER1_Y = 100;

// 배치 코돈 상세
const DETAIL_Y = 108;
const DETAIL_BLOCK_H = 80;

// 구분선 2
const DIVIDER2_Y = 354;

// 시퀀스풀 요약
const SUMMARY_Y = 362;

// 확정 버튼
const BTN_Y = 390;
const BTN_W = 140;
const BTN_H = 32;

export class SequenceAssembler extends Phaser.GameObjects.Container {
  private creature: Creature;
  private codonSlots: (Codon | null)[] = [null, null, null];
  private activePos = 0;

  // UI 요소
  private slotsContainer!: Phaser.GameObjects.Container;
  private interactionText!: Phaser.GameObjects.Text;
  private detailContainer!: Phaser.GameObjects.Container;
  private summaryText!: Phaser.GameObjects.Text;
  private confirmBtnBg!: Phaser.GameObjects.Graphics;
  private confirmBtnText!: Phaser.GameObjects.Text;
  private confirmBtnZone!: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, x: number, y: number, creature: Creature) {
    super(scene, x, y);
    this.creature = creature;
    this.buildUI();
    scene.events.on('poolChanged', this.onPoolChanged, this);
  }

  destroy(fromScene?: boolean) {
    this.scene.events.off('poolChanged', this.onPoolChanged, this);
    super.destroy(fromScene);
  }

  // ─── 공개 API ───

  setCreature(creature: Creature): void {
    this.creature = creature;
    this.reset();
  }

  reset(): void {
    this.codonSlots = [null, null, null];
    this.activePos = 0;
    this.redrawSlots();
    this.updateInteractionPreview();
    this.redrawDetail();
    this.updateSummary();
    this.updateConfirmBtn();
    this.emit('slotsChanged', { codons: [...this.codonSlots] });
    this.emitSlotContext();
  }

  /** 외부에서 코돈 배치 (CraftingInventory → LabScene → here) */
  placeCodon(codon: Codon): boolean {
    if (this.codonSlots.some(c => c === codon)) return false;

    // 활성 슬롯이 이미 채워져 있으면 빈 슬롯 찾기
    if (this.codonSlots[this.activePos] !== null) {
      const emptyIdx = this.codonSlots.findIndex(c => c === null);
      if (emptyIdx === -1) return false;
      this.activePos = emptyIdx;
    }

    this.codonSlots[this.activePos] = codon;
    this.moveToNextEmptyPos();

    this.redrawSlots();
    this.updateInteractionPreview();
    this.redrawDetail();
    this.updateConfirmBtn();
    this.emit('slotsChanged', { codons: [...this.codonSlots] });
    this.emitSlotContext();
    return true;
  }

  getPlacedCodons(): (Codon | null)[] {
    return [...this.codonSlots];
  }

  getActivePos(): number {
    return this.activePos;
  }

  // ═════════════════════════════════════════════
  //  UI 구성
  // ═════════════════════════════════════════════

  private buildUI() {
    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.colors.panelBg, 1);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 0);
    this.add(bg);

    const title = this.scene.add.text(PANEL_W / 2, TITLE_Y, '시퀀스 조립', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textMain,
    }).setOrigin(0.5, 0);
    this.add(title);

    this.buildSlots();
    this.buildInteractionPreview();
    this.buildDivider(DIVIDER1_Y);
    this.buildDetailSection();
    this.buildDivider(DIVIDER2_Y);
    this.buildSummary();
    this.buildConfirmBtn();

    this.redrawSlots();
    this.updateInteractionPreview();
    this.redrawDetail();
    this.updateSummary();
    this.updateConfirmBtn();
    this.emitSlotContext();
  }

  // ═══ 코돈 슬롯 3자리 ═══

  private buildSlots() {
    this.slotsContainer = this.scene.add.container(0, SLOTS_Y);
    this.add(this.slotsContainer);
  }

  private redrawSlots() {
    this.slotsContainer.removeAll(true);

    const totalW = SLOT_CHIP_W * 3 + INTER_ICON_W * 2 + SLOT_GAP * 4;
    const startX = (PANEL_W - totalW) / 2;

    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (SLOT_CHIP_W + INTER_ICON_W + SLOT_GAP);
      const codon = this.codonSlots[i];
      const isActive = this.activePos === i;

      const chipBg = this.scene.add.graphics();
      if (codon) {
        const amino = AMINO_ACIDS[codon.aminoAcidId];
        const roleColor = amino ? getRoleColor(amino.roleTag) : 0x888888;
        chipBg.fillStyle(THEME.colors.cardBg, 1);
        chipBg.fillRoundedRect(cx, 0, SLOT_CHIP_W, SLOT_CHIP_H, 4);
        chipBg.fillStyle(roleColor, 1);
        chipBg.fillRect(cx, 3, 3, SLOT_CHIP_H - 6);
        const borderColor = isActive ? THEME.colors.resonance : 0x333344;
        chipBg.lineStyle(isActive ? 2 : 1, borderColor, isActive ? 1 : 0.5);
        chipBg.strokeRoundedRect(cx, 0, SLOT_CHIP_W, SLOT_CHIP_H, 4);
      } else {
        chipBg.fillStyle(THEME.colors.cardBg, 0.3);
        chipBg.fillRoundedRect(cx, 0, SLOT_CHIP_W, SLOT_CHIP_H, 4);
        const borderColor = isActive ? THEME.colors.resonance : 0x444466;
        chipBg.lineStyle(isActive ? 2 : 1, borderColor, isActive ? 1 : 0.5);
        chipBg.strokeRoundedRect(cx, 0, SLOT_CHIP_W, SLOT_CHIP_H, 4);

        // 빈 활성 슬롯 맥동 효과
        if (isActive) {
          this.scene.tweens.add({
            targets: chipBg,
            alpha: { from: 0.3, to: 1 },
            duration: 800,
            yoyo: true,
            repeat: -1,
          });
        }
      }
      this.slotsContainer.add(chipBg);

      if (codon) {
        const amino = AMINO_ACIDS[codon.aminoAcidId];
        const rarity = amino ? getRarityLabel(amino.pathCount) : '';
        const tripletLabel = `${codon.triplet}${rarity ? ' ' + rarity : ''}`;
        const skillLabel = amino?.skillName ?? '?';

        const tripletText = this.scene.add.text(cx + SLOT_CHIP_W / 2, SLOT_CHIP_H / 2 - 7, tripletLabel, {
          fontFamily: THEME.font.family,
          fontSize: THEME.font.sizeSmall,
          color: THEME.colors.textMain,
        }).setOrigin(0.5);
        this.slotsContainer.add(tripletText);

        const skillText = this.scene.add.text(cx + SLOT_CHIP_W / 2, SLOT_CHIP_H / 2 + 8, skillLabel, {
          fontFamily: THEME.font.family,
          fontSize: '9px',
          color: THEME.colors.textDim,
        }).setOrigin(0.5);
        this.slotsContainer.add(skillText);
      } else {
        const posLabel = `Pos${i + 1}`;
        const text = this.scene.add.text(cx + SLOT_CHIP_W / 2, SLOT_CHIP_H / 2, posLabel, {
          fontFamily: THEME.font.family,
          fontSize: THEME.font.sizeSmall,
          color: THEME.colors.textDim,
        }).setOrigin(0.5);
        this.slotsContainer.add(text);
      }

      // 클릭: 배치된 코돈 해제 / 활성 Pos 전환
      const zone = this.scene.add.zone(
        cx + SLOT_CHIP_W / 2, SLOT_CHIP_H / 2,
        SLOT_CHIP_W, SLOT_CHIP_H,
      ).setInteractive({ useHandCursor: true });
      const idx = i;
      zone.on('pointerdown', () => this.onSlotClick(idx));
      this.slotsContainer.add(zone);

      // 상호작용 아이콘 (i=0,1에만)
      if (i < 2) {
        const iconX = cx + SLOT_CHIP_W + (INTER_ICON_W + SLOT_GAP) / 2;
        const pair = this.getInteractionForPair(i);
        let symbol = '\u00B7';
        let hexStr = THEME.colors.textDim as string;
        if (pair) {
          symbol = this.getInteractionSymbol(pair);
          const numColor = getInteractionColor(pair);
          hexStr = '#' + numColor.toString(16).padStart(6, '0');
        }
        const icon = this.scene.add.text(iconX, SLOT_CHIP_H / 2, symbol, {
          fontFamily: THEME.font.family,
          fontSize: THEME.font.sizeMedium,
          color: hexStr,
        }).setOrigin(0.5);
        this.slotsContainer.add(icon);
      }
    }
  }

  private onSlotClick(pos: number) {
    if (this.codonSlots[pos]) {
      this.codonSlots[pos] = null;
      this.activePos = pos;
      this.emit('slotsChanged', { codons: [...this.codonSlots] });
    } else {
      this.activePos = pos;
    }
    this.redrawSlots();
    this.updateInteractionPreview();
    this.redrawDetail();
    this.updateConfirmBtn();
    this.emitSlotContext();
  }

  private getInteractionForPair(pairIndex: number): InteractionType | null {
    const c1 = this.codonSlots[pairIndex];
    const c2 = this.codonSlots[pairIndex + 1];
    if (!c1 || !c2) return null;
    const tag1 = AMINO_ACIDS[c1.aminoAcidId]?.roleTag;
    const tag2 = AMINO_ACIDS[c2.aminoAcidId]?.roleTag;
    if (!tag1 || !tag2) return null;
    if (tag1 === tag2) return InteractionType.Resonance;
    const oppositions = new Set(['Destroy:Survive', 'Survive:Destroy', 'Order:Chaos', 'Chaos:Order']);
    if (oppositions.has(`${tag1}:${tag2}`)) return InteractionType.Opposition;
    return InteractionType.Fusion;
  }

  private getInteractionSymbol(type: InteractionType): string {
    switch (type) {
      case InteractionType.Resonance: return '\u25CE';
      case InteractionType.Opposition: return '\u26A1';
      case InteractionType.Fusion: return '\u25C8';
      default: return '\u00B7';
    }
  }

  private getInteractionLabel(type: InteractionType): string {
    switch (type) {
      case InteractionType.Resonance: return '공명';
      case InteractionType.Opposition: return '대립';
      case InteractionType.Fusion: return '융합';
      default: return '';
    }
  }

  // ═══ 상호작용 미리보기 ═══

  private buildInteractionPreview() {
    this.interactionText = this.scene.add.text(PANEL_W / 2, INTERACTION_Y, '', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    }).setOrigin(0.5, 0);
    this.add(this.interactionText);
  }

  private updateInteractionPreview() {
    const allFilled = this.codonSlots.every(c => c !== null);

    if (allFilled) {
      const codons = this.codonSlots as [Codon, Codon, Codon];
      const result = previewInteractions(codons);
      const sym1 = this.getInteractionSymbol(result.pair1);
      const sym2 = this.getInteractionSymbol(result.pair2);
      const label1 = this.getInteractionLabel(result.pair1);
      const label2 = this.getInteractionLabel(result.pair2);
      this.interactionText.setText(`${sym1} ${label1}  |  ${sym2} ${label2}`);
      this.interactionText.setStyle({
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textMain,
      });
      return;
    }

    const parts: string[] = [];
    const pair1 = this.getInteractionForPair(0);
    const pair2 = this.getInteractionForPair(1);
    if (pair1) parts.push(`${this.getInteractionSymbol(pair1)} ${this.getInteractionLabel(pair1)}`);
    else parts.push('\u2500 미배치');
    if (pair2) parts.push(`${this.getInteractionSymbol(pair2)} ${this.getInteractionLabel(pair2)}`);
    else parts.push('\u2500 미배치');

    this.interactionText.setText(parts.join('  |  '));
    this.interactionText.setStyle({
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    });
  }

  // ═══ 구분선 ═══

  private buildDivider(y: number) {
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, THEME.colors.tabBorder, 0.4);
    divider.lineBetween(PAD, y, PANEL_W - PAD, y);
    this.add(divider);
  }

  // ═══ 배치 코돈 상세 (3블록) ═══

  private buildDetailSection() {
    this.detailContainer = this.scene.add.container(0, 0);
    this.add(this.detailContainer);
  }

  private redrawDetail() {
    this.detailContainer.removeAll(true);

    for (let i = 0; i < 3; i++) {
      const blockY = DETAIL_Y + i * DETAIL_BLOCK_H;
      const codon = this.codonSlots[i];
      const isActive = this.activePos === i;

      if (codon) {
        this.renderCodonBlock(codon, i, blockY, isActive);
      } else {
        this.renderEmptyBlock(i, blockY, isActive);
      }
    }
  }

  private renderCodonBlock(codon: Codon, pos: number, y: number, isActive: boolean) {
    const amino = AMINO_ACIDS[codon.aminoAcidId];
    if (!amino) return;

    const roleColor = getRoleColor(amino.roleTag);
    const roleHex = '#' + roleColor.toString(16).padStart(6, '0');
    const rarity = getRarityLabel(amino.pathCount);

    // 블록 배경
    const blockBg = this.scene.add.graphics();
    blockBg.fillStyle(THEME.colors.cardBg, 0.4);
    blockBg.fillRoundedRect(PAD, y, PANEL_W - PAD * 2, DETAIL_BLOCK_H - 4, 3);
    if (isActive) {
      blockBg.lineStyle(1, THEME.colors.resonance, 0.4);
      blockBg.strokeRoundedRect(PAD, y, PANEL_W - PAD * 2, DETAIL_BLOCK_H - 4, 3);
    }
    blockBg.fillStyle(roleColor, 1);
    blockBg.fillRect(PAD, y + 2, 3, DETAIL_BLOCK_H - 8);
    this.detailContainer.add(blockBg);

    let ly = y + 4;

    // 헤더: Pos N: [ATG] skillName ★
    const headerStr = `Pos${pos + 1}: [${codon.triplet}] ${amino.skillName}${rarity ? ' ' + rarity : ''}`;
    const header = this.scene.add.text(PAD + 10, ly, headerStr, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textMain,
    });
    this.detailContainer.add(header);

    // 역할 태그 (오른쪽)
    const roleTag = this.scene.add.text(PANEL_W - PAD - 4, ly, amino.roleTag, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: roleHex,
    }).setOrigin(1, 0);
    this.detailContainer.add(roleTag);

    ly += 16;

    // 하위 Gene 3행
    for (let g = 0; g < 3; g++) {
      const sg = codon.subGenes[g];
      const gene = codon.triplet[g];
      const geneColor = THEME.colors.gene[gene] ?? 0x888888;
      const geneHex = '#' + geneColor.toString(16).padStart(6, '0');

      const sgStr = `${gene}-${sg.nameKo} ${sg.description}`;
      const sgText = this.scene.add.text(PAD + 10, ly, sgStr, {
        fontFamily: THEME.font.family,
        fontSize: '9px',
        color: geneHex,
        wordWrap: { width: PANEL_W - PAD * 2 - 20 },
      });
      this.detailContainer.add(sgText);
      ly += 14;
    }
  }

  private renderEmptyBlock(pos: number, y: number, isActive: boolean) {
    const blockBg = this.scene.add.graphics();
    blockBg.fillStyle(THEME.colors.cardBg, 0.15);
    blockBg.fillRoundedRect(PAD, y, PANEL_W - PAD * 2, DETAIL_BLOCK_H - 4, 3);
    if (isActive) {
      blockBg.lineStyle(1, THEME.colors.resonance, 0.3);
      blockBg.strokeRoundedRect(PAD, y, PANEL_W - PAD * 2, DETAIL_BLOCK_H - 4, 3);
    }
    this.detailContainer.add(blockBg);

    const text = this.scene.add.text(
      PANEL_W / 2,
      y + (DETAIL_BLOCK_H - 4) / 2,
      `Pos${pos + 1}: 코돈을 선택하세요`,
      {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: isActive ? THEME.colors.textDim : '#444455',
      },
    ).setOrigin(0.5);
    this.detailContainer.add(text);
  }

  // ═══ 시퀀스풀 요약 ═══

  private buildSummary() {
    this.summaryText = this.scene.add.text(PANEL_W / 2, SUMMARY_Y, '', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    }).setOrigin(0.5, 0);
    this.add(this.summaryText);
  }

  private updateSummary() {
    const count = this.creature.sequencePool.length;
    const isFull = count >= SEQUENCE_POOL_MAX;
    this.summaryText.setText(
      isFull
        ? `시퀀스풀 ${count}/${SEQUENCE_POOL_MAX} (가득 참!)`
        : `시퀀스풀 ${count}/${SEQUENCE_POOL_MAX}`,
    );
    this.summaryText.setStyle({
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: isFull ? '#cc6633' : THEME.colors.textDim,
    });
  }

  // ═══ 확정 버튼 ═══

  private buildConfirmBtn() {
    const btnX = (PANEL_W - BTN_W) / 2;

    this.confirmBtnBg = this.scene.add.graphics();
    this.add(this.confirmBtnBg);

    this.confirmBtnText = this.scene.add.text(btnX + BTN_W / 2, BTN_Y + BTN_H / 2, '시퀀스 확정', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add(this.confirmBtnText);

    this.confirmBtnZone = this.scene.add.zone(btnX + BTN_W / 2, BTN_Y + BTN_H / 2, BTN_W, BTN_H)
      .setInteractive({ useHandCursor: true });
    this.confirmBtnZone.on('pointerdown', () => this.onConfirm());
    this.add(this.confirmBtnZone);
  }

  private updateConfirmBtn() {
    const btnX = (PANEL_W - BTN_W) / 2;
    const allFilled = this.codonSlots.every(c => c !== null);
    const poolFull = this.creature.sequencePool.length >= SEQUENCE_POOL_MAX;
    const canConfirm = allFilled && !poolFull;

    this.confirmBtnBg.clear();
    this.confirmBtnBg.fillStyle(
      canConfirm ? THEME.colors.btnPrimary : THEME.colors.btnDisabled, 1,
    );
    this.confirmBtnBg.fillRoundedRect(btnX, BTN_Y, BTN_W, BTN_H, 4);

    this.confirmBtnText.setStyle({
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: canConfirm ? '#ffffff' : THEME.colors.textDim,
    });
  }

  private onConfirm() {
    const allFilled = this.codonSlots.every(c => c !== null);
    const poolFull = this.creature.sequencePool.length >= SEQUENCE_POOL_MAX;
    if (!allFilled || poolFull) return;

    const codons = this.codonSlots as [Codon, Codon, Codon];
    const id = `seq_${Date.now()}`;
    const sequence = createSequence(id, codons);

    this.emit('sequenceCreated', { sequence });

    this.codonSlots = [null, null, null];
    this.activePos = 0;
    this.redrawSlots();
    this.updateInteractionPreview();
    this.redrawDetail();
    this.updateSummary();
    this.updateConfirmBtn();
    this.emit('slotsChanged', { codons: [...this.codonSlots] });
    this.emitSlotContext();
  }

  // ═══ 유틸리티 ═══

  private moveToNextEmptyPos() {
    for (let offset = 1; offset <= 3; offset++) {
      const next = (this.activePos + offset) % 3;
      if (!this.codonSlots[next]) {
        this.activePos = next;
        return;
      }
    }
  }

  /** 활성 슬롯의 인접 코돈 roleTag를 수집하여 이벤트 발행 */
  private emitSlotContext(): void {
    const adjacentTags: CodonRoleTag[] = [];
    if (this.activePos > 0 && this.codonSlots[this.activePos - 1]) {
      const amino = AMINO_ACIDS[this.codonSlots[this.activePos - 1]!.aminoAcidId];
      if (amino) adjacentTags.push(amino.roleTag);
    }
    if (this.activePos < 2 && this.codonSlots[this.activePos + 1]) {
      const amino = AMINO_ACIDS[this.codonSlots[this.activePos + 1]!.aminoAcidId];
      if (amino) adjacentTags.push(amino.roleTag);
    }
    this.emit('activeSlotContext', { adjacentTags });
  }

  private onPoolChanged = () => {
    for (let i = 0; i < 3; i++) {
      const placed = this.codonSlots[i];
      if (placed && !this.creature.codonPool.includes(placed)) {
        this.codonSlots[i] = null;
      }
    }
    if (this.codonSlots[this.activePos] !== null) {
      this.moveToNextEmptyPos();
    }
    this.redrawSlots();
    this.updateInteractionPreview();
    this.redrawDetail();
    this.updateSummary();
    this.updateConfirmBtn();
    this.emit('slotsChanged', { codons: [...this.codonSlots] });
    this.emitSlotContext();
  };
}
