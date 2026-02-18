// ─── CodonPoolPanel: 코돈 풀 관리 패널 (탭2) ───
// PoE2 스타일: 왼쪽=필터+코돈 목록, 오른쪽=선택한 코돈 상세

import Phaser from 'phaser';
import type { Creature, Codon, CodonRoleTag } from '../../data/types';
import { AMINO_ACIDS } from '../../data/codons';
import { removeCodon } from '../../systems/pool-manager';
import { filterByRole } from '../../systems/sequence-builder';
import { THEME, getRoleColor, getRarityLabel } from './theme';

type FilterType = 'all' | CodonRoleTag;

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: '전체', value: 'all' },
  { label: 'Destroy', value: 'Destroy' },
  { label: 'Survive', value: 'Survive' },
  { label: 'Order', value: 'Order' },
  { label: 'Chaos', value: 'Chaos' },
];

export class CodonPoolPanel extends Phaser.GameObjects.Container {
  private creature: Creature;
  private activeFilter: FilterType = 'all';
  private selectedIndex = -1;

  // 왼쪽: 필터 + 목록
  private filterButtons: { bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text }[] = [];
  private listContainer!: Phaser.GameObjects.Container;

  // 오른쪽: 상세
  private detailContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, creature: Creature) {
    super(scene, 0, THEME.layout.workspaceY);
    this.creature = creature;
    this.buildUI();
    scene.events.on('poolChanged', this.rebuildList, this);
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

    this.buildFilterBar();

    // 목록 컨테이너
    this.listContainer = this.scene.add.container(0, 40);
    this.add(this.listContainer);

    // 상세 컨테이너
    this.detailContainer = this.scene.add.container(L.dividerX + L.padding, L.padding);
    this.add(this.detailContainer);

    this.rebuildList();
    this.updateDetail();
  }

  // ─── 필터 바 ───

  private buildFilterBar() {
    const pad = THEME.layout.padding;
    const btnW = 54;
    const btnH = 22;
    const gap = 4;

    FILTER_OPTIONS.forEach((opt, i) => {
      const x = pad + i * (btnW + gap);
      const y = pad;
      const isActive = opt.value === this.activeFilter;

      const bg = this.scene.add.graphics();
      this.drawFilterBtn(bg, x, y, btnW, btnH, isActive, opt.value);
      this.add(bg);

      const text = this.scene.add.text(x + btnW / 2, y + btnH / 2, opt.label, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: isActive ? THEME.colors.textMain : THEME.colors.textDim,
      }).setOrigin(0.5);
      this.add(text);

      const zone = this.scene.add.zone(x + btnW / 2, y + btnH / 2, btnW, btnH)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.setFilter(opt.value));
      this.add(zone);

      this.filterButtons.push({ bg, text });
    });
  }

  private drawFilterBtn(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    active: boolean, filter: FilterType,
  ) {
    g.clear();
    if (active) {
      const color = filter === 'all' ? THEME.colors.tabActive : getRoleColor(filter);
      g.fillStyle(color, 0.3);
      g.lineStyle(1, color, 1);
    } else {
      g.fillStyle(THEME.colors.cardBg, 1);
      g.lineStyle(1, 0x333344, 0.3);
    }
    g.fillRoundedRect(x, y, w, h, 3);
    g.strokeRoundedRect(x, y, w, h, 3);
  }

  private setFilter(filter: FilterType) {
    this.activeFilter = filter;
    this.selectedIndex = -1;

    const pad = THEME.layout.padding;
    const btnW = 54;
    const btnH = 22;
    const gap = 4;
    FILTER_OPTIONS.forEach((opt, i) => {
      const x = pad + i * (btnW + gap);
      const y = pad;
      const isActive = opt.value === filter;
      this.drawFilterBtn(this.filterButtons[i].bg, x, y, btnW, btnH, isActive, opt.value);
      this.filterButtons[i].text.setStyle({
        color: isActive ? THEME.colors.textMain : THEME.colors.textDim,
      });
    });

    this.rebuildList();
    this.updateDetail();
  }

  // ─── 왼쪽: 코돈 목록 ───

  private getFilteredCodons(): Codon[] {
    if (this.activeFilter === 'all') return [...this.creature.codonPool];
    return filterByRole(this.creature.codonPool, this.activeFilter);
  }

  private rebuildList() {
    this.listContainer.removeAll(true);
    const codons = this.getFilteredCodons();
    const pad = THEME.layout.padding;
    const itemH = THEME.layout.listItemH;
    const listW = THEME.layout.leftPanelW - pad * 2;

    if (codons.length === 0) {
      const empty = this.scene.add.text(THEME.layout.leftPanelW / 2, 60, '코돈이 없습니다', {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textDim,
      }).setOrigin(0.5, 0);
      this.listContainer.add(empty);
      return;
    }

    codons.forEach((codon, i) => {
      const y = i * (itemH + 2);
      const amino = AMINO_ACIDS[codon.aminoAcidId];
      const roleColor = getRoleColor(amino.roleTag);
      const roleHex = '#' + roleColor.toString(16).padStart(6, '0');
      const rarity = getRarityLabel(amino.pathCount);
      const isSelected = this.selectedIndex === i;

      // 배경
      const itemBg = this.scene.add.graphics();
      itemBg.fillStyle(isSelected ? THEME.colors.tabActive : THEME.colors.cardBg, isSelected ? 0.8 : 0.5);
      itemBg.fillRoundedRect(pad, y, listW, itemH, 3);
      itemBg.fillStyle(roleColor, 1);
      itemBg.fillRect(pad, y, 3, itemH);
      this.listContainer.add(itemBg);

      // triplet + skillName + rarity
      const label = `${codon.triplet} ${amino.skillName}${rarity ? ' ' + rarity : ''}`;
      const t = this.scene.add.text(pad + 10, y + 4, label, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: isSelected ? THEME.colors.textMain : THEME.colors.textDim,
      });
      this.listContainer.add(t);

      // 역할 태그
      const rt = this.scene.add.text(pad + 10, y + 20, amino.roleTag, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: roleHex,
      });
      this.listContainer.add(rt);

      // 클릭
      const zone = this.scene.add.zone(pad + listW / 2, y + itemH / 2, listW, itemH)
        .setInteractive({ useHandCursor: true });
      const idx = i;
      zone.on('pointerdown', () => {
        this.selectedIndex = idx;
        this.rebuildList();
        this.updateDetail();
      });
      this.listContainer.add(zone);
    });
  }

  // ─── 오른쪽: 코돈 상세 ───

  private updateDetail() {
    this.detailContainer.removeAll(true);
    const codons = this.getFilteredCodons();
    const rw = THEME.layout.rightPanelW - THEME.layout.padding * 2;

    if (this.selectedIndex < 0 || this.selectedIndex >= codons.length) {
      const msg = this.scene.add.text(rw / 2, 180, '코돈을 선택하세요', {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textDim,
      }).setOrigin(0.5);
      this.detailContainer.add(msg);
      return;
    }

    const codon = codons[this.selectedIndex];
    const amino = AMINO_ACIDS[codon.aminoAcidId];
    const roleColor = getRoleColor(amino.roleTag);
    const roleHex = '#' + roleColor.toString(16).padStart(6, '0');
    const rarity = getRarityLabel(amino.pathCount);

    // 카드 배경
    const cardW = Math.min(420, rw);
    const cardH = 260;
    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(THEME.colors.cardBg, 1);
    cardBg.fillRoundedRect(0, 0, cardW, cardH, 6);
    cardBg.fillStyle(roleColor, 1);
    cardBg.fillRect(0, 0, 6, cardH);
    this.detailContainer.add(cardBg);

    let ly = 14;

    // 헤더: triplet + skillName + rarity
    const header = this.scene.add.text(16, ly, `[${codon.triplet}] ${amino.skillName}${rarity ? '  ' + rarity : ''}`, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeLarge,
      color: THEME.colors.textMain,
    });
    this.detailContainer.add(header);
    ly += 28;

    // 역할 + 경로
    const roleText = this.scene.add.text(16, ly, `${amino.roleTag}  |  경로: ${amino.pathCount}`, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: roleHex,
    });
    this.detailContainer.add(roleText);
    ly += 24;

    // 설명
    const desc = this.scene.add.text(16, ly, amino.description, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textMain,
      wordWrap: { width: cardW - 32 },
    });
    this.detailContainer.add(desc);
    ly += 36;

    // 구분선
    const div = this.scene.add.graphics();
    div.lineStyle(1, THEME.colors.tabBorder, 0.4);
    div.lineBetween(16, ly, cardW - 16, ly);
    this.detailContainer.add(div);
    ly += 12;

    // 하위 Gene 3개
    for (let i = 0; i < 3; i++) {
      const sg = codon.subGenes[i];
      const gene = codon.triplet[i];
      const geneColor = THEME.colors.gene[gene] ?? 0x888888;
      const geneHex = '#' + geneColor.toString(16).padStart(6, '0');

      const sgText = this.scene.add.text(16, ly, `${gene}-${sg.nameKo}  ${sg.description}`, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
        color: geneHex,
      });
      this.detailContainer.add(sgText);
      ly += 22;
    }

    // 삭제 버튼
    const delBtnX = cardW - 120;
    const delBtnY = cardH - 40;
    const delBtnW = 100;
    const delBtnH = 28;

    const delBg = this.scene.add.graphics();
    delBg.fillStyle(THEME.colors.btnDanger, 1);
    delBg.fillRoundedRect(delBtnX, delBtnY, delBtnW, delBtnH, 4);
    this.detailContainer.add(delBg);

    const delText = this.scene.add.text(delBtnX + delBtnW / 2, delBtnY + delBtnH / 2, '삭제', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: '#ffffff',
    }).setOrigin(0.5);
    this.detailContainer.add(delText);

    const delZone = this.scene.add.zone(delBtnX + delBtnW / 2, delBtnY + delBtnH / 2, delBtnW, delBtnH)
      .setInteractive({ useHandCursor: true });
    delZone.on('pointerdown', () => this.deleteSelectedCodon());
    this.detailContainer.add(delZone);
  }

  // ─── 삭제 ───

  private deleteSelectedCodon() {
    const codons = this.getFilteredCodons();
    if (this.selectedIndex < 0 || this.selectedIndex >= codons.length) return;

    const codon = codons[this.selectedIndex];
    const poolIndex = this.creature.codonPool.indexOf(codon);
    if (poolIndex < 0) return;

    // 시퀀스 참조 경고
    const usedSeqs = this.creature.sequencePool.filter(seq =>
      seq.codons.some(c => c === codon),
    );
    if (usedSeqs.length > 0) {
      console.warn(
        `코돈 ${codon.triplet}이(가) ${usedSeqs.length}개 시퀀스에서 사용 중 — 참조 해제됨`,
      );
    }

    const result = removeCodon(this.creature.codonPool, poolIndex);
    if (result.success) {
      this.selectedIndex = -1;
      this.scene.events.emit('poolChanged');
    }
  }
}
