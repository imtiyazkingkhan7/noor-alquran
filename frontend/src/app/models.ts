export interface ReaderAyah {
  n: number;
  ar: string;
  en: string;
  rukuEnds?: boolean;
  surah?: number;
  surahEn?: string;
  surahAr?: string;
  surahStarts?: boolean;
}

export interface ReaderSurah {
  num: number;
  en: string;
  ar: string;
  ayahs: ReaderAyah[];
}

export type ReaderPara = ReaderSurah;

export interface SurahSummary {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  ayahCount: number;
  rukuCount?: number;
  startPage?: number;
}

export interface LetterToken {
  glyph: string;
  rule: string;
  label: string;
}

export interface WordToken {
  index: number;
  text: string;
  plain: string;
  letters: LetterToken[];
}

export interface AyahView {
  surah: number;
  ayah: number;
  globalNumber: number;
  page?: number;
  juz?: number;
  ruku?: number;
  rukuEnds?: boolean;
  text: string;
  translation: string;
  audioUrl: string;
  words: WordToken[];
  rules: string[];
}

export interface SurahDetail {
  surah: SurahSummary;
  ayahs: AyahView[];
}

export interface ReciterView {
  id: string;
  name: string;
  style: string;
}

export interface LessonView {
  id: string;
  title: string;
  rule: string;
  summary: string;
  explanation: string;
  steps: string[];
  examples: { surah: number; ayah: number; note: string }[];
}

export interface WordFeedback {
  index: number;
  expected: string;
  heard: string;
  status: 'match' | 'missing' | 'mismatch' | 'extra';
}

export interface AssessResponse {
  accuracyPercent: number;
  words: WordFeedback[];
  tajweedTips: string[];
  teacherMessage: string;
  transcriptReceived: boolean;
  shouldStop?: boolean;
  spokenMessage?: string;
  stopWordIndex?: number;
}

export interface ProgressWord {
  index: number;
  status: 'done' | 'current' | 'pending' | 'wrong';
  expected: string;
  heard: string;
}

export interface ProgressResponse {
  matchedThrough: number;
  currentWordIndex: number;
  words: ProgressWord[];
  shouldStop: boolean;
  complete: boolean;
  spokenMessage: string;
  teacherMessage: string;
}

export interface PageItem {
  surah: SurahSummary;
  ayah: AyahView;
  surahStarts: boolean;
}

export interface PageView {
  page: number;
  juz: number;
  pageCount: number;
  items: PageItem[];
}

export interface JuzView {
  number: number;
  startSurah: number;
  startAyah: number;
  startPage: number;
  englishName: string;
  arabicName?: string;
}

export interface SearchHit {
  surah: number;
  ayah: number;
  page: number;
  englishName: string;
  text: string;
  translation: string;
}

export interface Health {
  status: string;
  fullCorpus: boolean;
  pageCount?: number;
}

export const TAJWEED_LEGEND: { id: string; label: string }[] = [
  { id: 'ghunnah', label: 'Ghunnah' },
  { id: 'ikhfa', label: 'Ikhfa' },
  { id: 'idgham', label: 'Idgham + ghunnah' },
  { id: 'idgham-no-ghunnah', label: 'Idgham' },
  { id: 'iqlab', label: 'Iqlab' },
  { id: 'izhar', label: 'Izhar' },
  { id: 'qalqalah', label: 'Qalqalah' },
  { id: 'madd', label: 'Madd' },
  { id: 'ikhfa-shafawi', label: 'Ikhfa shafawi' },
  { id: 'idgham-shafawi', label: 'Idgham shafawi' },
  { id: 'izhar-shafawi', label: 'Izhar shafawi' }
];
