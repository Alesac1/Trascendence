import type { Router } from '../core/router';
import './style.css';

export function renderLogin(app: HTMLDivElement, router: Router) {
app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div class="w-full max-w-md px-4">
        <div class="rounded-3xl border border-slate-700/70 bg-slate-900/70 backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(56,189,248,0.5)]">
            <h1 class="text-3xl font-semibold mb-2 bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
            Transcendence Login
            </h1>
            <p class="text-sm text-slate-400 mb-6">
            Entra nell'arena neon e preparati al Pong.
            </p>

            <form class="space-y-4">
            <div class="space-y-1">
                <label class="text-xs font-medium tracking-wide text-slate-300 uppercase">
                Username
                </label>
                <input
                type="text"
                class="w-full rounded-2xl bg-slate-950/60 border border-slate-700/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/80 transition"
                placeholder="cyber.player_42"
                />
            </div>

            <div class="space-y-1">
                <label class="text-xs font-medium tracking-wide text-slate-300 uppercase">
                Password
                </label>
                <input
                type="password"
                class="w-full rounded-2xl bg-slate-950/60 border border-slate-700/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/50 focus:border-fuchsia-400/80 transition"
                placeholder="••••••••"
                />
            </div>

            <button
                type="submit"
                class="w-full mt-3 inline-flex items-center justify-center px-4 py-3 text-sm font-medium tracking-wide rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 text-slate-950 shadow-[0_0_35px_rgba(236,72,153,0.7)] hover:shadow-[0_0_45px_rgba(236,72,153,1)] transition"
            >
                Entra con google
            </button>

            <button
                type="submit"
                class="w-full mt-3 inline-flex items-center justify-center px-4 py-3 text-sm font-medium tracking-wide rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 text-slate-950 shadow-[0_0_35px_rgba(236,72,153,0.7)] hover:shadow-[0_0_45px_rgba(236,72,153,1)] transition"
            >
                Entra nel gioco
            </button>
            
            <p class="text-sm text-slate-400 mb-6">
                Non hai un account? <a href="#" class="text-cyan-400 hover:underline" id="register-link">Registrati</a>
            </p>    
            </form>
        </div>
        </div>
    </div>
    `;
    
  const registerLink = app.querySelector<HTMLAnchorElement>('#register-link');
  registerLink?.addEventListener('click', (event) => {
    event.preventDefault();
    router.navigate('/register');
  });
}