import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuranApi } from './quran.api';
import { LessonView } from './models';

@Component({
  selector: 'app-lessons',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <header>
        <p class="kicker">Curriculum</p>
        <h1>Tajweed lessons</h1>
        <p>Each rule is taught first, then practiced on the Mushaf. The recitation teacher uses these same rule names when it hears your ayah.</p>
      </header>
      <div class="grid">
        @for (lesson of lessons(); track lesson.id) {
          <article>
            <span class="swatch" [class]="lesson.rule"></span>
            <h2>{{ lesson.title }}</h2>
            <p>{{ lesson.summary }}</p>
            <p class="body">{{ lesson.explanation }}</p>
            <ol>
              @for (step of lesson.steps; track step) {
                <li>{{ step }}</li>
              }
            </ol>
            <p class="examples">
              @for (ex of lesson.examples; track $index) {
                <a [routerLink]="['/read']" [queryParams]="{ surah: ex.surah, ayah: ex.ayah }">{{ ex.note }}</a>
              }
            </p>
          </article>
        }
      </div>
    </div>
  `,
  styles: [`
    .wrap { padding: 32px 28px 48px; max-width: 1100px; margin: 0 auto; }
    @media (max-width: 900px) {
      .wrap { padding: 12px 14px 24px; }
      h1 { font-size: 24px; }
    }
    .kicker { letter-spacing: .18em; text-transform: uppercase; font-size: 11px; color: var(--gold); }
    h1 { font-family: var(--display); font-weight: 600; font-size: 36px; margin: 0 0 8px; }
    header p { max-width: 640px; color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 28px; }
    article { background: linear-gradient(180deg, rgba(24,48,40,.9), rgba(14,28,23,.92)); border: 1px solid var(--line); border-radius: 18px; padding: 18px; }
    h2 { font-family: var(--display); font-size: 22px; font-weight: 600; margin: 8px 0; }
    .body, li, p { font-size: 14px; line-height: 1.55; color: #d7cbb8; }
    ol { padding-left: 18px; }
    .examples { display: grid; gap: 6px; }
    .examples a { color: var(--gold); text-decoration: none; font-size: 13px; }
    .swatch { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }
  `]
})
export class LessonsComponent {
  private readonly api = inject(QuranApi);
  readonly lessons = signal<LessonView[]>([]);

  constructor() {
    this.api.lessons().subscribe((lessons) => this.lessons.set(lessons));
  }
}
