package com.nur.quran.tajweed;

import com.nur.quran.api.dto.QuranDtos.LetterToken;
import com.nur.quran.api.dto.QuranDtos.WordToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Rule-based Tajweed tagger for Uthmani text. Tags the triggering letter
 * (noon sakinah / tanween / meem sakinah / qalqalah / madd / ghunnah).
 */
@Component
public class TajweedEngine {

    private static final String QALQALAH = "قطبجد";
    private static final String IZHAR = "ءأؤإئآٱهعحغخ";
    private static final String IDGHAM_GHUNNAH = "ينمو";
    private static final String IDGHAM_NO_GHUNNAH = "لر";
    private static final String IQLAB = "ب";
    private static final String IKHFA = "تثجدذزسشصضطظفقك";
    private static final String MADD_LETTERS = "اوىىويىوٱٰ";

    private static final int SUKUN = 0x0652;
    private static final int SHADDA = 0x0651;
    private static final int TANWEEN_FATHA = 0x064B;
    private static final int TANWEEN_DAMMA = 0x064C;
    private static final int TANWEEN_KASRA = 0x064D;
    private static final int MADDAH = 0x0653;
    private static final int SMALL_HIGH_MADDA = 0x06E4;

    public List<WordToken> tag(String ayahText) {
        List<Cluster> clusters = tokenize(ayahText);
        List<WordToken> words = new ArrayList<>();
        List<Cluster> currentWord = new ArrayList<>();
        int wordIndex = 0;

        for (int i = 0; i <= clusters.size(); i++) {
            Cluster cluster = i < clusters.size() ? clusters.get(i) : null;
            if (cluster == null || cluster.whitespace) {
                if (!currentWord.isEmpty()) {
                    words.add(toWord(wordIndex++, currentWord, clusters));
                    currentWord = new ArrayList<>();
                }
            } else {
                currentWord.add(cluster);
            }
        }
        return words;
    }

    public List<String> rulesIn(List<WordToken> words) {
        Set<String> rules = new LinkedHashSet<>();
        for (WordToken word : words) {
            for (LetterToken letter : word.letters()) {
                if (letter.rule() != null && !"none".equals(letter.rule())) {
                    rules.add(letter.rule());
                }
            }
        }
        return List.copyOf(rules);
    }

    public static String plain(String text) {
        if (text == null) {
            return "";
        }
        String stripped = text.replace('\uFEFF', ' ')
                .replaceAll("[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640\\u08F0-\\u08FF]", "")
                .replace('آ', 'ا')
                .replace('أ', 'ا')
                .replace('إ', 'ا')
                .replace('ٱ', 'ا')
                .replace('ى', 'ي')
                .replace('ة', 'ه')
                .replaceAll("\\s+", " ")
                .trim();
        return stripped;
    }

    public static final String BASMALA_PLAIN = "بسم الله الرحمن الرحيم";

    public static boolean isBasmala(String text) {
        String p = plain(text);
        return p.equals(BASMALA_PLAIN) || p.equals("بسم الله الرحمن الرحيم");
    }

    public static String stripLeadingBasmala(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String plainAll = plain(text);
        if (!plainAll.equals(BASMALA_PLAIN) && !plainAll.startsWith(BASMALA_PLAIN + " ")) {
            return text;
        }
        String[] parts = text.trim().split("\\s+");
        StringBuilder acc = new StringBuilder();
        int used = 0;
        for (int i = 0; i < parts.length; i++) {
            if (acc.length() > 0) {
                acc.append(' ');
            }
            acc.append(parts[i]);
            used = i + 1;
            String p = plain(acc.toString());
            if (p.equals(BASMALA_PLAIN)) {
                break;
            }
            if (!BASMALA_PLAIN.startsWith(p)) {
                return text;
            }
        }
        if (used >= parts.length) {
            return "";
        }
        return String.join(" ", java.util.Arrays.copyOfRange(parts, used, parts.length)).trim();
    }

    private WordToken toWord(int index, List<Cluster> wordClusters, List<Cluster> all) {
        StringBuilder raw = new StringBuilder();
        List<LetterToken> letters = new ArrayList<>();
        for (Cluster cluster : wordClusters) {
            raw.append(cluster.glyph);
            Rule rule = classify(cluster, all);
            letters.add(new LetterToken(cluster.glyph, rule.id, rule.label));
        }
        String text = raw.toString();
        return new WordToken(index, text, plain(text), letters);
    }

