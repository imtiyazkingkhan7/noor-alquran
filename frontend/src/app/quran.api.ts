import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  AssessResponse,
  Health,
  ProgressResponse,
  JuzView,
  LessonView,
  PageView,
  ReaderPara,
  ReaderSurah,
  ReciterView,
  SearchHit,
  AyahView
} from './models';

@Injectable({ providedIn: 'root' })
export class QuranApi {
  private readonly http = inject(HttpClient);

  health(): Observable<Health> {
    return this.http.get<Health>('/api/health');
  }

  surahs(): Observable<ReaderSurah[]> {
    return this.http.get<ReaderSurah[]>('/api/surahs');
  }

  surah(number: number): Observable<ReaderSurah> {
    return this.http.get<ReaderSurah>(`/api/surahs/${number}`);
  }

  verse(surah: number, ayah: number): Observable<AyahView> {
    return this.http.get<AyahView>(`/api/surahs/${surah}/ayahs/${ayah}`);
  }

  audio(surah: number, ayah: number, reciter?: string): Observable<string> {
    const params: Record<string, string | number> = { surah, ayah };
    if (reciter) {
      params['reciter'] = reciter;
    }
    return this.http.get<{ url: string }>('/api/audio', { params }).pipe(map((row) => row.url));
  }

  reciters(): Observable<ReciterView[]> {
    return this.http.get<ReciterView[]>('/api/reciters');
  }

  page(page: number): Observable<PageView> {
    return this.http.get<PageView>(`/api/pages/${page}`);
  }

  juz(): Observable<JuzView[]> {
    return this.http.get<JuzView[]>('/api/juz');
  }

  para(number: number): Observable<ReaderPara> {
    return this.http.get<ReaderPara>(`/api/juz/${number}`);
  }

  search(q: string): Observable<SearchHit[]> {
    return this.http.get<SearchHit[]>('/api/search', { params: { q } });
  }

  lessons(): Observable<LessonView[]> {
    return this.http.get<LessonView[]>('/api/lessons');
  }

  assess(surah: number, ayah: number, transcript: string, durationSeconds?: number): Observable<AssessResponse> {
    return this.http.post<AssessResponse>('/api/recitation/assess', {
      surah,
      ayah,
      transcript,
      durationSeconds
    });
  }

  progress(
    surah: number,
    ayah: number,
    transcript: string,
    durationSeconds: number,
    partial: boolean
  ): Observable<ProgressResponse> {
    return this.http.post<ProgressResponse>('/api/recitation/progress', {
      surah,
      ayah,
      transcript,
      durationSeconds,
      partial
    });
  }
}
