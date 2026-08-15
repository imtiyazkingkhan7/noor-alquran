import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuranApi } from './quran.api';
import { TeacherHalt, TeacherSession } from './teacher.session';
import { AyahView, ReaderSurah } from './models';

@Component({
  selector: 'app-practice',
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <header>
        <p class="kicker">Teacher</p>
        <h1>Recite. If it is wrong, I will stop you.</h1>
        <p>
          Choose an ayah, press Recite, and read with Tajweed. If a word is wrong or you rush
          without Tajweed, the teacher stops you, speaks, and plays the correct recitation.
          Use Chrome and allow the microphone. This is a practice aid, not a sheikh.
        </p>
      </header>

      <div class="pick">
        <label>Surah
          <select [ngModel]="surahNo()" (ngModelChange)="changeSurah(+$event)">
            @for (surah of surahs(); track surah.num) {
              <option [ngValue]="surah.num">{{ surah.num }} · {{ surah.en }}</option>
            }
          </select>
        </label>
        <label>Ayah
          <select [ngModel]="ayahNo()" (ngModelChange)="ayahNo.set(+$event); loadAyah()">
            @for (n of ayahNumbers(); track n) {
              <option [ngValue]="n">{{ n }}</option>
            }
          </select>
        </label>
      </div>

      @if (ayah(); as current) {
        <section class="card">
          <p class="arabic" dir="rtl">
            @for (word of current.words; track word.index) {
              <span
                class="word"
                [class.bad]="haltWord() === word.index"
                [class.ok]="teacher.matchedThrough() >= word.index && haltWord() !== word.index"
                [class.now]="teacher.currentWord() === word.index && (teacher.listening() || teacher.halted()) && haltWord() !== word.index"
              >@for (letter of word.letters; track $index) {<span class="t" [class]="letter.rule">{{ letter.glyph }}</span>}</span>
            }
          </p>
          <p class="meaning">{{ current.translation }}</p>
          <div class="actions">
            <button type="button" class="primary" (click)="play(current)">Listen</button>
            <button type="button" [class.live]="teacher.listening()" (click)="startTeacher()">
              {{ teacher.listening() ? 'Listening…' : 'Recite to teacher' }}
            </button>
            <button type="button" (click)="stopAll()">Stop</button>
          </div>
        </section>
      }

      <aside class="teacher" [class.stop]="teacher.halted()">
        <p class="score">{{ teacher.halted() ? 'STOP' : (teacher.listening() ? 'Listening' : 'Ready') }}</p>
        <p>{{ note() || teacher.message() || 'Press Recite to teacher, then read the ayah.' }}</p>
        @if (teacher.heard()) {
          <p class="heard" dir="rtl">{{ teacher.heard() }}</p>
        }
      </aside>
    </div>
  `,
  styles: [`
    .wrap { padding: 32px 28px 48px; max-width: 860px; margin: 0 auto; }
    .kicker { letter-spacing: .18em; text-transform: uppercase; font-size: 11px; color: var(--gold); }
    h1 { font-family: var(--display); font-weight: 600; font-size: 36px; margin: 0 0 8px; }
    header p { color: var(--muted); line-height: 1.55; max-width: 620px; }
    .pick { display: flex; gap: 16px; margin: 24px 0; }
    label { display: grid; gap: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
    select { min-width: 180px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--inset); color: var(--ink); font: inherit; }
    .card { background: var(--paper); color: var(--ink-dark); border-radius: 18px; padding: 24px; box-shadow: var(--shadow); }
    .arabic { font-family: var(--arabic); font-size: 34px; line-height: 2.1; margin: 0; display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 0.28em; }
    .word { display: inline-flex; padding: 0 4px; border-radius: 4px; transition: background-color 0.16s ease; }
    .word.bad { background: #f0c9c2; }
    .word.ok { background: #cfe8b8; }
    .word.now { background: #f0c94b; }
    .meaning { color: #5c4e3a; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    button { border: 1px solid var(--line); background: #fff; padding: 9px 14px; border-radius: 999px; cursor: pointer; font: 500 13px var(--ui); }
    .primary { background: #12221c; color: #f4ead7; border-color: #12221c; }
    .live { background: #8a2b2b; color: #fff; border-color: #8a2b2b; }
    .teacher { margin-top: 16px; background: linear-gradient(180deg, rgba(24,48,40,.95), rgba(14,28,23,.95)); color: var(--ink); border: 1px solid var(--line); border-radius: 18px; padding: 20px; }
    .teacher.stop { background: #3a1515; border-color: #8a1f1f; }
    .score { font-family: var(--display); font-size: 28px; margin: 0 0 8px; color: var(--gold); }
    .heard { font-family: var(--arabic); font-size: 20px; }
  `]
})
export class PracticeComponent implements OnDestroy {
  private readonly api = inject(QuranApi);
  readonly teacher = inject(TeacherSession);
  readonly surahs = signal<ReaderSurah[]>([]);
  readonly loaded = signal<ReaderSurah | null>(null);
  readonly surahNo = signal(1);
  readonly ayahNo = signal(1);
  readonly ayah = signal<AyahView | null>(null);
  readonly haltWord = signal(-1);
  readonly note = signal('');
  private audio?: HTMLAudioElement;

  constructor() {
    this.api.surahs().subscribe((surahs) => {
      this.surahs.set(surahs);
      this.surahNo.set(surahs[0]?.num ?? 1);
      this.loadAyah();
    });
  }

  ayahNumbers(): number[] {
    const loaded = this.loaded();
    if (loaded?.ayahs.length) {
      return loaded.ayahs.map((ayah) => ayah.n);
    }
    return [1];
  }

  changeSurah(number: number): void {
    this.surahNo.set(number);
    this.ayahNo.set(1);
    this.loadAyah();
  }

  loadAyah(): void {
    this.stopAll();
    this.api.surah(this.surahNo()).subscribe((detail) => {
      this.loaded.set(detail);
      const wanted = this.ayahNo();
      const readerAyah = detail.ayahs.find((item) => item.n === wanted) ?? detail.ayahs[0];
      if (!readerAyah) {
        this.ayah.set(null);
        return;
      }
      this.ayahNo.set(readerAyah.n);
      this.api.verse(detail.num, readerAyah.n).subscribe((ayah) => this.ayah.set(ayah));
    });
  }

  play(ayah: AyahView): void {
    this.audio?.pause();
    this.audio = new Audio(ayah.audioUrl);
    void this.audio.play();
  }

  startTeacher(): void {
    const ayah = this.ayah();
    if (!ayah) {
      return;
    }
    this.haltWord.set(-1);
    this.note.set('');
    this.audio?.pause();
    this.teacher.start(ayah, {
      onHalt: (halt: TeacherHalt) => {
        this.haltWord.set(halt.wordIndex);
        this.note.set(halt.spoken);
        window.setTimeout(() => this.play(ayah), 2600);
      },
      onPass: () => {
        this.note.set('Good. Go to the next ayah.');
        const next = this.ayahNo() + 1;
        if (next <= this.ayahNumbers().length) {
          this.ayahNo.set(next);
          this.loadAyah();
        }
      }
    });
  }

  stopAll(): void {
    this.teacher.stop();
    this.audio?.pause();
    this.haltWord.set(-1);
    this.note.set('');
    window.speechSynthesis.cancel();
  }

  ngOnDestroy(): void {
    this.stopAll();
  }
}
