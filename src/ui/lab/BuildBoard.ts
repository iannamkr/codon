// ─── BuildBoard: 중앙 빌드 보드 (항상 고정) ───
// 2×2 시퀀스 슬롯 + 플라스미드 카드 + 액션 버튼 (코돈 보기/초기화/출격)

import Phaser from 'phaser';
import type { Creature, Sequence, Plasmid } from '../../data/types';
import { THEME } from './theme';
import { SequenceSlot } from './SequenceSlot';
import { PlasmidCard } from './PlasmidCard';

const BOARD_W = 460;
const BOARD_H = 440;

export class BuildBoard extends Phaser.GameObjects.Container {
  private creature: Creature;
  private bg!: Phaser.GameObjects.Graphics;
  private plasmidCard!: PlasmidCard;
  private slots: SequenceSlot[] = [];
  private buildSlots: (Sequence | null)[] = [null, null, null, null];
  private selectedPlasmid: Plasmid | null = null;
  private activeSlotIndex: number | null = null;
  private statusText!: Phaser.GameObjects.Text;

  // 출격 버튼 + 글로우
  private deployGlowGfx!: Phaser.GameObjects.Graphics;
  private deployBtnBg!: Phaser.GameObjects.Graphics;
  private deployBtnText!: Phaser.GameObjects.Text;
  private deployEnabled = false;
  private glowTween: Phaser.Tweens.Tween | null = null;

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

    // 플라스미드 카드 (축소: 280px)
    this.selectedPlasmid = this.creature.plasmidPool[0] ?? null;
    this.plasmidCard = new PlasmidCard(this.scene, 10, 4, this.selectedPlasmid, 280, 36);
    this.plasmidCard.on('changeClick', () => {
      this.scene.events.emit('plasmidChangeRequested');
    });
    this.add(this.plasmidCard);

    // ── 상단 소형 버튼들 (플라스미드 카드 오른쪽) ──
    const btnStartX = 300;
    const btnY = 6;
    const smallBtnW = 68;
    const smallBtnH = 28;

    // [코돈 보기] 아웃라인 버튼
    const viewBtnBg = this.scene.add.graphics();
    viewBtnBg.lineStyle(1, THEME.colors.btnPrimary, 0.8);
    viewBtnBg.strokeRoundedRect(btnStartX, btnY, smallBtnW, smallBtnH, 4);
    this.add(viewBtnBg);

    const viewBtnText = this.scene.add.text(
      btnStartX + smallBtnW / 2, btnY + smallBtnH / 2,
      '코돈 보기',
      { fontFamily: THEME.font.family, fontSize: '10px', color: THEME.colors.textMain },
    ).setOrigin(0.5);
    this.add(viewBtnText);

    const viewZone = this.scene.add.zone(
      btnStartX + smallBtnW / 2, btnY + smallBtnH / 2, smallBtnW, smallBtnH,
    ).setInteractive({ useHandCursor: true });
    viewZone.on('pointerdown', () => this.emit('viewCodons'));
    this.add(viewZone);

    // [초기화] danger 아웃라인 버튼
    const resetBtnX = btnStartX + smallBtnW + 6;
    const resetBtnBg = this.scene.add.graphics();
    resetBtnBg.lineStyle(1, THEME.colors.btnDanger, 0.8);
    resetBtnBg.strokeRoundedRect(resetBtnX, btnY, smallBtnW, smallBtnH, 4);
    this.add(resetBtnBg);

    const resetBtnText = this.scene.add.text(
      resetBtnX + smallBtnW / 2, btnY + smallBtnH / 2,
      '초기화',
      { fontFamily: THEME.font.family, fontSize: '10px', color: '#cc3333' },
    ).setOrigin(0.5);
    this.add(resetBtnText);

    const resetZone = this.scene.add.zone(
      resetBtnX + smallBtnW / 2, btnY + smallBtnH / 2, smallBtnW, smallBtnH,
    ).setInteractive({ useHandCursor: true });
    resetZone.on('pointerdown', () => this.emit('reset'));
    this.add(resetZone);

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

