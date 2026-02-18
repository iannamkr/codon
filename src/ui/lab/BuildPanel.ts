// ─── BuildPanel: [탭4] 플라스미드 선택 + 빌드 조립 + 분석 ───
// PoE2 스타일: 왼쪽=플라스미드+페이즈 슬롯, 오른쪽=빌드 분석

import Phaser from 'phaser';
import type { Creature, Plasmid, Sequence, Build, CodonRoleTag } from '../../data/types';
import { InteractionType } from '../../data/types';
import { AMINO_ACIDS } from '../../data/codons';
import { THEME, getRoleColor, getInteractionColor, getRarityLabel } from './theme';
import { createBuild } from '../../systems/build-manager';
import { getRoleDistribution, getInteractionDistribution, getRarityDistribution } from '../../systems/build-analyzer';

const INTERACTION_KO: Record<string, string> = {
  Resonance: '공명', Opposition: '대립', Fusion: '융합',
};
const ROLE_KO: Record<string, string> = {
  Destroy: '파괴', Survive: '생존', Order: '질서', Chaos: '혼돈',
};
const CATEGORY_KO: Record<string, string> = {
  Combat: '전투', Mutation: '변이', Attribute: '속성', Structure: '구조', Meta: '메타',
};

function getRequiredSequenceCount(plasmid: Plasmid): number {
  if (plasmid.id === 'overcharge') return 5;
  if (plasmid.id === 'compress') return 2;
  return 4;
}

export class BuildPanel extends Phaser.GameObjects.Container {
  private creature: Creature;
  private selectedPlasmid: Plasmid | null = null;
  private buildSlots: (Sequence | null)[] = [];
  private requiredSlots = 4;

  // 왼쪽
  private plasmidNameText!: Phaser.GameObjects.Text;
  private plasmidDescText!: Phaser.GameObjects.Text;
  private slotsContainer!: Phaser.GameObjects.Container;
  private slotsCountText!: Phaser.GameObjects.Text;

  // 오른쪽
  private analysisContainer!: Phaser.GameObjects.Container;

