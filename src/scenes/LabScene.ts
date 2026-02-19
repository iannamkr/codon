// ─── LabScene: 연구실 허브 (3작업대 구조) ───
// 실험체대 (실험체 정보 + 플라스미드) ↔ 조립대 (합성 + 코돈풀 + 시퀀스 조립) ↔ 빌드대 (빌드 + 분석 + 출격)
// 전환: workbenchContainer.x 패닝 애니메이션

import Phaser from 'phaser';
import { SAMPLE_CREATURE } from '../data/sample';
import type { Creature, Build, Sequence, Plasmid, Codon, CodonRoleTag } from '../data/types';
import { AMINO_ACIDS } from '../data/codons';
import { validateBuild, createBuild } from '../systems/build-manager';
import { THEME } from '../ui/lab/theme';
import { TopHUD } from '../ui/lab/TopHUD';
import { WorkbenchNav, type WorkbenchTab } from '../ui/lab/WorkbenchNav';
import { BuildBoard } from '../ui/lab/BuildBoard';
import { BuildAnalysis } from '../ui/lab/panels/BuildAnalysis';
import { SynthesisBench } from '../ui/lab/panels/SynthesisBench';
import { PlasmidBench } from '../ui/lab/PlasmidBench';
import { SequenceAssembler } from '../ui/lab/SequenceAssembler';
import { CodonPreviewOverlay } from '../ui/lab/CodonPreviewOverlay';
import { addSequence } from '../systems/pool-manager';
import { CraftingInventory } from '../ui/lab/panels/CraftingInventory';

/** 플라스미드별 필요 시퀀스 수 */
function requiredSeqCount(p: Plasmid): number {
  if (p.id === 'overcharge') return 5;
  if (p.id === 'compress') return 2;
  return 4;
}

export class LabScene extends Phaser.Scene {
  private creature!: Creature;
  private currentBuild: Build | null = null;
  private activeTab: WorkbenchTab = 'BUILD';

  // 빌드 상태
  private buildSlots: (Sequence | null)[] = [null, null, null, null];
  private selectedPlasmid: Plasmid | null = null;
  private activeSlotIndex: number | null = null;
  private pendingSlotIndex: number | null = null; // ASSEMBLE→BUILD 자동배치용

  // ─── 공유 UI ───
  private topHud!: TopHUD;
  private workbenchNav!: WorkbenchNav;

  // ─── 작업대 컨테이너 (패닝 대상) ───
  private workbenchContainer!: Phaser.GameObjects.Container;

  // ─── 실험체대 컴포넌트 ───
  private plasmidBench!: PlasmidBench;

  // ─── 빌드대 컴포넌트 ───
  private buildBoard!: BuildBoard;
  private buildAnalysis!: BuildAnalysis;

  // ─── 조립대 컴포넌트 ───
  private synthBench!: SynthesisBench;
  private craftingInventory!: CraftingInventory;
  private sequenceAssembler!: SequenceAssembler;

  // ─── 오버레이 ───
  private codonPreview!: CodonPreviewOverlay;

  constructor() {
    super({ key: 'LabScene' });
  }

  create() {
    // 실험체 초기화 (deep copy of arrays)
    this.creature = {
      ...SAMPLE_CREATURE,
      codonPool: [...SAMPLE_CREATURE.codonPool],
      sequencePool: [...SAMPLE_CREATURE.sequencePool],
      plasmidPool: [...SAMPLE_CREATURE.plasmidPool],
    };
    this.selectedPlasmid = this.creature.plasmidPool[0] ?? null;

    const WB = THEME.layout.workbench;

    // ─── 공유 UI (항상 표시) ───

    this.topHud = new TopHUD(this, this.creature);
    this.add.existing(this.topHud);

    this.workbenchNav = new WorkbenchNav(this, 0, WB.navY);
    this.add.existing(this.workbenchNav);

    // ─── 작업대 컨테이너 + 지오메트리 마스크 ───

    // 기본 활성 탭 = BUILD (3번째, x = -1920)
    const defaultX = -(WB.panOffset * 2);
    this.workbenchContainer = this.add.container(defaultX, WB.contentY);

    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, WB.contentY, WB.contentW, WB.contentH);
    const mask = maskShape.createGeometryMask();
    this.workbenchContainer.setMask(mask);

    // ─── 실험체대 콘텐츠 (x=0..959) ───

    this.plasmidBench = new PlasmidBench(this, 0, 0, this.creature);
    this.workbenchContainer.add(this.plasmidBench);

    // ─── 빌드대 콘텐츠 (x=1920..2879) ───

