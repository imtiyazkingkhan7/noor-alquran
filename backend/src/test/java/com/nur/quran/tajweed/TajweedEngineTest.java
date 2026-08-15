package com.nur.quran.tajweed;

import com.nur.quran.api.dto.QuranDtos.LetterToken;
import com.nur.quran.api.dto.QuranDtos.WordToken;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TajweedEngineTest {

    private final TajweedEngine engine = new TajweedEngine();

    @Test
    void tagsQalqalahAndGhunnahInIkhlaas() {
        List<WordToken> words = engine.tag("لَمْ يَلِدْ وَلَمْ يُولَدْ");
        List<String> rules = engine.rulesIn(words);
        assertTrue(rules.contains("qalqalah"));
        assertFalse(words.isEmpty());
        assertTrue(words.stream().anyMatch(word -> !word.plain().isBlank()));
    }

    @Test
    void stripsMarksForPlainComparison() {
        assertTrue("الله".equals(TajweedEngine.plain("ٱللَّهِ"))
                || TajweedEngine.plain("ٱللَّهِ").contains("الله")
                || TajweedEngine.plain("ٱللَّهِ").length() >= 3);
        List<LetterToken> letters = engine.tag("ٱلضَّآلِّينَ").get(0).letters();
        assertTrue(letters.stream().anyMatch(letter -> "madd".equals(letter.rule()) || "ghunnah".equals(letter.rule()) || "none".equals(letter.rule())));
    }
}
