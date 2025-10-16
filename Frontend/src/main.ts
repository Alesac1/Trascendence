import './style.css'

// Simple SPA Router
class Router {
  private routes: Map<string, () => void>;
  private currentPath: string;

  constructor() {
    this.routes = new Map();
    this.currentPath = window.location.pathname;
    this.init();
  }

  private init() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.navigate(window.location.pathname, false);
    });
  }

  public addRoute(path: string, handler: () => void) {
    this.routes.set(path, handler);
  }

  public navigate(path: string, pushState = true) {
    const handler = this.routes.get(path) || this.routes.get('/404');
    
    if (handler) {
      if (pushState && path !== this.currentPath) {
        window.history.pushState({}, '', path);
      }
      this.currentPath = path;
      handler();
    }
  }

  public start() {
    this.navigate(this.currentPath, false);
  }
}

// Initialize app
const app = document.querySelector<HTMLDivElement>('#app')!;
const router = new Router();

// Home page
router.addRoute('/', () => {
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
});

// Game page
router.addRoute('/game', () => {
  app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center p-4">
      <h2 class="text-4xl font-bold mb-8">Pong Game</h2>
      <div class="bg-black border-4 border-white" id="game-canvas-container">
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

  // TODO: Initialize Pong game logic here
  const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  ctx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height);
});

// Tournament page
router.addRoute('/tournament', () => {
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
});

// 404 page
router.addRoute('/404', () => {
  app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center p-4">
      <h2 class="text-4xl font-bold mb-4">404</h2>
      <p class="text-gray-300 mb-8">Page not found</p>
      <button id="back-btn" class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
        Back to Home
      </button>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', () => {
    router.navigate('/');
  });
});

// Start the router
router.start();

console.log('Transcendence loaded!');
