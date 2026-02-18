// ─── SequencePanel: [탭3] 시퀀스 구성 + 풀 관리 ───
// PoE2 스타일: 왼쪽=시퀀스 풀 목록, 오른쪽=시퀀스 구성+코돈 풀

import Phaser from 'phaser';
import type { Codon, Creature, Sequence } from '../../data/types';
import { AMINO_ACIDS } from '../../data/codons';
import { THEME, getRoleColor, getInteractionColor, getRarityLabel } from './theme';
import { SequenceStrip } from '../shared/SequenceStrip';
import { createSequence, previewInteractions } from '../../systems/sequence-builder';
import { addSequence, removeSequence, SEQUENCE_POOL_MAX } from '../../systems/pool-manager';

const INTERACTION_KO: Record<string, string> = {
  Resonance: '공명', Opposition: '대립', Fusion: '융합',
};
const ROLE_KO: Record<string, string> = {
  Destroy: '파괴', Survive: '생존', Order: '질서', Chaos: '혼돈',
};

function getTransitionLabel(tag1: string, tag2: string): string {
  const key = [tag1, tag2].sort().join('+');
  const MAP: Record<string, string> = {
    'Destroy+Destroy': '폭주 — 데미지 증가',
    'Destroy+Survive': '상쇄 — 효과 약화',
    'Destroy+Order': '집중 — 크리 확률 증가',
    'Chaos+Destroy': '임계 — 변이 확률 증가',
    'Survive+Survive': '교착 — 방어 증가',
    'Order+Survive': '재생장 — HP 회복',
    'Chaos+Survive': '침식장 — 방어 감소',
    'Order+Order': '가속장 — SPD 보너스',
    'Chaos+Order': '교란장 — 버프 뒤섞임',
    'Chaos+Chaos': '혼돈장 — 랜덤 변이',
  };
  return MAP[key] ?? '—';
}

export class SequencePanel extends Phaser.GameObjects.Container {
  private creature: Creature;

  // 편집 상태
  private editSlots: (Codon | null)[] = [null, null, null];
  private selectedSlot = 0;
  private editingSeqId: string | null = null;
  private seqCounter = 0;

  // 왼쪽: 시퀀스 풀
  private seqListContainer!: Phaser.GameObjects.Container;
  private seqCountText!: Phaser.GameObjects.Text;

