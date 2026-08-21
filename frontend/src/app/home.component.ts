import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReadingStore } from './reading.store';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hq">
      <div class="frame">
        <div class="bg" aria-hidden="true"></div>

        <header class="titlebar">
          <span class="corner left" aria-hidden="true">✦</span>
          <h1 class="title">HOLY QURAN</h1>
          <span class="corner right" aria-hidden="true">⁝⁝</span>
        </header>

        <nav class="menu">
          <a class="item" [routerLink]="['/read']"
             [queryParams]="{ surah: store.progress().surah, ayah: store.progress().ayah }">
            <span class="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 21.5z"/>
                <path d="M4 5.5A2.5 2.5 0 0 0 6.5 8H20"/>
                <path d="M12 8v6l2-1.4L16 14V8"/>
              </svg>
            </span>
            <span class="label">RESUME</span>
          </a>

          <a class="item" routerLink="/index">
            <span class="ico green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 3h6"/><path d="M10 3v2.2a4 4 0 0 0 4 0V3"/>
                <path d="M8 8.5c0-1 .8-1.8 1.8-2h4.4c1 .2 1.8 1 1.8 2 0 2 2 3.2 2 6.5v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3c0-3.3 2-4.5 2-6.5z"/>
                <path d="M9.5 12.5h5"/>
              </svg>
            </span>
            <span class="label">PARA Index</span>
          </a>

          <a class="item" routerLink="/surahs">
            <span class="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 3h6"/><path d="M10 3v2.2a4 4 0 0 0 4 0V3"/>
                <path d="M8 8.5c0-1 .8-1.8 1.8-2h4.4c1 .2 1.8 1 1.8 2 0 2 2 3.2 2 6.5v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3c0-3.3 2-4.5 2-6.5z"/>
                <path d="M9.5 12.5h5"/>
              </svg>
            </span>
            <span class="label">SURAH Index</span>
          </a>

          <a class="item" routerLink="/lessons">
            <span class="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5"/>
                <path d="M12 6.5C13.5 5 16 4.5 20 5v13c-4-.5-6.5 0-8 1.5z"/>
                <path d="M12 6.5v13"/>
              </svg>
            </span>
            <span class="label">Need to Know</span>
          </a>

          <a class="item" routerLink="/about">
            <span class="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 21.5z"/>
                <path d="M4 5.5A2.5 2.5 0 0 0 6.5 8H20"/>
                <circle cx="12" cy="11" r=".7" fill="currentColor" stroke="none"/>
                <path d="M12 13.2V16"/>
              </svg>
            </span>
            <span class="label">Info. About QURAN</span>
          </a>
        </nav>

        <footer class="controls">
          <button type="button" class="ctrl" [class.off]="muted()" (click)="toggleMute()"
                  [attr.aria-label]="muted() ? 'Unmute' : 'Mute'">
            @if (muted()) {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l4 6"/><path d="M21 9l-4 6"/>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8.5a5 5 0 0 1 0 7"/><path d="M18.5 6a8.5 8.5 0 0 1 0 12"/>
              </svg>
            }
          </button>

          <button type="button" class="ctrl" (click)="exit()" aria-label="Exit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3v9"/><path d="M6.6 6.6a8 8 0 1 0 10.8 0"/>
            </svg>
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .hq {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      background: #050a16;
    }
    .frame {
      position: relative;
      width: 100%;
      max-width: 460px;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      isolation: isolate;
    }
    @media (min-width: 480px) {
      .frame {
        min-height: min(880px, 96dvh);
        border-radius: 22px;
        box-shadow: 0 30px 80px rgba(0,0,0,.6);
        border: 1px solid rgba(201,162,75,.35);
      }
    }
    .bg {
      position: absolute; inset: 0; z-index: -1;
      background-image: url('/holy-quran-bg.png');
      background-size: cover;
      background-position: center;
    }

    .titlebar {
      display: grid;
      grid-template-columns: 44px 1fr 44px;
      align-items: center;
      padding: 14px 14px 12px;
    }
    .title {
      margin: 0; text-align: center;
      font-family: var(--display);
      font-weight: 700;
      font-size: clamp(22px, 6vw, 30px);
      letter-spacing: .14em;
      color: #ffd86b;
      text-shadow: 0 2px 10px rgba(0,0,0,.65), 0 0 2px rgba(255,216,107,.5);
    }
    .corner { color: #f4cf7a; opacity: .85; font-size: 16px; text-align: center; }
    .corner.right { letter-spacing: 2px; }

    .menu {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: clamp(12px, 2.4vh, 20px);
      padding: 8px 22px;
    }
    .item {
      display: grid;
      grid-template-columns: 46px 1fr;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      text-decoration: none;
      border-radius: 12px;
      border: 1px solid rgba(244, 207, 122, .55);
      background: linear-gradient(180deg, rgba(6, 18, 34, .58), rgba(6, 14, 26, .72));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.35);
      backdrop-filter: blur(2px);
      transition: border-color .15s ease, transform .12s ease, box-shadow .15s ease;
    }
    .item:hover, .item:focus-visible {
      border-color: #ffd86b;
      transform: translateY(-1px);
      box-shadow: inset 0 0 0 1px rgba(255,216,107,.15), 0 10px 26px rgba(0,0,0,.5);
      outline: none;
    }
    .item:active { transform: translateY(0); }
    .ico {
      width: 40px; height: 40px;
      display: grid; place-items: center;
      color: #f4cf7a;
    }
    .ico.green { color: #7bd85a; }
    .ico svg { width: 30px; height: 30px; }
    .label {
      font-family: var(--display);
      font-weight: 600;
      font-size: clamp(17px, 4.4vw, 21px);
      color: #f6ead0;
      letter-spacing: .01em;
    }

    .controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 22px calc(12px + env(safe-area-inset-bottom));
    }
    .ctrl {
      width: 46px; height: 46px;
      display: grid; place-items: center;
      border-radius: 50%;
      border: 1px solid rgba(244, 207, 122, .5);
      background: rgba(4, 10, 22, .55);
      color: #f4cf7a;
      cursor: pointer;
      transition: transform .12s ease, border-color .15s ease, color .15s ease;
    }
    .ctrl:hover { border-color: #ffd86b; transform: scale(1.05); }
    .ctrl:active { transform: scale(.96); }
    .ctrl.off { color: #c98a8a; }
    .ctrl svg { width: 24px; height: 24px; }
  `]
})
export class HomeComponent {
  readonly store = inject(ReadingStore);
  readonly muted = signal<boolean>(localStorage.getItem('nur-muted') === '1');

  toggleMute(): void {
    const next = !this.muted();
    this.muted.set(next);
    localStorage.setItem('nur-muted', next ? '1' : '0');
  }

  exit(): void {
    // On the installed Android/PWA build this closes the window; harmless on web.
    try {
      window.close();
    } catch {
      /* no-op */
    }
  }
}
