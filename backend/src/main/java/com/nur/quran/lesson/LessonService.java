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
                        "izhar",
                        "Izhar — clear noon",
                        "izhar",
                        "Pronounce noon sakinah or tanween clearly before throat letters.",
                        "When noon sakinah (نْ / Indo-Pak jazm) or tanween is followed by ء ه ع ح غ خ, the noon is said clearly from its makhraj. There is no ghunnah and no merging.",
                        List.of(
                                "Find the noon sakinah or tanween.",
                                "Look at the next letter — if it is a throat letter, this is izhar.",
                                "Say a clear noon, then the next letter, with no nasal hold."
                        ),
                        List.of(new ExampleRef(1, 7, "أَنْعَمْتَ — noon sakinah before ع"), new ExampleRef(112, 4, "كُفُوًا أَحَدٌ — tanween before hamza"))
                ),
                new LessonView(
                        "ikhfa",
                        "Ikhfa — concealed noon",
                        "ikhfa",
                        "Hide the noon sound and hold ghunnah when the next letter is an ikhfa letter.",
                        "If noon sakinah or tanween is followed by one of the fifteen ikhfa letters (ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك), the noon is concealed: not a full ن, not fully merged. Hold ghunnah for two counts.",
                        List.of(
                                "Do not bounce a clear noon.",
                                "Prepare the makhraj of the next letter.",
                                "Hold a light ghunnah for two counts, then release into that letter."
                        ),
                        List.of(new ExampleRef(113, 2, "مِنْ شَرِّ — ikhfa before ش"), new ExampleRef(2, 4, "مِنْ قَبْلِكَ — ikhfa before ق"))
                ),
                new LessonView(
                        "idgham",
                        "Idgham — merging noon",
                        "idgham",
                        "Merge noon sakinah or tanween into ي ن م و with ghunnah, and into ل ر without ghunnah.",
                        "Idgham means the noon is not pronounced as noon. With ي ن م و, merge and hold ghunnah. With ل and ر, merge completely with no ghunnah.",
                        List.of(
                                "Drop the noon articulation.",
                                "If the next letter is ي ن م و, nasalize for two counts.",
                                "If it is ل or ر, merge with no nasal hold."
                        ),
                        List.of(new ExampleRef(2, 27, "أَنْ يُّوصَلَ — idgham with ghunnah"), new ExampleRef(112, 4, "يَكُن لَّهُ — idgham without ghunnah"))
                ),
                new LessonView(
                        "iqlab",
                        "Iqlab — noon becomes meem",
                        "iqlab",
                        "Change noon sakinah or tanween into a meem sound before ب.",
                        "When noon sakinah or tanween is followed by ب, turn the noon into meem, keep the lips gently together, and hold ghunnah for two counts. In Indo-Pak print a small meem sits on the noon.",
                        List.of(
                                "See ب after noon/tanween, or a small meem on the noon.",
                                "Switch the sound to meem.",
                                "Hold ghunnah, then say ب."
                        ),
                        List.of(new ExampleRef(2, 27, "مِنْۢ بَعْدِ — iqlab"))
                ),
                new LessonView(
                        "qalqalah",
                        "Qalqalah — echo",
                        "qalqalah",
                        "Bounce ق ط ب ج د when they carry sukun, and when you stop on them.",
                        "Qalqalah is a slight echo so the letter does not die in the mouth. Stronger at the end of an ayah (qalqalah kubra), lighter in the middle (sughra).",
                        List.of(
                                "Identify ق ط ب ج د with sukun or jazm.",
                                "Do not add a full vowel.",
                                "Release a short echo from the makhraj."
                        ),
                        List.of(new ExampleRef(112, 3, "يَلِدْ — qalqalah on د"), new ExampleRef(108, 3, "الْأَبْتَرُ — qalqalah on ب"))
                ),
                new LessonView(
                        "madd-tabii",
                        "Madd tabi'i — natural madd",
                        "madd-tabii",
                        "Stretch alif after fatha, waw after damma, and ya after kasra for two counts.",
                        "This is the ordinary two-count madd. A dagger alif (ٰ) is also tabi'i. Do not clip these vowels when reciting quickly. Waw or ya after fatha is not tabi'i — that is lin.",
                        List.of(
                                "Find ا after fatha, و after damma, ي after kasra.",
                                "Count two calm beats.",
                                "Keep the sound one vowel — do not bounce into a hamza unless one is written."
                        ),
                        List.of(new ExampleRef(1, 1, "الرَّحِيمِ — ya madd"), new ExampleRef(1, 3, "الرَّحْمَٰنِ — dagger alif"))
                ),
                new LessonView(
                        "madd-munfasil",
                        "Madd munfasil — separate madd",
                        "madd-munfasil",
                        "Stretch four or five counts when a madd letter is followed by hamza in the next word.",
                        "The madd and the hamza are in two words, so the madd is ja'iz (permitted) and held longer than tabi'i. Indo-Pak often marks this with a small maddah (ۤ).",
                        List.of(
                                "See a madd letter at the end of a word.",
                                "The next word begins with hamza.",
                                "Stretch four or five counts."
                        ),
                        List.of(new ExampleRef(108, 1, "إِنَّا أَعْطَيْنَاكَ — munfasil"))
                ),
                new LessonView(
                        "madd-muttasil",
                        "Madd muttasil — connected madd",
                        "madd-muttasil",
                        "Stretch four or five counts when hamza follows a madd letter in the same word.",
                        "This madd is wajib — you must elongate. The hamza sits in the same word as the madd letter.",
                        List.of(
                                "Find ا و ي followed by hamza in one word.",
                                "Do not shorten it to two counts.",
                                "Stretch four or five counts."
                        ),
                        List.of(new ExampleRef(2, 5, "أُولَٰئِكَ — muttasil"))
                ),
                new LessonView(
                        "madd-lazim",
                        "Madd lazim — obligatory madd",
                        "madd-lazim",
                        "Stretch six counts when a madd letter is followed by a permanent sukun or shaddah.",
                        "This is the longest ordinary madd. Famous in الضَّالِّينَ and in the opened letters such as الم.",
                        List.of(
                                "Find maddah or a madd letter before a shaddah.",
                                "Hold six full counts — do not cut it to two or four.",
                                "Keep the sound steady."
                        ),
                        List.of(new ExampleRef(1, 7, "الضَّالِّينَ — madd lazim"), new ExampleRef(2, 1, "الم — madd lazim harfi"))
                ),
                new LessonView(
                        "madd-lin",
                        "Madd lin — soft madd",
                        "madd-lin",
                        "When you stop on waw or ya after fatha, stretch two to six counts.",
                        "Lin is a soft glide: وْ or يْ after a fatha. Continue through it lightly in the middle of an ayah. If you stop on it, hold a short-to-medium madd. The colour on the Mushaf matches the teacher’s madd-lin rule.",
                        List.of(
                                "Find و or ي after fatha, with sukun or jazm.",
                                "If you continue, pass through softly.",
                                "If you stop, stretch two to six counts."
                        ),
                        List.of(new ExampleRef(106, 2, "قُرَيْشٍ — lin on ya when stopping"))
                ),
                new LessonView(
                        "ghunnah",
                        "Ghunnah — nasal hold",
                        "ghunnah",
                        "Noon and meem with shaddah always take a two-count ghunnah.",
                        "Ghunnah is the nasal sound from the khayshum. Any نّ or مّ is held for two counts. The same nasal quality appears in ikhfa and idgham with ghunnah.",
                        List.of(
                                "See shaddah on ن or م.",
                                "Close for meem, or use the noon makhraj, and send sound through the nose.",
                                "Hold two calm counts."
                        ),
                        List.of(new ExampleRef(108, 1, "إِنَّا — noon mushaddad"), new ExampleRef(114, 4, "الْخَنَّاسِ"))
                ),
                new LessonView(
                        "meem-sakinah",
                        "Meem sakinah rules",
                        "ikhfa-shafawi",
                        "Ikhfa shafawi, idgham shafawi, and izhar shafawi.",
                        "Meem with sukun: before ب conceal with ghunnah (ikhfa shafawi); before م merge with ghunnah (idgham shafawi); elsewhere pronounce a clear meem (izhar shafawi).",
                        List.of(
                                "Find مْ.",
                                "Look at the next letter.",
                                "Apply concealment, merging, or clear meem."
                        ),
                        List.of(
                                new ExampleRef(105, 4, "تَرْمِيهِمْ بِحِجَارَةٍ — ikhfa shafawi"),
                                new ExampleRef(83, 14, "قُلُوبِهِمْ مَّا — idgham shafawi"),
                                new ExampleRef(1, 7, "عَلَيْهِمْ غَيْرِ — izhar shafawi")
                        )
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
