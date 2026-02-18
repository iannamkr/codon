// ─── CodonPreviewOverlay: 빌드 테이블에서 "코돈 보기" 클릭 시 우측 슬라이드인 오버레이 ───
// 읽기 전용 코돈 목록. 필터 + 스크롤 지원.

import Phaser from 'phaser';
import type { Creature, Codon, CodonRoleTag } from '../../data/types';
import { AMINO_ACIDS } from '../../data/codons';
import { filterByRole } from '../../systems/sequence-builder';
import { THEME, getRoleColor, getRarityLabel } from './theme';

type FilterType = 'all' | CodonRoleTag;

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: '전체', value: 'all' },
  { label: '파괴', value: 'Destroy' },
  { label: '생존', value: 'Survive' },
  { label: '질서', value: 'Order' },
  { label: '혼돈', value: 'Chaos' },
];

// 오버레이 레이아웃 상수
const OL = THEME.layout.workbench.overlay;
const PANEL_X = OL.x;        // 패널 시작 x (580)
const PANEL_W = OL.w;        // 패널 너비 (380)
const PANEL_H = OL.h;        // 패널 높이 (452)
const DIM_W = PANEL_X;       // 딤 영역 너비 (580)

// 필터 바
const CHIP_W = 60;
const CHIP_H = 22;
const CHIP_GAP = 2;
const FILTER_Y = 36;

// 스크롤 리스트
const LIST_Y = 66;
const LIST_H = 270;       // 줄임 — 상세 영역 확보
const ITEM_H = 36;
const ITEM_GAP = 2;
const LIST_PAD = 6;

// 선택 코돈 상세 정보 (리스트 아래)
const DETAIL_AREA_Y = LIST_Y + LIST_H + 4;  // 340

// 슬라이드 애니메이션
const SLIDE_IN_DURATION = 200;
const SLIDE_OUT_DURATION = 150;
const HIDDEN_X = 960;  // 화면 밖 (오른쪽으로 밀림)

export class CodonPreviewOverlay extends Phaser.GameObjects.Container {
  private creature: Creature | null = null;
  private activeFilter: FilterType = 'all';
  private _isOpen = false;
  private selectedIndex = -1;

  // 딤 배경
  private dimBg!: Phaser.GameObjects.Graphics;
  private dimZone!: Phaser.GameObjects.Zone;

  // 패널
  private panelBg!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private countTitleText!: Phaser.GameObjects.Text;
  private closeBtn!: Phaser.GameObjects.Text;
  private closeBtnZone!: Phaser.GameObjects.Zone;

  // 필터 바
  private filterChips: {
    bg: Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;
    zone: Phaser.GameObjects.Zone;
  }[] = [];

  // 스크롤 리스트
  private listContainer!: Phaser.GameObjects.Container;
  private listMask!: Phaser.GameObjects.Graphics;
  private scrollY = 0;

  // 하단 카운트
  private bottomCountText!: Phaser.GameObjects.Text;

