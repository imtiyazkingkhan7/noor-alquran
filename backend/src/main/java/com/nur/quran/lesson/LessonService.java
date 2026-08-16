package com.nur.quran.lesson;

import com.nur.quran.api.dto.QuranDtos.ExampleRef;
import com.nur.quran.api.dto.QuranDtos.LessonView;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LessonService {

    private final Map<String, LessonView> lessons;

    public LessonService() {
        List<LessonView> catalog = List.of(
                new LessonView(
                        "ghunnah",
                        "Hold the nose sound",
                        "ghunnah",
                        "Ghunnah — hold نّ or مّ for two counts.",
                        "When noon or meem has a shaddah, send the sound through the nose and hold two calm counts. Same orange color on the Mushaf.",
                        List.of(
                                "See shaddah on ن or م.",
                                "Hold the nose sound for two counts.",
                                "Then continue."
                        ),
                        List.of(new ExampleRef(108, 1, "إِنَّا — noon with shaddah"), new ExampleRef(114, 4, "الْخَنَّاسِ"))
                ),
                new LessonView(
                        "ikhfa",
                        "Hide noon",
                        "ikhfa",
                        "Ikhfa — hide noon, keep a light nose sound.",
                        "If noon sakinah or tanween is followed by most letters, do not say a clear ن. Hide it and hold a light ghunnah, then go into the next letter. Meem before ب uses the same green (ikhfa shafawi).",
                        List.of(
                                "Do not bounce a clear noon.",
                                "Hold a light nose sound for two counts.",
                                "Release into the next letter."
                        ),
                        List.of(
                                new ExampleRef(113, 2, "مِنْ شَرِّ — hide noon"),
                                new ExampleRef(2, 4, "مِنْ قَبْلِكَ"),
                                new ExampleRef(105, 4, "تَرْمِيهِمْ بِحِجَارَةٍ — hide meem")
                        )
                ),
                new LessonView(
                        "idgham",
                        "Merge letters",
                        "idgham",
                        "Idgham — drop noon and join the next letter.",
                        "Noon sakinah or tanween before ي ن م و merges with a nose sound. Before ل or ر it merges with no nose sound. Same teal color. Meem into meem is the same idea.",
                        List.of(
                                "Do not say a separate noon.",
                                "Join the next letter.",
                                "Hold the nose only if the next letter is ي ن م و."
                        ),
                        List.of(
                                new ExampleRef(2, 27, "أَنْ يُّوصَلَ — merge with ghunnah"),
                                new ExampleRef(112, 4, "يَكُن لَّهُ — merge fully")
                        )
                ),
                new LessonView(
                        "iqlab",
                        "Noon becomes meem",
                        "iqlab",
                        "Iqlab — before ب, say meem instead of noon.",
                        "Noon sakinah or tanween plus ب turns into a meem sound. Hold ghunnah, lips lightly together. Indo-Pak often prints a small meem on the noon.",
                        List.of(
                                "See ب after noon, or a small meem on noon.",
                                "Say meem, not noon.",
                                "Hold the nose sound, then say ب."
                        ),
                        List.of(new ExampleRef(2, 27, "مِنْۢ بَعْدِ — noon to meem"))
                ),
                new LessonView(
                        "qalqalah",
                        "Bounce the letter",
                        "qalqalah",
                        "Qalqalah — a short echo on ق ط ب ج د.",
                        "When these letters have sukun, or you stop on them, give a light bounce so the letter does not die in the mouth. Stronger at the end of an ayah.",
                        List.of(
                                "Find ق ط ب ج د with sukun.",
                                "Do not add a full vowel.",
                                "Release a short echo."
                        ),
                        List.of(new ExampleRef(112, 3, "يَلِدْ — bounce on د"), new ExampleRef(108, 3, "الْأَبْتَرُ — bounce on ب"))
                ),
                new LessonView(
                        "madd",
                        "Stretch the vowel",
                        "madd",
                        "Madd — stretch ا و ي. Longer madd is a darker red.",
                        "Usual madd is two counts (alif after fatha, waw after damma, ya after kasra). If hamza follows, stretch longer. If a shaddah follows, hold six counts — that is the darker red. The teacher still knows the subtype; you only need one color.",
                        List.of(
                                "See a red vowel.",
                                "Stretch two calm counts.",
                                "If it is darker red, hold it longer (six counts)."
                        ),
                        List.of(
                                new ExampleRef(1, 1, "الرَّحِيمِ — two counts"),
                                new ExampleRef(108, 1, "إِنَّا أَعْطَيْنَاكَ — longer madd"),
                                new ExampleRef(1, 7, "الضَّالِّينَ — longest madd")
                        )
                ),
                new LessonView(
                        "izhar",
                        "Say noon clearly",
                        "izhar",
                        "Izhar — a clear noon before throat letters.",
                        "When noon sakinah or tanween is followed by ء ه ع ح غ خ, say a clear noon. No extra nose hold. Meem before other letters is also said clearly (same gold).",
                        List.of(
                                "Find noon or tanween.",
                                "If the next letter is from the throat, say noon clearly.",
                                "Do not hold ghunnah."
                        ),
                        List.of(new ExampleRef(1, 7, "أَنْعَمْتَ — clear noon"), new ExampleRef(112, 4, "كُفُوًا أَحَدٌ"))
                )
        );
        Map<String, LessonView> map = new LinkedHashMap<>();
        for (LessonView lesson : catalog) {
            map.put(lesson.id(), lesson);
        }
        this.lessons = map;
    }

    public List<LessonView> all() {
        return List.copyOf(lessons.values());
    }

    public LessonView get(String id) {
        LessonView lesson = lessons.get(id);
        if (lesson == null) {
            throw new IllegalArgumentException("Lesson not found");
        }
        return lesson;
    }
}
