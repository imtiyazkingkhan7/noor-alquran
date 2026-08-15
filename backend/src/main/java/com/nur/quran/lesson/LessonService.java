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
                        "When noon sakinah (نْ) or tanween is followed by ء ه ع ح غ خ, the noon is said clearly from its makhraj. There is no ghunnah and no merging.",
                        List.of(
                                "Find the noon sakinah or tanween.",
                                "Look at the next letter — if it is a throat letter, this is izhar.",
                                "Say a clear noon, then the next letter, with no nasal hold."
                        ),
                        List.of(new ExampleRef(1, 7, "غَيْرِ — tanween before غ"), new ExampleRef(112, 1, "أَحَدٌ — practice tanween"))
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
                        List.of(new ExampleRef(1, 7, "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ"), new ExampleRef(114, 4, "ٱلْوَسْوَاسِ"))
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
                        List.of(new ExampleRef(1, 2, "رَبِّ ٱلْعَٰلَمِينَ"), new ExampleRef(112, 4, "يَكُن لَّهُۥ"))
                ),
                new LessonView(
                        "iqlab",
                        "Iqlab — noon becomes meem",
                        "iqlab",
                        "Change noon sakinah or tanween into a meem sound before ب.",
                        "When noon sakinah or tanween is followed by ب, turn the noon into meem, keep the lips gently together, and hold ghunnah for two counts.",
                        List.of(
                                "See ب after noon/tanween.",
                                "Switch the sound to meem.",
                                "Hold ghunnah, then say ب."
                        ),
                        List.of(new ExampleRef(2, 4, "Search the Mushaf for tanween before ب when the full corpus is loaded"))
                ),
                new LessonView(
                        "qalqalah",
                        "Qalqalah — echo",
                        "qalqalah",
                        "Bounce ق ط ب ج د when they carry sukun.",
                        "Qalqalah is a slight echo so the letter does not die in the mouth. Stronger at the end of an ayah (qalqalah kubra), lighter in the middle (sughra).",
                        List.of(
                                "Identify ق ط ب ج د with sukun.",
                                "Do not add a full vowel.",
                                "Release a short echo from the makhraj."
                        ),
                        List.of(new ExampleRef(112, 1, "أَحَدٌ — stop with qalqalah on د"), new ExampleRef(108, 3, "ٱلْأَبْتَرُ"))
                ),
                new LessonView(
                        "madd",
                        "Madd — elongation",
                        "madd",
                        "Stretch alif, waw, and ya when they are madd letters.",
                        "Natural madd (tabi'i) is two counts. Madd with a written maddah, or before hamzah or sukun, is longer. Do not clip these vowels when reciting quickly.",
                        List.of(
                                "Find ا after fatha, و after damma, ي after kasra.",
                                "Count two beats for natural madd.",
                                "If a maddah mark is present, stretch longer (4–6 counts as taught)."
                        ),
                        List.of(new ExampleRef(1, 1, "ٱلرَّحْمَٰنِ"), new ExampleRef(1, 7, "ٱلضَّآلِّينَ — madd lazim"))
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
                        List.of(new ExampleRef(1, 7, "ٱلَّذِينَ"), new ExampleRef(114, 4, "ٱلْخَنَّاسِ"))
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
                        List.of(new ExampleRef(1, 7, "عَلَيْهِمْ غَيْرِ — izhar shafawi before غ"))
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
