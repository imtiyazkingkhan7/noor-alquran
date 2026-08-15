import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuranApi } from './quran.api';
import { JuzView } from './models';
import { namedParas } from './para-names';

@Component({
  selector: 'app-index',
  imports: [RouterLink],
  template: `
    <div class="para-index">
      <header class="head">
        <p class="kicker">Noor · Al-Quran</p>
        <h1>Para Index</h1>
        <p class="sub">All 30 parahs · tap a name to open the Mushaf</p>
      </header>
      <div class="board">
        <div class="col">
          @for (item of left(); track item.number) {
            <a [routerLink]="['/read']" [queryParams]="{ para: item.number }">
              <span class="num">{{ item.number }}</span>
              <span class="names">
                <b>{{ item.englishName }}</b>
                <em>{{ item.arabicName }}</em>
              </span>
            </a>
          }
        </div>
        <div class="col">
          @for (item of right(); track item.number) {
            <a [routerLink]="['/read']" [queryParams]="{ para: item.number }">
              <span class="num">{{ item.number }}</span>
              <span class="names">
                <b>{{ item.englishName }}</b>
                <em>{{ item.arabicName }}</em>
              </span>
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .para-index {
      position: relative;
      min-height: calc(100vh - 68px);
      padding: 18px 22px 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .head { text-align: center; margin-bottom: 14px; }
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
    b { font-size: 13px; font-weight: 600; }
    em {
      font-family: var(--arabic); font-style: normal; font-size: 16px; color: var(--gold);
      direction: rtl;
    }
    @media (max-width: 720px) {
      .board { grid-template-columns: 1fr; }
    }
  `]
})
export class IndexComponent {
  private readonly api = inject(QuranApi);
  readonly juz = signal<JuzView[]>(namedParas([]));

  constructor() {
    this.api.juz().subscribe({
      next: (juz) => this.juz.set(namedParas(juz)),
      error: () => this.juz.set(namedParas([]))
    });
  }

  left(): JuzView[] {
    return this.juz().slice(0, 15);
  }

  right(): JuzView[] {
    return this.juz().slice(15, 30);
  }
}
