import './style.css';
import { Game } from './game/Game';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;

function boot() {
  const game = new Game(canvas, ui);
  (window as unknown as { game: Game }).game = game;
}

boot();
