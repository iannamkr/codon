// ─── SequenceStrip: 코돈 3개 + 인접 상호작용을 한 줄로 표시 ───

import Phaser from 'phaser';
import type { Codon, Sequence } from '../../data/types';
import { InteractionType } from '../../data/types';
import { AMINO_ACIDS } from '../../data/codons';
import { THEME, getRoleColor, getInteractionColor, getRarityLabel } from '../lab/theme';
import { previewInteractions } from '../../systems/sequence-builder';

/** 상호작용 한글명 매핑 */
const INTERACTION_KO: Record<string, string> = {
  Resonance: '공명',
  Opposition: '대립',
  Fusion: '융합',
};

interface SequenceStripOptions {
  /** 소형 모드 (빌드 패널 등에서 사용) */
  compact?: boolean;
  /** 코돈 슬롯 클릭 콜백 (슬롯 인덱스) */
  onSlotClick?: (slotIndex: number) => void;
}

const MINI_CARD_W = 160;
const MINI_CARD_H = 50;
const COMPACT_CARD_W = 120;
const COMPACT_CARD_H = 40;
const INTERACTION_W = 80;
const COMPACT_INTERACTION_W = 50;

export class SequenceStrip extends Phaser.GameObjects.Container {
  private sequence: Sequence | null;
  private codons: (Codon | null)[];
  private options: SequenceStripOptions;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    sequence: Sequence | null,
    options: SequenceStripOptions = {},
  ) {
    super(scene, x, y);
    this.sequence = sequence;
    this.options = options;
    this.codons = sequence
      ? [sequence.codons[0], sequence.codons[1], sequence.codons[2]]
      : [null, null, null];
    this.rebuild();
  }

  /** 시퀀스 전체 교체 */
  updateSequence(sequence: Sequence | null) {
    this.sequence = sequence;
    this.codons = sequence
      ? [sequence.codons[0], sequence.codons[1], sequence.codons[2]]
      : [null, null, null];
    this.rebuild();
  }

  /** 특정 슬롯의 코돈만 교체 */
  setSlotCodon(index: number, codon: Codon | null) {
    this.codons[index] = codon;
    this.rebuild();
  }

  /** 현재 슬롯 코돈 배열 반환 */
  getCodons(): (Codon | null)[] {
    return [...this.codons];
  }

  /** 모든 슬롯이 채워졌는지 */
  isFull(): boolean {
    return this.codons.every(c => c !== null);
  }

  private rebuild() {
    this.removeAll(true);
    const compact = this.options.compact ?? false;
    const cardW = compact ? COMPACT_CARD_W : MINI_CARD_W;
    const cardH = compact ? COMPACT_CARD_H : MINI_CARD_H;
    const interW = compact ? COMPACT_INTERACTION_W : INTERACTION_W;

    // 상호작용 계산 (3개 코돈이 모두 있을 때만)
    let interactions: { pair1: InteractionType; pair2: InteractionType } | null = null;
    if (this.codons[0] && this.codons[1] && this.codons[2]) {
      interactions = previewInteractions([
        this.codons[0], this.codons[1], this.codons[2],
      ]);
    }

    let cx = 0;
    for (let i = 0; i < 3; i++) {
      // 코돈 미니카드
      this.drawMiniCard(cx, 0, cardW, cardH, this.codons[i], i);
      cx += cardW;

      // 상호작용 라벨 (슬롯 0-1, 1-2 사이)
      if (i < 2) {
        const pairKey = i === 0 ? 'pair1' : 'pair2';
        const interaction = interactions ? interactions[pairKey as 'pair1' | 'pair2'] : null;
        this.drawInteractionLabel(cx, 0, interW, cardH, interaction);
        cx += interW;
      }
    }
  }

  private drawMiniCard(
    x: number, y: number, w: number, h: number,
    codon: Codon | null, slotIndex: number,
  ) {
    const scene = this.scene;
    const compact = this.options.compact ?? false;
    const g = scene.add.graphics();

    if (codon) {
      const amino = AMINO_ACIDS[codon.aminoAcidId];
      const roleColor = getRoleColor(amino.roleTag);

      // 배경
      g.fillStyle(THEME.colors.cardBg, 1);
      g.fillRoundedRect(x, y, w, h, 3);
      // 왼쪽 역할 바
      g.fillStyle(roleColor, 1);
      g.fillRect(x, y, 3, h);
      this.add(g);

      const roleHex = '#' + roleColor.toString(16).padStart(6, '0');
      const rarityLabel = getRarityLabel(amino.pathCount);

      // 1행: triplet + skillName + rarity
      const line1 = `${codon.triplet} ${amino.skillName}${rarityLabel ? ' ' + rarityLabel : ''}`;
      const t1 = scene.add.text(x + 8, y + (compact ? 6 : 8), line1, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textMain,
      });
      this.add(t1);

      // 2행: roleTag
      const t2 = scene.add.text(x + 8, y + (compact ? 22 : 28), amino.roleTag, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: roleHex,
      });
      this.add(t2);
    } else {
      // 빈 슬롯
      g.fillStyle(THEME.colors.cardBg, 0.5);
      g.lineStyle(1, 0x444466, 0.8);
      g.fillRoundedRect(x, y, w, h, 3);
      g.strokeRoundedRect(x, y, w, h, 3);
      this.add(g);

      const emptyText = scene.add.text(x + w / 2, y + h / 2, '[빈 슬롯]', {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      }).setOrigin(0.5);
      this.add(emptyText);
    }

    // 클릭 영역
    if (this.options.onSlotClick) {
      const zone = scene.add.zone(x + w / 2, y + h / 2, w, h)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.options.onSlotClick!(slotIndex);
      });
      this.add(zone);
    }
  }

  private drawInteractionLabel(
    x: number, y: number, w: number, h: number,
    interaction: InteractionType | null,
  ) {
    const scene = this.scene;
    const compact = this.options.compact ?? false;
    const g = scene.add.graphics();

    if (interaction) {
      const color = getInteractionColor(interaction);
      const colorHex = '#' + color.toString(16).padStart(6, '0');
      const label = INTERACTION_KO[interaction] ?? interaction;

      // 점선 연결
      g.lineStyle(1, color, 0.6);
      const midY = y + h / 2;
      for (let dx = 4; dx < w - 4; dx += 6) {
        g.lineBetween(x + dx, midY, x + dx + 3, midY);
      }
      this.add(g);

      // 라벨
      const labelText = scene.add.text(x + w / 2, y + h / 2, label, {
        fontFamily: THEME.font.family,
        fontSize: compact ? THEME.font.sizeSmall : THEME.font.sizeSmall,
        color: colorHex,
      }).setOrigin(0.5);
      this.add(labelText);
    } else {
      // 상호작용 미결정
      g.lineStyle(1, 0x444466, 0.3);
      const midY = y + h / 2;
      for (let dx = 4; dx < w - 4; dx += 6) {
        g.lineBetween(x + dx, midY, x + dx + 3, midY);
      }
      this.add(g);

      const dashText = scene.add.text(x + w / 2, y + h / 2, '—', {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      }).setOrigin(0.5);
      this.add(dashText);
    }
  }
}
