import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-lessons',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <header>
        <p class="kicker">Teacher</p>
        <h1>Normal recitation</h1>
        <p>Maulana sunte hain. Ghalat lafz par rok kar sahi lafz Urdu mein batate hain, phir woh lafz sahi tarah bolte hain.</p>
      </header>
      <ol>
        <li>Recite kholo aur ayat chuno.</li>
        <li>Recite dabao, microphone allow karo.</li>
        <li>Ayat aam tarike se padho — koi rang nahi.</li>
        <li>Ghalat lafz par maulana rok kar sahi lafz bolenge.</li>
      </ol>
      <a class="go" routerLink="/practice">Start Recite</a>
    </div>
  `,
  styles: [`
    .wrap { padding: 32px 28px 48px; max-width: 720px; margin: 0 auto; }
    .kicker { letter-spacing: .18em; text-transform: uppercase; font-size: 11px; color: var(--gold); }
    h1 { font-family: var(--display); font-weight: 600; font-size: 36px; margin: 0 0 8px; }
    header p, li { color: var(--muted); line-height: 1.6; }
    ol { padding-left: 20px; display: grid; gap: 8px; }
    .go {
      display: inline-flex; margin-top: 24px; padding: 12px 18px; border-radius: 999px;
      background: linear-gradient(180deg, var(--gold-2), var(--gold)); color: #0f1a17;
      font: 600 14px var(--ui); text-decoration: none;
    }
  `]
})
export class LessonsComponent {}
