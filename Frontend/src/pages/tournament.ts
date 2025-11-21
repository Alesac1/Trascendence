import { Router } from '../core/router';

export function renderTournament(app: HTMLElement, router: Router) {
  app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center p-4">
      <h2 class="text-4xl font-bold mb-8">Tournament Mode</h2>
      <p class="text-gray-300 mb-8">Coming soon...</p>
      <button id="back-btn" class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
        Back to Home
      </button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', () => {
    router.navigate('/');
  });
}
