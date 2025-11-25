import { Router } from '../core/router';
import logo42 from './42_Logo.svg';

export function renderHome(app: HTMLElement, router: Router) {
  app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative">
      <div class="w-full px-4 mb-8 flex justify-center">
        <div class="relative inline-block text-center">
          <img
            class="absolute -top-7 left-[-8px] h-12 w-auto"
            src="${logo42}"
            alt="42 logo"
          />
          <h1 class="px-6 text-center text-6xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
            Welcome to Transcendence
          </h1>
        </div>
      </div>

      <div class="w-full max-w-5xl px-4">
        <div class="rounded-3xl border border-slate-700/70 bg-slate-900/70 backdrop-blur-xl px-12 py-24 min-h-[500px] shadow-[0_0_40px_rgba(56,189,248,0.5)] flex flex-col justify-start">
          <!-- form -->
        </div>
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
