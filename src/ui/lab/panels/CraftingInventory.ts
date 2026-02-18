// ─── CraftingInventory: 제작대 오른쪽 패널 ───
// CodonInventory(목록) + CodonDetail(상세/삭제)를 하나로 합친 복합 패널.
// 필터 바 → 스크롤 목록 → 구분선 → 상세 보기 + 삭제 버튼 순서로 배치.

import Phaser from 'phaser';
import type { Creature, Codon, CodonRoleTag } from '../../../data/types';
import { AMINO_ACIDS } from '../../../data/codons';
import { filterByRole } from '../../../systems/sequence-builder';
import { removeCodon } from '../../../systems/pool-manager';
import { THEME, getRoleColor, getRarityLabel } from '../theme';

// ─── 필터 타입 ───

type FilterType = 'all' | CodonRoleTag;

// ─── 레이아웃 상수 ───

const PANEL_W = 340;
const PANEL_H = 440;

// 필터 바
const FILTER_BAR_Y = 4;
const CHIP_W = 58;
const CHIP_H = 22;
const CHIP_GAP = 2;

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: '전체', value: 'all' },
  { label: 'Destroy', value: 'Destroy' },
  { label: 'Survive', value: 'Survive' },
  { label: 'Order', value: 'Order' },
  { label: 'Chaos', value: 'Chaos' },
];

// 코돈 목록
const LIST_Y = 32;
const LIST_H = 220;
const ITEM_H = 34;
const ITEM_GAP = 2;
const LIST_PAD = 6;

// 구분선
const DIVIDER_Y = 258;

// 상세 보기
const DETAIL_Y = 264;
const DETAIL_H = 140;

// 삭제 버튼
const DELETE_BTN_W = 80;
const DELETE_BTN_H = 26;

// 하단 카운터
const COUNTER_Y = 418;

export class CraftingInventory extends Phaser.GameObjects.Container {
  private creature: Creature;
  private activeFilter: FilterType = 'all';
  private selectedIndex = -1;
  private selectedCodon: Codon | null = null;
  private selectedPoolIndex = -1;

  // 필터 칩 UI 요소
  private filterChips: {
    bg: Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;
    zone: Phaser.GameObjects.Zone;
  }[] = [];

  // 스크롤 목록
  private listContainer!: Phaser.GameObjects.Container;
  private listMask!: Phaser.GameObjects.Graphics;
  private scrollY = 0;

  // 상세 보기 컨테이너
  private detailContainer!: Phaser.GameObjects.Container;