    private Rule classify(Cluster cluster, List<Cluster> all) {
        if (!cluster.isLetter) {
            return Rule.NONE;
        }
        char letter = cluster.baseLetter;
        boolean noonSakinah = letter == 'ن' && cluster.hasSukun;
        boolean tanween = cluster.hasTanween;
        boolean meemSakinah = letter == 'م' && cluster.hasSukun;

        if ((letter == 'ن' || letter == 'م') && cluster.hasShadda) {
            return Rule.GHUNNAH;
        }
        if (QALQALAH.indexOf(letter) >= 0 && cluster.hasSukun) {
            return Rule.QALQALAH;
        }
        if (cluster.hasMaddah || (isMaddLetter(letter) && cluster.hasSukun)) {
            return Rule.MADD;
        }

        if (noonSakinah || tanween) {
            Character next = nextLetter(cluster.index, all);
            if (next == null) {
                return noonSakinah ? Rule.NONE : Rule.GHUNNAH;
            }
            if (IZHAR.indexOf(next) >= 0) {
                return Rule.IZHAR;
            }
            if (IDGHAM_GHUNNAH.indexOf(next) >= 0) {
                return Rule.IDGHAM;
            }
            if (IDGHAM_NO_GHUNNAH.indexOf(next) >= 0) {
                return Rule.IDGHAM_NO_GHUNNAH;
            }
            if (IQLAB.indexOf(next) >= 0) {
                return Rule.IQLAB;
            }
            if (IKHFA.indexOf(next) >= 0) {
                return Rule.IKHFA;
            }
        }

        if (meemSakinah) {
            Character next = nextLetter(cluster.index, all);
            if (next == null) {
                return Rule.IZHAR_SHAFAWI;
            }
            if (next == 'ب') {
                return Rule.IKHFA_SHAFAWI;
            }
            if (next == 'م') {
                return Rule.IDGHAM_SHAFAWI;
            }
            return Rule.IZHAR_SHAFAWI;
        }

        return Rule.NONE;
    }

    private Character nextLetter(int fromIndex, List<Cluster> all) {
        for (int i = fromIndex + 1; i < all.size(); i++) {
            Cluster cluster = all.get(i);
            if (cluster.whitespace) {
                continue;
            }
            if (cluster.isLetter) {
                return cluster.baseLetter;
            }
        }
        return null;
    }

    private boolean isMaddLetter(char letter) {
        return MADD_LETTERS.indexOf(letter) >= 0 || letter == 'ا' || letter == 'و' || letter == 'ي' || letter == 'ى';
    }

    private List<Cluster> tokenize(String text) {
        List<Cluster> clusters = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return clusters;
        }
        String cleaned = text.replace('\uFEFF', ' ');
        int i = 0;
        int clusterIndex = 0;
        while (i < cleaned.length()) {
            int cp = cleaned.codePointAt(i);
            int size = Character.charCount(cp);
            if (Character.isWhitespace(cp)) {
                clusters.add(Cluster.space(clusterIndex++));
                i += size;
                continue;
            }
            StringBuilder glyph = new StringBuilder();
            glyph.appendCodePoint(cp);
            boolean letter = isArabicLetter(cp);
            char base = letter ? (char) cp : 0;
            i += size;
            boolean sukun = false;
            boolean shadda = false;
            boolean tanween = false;
            boolean maddah = false;
            while (i < cleaned.length()) {
                int mark = cleaned.codePointAt(i);
                if (!isMark(mark)) {
                    break;
                }
                glyph.appendCodePoint(mark);
                if (mark == SUKUN) {
                    sukun = true;
                }
                if (mark == SHADDA) {
                    shadda = true;
                }
                if (mark == TANWEEN_FATHA || mark == TANWEEN_DAMMA || mark == TANWEEN_KASRA) {
                    tanween = true;
                }
                if (mark == MADDAH || mark == SMALL_HIGH_MADDA) {
                    maddah = true;
                }
                i += Character.charCount(mark);
            }
            clusters.add(new Cluster(clusterIndex++, glyph.toString(), letter, base, sukun, shadda, tanween, maddah, false));
        }
        return clusters;
    }

    private boolean isArabicLetter(int cp) {
        if (isMark(cp) || Character.isWhitespace(cp)) {
            return false;
        }
        Character.UnicodeBlock block = Character.UnicodeBlock.of(cp);
        return block == Character.UnicodeBlock.ARABIC
                || block == Character.UnicodeBlock.ARABIC_SUPPLEMENT
                || block == Character.UnicodeBlock.ARABIC_EXTENDED_A
                || (cp >= 0x0621 && cp <= 0x064A)
                || cp == 0x0671
                || cp == 0x0670;
    }

    private boolean isMark(int cp) {
        int type = Character.getType(cp);
        return type == Character.NON_SPACING_MARK
                || type == Character.ENCLOSING_MARK
                || (cp >= 0x064B && cp <= 0x065F)
                || (cp >= 0x06D6 && cp <= 0x06ED)
                || cp == 0x0670
                || cp == 0x0640;
    }

    private enum Rule {
        NONE("none", ""),
        GHUNNAH("ghunnah", "Ghunnah"),
        QALQALAH("qalqalah", "Qalqalah"),
        IKHFA("ikhfa", "Ikhfa"),
        IDGHAM("idgham", "Idgham with ghunnah"),
        IDGHAM_NO_GHUNNAH("idgham-no-ghunnah", "Idgham without ghunnah"),
        IQLAB("iqlab", "Iqlab"),
        IZHAR("izhar", "Izhar"),
        IKHFA_SHAFAWI("ikhfa-shafawi", "Ikhfa shafawi"),
        IDGHAM_SHAFAWI("idgham-shafawi", "Idgham shafawi"),
        IZHAR_SHAFAWI("izhar-shafawi", "Izhar shafawi"),
        MADD("madd", "Madd");

        private final String id;
        private final String label;

        Rule(String id, String label) {
            this.id = id;
            this.label = label;
        }
    }

    private record Cluster(
            int index,
            String glyph,
            boolean isLetter,
            char baseLetter,
            boolean hasSukun,
            boolean hasShadda,
            boolean hasTanween,
            boolean hasMaddah,
            boolean whitespace
    ) {
        static Cluster space(int index) {
            return new Cluster(index, " ", false, ' ', false, false, false, false, true);
        }
    }
}
