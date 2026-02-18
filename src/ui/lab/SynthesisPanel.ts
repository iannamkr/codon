// ─── SynthesisPanel: Gene → Codon 합성 패널 (탭1) ───
// PoE2 스타일: 왼쪽=Gene 선택+미리보기, 오른쪽=하위 Gene 선택

import Phaser from 'phaser';
import type { Creature, Gene } from '../../data/types';
import { GENES } from '../../data/types';
import { getAminoAcid } from '../../data/codons';
import { createCodon } from '../../systems/creature-factory';
import { addCodon, CODON_POOL_MAX } from '../../systems/pool-manager';
import { GeneButton } from '../shared/GeneButton';
import { SubGeneList } from '../shared/SubGeneList';
import { THEME, getRoleColor, getRarityLabel } from './theme';

const GENE_ROLE_KO: Record<string, string> = { A: '파괴', T: '생존', G: '질서', C: '혼돈' };

export class SynthesisPanel extends Phaser.GameObjects.Container {
  private creature: Creature;
  private selectedGenes: (Gene | null)[] = [null, null, null];
  private geneButtons: GeneButton[][] = [[], [], []];
  private focusedSlot = 0;
  private slotLabels: Phaser.GameObjects.Text[] = [];

  // 오른쪽: 하위 Gene
  private subGeneLists: SubGeneList[] = [];
  private subGeneTitle!: Phaser.GameObjects.Text;
  private noGeneMsg!: Phaser.GameObjects.Text;

