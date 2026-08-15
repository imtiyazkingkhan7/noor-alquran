import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QuranApi } from './quran.api';
import { SearchHit } from './models';

@Component({
  selector: 'app-search',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="wrap">
      <h1>Search</h1>
      <input
        [ngModel]="query()"
        (ngModelChange)="query.set($event)"
        (keyup.enter)="run()"
        placeholder="Arabic or English"
      />
      <button type="button" (click)="run()">Search</button>
      <div class="hits">
        @for (hit of hits(); track hit.surah + ':' + hit.ayah) {
          <a [routerLink]="['/read']" [queryParams]="{ surah: hit.surah, ayah: hit.ayah }">
            <b>{{ hit.englishName }} {{ hit.surah }}:{{ hit.ayah }}</b>
            <p dir="rtl" class="ar">{{ hit.text }}</p>
            <p>{{ hit.translation }}</p>
          </a>
        }
      </div>
    </div>
  `,
  styles: [`
    .wrap { padding: 28px 24px 48px; max-width: 760px; margin: 0 auto; }
    h1 { font-family: var(--display); font-weight: 600; font-size: 36px; }
    input { width: 100%; padding: 12px 14px; margin: 8px 0; border-radius: 12px; border: 1px solid var(--line); background: var(--inset); color: var(--ink); font: inherit; }
    button { border: 0; background: linear-gradient(180deg, var(--gold-2), var(--gold)); color: #0f1a17; padding: 10px 16px; border-radius: 999px; cursor: pointer; font: 500 13px var(--ui); }
    .hits { display: grid; gap: 10px; margin-top: 16px; }
    a { display: block; text-decoration: none; color: var(--ink); background: linear-gradient(180deg, rgba(24,48,40,.9), rgba(14,28,23,.92)); border: 1px solid var(--line); border-radius: 16px; padding: 14px; }
    .ar { font-family: var(--arabic); font-size: 22px; }
    p { margin: 6px 0 0; color: var(--muted); }
  `]
})
export class SearchComponent {
  private readonly api = inject(QuranApi);
  readonly query = signal('');
  readonly hits = signal<SearchHit[]>([]);

  run(): void {
    const q = this.query().trim();
    if (q.length < 2) {
      return;
    }
    this.api.search(q).subscribe({ next: (hits) => this.hits.set(hits), error: () => this.hits.set([]) });
  }
}
