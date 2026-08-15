import { Injectable, signal } from '@angular/core';

export type Bookmark = { surah: number; ayah: number; page: number; title: string };
export type Progress = { page: number; surah: number; ayah: number };

@Injectable({ providedIn: 'root' })
export class ReadingStore {
  readonly progress = signal<Progress>(this.readProgress());
  readonly bookmarks = signal<Bookmark[]>(this.readBookmarks());

  mark(progress: Progress): void {
    this.progress.set(progress);
    localStorage.setItem('nur-progress', JSON.stringify(progress));
  }

  toggleBookmark(item: Bookmark): void {
    const exists = this.bookmarks().some((b) => b.surah === item.surah && b.ayah === item.ayah);
    const next = exists
      ? this.bookmarks().filter((b) => !(b.surah === item.surah && b.ayah === item.ayah))
      : [item, ...this.bookmarks()].slice(0, 40);
    this.bookmarks.set(next);
    localStorage.setItem('nur-bookmarks', JSON.stringify(next));
  }

  isBookmarked(surah: number, ayah: number): boolean {
    return this.bookmarks().some((b) => b.surah === surah && b.ayah === ayah);
  }

  private readProgress(): Progress {
    try {
      return JSON.parse(localStorage.getItem('nur-progress') || '{"page":1,"surah":1,"ayah":1}') as Progress;
    } catch {
      return { page: 1, surah: 1, ayah: 1 };
    }
  }

  private readBookmarks(): Bookmark[] {
    try {
      return JSON.parse(localStorage.getItem('nur-bookmarks') || '[]') as Bookmark[];
    } catch {
      return [];
    }
  }
}