    // ── 하단: 상태 텍스트 (출격 버튼 위) ──
    this.statusText = this.scene.add.text(BOARD_W / 2, BOARD_H - 70, '', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
      align: 'center',
      wordWrap: { width: BOARD_W - 40 },
    }).setOrigin(0.5);
    this.add(this.statusText);

    // ── 하단: [=== 출격 ===] 버튼 + 글로우 ──
    const deployBtnW = BOARD_W - 20;
    const deployBtnH = 44;
    const deployBtnX = 10;
    const deployBtnY = BOARD_H - 54;

    // 글로우
    this.deployGlowGfx = this.scene.add.graphics();
    this.deployGlowGfx.setAlpha(0);
    this.add(this.deployGlowGfx);

    // 메인 버튼 배경
    this.deployBtnBg = this.scene.add.graphics();
    this.add(this.deployBtnBg);

    // 버튼 텍스트
    this.deployBtnText = this.scene.add.text(
      deployBtnX + deployBtnW / 2,
      deployBtnY + deployBtnH / 2,
      '=== 출격 ===',
      { fontFamily: THEME.font.family, fontSize: THEME.font.sizeLarge, color: '#666677' },
    ).setOrigin(0.5);
    this.add(this.deployBtnText);

    // 클릭 영역
    const deployZone = this.scene.add.zone(
      deployBtnX + deployBtnW / 2,
      deployBtnY + deployBtnH / 2,
      deployBtnW, deployBtnH,
    ).setInteractive({ useHandCursor: true });
    deployZone.on('pointerdown', () => {
      if (this.deployEnabled) this.emit('deploy');
    });
    this.add(deployZone);

    // 초기 상태
    this.drawDeployButton(false);
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

  /** 출격 버튼 활성/비활성 토글 */
  setDeployEnabled(enabled: boolean): void {
    if (this.deployEnabled === enabled) return;
    this.deployEnabled = enabled;
    this.drawDeployButton(enabled);
  }

  /** 상태 메시지 갱신 */
  setStatus(msg: string, color?: string): void {
    this.statusText.setText(msg);
    if (color) {
      this.statusText.setStyle({ color });
    }
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

  /** 출격 버튼 + 글로우 그리기 */
  private drawDeployButton(enabled: boolean): void {
    const deployBtnW = BOARD_W - 20;
    const deployBtnH = 44;
    const deployBtnX = 10;
    const deployBtnY = BOARD_H - 54;

    const fillColor = enabled ? THEME.colors.btnPrimary : THEME.colors.btnDisabled;

    // 메인 버튼 배경
    this.deployBtnBg.clear();
    this.deployBtnBg.fillStyle(fillColor, 1);
    this.deployBtnBg.fillRoundedRect(deployBtnX, deployBtnY, deployBtnW, deployBtnH, 6);

    // 텍스트 색상
    this.deployBtnText.setStyle({
      color: enabled ? '#ffffff' : '#666677',
    });

    // 기존 글로우 트윈 정리
    if (this.glowTween) {
      this.glowTween.destroy();
      this.glowTween = null;
    }

    if (enabled) {
      const glowPad = 6;
      this.deployGlowGfx.clear();
      this.deployGlowGfx.fillStyle(THEME.colors.btnPrimary, 1);
      this.deployGlowGfx.fillRoundedRect(
        deployBtnX - glowPad,
        deployBtnY - glowPad,
        deployBtnW + glowPad * 2,
        deployBtnH + glowPad * 2,
        10,
      );
      this.deployGlowGfx.setAlpha(0.15);

      this.glowTween = this.scene.tweens.add({
        targets: this.deployGlowGfx,
        alpha: { from: 0.15, to: 0.5 },
        duration: 1000,
        ease: 'Sine.easeInOut',
        repeat: -1,
        yoyo: true,
      });
    } else {
      this.deployGlowGfx.clear();
      this.deployGlowGfx.setAlpha(0);
    }
  }
}