    const B = WB.build;
    const buildOffset = WB.panOffset * 2;
    this.buildBoard = new BuildBoard(this, buildOffset + B.boardX, 0, this.creature);
    this.workbenchContainer.add(this.buildBoard);

    this.buildAnalysis = new BuildAnalysis(this, buildOffset + B.analysisX, 0, this.creature);
    this.workbenchContainer.add(this.buildAnalysis);

    // ─── 조립대 콘텐츠 (x=960..1919) ───

    const A = WB.assemble;
    const assembleOffset = WB.panOffset;

    this.synthBench = new SynthesisBench(this, assembleOffset + A.synthX, 0, this.creature);
    this.workbenchContainer.add(this.synthBench);

    this.craftingInventory = new CraftingInventory(this, assembleOffset + A.poolX, 0, this.creature);
    this.workbenchContainer.add(this.craftingInventory);

    this.sequenceAssembler = new SequenceAssembler(this, assembleOffset + A.assemblerX, 0, this.creature);
    this.workbenchContainer.add(this.sequenceAssembler);

    // ─── 코돈 미리보기 오버레이 (빌드대 위) ───

    this.codonPreview = new CodonPreviewOverlay(this);
    this.codonPreview.setY(WB.contentY);
    this.add.existing(this.codonPreview);
    this.codonPreview.setDepth(10);

    // ─── 이벤트 배선 ───

    this.workbenchNav.on('tabChange', this.onTabChange, this);

    // BuildBoard 이벤트 (ActionColumn에서 이관)
    this.buildBoard.on('viewCodons', this.onViewCodons, this);
    this.buildBoard.on('reset', this.handleReset, this);
    this.buildBoard.on('deploy', this.handleDeploy, this);

    this.events.on('slotSelected', this.onSlotSelected, this);
    this.events.on('codonPositionSelected', this.onCodonPositionSelected, this);
    this.events.on('plasmidChangeRequested', () => this.workbenchNav.setTab('PLASMID'), this);
    this.events.on('sequenceSwapRequested', this.showSequencePopup, this);
    this.events.on('slotCleared', this.onSlotCleared, this);

    this.events.on('poolChanged', this.onPoolChanged, this);

    // 실험체대: 플라스미드 선택
    this.plasmidBench.on('plasmidSelected', (plasmid: Plasmid) => {
      this.selectPlasmid(plasmid);
    });

    // 조립대: 시퀀스 조립 완료
    this.sequenceAssembler.on('sequenceCreated', (data: { sequence: Sequence }) => {
      this.onSequenceCreated(data.sequence);
    });

    // 조립대: 코돈 클릭 → 슬롯 배치
    this.events.on('codonClicked', (data: { codon: Codon }) => {
      if (this.activeTab === 'ASSEMBLE') {
        const placed = this.sequenceAssembler.placeCodon(data.codon);
        if (placed) {
          this.craftingInventory.setPlacedCodons(this.sequenceAssembler.getPlacedCodons());
        }
      }
    });

    // 조립대: 슬롯 변경 → 배치 마커 동기화
    this.sequenceAssembler.on('slotsChanged', (data: { codons: (Codon | null)[] }) => {
      this.craftingInventory.setPlacedCodons(data.codons);
    });

    // 조립대: 슬롯 컨텍스트 → 인벤토리 시너지 하이라이트
    this.sequenceAssembler.on('activeSlotContext', (data: { adjacentTags: CodonRoleTag[] }) => {
      this.craftingInventory.setSynergyContext(data.adjacentTags);
    });