  // 하단 카운터
  private counterText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, creature: Creature) {
    super(scene, x, y);
    this.creature = creature;
    this.buildUI();

    // poolChanged 이벤트 구독 — 외부에서 풀 변경 시 재구성
    scene.events.on('poolChanged', this.onPoolChanged, this);
  }

  destroy(fromScene?: boolean) {
    this.scene.events.off('poolChanged', this.onPoolChanged, this);
    this.scene.input.off('wheel', this.onWheel, this);
    if (this.listMask) this.listMask.destroy();
    super.destroy(fromScene);
  }

  // ─── 공개 API ───

  /** 실험체 교체 후 전체 재구성 */
  setCreature(creature: Creature): void {
    this.creature = creature;
    this.activeFilter = 'all';
    this.selectedIndex = -1;
    this.selectedCodon = null;
    this.selectedPoolIndex = -1;
    this.scrollY = 0;
    this.redrawFilterBar();
    this.rebuildList();
    this.renderEmpty();
  }

  // ═════════════════════════════════════════════
  //  UI 구성
  // ═════════════════════════════════════════════

  private buildUI() {
    // 패널 배경
    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.colors.panelBg, 1);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 0);
    this.add(bg);

    this.buildFilterBar();
    this.buildCounter();
    this.buildList();
    this.buildDivider();
    this.buildDetailContainer();

    // 초기 상태: 빈 상세 보기
    this.renderEmpty();
  }

  // ═════════════════════════════════════════════
  //  필터 바 (y=4)
  // ═════════════════════════════════════════════

  private buildFilterBar() {
    // 5개 칩을 중앙 정렬
    const totalW = CHIP_W * FILTER_OPTIONS.length + CHIP_GAP * (FILTER_OPTIONS.length - 1);
    const startX = (PANEL_W - totalW) / 2;

    FILTER_OPTIONS.forEach((opt, i) => {
      const cx = startX + i * (CHIP_W + CHIP_GAP);
      const cy = FILTER_BAR_Y;

      const chipBg = this.scene.add.graphics();
      this.add(chipBg);

      const chipText = this.scene.add.text(cx + CHIP_W / 2, cy + CHIP_H / 2, opt.label, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      }).setOrigin(0.5);
      this.add(chipText);

      const chipZone = this.scene.add.zone(cx + CHIP_W / 2, cy + CHIP_H / 2, CHIP_W, CHIP_H)
        .setInteractive({ useHandCursor: true });
      chipZone.on('pointerdown', () => this.setFilter(opt.value));
      this.add(chipZone);

      this.filterChips.push({ bg: chipBg, text: chipText, zone: chipZone });
    });

    this.redrawFilterBar();
  }

  /** 필터 칩 활성/비활성 스타일 갱신 */
  private redrawFilterBar() {
    const totalW = CHIP_W * FILTER_OPTIONS.length + CHIP_GAP * (FILTER_OPTIONS.length - 1);
    const startX = (PANEL_W - totalW) / 2;

    FILTER_OPTIONS.forEach((opt, i) => {
      const cx = startX + i * (CHIP_W + CHIP_GAP);
      const cy = FILTER_BAR_Y;
      const isActive = opt.value === this.activeFilter;
      const chip = this.filterChips[i];

      chip.bg.clear();

      if (isActive) {
        const roleColor = opt.value === 'all' ? THEME.colors.tabActive : getRoleColor(opt.value);
        chip.bg.fillStyle(roleColor, 0.3);
        chip.bg.fillRoundedRect(cx, cy, CHIP_W, CHIP_H, 3);
        chip.bg.lineStyle(1, roleColor, 1);
        chip.bg.strokeRoundedRect(cx, cy, CHIP_W, CHIP_H, 3);
      } else {
        chip.bg.fillStyle(THEME.colors.cardBg, 1);
        chip.bg.fillRoundedRect(cx, cy, CHIP_W, CHIP_H, 3);
        chip.bg.lineStyle(1, 0x333344, 0.3);
        chip.bg.strokeRoundedRect(cx, cy, CHIP_W, CHIP_H, 3);
      }

      chip.text.setStyle({
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: isActive ? THEME.colors.textMain : THEME.colors.textDim,
      });
    });
  }

  /** 필터 변경 처리 */
  private setFilter(filter: FilterType) {
    if (this.activeFilter === filter) return;
    this.activeFilter = filter;
    this.selectedIndex = -1;
    this.selectedCodon = null;
    this.selectedPoolIndex = -1;
    this.scrollY = 0;
    this.redrawFilterBar();
    this.rebuildList();
    this.renderEmpty();
  }

  // ═════════════════════════════════════════════
  //  코돈 목록 (y=32, height=220) — 스크롤 가능
  // ═════════════════════════════════════════════

  private buildList() {
    this.listContainer = this.scene.add.container(0, LIST_Y);
    this.add(this.listContainer);

    // 마스크 생성 — 월드 좌표 기준 (컨테이너 위치 + 목록 오프셋)
    this.listMask = this.scene.make.graphics({});
    this.updateMaskPosition();
    this.listMask.setVisible(false);

    const mask = this.listMask.createGeometryMask();
    this.listContainer.setMask(mask);

    // 마우스 휠 스크롤
    this.scene.input.on('wheel', this.onWheel, this);

    this.rebuildList();
  }

  /** 마스크 위치 갱신 (화면 고정 좌표) */
  private updateMaskPosition() {
    const WB = THEME.layout.workbench;
    this.listMask.clear();
    this.listMask.fillStyle(0xffffff);
    // 제작대 활성 시 화면 위치: inventoryX(610), contentY(88) + LIST_Y(32)
    this.listMask.fillRect(
      WB.craft.inventoryX,
      WB.contentY + LIST_Y,
      PANEL_W,
      LIST_H,
    );
  }

  /** 마우스 휠 이벤트 핸들러 — 포인터가 목록 영역 안에 있을 때만 반응 */
  private onWheel = (
    pointer: Phaser.Input.Pointer,
    _gameObjects: unknown[],
    _dx: number,
    dy: number,
  ) => {
    if (!this.visible) return;

    // 포인터가 목록 영역 안에 있는지 확인 (화면 좌표 기준)
    const WB = THEME.layout.workbench;
    const listScreenX = WB.craft.inventoryX;
    const listScreenY = WB.contentY + LIST_Y;
    if (
      pointer.x < listScreenX || pointer.x > listScreenX + PANEL_W ||
      pointer.y < listScreenY || pointer.y > listScreenY + LIST_H
    ) return;

    const codons = this.getFilteredCodons();
    const totalHeight = codons.length * (ITEM_H + ITEM_GAP);
    const maxScroll = Math.max(0, totalHeight - LIST_H);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, maxScroll);
    this.listContainer.setY(LIST_Y - this.scrollY);
  };

  /** 현재 필터에 맞는 코돈 목록 반환 */
  private getFilteredCodons(): Codon[] {
    if (this.activeFilter === 'all') return [...this.creature.codonPool];
    return filterByRole(this.creature.codonPool, this.activeFilter);
  }

  /** 코돈 목록 재구성 */
  private rebuildList() {
    this.listContainer.removeAll(true);
    this.listContainer.setY(LIST_Y - this.scrollY);
    this.updateMaskPosition();

    const codons = this.getFilteredCodons();
    const listW = PANEL_W - LIST_PAD * 2;

    if (codons.length === 0) {
      const empty = this.scene.add.text(PANEL_W / 2, 40, '코돈이 없습니다', {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textDim,
      }).setOrigin(0.5, 0);
      this.listContainer.add(empty);
      this.updateCounter();
      return;
    }

    codons.forEach((codon, i) => {
      const iy = i * (ITEM_H + ITEM_GAP);
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
      itemBg.fillRoundedRect(LIST_PAD, iy, listW, ITEM_H, 3);
      // 왼쪽 역할 색상 바 (3px)
      itemBg.fillStyle(roleColor, 1);
      itemBg.fillRect(LIST_PAD, iy, 3, ITEM_H);
      this.listContainer.add(itemBg);

      // 코돈명 + 스킬명 + 희귀도
      const label = `${codon.triplet} ${amino.skillName}${rarity ? ' ' + rarity : ''}`;
      const mainText = this.scene.add.text(LIST_PAD + 10, iy + 3, label, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: isSelected ? THEME.colors.textMain : THEME.colors.textDim,
      });
      this.listContainer.add(mainText);

      // 역할 태그 (하단)
      const roleText = this.scene.add.text(LIST_PAD + 10, iy + 18, amino.roleTag, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: roleHex,
      });
      this.listContainer.add(roleText);

      // 클릭 영역
      const zone = this.scene.add.zone(
        LIST_PAD + listW / 2,
        iy + ITEM_H / 2,
        listW,
        ITEM_H,
      ).setInteractive({ useHandCursor: true });
      const idx = i;
      zone.on('pointerdown', () => this.selectCodon(idx));
      this.listContainer.add(zone);
    });

    this.updateCounter();
  }

  /** 코돈 선택 처리 */
  private selectCodon(index: number) {
    const codons = this.getFilteredCodons();
    if (index < 0 || index >= codons.length) return;

    this.selectedIndex = index;
    this.selectedCodon = codons[index];
    // 실제 풀 인덱스 계산 (삭제용)
    this.selectedPoolIndex = this.creature.codonPool.indexOf(this.selectedCodon);

    this.rebuildList();
    this.renderDetail();
  }

  // ═════════════════════════════════════════════
  //  구분선 (y=258)
  // ═════════════════════════════════════════════

  private buildDivider() {
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, THEME.colors.tabBorder, 0.4);
    divider.lineBetween(LIST_PAD, DIVIDER_Y, PANEL_W - LIST_PAD, DIVIDER_Y);
    this.add(divider);
  }

  // ═════════════════════════════════════════════
  //  상세 보기 (y=264, height=140)
  // ═════════════════════════════════════════════

  private buildDetailContainer() {
    this.detailContainer = this.scene.add.container(0, 0);
    this.add(this.detailContainer);
  }

  /** 빈 상태 — 코돈 미선택 */
  private renderEmpty() {
    this.detailContainer.removeAll(true);

    const msg = this.scene.add.text(PANEL_W / 2, DETAIL_Y + DETAIL_H / 2, '코돈을 선택하세요', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textDim,
    }).setOrigin(0.5);
    this.detailContainer.add(msg);
  }

  /** 선택된 코돈 상세 정보 렌더링 */
  private renderDetail() {
    this.detailContainer.removeAll(true);

    if (!this.selectedCodon) {
      this.renderEmpty();
      return;
    }

    const codon = this.selectedCodon;
    const amino = AMINO_ACIDS[codon.aminoAcidId];
    if (!amino) {
      this.renderEmpty();
      return;
    }

    const roleColor = getRoleColor(amino.roleTag);
    const roleHex = '#' + roleColor.toString(16).padStart(6, '0');
    const rarity = getRarityLabel(amino.pathCount);
    let ly = DETAIL_Y + 4;

    // 헤더: [ATG] skillName rarity
    const headerStr = `[${codon.triplet}] ${amino.skillName}${rarity ? ' ' + rarity : ''}`;
    const header = this.scene.add.text(LIST_PAD + 4, ly, headerStr, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textMain,
    });
    this.detailContainer.add(header);
    ly += 18;

    // 역할 + 경로 수
    const roleStr = `${amino.roleTag} | 경로: ${amino.pathCount}`;
    const roleText = this.scene.add.text(LIST_PAD + 4, ly, roleStr, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: roleHex,
    });
    this.detailContainer.add(roleText);
    ly += 16;

    // 하위 Gene 3행
    for (let i = 0; i < 3; i++) {
      const sg = codon.subGenes[i];
      const gene = codon.triplet[i];
      const geneColor = THEME.colors.gene[gene] ?? 0x888888;
      const geneHex = '#' + geneColor.toString(16).padStart(6, '0');

      const sgStr = `${gene}-${sg.nameKo} ${sg.description}`;
      const sgText = this.scene.add.text(LIST_PAD + 4, ly, sgStr, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: geneHex,
        wordWrap: { width: PANEL_W - LIST_PAD * 2 - 8 },
      });
      this.detailContainer.add(sgText);
      ly += 15;
    }

    ly += 4;

    // 사용 중 여부 체크
    const usedSequences = this.creature.sequencePool.filter(seq =>
      seq.codons.some(c => c === codon),
    );

    // 삭제 버튼 (중앙 정렬)
    const delBtnX = (PANEL_W - DELETE_BTN_W) / 2;
    const delBtnY = ly;

    const delBg = this.scene.add.graphics();
    delBg.fillStyle(THEME.colors.btnDanger, 1);
    delBg.fillRoundedRect(delBtnX, delBtnY, DELETE_BTN_W, DELETE_BTN_H, 4);
    this.detailContainer.add(delBg);

    const delText = this.scene.add.text(
      delBtnX + DELETE_BTN_W / 2,
      delBtnY + DELETE_BTN_H / 2,
      '삭제',
      {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: '#ffffff',
      },
    ).setOrigin(0.5);
    this.detailContainer.add(delText);

    const delZone = this.scene.add.zone(
      delBtnX + DELETE_BTN_W / 2,
      delBtnY + DELETE_BTN_H / 2,
      DELETE_BTN_W,
      DELETE_BTN_H,
    ).setInteractive({ useHandCursor: true });
    delZone.on('pointerdown', () => this.deleteCodon());
    this.detailContainer.add(delZone);

    // 사용 중 경고 텍스트
    if (usedSequences.length > 0) {
      const warnText = this.scene.add.text(
        PANEL_W / 2,
        delBtnY + DELETE_BTN_H + 4,
        `\u26A0 ${usedSequences.length}개 시퀀스에서 사용 중`,
        {
          fontFamily: THEME.font.family,
          fontSize: THEME.font.sizeSmall,
          color: '#cc6633',
        },
      ).setOrigin(0.5, 0);
      this.detailContainer.add(warnText);
    }
  }

  // ═════════════════════════════════════════════
  //  삭제 처리
  // ═════════════════════════════════════════════

  /** 선택된 코돈을 풀에서 제거 */
  private deleteCodon() {
    if (!this.selectedCodon || this.selectedPoolIndex < 0) return;

    const result = removeCodon(this.creature.codonPool, this.selectedPoolIndex);
    if (result.success) {
      this.selectedCodon = null;
      this.selectedPoolIndex = -1;
      this.selectedIndex = -1;
      this.renderEmpty();
      // poolChanged 이벤트 발행 — 다른 패널에 통지
      this.scene.events.emit('poolChanged');
    }
  }

  // ═════════════════════════════════════════════
  //  하단 카운터 (y=418)
  // ═════════════════════════════════════════════

  private buildCounter() {
    this.counterText = this.scene.add.text(
      PANEL_W - LIST_PAD,
      COUNTER_Y,
      '',
      {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      },
    ).setOrigin(1, 0);
    this.add(this.counterText);
    this.updateCounter();
  }

  /** 카운터 텍스트 갱신 */
  private updateCounter() {
    const count = this.creature.codonPool.length;
    this.counterText.setText(`코돈: ${count}/15`);
  }

  // ═════════════════════════════════════════════
  //  이벤트 핸들러
  // ═════════════════════════════════════════════

  /** poolChanged 수신 — 목록 재구성 */
  private onPoolChanged = () => {
    this.selectedIndex = -1;
    this.selectedCodon = null;
    this.selectedPoolIndex = -1;
    this.scrollY = 0;
    this.rebuildList();
    this.renderEmpty();
  };
}