  // 상세 정보 텍스트
  private detailContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setVisible(false);
    this.buildUI();
  }

  // ─── Public API ───

  /** 오버레이 열기: 실험체 데이터로 목록 채우고 슬라이드인 */
  show(creature: Creature): void {
    this.creature = creature;
    this.activeFilter = 'all';
    this.scrollY = 0;
    this.selectedIndex = -1;
    this._isOpen = true;

    this.rebuildList();
    this.redrawFilterBar();
    this.updateCounts();
    this.renderDetailEmpty();

    // 화면 밖에서 시작하여 슬라이드인
    this.setX(HIDDEN_X);
    this.setVisible(true);

    this.scene.tweens.add({
      targets: this,
      x: 0,
      duration: SLIDE_IN_DURATION,
      ease: 'Power2',
    });
  }

  /** 오버레이 닫기: 슬라이드아웃 후 숨김 */
  hide(): void {
    if (!this._isOpen) return;
    this._isOpen = false;

    this.scene.tweens.add({
      targets: this,
      x: HIDDEN_X,
      duration: SLIDE_OUT_DURATION,
      ease: 'Power2',
      onComplete: () => {
        this.setVisible(false);
        this.emit('closed');
      },
    });
  }

  /** 오버레이가 열려있는지 여부 */
  isOpen(): boolean {
    return this._isOpen;
  }

  destroy(fromScene?: boolean) {
    this.scene.input.off('wheel', this.onWheel, this);
    if (this.listMask) this.listMask.destroy();
    super.destroy(fromScene);
  }

  // ─── UI 구성 ───

  private buildUI() {
    this.buildDimBackdrop();
    this.buildPanel();
    this.buildTitleBar();
    this.buildCloseButton();
    this.buildFilterBar();
    this.buildScrollableList();
    this.buildDetailContainer();
    this.buildBottomCount();
  }

  /** 딤 배경: 왼쪽 영역 반투명 커버 (클릭 시 닫기) */
  private buildDimBackdrop() {
    this.dimBg = this.scene.add.graphics();
    this.dimBg.fillStyle(0x000000, 0.5);
    this.dimBg.fillRect(0, 0, DIM_W, PANEL_H);
    this.add(this.dimBg);

    this.dimZone = this.scene.add.zone(DIM_W / 2, PANEL_H / 2, DIM_W, PANEL_H)
      .setInteractive({ useHandCursor: false });
    this.dimZone.on('pointerdown', () => this.hide());
    this.add(this.dimZone);
  }

  /** 패널 배경: 우측 380px 영역 */
  private buildPanel() {
    this.panelBg = this.scene.add.graphics();
    // 배경
    this.panelBg.fillStyle(THEME.colors.panelBg, 1);
    this.panelBg.fillRect(PANEL_X, 0, PANEL_W, PANEL_H);
    // 왼쪽 경계선
    this.panelBg.lineStyle(1, THEME.colors.tabBorder, 1);
    this.panelBg.lineBetween(PANEL_X, 0, PANEL_X, PANEL_H);
    this.add(this.panelBg);
  }

  /** 타이틀 바: "코돈 목록" + "X/15" */
  private buildTitleBar() {
    this.titleText = this.scene.add.text(PANEL_X + 10, 8, '코돈 목록', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeLarge,
      color: THEME.colors.textMain,
    });
    this.add(this.titleText);

    this.countTitleText = this.scene.add.text(
      PANEL_X + PANEL_W - 10,
      10,
      '0/15',
      {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      },
    ).setOrigin(1, 0);
    this.add(this.countTitleText);
  }

  /** 닫기 버튼 (우상단 ✕) */
  private buildCloseButton() {
    this.closeBtn = this.scene.add.text(
      PANEL_X + PANEL_W - 24,
      2,
      '\u2715',  // ✕
      {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      },
    ).setOrigin(0.5, 0);
    this.add(this.closeBtn);

    this.closeBtnZone = this.scene.add.zone(
      PANEL_X + PANEL_W - 24,
      10,
      24,
      24,
    ).setInteractive({ useHandCursor: true });
    this.closeBtnZone.on('pointerdown', () => this.hide());
    this.add(this.closeBtnZone);
  }

  // ─── 필터 바 ───

  private buildFilterBar() {
    const startX = PANEL_X + (PANEL_W - (CHIP_W * 5 + CHIP_GAP * 4)) / 2;

    FILTER_OPTIONS.forEach((opt, i) => {
      const x = startX + i * (CHIP_W + CHIP_GAP);
      const y = FILTER_Y;

      const chipBg = this.scene.add.graphics();
      this.add(chipBg);

      const chipText = this.scene.add.text(x + CHIP_W / 2, y + CHIP_H / 2, opt.label, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      }).setOrigin(0.5);
      this.add(chipText);

      const chipZone = this.scene.add.zone(x + CHIP_W / 2, y + CHIP_H / 2, CHIP_W, CHIP_H)
        .setInteractive({ useHandCursor: true });
      chipZone.on('pointerdown', () => this.setFilter(opt.value));
      this.add(chipZone);

      this.filterChips.push({ bg: chipBg, text: chipText, zone: chipZone });
    });

    this.redrawFilterBar();
  }

  /** 필터 칩 활성/비활성 스타일 갱신 */
  private redrawFilterBar() {
    const startX = PANEL_X + (PANEL_W - (CHIP_W * 5 + CHIP_GAP * 4)) / 2;

    FILTER_OPTIONS.forEach((opt, i) => {
      const x = startX + i * (CHIP_W + CHIP_GAP);
      const y = FILTER_Y;
      const isActive = opt.value === this.activeFilter;
      const chip = this.filterChips[i];

      chip.bg.clear();
      if (isActive) {
        const roleColor = opt.value === 'all' ? THEME.colors.tabActive : getRoleColor(opt.value);
        chip.bg.fillStyle(roleColor, 0.3);
        chip.bg.fillRoundedRect(x, y, CHIP_W, CHIP_H, 3);
        chip.bg.lineStyle(1, roleColor, 1);
        chip.bg.strokeRoundedRect(x, y, CHIP_W, CHIP_H, 3);
      } else {
        chip.bg.fillStyle(THEME.colors.cardBg, 1);
        chip.bg.fillRoundedRect(x, y, CHIP_W, CHIP_H, 3);
        chip.bg.lineStyle(1, 0x333344, 0.3);
        chip.bg.strokeRoundedRect(x, y, CHIP_W, CHIP_H, 3);
      }

      chip.text.setStyle({
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: isActive ? THEME.colors.textMain : THEME.colors.textDim,
      });
    });
  }

  private setFilter(filter: FilterType) {
    if (this.activeFilter === filter) return;
    this.activeFilter = filter;
    this.scrollY = 0;
    this.selectedIndex = -1;
    this.redrawFilterBar();
    this.rebuildList();
    this.renderDetailEmpty();
  }

  // ─── 스크롤 리스트 ───

  private buildScrollableList() {
    this.listContainer = this.scene.add.container(0, LIST_Y);
    this.add(this.listContainer);

    // 지오메트리 마스크 생성 (월드 좌표 기준)
    this.listMask = this.scene.make.graphics({});
    this.updateMaskPosition();
    this.listMask.setVisible(false);

    const mask = this.listMask.createGeometryMask();
    this.listContainer.setMask(mask);

    // 마우스 휠 스크롤
    this.scene.input.on('wheel', this.onWheel, this);
  }

  /** 마스크 위치 갱신 — 화면 고정 좌표 */
  private updateMaskPosition() {
    const WB = THEME.layout.workbench;
    this.listMask.clear();
    this.listMask.fillStyle(0xffffff);
    // 오버레이가 y=contentY(88)에 배치되므로, 마스크도 월드 y 기준으로 설정
    this.listMask.fillRect(PANEL_X, WB.contentY + LIST_Y, PANEL_W, LIST_H);
  }

  private onWheel = (
    pointer: Phaser.Input.Pointer,
    _gameObjects: unknown[],
    _dx: number,
    dy: number,
  ) => {
    if (!this.visible || !this._isOpen) return;
    if (!this.creature) return;

    // 포인터가 패널 영역 안에 있을 때만 스크롤
    const WB = THEME.layout.workbench;
    const panelScreenY = WB.contentY;
    if (
      pointer.x < PANEL_X || pointer.x > PANEL_X + PANEL_W ||
      pointer.y < panelScreenY || pointer.y > panelScreenY + PANEL_H
    ) return;

    const codons = this.getFilteredCodons();
    const totalHeight = codons.length * (ITEM_H + ITEM_GAP);
    const maxScroll = Math.max(0, totalHeight - LIST_H);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, maxScroll);
    this.listContainer.setY(LIST_Y - this.scrollY);
  };

  // ─── 코돈 필터링 ───

  private getFilteredCodons(): Codon[] {
    if (!this.creature) return [];
    if (this.activeFilter === 'all') return [...this.creature.codonPool];
    return filterByRole(this.creature.codonPool, this.activeFilter);
  }

  // ─── 리스트 렌더링 ───

  private rebuildList() {
    this.listContainer.removeAll(true);
    this.listContainer.setY(LIST_Y - this.scrollY);

    const codons = this.getFilteredCodons();
    const listW = PANEL_W - LIST_PAD * 2;

    if (codons.length === 0) {
      const empty = this.scene.add.text(
        PANEL_X + PANEL_W / 2,
        40,
        '코돈이 없습니다',
        {
          fontFamily: THEME.font.family,
          fontSize: THEME.font.sizeMedium,
          color: THEME.colors.textDim,
        },
      ).setOrigin(0.5, 0);
      this.listContainer.add(empty);
      return;
    }

    codons.forEach((codon, i) => {
      const y = i * (ITEM_H + ITEM_GAP);
      const amino = AMINO_ACIDS[codon.aminoAcidId];
      if (!amino) return;

      const roleColor = getRoleColor(amino.roleTag);
      const roleHex = '#' + roleColor.toString(16).padStart(6, '0');
      const rarity = getRarityLabel(amino.pathCount);
      const isSelected = this.selectedIndex === i;

      // 아이템 배경
      const itemBg = this.scene.add.graphics();
      itemBg.fillStyle(
        isSelected ? THEME.colors.tabActive : THEME.colors.cardBg,
        isSelected ? 0.8 : 0.5,
      );
      itemBg.fillRoundedRect(PANEL_X + LIST_PAD, y, listW, ITEM_H, 3);
      // 왼쪽 역할 색상 바 (3px)
      itemBg.fillStyle(roleColor, 1);
      itemBg.fillRect(PANEL_X + LIST_PAD, y, 3, ITEM_H);
      this.listContainer.add(itemBg);

      // 코돈 정보: triplet + skillName + rarity
      const label = `${codon.triplet} ${amino.skillName}${rarity ? ' ' + rarity : ''}`;
      const mainText = this.scene.add.text(
        PANEL_X + LIST_PAD + 10,
        y + 3,
        label,
        {
          fontFamily: THEME.font.family,
          fontSize: THEME.font.sizeSmall,
          color: isSelected ? THEME.colors.textMain : THEME.colors.textDim,
        },
      );
      this.listContainer.add(mainText);

      // 역할 태그
      const roleText = this.scene.add.text(
        PANEL_X + LIST_PAD + 10,
        y + 19,
        amino.roleTag,
        {
          fontFamily: THEME.font.family,
          fontSize: THEME.font.sizeSmall,
          color: roleHex,
        },
      );
      this.listContainer.add(roleText);

      // 클릭 영역
      const zone = this.scene.add.zone(
        PANEL_X + LIST_PAD + listW / 2,
        y + ITEM_H / 2,
        listW,
        ITEM_H,
      ).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.selectCodon(i));
      this.listContainer.add(zone);
    });
  }

  /** 코돈 선택 → 하이라이트 + 상세 표시 */
  private selectCodon(index: number) {
    const codons = this.getFilteredCodons();
    if (index < 0 || index >= codons.length) return;
    this.selectedIndex = index;
    this.rebuildList();
    this.renderDetail(codons[index]);
  }

  // ─── 상세 정보 ───

  private buildDetailContainer() {
    this.detailContainer = this.scene.add.container(0, 0);
    this.add(this.detailContainer);
  }

  /** 선택 없음 — 안내 텍스트 */
  private renderDetailEmpty() {
    this.detailContainer.removeAll(true);
    const msg = this.scene.add.text(
      PANEL_X + PANEL_W / 2,
      DETAIL_AREA_Y + 30,
      '코돈을 선택하면 상세 정보가 표시됩니다',
      {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      },
    ).setOrigin(0.5);
    this.detailContainer.add(msg);
  }

  /** 선택된 코돈 상세 정보 (하위 Gene + 사용 시퀀스) */
  private renderDetail(codon: Codon) {
    this.detailContainer.removeAll(true);
    const amino = AMINO_ACIDS[codon.aminoAcidId];
    if (!amino) return;

    let ly = DETAIL_AREA_Y + 2;

    // 구분선
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, THEME.colors.tabBorder, 0.4);
    divider.lineBetween(PANEL_X + LIST_PAD, ly, PANEL_X + PANEL_W - LIST_PAD, ly);
    this.detailContainer.add(divider);
    ly += 6;

    // 코돈명 + 아미노산
    const rarity = getRarityLabel(amino.pathCount);
    const header = this.scene.add.text(
      PANEL_X + LIST_PAD + 4,
      ly,
      `[${codon.triplet}] ${amino.skillName}${rarity ? ' ' + rarity : ''} — ${amino.roleTag}`,
      {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textMain,
      },
    );
    this.detailContainer.add(header);
    ly += 18;

    // 하위 Gene 3행
    for (let i = 0; i < 3; i++) {
      const sg = codon.subGenes[i];
      const gene = codon.triplet[i];
      const geneColor = THEME.colors.gene[gene] ?? 0x888888;
      const geneHex = '#' + geneColor.toString(16).padStart(6, '0');

      const sgText = this.scene.add.text(
        PANEL_X + LIST_PAD + 4,
        ly,
        `${gene}-${sg.nameKo} ${sg.description}`,
        {
          fontFamily: THEME.font.family,
          fontSize: THEME.font.sizeSmall,
          color: geneHex,
          wordWrap: { width: PANEL_W - LIST_PAD * 2 - 8 },
        },
      );
      this.detailContainer.add(sgText);
      ly += 14;
    }

    // 사용 중인 시퀀스 표시
    if (this.creature) {
      const usedSeqs = this.creature.sequencePool.filter(seq =>
        seq.codons.some(c => c === codon),
      );
      if (usedSeqs.length > 0) {
        ly += 2;
        const usedText = this.scene.add.text(
          PANEL_X + LIST_PAD + 4,
          ly,
          `${usedSeqs.length}개 시퀀스에서 사용 중`,
          {
            fontFamily: THEME.font.family,
            fontSize: THEME.font.sizeSmall,
            color: '#cc6633',
          },
        );
        this.detailContainer.add(usedText);
      }
    }
  }

  // ─── 카운트 텍스트 ───

  private buildBottomCount() {
    this.bottomCountText = this.scene.add.text(
      PANEL_X + PANEL_W - LIST_PAD,
      PANEL_H - 18,
      '',
      {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      },
    ).setOrigin(1, 0);
    this.add(this.bottomCountText);
  }

  /** 상단 + 하단 카운트 갱신 */
  private updateCounts() {
    const count = this.creature?.codonPool.length ?? 0;
    this.countTitleText.setText(`${count}/15`);
    this.bottomCountText.setText(`\uCF54\uB3C8: ${count}/15`);
  }
}
