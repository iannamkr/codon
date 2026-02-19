// ─── BuildAnalysis: BUILD 모드 우측 패널 — 빌드 분석 그래프/검증 ───
// 역할 분포, 상호작용 분포, 희귀도, 유효성 검증, 페이즈 프리뷰

import Phaser from 'phaser';
import type { Creature, Sequence, Plasmid, Build, CodonRoleTag } from '../../../data/types';
import { InteractionType } from '../../../data/types';
import { AMINO_ACIDS } from '../../../data/codons';
import { createBuild } from '../../../systems/build-manager';
import { getRoleDistribution, getInteractionDistribution, getRarityDistribution } from '../../../systems/build-analyzer';
import { previewInteractions } from '../../../systems/sequence-builder';
import { THEME, getRoleColor, getInteractionColor } from '../theme';

const PANEL_W = 470;
const PANEL_H = 440;
const PAD = 8;
const BAR_MAX_W = 300;
const BAR_H = 10;

const ROLE_LABELS: { key: CodonRoleTag; label: string }[] = [
  { key: 'Destroy', label: 'Destroy' },
  { key: 'Survive', label: 'Survive' },
  { key: 'Order', label: 'Order' },
  { key: 'Chaos', label: 'Chaos' },
];

const INTERACTION_LABELS: { key: InteractionType; label: string; color: number }[] = [
  { key: InteractionType.Resonance, label: '공명', color: 0xffcc00 },
  { key: InteractionType.Opposition, label: '대립', color: 0xff6633 },
  { key: InteractionType.Fusion, label: '융합', color: 0x33ccff },
];

const ROLE_TAG_KO: Record<CodonRoleTag, string> = {
  Destroy: '파괴',
  Survive: '생존',
  Order: '질서',
  Chaos: '혼돈',
};

export class BuildAnalysis extends Phaser.GameObjects.Container {
  private creature: Creature;

