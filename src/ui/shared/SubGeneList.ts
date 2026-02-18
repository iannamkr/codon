// ─── SubGeneList: 하위 Gene 10종 선택 리스트 ───

import Phaser from 'phaser';
import type { Gene, SubGene } from '../../data/types';
import { getSubGenesForGene } from '../../data/sub-genes';
import { THEME, getGeneColor } from '../lab/theme';

const ITEM_H = 22;

export class SubGeneList extends Phaser.GameObjects.Container {
  private items: {
    radio: Phaser.GameObjects.Text;
    label: Phaser.GameObjects.Text;
    zone: Phaser.GameObjects.Zone;
  }[] = [];
  private selectedIndex = 0;
  private subGenes: SubGene[] = [];
  private currentGene: Gene = 'A';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
  }

  /** Gene 설정 및 리스트 갱신 */
  setGene(gene: Gene) {
    this.currentGene = gene;
    this.selectedIndex = 0;
    this.subGenes = getSubGenesForGene(gene);
    this.rebuild();
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  getSelectedSubGene(): SubGene | undefined {
    return this.subGenes[this.selectedIndex];
  }

  private rebuild() {
    // 기존 아이템 정리
    this.removeAll(true);
    this.items = [];

    const color = getGeneColor(this.currentGene);
    const colorHex = '#' + color.toString(16).padStart(6, '0');

    this.subGenes.forEach((sg, i) => {
      const y = i * ITEM_H;

      // 라디오 표시
      const radio = this.scene.add.text(0, y, i === 0 ? '\u25cf' : '\u25cb', {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: colorHex,
      });
      this.add(radio);

      // 이름 + 설명
      const label = this.scene.add.text(16, y, `${sg.nameKo}  ${sg.description}`, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: i === 0 ? THEME.colors.textMain : THEME.colors.textDim,
      });
      this.add(label);

      // 클릭 영역
      const zone = this.scene.add.zone(100, y + ITEM_H / 2, 200, ITEM_H)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.selectItem(i);
      });
      this.add(zone);

      this.items.push({ radio, label, zone });
    });
  }

  private selectItem(index: number) {
    const color = getGeneColor(this.currentGene);
    const colorHex = '#' + color.toString(16).padStart(6, '0');

    // 이전 선택 해제
    if (this.items[this.selectedIndex]) {
      this.items[this.selectedIndex].radio.setText('\u25cb');
      this.items[this.selectedIndex].label.setStyle({ color: THEME.colors.textDim });
    }

    // 새 선택
    this.selectedIndex = index;
    this.items[index].radio.setText('\u25cf');
    this.items[index].label.setStyle({ color: THEME.colors.textMain });

    this.emit('select', index, this.subGenes[index]);
  }
}
