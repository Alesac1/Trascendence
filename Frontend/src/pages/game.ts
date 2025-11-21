import { Router } from '../core/router';
import { PongGame } from '../game/PongGame';

export function renderGame(app: HTMLElement, router: Router) {
  app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center p-4">
      <h2 class="text-4xl font-bold mb-8">Pong Game</h2>
      <div class="bg-black border-4 border-white relative" id="game-canvas-container">
        <canvas id="pong-canvas" width="800" height="600"></canvas>
      </div>
      <button id="back-btn" class="mt-8 px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
        Back to Home
      </button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', () => {
    router.navigate('/');
  });

  // Initialize Pong game logic
  const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
  let game: PongGame | null = null;

  if (canvas) {
    game = new PongGame(canvas);
    game.start();
  }

  // Return cleanup function
  return () => {
    if (game) {
      game.stop();
    }
  };
}
