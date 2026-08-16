import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { QuranApi } from './quran.api';
import { ReadingStore } from './reading.store';
import { TeacherHalt, TeacherSession } from './teacher.session';
import { AyahView, ReaderSurah } from './models';

@Component({
  selector: 'app-practice',
  imports: [FormsModule],
  template: `
    <div class="recite-app">
      <header class="head">
        <p class="kicker">Teacher</p>
        <h1>Recite</h1>
        <p class="lede">Maulana sunte hain. Ghalat lafz par rok kar sahi lafz bolte hain.</p>
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
        <section class="ayah-card">
          <p class="arabic" dir="rtl">
            @for (word of current.words; track word.index) {
              <span
                class="word"
                [class.bad]="haltWord() === word.index"
                [class.ok]="teacher.matchedThrough() >= word.index && haltWord() !== word.index"
                [class.now]="teacher.currentWord() === word.index && (teacher.listening() || teacher.halted()) && haltWord() !== word.index"
              >{{ word.text }}</span>
            }
          </p>
          <p class="meaning">{{ current.translation }}</p>
        </section>
      }

      <aside class="teacher" [class.stop]="teacher.halted()" [class.live]="teacher.listening()">
        <p class="score">{{ statusLabel() }}</p>
        <p class="msg">{{ note() || teacher.message() || 'Recite dabao, phir yeh ayat padho.' }}</p>
        @if (teacher.heard()) {
          <p class="heard" dir="rtl">{{ teacher.heard() }}</p>
        }
        @if (teacher.halted()) {
          <button type="button" class="retry" (click)="startTeacher()">Try this ayah again</button>
        }
      </aside>

      <div class="dock">
        <button type="button" [disabled]="!ayah()" (click)="ayah() && play(ayah()!)">Listen</button>
        <button type="button" class="recite" [class.live]="teacher.listening()" (click)="startTeacher()">
          {{ teacher.listening() ? 'Listening…' : 'Recite' }}
        </button>
        <button type="button" (click)="stopAll()">Stop</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .recite-app {
      height: 100%;
      max-width: 860px;
      margin: 0 auto;
      padding: 20px 22px 16px;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .head { flex: 0 0 auto; }
    .kicker { margin: 0 0 4px; letter-spacing: .18em; text-transform: uppercase; font-size: 11px; color: var(--gold); }
    h1 { font-family: var(--display); font-weight: 600; font-size: 36px; margin: 0 0 6px; }
    .lede { color: var(--muted); line-height: 1.5; max-width: 620px; margin: 0; }
    .pick { display: flex; gap: 12px; margin: 16px 0 12px; flex: 0 0 auto; }
    label { display: grid; gap: 6px; flex: 1; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
    select { width: 100%; min-width: 0; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--inset); color: var(--ink); font: inherit; }
    .ayah-card {
      flex: 1;
      min-height: 0;
      overflow: auto;
      background: var(--paper);
      color: var(--ink-dark);
      border-radius: 18px;
      padding: 20px;
      box-shadow: var(--shadow);
    }
    .arabic { font-family: var(--arabic); font-size: 42px; line-height: 2.15; margin: 0; display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 0.32em; text-rendering: optimizeLegibility; }
    .word { display: inline-flex; padding: 0 4px; border-radius: 4px; transition: background-color 0.16s ease; }
    .word.bad { background: #f0c9c2; }
    .word.ok { background: #cfe8b8; }
    .word.now { background: #f0c94b; }
    .meaning { color: #5c4e3a; margin: 12px 0 0; }
    .teacher {
      flex: 0 0 auto;
      margin-top: 12px;
      background: linear-gradient(180deg, rgba(24,48,40,.95), rgba(14,28,23,.95));
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 14px 16px;
    }
    .teacher.live { border-color: var(--gold); }
    .teacher.stop { background: #3a1515; border-color: #8a1f1f; }
    .score { font-family: var(--display); font-size: 24px; margin: 0 0 4px; color: var(--gold); }
    .teacher.stop .score { color: #f0c9c2; }
    .msg { margin: 0; line-height: 1.45; }
    .heard { font-family: var(--arabic); font-size: 20px; margin: 8px 0 0; }
    .retry {
      margin-top: 10px;
      border: 0;
      border-radius: 999px;
      padding: 8px 14px;
      background: linear-gradient(180deg, var(--gold-2), var(--gold));
      color: #0f1a17;
      font: 600 13px var(--ui);
      cursor: pointer;
    }
    .dock {
      flex: 0 0 auto;
      display: grid;
      grid-template-columns: 1fr 1.5fr 1fr;
      gap: 8px;
      margin-top: 12px;
      position: sticky;
      bottom: 0;
    }
    .dock button {
      border: 1px solid var(--line);
      background: rgba(18, 34, 28, 0.92);
      color: var(--ink);
      padding: 12px 10px;
      border-radius: 999px;
      cursor: pointer;
      font: 600 14px var(--ui);
    }
    .dock button:disabled { opacity: 0.4; }
    .dock .recite {
      background: #6b1d1d;
      border-color: #8a1f1f;
      color: #fff;
      letter-spacing: 0.04em;
    }
    .dock .recite.live { background: #a12626; }
    @media (max-width: 900px) {
      .recite-app { padding: 10px 12px 8px; }
      h1 { font-size: 24px; }
      .lede { display: none; }
      .pick { margin: 8px 0; gap: 8px; }
      .arabic { font-size: 34px; line-height: 2; }
      .ayah-card { padding: 14px; }
      .teacher { padding: 12px; }
      .score { font-size: 22px; }
      .dock button { padding: 13px 8px; }
    }
  `]
})
export class PracticeComponent implements OnDestroy {
  private readonly api = inject(QuranApi);
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(ReadingStore);
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
      const querySurah = Number(this.route.snapshot.queryParamMap.get('surah') || 0);
      const queryAyah = Number(this.route.snapshot.queryParamMap.get('ayah') || 0);
      const progress = this.store.progress();
      this.surahNo.set(querySurah || progress.surah || surahs[0]?.num || 1);
      this.ayahNo.set(queryAyah || progress.ayah || 1);
      this.loadAyah();
    });
  }

  statusLabel(): string {
    if (this.teacher.halted()) {
      return 'Ruko';
    }
    if (this.teacher.listening()) {
      return 'Sun raha hoon';
    }
    return 'Tayyar';
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
      this.api.verse(detail.num, readerAyah.n).subscribe((ayah) => {
        this.ayah.set(ayah);
        this.store.mark({ page: ayah.page || 1, surah: ayah.surah, ayah: ayah.ayah });
      });
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
      },
      onPass: () => {
        this.note.set('شاباش۔ اگلی آیت پڑھو۔');
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
