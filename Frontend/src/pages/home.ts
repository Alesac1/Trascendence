import { Router } from '../core/router';

export function renderHome(app: HTMLElement, router: Router) {
  app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 class="text-6xl font-bold mb-8 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
        Transcendence
      </h1>
      <p class="text-xl mb-12 text-gray-300">The Ultimate Pong Experience</p>
      
      <div class="flex gap-4">
        <button id="play-btn" class="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors">
          Play Game
        </button>
        <button id="tournament-btn" class="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors">
          Tournament
        </button>
      </div>
    </div>
  `;

  document.getElementById('play-btn')?.addEventListener('click', () => {
    router.navigate('/game');
  });

  document.getElementById('tournament-btn')?.addEventListener('click', () => {
    router.navigate('/tournament');
  });
}
