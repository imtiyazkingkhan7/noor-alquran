import { Injectable, inject, signal } from '@angular/core';
import { QuranApi } from './quran.api';
import { AyahView, ProgressResponse, WordToken } from './models';

interface SpeechRec {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort?: () => void;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechEvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

export type TeacherHalt = {
  spoken: string;
  written: string;
  wordIndex: number;
  heard: string;
};

@Injectable({ providedIn: 'root' })
export class TeacherSession {
  private readonly api = inject(QuranApi);

  readonly listening = signal(false);
  readonly halted = signal(false);
  readonly message = signal('');
  readonly heard = signal('');
  readonly matchedThrough = signal(-1);
  readonly currentWord = signal(0);

  private rec?: SpeechRec;
  private wantListen = false;
  private ayah?: AyahView;
  private startedAt = 0;
  private seq = 0;
  private timer = 0;
  private onHalt?: (halt: TeacherHalt) => void;
  private onPass?: () => void;
  private onProgress?: () => void;

  speak(text: string): void {
    if (!text) {
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-IN';
    utter.rate = 0.92;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  }

  start(
    ayah: AyahView,
    handlers: { onHalt: (halt: TeacherHalt) => void; onPass: () => void; onProgress?: () => void }
  ): void {
    this.stopMic();
    window.speechSynthesis.cancel();
    this.ayah = ayah;
    this.onHalt = handlers.onHalt;
    this.onPass = handlers.onPass;
    this.onProgress = handlers.onProgress;
    this.halted.set(false);
    this.message.set('I am listening. Recite this ayah with Tajweed.');
    this.heard.set('');
    this.matchedThrough.set(-1);
    this.currentWord.set(0);
    this.startedAt = performance.now();
    this.wantListen = true;
    this.listen();
  }

  stop(): void {
    this.wantListen = false;
    window.clearTimeout(this.timer);
    this.seq += 1;
    this.stopMic();
    this.listening.set(false);
  }

  private listen(): void {
    const Ctor = (window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    }).webkitSpeechRecognition
      ?? (window as unknown as { SpeechRecognition?: new () => SpeechRec }).SpeechRecognition;
    if (!Ctor) {
      this.halt({
        spoken: 'Stop. This browser cannot hear you. Open Chrome and allow the microphone.',
        written: 'Speech recognition needs Chrome.',
        wordIndex: 0,
        heard: ''
      });
      return;
    }
    const rec = new Ctor();
    rec.lang = 'ar-SA';
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (event) => this.onSpeech(event);
    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      this.halt({
        spoken: 'Stop. I could not hear clearly. Check the microphone and recite again.',
        written: `Microphone: ${event.error}`,
        wordIndex: 0,
        heard: this.heard()
      });
    };
    rec.onend = () => {
      this.listening.set(false);
      if (this.wantListen && !this.halted()) {
        this.listen();
      }
    };
    this.rec = rec;
    this.listening.set(true);
    rec.start();
  }

  private onSpeech(event: SpeechEvent): void {
    if (!this.ayah || this.halted()) {
      return;
    }
    let text = '';
    let finalText = '';
    for (let i = 0; i < event.results.length; i++) {
      const piece = event.results[i][0]?.transcript ?? '';
      text += `${piece} `;
      if (event.results[i].isFinal) {
        finalText += `${piece} `;
      }
    }
    this.heard.set(text.trim());
    this.queueProgress(text.trim(), !finalText);
  }

