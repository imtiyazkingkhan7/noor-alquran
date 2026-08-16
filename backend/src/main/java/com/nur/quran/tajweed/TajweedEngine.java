package com.nur.quran.tajweed;

import com.nur.quran.api.dto.QuranDtos.LetterToken;
import com.nur.quran.api.dto.QuranDtos.WordToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Tajweed tagger for Indo-Pak (Al Majeed / jazm) and Uthmani Quran text.
 * Tags the triggering letter: noon sakinah / tanween, meem sakinah, qalqalah, madd, ghunnah.
 */
@Component
public class TajweedEngine {

    private static final String QALQALAH = "قطبجد";
    private static final String IZHAR = "هعحغخءأإآؤئ";
    private static final String IDGHAM_GHUNNAH = "ينمو";
    private static final String IDGHAM_NO_GHUNNAH = "لر";
    private static final String IKHFA = "تثجدذزسشصضطظفقك";

    private static final int FATHA = 0x064E;
    private static final int DAMMA = 0x064F;
    private static final int KASRA = 0x0650;
    private static final int SUKUN = 0x0652;
    private static final int SHADDA = 0x0651;
    private static final int TANWEEN_FATHA = 0x064B;
    private static final int TANWEEN_DAMMA = 0x064C;
    private static final int TANWEEN_KASRA = 0x064D;
    private static final int MADDAH = 0x0653;
    private static final int DAGGER_ALEF = 0x0670;
    private static final int SUBSCRIPT_ALEF = 0x0656;
    private static final int INVERTED_DAMMA = 0x0657;
    private static final int JAZM = 0x06E1;
    private static final int SMALL_HIGH_MEEM = 0x06E2;
    private static final int SMALL_HIGH_MADDA = 0x06E4;
    private static final int SMALL_WAW = 0x06E5;
    private static final int SMALL_YEH = 0x06E6;
    private static final int OPEN_FATHATAN = 0x08F0;
    private static final int OPEN_DAMMATAN = 0x08F1;
    private static final int OPEN_KASRATAN = 0x08F2;

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
        return text.replace('\uFEFF', ' ')
                .replaceAll("[\\uE000-\\uF8FF]", "")
                .replaceAll("[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640\\u08F0-\\u08FF]", "")
                .replaceAll("[\\u2000-\\u200F\\u2028-\\u202F\\u2060-\\u206F]", " ")
                .replace('آ', 'ا')
                .replace('أ', 'ا')
                .replace('إ', 'ا')
                .replace('ٱ', 'ا')
                .replace('ى', 'ي')
                .replace('ة', 'ه')
                .replaceAll("\\s+", " ")
                .trim();
    }

    public static final String BASMALA_PLAIN = "بسم الله الرحمن الرحيم";

    public static boolean isBasmala(String text) {
        return plain(text).equals(BASMALA_PLAIN);
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
        Next next = nextLetter(cluster, all);
        Cluster prev = prevLetterSameWord(cluster, all);
        boolean ayahFinal = next == null;

        if ((letter == 'ن' || letter == 'م') && cluster.hasShadda) {
            if (cluster.hasMaddah) {
                return Rule.MADD_LAZIM;
            }
            return Rule.GHUNNAH;
        }

        boolean noonSakinah = letter == 'ن' && isSakinah(cluster);
        boolean meemSakinah = letter == 'م' && isSakinah(cluster);
        boolean tanween = cluster.hasTanween;
        boolean iqlabMark = (noonSakinah || tanween) && cluster.hasSmallMeem;

        if (iqlabMark || ((noonSakinah || tanween) && next != null && next.base() == 'ب')) {
            return Rule.IQLAB;
        }

        if (noonSakinah || tanween) {
            if (next != null) {
                char n = next.base();
                if (isIzharLetter(next.cluster)) {
                    return Rule.IZHAR;
                }
                if (IDGHAM_GHUNNAH.indexOf(n) >= 0) {
                    return Rule.IDGHAM;
                }
                if (IDGHAM_NO_GHUNNAH.indexOf(n) >= 0) {
                    return Rule.IDGHAM_NO_GHUNNAH;
                }
                if (IKHFA.indexOf(n) >= 0) {
                    return Rule.IKHFA;
                }
            } else if (ayahFinal && QALQALAH.indexOf(letter) >= 0) {
                return Rule.QALQALAH;
            }
        }

        if (meemSakinah) {
            if (next == null) {
                return Rule.IZHAR_SHAFAWI;
            }
            if (next.base() == 'ب') {
                return Rule.IKHFA_SHAFAWI;
            }
            if (next.base() == 'م') {
                return Rule.IDGHAM_SHAFAWI;
            }
            return Rule.IZHAR_SHAFAWI;
        }

        if (QALQALAH.indexOf(letter) >= 0 && (cluster.hasSukun || ayahFinal)) {
            return Rule.QALQALAH;
        }

        Rule madd = classifyMadd(cluster, prev, next, all);
        if (madd != Rule.NONE) {
            return madd;
        }

        return Rule.NONE;
    }

    private Rule classifyMadd(Cluster cluster, Cluster prev, Next next, List<Cluster> all) {
        char letter = cluster.baseLetter;
        boolean silah = isSilah(cluster, next == null ? null : next.cluster, all);
        boolean dagger = cluster.hasDaggerAlef;
        boolean maddah = cluster.hasMaddah;
        boolean alifMadd = isAlif(letter) && prev != null && prev.hasFatha && !prev.hasTanween && !cluster.hasShortVowel;
        boolean wawMadd = (letter == 'و' || letter == (char) SMALL_WAW)
                && isMaddCarrier(cluster)
                && prev != null
                && prev.hasDamma;
        boolean yaMadd = (letter == 'ي' || letter == 'ى' || letter == (char) SMALL_YEH)
                && isMaddCarrier(cluster)
                && prev != null
                && prev.hasKasra;
        boolean lin = isLin(cluster, prev);

        if (lin) {
            if (maddah || next == null) {
                return Rule.MADD_LIN;
            }
            return Rule.NONE;
        }

        boolean natural = alifMadd || wawMadd || yaMadd || dagger || silah;
        if (!natural && !maddah) {
            return Rule.NONE;
        }

        Cluster following = next == null ? null : next.cluster;
        boolean sameWord = next != null && !next.crossedWord;
        if (following != null && following.hasShadda) {
            return Rule.MADD_LAZIM;
        }
        if (maddah && following != null && following.hasSukun && sameWord) {
            return Rule.MADD_LAZIM;
        }
        if (following != null && isHamzaSound(following)) {
            return sameWord ? Rule.MADD_MUTTASIL : Rule.MADD_MUNFASIL;
        }
        if (maddah) {
            return Rule.MADD_LAZIM;
        }
        return Rule.MADD_TABII;
    }

    private boolean isLin(Cluster cluster, Cluster prev) {
        char letter = cluster.baseLetter;
        if (letter != 'و' && letter != 'ي' && letter != 'ى') {
            return false;
        }
        if (prev == null || !prev.hasFatha || prev.hasTanween) {
            return false;
        }
        return cluster.hasSukun || isMaddCarrier(cluster);
    }

    private boolean isSilah(Cluster cluster, Cluster following, List<Cluster> all) {
        if (cluster.baseLetter != 'ه' && cluster.baseLetter != 'ة') {
            return false;
        }
        if (cluster.hasSubscriptAlef || cluster.hasInvertedDamma) {
            return true;
        }
        if (following != null && !isSkippable(following) && (following.baseLetter == (char) SMALL_WAW
                || following.baseLetter == (char) SMALL_YEH)) {
            return true;
        }
        Cluster rawNext = rawNext(cluster, all);
        return rawNext != null && (rawNext.baseLetter == (char) SMALL_WAW || rawNext.baseLetter == (char) SMALL_YEH);
    }

    private boolean isMaddCarrier(Cluster cluster) {
        return !cluster.hasShortVowel && !cluster.hasTanween && !cluster.hasShadda;
    }

    private boolean isSakinah(Cluster cluster) {
        if (cluster.hasShadda || cluster.hasTanween || cluster.hasDaggerAlef || cluster.hasShortVowel) {
            return false;
        }
        return cluster.hasSukun || isMaddCarrier(cluster);
    }

    private boolean isIzharLetter(Cluster cluster) {
        char n = cluster.baseLetter;
        if (IZHAR.indexOf(n) >= 0) {
            return true;
        }
        return isHamzaSound(cluster);
    }

    private boolean isHamzaSound(Cluster cluster) {
        char b = cluster.baseLetter;
        if ("ءأإآؤئ".indexOf(b) >= 0) {
            return true;
        }
        return isAlif(b) && cluster.wordStart && cluster.hasShortVowel;
    }

    private boolean isWasl(Cluster cluster) {
        if (cluster.baseLetter == 'ٱ') {
            return true;
        }
        return isAlif(cluster.baseLetter)
                && cluster.wordStart
                && !cluster.hasShortVowel
                && !cluster.hasMaddah
                && !cluster.hasTanween
                && !cluster.hasDaggerAlef;
    }

    private boolean isAlif(char letter) {
        return letter == 'ا' || letter == 'ٱ' || letter == 'آ';
    }

    private Next nextLetter(Cluster from, List<Cluster> all) {
        boolean crossed = false;
        for (int i = from.index + 1; i < all.size(); i++) {
            Cluster cluster = all.get(i);
            if (cluster.whitespace) {
                crossed = true;
                continue;
            }
            if (!cluster.isLetter || isSkippable(cluster)) {
                continue;
            }
            if (isWasl(cluster)) {
                crossed = true;
                continue;
            }
            if (cluster.baseLetter == (char) SMALL_WAW || cluster.baseLetter == (char) SMALL_YEH) {
                continue;
            }
            return new Next(cluster, crossed);
        }
        return null;
    }

    private Cluster rawNext(Cluster from, List<Cluster> all) {
        for (int i = from.index + 1; i < all.size(); i++) {
            Cluster cluster = all.get(i);
            if (cluster.whitespace) {
                return null;
            }
            if (cluster.isLetter) {
                return cluster;
            }
        }
        return null;
    }

    private Cluster prevLetterSameWord(Cluster from, List<Cluster> all) {
        for (int i = from.index - 1; i >= 0; i--) {
            Cluster cluster = all.get(i);
            if (cluster.whitespace) {
                return null;
            }
            if (cluster.isLetter && !isSkippable(cluster)
                    && cluster.baseLetter != (char) SMALL_WAW
                    && cluster.baseLetter != (char) SMALL_YEH) {
                return cluster;
            }
        }
        return null;
    }

    private boolean isSkippable(Cluster cluster) {
        return !cluster.isLetter || cluster.baseLetter == 0;
    }

    private List<Cluster> tokenize(String text) {
        List<Cluster> clusters = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return clusters;
        }
        String cleaned = text.replace('\uFEFF', ' ');
        int i = 0;
        int clusterIndex = 0;
        boolean wordStart = true;
        while (i < cleaned.length()) {
            int cp = cleaned.codePointAt(i);
            int size = Character.charCount(cp);
            if (isIgnorableFormat(cp)) {
                i += size;
                continue;
            }
            if (Character.isWhitespace(cp) || isSpacingPause(cp)) {
                clusters.add(Cluster.space(clusterIndex++));
                wordStart = true;
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
            boolean dagger = false;
            boolean fatha = false;
            boolean damma = false;
            boolean kasra = false;
            boolean smallMeem = false;
            boolean subscriptAlef = false;
            boolean invertedDamma = false;
            while (i < cleaned.length()) {
                int mark = cleaned.codePointAt(i);
                if (!isMark(mark)) {
                    break;
                }
                glyph.appendCodePoint(mark);
                if (mark == SUKUN || mark == JAZM) {
                    sukun = true;
                }
                if (mark == SHADDA) {
                    shadda = true;
                }
                if (mark == TANWEEN_FATHA || mark == TANWEEN_DAMMA || mark == TANWEEN_KASRA
                        || mark == OPEN_FATHATAN || mark == OPEN_DAMMATAN || mark == OPEN_KASRATAN) {
                    tanween = true;
                }
                if (mark == MADDAH || mark == SMALL_HIGH_MADDA) {
                    maddah = true;
                }
                if (mark == DAGGER_ALEF) {
                    dagger = true;
                }
                if (mark == FATHA) {
                    fatha = true;
                }
                if (mark == DAMMA) {
                    damma = true;
                }
                if (mark == KASRA) {
                    kasra = true;
                }
                if (mark == SMALL_HIGH_MEEM) {
                    smallMeem = true;
                }
                if (mark == SUBSCRIPT_ALEF) {
                    subscriptAlef = true;
                }
                if (mark == INVERTED_DAMMA) {
                    invertedDamma = true;
                }
                i += Character.charCount(mark);
            }
            clusters.add(new Cluster(
                    clusterIndex++,
                    glyph.toString(),
                    letter,
                    base,
                    sukun,
                    shadda,
                    tanween,
                    maddah,
                    dagger,
                    fatha,
                    damma,
                    kasra,
                    smallMeem,
                    subscriptAlef,
                    invertedDamma,
                    wordStart,
                    false
            ));
            if (letter) {
                wordStart = false;
            }
        }
        return clusters;
    }

    private boolean isIgnorableFormat(int cp) {
        int type = Character.getType(cp);
        return type == Character.FORMAT
                || (cp >= 0x200B && cp <= 0x200F)
                || (cp >= 0x202A && cp <= 0x202E)
                || cp == 0xFEFF;
    }

    private boolean isSpacingPause(int cp) {
        return cp == 0x00A0 || cp == 0x2000 || cp == 0x2001 || cp == 0x2002
                || cp == 0x2003 || cp == 0x2004 || cp == 0x2005 || cp == 0x2006
                || cp == 0x2007 || cp == 0x2008 || cp == 0x2009 || cp == 0x200A
                || cp == 0x202F || cp == 0x205F;
    }

    private boolean isArabicLetter(int cp) {
        if (isMark(cp) || Character.isWhitespace(cp) || isIgnorableFormat(cp)) {
            return false;
        }
        if (cp >= 0xE000 && cp <= 0xF8FF) {
            return false;
        }
        if (cp >= 0x06D6 && cp <= 0x06ED && cp != SMALL_WAW && cp != SMALL_YEH) {
            return false;
        }
        Character.UnicodeBlock block = Character.UnicodeBlock.of(cp);
        return block == Character.UnicodeBlock.ARABIC
                || block == Character.UnicodeBlock.ARABIC_SUPPLEMENT
                || block == Character.UnicodeBlock.ARABIC_EXTENDED_A
                || (cp >= 0x0621 && cp <= 0x064A)
                || cp == 0x0671
                || cp == SMALL_WAW
                || cp == SMALL_YEH;
    }

    private boolean isMark(int cp) {
        int type = Character.getType(cp);
        return type == Character.NON_SPACING_MARK
                || type == Character.ENCLOSING_MARK
                || (cp >= 0x064B && cp <= 0x065F)
                || (cp >= 0x06D6 && cp <= 0x06ED && cp != SMALL_WAW && cp != SMALL_YEH)
                || cp == 0x0670
                || cp == 0x0640
                || (cp >= 0x08F0 && cp <= 0x08FF);
    }

    enum Rule {
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
        MADD_TABII("madd-tabii", "Madd tabi'i"),
        MADD_MUNFASIL("madd-munfasil", "Madd munfasil"),
        MADD_MUTTASIL("madd-muttasil", "Madd muttasil"),
        MADD_LAZIM("madd-lazim", "Madd lazim"),
        MADD_LIN("madd-lin", "Madd lin");

        final String id;
        final String label;

        Rule(String id, String label) {
            this.id = id;
            this.label = label;
        }
    }

    private record Next(Cluster cluster, boolean crossedWord) {
        char base() {
            return cluster.baseLetter;
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
            boolean hasDaggerAlef,
            boolean hasFatha,
            boolean hasDamma,
            boolean hasKasra,
            boolean hasSmallMeem,
            boolean hasSubscriptAlef,
            boolean hasInvertedDamma,
            boolean wordStart,
            boolean whitespace
    ) {
        boolean hasShortVowel() {
            return hasFatha || hasDamma || hasKasra;
        }

        static Cluster space(int index) {
            return new Cluster(
                    index, " ", false, ' ', false, false, false, false, false,
                    false, false, false, false, false, false, false, true
            );
        }
    }
}
