import { Component, ElementRef, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuranApi } from './quran.api';
import { ReadingStore } from './reading.store';
import { TeacherHalt, TeacherSession } from './teacher.session';
import { PrayerService } from './prayer.service';
import { AyahView, JuzView, LetterToken, ReaderAyah, ReaderPara, ReciterView, TAJWEED_LEGEND } from './models';
import { namedParas, paraName } from './para-names';

const EASTERN = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const FONT = '36px "Al Majeed Quranic"';
const WORD_GAP = 4;
const MARK_SIZE = 28;
const LINE_HEIGHT = 54;

type Token =
  | { kind: 'word'; ayah: ReaderAyah; index: number; text: string; letters: LetterToken[] }
  | { kind: 'close'; ayah: ReaderAyah; index: number; text: string; letters: LetterToken[]; ruku: boolean }
  | { kind: 'title'; text: string }
  | { kind: 'basmala' };
type Line = { tokens: Token[]; short: boolean; extra: number };

@Component({
  selector: 'app-mushaf',
  imports: [FormsModule],
  templateUrl: './mushaf.component.html',
  styleUrl: './mushaf.component.scss'
})
export class MushafComponent implements OnDestroy {
  private readonly api = inject(QuranApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly store = inject(ReadingStore);
  readonly teacher = inject(TeacherSession);
  readonly prayer = inject(PrayerService);

  readonly paras = signal<JuzView[]>([]);
  readonly reciters = signal<ReciterView[]>([]);
  readonly detail = signal<ReaderPara | null>(null);
  readonly pages = signal<Line[][]>([]);
  readonly leaf = signal(0);
  readonly currentSurah = signal(1);
  readonly currentAyah = signal(1);
  readonly reciter = signal('ar.alafasy');
  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly playing = signal(false);
  readonly chaining = signal(false);
  readonly activeWord = signal(-1);
  readonly haltWord = signal(-1);
  readonly teacherNote = signal('');
  readonly paraDrawer = signal(false);
  readonly legend = TAJWEED_LEGEND;
  private readonly well = viewChild<ElementRef<HTMLElement>>('well');
  private audio?: HTMLAudioElement;
  private observer?: ResizeObserver;
  private lastPack = '';
  private pendingLastLeaf = false;
  private pageQueue: ReaderAyah[] = [];
  private queueIndex = 0;
  private playGen = 0;
  private swipeX = 0;
  private swipeY = 0;

  constructor() {
    this.api.reciters().subscribe((reciters) => this.reciters.set(reciters));
    this.api.juz().subscribe({
      next: (paras) => this.paras.set(namedParas(paras)),
      error: () => this.paras.set(namedParas([]))
    });
    this.route.queryParamMap.subscribe((params) => {
      const para = Number(params.get('para') || 0);
      const surah = Number(params.get('surah') || 0);
      const leafRaw = Number(params.get('leaf') || 1);
      const leaf = leafRaw < 0 ? 0 : Math.max(0, leafRaw - 1);
      const ayah = Number(params.get('ayah') || 0);
      this.pendingLastLeaf = leafRaw < 0;
      if (para) {
        if (this.detail()?.num === para && this.pages().length) {
          this.leaf.set(this.pendingLastLeaf ? this.pages().length - 1 : Math.min(leaf, this.pages().length - 1));
          if (ayah) {
            this.currentAyah.set(ayah);
            if (surah) {
              this.currentSurah.set(surah);
            }
            this.showLeafFor(this.currentSurah(), ayah);
          }
          return;
        }
        this.openPara(para, leaf, ayah, surah);
        return;
      }
      if (surah) {
        this.api.verse(surah, ayah || 1).subscribe({
          next: (view) => this.openPara(view.juz || 1, leaf, view.ayah, view.surah),
          error: () => this.openPara(1, 0, 0)
        });
        return;
      }
      this.openPara(1, 0, 0);
    });
    afterNextRender(() => {
      const run = () => this.packToWidth();
      if (document.fonts?.load) {
        void document.fonts.load(FONT).then(run);
      }
      run();
      const el = this.well()?.nativeElement;
      if (el && typeof ResizeObserver !== 'undefined') {
        this.observer = new ResizeObserver(() => this.packToWidth());
        this.observer.observe(el);
      }
    });
  }

  filteredParas(): JuzView[] {
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return this.paras();
    }
    return this.paras().filter((para) => {
      const names = paraName(para.number);
      return para.englishName.toLowerCase().includes(q)
        || (para.arabicName ?? '').includes(q)
        || names.en.toLowerCase().includes(q)
        || names.ar.includes(q)
        || String(para.number) === q;
    });
  }