  private queueProgress(transcript: string, partial: boolean): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.sendProgress(transcript, partial), partial ? 120 : 20);
  }

  private sendProgress(transcript: string, partial: boolean): void {
    if (!this.ayah || this.halted() || !this.wantListen) {
      return;
    }
    const seq = ++this.seq;
    const seconds = (performance.now() - this.startedAt) / 1000;
    this.api.progress(this.ayah.surah, this.ayah.ayah, transcript, seconds, partial).subscribe({
      next: (res) => {
        if (seq !== this.seq || this.halted()) {
          return;
        }
        this.apply(res);
      },
      error: () => {
        if (seq !== this.seq || this.halted()) {
          return;
        }
        this.applyLocal(transcript, partial);
      }
    });
  }

  private apply(res: ProgressResponse): void {
    this.matchedThrough.set(res.matchedThrough);
    this.currentWord.set(res.currentWordIndex);
    this.message.set(res.teacherMessage);
    this.onProgress?.();
    if (res.shouldStop) {
      this.halt({
        spoken: res.spokenMessage,
        written: res.teacherMessage,
        wordIndex: res.currentWordIndex,
        heard: this.heard()
      });
      return;
    }
    if (res.complete) {
      this.wantListen = false;
      this.stopMic();
      this.speak(res.spokenMessage);
      this.onPass?.();
    }
  }

  private applyLocal(transcript: string, partial: boolean): void {
    if (!this.ayah) {
      return;
    }
    const expected = this.ayah.words.map((word: WordToken) => word.plain).filter(Boolean);
    const heard = tokenize(plain(transcript));
    const check = comparePrefix(expected, heard, partial);
    this.matchedThrough.set(check.matchedThrough);
    this.currentWord.set(Math.max(0, check.index));
    this.onProgress?.();
    if (check.wrong) {
      this.halt({
        spoken: 'Stop. Do not continue. That word is wrong. Listen to the ayah, then recite it again with Tajweed.',
        written: check.detail,
        wordIndex: check.index,
        heard: transcript
      });
      return;
    }
    if (!partial && check.matchedThrough >= expected.length - 1 && expected.length > 0) {
      const seconds = (performance.now() - this.startedAt) / 1000;
      const rushed = this.ayah.rules.length > 0 && expected.length >= 3 && seconds < expected.length * 0.45;
      if (rushed) {
        this.halt({
          spoken: 'Stop. The words were right but you read without Tajweed. Repeat slowly with ghunnah and madd.',
          written: 'Too fast for the Tajweed on this ayah.',
          wordIndex: 0,
          heard: transcript
        });
        return;
      }
      this.wantListen = false;
      this.stopMic();
      this.message.set('Good. Continue to the next ayah.');
      this.speak('Good. Continue to the next ayah. Keep Tajweed.');
      this.onPass?.();
    }
  }

  private halt(halt: TeacherHalt): void {
    this.wantListen = false;
    this.halted.set(true);
    this.message.set(halt.written);
    this.stopMic();
    this.speak(halt.spoken);
    this.onHalt?.(halt);
  }

  private stopMic(): void {
    try {
      this.rec?.abort?.();
      this.rec?.stop();
    } catch {
      /* already closed */
    }
    this.rec = undefined;
    this.listening.set(false);
  }
}

function plain(text: string): string {
  return text
    .replace('\uFEFF', ' ')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return text.split(' ').filter(Boolean);
}

function similar(expected: string, heard: string): boolean {
  if (expected === heard) {
    return true;
  }
  if (expected.startsWith(heard) || heard.startsWith(expected)) {
    return Math.min(expected.length, heard.length) >= Math.min(2, expected.length);
  }
  return levenshtein(expected, heard) <= Math.max(1, Math.floor(expected.length / 3));
}

function comparePrefix(
  expected: string[],
  heard: string[],
  lastIsPartial: boolean
): { wrong: boolean; index: number; matchedThrough: number; detail: string } {
  if (heard.length === 0) {
    return { wrong: false, index: 0, matchedThrough: -1, detail: '' };
  }
  const last = heard.length - 1;
  for (let i = 0; i < heard.length; i++) {
    if (i >= expected.length) {
      return {
        wrong: true,
        index: expected.length - 1,
        matchedThrough: expected.length - 1,
        detail: 'Stop. Extra words that are not in this ayah.'
      };
    }
    const partial = lastIsPartial && i === last;
    if (partial && expected[i].startsWith(heard[i]) && heard[i].length < expected[i].length) {
      return { wrong: false, index: i, matchedThrough: i - 1, detail: '' };
    }
    if (!similar(expected[i], heard[i])) {
      return {
        wrong: true,
        index: i,
        matchedThrough: i - 1,
        detail: `Stop. Word ${i + 1} is wrong.`
      };
    }
  }
  return { wrong: false, index: last, matchedThrough: last, detail: '' };
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  const cur = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) {
      prev[j] = cur[j];
    }
  }
  return prev[b.length];
}
