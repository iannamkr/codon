// ─── HeaderBar: 실험체 정보 상단 바 ───

import Phaser from 'phaser';
import { THEME, getElementColor } from './theme';
import type { Creature } from '../../data/types';

/** 체질 한글명 매핑 */
const CONSTITUTION_KO: Record<string, string> = {
  Aggro: '맹공',
  Fortress: '철벽',
  Swift: '신속',
  Regen: '재생',
  Mutant: '변이',
  Balance: '균형',
};

export class HeaderBar extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private genText: Phaser.GameObjects.Text;
  private elementText: Phaser.GameObjects.Text;
  private constitutionText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, creature: Creature) {
    super(scene, 0, 0);

    const { width, headerHeight, padding } = THEME.layout;
    const font = THEME.font;

    // 배경
    this.bg = scene.add.graphics();
    this.bg.fillStyle(THEME.colors.panelBg, 1);
    this.bg.fillRect(0, 0, width, headerHeight);
    this.add(this.bg);

    // 하단 구분선
    this.bg.lineStyle(1, THEME.colors.tabBorder, 0.5);
    this.bg.lineBetween(0, headerHeight - 1, width, headerHeight - 1);

    const y = headerHeight / 2;
    let x = padding + 8;

    // 라벨
    const label = scene.add.text(x, y, '실험체:', {
      fontFamily: font.family,
      fontSize: font.sizeMedium,
      color: THEME.colors.textDim,
    }).setOrigin(0, 0.5);
    this.add(label);
    x += label.width + 6;

    // 이름
    this.nameText = scene.add.text(x, y, '', {
      fontFamily: font.family,
      fontSize: font.sizeLarge,
      color: THEME.colors.textMain,
    }).setOrigin(0, 0.5);
    this.add(this.nameText);

    // 세대
    this.genText = scene.add.text(0, y, '', {
      fontFamily: font.family,
      fontSize: font.sizeMedium,
      color: THEME.colors.textDim,
    }).setOrigin(0, 0.5);
    this.add(this.genText);

    // 속성
    this.elementText = scene.add.text(0, y, '', {
      fontFamily: font.family,
      fontSize: font.sizeMedium,
      color: THEME.colors.textMain,
    }).setOrigin(0, 0.5);
    this.add(this.elementText);

    // 체질
    this.constitutionText = scene.add.text(0, y, '', {
      fontFamily: font.family,
      fontSize: font.sizeMedium,
      color: THEME.colors.textDim,
    }).setOrigin(0, 0.5);
    this.add(this.constitutionText);

    // 스탯
    this.statsText = scene.add.text(0, y, '', {
      fontFamily: font.family,
      fontSize: font.sizeMedium,
      color: THEME.colors.textMain,
    }).setOrigin(1, 0.5);
    this.add(this.statsText);

    this.update(creature);
  }

  /** 실험체 데이터 갱신 */
  update(creature: Creature) {
    const { width, padding } = THEME.layout;

    let x = padding + 8;

    // "실험체:" 라벨 너비 (첫 번째 자식은 bg, 두 번째가 라벨)
    const labelText = this.getAt(1) as Phaser.GameObjects.Text;
    x += labelText.width + 6;

    this.nameText.setText(creature.name);
    this.nameText.setX(x);
    x += this.nameText.width + 16;

    this.genText.setText(`G${creature.generation}`);
    this.genText.setX(x);
    x += this.genText.width + 16;

    // 속성: 색상 반영
    const elColor = getElementColor(creature.primaryElement);
    const elHex = '#' + elColor.toString(16).padStart(6, '0');
    this.elementText.setText(creature.primaryElement);
    this.elementText.setStyle({ color: elHex });
    this.elementText.setX(x);
    x += this.elementText.width + 16;

    // 체질
    const constKo = CONSTITUTION_KO[creature.constitution] ?? creature.constitution;
    this.constitutionText.setText(constKo);
    this.constitutionText.setX(x);

    // 스탯 (오른쪽 정렬)
    const s = creature.stats;
    this.statsText.setText(
      `STR:${s.str}  DEX:${s.dex}  RES:${s.res}  MUT:${s.mut}`
    );
    this.statsText.setX(width - padding - 8);
  }
}
