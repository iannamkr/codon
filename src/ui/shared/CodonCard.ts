// ─── CodonCard: 코돈 카드 컴포넌트 ───

import Phaser from 'phaser';
import type { Codon } from '../../data/types';
import { AMINO_ACIDS } from '../../data/codons';
import { THEME, getRoleColor, getRarityLabel } from '../lab/theme';

interface CodonCardOptions {
  compact?: boolean;
  onDelete?: () => void;
}

export const CARD_W = 200;
export const CARD_H = 120;
const COMPACT_W = 120;
const COMPACT_H = 60;

export class CodonCard extends Phaser.GameObjects.Container {
  private bg!: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    codon: Codon,
    options: CodonCardOptions = {},
  ) {
    super(scene, x, y);

    const amino = AMINO_ACIDS[codon.aminoAcidId];
    if (!amino) return;

    const compact = options.compact ?? false;
    const w = compact ? COMPACT_W : CARD_W;
    const h = compact ? COMPACT_H : CARD_H;

    const roleColor = getRoleColor(amino.roleTag);
    const roleHex = '#' + roleColor.toString(16).padStart(6, '0');

    // 배경
    this.bg = scene.add.graphics();
    this.bg.fillStyle(THEME.colors.cardBg, 1);
    this.bg.fillRoundedRect(0, 0, w, h, 4);
    // 왼쪽 역할 바
    this.bg.fillStyle(roleColor, 1);
    this.bg.fillRect(0, 0, 4, h);
    this.add(this.bg);

    if (compact) {
      // 컴팩트 모드: 2줄
      const rarityLabel = getRarityLabel(amino.pathCount);
      const line1 = `${codon.triplet} ${amino.skillName}${rarityLabel ? ' ' + rarityLabel : ''}`;
      const t1 = scene.add.text(10, 10, line1, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textMain,
      });
      this.add(t1);

      const t2 = scene.add.text(10, 28, amino.roleTag, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: roleHex,
      });
      this.add(t2);
    } else {
      // 풀 모드: 5줄
      const rarityLabel = getRarityLabel(amino.pathCount);
      let ly = 8;

      // 1행: triplet + skillName + rarity
      const headerStr = `${codon.triplet}  ${amino.skillName}${rarityLabel ? '  ' + rarityLabel : ''}`;
      const header = scene.add.text(10, ly, headerStr, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textMain,
      });
      this.add(header);
      ly += 20;

      // 2행: roleTag
      const roleText = scene.add.text(10, ly, amino.roleTag, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: roleHex,
      });
      this.add(roleText);
      ly += 18;

      // 3~5행: 하위 Gene
      for (let i = 0; i < 3; i++) {
        const sg = codon.subGenes[i];
        const gene = codon.triplet[i];
        const sgLabel = scene.add.text(10, ly, `${gene}-${sg.nameKo}(${sg.description})`, {
          fontFamily: THEME.font.family,
          fontSize: THEME.font.sizeSmall,
          color: THEME.colors.textDim,
        });
        this.add(sgLabel);
        ly += 16;
      }

      // 삭제 버튼
      if (options.onDelete) {
        const delBtn = scene.add.text(w - 20, 6, 'X', {
          fontFamily: THEME.font.family,
          fontSize: THEME.font.sizeSmall,
          color: '#cc3333',
        }).setOrigin(0.5, 0);
        this.add(delBtn);

        const delZone = scene.add.zone(w - 20, 14, 20, 20)
          .setInteractive({ useHandCursor: true });
        delZone.on('pointerdown', options.onDelete);
        this.add(delZone);
      }
    }
  }
}
