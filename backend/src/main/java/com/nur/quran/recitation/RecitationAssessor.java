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
import java.util.Map;

@Service
public class RecitationAssessor {

    private static final Map<String, String> RULE_TIPS = Map.ofEntries(
            Map.entry("ghunnah", "Hold ghunnah for two counts on noon/meem with shaddah."),
            Map.entry("ikhfa", "Conceal the noon sound and hold a light ghunnah — do not make a clear ن."),
            Map.entry("idgham", "Merge the noon into the next letter with ghunnah (ي ن م و)."),
            Map.entry("idgham-no-ghunnah", "Merge fully into ل or ر with no ghunnah."),
            Map.entry("iqlab", "Turn noon sakinah/tanween into a meem sound before ب, with ghunnah."),
            Map.entry("izhar", "Pronounce noon clearly before throat letters — no ghunnah."),
            Map.entry("qalqalah", "Echo the qalqalah letter (ق ط ب ج د) when it has sukun."),
            Map.entry("madd", "Stretch the madd letter — natural madd is two counts, longer if marked."),
            Map.entry("ikhfa-shafawi", "Conceal meem sakinah before ب with ghunnah, lips lightly closed."),
            Map.entry("idgham-shafawi", "Merge meem sakinah into the following meem with ghunnah."),
            Map.entry("izhar-shafawi", "Pronounce meem sakinah clearly, lips closed, no extra nasalization.")
    );

    public AssessResponse assess(AyahView ayah, String transcript, Double durationSeconds) {
        List<String> tips = ayah.rules().stream()
                .map(rule -> RULE_TIPS.getOrDefault(rule, "Review the highlighted Tajweed on this ayah."))
                .toList();

        if (transcript == null || transcript.isBlank()) {
            String message = "Stop. I did not hear the ayah. Recite clearly into the microphone.";
            return new AssessResponse(0, List.of(), tips, message, false, true, message, 0);
        }

        List<String> expected = ayah.words().stream().map(WordToken::plain).filter(word -> !word.isBlank()).toList();
        List<String> heard = tokenize(TajweedEngine.plain(transcript));
        List<WordFeedback> alignment = align(expected, heard);
        int matches = (int) alignment.stream().filter(word -> "match".equals(word.status())).count();
        int accuracy = expected.isEmpty() ? 0 : (int) Math.round(100.0 * matches / expected.size());

        long missing = alignment.stream().filter(word -> "missing".equals(word.status())).count();
        long mismatch = alignment.stream().filter(word -> "mismatch".equals(word.status())).count();
        boolean rushed = durationSeconds != null && durationSeconds > 0 && expected.size() >= 3
                && durationSeconds < expected.size() * 0.45
                && !ayah.rules().isEmpty();
        boolean shouldStop = accuracy < 90 || missing > 0 || mismatch > 0 || rushed;

        int stopAt = alignment.stream()
                .filter(word -> !"match".equals(word.status()) && word.index() >= 0)
                .mapToInt(WordFeedback::index)
                .min()
                .orElse(0);

        String spoken;
        StringBuilder teacher = new StringBuilder();
        if (mismatch > 0 || missing > 0) {
            spoken = "Stop. Do not continue. That recitation is wrong. Listen to the ayah, then read it again with Tajweed.";
            teacher.append("Stop. A word is wrong or missing. ");
        } else if (rushed) {
            spoken = "Stop. You are reading too fast, without Tajweed. Slow down. Hold ghunnah and stretch madd.";
            teacher.append("Stop. This was rushed — Tajweed needs space. ");
        } else if (accuracy < 90) {
            spoken = "Stop. The ayah is not complete. Repeat from the highlighted word.";
            teacher.append("Stop. The ayah is incomplete. ");
        } else {
            spoken = "Good. The words are correct. Keep the same pace with Tajweed, then continue.";
            teacher.append("Good recitation of the words. ");
        }
        if (missing > 0) {
            teacher.append("You skipped ").append(missing).append(missing == 1 ? " word. " : " words. ");
        }
        if (mismatch > 0) {
            teacher.append("Check the highlighted mismatched words. ");
        }
        if (!tips.isEmpty()) {
            teacher.append("Tajweed: ").append(String.join(" ", tips));
        }

        return new AssessResponse(
                accuracy,
                alignment,
                tips,
                teacher.toString().trim(),
                true,
                shouldStop,
                spoken,
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
            return new ProgressResponse(-1, 0, words, false, true, "", "This ayah has no words to track.");
        }
        if (transcript == null || transcript.isBlank()) {
            setStatus(words, 0, "current", "");
            return new ProgressResponse(-1, 0, words, false, false, "", "I am listening.");
        }

        List<String> heard = tokenize(TajweedEngine.plain(transcript));
        if (heard.isEmpty()) {
            setStatus(words, 0, "current", "");
            return new ProgressResponse(-1, 0, words, false, false, "", "I am listening.");
        }

        int last = heard.size() - 1;
        for (int i = 0; i < heard.size(); i++) {
            if (i >= expected.size()) {
                paint(words, expected.size() - 1, expected.size() - 1, "wrong", heard.get(i));
                return new ProgressResponse(
                        expected.size() - 1,
                        expected.size() - 1,
                        words,
                        true,
                        false,
                        "Stop. Do not continue. Extra words that are not in this ayah.",
                        "Stop. Extra words that are not in this ayah."
                );
            }
            boolean lastPartial = partial && i == last;
            if (lastPartial
                    && heard.get(i).length() < expected.get(i).length()
                    && expected.get(i).startsWith(heard.get(i))) {
                paint(words, i - 1, i, "current", heard.get(i));
                return new ProgressResponse(i - 1, i, words, false, false, "", "Keep going.");
            }
            if (!similar(expected.get(i), heard.get(i))) {
                paint(words, i - 1, i, "wrong", heard.get(i));
                return new ProgressResponse(
                        i - 1,
                        i,
                        words,
                        true,
                        false,
                        "Stop. Do not continue. That word is wrong. Listen, then recite again with Tajweed.",
                        "Stop. Word " + (i + 1) + " is wrong."
                );
            }
            paint(words, i, i + 1, "current", heard.get(i));
        }

        int matchedThrough = last;
        boolean complete = !partial && matchedThrough >= expected.size() - 1;
        boolean rushed = complete && durationSeconds != null && durationSeconds > 0 && expected.size() >= 3
                && durationSeconds < expected.size() * 0.45
                && !ayah.rules().isEmpty();
        if (rushed) {
            paint(words, matchedThrough, 0, "wrong", heard.get(last));
            return new ProgressResponse(
                    matchedThrough,
                    0,
                    words,
                    true,
                    false,
                    "Stop. The words were right but you read without Tajweed. Repeat slowly with ghunnah and madd.",
                    "Too fast for the Tajweed on this ayah."
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
                    "Good. Continue to the next ayah. Keep Tajweed.",
                    "Good. Continue to the next ayah."
            );
        }
        paint(words, matchedThrough, current, "current", heard.get(last));
        return new ProgressResponse(matchedThrough, current, words, false, false, "", "Keep going.");
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
