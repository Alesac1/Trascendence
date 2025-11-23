import './style.css'
import { Router } from './core/router';
import { renderHome } from './pages/home';
import { renderGame } from './pages/game';
import { renderLogin } from './pages/login';
import { renderRegister } from './pages/register';
import { renderTournament } from './pages/tournament';
import { renderNotFound } from './pages/notFound';

// Initialize app
const app = document.querySelector<HTMLDivElement>('#app')!;
const router = new Router();

// Define routes
router.addRoute('/', () => renderHome(app, router));
router.addRoute('/login', () => renderLogin(app, router));
router.addRoute('/register', () => renderRegister(app, router));
router.addRoute('/game', () => renderGame(app, router));
router.addRoute('/tournament', () => renderTournament(app, router));
router.addRoute('/404', () => renderNotFound(app, router));

// Start the router
router.start();

console.log('Transcendence loaded!');