    // 초기 상태
    this.updatePoolCounts();
    this.updateBuildAnalysis();
    this.updateDeployState();
  }

  // ─── 작업대 전환 (카메라 팬) ───

  private onTabChange(tab: WorkbenchTab) {
    if (tab === this.activeTab) return;

    // 오버레이가 열려있으면 먼저 닫고 패닝
    if (this.codonPreview.isOpen()) {
      this.codonPreview.hide();
      this.time.delayedCall(200, () => this.panToTab(tab));
    } else {
      this.panToTab(tab);
    }
  }

  private panToTab(tab: WorkbenchTab) {
    this.activeTab = tab;
    const WB = THEME.layout.workbench;
    const tabIndex = { PLASMID: 0, ASSEMBLE: 1, BUILD: 2 }[tab];
    const targetX = -(tabIndex * WB.panOffset);

    // ASSEMBLE이 아닌 탭으로 이동 시 시너지 컨텍스트 초기화
    if (tab !== 'ASSEMBLE') {
      this.craftingInventory.clearSynergyContext();
    }

    this.tweens.add({
      targets: this.workbenchContainer,
      x: targetX,
      duration: WB.panDuration,
      ease: 'Sine.easeInOut',
    });
  }

  // ─── 코돈 미리보기 오버레이 ───

  private onViewCodons() {
    if (this.codonPreview.isOpen()) {
      this.codonPreview.hide();
    } else {
      this.codonPreview.show(this.creature);
    }
  }

  // ─── 빌드 슬롯 선택 ───

  private onSlotSelected(data: { slotIndex: number }) {
    this.activeSlotIndex = data.slotIndex;
    this.buildBoard.highlightSlot(data.slotIndex);
  }

  private onCodonPositionSelected(data: { phaseIndex: number; position: number }) {
    this.activeSlotIndex = data.phaseIndex;
    this.buildBoard.highlightSlot(data.phaseIndex);
  }

  private onSlotCleared(data: { slotIndex: number }) {
    this.buildSlots[data.slotIndex] = null;
    this.updateBuildAnalysis();
    this.updateDeployState();
  }

  // ─── 시퀀스 선택 팝업 ───

  private showSequencePopup(data: { slotIndex: number }) {
    const slotIdx = data.slotIndex;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, 960, 540);
    overlay.setDepth(50);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, 960, 540), Phaser.Geom.Rectangle.Contains);

    const popup = this.add.container(230, 60).setDepth(51);
    const popupW = 500;
    const popupH = 420;

    const bg = this.add.graphics();
    bg.fillStyle(THEME.colors.panelBg, 1);
    bg.fillRoundedRect(0, 0, popupW, popupH, 8);
    bg.lineStyle(1, THEME.colors.tabBorder, 0.8);
    bg.strokeRoundedRect(0, 0, popupW, popupH, 8);
    popup.add(bg);

    const title = this.add.text(16, 12, `Phase ${slotIdx + 1} 시퀀스 선택`, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeLarge,
      color: THEME.colors.textMain,
    });
    popup.add(title);

    // ── 새로 만들기 버튼 ──
    const newBtnY = 36;
    const newBtnBg = this.add.graphics();
    newBtnBg.fillStyle(THEME.colors.btnPrimary, 1);
    newBtnBg.fillRoundedRect(12, newBtnY, popupW - 24, 30, 4);
    popup.add(newBtnBg);
    const newBtnText = this.add.text(popupW / 2, newBtnY + 15, '+ 새로 만들기', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: '#ffffff',
    }).setOrigin(0.5);
    popup.add(newBtnText);
    const newBtnZone = this.add.zone(popupW / 2, newBtnY + 15, popupW - 24, 30)
      .setInteractive({ useHandCursor: true });
    newBtnZone.on('pointerdown', () => {
      this.pendingSlotIndex = slotIdx;
      popup.destroy();
      overlay.destroy();
      this.workbenchNav.setTab('ASSEMBLE');
    });
    popup.add(newBtnZone);

    const seqs = this.creature.sequencePool;
    const usedIds = new Set(this.buildSlots.filter(s => s).map(s => s!.id));

    seqs.forEach((seq, i) => {
      const iy = 74 + i * 52;
      const isUsed = usedIds.has(seq.id);

      const itemBg = this.add.graphics();
      itemBg.fillStyle(isUsed ? 0x1a1a2a : THEME.colors.cardBg, 1);
      itemBg.fillRoundedRect(12, iy, popupW - 24, 46, 4);
      popup.add(itemBg);

      const codons = seq.codons.map(c => {
        const amino = AMINO_ACIDS[c.aminoAcidId];
        return `${c.triplet}(${amino?.skillName ?? '?'})`;
      }).join(' — ');

      const seqText = this.add.text(20, iy + 6, codons, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: isUsed ? THEME.colors.textDim : THEME.colors.textMain,
      });
      popup.add(seqText);

      const tags = seq.codons.map(c => AMINO_ACIDS[c.aminoAcidId]?.roleTag ?? '?').join('/');
      const tagText = this.add.text(20, iy + 24, tags + (isUsed ? ' (사용중)' : ''), {
        fontFamily: THEME.font.family, fontSize: '9px',
        color: isUsed ? '#666677' : THEME.colors.textDim,
      });
      popup.add(tagText);

      if (!isUsed) {
        const zone = this.add.zone(popupW / 2, iy + 23, popupW - 24, 46)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          this.assignSequence(slotIdx, seq);
          popup.destroy();
          overlay.destroy();
        });
        popup.add(zone);
      }
    });

    const closeText = this.add.text(popupW - 30, 8, '\u2715', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeLarge,
      color: THEME.colors.textDim,
    }).setInteractive({ useHandCursor: true });
    closeText.on('pointerdown', () => {
      popup.destroy();
      overlay.destroy();
    });
    popup.add(closeText);
  }

  // ─── 빌드 조립 ───

  private assignSequence(slotIndex: number, seq: Sequence) {
    this.buildSlots[slotIndex] = seq;
    this.buildBoard.setSlotSequence(slotIndex, seq);
    this.updateBuildAnalysis();
    this.updateDeployState();
  }

  // ─── 시퀀스 조립 완료 ───

  private onSequenceCreated(sequence: Sequence) {
    const result = addSequence(this.creature.sequencePool, sequence);
    if (!result.success) return;

    this.events.emit('poolChanged');

    if (this.pendingSlotIndex !== null) {
      const slotIdx = this.pendingSlotIndex;
      this.pendingSlotIndex = null;
      this.assignSequence(slotIdx, sequence);
      this.workbenchNav.setTab('BUILD');
    }
  }

  private selectPlasmid(plasmid: Plasmid) {
    this.selectedPlasmid = plasmid;
    this.buildBoard.setPlasmid(plasmid);

    const required = requiredSeqCount(plasmid);
    while (this.buildSlots.length < required) {
      this.buildSlots.push(null);
    }
    if (this.buildSlots.length > required) {
      this.buildSlots.length = required;
    }
    this.buildBoard.setBuildSlots(this.buildSlots);

    this.updateBuildAnalysis();
    this.updateDeployState();
    this.events.emit('plasmidChanged', plasmid);
  }

  // ─── 리셋 ───

  private handleReset() {
    this.buildSlots = [null, null, null, null];
    this.selectedPlasmid = this.creature.plasmidPool[0] ?? null;
    this.activeSlotIndex = null;
    this.currentBuild = null;

    this.buildBoard.setBuildSlots(this.buildSlots);
    this.buildBoard.setPlasmid(this.selectedPlasmid);
    this.buildBoard.highlightSlot(null);
    this.updateBuildAnalysis();
    this.updateDeployState();
    this.buildBoard.setStatus('빌드 초기화됨', THEME.colors.textDim);
    this.time.delayedCall(1500, () => this.updateDeployState());
  }

  // ─── 출격 ───

  private handleDeploy() {
    if (!this.currentBuild) {
      this.buildBoard.setStatus('빌드를 먼저 완성하세요', '#cc3333');
      return;
    }

    const result = validateBuild(this.currentBuild, this.creature);
    if (!result.valid) {
      this.buildBoard.setStatus(result.errors[0] ?? '빌드 오류', '#cc3333');
      return;
    }

    this.cameras.main.shake(200, 0.005);
    this.time.delayedCall(300, () => {
      this.scene.start('BattleScene', {
        build: this.currentBuild,
        creature: this.creature,
      });
    });
  }

  // ─── 상태 갱신 ───

  private onPoolChanged() {
    this.updatePoolCounts();
    this.updateBuildAnalysis();
  }

  private updatePoolCounts() {
    this.topHud.updatePoolCounts(
      this.creature.codonPool.length,
      this.creature.sequencePool.length,
    );
  }

  private updateBuildAnalysis() {
    this.buildAnalysis.refresh(this.buildSlots, this.selectedPlasmid);

    const required = this.selectedPlasmid
      ? requiredSeqCount(this.selectedPlasmid)
      : 4;
    const filled = this.buildSlots.filter(s => s !== null) as Sequence[];

    if (filled.length >= required && this.selectedPlasmid) {
      this.currentBuild = createBuild(this.selectedPlasmid, filled);
      const result = validateBuild(this.currentBuild, this.creature);
      this.buildAnalysis.setValidation(result);
    } else {
      this.currentBuild = null;
      this.buildAnalysis.setValidation({
        valid: false,
        errors: [`시퀀스 ${required - filled.length}개 더 필요`],
      });
    }
  }

  private updateDeployState() {
    const hasValidBuild = this.currentBuild !== null;
    this.buildBoard.setDeployEnabled(hasValidBuild);

    if (hasValidBuild) {
      this.buildBoard.setStatus('출격 가능', THEME.colors.textGold);
    } else {
      const required = this.selectedPlasmid
        ? requiredSeqCount(this.selectedPlasmid)
        : 4;
      const filled = this.buildSlots.filter(s => s !== null).length;
      this.buildBoard.setStatus(
        `시퀀스 ${required - filled}개 더 필요`,
        THEME.colors.textDim,
      );
    }
  }

  // ─── Public API ───

  getCreature(): Creature {
    return this.creature;
  }

  getCurrentBuild(): Build | null {
    return this.currentBuild;
  }

  setCurrentBuild(build: Build) {
    this.currentBuild = build;
    this.updateDeployState();
  }
}
