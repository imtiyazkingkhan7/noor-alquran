package com.nur.quran.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

public final class QuranDtos {
    private QuranDtos() {
    }

    public record ReciterView(String id, String name, String style) {
    }

    public record SurahSummary(
            int number,
            String name,
            String englishName,
            String englishNameTranslation,
            String revelationType,
            int ayahCount,
            int rukuCount,
            int startPage
    ) {
    }

    public record LetterToken(String glyph, String rule, String label) {
    }

    public record WordToken(int index, String text, String plain, List<LetterToken> letters) {
    }

    public record AyahView(
            int surah,
            int ayah,
            int globalNumber,
            int page,
            int juz,
            int ruku,
            boolean rukuEnds,
            String text,
            String translation,
            String audioUrl,
            List<WordToken> words,
            List<String> rules
    ) {
    }

    public record SurahDetail(SurahSummary surah, List<AyahView> ayahs) {
    }

    public record PageItem(SurahSummary surah, AyahView ayah, boolean surahStarts) {
    }

    public record PageView(int page, int juz, int pageCount, List<PageItem> items) {
    }

    public record JuzView(int number, int startSurah, int startAyah, int startPage, String englishName, String arabicName) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record JuzAyah(
            int surah,
            String surahEn,
            String surahAr,
            int n,
            String ar,
            String en,
            boolean rukuEnds,
            boolean surahStarts,
            List<WordToken> words
    ) {
        public JuzAyah {
            words = words == null ? List.of() : words;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record JuzReader(int num, String en, String ar, List<JuzAyah> ayahs) {
    }

    public record SearchHit(int surah, int ayah, int page, String englishName, String text, String translation) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReaderAyah(int n, String ar, String en, boolean rukuEnds) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReaderSurah(int num, String en, String ar, List<ReaderAyah> ayahs) {
    }

    public record LessonView(
            String id,
            String title,
            String rule,
            String summary,
            String explanation,
            List<String> steps,
            List<ExampleRef> examples
    ) {
    }

    public record ExampleRef(int surah, int ayah, String note) {
    }

    public record AssessRequest(
            int surah,
            int ayah,
            String transcript,
            Double durationSeconds
    ) {
    }

    public record ProgressRequest(
            int surah,
            int ayah,
            String transcript,
            Double durationSeconds,
            Boolean partial
    ) {
    }

    public record WordFeedback(int index, String expected, String heard, String status) {
    }

    public record AssessResponse(
            int accuracyPercent,
            List<WordFeedback> words,
            List<String> tajweedTips,
            String teacherMessage,
            boolean transcriptReceived,
            boolean shouldStop,
            String spokenMessage,
            int stopWordIndex
    ) {
    }

    public record ProgressWord(int index, String status, String expected, String heard) {
    }

    public record ProgressResponse(
            int matchedThrough,
            int currentWordIndex,
            List<ProgressWord> words,
            boolean shouldStop,
            boolean complete,
            String spokenMessage,
            String teacherMessage
    ) {
    }
}
