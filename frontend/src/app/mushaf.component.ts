import { Component, ElementRef, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuranApi } from './quran.api';
import { ReadingStore } from './reading.store';
import { TeacherHalt, TeacherSession } from './teacher.session';
import { AyahView, JuzView, LetterToken, PageView, ReaderAyah, ReciterView } from './models';
import { namedParas, paraName } from './para-names';

const EASTERN = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const FONT = '44px "Al Majeed Quranic"';
const MARK_SIZE = 28;
const LINE_HEIGHT = 56;
const LINES_PER_PAGE = 8;
const MADINAH_PAGES = 604;

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
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly store = inject(ReadingStore);
  readonly teacher = inject(TeacherSession);

  readonly paras = signal<JuzView[]>([]);
  readonly reciters = signal<ReciterView[]>([]);
  readonly pageView = signal<PageView | null>(null);
  readonly allAyahs = signal<ReaderAyah[]>([]);
  readonly pages = signal<Line[][]>([]);
  readonly leaf = signal(0);
  readonly pageNumber = signal(1);
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
  private readonly well = viewChild<ElementRef<HTMLElement>>('well');
  private audio?: HTMLAudioElement;
  private observer?: ResizeObserver;
  private lastPack = '';
  private keepPlaying = false;
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
      const page = Number(params.get('page') || 0);
      const para = Number(params.get('para') || 0);
      const surah = Number(params.get('surah') || 0);
      const ayah = Number(params.get('ayah') || 0);
      if (para && !page && !surah) {
        this.openPara(para);
        return;
      }
      if (page) {
        this.openPage(page, ayah, surah, para);
        return;
      }
      if (surah) {
        this.api.verse(surah, ayah || 1).subscribe({
          next: (view) => this.openPage(view.page || 1, view.ayah, view.surah),
          error: () => this.openPage(1, 0, 0)
        });
        return;
      }
      if (para) {
        this.openPara(para);
        return;
      }
      this.openPage(1, 0, 0);
    });
    afterNextRender(() => {
      const run = () => {
        this.packToWidth(true);
        this.restoreLeafFromRoute();
      };
      if (document.fonts?.load) {
        void Promise.all([
          document.fonts.load(FONT),
          document.fonts.load('38px "Al Majeed Quranic"')
        ]).then(run);
      }
      if (document.fonts?.ready) {
        void document.fonts.ready.then(run);
      }
      run();
      if (typeof ResizeObserver !== 'undefined') {
        this.observer = new ResizeObserver(() => {
          this.packToWidth();
          this.showLeafFor(this.currentSurah(), this.currentAyah());
        });
        this.observer.observe(this.host.nativeElement);
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
    const lines = this.pages()[this.leaf()] ?? [];
    const padded = lines.slice();
    while (padded.length < LINES_PER_PAGE) {
      padded.push({ tokens: [], short: true, extra: 0 });
    }
    return padded;
  }

  pageAyahs(): ReaderAyah[] {
    return this.allAyahs();
  }

  currentJuz(): number {
    const first = this.leafAyahs()[0];
    if (first?.juz && first.juz > 0) {
      return first.juz;
    }
    const page = first?.page || this.pageNumber();
    let juz = 1;
    for (const para of this.paras()) {
      if (para.startPage <= page) {
        juz = para.number;
      }
    }
    return juz;
  }

  leafAyahs(): ReaderAyah[] {
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
    const ayahs = this.leafAyahs().length ? this.leafAyahs() : this.pageAyahs();
    for (const ayah of ayahs) {
      const num = this.ayahSurah(ayah);
      if (seen.has(num)) {
        continue;
      }
      seen.add(num);
      list.push({ num, ar: ayah.surahAr || '', en: ayah.surahEn || '' });
    }
    return list;
  }

  headerSurah(): { ar: string; en: string } {
    const ayahs = this.leafAyahs();
    const started = ayahs.find((ayah) => ayah.surahStarts);
    const pick = started ?? ayahs[0];
    if (pick) {
      return { ar: pick.surahAr || '', en: pick.surahEn || '' };
    }
    const list = this.pageSurahs();
    const current = list.find((row) => row.num === this.currentSurah());
    return current ?? list[0] ?? { ar: '', en: '' };
  }

  lineFilled(line: Line): boolean {
    return !line.short && this.lineKind(line) === 'text' && line.tokens.length > 1;
  }

  lineKind(line: Line): 'text' | 'title' | 'basmala' {
    if (line.tokens.some((token) => token.kind === 'basmala')) {
      return 'basmala';
    }
    if (line.tokens[0]?.kind === 'title') {
      return 'title';
    }
    const first = line.tokens[0];
    if (
      line.tokens.length === 1
      && first?.kind === 'close'
      && (first.ayah.surah || 1) === 1
      && first.ayah.n === 1
    ) {
      return 'basmala';
    }
    return 'text';
  }

  lineHasRuku(line: Line, index: number): boolean {
    const lines = this.currentLines();
    const close = rukuClose(line);
    if (close) {
      return !isRukuLeftover(line, index, lines);
    }
    const next = lines[index + 1];
    const nextClose = next ? rukuClose(next) : undefined;
    if (!nextClose || !isRukuLeftover(next, index + 1, lines)) {
      return false;
    }
    return line.tokens.some((token) =>
      (token.kind === 'word' || token.kind === 'close')
      && token.ayah.n === nextClose.ayah.n
      && this.ayahSurah(token.ayah) === this.ayahSurah(nextClose.ayah)
    );
  }

  isParaOpenLine(index: number): boolean {
    if (!this.isParaStartLeaf()) {
      return false;
    }
    const lines = this.currentLines();
    const first = lines.findIndex((line) => this.lineKind(line) === 'text' && line.tokens.length > 0);
    return first >= 0 && index === first;
  }

  private isParaStartLeaf(): boolean {
    const i = this.leaf();
    const juz = leafJuz(this.pages()[i]);
    if (i <= 0) {
      return true;
    }
    return juz > 0 && leafJuz(this.pages()[i - 1]) !== juz;
  }

  lastPage(): number {
    return Math.max(this.pages().length, 1);
  }

  atFirstLeaf(): boolean {
    return this.leaf() <= 0;
  }

  atLastLeaf(): boolean {
    return this.leaf() >= Math.max(this.pages().length - 1, 0);
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

  openPara(number: number): void {
    if (number < 1 || number > 30) {
      return;
    }
    this.error.set('');
    this.stop();
    this.teacher.stop();
    this.haltWord.set(-1);
    this.ensureCorpus(() => {
      this.loading.set(false);
      const firstAyah = this.allAyahs().find((ayah) => ayahJuz(ayah) === number);
      if (firstAyah) {
        this.currentSurah.set(this.ayahSurah(firstAyah));
        this.currentAyah.set(firstAyah.n);
        this.pageNumber.set(firstAyah.page || 1);
      }
      this.syncPageView();
      window.setTimeout(() => {
        this.packToWidth(true);
        this.showLeafForJuz(number);
        const first = this.leafAyahs()[0] ?? firstAyah;
        if (first) {
          this.currentSurah.set(this.ayahSurah(first));
          this.currentAyah.set(first.n);
          this.pageNumber.set(first.page || 1);
          this.store.mark({
            page: first.page || 1,
            surah: this.ayahSurah(first),
            ayah: first.n
          });
        }
        this.syncPageView();
      }, 40);
    });
  }

  openPage(page: number, ayah = 0, surah = 0, para = 0): void {
    const next = clampPage(page);
    this.pageNumber.set(next);
    if (ayah) {
      this.currentAyah.set(ayah);
      if (surah) {
        this.currentSurah.set(surah);
      }
    }
    if (
      !ayah
      && this.allAyahs().length
      && this.pages().length
      && this.leafHasMadinah(next)
      && (!para || this.currentJuz() === para)
    ) {
      this.syncPageView();
      return;
    }
    const resume = this.keepPlaying;
    this.error.set('');
    this.stop();
    this.keepPlaying = resume;
    this.teacher.stop();
    this.haltWord.set(-1);
    this.ensureCorpus(() => {
      this.loading.set(false);
      this.syncPageView();
      window.setTimeout(() => {
        const stay = !ayah
          && this.pages().length > 0
          && this.leafHasMadinah(next)
          && (!para || this.currentJuz() === para);
        this.packToWidth(true);
        if (ayah) {
          this.showLeafFor(surah || this.currentSurah(), ayah);
        } else if (!stay) {
          this.showLeafForMadinah(next, para);
        }
        const first = this.leafAyahs()[0];
        if (first && !ayah) {
          this.currentSurah.set(this.ayahSurah(first));
          this.currentAyah.set(first.n);
        }
        this.store.mark({
          page: first?.page || next,
          surah: this.currentSurah(),
          ayah: this.currentAyah()
        });
        this.syncPageView();
        if (this.keepPlaying) {
          this.startPageQueue(this.leafAyahs());
        }
      }, 40);
    });
  }

  goPara(number: number): void {
    if (number < 1 || number > 30) {
      return;
    }
    void this.router.navigate(['/read'], { queryParams: { para: number } });
    this.paraDrawer.set(false);
  }

  goPage(page: number, para?: number): void {
    const next = clampPage(page);
    void this.router.navigate(['/read'], {
      queryParams: {
        page: next,
        para: para || this.currentJuz() || undefined
      }
    });
  }

  goVisual(index: number): void {
    const packed = this.pages();
    if (index < 0 || index >= packed.length) {
      return;
    }
    this.leaf.set(index);
    const first = this.leafAyahs()[0];
    if (!first) {
      return;
    }
    this.currentSurah.set(this.ayahSurah(first));
    this.currentAyah.set(first.n);
    const madinah = first.page || this.pageNumber();
    this.pageNumber.set(madinah);
    this.store.mark({
      page: madinah,
      surah: this.ayahSurah(first),
      ayah: first.n
    });
    this.syncPageView();
    const current = Number(this.route.snapshot.queryParamMap.get('page') || 0);
    if (current === madinah) {
      return;
    }
    void this.router.navigate(['/read'], {
      queryParams: {
        page: madinah,
        para: this.currentJuz() || undefined
      }
    });
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
    this.goVisual(this.leaf() + (dx < 0 ? 1 : -1));
  }

  select(ayah: ReaderAyah): void {
    this.currentSurah.set(this.ayahSurah(ayah));
    this.currentAyah.set(ayah.n);
    this.store.mark({
      page: this.pageNumber(),
      surah: this.ayahSurah(ayah),
      ayah: ayah.n
    });
  }

  bookmark(ayah: ReaderAyah): void {
    this.store.toggleBookmark({
      surah: this.ayahSurah(ayah),
      ayah: ayah.n,
      page: this.pageNumber(),
      title: `${ayah.surahEn || this.headerSurah().en} ${ayah.n}`
    });
  }

  play(ayah: ReaderAyah, chain = false): void {
    this.select(ayah);
    if (!chain) {
      this.pageQueue = [];
      this.queueIndex = 0;
    }
    this.playAyahAudio(ayah, chain);
  }

  playPage(): void {
    this.keepPlaying = true;
    this.startPageQueue(this.leafAyahs());
  }

  playFromHere(): void {
    const ayah = this.currentReaderAyah();
    if (!ayah) {
      return;
    }
    const onPage = this.leafAyahs();
    const index = onPage.findIndex((item) =>
      item.n === ayah.n && this.ayahSurah(item) === this.ayahSurah(ayah)
    );
    this.keepPlaying = true;
    this.startPageQueue(index < 0 ? onPage : onPage.slice(index));
  }

  private startPageQueue(ayahs: ReaderAyah[]): void {
    this.pageQueue = ayahs;
    this.queueIndex = 0;
    const first = ayahs[0];
    if (first) {
      this.playAyahAudio(first, true);
      return;
    }
    if (this.keepPlaying) {
      this.advancePlay();
    }
  }

  private advancePlay(): void {
    if (!this.keepPlaying) {
      return;
    }
    if (this.leaf() + 1 < this.pages().length) {
      this.goVisual(this.leaf() + 1);
      window.setTimeout(() => this.startPageQueue(this.leafAyahs()), 40);
      return;
    }
    this.keepPlaying = false;
    this.chaining.set(false);
    this.pageQueue = [];
    this.queueIndex = 0;
  }

  startTeacher(): void {
    const ayah = this.currentReaderAyah();
    if (!ayah) {
      return;
    }
    this.haltWord.set(-1);
    this.teacherNote.set('');
    this.stop();
    this.scrollAyah(this.ayahSurah(ayah), ayah.n);
    this.api.verse(this.ayahSurah(ayah), ayah.n).subscribe((view) => this.listen(view));
  }

  currentReaderAyah(): ReaderAyah | undefined {
    return this.leafAyahs().find((item) =>
      item.n === this.currentAyah() && this.ayahSurah(item) === this.currentSurah()
    ) ?? this.pageAyahs().find((item) =>
      item.n === this.currentAyah() && this.ayahSurah(item) === this.currentSurah()
    ) ?? this.leafAyahs()[0] ?? this.pageAyahs()[0];
  }

  currentAyahView(): ReaderAyah | undefined {
    return this.currentReaderAyah();
  }

  stop(): void {
    this.keepPlaying = false;
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
      },
      onPass: () => {
        const next = nextAyah(this.allAyahs(), ayah);
        if (next) {
          this.select(next);
          this.showLeafFor(this.ayahSurah(next), next.n);
          this.scrollAyah(this.ayahSurah(next), next.n);
          this.teacherNote.set('شاباش۔ اگلی آیت پڑھو۔');
          window.setTimeout(() => this.startTeacher(), 1600);
        } else {
          this.teacherNote.set('شاباش۔ مصحف پورا ہو گیا۔');
        }
      },
      onProgress: () => {
        this.scrollAyah(this.ayahSurah(ayah), ayah.n, Math.max(0, this.teacher.currentWord()));
      }
    });
  }

  private packToWidth(force = false): void {
    const ayahs = this.allAyahs();
    const well = this.well()?.nativeElement;
    if (!ayahs.length || !well) {
      return;
    }
    const box = getComputedStyle(well);
    const padX = parseFloat(box.paddingLeft) + parseFloat(box.paddingRight);
    const width = Math.max(80, Math.floor(well.clientWidth - padX - 8));
    if (width < 80) {
      return;
    }
    const host = well.closest('app-mushaf') as HTMLElement | null;
    const vars = getComputedStyle(host ?? well);
    const size = vars.getPropertyValue('--mushaf-size').trim() || '44px';
    const font = `${size} "Al Majeed Quranic"`;
    const fontReady = document.fonts?.check?.(font) ? 1 : 0;
    const key = `full:${width}:${LINES_PER_PAGE}:${ayahs.length}:${size}:${fontReady}:pack-juz`;
    if (!force && key === this.lastPack && this.pages().length) {
      return;
    }
    this.lastPack = key;
    this.pages.set(buildPages(ayahs, width, LINES_PER_PAGE, font));
    if (this.leaf() >= this.pages().length) {
      this.leaf.set(Math.max(0, this.pages().length - 1));
    }
  }

  private ensureCorpus(done: () => void): void {
    if (this.allAyahs().length) {
      done();
      return;
    }
    this.loading.set(true);
    this.api.corpus().subscribe({
      next: (ayahs) => {
        this.allAyahs.set(ayahs);
        this.syncPageView();
        done();
      },
      error: () => {
        this.loading.set(false);
        this.pageView.set(null);
        this.error.set('Cannot reach the Spring Boot API on port 8080.');
      }
    });
  }

  private syncPageView(): void {
    const ayahs = this.allAyahs();
    if (!ayahs.length) {
      this.pageView.set(null);
      return;
    }
    this.pageView.set({
      page: this.pageNumber(),
      juz: this.currentJuz(),
      pageCount: MADINAH_PAGES,
      ayahs
    });
  }

  private leafHasMadinah(page: number): boolean {
    return this.currentLines().some((line) =>
      line.tokens.some((token) =>
        (token.kind === 'word' || token.kind === 'close') && (token.ayah.page || 0) === page
      )
    );
  }

  private showLeafForMadinah(page: number, juz = 0): void {
    const index = leafIndexForPage(this.pages(), page, juz);
    this.leaf.set(index < 0 ? 0 : index);
  }

  private showLeafForJuz(juz: number): void {
    const index = leafIndexForJuz(this.pages(), juz);
    this.leaf.set(index < 0 ? 0 : index);
  }

  private restoreLeafFromRoute(): void {
    const para = Number(this.route.snapshot.queryParamMap.get('para') || 0);
    const page = Number(this.route.snapshot.queryParamMap.get('page') || 0);
    const surah = Number(this.route.snapshot.queryParamMap.get('surah') || 0);
    const ayah = Number(this.route.snapshot.queryParamMap.get('ayah') || 0);
    if (ayah && (surah || this.currentSurah())) {
      this.showLeafFor(surah || this.currentSurah(), ayah);
      return;
    }
    if (para && !page) {
      this.showLeafForJuz(para);
      return;
    }
    if (page) {
      this.showLeafForMadinah(page, para);
      return;
    }
    this.showLeafFor(this.currentSurah(), this.currentAyah());
  }

  private playAyahAudio(ayah: ReaderAyah, chain: boolean): void {
    const gen = ++this.playGen;
    this.stopAudioOnly();
    this.chaining.set(chain);
    this.select(ayah);
    this.showLeafFor(this.ayahSurah(ayah), ayah.n);
    this.api.audio(this.ayahSurah(ayah), ayah.n, this.reciter()).subscribe({
      next: (url) => {
        if (gen !== this.playGen) {
          return;
        }
        const audio = new Audio(url);
        this.audio = audio;
        this.playing.set(true);
        this.activeWord.set(0);
        const words = normalizeMushaf(ayah.ar).split(/\s+/).filter(Boolean);
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
          } else if (this.keepPlaying) {
            this.advancePlay();
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
          this.keepPlaying = false;
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

function measure(text: string, font = FONT): number {
  if (typeof document === 'undefined') {
    return text.length * 11;
  }
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  if (!measureCtx) {
    return text.length * 11;
  }
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

function clampPage(page: number): number {
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  return Math.min(MADINAH_PAGES, Math.floor(page));
}

function normalizeMushaf(text: string): string {
  return text
    .replace(/[\u200B\uFEFF\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069]/g, '')
    .replace(/\u2002/g, ' ')
    .replace(/([\u0615\u06D6-\u06DC\u06DE\uE000-\uF8FF])(?=[\u0621-\u064A\u0671\u067E\u0686\u0688\u0691\u0698\u06A9\u06AF\u06BA\u06BE\u06C1\u06CC\u06D2])/g, '$1 ')
    .replace(/ +/g, ' ')
    .trim();
}

function packLines(ayahs: ReaderAyah[], maxWidth: number, font = FONT): Line[] {
  const lines: Line[] = [];
  let tokens: Token[] = [];
  let used = 0;
  const fontPx = parseFloat(font) || 44;
  const gap = Math.round(fontPx * 0.22);
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
    const next = tokens.length ? used + gap + size : size;
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
      const surah = ayah.surah ?? 0;
      if (surah === 1) {
        const words = normalizeMushaf(ayah.ar).split(/\s+/).filter(Boolean);
        lines.push({
          tokens: [{
            kind: 'close',
            ayah,
            index: Math.max(0, words.length - 1),
            text: words.join(' '),
            letters: ayah.words?.[0]?.letters ?? [],
            ruku: false
          }],
          short: true,
          extra: 0
        });
        continue;
      }
      if (surah !== 9) {
        lines.push({ tokens: [{ kind: 'basmala' }], short: true, extra: 0 });
      }
    }
    const words = normalizeMushaf(ayah.ar).split(/\s+/).filter(Boolean);
    if (!words.length) {
      add({ kind: 'close', ayah, index: 0, text: '', letters: [], ruku: !!ayah.rukuEnds }, MARK_SIZE);
      continue;
    }
    words.forEach((text, index) => {
      const letters = ayah.words?.[index]?.letters ?? [];
      if (index === words.length - 1) {
        add(
          { kind: 'close', ayah, index, text, letters, ruku: !!ayah.rukuEnds },
          Math.min(maxWidth, Math.ceil(measure(text, font)) + MARK_SIZE)
        );
        return;
      }
      add({ kind: 'word', ayah, index, text, letters }, Math.min(maxWidth, Math.ceil(measure(text, font))));
    });
  }
  flush(true);
  return lines;
}

function rukuClose(line: Line | undefined): Extract<Token, { kind: 'close' }> | undefined {
  return line?.tokens.find((token): token is Extract<Token, { kind: 'close' }> =>
    token.kind === 'close' && token.ruku
  );
}

function isRukuLeftover(line: Line, index: number, lines: Line[]): boolean {
  if (!line.short || index <= 0) {
    return false;
  }
  const close = rukuClose(line);
  if (!close) {
    return false;
  }
  const words = line.tokens.filter((token) => token.kind === 'word' || token.kind === 'close');
  if (words.length > 1) {
    return false;
  }
  const prev = lines[index - 1];
  return !!prev?.tokens.some((token) =>
    (token.kind === 'word' || token.kind === 'close')
    && token.ayah.n === close.ayah.n
    && (token.ayah.surah || 0) === (close.ayah.surah || 0)
  );
}

function ayahJuz(ayah: ReaderAyah): number {
  return ayah.juz && ayah.juz > 0 ? ayah.juz : 1;
}

function leafJuz(page: Line[] | undefined): number {
  if (!page) {
    return 0;
  }
  for (const line of page) {
    for (const token of line.tokens) {
      if (token.kind === 'word' || token.kind === 'close') {
        return ayahJuz(token.ayah);
      }
    }
  }
  return 0;
}

function buildPages(ayahs: ReaderAyah[], maxWidth: number, linesPerPage: number, font = FONT): Line[][] {
  const pages: Line[][] = [];
  let i = 0;
  while (i < ayahs.length) {
    const juz = ayahJuz(ayahs[i]);
    let end = i + 1;
    while (end < ayahs.length && ayahJuz(ayahs[end]) === juz) {
      end += 1;
    }
    const packed = packLines(ayahs.slice(i, end), Math.max(120, maxWidth), font);
    for (let k = 0; k < packed.length; k += linesPerPage) {
      pages.push(packed.slice(k, k + linesPerPage));
    }
    i = end;
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

function leafIndexForPage(pages: Line[][], madinahPage: number, juz = 0): number {
  const found = pages.findIndex((page) =>
    page.some((line) => line.tokens.some((token) =>
      (token.kind === 'word' || token.kind === 'close')
      && (token.ayah.page || 0) === madinahPage
      && (!juz || ayahJuz(token.ayah) === juz)
    ))
  );
  return found < 0 ? 0 : found;
}

function leafIndexForJuz(pages: Line[][], juz: number): number {
  const found = pages.findIndex((page) => leafJuz(page) === juz);
  return found < 0 ? 0 : found;
}

function nextAyah(ayahs: ReaderAyah[], current: ReaderAyah): ReaderAyah | undefined {
  const index = ayahs.findIndex((item) =>
    item.n === current.n && (item.surah || 0) === (current.surah || 0)
  );
  return index < 0 ? undefined : ayahs[index + 1];
}
