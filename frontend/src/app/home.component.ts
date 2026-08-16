import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReadingStore } from './reading.store';
import { InstallService } from './install.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="home">
      @if (!install.installed()) {
        <aside class="install-card">
          <p class="install-title">Install on PC or phone</p>
          <button type="button" class="btn btn-gold install" (click)="install.install()">
            Install Noor on this device
          </button>
          <p class="install-hint">{{ install.hint() }}</p>
          <ul class="install-steps">
            <li><b>PC Chrome</b> — ⋮ menu → Cast, save and share → Install page as app</li>
            <li><b>Android</b> — Chrome ⋮ menu → Install app</li>
            <li><b>iPhone</b> — Share → Add to Home Screen</li>
          </ul>
        </aside>
      }
      <div class="main">
      <header class="hero">
        <img class="app-mark" src="/noor-logo.png" alt="القرآن الكريم" />
        <h1 class="brand-name">Noor</h1>
        <p class="kicker">Al-Quran</p>
        @if (install.installed()) {
          <p class="install-hint">{{ install.hint() }}</p>
        }
      </header>

      <nav class="menu">
        <a class="item first recite" routerLink="/practice">
          <span class="step">●</span>
          <span>
            <b>Recite</b>
            <small>Teacher stops you on a mistake</small>
          </span>
        </a>
        <a class="item" [routerLink]="['/read']" [queryParams]="{ surah: store.progress().surah, ayah: store.progress().ayah }">
          <span class="step">۝</span>
          <span>
            <b>Mushaf</b>
            <small>Surah {{ store.progress().surah }} · Ayah {{ store.progress().ayah }}</small>
          </span>
        </a>
        <a class="item" routerLink="/index">
          <span class="step">30</span>
          <span>
            <b>Para Index</b>
            <small>All 30 parahs</small>
          </span>
        </a>
      </nav>
      </div>
    </div>
  `,
  styles: [`
    .home { padding: 28px 24px 48px; max-width: 560px; margin: 0 auto; }
    .item.lessons { padding: 12px 18px; }
    .item.lessons b { font-size: 20px; }
    @media (max-width: 900px) {
      .home { padding: 10px 14px 20px; }
      .install-card { display: none; }
      .app-mark { width: min(96px, 24vw); margin-bottom: 0; }
      .brand-name { font-size: 26px; }
      .hero { margin-bottom: 10px; }
      .item b { font-size: 18px; }
      .item { padding: 12px 14px; }
      .item.recite { border-color: var(--gold); background: linear-gradient(180deg, rgba(201, 162, 75, 0.22), rgba(14, 28, 23, 0.92)); }
      .menu { gap: 8px; margin-bottom: 14px; }
    }
    .hero { text-align: center; margin-bottom: 22px; }
    .app-mark {
      display: block;
      width: min(340px, 78vw);
      height: auto;
      margin: 0 auto 4px;
      image-rendering: auto;
      filter: drop-shadow(0 12px 28px rgba(0,0,0,.35));
    }
    .brand-name {
      margin: 0;
      font-family: var(--display);
      font-size: clamp(42px, 8vw, 58px);
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .install { margin-top: 8px; width: 100%; padding: 12px 16px; font-size: 15px; }
    .install-card {
      padding: 22px 24px;
      border: 1px solid var(--gold); border-radius: 20px;
      background: rgba(18, 34, 28, 0.92); text-align: start;
      box-shadow: var(--shadow);
    }
    @media (min-width: 901px) {
      .install-card {
        position: fixed;
        left: 16px;
        top: 84px;
        width: 380px;
        z-index: 15;
      }
    }
    @media (max-width: 900px) {
      .install-card { margin: 0 0 22px; }
    }
    .install-title {
      margin: 0 0 10px; color: var(--gold); font-size: 14px;
      letter-spacing: .12em; text-transform: uppercase; text-align: start;
    }
    .install-hint { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.5; }
    .install-steps {
      margin: 12px 0 0; padding-left: 1.15em; color: var(--ink);
      font-size: 15px; line-height: 1.55;
    }
    .install-steps li { margin: 4px 0; }
    .menu { display: grid; gap: 10px; margin-bottom: 22px; }
    .item {
      display: grid; grid-template-columns: 42px 1fr; gap: 14px; align-items: center;
      padding: 16px 18px; text-decoration: none; color: inherit;
      border: 1px solid var(--line); border-radius: 18px;
      background: linear-gradient(180deg, rgba(24, 48, 40, 0.9), rgba(14, 28, 23, 0.92));
    }
    .item.first { border-color: var(--gold); }
    .item:hover { border-color: var(--gold); }
    .step {
      width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--gold);
      display: grid; place-items: center; color: var(--gold); font-weight: 700;
    }
    .item b { display: block; font-family: var(--display); font-size: 24px; font-weight: 600; }
    .item small { color: var(--muted); font-size: 13px; }
  `]
})
export class HomeComponent {
  readonly store = inject(ReadingStore);
  readonly install = inject(InstallService);
}
