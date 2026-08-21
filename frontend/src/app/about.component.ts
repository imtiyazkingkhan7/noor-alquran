import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="about">
      <header class="head">
        <p class="kicker">Noor · Al-Quran</p>
        <h1>Info. About Quran</h1>
      </header>

      <article class="card">
        <p>
          The Holy Quran is the central religious text of Islam, believed by Muslims to be
          the word of Allah revealed to the Prophet Muhammad ﷺ over approximately 23 years.
        </p>
        <ul class="facts">
          <li><span class="k">Surahs</span><span class="v">114</span></li>
          <li><span class="k">Ayahs</span><span class="v">6,236</span></li>
          <li><span class="k">Paras (Juz)</span><span class="v">30</span></li>
          <li><span class="k">Madinah pages</span><span class="v">604</span></li>
          <li><span class="k">Language</span><span class="v">Classical Arabic</span></li>
        </ul>
        <p>
          This app is a <b>practice aid</b> for reading with the Mushaf, visual Tajweed,
          reference recitation audio, and a recitation teacher. It does not replace a
          qualified teacher, and automated Tajweed scoring is assistive.
        </p>
      </article>
    </div>
  `,
  styles: [`
    .about {
      min-height: calc(100dvh - var(--top-h) - var(--tab-h));
      padding: 18px 22px 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .head { text-align: center; margin-bottom: 14px; }
    .kicker { margin: 0 0 4px; color: var(--gold); letter-spacing: .18em; text-transform: uppercase; font-size: 12px; }
    h1 { font-family: var(--display); font-weight: 600; font-size: clamp(30px, 5vw, 48px); margin: 0; color: var(--ink); }
    .card {
      width: min(720px, 100%);
      padding: 22px 24px;
      border-radius: 22px;
      background: var(--panel);
      border: 1px solid var(--line);
      color: var(--ink);
      line-height: 1.6;
    }
    .card p { margin: 0 0 14px; }
    .facts { list-style: none; margin: 0 0 16px; padding: 0; display: grid; gap: 8px; }
    .facts li {
      display: flex; justify-content: space-between; gap: 12px;
      padding: 10px 14px; border-radius: 12px;
      background: rgba(18, 34, 28, 0.65); border: 1px solid var(--line);
    }
    .k { color: var(--muted); }
    .v { color: var(--gold); font-weight: 600; }
    @media (max-width: 720px) {
      .about { padding: 10px 12px 20px; min-height: 0; }
      .card { padding: 16px 16px; }
    }
  `]
})
export class AboutComponent {}