  currentLines(): Line[] {
    return this.pages()[this.leaf()] ?? [];
  }

  pageAyahs(): ReaderAyah[] {
    const list: ReaderAyah[] = [];
    const seen = new Set<string>();
    for (const line of this.currentLines()) {
      for (const token of line.tokens) {
        if (token.kind !== 'word' && token.kind !== 'close') {
          continue;
        }
        const key = `${this.ayahSurah(token.ayah)}:${token.ayah.n}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        list.push(token.ayah);
      }
    }
    return list;
  }

  pageSurahs(): { num: number; ar: string; en: string }[] {
    const list: { num: number; ar: string; en: string }[] = [];
    const seen = new Set<number>();
    for (const ayah of this.pageAyahs()) {
      const num = this.ayahSurah(ayah);
      if (seen.has(num)) {
        continue;
      }
      seen.add(num);
      list.push({ num, ar: ayah.surahAr || '', en: ayah.surahEn || '' });
    }
    if (!list.length) {
      const ayah = this.detail()?.ayahs.find((item) => this.ayahSurah(item) === this.currentSurah())
        ?? this.detail()?.ayahs[0];
      if (ayah) {
        list.push({ num: this.ayahSurah(ayah), ar: ayah.surahAr || '', en: ayah.surahEn || '' });
      }
    }
    return list;
  }

  lineKind(line: Line): 'text' | 'title' | 'basmala' {
    if (line.tokens.some((token) => token.kind === 'basmala')) {
      return 'basmala';
    }
    if (line.tokens[0]?.kind === 'title') {
      return 'title';
    }
    return 'text';
  }

  lineGap(line: Line): number {
    const count = line.tokens.filter((token) => token.kind === 'word' || token.kind === 'close').length;
    if (line.short || count < 2) {
      return WORD_GAP;
    }
    return WORD_GAP + line.extra / (count - 1);
  }

  lineHasRuku(line: Line): boolean {
    return line.tokens.some((token) => token.kind === 'close' && token.ruku);
  }

  isParaOpenLine(index: number): boolean {
    if (this.leaf() !== 0) {
      return false;
    }
    const lines = this.currentLines();
    const first = lines.findIndex((line) => this.lineKind(line) === 'text');
    return first >= 0 && index === first;
  }

  showHeader(): boolean {
    return false;
  }

  eastern(value: number | undefined | null): string {
    return String(value ?? 1).replace(/\d/g, (digit) => EASTERN[Number(digit)]);
  }

  ayahSurah(ayah: ReaderAyah): number {
    return ayah.surah && ayah.surah > 0 ? ayah.surah : this.currentSurah();
  }

  wordTone(ayah: ReaderAyah, index: number): 'done' | 'current' | 'wrong' | '' {
    if (this.currentAyah() !== ayah.n || this.currentSurah() !== this.ayahSurah(ayah)) {
      return '';
    }
    if (this.haltWord() === index) {
      return 'wrong';
    }
    if (this.teacher.listening() || this.teacher.halted()) {
      if (index <= this.teacher.matchedThrough()) {
        return 'done';
      }
      if (index === this.teacher.currentWord()) {
        return this.teacher.halted() ? 'wrong' : 'current';
      }
      return '';
    }
    if (this.playing()) {
      if (index < this.activeWord()) {
        return 'done';
      }
      if (index === this.activeWord()) {
        return 'current';
      }
    }
    return '';
  }

  openPara(number: number, leaf = 0, ayah = 0, surah = 0): void {
    if (number < 1 || number > 30) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.stop();
    this.teacher.stop();
    this.haltWord.set(-1);
    this.api.para(number).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.lastPack = '';
        this.pages.set([]);
        const first = detail.ayahs[0];
        this.currentSurah.set(surah || first?.surah || 1);
        this.currentAyah.set(ayah || first?.n || 1);
        this.loading.set(false);
        this.store.mark({
          page: 1,
          surah: this.currentSurah(),
          ayah: this.currentAyah()
        });
        window.setTimeout(() => {
          this.packToWidth();
          if (this.pendingLastLeaf) {
            this.leaf.set(Math.max(0, this.pages().length - 1));
            this.pendingLastLeaf = false;
          } else {
            const fromAyah = ayah ? leafIndexFor(this.pages(), this.currentSurah(), ayah) : leaf;
            this.leaf.set(Math.max(0, Math.min(fromAyah, Math.max(this.pages().length - 1, 0))));
          }
        }, 40);
      },
      error: () => {
        this.loading.set(false);
        this.detail.set(null);
        this.error.set('Cannot reach the Spring Boot API on port 8080.');
      }
    });
  }

  goPara(number: number, leaf = 1): void {
    if (number < 1 || number > 30) {
      return;
    }
    void this.router.navigate(['/read'], { queryParams: { para: number, leaf } });
    this.paraDrawer.set(false);
  }

  onSwipeStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    this.swipeX = touch.clientX;
    this.swipeY = touch.clientY;
  }

  onSwipeEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - this.swipeX;
    const dy = touch.clientY - this.swipeY;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) {
      return;
    }
    this.goLeaf(this.leaf() + (dx < 0 ? 1 : -1));
  }

  goLeaf(index: number): void {
    const pages = this.pages();
    const para = this.detail()?.num ?? 1;
    if (index < 0) {
      this.goPara(para - 1, -1);
      return;
    }
    if (index >= pages.length) {
      this.goPara(para + 1, 1);
      return;
    }
    void this.router.navigate(['/read'], {
      queryParams: { para, leaf: index + 1 }
    });
  }

  select(ayah: ReaderAyah): void {
    const para = this.detail();
    if (!para) {
      return;
    }
    this.currentSurah.set(this.ayahSurah(ayah));
    this.currentAyah.set(ayah.n);
    this.store.mark({ page: this.leaf() + 1, surah: this.ayahSurah(ayah), ayah: ayah.n });
  }

  bookmark(ayah: ReaderAyah): void {
    const para = this.detail();
    if (!para) {
      return;
    }
    this.store.toggleBookmark({
      surah: this.ayahSurah(ayah),
      ayah: ayah.n,
      page: this.leaf() + 1,
      title: `${ayah.surahEn || para.en} ${ayah.n}`
    });
  }

  play(ayah: ReaderAyah, chain = false): void {
    const para = this.detail();
    if (!para) {
      return;
    }
    this.select(ayah);
    if (!chain) {
      this.pageQueue = [];
      this.queueIndex = 0;
      this.showLeafFor(this.ayahSurah(ayah), ayah.n);
    }
    this.playAyahAudio(ayah, chain);
  }

  playPage(): void {
    this.pageQueue = this.pageAyahs();
    this.queueIndex = 0;
    const first = this.pageQueue[0];
    if (first) {
      this.playAyahAudio(first, true);
    }
  }

  playFromHere(): void {
    const ayah = this.currentReaderAyah();
    if (!ayah) {
      return;
    }
    const onPage = this.pageAyahs();
    const index = onPage.findIndex((item) =>
      item.n === ayah.n && this.ayahSurah(item) === this.ayahSurah(ayah)
    );
    this.pageQueue = index < 0 ? onPage : onPage.slice(index);
    this.queueIndex = 0;
    const first = this.pageQueue[0] ?? ayah;
    this.playAyahAudio(first, true);
  }

  startTeacher(): void {
    const ayah = this.currentReaderAyah();
    if (!ayah) {
      return;
    }
    this.haltWord.set(-1);
    this.teacherNote.set('');
    this.stop();
    this.showLeafFor(this.ayahSurah(ayah), ayah.n);
    this.scrollAyah(this.ayahSurah(ayah), ayah.n);
    this.api.verse(this.ayahSurah(ayah), ayah.n).subscribe((view) => this.listen(view));
  }

  currentReaderAyah(): ReaderAyah | undefined {
    return this.detail()?.ayahs.find((item) =>
      item.n === this.currentAyah() && this.ayahSurah(item) === this.currentSurah()
    );
  }

  currentAyahView(): ReaderAyah | undefined {
    return this.currentReaderAyah();
  }

  stop(): void {
    this.chaining.set(false);
    this.pageQueue = [];
    this.queueIndex = 0;
    this.playGen += 1;
    this.stopAudioOnly();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.stop();
    this.teacher.stop();
    window.speechSynthesis.cancel();
  }

  private listen(view: AyahView): void {
    const ayah = this.currentReaderAyah();
    if (!ayah) {
      return;
    }
    this.teacher.start(view, {
      onHalt: (halt: TeacherHalt) => {
        this.haltWord.set(halt.wordIndex);
        this.teacherNote.set(halt.spoken);
        this.select(ayah);
        this.scrollAyah(this.ayahSurah(ayah), ayah.n, halt.wordIndex);
        window.setTimeout(() => this.play(ayah, false), 2600);
      },
      onPass: () => {
        const next = nextAyah(this.detail()?.ayahs ?? [], ayah);
        if (next) {
          this.select(next);
          this.showLeafFor(this.ayahSurah(next), next.n);
          this.scrollAyah(this.ayahSurah(next), next.n);
          this.teacherNote.set('Good. Recite the next ayah.');
          window.setTimeout(() => this.startTeacher(), 1600);
        } else {
          this.teacherNote.set('Good. This para is complete.');
        }
      },
      onProgress: () => {
        this.scrollAyah(this.ayahSurah(ayah), ayah.n, Math.max(0, this.teacher.currentWord()));
      }
    });
  }

  private packToWidth(): void {
    const detail = this.detail();
    const well = this.well()?.nativeElement;
    if (!detail || !well) {
      return;
    }
    const width = Math.floor(well.clientWidth - 4);
    const height = Math.floor(well.clientHeight);
    if (width < 80 || height < 40) {
      return;
    }
    const lineHeight = LINE_HEIGHT;
    const linesPerPage = Math.max(10, Math.floor(height / lineHeight));
    const key = `${detail.num}:${width}:${linesPerPage}:${detail.ayahs.length}:pack3`;
    if (key === this.lastPack && this.pages().length) {
      return;
    }
    this.lastPack = key;
    const ayah = this.currentAyah();
    const surah = this.currentSurah();
    this.pages.set(buildPages(detail.ayahs, width, linesPerPage));
    if (this.pendingLastLeaf) {
      this.leaf.set(Math.max(0, this.pages().length - 1));
      this.pendingLastLeaf = false;
    } else {
      this.showLeafFor(surah, ayah);
    }
  }

  private playAyahAudio(ayah: ReaderAyah, chain: boolean): void {
    const gen = ++this.playGen;
    this.stopAudioOnly();
    this.chaining.set(chain);
    this.select(ayah);
    this.api.audio(this.ayahSurah(ayah), ayah.n, this.reciter()).subscribe({
      next: (url) => {
        if (gen !== this.playGen) {
          return;
        }
        const audio = new Audio(url);
        this.audio = audio;
        this.playing.set(true);
        this.activeWord.set(0);
        const words = ayah.ar.trim().split(/\s+/).filter(Boolean);
        this.scrollAyah(this.ayahSurah(ayah), ayah.n, 0);
        audio.ontimeupdate = () => {
          if (gen !== this.playGen || !audio.duration || !words.length) {
            return;
          }
          const idx = Math.min(words.length - 1, Math.floor((audio.currentTime / audio.duration) * words.length));
          if (idx !== this.activeWord()) {
            this.activeWord.set(idx);
            this.scrollAyah(this.ayahSurah(ayah), ayah.n, idx);
          }
        };
        audio.onended = () => {
          if (gen !== this.playGen) {
            return;
          }
          this.playing.set(false);
          this.activeWord.set(-1);
          if (!this.chaining()) {
            return;
          }
          this.queueIndex += 1;
          const next = this.pageQueue[this.queueIndex];
          if (next) {
            this.playAyahAudio(next, true);
          } else {
            this.chaining.set(false);
            this.pageQueue = [];
            this.queueIndex = 0;
          }
        };
        audio.onerror = () => {
          if (gen !== this.playGen) {
            return;
          }
          this.playing.set(false);
          this.chaining.set(false);
          this.pageQueue = [];
          this.queueIndex = 0;
          this.error.set('Audio could not be loaded for this reciter.');
        };
        void audio.play();
      },
      error: () => {
        if (gen !== this.playGen) {
          return;
        }
        this.error.set('Audio could not be loaded for this reciter.');
      }
    });
  }

  private stopAudioOnly(): void {
    if (this.audio) {
      this.audio.ontimeupdate = null;
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.audio = undefined;
    this.playing.set(false);
    this.activeWord.set(-1);
  }

  private showLeafFor(surah: number, ayah: number): void {
    const index = leafIndexFor(this.pages(), surah, ayah);
    if (index !== this.leaf()) {
      this.leaf.set(index);
    }
  }

  private scrollAyah(surah: number, ayah: number, word = 0): void {
    window.setTimeout(() => {
      const el = document.getElementById(`w-${surah}-${ayah}-${word}`)
        ?? document.getElementById(`a-${surah}-${ayah}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 30);
  }
}

let measureCtx: CanvasRenderingContext2D | null = null;

function measure(text: string): number {
  if (typeof document === 'undefined') {
    return text.length * 11;
  }
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  if (!measureCtx) {
    return text.length * 11;
  }
  measureCtx.font = FONT;
  return measureCtx.measureText(text).width;
}

function packLines(ayahs: ReaderAyah[], maxWidth: number): Line[] {
  const lines: Line[] = [];
  let tokens: Token[] = [];
  let used = 0;
  const flush = (short: boolean): void => {
    if (!tokens.length) {
      return;
    }
    const extra = short ? 0 : Math.max(0, maxWidth - used);
    lines.push({ tokens, short, extra });
    tokens = [];
    used = 0;
  };
  const add = (token: Token, size: number): void => {
    const next = tokens.length ? used + WORD_GAP + size : size;
    if (tokens.length && next > maxWidth) {
      flush(false);
      used = size;
    } else {
      used = next;
    }
    tokens.push(token);
  };
  for (const ayah of ayahs) {
    if (ayah.surahStarts) {
      flush(true);
      lines.push({ tokens: [{ kind: 'title', text: ayah.surahAr || '' }], short: true, extra: 0 });
      if ((ayah.surah ?? 0) !== 1 && (ayah.surah ?? 0) !== 9) {
        lines.push({ tokens: [{ kind: 'basmala' }], short: true, extra: 0 });
      }
    }
    const words = ayah.ar.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      add({ kind: 'close', ayah, index: 0, text: '', letters: [], ruku: !!ayah.rukuEnds }, MARK_SIZE);
      if ((ayah.surah ?? 0) === 1 && ayah.n === 1) {
        flush(true);
      }
      continue;
    }
    words.forEach((text, index) => {
      const letters = ayah.words?.[index]?.letters ?? [];
      if (index === words.length - 1) {
        const size = Math.min(maxWidth, Math.ceil(measure(text))) + WORD_GAP + MARK_SIZE;
        add({ kind: 'close', ayah, index, text, letters, ruku: !!ayah.rukuEnds }, size);
        return;
      }
      add({ kind: 'word', ayah, index, text, letters }, Math.min(maxWidth, Math.ceil(measure(text))));
    });
    if ((ayah.surah ?? 0) === 1 && ayah.n === 1) {
      flush(true);
    }
  }
  flush(true);
  return lines;
}

function buildPages(ayahs: ReaderAyah[], maxWidth: number, linesPerPage: number): Line[][] {
  const packed = packLines(ayahs, Math.max(120, maxWidth));
  const pages: Line[][] = [];
  let page: Line[] = [];
  for (const line of packed) {
    const newSurah = line.tokens[0]?.kind === 'title' && page.length > 0;
    if (page.length >= linesPerPage || newSurah) {
      pages.push(page);
      page = [];
    }
    page.push(line);
  }
  if (page.length) {
    pages.push(page);
  }
  return pages.length ? pages : [[]];
}

function leafIndexFor(pages: Line[][], surah: number, ayah: number): number {
  const found = pages.findIndex((page) =>
    page.some((line) => line.tokens.some((token) =>
      (token.kind === 'word' || token.kind === 'close')
      && token.ayah.n === ayah
      && (token.ayah.surah || surah) === surah
    ))
  );
  return found < 0 ? 0 : found;
}

function nextAyah(ayahs: ReaderAyah[], current: ReaderAyah): ReaderAyah | undefined {
  const index = ayahs.findIndex((item) =>
    item.n === current.n && (item.surah || 0) === (current.surah || 0)
  );
  return index < 0 ? undefined : ayahs[index + 1];
}
