import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { LabScene } from "./scenes/LabScene";
import { BattleScene } from "./scenes/BattleScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: "#0a0a0f",
  parent: document.body,
  scene: [BootScene, LabScene, BattleScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
};

new Phaser.Game(config);
