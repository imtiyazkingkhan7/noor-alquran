import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuranApi } from './quran.api';
import { ReaderSurah } from './models';

@Component({
  selector: 'app-surah-index',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="surah-index">
      <header class="head">
        <p class="kicker">Noor · Al-Quran</p>
        <h1>Surah Index</h1>
        <p class="sub">All 114 surahs · tap a name to open the Mushaf</p>
      </header>
      <div class="board">
        <div class="col">
          @for (item of left(); track item.num) {
            <a [routerLink]="['/read']" [queryParams]="{ surah: item.num, ayah: 1 }">
              <span class="num">{{ item.num }}</span>
              <span class="names">
                <b>{{ item.en }}</b>
                <em>{{ item.ar }}</em>
              </span>
            </a>
          }
        </div>
        <div class="col">
          @for (item of right(); track item.num) {
            <a [routerLink]="['/read']" [queryParams]="{ surah: item.num, ayah: 1 }">
              <span class="num">{{ item.num }}</span>
              <span class="names">
                <b>{{ item.en }}</b>
                <em>{{ item.ar }}</em>
              </span>
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .surah-index {
      position: relative;
      min-height: calc(100dvh - var(--top-h) - var(--tab-h));
      padding: 18px 22px 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .head { text-align: center; margin-bottom: 14px; }
    .kicker { margin: 0 0 4px; color: var(--gold); letter-spacing: .18em; text-transform: uppercase; font-size: 12px; }
    h1 {
      font-family: var(--display); font-weight: 600; font-size: clamp(34px, 5vw, 52px);
      margin: 0; color: var(--ink);
    }
    .sub { margin: 6px 0 0; color: var(--muted); font-size: 14px; }
    .board {
      width: min(920px, 100%);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 18px;
      padding: 14px;
      border-radius: 22px;
      background: var(--panel);
      border: 1px solid var(--line);
    }
    .col { display: grid; gap: 6px; }
    a {
      display: grid;
      grid-template-columns: 36px 1fr;
      gap: 8px;
      align-items: center;
      text-decoration: none;
      color: var(--ink);
      padding: 8px 10px;
      border-radius: 12px;
      background: rgba(18, 34, 28, 0.65);
      border: 1px solid var(--line);
    }
    a:hover { border-color: var(--gold); }
    .num {
      width: 32px; height: 32px; border-radius: 50%;
      display: grid; place-items: center;
      border: 1px solid var(--gold);
      color: var(--gold); font-size: 12px; font-weight: 600;
    }
    .names { min-width: 0; display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
    b { font-size: 15px; font-weight: 600; }
    em {
      font-family: var(--arabic); font-style: normal; font-size: 22px; color: var(--gold);
      direction: rtl; line-height: 1.3;
    }
    @media (max-width: 720px) {
      .surah-index { padding: 10px 12px 20px; min-height: 0; }
      h1 { font-size: 28px; }
      .board { grid-template-columns: 1fr; padding: 10px; }
      a { padding: 10px; }
    }
  `]
})
export class SurahIndexComponent {
  private readonly api = inject(QuranApi);
  readonly surahs = signal<ReaderSurah[]>([]);
  readonly left = computed(() => this.surahs().slice(0, 57));
  readonly right = computed(() => this.surahs().slice(57, 114));

  constructor() {
    this.api.surahs().subscribe({
      next: (surahs) => this.surahs.set(surahs),
      error: () => this.surahs.set([])
    });
  }
}
