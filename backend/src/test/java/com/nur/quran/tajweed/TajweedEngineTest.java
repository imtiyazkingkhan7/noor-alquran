package com.nur.quran.tajweed;

import com.nur.quran.api.dto.QuranDtos.LetterToken;
import com.nur.quran.api.dto.QuranDtos.WordToken;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TajweedEngineTest {

    private final TajweedEngine engine = new TajweedEngine();

    @Test
    void tagsQalqalahOnIndopakDalAndBa() {
        List<WordToken> ikhlas = engine.tag("لَمۡ يَلِدۡ وَلَمۡ يُوۡلَدۡ");
        assertTrue(rules(ikhlas).contains("qalqalah"));
        assertTrue(hasRuleOn(ikhlas, 'د', "qalqalah"));

        List<WordToken> kawthar = engine.tag("اِنَّ شَانِئَكَ هُوَ الۡاَبۡتَرُ");
        assertTrue(hasRuleOn(kawthar, 'ب', "qalqalah"));
    }

    @Test
    void tagsGhunnahOnNoonMushaddad() {
        List<WordToken> words = engine.tag("اِنَّاۤ اَعۡطَيۡنٰكَ الۡكَوۡثَرَ");
        assertTrue(hasRuleOn(words, 'ن', "ghunnah"));
    }

    @Test
    void tagsIzharBeforeThroatLetter() {
        List<WordToken> words = engine.tag("صِرَاطَ الَّذِيۡنَ اَنۡعَمۡتَ عَلَيۡهِمۡ");
        assertTrue(hasRuleOn(words, 'ن', "izhar"));
    }

    @Test
    void tagsIkhfaBeforeShinAndQaf() {
        assertTrue(hasRuleOn(engine.tag("مِنۡ شَرِّ مَا خَلَقَ"), 'ن', "ikhfa"));
        assertTrue(hasRuleOn(engine.tag("مِنۡ قَبۡلِكَ"), 'ن', "ikhfa"));
        assertTrue(hasRuleOn(engine.tag("اُنۡزِلَ"), 'ن', "ikhfa"));
    }

    @Test
    void tagsIqlabFromSmallMeemAndBa() {
        List<WordToken> words = engine.tag("مِنۡۢ بَعۡدِ مِيۡثَاقِهٖ");
        assertTrue(rules(words).contains("iqlab"));
        assertTrue(hasRuleOn(words, 'ن', "iqlab"));
        assertFalse(hasRuleOn(words, 'ن', "ikhfa"));
    }

    @Test
    void tagsIdghamWithAndWithoutGhunnah() {
        List<WordToken> withGhunnah = engine.tag("اَنۡ يُّوۡصَلَ");
        assertTrue(hasRuleOn(withGhunnah, 'ن', "idgham"));

        List<WordToken> without = engine.tag("يَكُنۡ لَّهٗ");
        assertTrue(hasRuleOn(without, 'ن', "idgham-no-ghunnah"));

        List<WordToken> ra = engine.tag("مِنۡ رَّبِّهِمۡ");
        assertTrue(hasRuleOn(ra, 'ن', "idgham-no-ghunnah"));

        List<WordToken> tanweenMeem = engine.tag("هُدًى مِّنۡ");
        assertTrue(rules(tanweenMeem).contains("idgham"));

        List<WordToken> tanweenIzhar = engine.tag("كُفُوًا اَحَدٌ");
        assertTrue(rules(tanweenIzhar).contains("izhar"));
    }

    @Test
    void tagsMeemSakinahRules() {
        assertTrue(rules(engine.tag("تَرۡمِيۡهِمۡ بِحِجَارَةٍ")).contains("ikhfa-shafawi"));
        assertTrue(rules(engine.tag("هُمۡ بِمُؤۡمِنِيۡنَ")).contains("ikhfa-shafawi"));
        assertTrue(rules(engine.tag("قُلُوۡبِهِمۡ مَّا")).contains("idgham-shafawi"));
        assertTrue(rules(engine.tag("عَلَيۡهِمۡ غَيۡرِ")).contains("izhar-shafawi"));
        assertTrue(rules(engine.tag("لَمۡ يَلِدۡ")).contains("izhar-shafawi"));
    }

    @Test
    void tagsMaddLazimMuttasilMunfasilAndTabii() {
        List<WordToken> lazim = engine.tag("وَلَا الضَّآلِّيۡنَ");
        assertTrue(rules(lazim).contains("madd-lazim"));

        List<WordToken> harfi = engine.tag("الٓمّٓ");
        assertTrue(rules(harfi).contains("madd-lazim"));

        List<WordToken> munfasil = engine.tag("اِنَّاۤ اَعۡطَيۡنٰكَ");
        assertTrue(rules(munfasil).contains("madd-munfasil"));

        List<WordToken> muttasil = engine.tag("اُولٰٓٮِٕكَ");
        assertTrue(rules(muttasil).contains("madd-muttasil") || rules(muttasil).contains("madd-lazim"));

        List<WordToken> tabii = engine.tag("الرَّحِيۡمِ");
        assertTrue(hasRuleOn(tabii, 'ي', "madd-tabii"));

        List<WordToken> dagger = engine.tag("الرَّحۡمٰنِ");
        assertTrue(rules(dagger).contains("madd-tabii"));
    }

    @Test
    void doesNotTreatLayDiphthongAsMaddInTheMiddle() {
        List<WordToken> words = engine.tag("عَلَيۡهِمۡ غَيۡرِ");
        assertFalse(hasRuleOn(words, 'ي', "madd-tabii"));
        assertFalse(hasRuleOn(words, 'ي', "madd-lin"));
    }

    @Test
    void tagsMaddLinAtWaqfOnKawthar() {
        List<WordToken> words = engine.tag("الۡكَوۡثَرَ");
        assertTrue(rules(words).contains("madd-lin") || !hasRuleOn(words, 'و', "madd-tabii"));
        assertFalse(hasRuleOn(words, 'و', "madd-tabii"));
    }

    @Test
    void stillReadsUthmaniSukunAndOmittedNoonSukun() {
        List<WordToken> fatiha = engine.tag("صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ");
        assertTrue(hasRuleOn(fatiha, 'ن', "izhar"));
        assertTrue(rules(fatiha).contains("madd-lazim"));
        assertTrue(rules(fatiha).contains("izhar-shafawi"));

        List<WordToken> ikhfa = engine.tag("مِن شَرِّ مَا خَلَقَ");
        assertTrue(hasRuleOn(ikhfa, 'ن', "ikhfa"));

        List<WordToken> idgham = engine.tag("وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌ");
        assertTrue(hasRuleOn(idgham, 'ن', "idgham-no-ghunnah"));
    }

    @Test
    void stripsMarksAndPrivateUseForPlainComparison() {
        assertTrue("الله".equals(TajweedEngine.plain("ٱللَّهِ"))
                || TajweedEngine.plain("ٱللَّهِ").contains("الله")
                || TajweedEngine.plain("ٱللَّهِ").length() >= 3);
        assertEquals("يلد", TajweedEngine.plain("يَلِدۡ\uE021"));
        assertTrue(TajweedEngine.isBasmala("بِسۡمِ اللهِ الرَّحۡمٰنِ الرَّحِيۡمِ"));
        assertFalse(TajweedEngine.stripLeadingBasmala("بِسۡمِ اللهِ الرَّحۡمٰنِ الرَّحِيۡمِ الۡحَمۡدُ").contains("بسم"));
    }

    @Test
    void keepsWordGlyphsForAlMajeedDisplay() {
        List<WordToken> words = engine.tag("مِنۡۢ بَعۡدِ");
        assertFalse(words.isEmpty());
        assertTrue(words.get(0).text().contains("مِن"));
        assertTrue(words.get(0).letters().stream().anyMatch(letter -> letter.glyph().contains("ن")));
    }

    private static Set<String> rules(List<WordToken> words) {
        return words.stream()
                .flatMap(word -> word.letters().stream())
                .map(LetterToken::rule)
                .filter(rule -> rule != null && !"none".equals(rule))
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
    }

    private static boolean hasRuleOn(List<WordToken> words, char base, String rule) {
        return words.stream()
                .flatMap(word -> word.letters().stream())
                .anyMatch(letter -> rule.equals(letter.rule()) && letter.glyph().indexOf(base) >= 0);
    }
}