  // 미리보기 + 합성
  private previewText!: Phaser.GameObjects.Text;
  private synthButton!: Phaser.GameObjects.Graphics;
  private synthButtonText!: Phaser.GameObjects.Text;
  private synthButtonZone!: Phaser.GameObjects.Zone;
  private errorText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, creature: Creature) {
    super(scene, 0, THEME.layout.workspaceY);
    this.creature = creature;
    this.buildUI();
  }

  private buildUI() {
    const L = THEME.layout;

    // 패널 프레임
    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.colors.bg, 1);
    bg.fillRect(0, 0, L.width, L.workspaceH);
    this.add(bg);

    const leftBg = this.scene.add.graphics();
    leftBg.fillStyle(THEME.colors.panelBg, 1);
    leftBg.fillRect(0, 0, L.leftPanelW, L.workspaceH);
    this.add(leftBg);

    const divider = this.scene.add.graphics();
    divider.lineStyle(1, THEME.colors.tabBorder, 0.8);
    divider.lineBetween(L.dividerX, 0, L.dividerX, L.workspaceH);
    this.add(divider);

    this.buildLeftPanel();
    this.buildRightPanel();
  }

  // ─── 왼쪽: Gene 선택 + 미리보기 ───

  private buildLeftPanel() {
    const pad = THEME.layout.padding;

    const title = this.scene.add.text(pad, pad, '합성', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeLarge,
      color: THEME.colors.textMain,
    });
    this.add(title);

    // Gene 슬롯 3개
    for (let slot = 0; slot < 3; slot++) {
      const sy = 32 + slot * 74;

      // 슬롯 라벨 (포커스 표시)
      const label = this.scene.add.text(pad, sy, `▸ Pos ${slot + 1}`, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: slot === 0 ? THEME.colors.textMain : THEME.colors.textDim,
      });
      this.add(label);
      this.slotLabels.push(label);

      // 라벨 클릭 → 포커스 전환
      const labelZone = this.scene.add.zone(pad + 30, sy + 6, 70, 14)
        .setInteractive({ useHandCursor: true });
      const s = slot;
      labelZone.on('pointerdown', () => {
        this.focusedSlot = s;
        this.updateRightPanel();
        this.updateSlotLabels();
      });
      this.add(labelZone);

      // Gene 버튼 4개 (A/T/G/C)
      GENES.forEach((gene, gi) => {
        const btn = new GeneButton(this.scene, pad + gi * 66, sy + 16, gene);
        btn.on('select', (g: Gene) => this.onGeneSelect(slot, g));
        this.add(btn);
        this.geneButtons[slot].push(btn);
      });
    }

    // 구분선
    const divY = 260;
    const div = this.scene.add.graphics();
    div.lineStyle(1, THEME.colors.tabBorder, 0.4);
    div.lineBetween(pad, divY, THEME.layout.leftPanelW - pad, divY);
    this.add(div);

    // 미리보기 영역
    this.previewText = this.scene.add.text(pad, 270, 'Gene 3개를 선택하면\n미리보기가 표시됩니다', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textDim,
      wordWrap: { width: THEME.layout.leftPanelW - pad * 2 },
    });
    this.add(this.previewText);

    // 합성 버튼
    const btnW = 120;
    const btnH = 30;
    const btnX = pad;
    const btnY = 370;

    this.synthButton = this.scene.add.graphics();
    this.drawSynthButton(false);
    this.add(this.synthButton);

    this.synthButtonText = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, '합성하기', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add(this.synthButtonText);

    this.synthButtonZone = this.scene.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true });
    this.synthButtonZone.on('pointerdown', () => this.synthesize());
    this.add(this.synthButtonZone);

    // 에러 텍스트
    this.errorText = this.scene.add.text(pad, 406, '', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: '#cc3333',
    });
    this.add(this.errorText);
  }

  // ─── 오른쪽: 하위 Gene 선택 ───

  private buildRightPanel() {
    const rx = THEME.layout.dividerX + THEME.layout.padding;

    this.subGeneTitle = this.scene.add.text(rx, THEME.layout.padding, 'Pos 1: Gene을 선택하세요', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textDim,
    });
    this.add(this.subGeneTitle);

    this.noGeneMsg = this.scene.add.text(
      rx + (THEME.layout.rightPanelW - THEME.layout.padding * 2) / 2,
      180,
      'Gene을 선택하면\n하위 Gene 목록이 표시됩니다',
      {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textDim,
      },
    ).setOrigin(0.5);
    this.add(this.noGeneMsg);

    // SubGeneList 3개 (같은 위치, 포커스된 슬롯만 표시)
    for (let slot = 0; slot < 3; slot++) {
      const list = new SubGeneList(this.scene, rx, 30);
      list.setVisible(false);
      this.add(list);
      this.subGeneLists.push(list);
    }
  }

  // ─── 핸들러 ───

  private onGeneSelect(slot: number, gene: Gene) {
    if (this.selectedGenes[slot] === gene) {
      this.selectedGenes[slot] = null;
      this.geneButtons[slot].forEach(btn => btn.setSelected(false));
    } else {
      this.selectedGenes[slot] = gene;
      this.geneButtons[slot].forEach(btn => btn.setSelected(btn.gene === gene));
      this.subGeneLists[slot].setGene(gene);
    }
    this.focusedSlot = slot;
    this.updateSlotLabels();
    this.updateRightPanel();
    this.updatePreview();
  }

  private updateSlotLabels() {
    for (let i = 0; i < 3; i++) {
      const isFocused = i === this.focusedSlot;
      const gene = this.selectedGenes[i];
      const prefix = isFocused ? '▸' : '  ';
      const suffix = gene ? ` [${gene}]` : '';
      this.slotLabels[i].setText(`${prefix} Pos ${i + 1}${suffix}`);
      this.slotLabels[i].setStyle({
        color: isFocused ? THEME.colors.textMain : THEME.colors.textDim,
      });
    }
  }

  private updateRightPanel() {
    const gene = this.selectedGenes[this.focusedSlot];
    this.subGeneLists.forEach(list => list.setVisible(false));

    if (gene) {
      const roleKo = GENE_ROLE_KO[gene] ?? gene;
      this.subGeneTitle
        .setText(`하위 Gene: Pos ${this.focusedSlot + 1} (${gene}-${roleKo})`)
        .setStyle({ color: THEME.colors.textMain });
      this.subGeneLists[this.focusedSlot].setVisible(true);
      this.noGeneMsg.setVisible(false);
    } else {
      this.subGeneTitle
        .setText(`Pos ${this.focusedSlot + 1}: Gene을 선택하세요`)
        .setStyle({ color: THEME.colors.textDim });
      this.noGeneMsg.setVisible(true);
    }
  }

  private updatePreview() {
    const allSelected = this.selectedGenes.every(g => g !== null);
    this.errorText.setText('');

    if (!allSelected) {
      this.previewText.setText('Gene 3개를 선택하면\n미리보기가 표시됩니다')
        .setStyle({ color: THEME.colors.textDim });
      this.drawSynthButton(false);
      return;
    }

    const triplet = this.selectedGenes.join('');
    const amino = getAminoAcid(triplet);
    if (!amino) {
      this.previewText.setText(`${triplet} — 유효하지 않은 코돈`)
        .setStyle({ color: '#cc3333' });
      this.drawSynthButton(false);
      return;
    }

    const rarity = getRarityLabel(amino.pathCount);
    const roleColor = getRoleColor(amino.roleTag);
    const roleHex = '#' + roleColor.toString(16).padStart(6, '0');

    this.previewText.setText([
      `[${triplet}] ${amino.skillName}${rarity ? ' ' + rarity : ''}`,
      `역할: ${amino.roleTag} | 경로: ${amino.pathCount}`,
      amino.description,
    ].join('\n')).setStyle({ color: roleHex });

    const isFull = this.creature.codonPool.length >= CODON_POOL_MAX;
    this.drawSynthButton(!isFull);
    if (isFull) {
      this.errorText.setText(`코돈 풀 가득참 (${CODON_POOL_MAX}/${CODON_POOL_MAX})`);
    }
  }

  private synthesize() {
    if (!this.selectedGenes.every(g => g !== null)) return;

    const triplet = this.selectedGenes.join('');
    const indices: [number, number, number] = [
      this.subGeneLists[0].getSelectedIndex(),
      this.subGeneLists[1].getSelectedIndex(),
      this.subGeneLists[2].getSelectedIndex(),
    ];

    try {
      const codon = createCodon(triplet, indices);
      const result = addCodon(this.creature.codonPool, codon);
      if (!result.success) {
        this.errorText.setText(result.reason ?? '합성 실패');
        return;
      }

      this.resetSelection();
      this.scene.events.emit('poolChanged');
      this.previewText.setText(`${triplet} 합성 완료!`)
        .setStyle({ color: THEME.colors.textGold });
      this.scene.time.delayedCall(1500, () => this.updatePreview());
    } catch (e) {
      this.errorText.setText(e instanceof Error ? e.message : '합성 실패');
    }
  }

  private resetSelection() {
    for (let slot = 0; slot < 3; slot++) {
      this.selectedGenes[slot] = null;
      this.geneButtons[slot].forEach(btn => btn.setSelected(false));
    }
    this.focusedSlot = 0;
    this.updateSlotLabels();
    this.updateRightPanel();
    this.updatePreview();
  }

  private drawSynthButton(enabled: boolean) {
    const btnX = THEME.layout.padding;
    const btnW = 120;
    const btnH = 30;
    const btnY = 370;
    this.synthButton.clear();
    this.synthButton.fillStyle(
      enabled ? THEME.colors.btnPrimary : THEME.colors.btnDisabled, 1,
    );
    this.synthButton.fillRoundedRect(btnX, btnY, btnW, btnH, 4);
  }
}
