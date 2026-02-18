// ─── GeneInfo: SYNTH 모드 오른쪽 패널 (하위 Gene 선택) ───

import Phaser from 'phaser';
import type { Gene } from '../../../data/types';
import { SubGeneList } from '../../shared/SubGeneList';
import { THEME } from '../theme';

const GENE_ROLE_KO: Record<string, string> = {
  A: '\ud30c\uad34',
  T: '\uc0dd\uc874',
  G: '\uc9c8\uc11c',
  C: '\ud63c\ub3c8',
};

const PANEL_W = 280;
const PANEL_H = 400;
const PAD = THEME.layout.padding; // 8

export class GeneInfo extends Phaser.GameObjects.Container {
  private titleText!: Phaser.GameObjects.Text;
  private subGeneLists: SubGeneList[] = [];
  private focusedSlot = 0;
  private slotGenes: (Gene | null)[] = [null, null, null];
  private selectedIndices: [number, number, number] = [0, 0, 0];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.buildUI();

    // Listen for gene focus changes from SynthesisBench
    this.scene.events.on('geneFocused', this.onGeneFocused, this);
    this.once('destroy', () => {
      this.scene.events.off('geneFocused', this.onGeneFocused, this);
    });
  }

  private buildUI() {
    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.colors.panelBg, 1);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 4);
    this.add(bg);

    // Title text
    this.titleText = this.scene.add.text(PAD, PAD, 'Gene\uc744 \uc120\ud0dd\ud558\uc138\uc694', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textDim,
      wordWrap: { width: PANEL_W - PAD * 2 },
    });
    this.add(this.titleText);

    // 3 SubGeneList instances (one per slot), only focused one visible
    for (let slot = 0; slot < 3; slot++) {
      const list = new SubGeneList(this.scene, PAD, 30);
      list.setVisible(false);

      const s = slot;
      list.on('select', (index: number) => {
        this.selectedIndices[s] = index;
        this.emitSubGeneIndices();
      });

      this.add(list);
      this.subGeneLists.push(list);
    }
  }

  // ─── Event handlers ───

  private onGeneFocused(data: { slot: number; gene: Gene | null }) {
    const { slot, gene } = data;
    this.focusedSlot = slot;
    this.slotGenes[slot] = gene;

    // Update the SubGeneList for this slot if a gene is provided
    if (gene) {
      this.subGeneLists[slot].setGene(gene);
      this.selectedIndices[slot] = this.subGeneLists[slot].getSelectedIndex();
    }

    this.updateDisplay();
    this.emitSubGeneIndices();
  }

  private updateDisplay() {
    const gene = this.slotGenes[this.focusedSlot];

    // Hide all lists
    this.subGeneLists.forEach(list => list.setVisible(false));

    if (gene) {
      const roleKo = GENE_ROLE_KO[gene] ?? gene;
      this.titleText
        .setText(`\ud558\uc704 Gene: Pos ${this.focusedSlot + 1} (${gene}-${roleKo})`)
        .setStyle({ color: THEME.colors.textMain });
      this.subGeneLists[this.focusedSlot].setVisible(true);
    } else {
      this.titleText
        .setText('Gene\uc744 \uc120\ud0dd\ud558\uc138\uc694')
        .setStyle({ color: THEME.colors.textDim });
    }
  }

  private emitSubGeneIndices() {
    this.scene.events.emit('synthSubGeneIndices', [
      this.selectedIndices[0],
      this.selectedIndices[1],
      this.selectedIndices[2],
    ] as [number, number, number]);
  }
}
