export class Router {
  private routes: Map<string, () => (() => void) | void>;
  private currentPath: string;
  private currentCleanup: (() => void) | null = null;

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

  public addRoute(path: string, handler: () => (() => void) | void) {
    this.routes.set(path, handler);
  }

  public navigate(path: string, pushState = true) {
    const handler = this.routes.get(path) || this.routes.get('/404');
    
    if (handler) {
      // Run cleanup for the previous page if it exists
      if (this.currentCleanup) {
        this.currentCleanup();
        this.currentCleanup = null;
      }

      if (pushState && path !== this.currentPath) {
        window.history.pushState({}, '', path);
      }
      this.currentPath = path;
      
      // Execute new handler and store potential cleanup function
      const cleanup = handler();
      if (typeof cleanup === 'function') {
        this.currentCleanup = cleanup;
      }
    }
  }

  public start() {
    this.navigate(this.currentPath, false);
  }
}