  // 섹션 컨테이너들
  private roleContainer!: Phaser.GameObjects.Container;
  private interactionContainer!: Phaser.GameObjects.Container;
  private rarityContainer!: Phaser.GameObjects.Container;
  private validationContainer!: Phaser.GameObjects.Container;
  private phaseContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, creature: Creature) {
    super(scene, x, y);
    this.creature = creature;

    this.buildUI();
  }

  private buildUI() {
    // 패널 배경
    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.colors.panelBg, 1);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 0);
    this.add(bg);

    // 타이틀
    const title = this.scene.add.text(PAD, 4, '빌드 분석', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeLarge,
      color: THEME.colors.textMain,
    });
    this.add(title);

    // Section 1: 역할 분포 (y=28, h=64)
    this.roleContainer = new Phaser.GameObjects.Container(this.scene, PAD, 28);
    this.add(this.roleContainer);

    // Section 2: 상호작용 분포 (y=100, h=52)
    this.interactionContainer = new Phaser.GameObjects.Container(this.scene, PAD, 100);
    this.add(this.interactionContainer);

    // Section 3: 희귀도 (y=160, h=24)
    this.rarityContainer = new Phaser.GameObjects.Container(this.scene, PAD, 160);
    this.add(this.rarityContainer);

    // Section 4: 유효성 (y=192, h=80)
    this.validationContainer = new Phaser.GameObjects.Container(this.scene, PAD, 192);
    this.add(this.validationContainer);

    // Section 5: 페이즈 프리뷰 (y=280, h=100)
    this.phaseContainer = new Phaser.GameObjects.Container(this.scene, PAD, 280);
    this.add(this.phaseContainer);

    // 초기 빈 상태 표시
    this.showEmpty();
  }

  private showEmpty() {
    this.roleContainer.removeAll(true);
    this.interactionContainer.removeAll(true);
    this.rarityContainer.removeAll(true);
    this.validationContainer.removeAll(true);
    this.phaseContainer.removeAll(true);

    const emptyText = this.scene.add.text(0, 0, '시퀀스를 배치하면\n분석이 표시됩니다', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    });
    this.roleContainer.add(emptyText);
  }

  // ─── Public API ───

  /** 빌드 슬롯/플라스미드 변경 시 전체 재계산 */
  refresh(buildSlots: (Sequence | null)[], plasmid: Plasmid | null) {
    const filledSequences = buildSlots.filter((s): s is Sequence => s !== null);

    if (filledSequences.length === 0) {
      this.showEmpty();
      return;
    }

    // 역할 분포 및 상호작용: 전체 빌드가 아니어도 채워진 시퀀스만으로 계산
    const tempBuild: Build = plasmid
      ? createBuild(plasmid, filledSequences)
      : { plasmid: null as unknown as Plasmid, sequences: filledSequences };

    this.updateRoleSection(tempBuild);
    this.updateInteractionSection(tempBuild);
    this.updateRaritySection(tempBuild);
    this.updatePhaseSection(buildSlots);
  }

  /** 유효성 검증 결과 업데이트 */
  setValidation(result: { valid: boolean; errors: string[] }) {
    this.validationContainer.removeAll(true);

    if (result.valid) {
      const statusText = this.scene.add.text(0, 0, '\u2705 출격 가능', {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textGold,
      });
      this.validationContainer.add(statusText);
    } else {
      const statusText = this.scene.add.text(0, 0, '\u274C 출격 불가', {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: '#ff4444',
      });
      this.validationContainer.add(statusText);

      // 에러 목록 (최대 3줄)
      const maxErrors = Math.min(result.errors.length, 3);
      for (let i = 0; i < maxErrors; i++) {
        const errText = this.scene.add.text(0, 20 + i * 16, result.errors[i], {
          fontFamily: THEME.font.family,
          fontSize: THEME.font.sizeSmall,
          color: '#ff4444',
          wordWrap: { width: PANEL_W - PAD * 2 },
        });
        this.validationContainer.add(errText);
      }
    }
  }

  // ─── Section Updaters ───

  private updateRoleSection(build: Build) {
    this.roleContainer.removeAll(true);

    const dist = getRoleDistribution(build);
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    const rowH = 16;
    const labelW = 50;

    for (let i = 0; i < ROLE_LABELS.length; i++) {
      const { key, label } = ROLE_LABELS[i];
      const count = dist[key];
      const ry = i * rowH;
      const color = getRoleColor(key);
      const colorHex = '#' + color.toString(16).padStart(6, '0');

      // 라벨
      const labelText = this.scene.add.text(0, ry, label, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: colorHex,
      });
      this.roleContainer.add(labelText);

      // 바
      const barW = total > 0 ? (count / total) * BAR_MAX_W : 0;
      if (barW > 0) {
        const barGfx = this.scene.add.graphics();
        barGfx.fillStyle(color, 0.8);
        barGfx.fillRect(labelW, ry + 1, barW, BAR_H);
        this.roleContainer.add(barGfx);
      }

      // 카운트
      const countText = this.scene.add.text(labelW + BAR_MAX_W + 6, ry, `${count}`, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textMain,
      });
      this.roleContainer.add(countText);
    }
  }

  private updateInteractionSection(build: Build) {
    this.interactionContainer.removeAll(true);

    const dist = getInteractionDistribution(build);
    const total = Object.values(dist).reduce((a, b) => a + b, 0);

    const rowH = 16;
    const labelW = 36;

    for (let i = 0; i < INTERACTION_LABELS.length; i++) {
      const { key, label, color } = INTERACTION_LABELS[i];
      const count = dist[key];
      const ry = i * rowH;

      // 라벨
      const labelText = this.scene.add.text(0, ry, label, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: '#' + color.toString(16).padStart(6, '0'),
      });
      this.interactionContainer.add(labelText);

      // 바
      const barW = total > 0 ? (count / total) * BAR_MAX_W : 0;
      if (barW > 0) {
        const barGfx = this.scene.add.graphics();
        barGfx.fillStyle(color, 0.8);
        barGfx.fillRect(labelW, ry + 1, barW, BAR_H);
        this.interactionContainer.add(barGfx);
      }

      // 카운트
      const countText = this.scene.add.text(labelW + BAR_MAX_W + 6, ry, `${count}`, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textMain,
      });
      this.interactionContainer.add(countText);
    }
  }

  private updateRaritySection(build: Build) {
    this.rarityContainer.removeAll(true);

    const dist = getRarityDistribution(build);
    const starCount = (dist[1] ?? 0) + (dist[2] ?? 0); // pathCount 1-2 = rare
    const normalCount = Object.entries(dist)
      .filter(([k]) => Number(k) > 2)
      .reduce((sum, [, v]) => sum + v, 0);

    const text = `\u2605 \u00D7${starCount}  \u2606 \u00D7${normalCount}`;
    const rarityText = this.scene.add.text(0, 0, text, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textGold,
    });
    this.rarityContainer.add(rarityText);
  }

  private updatePhaseSection(buildSlots: (Sequence | null)[]) {
    this.phaseContainer.removeAll(true);

    let ly = 0;
    for (let i = 0; i < buildSlots.length; i++) {
      const seq = buildSlots[i];
      if (!seq) continue;

      const tags = seq.codons.map(c => {
        const amino = AMINO_ACIDS[c.aminoAcidId];
        return ROLE_TAG_KO[amino.roleTag] ?? amino.roleTag;
      });

      const phaseText = this.scene.add.text(0, ly, `Phase ${i + 1}: ${tags.join('/')}`, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textMain,
      });
      this.phaseContainer.add(phaseText);

      ly += 18;
    }

    if (ly === 0) {
      const emptyText = this.scene.add.text(0, 0, '배치된 시퀀스 없음', {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      });
      this.phaseContainer.add(emptyText);
    }
  }
}