  // 팝업
  private popupContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, creature: Creature) {
    super(scene, 0, THEME.layout.workspaceY);
    this.creature = creature;

    if (creature.plasmidPool.length > 0) {
      this.selectedPlasmid = creature.plasmidPool[0];
      this.requiredSlots = getRequiredSequenceCount(this.selectedPlasmid);
    }
    this.buildSlots = new Array(this.requiredSlots).fill(null);

    this.buildUI();
    scene.events.on('poolChanged', this.onPoolChanged, this);
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

  // ─── 왼쪽: 플라스미드 + 빌드 슬롯 ───

  private buildLeftPanel() {
    const pad = THEME.layout.padding;
    const lw = THEME.layout.leftPanelW;

    // 플라스미드 섹션
    const plasmidTitle = this.scene.add.text(pad, pad, '플라스미드', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textMain,
    });
    this.add(plasmidTitle);

    this.plasmidNameText = this.scene.add.text(pad, pad + 20, '', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textGold,
    });
    this.add(this.plasmidNameText);

    this.plasmidDescText = this.scene.add.text(pad, pad + 38, '', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
      wordWrap: { width: lw - pad * 2 - 70 },
    });
    this.add(this.plasmidDescText);

    // [변경] 버튼
    const cbX = lw - 70;
    const cbY = pad + 20;
    const cbBg = this.scene.add.graphics();
    cbBg.fillStyle(THEME.colors.btnPrimary, 1);
    cbBg.fillRoundedRect(cbX, cbY, 56, 22, 3);
    this.add(cbBg);

    const cbText = this.scene.add.text(cbX + 28, cbY + 11, '변경', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add(cbText);

    const cbZone = this.scene.add.zone(cbX + 28, cbY + 11, 56, 22)
      .setInteractive({ useHandCursor: true });
    cbZone.on('pointerdown', () => this.showPlasmidPopup());
    this.add(cbZone);

    this.updatePlasmidDisplay();

    // 구분선
    const div1Y = 90;
    const div1 = this.scene.add.graphics();
    div1.lineStyle(1, THEME.colors.tabBorder, 0.4);
    div1.lineBetween(pad, div1Y, lw - pad, div1Y);
    this.add(div1);

    // 빌드 시퀀스 섹션
    this.slotsCountText = this.scene.add.text(pad, 98, '빌드 시퀀스', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textMain,
    });
    this.add(this.slotsCountText);

    this.slotsContainer = this.scene.add.container(0, 120);
    this.add(this.slotsContainer);
    this.rebuildSlots();
  }

  // ─── 오른쪽: 빌드 분석 ───

  private buildRightPanel() {
    const rx = THEME.layout.dividerX + THEME.layout.padding;

    const title = this.scene.add.text(rx, THEME.layout.padding, '빌드 분석', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textMain,
    });
    this.add(title);

    this.analysisContainer = this.scene.add.container(rx, 30);
    this.add(this.analysisContainer);
    this.updateAnalysis();
  }

  // ─── 플라스미드 표시 ───

  private updatePlasmidDisplay() {
    if (this.selectedPlasmid) {
      const p = this.selectedPlasmid;
      const catKo = CATEGORY_KO[p.category] ?? p.category;
      this.plasmidNameText.setText(`[${p.nameKo}] — ${catKo}`);
      this.plasmidDescText.setText(
        `${p.description}\n제거: ${p.removedRule}\n추가: ${p.newRule}`,
      );
    } else {
      this.plasmidNameText.setText('[미선택]');
      this.plasmidDescText.setText('');
    }
  }

  // ─── 빌드 슬롯 ───

  private rebuildSlots() {
    this.slotsContainer.removeAll(true);
    const pad = THEME.layout.padding;
    const lw = THEME.layout.leftPanelW;
    const rowH = 50;

    const filledCount = this.buildSlots.filter(s => s !== null).length;
    this.slotsCountText.setText(`빌드 시퀀스 (${filledCount}/${this.requiredSlots})`);

    for (let i = 0; i < this.requiredSlots; i++) {
      const y = i * rowH;
      const seq = this.buildSlots[i];

      // Phase 라벨
      const label = this.scene.add.text(pad, y + 4, `Phase ${i + 1}:`, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      });
      this.slotsContainer.add(label);

      if (seq) {
        // 시퀀스 요약
        const codons = seq.codons.map(c => c.triplet).join('-');
        const seqText = this.scene.add.text(pad, y + 20, codons, {
          fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
          color: THEME.colors.textMain,
        });
        this.slotsContainer.add(seqText);
      } else {
        const emptyText = this.scene.add.text(pad, y + 20, '[시퀀스 선택]', {
          fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
          color: THEME.colors.textDim,
        });
        this.slotsContainer.add(emptyText);
      }

      // [변경] 버튼
      const btnX = lw - 68;
      const btnY = y + 8;
      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(THEME.colors.btnPrimary, 1);
      btnBg.fillRoundedRect(btnX, btnY, 50, 22, 3);
      this.slotsContainer.add(btnBg);

      const btnText = this.scene.add.text(btnX + 25, btnY + 11, '변경', {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: '#ffffff',
      }).setOrigin(0.5);
      this.slotsContainer.add(btnText);

      const btnZone = this.scene.add.zone(btnX + 25, btnY + 11, 50, 22)
        .setInteractive({ useHandCursor: true });
      const slotIdx = i;
      btnZone.on('pointerdown', () => this.showSequencePopup(slotIdx));
      this.slotsContainer.add(btnZone);
    }
  }

  // ─── 분석 ───

  private updateAnalysis() {
    this.analysisContainer.removeAll(true);
    const filledSlots = this.buildSlots.filter(s => s !== null) as Sequence[];

    if (filledSlots.length === 0) {
      const msg = this.scene.add.text(0, 0, '시퀀스를 배치하면 분석이 표시됩니다', {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      });
      this.analysisContainer.add(msg);
      return;
    }

    const tempBuild = { plasmid: this.selectedPlasmid!, sequences: filledSlots };
    let ly = 0;
    const barW = 400;

    // 역할 분포
    const roleDist = getRoleDistribution(tempBuild);
    const roles: CodonRoleTag[] = ['Destroy', 'Survive', 'Order', 'Chaos'];
    let roleStr = '역할:  ';
    roles.forEach(r => { roleStr += `${ROLE_KO[r]} ${roleDist[r]}  `; });
    const roleText = this.scene.add.text(0, ly, roleStr, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textMain,
    });
    this.analysisContainer.add(roleText);

    // 역할 바
    ly += 20;
    const total1 = Object.values(roleDist).reduce((a, b) => a + b, 0);
    if (total1 > 0) {
      const bar1 = this.scene.add.graphics();
      let bx = 0;
      roles.forEach(r => {
        if (roleDist[r] > 0) {
          const w = (roleDist[r] / total1) * barW;
          bar1.fillStyle(getRoleColor(r), 0.8);
          bar1.fillRect(bx, ly, w, 12);
          bx += w;
        }
      });
      bar1.lineStyle(1, 0x444466, 0.5);
      bar1.strokeRect(0, ly, barW, 12);
      this.analysisContainer.add(bar1);
    }

    // 상호작용 분포
    ly += 26;
    const interDist = getInteractionDistribution(tempBuild);
    const interTypes = [InteractionType.Resonance, InteractionType.Opposition, InteractionType.Fusion];
    let interStr = '상호작용:  ';
    interTypes.forEach(t => {
      interStr += `${INTERACTION_KO[t]} ${interDist[t]}  `;
    });
    const interText = this.scene.add.text(0, ly, interStr, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textMain,
    });
    this.analysisContainer.add(interText);

    // 상호작용 바
    ly += 20;
    const total2 = Object.values(interDist).reduce((a, b) => a + b, 0);
    if (total2 > 0) {
      const bar2 = this.scene.add.graphics();
      let bx2 = 0;
      interTypes.forEach(t => {
        if (interDist[t] > 0) {
          const w = (interDist[t] / total2) * barW;
          bar2.fillStyle(getInteractionColor(t), 0.8);
          bar2.fillRect(bx2, ly, w, 12);
          bx2 += w;
        }
      });
      bar2.lineStyle(1, 0x444466, 0.5);
      bar2.strokeRect(0, ly, barW, 12);
      this.analysisContainer.add(bar2);
    }

    // 희귀도
    ly += 26;
    const rareDist = getRarityDistribution(tempBuild);
    let rareStr = '희귀도:  ';
    Object.keys(rareDist).map(Number).sort((a, b) => a - b).forEach(pc => {
      const label = getRarityLabel(pc);
      const name = pc === 1 ? '초희귀' : pc === 2 ? '일반' : pc <= 4 ? '흔함' : '최흔';
      rareStr += `${label || name}(${pc}경로) ${rareDist[pc]}  `;
    });
    const rareText = this.scene.add.text(0, ly, rareStr, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textMain,
    });
    this.analysisContainer.add(rareText);

    // 빌드 상태
    ly += 30;
    const allFilled = this.buildSlots.every(s => s !== null);
    if (allFilled) {
      const complete = this.scene.add.text(0, ly, '빌드 완성 — 출격 가능', {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textGold,
      });
      this.analysisContainer.add(complete);
    } else {
      const missing = this.buildSlots.filter(s => s === null).length;
      const incomplete = this.scene.add.text(0, ly, `시퀀스 ${missing}개 더 필요`, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
        color: '#ff4444',
      });
      this.analysisContainer.add(incomplete);
    }
  }

  // ─── 팝업: 플라스미드 선택 ───

  private showPlasmidPopup() {
    this.closePopup();
    const pool = this.creature.plasmidPool;
    const itemH = 48;
    const popW = 460;
    const popH = Math.min(38 + pool.length * itemH + 10, 300);
    const popX = (THEME.layout.width - popW) / 2;
    const popY = 40;

    this.popupContainer = this.scene.add.container(0, 0).setDepth(50);
    this.add(this.popupContainer);

    // 오버레이
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, THEME.layout.width, THEME.layout.workspaceH);
    this.popupContainer.add(overlay);

    const overlayZone = this.scene.add.zone(
      THEME.layout.width / 2, THEME.layout.workspaceH / 2,
      THEME.layout.width, THEME.layout.workspaceH,
    ).setInteractive();
    overlayZone.on('pointerdown', () => this.closePopup());
    this.popupContainer.add(overlayZone);

    // 팝업 배경
    const popBg = this.scene.add.graphics();
    popBg.fillStyle(THEME.colors.panelBg, 1);
    popBg.lineStyle(2, THEME.colors.tabBorder, 1);
    popBg.fillRoundedRect(popX, popY, popW, popH, 6);
    popBg.strokeRoundedRect(popX, popY, popW, popH, 6);
    this.popupContainer.add(popBg);

    const title = this.scene.add.text(popX + popW / 2, popY + 14, '플라스미드 선택', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textMain,
    }).setOrigin(0.5, 0);
    this.popupContainer.add(title);

    pool.forEach((plasmid, i) => {
      const iy = popY + 38 + i * itemH;
      const isSel = this.selectedPlasmid?.id === plasmid.id;

      const itemBg = this.scene.add.graphics();
      itemBg.fillStyle(isSel ? THEME.colors.tabActive : THEME.colors.cardBg, 1);
      itemBg.fillRoundedRect(popX + 10, iy, popW - 20, itemH - 4, 3);
      this.popupContainer!.add(itemBg);

      const catKo = CATEGORY_KO[plasmid.category] ?? plasmid.category;
      const name = this.scene.add.text(popX + 18, iy + 4, `[${plasmid.nameKo}] — ${catKo}`, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
        color: isSel ? THEME.colors.textGold : THEME.colors.textMain,
      });
      this.popupContainer!.add(name);

      const desc = this.scene.add.text(popX + 18, iy + 22, plasmid.description, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
        wordWrap: { width: popW - 36 },
      });
      this.popupContainer!.add(desc);

      const itemZone = this.scene.add.zone(
        popX + popW / 2, iy + itemH / 2 - 2, popW - 20, itemH - 4,
      ).setInteractive({ useHandCursor: true });
      itemZone.on('pointerdown', () => this.selectPlasmid(plasmid));
      this.popupContainer!.add(itemZone);
    });
  }

  private selectPlasmid(plasmid: Plasmid) {
    this.selectedPlasmid = plasmid;
    const newRequired = getRequiredSequenceCount(plasmid);
    if (newRequired !== this.requiredSlots) {
      this.requiredSlots = newRequired;
      this.buildSlots = new Array(this.requiredSlots).fill(null);
    }
    this.closePopup();
    this.updatePlasmidDisplay();
    this.rebuildSlots();
    this.updateAnalysis();
    this.tryCompleteBuild();
  }

  // ─── 팝업: 시퀀스 선택 ───

  private showSequencePopup(slotIndex: number) {
    this.closePopup();
    const pool = this.creature.sequencePool;
    const itemH = 48;
    const popW = 460;
    const popH = Math.min(38 + pool.length * itemH + 10, 350);
    const popX = (THEME.layout.width - popW) / 2;
    const popY = 30;

    this.popupContainer = this.scene.add.container(0, 0).setDepth(50);
    this.add(this.popupContainer);

    // 오버레이
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, THEME.layout.width, THEME.layout.workspaceH);
    this.popupContainer.add(overlay);

    const overlayZone = this.scene.add.zone(
      THEME.layout.width / 2, THEME.layout.workspaceH / 2,
      THEME.layout.width, THEME.layout.workspaceH,
    ).setInteractive();
    overlayZone.on('pointerdown', () => this.closePopup());
    this.popupContainer.add(overlayZone);

    // 팝업 배경
    const popBg = this.scene.add.graphics();
    popBg.fillStyle(THEME.colors.panelBg, 1);
    popBg.lineStyle(2, THEME.colors.tabBorder, 1);
    popBg.fillRoundedRect(popX, popY, popW, popH, 6);
    popBg.strokeRoundedRect(popX, popY, popW, popH, 6);
    this.popupContainer.add(popBg);

    const title = this.scene.add.text(
      popX + popW / 2, popY + 14, `Phase ${slotIndex + 1} 시퀀스 선택`, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textMain,
      }).setOrigin(0.5, 0);
    this.popupContainer.add(title);

    if (pool.length === 0) {
      const empty = this.scene.add.text(
        popX + popW / 2, popY + popH / 2, '시퀀스 풀이 비어있습니다', {
          fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
          color: THEME.colors.textDim,
        }).setOrigin(0.5);
      this.popupContainer.add(empty);
      return;
    }

    pool.forEach((seq, i) => {
      const iy = popY + 36 + i * itemH;
      const isUsed = this.buildSlots.some((s, idx) => s?.id === seq.id && idx !== slotIndex);

      const itemBg = this.scene.add.graphics();
      itemBg.fillStyle(isUsed ? 0x1a1a24 : THEME.colors.cardBg, 1);
      itemBg.fillRoundedRect(popX + 10, iy, popW - 20, itemH - 4, 3);
      this.popupContainer!.add(itemBg);

      // 시퀀스 요약
      const codons = seq.codons.map(c => {
        const amino = AMINO_ACIDS[c.aminoAcidId];
        return `${c.triplet}(${amino.skillName})`;
      }).join(' — ');
      const summary = this.scene.add.text(popX + 18, iy + 4, codons, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: isUsed ? THEME.colors.textDim : THEME.colors.textMain,
        wordWrap: { width: popW - 36 },
      });
      this.popupContainer!.add(summary);

      const tags = seq.codons.map(c => AMINO_ACIDS[c.aminoAcidId].roleTag).join('/');
      const tagText = this.scene.add.text(popX + 18, iy + 22,
        tags + (isUsed ? '  (사용중)' : ''), {
          fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
          color: THEME.colors.textDim,
        });
      this.popupContainer!.add(tagText);

      if (!isUsed) {
        const zone = this.scene.add.zone(
          popX + popW / 2, iy + itemH / 2 - 2, popW - 20, itemH - 4,
        ).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => this.assignSequence(slotIndex, seq));
        this.popupContainer!.add(zone);
      }
    });
  }

  private assignSequence(slotIndex: number, seq: Sequence) {
    this.buildSlots[slotIndex] = seq;
    this.closePopup();
    this.rebuildSlots();
    this.updateAnalysis();
    this.tryCompleteBuild();
  }

  private closePopup() {
    if (this.popupContainer) {
      this.popupContainer.destroy();
      this.popupContainer = null;
    }
  }

  // ─── 빌드 완성 ───

  private tryCompleteBuild() {
    if (!this.selectedPlasmid) return;
    if (this.buildSlots.some(s => s === null)) return;

    const build = createBuild(this.selectedPlasmid, this.buildSlots as Sequence[]);
    const labScene = this.scene as { setCurrentBuild?: (b: Build) => void };
    if (labScene.setCurrentBuild) labScene.setCurrentBuild(build);
  }

  private onPoolChanged() {
    // 삭제된 시퀀스 참조 해제
    const poolIds = new Set(this.creature.sequencePool.map(s => s.id));
    for (let i = 0; i < this.buildSlots.length; i++) {
      if (this.buildSlots[i] && !poolIds.has(this.buildSlots[i]!.id)) {
        this.buildSlots[i] = null;
      }
    }
    this.rebuildSlots();
    this.updateAnalysis();
  }
}
