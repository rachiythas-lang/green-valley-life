import Phaser from 'phaser';
import { FarmScene } from './scenes/FarmScene';

export function createGame(
  parent: HTMLElement,
  options: {
    farm: any;
    user: any;
    world?: any;
    onPlotClick: (x: number, y: number) => void;
    onNpcClick?: (id: string) => void;
    onAnimalClick?: (id: string) => void;
    onPondClick?: () => void;
  }
) {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: '#8BC34A',
    pixelArt: true,
    antialias: false,
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
    scene: [FarmScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { pixelArt: true, antialias: false, roundPixels: true },
  };

  const game = new Phaser.Game(config);
  game.registry.set('farm', options.farm);
  game.registry.set('user', options.user);
  game.registry.set('world', options.world || {});
  game.registry.set('onPlotClick', options.onPlotClick);
  game.registry.set('onNpcClick', options.onNpcClick);
  game.registry.set('onAnimalClick', options.onAnimalClick);
  game.registry.set('onPondClick', options.onPondClick);
  return game;
}
