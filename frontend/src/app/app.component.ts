import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PrayerService } from './prayer.service';
import { InstallService } from './install.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <header class="top">
        <a routerLink="/" class="brand">
          <img class="mark" src="/noor-logo.png" alt="Noor" />
          <span>
            <strong>Noor</strong>
            <small>Al-Quran</small>
          </span>
        </a>
        <nav class="nav">
          <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Home</a>
          <a routerLink="/search" routerLinkActive="on">Search</a>
        </nav>
      </header>
      <div class="stage">
        <router-outlet />
      </div>
    </div>
  `
})
export class AppComponent {
  constructor() {
    inject(PrayerService).start();
    inject(InstallService).start();
  }
}