  // 오른쪽: 구성 영역
  private editStrip!: SequenceStrip;
  private interactionTexts: Phaser.GameObjects.Text[] = [];
  private codonPoolContainer!: Phaser.GameObjects.Container;
  private createBtn!: Phaser.GameObjects.Graphics;
  private createBtnText!: Phaser.GameObjects.Text;
  private createBtnZone!: Phaser.GameObjects.Zone;
  private errorText!: Phaser.GameObjects.Text;
  private editTitle!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, creature: Creature) {
    super(scene, 0, THEME.layout.workspaceY);
    this.creature = creature;
    this.buildUI();
    scene.events.on('poolChanged', () => {
      this.rebuildSeqList();
      this.rebuildCodonPool();
    }, this);
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

  // ─── 왼쪽: 시퀀스 풀 목록 ───

  private buildLeftPanel() {
    const pad = THEME.layout.padding;

    this.seqCountText = this.scene.add.text(pad, pad,
      `시퀀스 풀 (${this.creature.sequencePool.length}/${SEQUENCE_POOL_MAX})`, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textMain,
      });
    this.add(this.seqCountText);

    this.seqListContainer = this.scene.add.container(0, 30);
    this.add(this.seqListContainer);

    this.rebuildSeqList();
  }

  private rebuildSeqList() {
    this.seqListContainer.removeAll(true);
    this.seqCountText.setText(
      `시퀀스 풀 (${this.creature.sequencePool.length}/${SEQUENCE_POOL_MAX})`,
    );

    const pad = THEME.layout.padding;
    const listW = THEME.layout.leftPanelW - pad * 2;
    const itemH = 58;

    if (this.creature.sequencePool.length === 0) {
      const empty = this.scene.add.text(THEME.layout.leftPanelW / 2, 40, '시퀀스 없음', {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textDim,
      }).setOrigin(0.5, 0);
      this.seqListContainer.add(empty);
      return;
    }

    this.creature.sequencePool.forEach((seq, i) => {
      const y = i * (itemH + 4);

      // 배경
      const itemBg = this.scene.add.graphics();
      itemBg.fillStyle(THEME.colors.cardBg, 0.6);
      itemBg.fillRoundedRect(pad, y, listW, itemH, 3);
      this.seqListContainer.add(itemBg);

      // 코돈 3개 요약
      const summary = seq.codons.map(c => {
        const amino = AMINO_ACIDS[c.aminoAcidId];
        return `${c.triplet}(${amino.skillName})`;
      }).join(' — ');
      const summaryText = this.scene.add.text(pad + 6, y + 4, summary, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textMain,
        wordWrap: { width: listW - 12 },
      });
      this.seqListContainer.add(summaryText);

      // 역할 태그
      const tags = seq.codons.map(c => AMINO_ACIDS[c.aminoAcidId].roleTag).join('/');
      const tagText = this.scene.add.text(pad + 6, y + 22, tags, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      });
      this.seqListContainer.add(tagText);

      // [편집] 버튼
      const editBtn = this.scene.add.text(pad + 6, y + 38, '편집', {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textGold,
      });
      this.seqListContainer.add(editBtn);
      const editZone = this.scene.add.zone(pad + 18, y + 44, 36, 16)
        .setInteractive({ useHandCursor: true });
      editZone.on('pointerdown', () => this.editSequence(seq));
      this.seqListContainer.add(editZone);

      // [삭제] 버튼
      const delBtn = this.scene.add.text(pad + 60, y + 38, '삭제', {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: '#cc3333',
      });
      this.seqListContainer.add(delBtn);
      const delZone = this.scene.add.zone(pad + 72, y + 44, 36, 16)
        .setInteractive({ useHandCursor: true });
      delZone.on('pointerdown', () => this.deleteSequence(seq.id));
      this.seqListContainer.add(delZone);
    });
  }

  // ─── 오른쪽: 시퀀스 구성 ───

  private buildRightPanel() {
    const rx = THEME.layout.dividerX + THEME.layout.padding;
    const pad = THEME.layout.padding;

    // 타이틀
    this.editTitle = this.scene.add.text(rx, pad, '시퀀스 구성', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textMain,
    });
    this.add(this.editTitle);

    // SequenceStrip (편집용) — scene.add.existing() 호출하지 않음
    this.editStrip = new SequenceStrip(this.scene, rx, pad + 22, null, {
      onSlotClick: (idx) => { this.selectedSlot = idx; },
    });
    this.add(this.editStrip);

    // 상호작용 텍스트
    const interY = pad + 80;
    for (let i = 0; i < 2; i++) {
      const t = this.scene.add.text(rx, interY + i * 18, '', {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      });
      this.add(t);
      this.interactionTexts.push(t);
    }
    this.updateInteractionPreview();

    // 구분선
    const divY = 130;
    const div = this.scene.add.graphics();
    div.lineStyle(1, THEME.colors.tabBorder, 0.4);
    div.lineBetween(rx, divY, THEME.layout.width - pad, divY);
    this.add(div);

    // 코돈 풀 라벨
    const cpLabel = this.scene.add.text(rx, 138, '코돈 풀에서 선택 (클릭 → 슬롯에 배치)', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    });
    this.add(cpLabel);

    // 코돈 풀 컨테이너
    this.codonPoolContainer = this.scene.add.container(0, 156);
    this.add(this.codonPoolContainer);
    this.rebuildCodonPool();

    // [시퀀스 생성] 버튼
    const btnX = THEME.layout.width - 150;
    const btnY = 382;
    const btnW = 130;
    const btnH = 30;

    this.createBtn = this.scene.add.graphics();
    this.add(this.createBtn);

    this.createBtnText = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, '시퀀스 생성', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add(this.createBtnText);

    this.createBtnZone = this.scene.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true });
    this.createBtnZone.on('pointerdown', () => this.onCreateSequence());
    this.add(this.createBtnZone);
    this.updateCreateButton();

    // 에러
    this.errorText = this.scene.add.text(
      (THEME.layout.dividerX + THEME.layout.width) / 2, 120, '', {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: '#ff4444',
      }).setOrigin(0.5, 0);
    this.add(this.errorText);
  }

  private rebuildCodonPool() {
    this.codonPoolContainer.removeAll(true);
    const rx = THEME.layout.dividerX + THEME.layout.padding;
    const cardW = 130;
    const cardH = 40;
    const gap = 4;
    const cols = 4;

    this.creature.codonPool.forEach((codon, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = rx + col * (cardW + gap);
      const cy = row * (cardH + gap);

      const amino = AMINO_ACIDS[codon.aminoAcidId];
      const roleColor = getRoleColor(amino.roleTag);
      const roleHex = '#' + roleColor.toString(16).padStart(6, '0');
      const rarity = getRarityLabel(amino.pathCount);

      // 카드 배경
      const g = this.scene.add.graphics();
      g.fillStyle(THEME.colors.cardBg, 1);
      g.fillRoundedRect(cx, cy, cardW, cardH, 3);
      g.fillStyle(roleColor, 1);
      g.fillRect(cx, cy, 3, cardH);
      this.codonPoolContainer.add(g);

      // 1행: triplet + skillName
      const t1 = this.scene.add.text(cx + 8, cy + 4,
        `${codon.triplet} ${amino.skillName}${rarity ? ' ' + rarity : ''}`, {
          fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
          color: THEME.colors.textMain,
        });
      this.codonPoolContainer.add(t1);

      // 2행: roleTag
      const t2 = this.scene.add.text(cx + 8, cy + 22, amino.roleTag, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: roleHex,
      });
      this.codonPoolContainer.add(t2);

      // 클릭 → 슬롯에 배치
      const zone = this.scene.add.zone(cx + cardW / 2, cy + cardH / 2, cardW, cardH)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.placeCodon(codon));
      this.codonPoolContainer.add(zone);
    });
  }

  // ─── 액션 ───

  private placeCodon(codon: Codon) {
    this.editSlots[this.selectedSlot] = codon;
    this.editStrip.setSlotCodon(this.selectedSlot, codon);

    // 다음 빈 슬롯 자동 선택
    for (let i = 0; i < 3; i++) {
      const next = (this.selectedSlot + 1 + i) % 3;
      if (!this.editSlots[next]) {
        this.selectedSlot = next;
        break;
      }
    }

    this.updateInteractionPreview();
    this.updateCreateButton();
    this.clearError();
  }

  private updateInteractionPreview() {
    const [c0, c1, c2] = this.editSlots;

    if (c0 && c1 && c2) {
      const interactions = previewInteractions([c0, c1, c2]);
      const t0 = AMINO_ACIDS[c0.aminoAcidId].roleTag;
      const t1 = AMINO_ACIDS[c1.aminoAcidId].roleTag;
      const t2 = AMINO_ACIDS[c2.aminoAcidId].roleTag;

      const l1 = INTERACTION_KO[interactions.pair1] ?? interactions.pair1;
      const trans1 = getTransitionLabel(t0, t1);
      this.interactionTexts[0].setText(`1-2: ${l1}(${ROLE_KO[t0]}+${ROLE_KO[t1]}) → ${trans1}`);
      this.interactionTexts[0].setColor(
        '#' + getInteractionColor(interactions.pair1).toString(16).padStart(6, '0'),
      );

      const l2 = INTERACTION_KO[interactions.pair2] ?? interactions.pair2;
      const trans2 = getTransitionLabel(t1, t2);
      this.interactionTexts[1].setText(`2-3: ${l2}(${ROLE_KO[t1]}+${ROLE_KO[t2]}) → ${trans2}`);
      this.interactionTexts[1].setColor(
        '#' + getInteractionColor(interactions.pair2).toString(16).padStart(6, '0'),
      );
    } else {
      this.interactionTexts[0]
        .setText('1-2: (코돈 3개를 배치하면 상호작용 표시)')
        .setColor(THEME.colors.textDim);
      this.interactionTexts[1]
        .setText('2-3: —')
        .setColor(THEME.colors.textDim);
    }
  }

  private updateCreateButton() {
    const allFilled = this.editSlots.every(c => c !== null);
    const btnX = THEME.layout.width - 150;
    const btnY = 382;
    const btnW = 130;
    const btnH = 30;

    this.createBtn.clear();
    this.createBtn.fillStyle(
      allFilled ? THEME.colors.btnPrimary : THEME.colors.btnDisabled, 1,
    );
    this.createBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 4);
    this.createBtnText.setColor(allFilled ? '#ffffff' : '#666666');
  }

  private onCreateSequence() {
    if (!this.editSlots.every(c => c !== null)) return;
    const codons = this.editSlots as [Codon, Codon, Codon];

    if (this.editingSeqId) {
      // 편집 모드: 기존 시퀀스 교체
      const idx = this.creature.sequencePool.findIndex(s => s.id === this.editingSeqId);
      if (idx !== -1) {
        this.creature.sequencePool[idx] = createSequence(this.editingSeqId, codons);
      }
      this.editingSeqId = null;
      this.editTitle.setText('시퀀스 구성');
      this.createBtnText.setText('시퀀스 생성');
    } else {
      // 새 시퀀스 생성
      this.seqCounter++;
      const id = `seq_user_${Date.now()}_${this.seqCounter}`;
      const seq = createSequence(id, codons);
      const result = addSequence(this.creature.sequencePool, seq);
      if (!result.success) {
        this.showError(result.reason ?? '시퀀스 풀이 가득 찼습니다');
        return;
      }
    }

    this.resetEditSlots();
    this.scene.events.emit('poolChanged');
  }

  private editSequence(seq: Sequence) {
    this.editingSeqId = seq.id;
    this.editSlots = [seq.codons[0], seq.codons[1], seq.codons[2]];
    this.selectedSlot = 0;
    this.editStrip.updateSequence(seq);
    this.editTitle.setText(`시퀀스 수정: ${seq.id.substring(0, 12)}...`);
    this.createBtnText.setText('시퀀스 수정');
    this.updateInteractionPreview();
    this.updateCreateButton();
  }

  private deleteSequence(seqId: string) {
    const result = removeSequence(this.creature.sequencePool, seqId);
    if (!result.success) {
      this.showError(result.reason ?? '삭제 실패');
      return;
    }
    this.scene.events.emit('poolChanged');
  }

  private resetEditSlots() {
    this.editSlots = [null, null, null];
    this.selectedSlot = 0;
    this.editStrip.updateSequence(null);
    this.updateInteractionPreview();
    this.updateCreateButton();
  }

  private showError(msg: string) {
    this.errorText.setText(msg);
    this.scene.time.delayedCall(2500, () => this.errorText.setText(''));
  }

  private clearError() {
    this.errorText.setText('');
  }
}
