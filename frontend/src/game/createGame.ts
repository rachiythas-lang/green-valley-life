import Phaser from 'phaser';
import { FarmScene } from './scenes/FarmScene';

interface GameOptions {
  farm: any;
  user: any;
  onPlotClick: (x: number, y: number) => void;
  onPlayerMove: (x: number, y: number) => void;
}

export function createGame(parent: HTMLElement, options: GameOptions) {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: '#87CEEB',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [FarmScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  const game = new Phaser.Game(config);

  // ส่งข้อมูลเข้า scene
  game.registry.set('farm', options.farm);
  game.registry.set('user', options.user);
  game.registry.set('onPlotClick', options.onPlotClick);
  game.registry.set('onPlayerMove', options.onPlayerMove);

  return game;
}
