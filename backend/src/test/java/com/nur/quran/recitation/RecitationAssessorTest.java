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
    void wrongWordSpeaksTheCorrectLafz() {
        AyahView ayah = ayah(
                List.of(
                        word(0, "إِنَّا", "انا"),
                        word(1, "أَعْطَيْنَاكَ", "اعطيناك")
                )
        );

        ProgressResponse progress = assessor.progress(ayah, "foo", false, 2.0);
        assertTrue(progress.shouldStop());
        assertEquals(MaulanaLines.wrongWord("إِنَّا"), progress.teacherMessage());
        assertEquals(progress.teacherMessage(), progress.spokenMessage());
        assertFalse(progress.teacherMessage().toLowerCase().contains("ghunnah"));
    }

    @Test
    void rushedRecitationAsksToSlowDown() {
        AyahView ayah = ayah(
                List.of(
                        word(0, "إِنَّا", "انا"),
                        word(1, "أَعْطَيْنَاكَ", "اعطيناك"),
                        word(2, "الْكَوْثَرَ", "الكوثر")
                )
        );

        ProgressResponse progress = assessor.progress(ayah, "انا اعطيناك الكوثر", false, 0.2);
        assertTrue(progress.shouldStop());
        assertTrue(progress.teacherMessage().contains("تیز"));
        assertEquals(progress.teacherMessage(), progress.spokenMessage());
    }

    @Test
    void assessSaysTheCorrectWordOnMismatch() {
        AyahView ayah = ayah(List.of(word(0, "قُلْ", "قل")));

        AssessResponse assess = assessor.assess(ayah, "foo", 1.0);
        assertTrue(assess.shouldStop());
        assertEquals(MaulanaLines.wrongWord("قُلْ"), assess.teacherMessage());
        assertEquals(assess.teacherMessage(), assess.spokenMessage());
        assertTrue(assess.tajweedTips().isEmpty());
    }

    private static AyahView ayah(List<WordToken> words) {
        return new AyahView(108, 1, 1, 1, 1, 1, false, "text", "meaning", "", words, List.of());
    }

    private static WordToken word(int index, String text, String plain) {
        return new WordToken(index, text, plain, List.of(new LetterToken(text, "none", "none")));
    }
}
