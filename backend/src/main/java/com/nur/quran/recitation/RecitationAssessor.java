package com.nur.quran.recitation;

import com.nur.quran.api.dto.QuranDtos.AssessResponse;
import com.nur.quran.api.dto.QuranDtos.AyahView;
import com.nur.quran.api.dto.QuranDtos.ProgressResponse;
import com.nur.quran.api.dto.QuranDtos.ProgressWord;
import com.nur.quran.api.dto.QuranDtos.WordFeedback;
import com.nur.quran.api.dto.QuranDtos.WordToken;
import com.nur.quran.tajweed.TajweedEngine;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class RecitationAssessor {

    public AssessResponse assess(AyahView ayah, String transcript, Double durationSeconds) {
        if (transcript == null || transcript.isBlank()) {
            String message = MaulanaLines.NO_HEAR;
            return new AssessResponse(0, List.of(), List.of(), message, false, true, message, 0);
        }

        List<String> expected = ayah.words().stream().map(WordToken::plain).filter(word -> !word.isBlank()).toList();
        List<String> heard = tokenize(TajweedEngine.plain(transcript));
        List<WordFeedback> alignment = align(expected, heard);
        int matches = (int) alignment.stream().filter(word -> "match".equals(word.status())).count();
        int accuracy = expected.isEmpty() ? 0 : (int) Math.round(100.0 * matches / expected.size());

        long missing = alignment.stream().filter(word -> "missing".equals(word.status())).count();
        long mismatch = alignment.stream().filter(word -> "mismatch".equals(word.status())).count();
        boolean rushed = durationSeconds != null && durationSeconds > 0 && expected.size() >= 3
                && durationSeconds < expected.size() * 0.45;
        boolean shouldStop = accuracy < 90 || missing > 0 || mismatch > 0 || rushed;

        int stopAt = alignment.stream()
                .filter(word -> !"match".equals(word.status()) && word.index() >= 0)
                .mapToInt(WordFeedback::index)
                .min()
                .orElse(0);

        String line;
        if (mismatch > 0 || missing > 0) {
            line = MaulanaLines.wrongWord(ayah.words() != null && stopAt < ayah.words().size()
                    ? ayah.words().get(stopAt).text() : "");
        } else if (rushed) {
            line = MaulanaLines.TOO_FAST;
        } else if (accuracy < 90) {
            line = MaulanaLines.FINISH;
        } else {
            line = MaulanaLines.GOOD;
        }

        return new AssessResponse(
                accuracy,
                alignment,
                List.of(),
                line,
                true,
                shouldStop,
                line,
                stopAt
        );
    }

    public ProgressResponse progress(AyahView ayah, String transcript, boolean partial, Double durationSeconds) {
        List<String> expected = ayah.words().stream().map(WordToken::plain).filter(word -> !word.isBlank()).toList();
        List<ProgressWord> words = new ArrayList<>();
        for (int i = 0; i < expected.size(); i++) {
            words.add(new ProgressWord(i, "pending", expected.get(i), ""));
        }
        if (expected.isEmpty()) {
            return new ProgressResponse(-1, 0, words, false, true, "", MaulanaLines.EMPTY);
        }
        if (transcript == null || transcript.isBlank()) {
            setStatus(words, 0, "current", "");
            return new ProgressResponse(-1, 0, words, false, false, "", MaulanaLines.LISTENING);
        }

        List<String> heard = tokenize(TajweedEngine.plain(transcript));
        if (heard.isEmpty()) {
            setStatus(words, 0, "current", "");
            return new ProgressResponse(-1, 0, words, false, false, "", MaulanaLines.LISTENING);
        }

        int last = heard.size() - 1;
        for (int i = 0; i < heard.size(); i++) {
            if (i >= expected.size()) {
                paint(words, expected.size() - 1, expected.size() - 1, "wrong", heard.get(i));
                String extra = MaulanaLines.EXTRA;
                return new ProgressResponse(
                        expected.size() - 1,
                        expected.size() - 1,
                        words,
                        true,
                        false,
                        extra,
                        extra
                );
            }
            boolean lastPartial = partial && i == last;
            if (lastPartial
                    && heard.get(i).length() < expected.get(i).length()
                    && expected.get(i).startsWith(heard.get(i))) {
                paint(words, i - 1, i, "current", heard.get(i));
                return new ProgressResponse(i - 1, i, words, false, false, "", MaulanaLines.KEEP_GOING);
            }
            if (!similar(expected.get(i), heard.get(i))) {
                paint(words, i - 1, i, "wrong", heard.get(i));
                String line = wrongWordLine(ayah, i);
                return new ProgressResponse(
                        i - 1,
                        i,
                        words,
                        true,
                        false,
                        line,
                        line
                );
            }
            paint(words, i, i + 1, "current", heard.get(i));
        }

        int matchedThrough = last;
        boolean complete = !partial && matchedThrough >= expected.size() - 1;
        boolean rushed = complete && durationSeconds != null && durationSeconds > 0 && expected.size() >= 3
                && durationSeconds < expected.size() * 0.45;
        if (rushed) {
            paint(words, matchedThrough, 0, "wrong", heard.get(last));
            String line = MaulanaLines.TOO_FAST;
            return new ProgressResponse(
                    matchedThrough,
                    0,
                    words,
                    true,
                    false,
                    line,
                    line
            );
        }
        int current = Math.min(matchedThrough + 1, expected.size() - 1);
        if (complete) {
            paint(words, matchedThrough, -1, "current", heard.get(last));
            return new ProgressResponse(
                    matchedThrough,
                    expected.size() - 1,
                    words,
                    false,
                    true,
                    MaulanaLines.GOOD,
                    MaulanaLines.GOOD
            );
        }
        paint(words, matchedThrough, current, "current", heard.get(last));
        return new ProgressResponse(matchedThrough, current, words, false, false, "", MaulanaLines.KEEP_GOING);
    }

    private String wrongWordLine(AyahView ayah, int index) {
        String arabic = "";
        if (ayah.words() != null && index >= 0 && index < ayah.words().size()) {
            arabic = ayah.words().get(index).text();
        }
        return MaulanaLines.wrongWord(arabic);
    }

    private void paint(List<ProgressWord> words, int matchedThrough, int current, String currentStatus, String heard) {
        for (int i = 0; i < words.size(); i++) {
            ProgressWord item = words.get(i);
            String status;
            String heardWord = "";
            if (i <= matchedThrough) {
                status = "done";
                heardWord = item.expected();
            } else if (i == current) {
                status = currentStatus;
                heardWord = heard;
            } else {
                status = "pending";
            }
            words.set(i, new ProgressWord(i, status, item.expected(), heardWord));
        }
    }

    private void setStatus(List<ProgressWord> words, int index, String status, String heard) {
        if (index < 0 || index >= words.size()) {
            return;
        }
        ProgressWord item = words.get(index);
        words.set(index, new ProgressWord(index, status, item.expected(), heard));
    }

    private List<String> tokenize(String plain) {
        if (plain.isBlank()) {
            return List.of();
        }
        String[] parts = plain.split(" ");
        List<String> words = new ArrayList<>();
        for (String part : parts) {
            if (!part.isBlank()) {
                words.add(part);
            }
        }
        return words;
    }

    private List<WordFeedback> align(List<String> expected, List<String> heard) {
        int n = expected.size();
        int m = heard.size();
        int[][] dp = new int[n + 1][m + 1];
        for (int i = 0; i <= n; i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= m; j++) {
            dp[0][j] = j;
        }
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                int cost = similar(expected.get(i - 1), heard.get(j - 1)) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
            }
        }
        List<WordFeedback> reversed = new ArrayList<>();
        int i = n;
        int j = m;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + (similar(expected.get(i - 1), heard.get(j - 1)) ? 0 : 1)) {
                boolean match = similar(expected.get(i - 1), heard.get(j - 1));
                reversed.add(new WordFeedback(i - 1, expected.get(i - 1), heard.get(j - 1), match ? "match" : "mismatch"));
                i--;
                j--;
            } else if (i > 0 && dp[i][j] == dp[i - 1][j] + 1) {
                reversed.add(new WordFeedback(i - 1, expected.get(i - 1), "", "missing"));
                i--;
            } else {
                reversed.add(new WordFeedback(-1, "", heard.get(j - 1), "extra"));
                j--;
            }
        }
        List<WordFeedback> result = new ArrayList<>();
        for (int k = reversed.size() - 1; k >= 0; k--) {
            result.add(reversed.get(k));
        }
        return result;
    }

    private boolean similar(String expected, String heard) {
        if (expected.equals(heard)) {
            return true;
        }
        String a = expected.toLowerCase(Locale.ROOT);
        String b = heard.toLowerCase(Locale.ROOT);
        if (a.equals(b)) {
            return true;
        }
        return levenshtein(a, b) <= Math.max(1, a.length() / 4);
    }

    private int levenshtein(String a, String b) {
        int[] prev = new int[b.length() + 1];
        int[] cur = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            prev[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            cur[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                cur[j] = Math.min(Math.min(prev[j] + 1, cur[j - 1] + 1), prev[j - 1] + cost);
            }
            int[] swap = prev;
            prev = cur;
            cur = swap;
        }
        return prev[b.length()];
    }
}
