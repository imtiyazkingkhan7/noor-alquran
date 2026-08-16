package com.nur.quran.recitation;

import com.nur.quran.api.dto.QuranDtos.AssessResponse;
import com.nur.quran.api.dto.QuranDtos.AyahView;
import com.nur.quran.api.dto.QuranDtos.LetterToken;
import com.nur.quran.api.dto.QuranDtos.ProgressResponse;
import com.nur.quran.api.dto.QuranDtos.WordToken;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RecitationAssessorTest {

    private final RecitationAssessor assessor = new RecitationAssessor();

    @Test
    void wrongWordUsesOneShortTajweedLine() {
        AyahView ayah = ayah(
                List.of(
                        word(0, "إِنَّا", "انا", "ghunnah"),
                        word(1, "أَعْطَيْنَاكَ", "اعطيناك", "madd-munfasil")
                ),
                List.of("ghunnah", "madd-munfasil")
        );

        ProgressResponse progress = assessor.progress(ayah, "foo", false, 2.0);
        assertTrue(progress.shouldStop());
        assertEquals("Stop. Hold noon — ghunnah", progress.teacherMessage());
        assertEquals(progress.teacherMessage(), progress.spokenMessage());
        assertFalse(progress.teacherMessage().contains("Listen to the ayah"));
    }

    @Test
    void rushedRecitationKeepsOneSentence() {
        AyahView ayah = ayah(
                List.of(
                        word(0, "إِنَّا", "انا", "ghunnah"),
                        word(1, "أَعْطَيْنَاكَ", "اعطيناك", "madd-munfasil"),
                        word(2, "الْكَوْثَرَ", "الكوثر", "madd-lin")
                ),
                List.of("ghunnah", "madd-munfasil", "madd-lin")
        );

        ProgressResponse progress = assessor.progress(ayah, "انا اعطيناك الكوثر", false, 0.2);
        assertTrue(progress.shouldStop());
        assertTrue(progress.teacherMessage().startsWith("Stop. Too fast."));
        assertTrue(progress.teacherMessage().contains("ghunnah") || progress.teacherMessage().contains("madd"));
        assertEquals(progress.teacherMessage(), progress.spokenMessage());
    }

    @Test
    void assessDoesNotLectureOnMismatch() {
        AyahView ayah = ayah(
                List.of(word(0, "قُلْ", "قل", "qalqalah")),
                List.of("qalqalah", "madd-tabii", "ikhfa", "idgham")
        );

        AssessResponse assess = assessor.assess(ayah, "foo", 1.0);
        assertTrue(assess.shouldStop());
        assertEquals("Stop. Bounce the letter — qalqalah", assess.teacherMessage());
        assertEquals(assess.teacherMessage(), assess.spokenMessage());
        assertTrue(assess.tajweedTips().size() <= 4);
        assertTrue(assess.tajweedTips().stream().allMatch(tip -> !tip.contains("counts when")));
    }

    private static AyahView ayah(List<WordToken> words, List<String> rules) {
        return new AyahView(108, 1, 1, 1, 1, 1, false, "text", "meaning", "", words, rules);
    }

    private static WordToken word(int index, String text, String plain, String rule) {
        return new WordToken(index, text, plain, List.of(new LetterToken(text, rule, rule)));
    }
}
