package com.nur.quran.corpus;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nur.quran.api.dto.QuranDtos;
import com.nur.quran.api.dto.QuranDtos.AyahView;
import com.nur.quran.api.dto.QuranDtos.ReaderAyah;
import com.nur.quran.api.dto.QuranDtos.ReaderSurah;
import com.nur.quran.api.dto.QuranDtos.ReciterView;
import com.nur.quran.api.dto.QuranDtos.SurahDetail;
import com.nur.quran.api.dto.QuranDtos.SurahSummary;
import com.nur.quran.api.dto.QuranDtos.WordToken;
import com.nur.quran.config.AppProperties;
import com.nur.quran.tajweed.TajweedEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class CorpusService {

    private static final Logger log = LoggerFactory.getLogger(CorpusService.class);
    public static final int MADINAH_PAGES = 604;
    private static final String[] PARA_EN = {
            "Alif Lam Meem", "Sayaqool", "Tilkar Rusul", "Lan Tanaalu", "Wal Muhsanat",
            "La Yuhibbullah", "Wa Iza Samiu", "Wa Lau Annana", "Qalal Malao", "Wa Alamoo",
            "Yatazirun", "Wa Ma Min Dabbah", "Wa Ma Ubarri", "Rubama", "Subhanallazi",
            "Qal Alam", "Iqtaraba", "Qad Aflaha", "Wa Qalallazina", "Amman Khalaq",
            "Utlu Ma Oohi", "Wa Man Yaqnut", "Wa Mali", "Faman Azlam", "Ilayhi Yuraddu",
            "Ha Meem", "Qala Fama Khatbukum", "Qad Sami Allah", "Tabarakallazi", "Amma Yatasaaloon"
    };
    private static final String[] PARA_AR = {
            "الم", "سَيَقُولُ", "تِلْكَ الرُّسُلُ", "لَن تَنَالُوا", "وَالْمُحْصَنَاتُ",
            "لَا يُحِبُّ اللَّهُ", "وَإِذَا سَمِعُوا", "وَلَوْ أَنَّنَا", "قَالَ الْمَلَأُ", "وَاعْلَمُوا",
            "يَعْتَذِرُونَ", "وَمَا مِن دَابَّةٍ", "وَمَا أُبَرِّئُ", "رُبَمَا", "سُبْحَانَ الَّذِي",
            "قَالَ أَلَمْ", "اقْتَرَبَ", "قَدْ أَفْلَحَ", "وَقَالَ الَّذِينَ", "أَمَّنْ خَلَقَ",
            "اتْلُ مَا أُوحِيَ", "وَمَن يَقْنُتْ", "وَمَا لِيَ", "فَمَنْ أَظْلَمُ", "إِلَيْهِ يُرَدُّ",
            "حم", "قَالَ فَمَا خَطْبُكُم", "قَدْ سَمِعَ اللَّهُ", "تَبَارَكَ الَّذِي", "عَمَّ"
    };

    private final AppProperties properties;
    private final TajweedEngine tajweedEngine;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();
    private final AtomicReference<Mushaf> mushaf = new AtomicReference<>();
    private final Map<Integer, ReaderSurah> readerOverlay = new LinkedHashMap<>();

    public CorpusService(AppProperties properties, TajweedEngine tajweedEngine, ObjectMapper objectMapper) {
        this.properties = properties;
        this.tajweedEngine = tajweedEngine;
        this.objectMapper = objectMapper;
        this.mushaf.set(load());
        this.readerOverlay.putAll(loadReaderOverlay());
    }

    public List<SurahSummary> listSurahs() {
        return mushaf.get().surahs.values().stream()
                .map(this::toSummary)
                .toList();
    }

    public List<ReaderSurah> listReaderSurahs() {
        List<ReaderSurah> surahs = new ArrayList<>();
        for (Surah surah : mushaf.get().surahs.values()) {
            surahs.add(toReaderSurah(surah, false));
        }
        return surahs;
    }

    public ReaderSurah getReaderSurah(int number) {
        return toReaderSurah(requireSurah(number), true);
    }

    public SurahDetail getSurah(int number) {
        Surah surah = requireSurah(number);
        List<AyahView> ayahs = new ArrayList<>();
        for (int i = 0; i < surah.ayahs.size(); i++) {
            ayahs.add(toAyahView(surah, surah.ayahs.get(i), rukuEndsAt(surah.ayahs, i)));
        }
        return new SurahDetail(toSummary(surah), ayahs);
    }

    public AyahView getAyah(int surahNumber, int ayahNumber) {
        Surah surah = requireSurah(surahNumber);
        int index = -1;
        for (int i = 0; i < surah.ayahs.size(); i++) {
            if (surah.ayahs.get(i).numberInSurah == ayahNumber) {
                index = i;
                break;
            }
        }
        if (index < 0) {
            throw new IllegalArgumentException("Ayah not found");
        }
        return toAyahView(surah, surah.ayahs.get(index), rukuEndsAt(surah.ayahs, index));
    }

    public List<ReciterView> reciters() {
        return List.of(
                new ReciterView("ar.alafasy", "Mishary Rashid Alafasy", "Murattal"),
                new ReciterView("ar.husary", "Mahmoud Khalil Al-Husary", "Murattal"),
                new ReciterView("ar.minshawimujawwad", "Mohamed Siddiq El-Minshawi", "Mujawwad")
        );
    }

    public String audioUrl(int globalNumber, String reciter) {
        String id = reciter == null || reciter.isBlank() ? properties.audio().reciter() : reciter;
        return properties.audio().baseUrl() + "/" + id + "/" + globalNumber + ".mp3";
    }

    public String audioUrl(int surahNumber, int ayahNumber, String reciter) {
        return audioUrl(getAyah(surahNumber, ayahNumber).globalNumber(), reciter);
    }

    public boolean isFullCorpus() {
        return mushaf.get().full;
    }

    public int pageCount() {
        if (isFullCorpus()) {
            return MADINAH_PAGES;
        }
        return Math.max(1, mushaf.get().surahs.values().stream()
                .flatMap(surah -> surah.ayahs.stream())
                .mapToInt(ayah -> ayah.page)
                .max()
                .orElse(1));
    }

    public int clampPage(int page) {
        return Math.max(1, Math.min(MADINAH_PAGES, page));
    }

    public QuranDtos.PageView getPage(int requested) {
        int page = clampPage(requested);
        int[] juz = {1};
        List<QuranDtos.JuzAyah> ayahs = collectAyahs(page, juz);
        if (ayahs.isEmpty() && !properties.corpus().skipRemote()) {
            ayahs = fetchRemotePage(page, juz);
        }
        if (ayahs.isEmpty()) {
            throw new IllegalArgumentException("Page not found");
        }
        return new QuranDtos.PageView(page, Math.max(juz[0], 1), pageCount(), ayahs);
    }

    public List<QuranDtos.JuzView> listJuz() {
        List<QuranDtos.JuzView> juzList = new ArrayList<>();
        for (int juz = 1; juz <= 30; juz++) {
            final int current = juz;
            Ayah found = null;
            Surah owner = null;
            outer:
            for (Surah surah : mushaf.get().surahs.values()) {
                for (Ayah ayah : surah.ayahs) {
                    if (ayah.juz == current) {
                        found = ayah;
                        owner = surah;
                        break outer;
                    }
                }
            }
            int startSurah = owner != null ? owner.number : 1;
            int startAyah = found != null ? found.numberInSurah : 1;
            int startPage = found != null ? Math.max(found.page, 1) : 1;
            juzList.add(new QuranDtos.JuzView(
                    juz,
                    startSurah,
                    startAyah,
                    startPage,
                    paraEnglish(juz),
                    paraArabic(juz)
            ));
        }
        return juzList;
    }

    public QuranDtos.JuzReader getJuz(int number) {
        if (number < 1 || number > 30) {
            throw new IllegalArgumentException("Juz not found");
        }
        List<QuranDtos.JuzAyah> ayahs = collectAyahsByJuz(number);
        if (ayahs.isEmpty()) {
            throw new IllegalArgumentException("Juz not found");
        }
        return new QuranDtos.JuzReader(number, paraEnglish(number), paraArabic(number), ayahs);
    }

    private List<QuranDtos.JuzAyah> collectAyahs(int page, int[] juzOut) {
        List<QuranDtos.JuzAyah> ayahs = new ArrayList<>();
        for (Surah surah : mushaf.get().surahs.values()) {
            OverlayNames names = overlayNames(surah);
            for (int i = 0; i < surah.ayahs.size(); i++) {
                Ayah ayah = surah.ayahs.get(i);
                if (ayah.page != page) {
                    continue;
                }
                if (juzOut != null) {
                    juzOut[0] = Math.max(juzOut[0], ayah.juz);
                }
                ayahs.add(toJuzAyah(surah, names, ayah, i));
            }
        }
        return ayahs;
    }

    private List<QuranDtos.JuzAyah> collectAyahsByJuz(int juz) {
        List<QuranDtos.JuzAyah> ayahs = new ArrayList<>();
        for (Surah surah : mushaf.get().surahs.values()) {
            OverlayNames names = overlayNames(surah);
            for (int i = 0; i < surah.ayahs.size(); i++) {
                Ayah ayah = surah.ayahs.get(i);
                if (ayah.juz != juz) {
                    continue;
                }
                ayahs.add(toJuzAyah(surah, names, ayah, i));
            }
        }
        return ayahs;
    }

    private OverlayNames overlayNames(Surah surah) {
        ReaderSurah overlay = readerOverlay.get(surah.number);
        String surahEn = overlay != null ? overlay.en() : surah.englishName;
        String surahAr = overlay != null ? overlay.ar() : surah.name;
        Map<Integer, ReaderAyah> overlayByN = new HashMap<>();
        if (overlay != null && overlay.ayahs() != null) {
            for (ReaderAyah row : overlay.ayahs()) {
                overlayByN.put(row.n(), row);
            }
        }
        return new OverlayNames(surahEn, surahAr, overlayByN);
    }

    private QuranDtos.JuzAyah toJuzAyah(Surah surah, OverlayNames names, Ayah ayah, int index) {
        ReaderAyah overlayRow = names.overlayByN.get(ayah.numberInSurah);
        String ar = ayah.text;
        String en = overlayRow != null ? overlayRow.en() : ayah.translation;
        if (!(surah.number == 1 && ayah.numberInSurah == 1)) {
            ar = TajweedEngine.stripLeadingBasmala(ar);
        }
        return new QuranDtos.JuzAyah(
                surah.number,
                names.en,
                names.ar,
                ayah.numberInSurah,
                ar,
                en,
                rukuEndsAt(surah.ayahs, index),
                ayah.numberInSurah == 1,
                ayah.page,
                tajweedEngine.tag(ar)
        );
    }

    private List<QuranDtos.JuzAyah> fetchRemotePage(int page, int[] juzOut) {
        try {
            String url = properties.corpus().pageUrl().replace("{page}", String.valueOf(page));
            JsonNode data = getJson(url).path("data");
            JsonNode remoteAyahs = data.path("ayahs");
            if (!remoteAyahs.isArray() || remoteAyahs.isEmpty()) {
                return List.of();
            }
            List<QuranDtos.JuzAyah> ayahs = new ArrayList<>();
            for (JsonNode node : remoteAyahs) {
                int surahNumber = node.path("surah").path("number").asInt();
                int numberInSurah = node.path("numberInSurah").asInt();
                Surah surah = mushaf.get().surahs.get(surahNumber);
                if (surah == null) {
                    continue;
                }
                OverlayNames names = overlayNames(surah);
                int index = -1;
                Ayah found = null;
                for (int i = 0; i < surah.ayahs.size(); i++) {
                    if (surah.ayahs.get(i).numberInSurah == numberInSurah) {
                        index = i;
                        found = surah.ayahs.get(i);
                        break;
                    }
                }
                if (found == null) {
                    continue;
                }
                if (juzOut != null) {
                    juzOut[0] = Math.max(juzOut[0], found.juz);
                }
                ayahs.add(toJuzAyah(surah, names, found, index));
            }
            if (!ayahs.isEmpty()) {
                log.info("Filled Madinah page {} from alquran.cloud page API", page);
            }
            return ayahs;
        } catch (Exception ex) {
            log.warn("Remote page {} unavailable: {}", page, ex.getMessage());
            return List.of();
        }
    }

    private record OverlayNames(String en, String ar, Map<Integer, ReaderAyah> overlayByN) {
    }

    private String paraEnglish(int number) {
        if (number < 1 || number > PARA_EN.length) {
            return "Para " + number;
        }
        return PARA_EN[number - 1];
    }

    private String paraArabic(int number) {
        if (number < 1 || number > PARA_AR.length) {
            return "پارہ " + eastern(number);
        }
        return PARA_AR[number - 1];
    }

    private String eastern(int value) {
        String[] digits = {"٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"};
        StringBuilder out = new StringBuilder();
        for (char ch : String.valueOf(value).toCharArray()) {
            out.append(ch >= '0' && ch <= '9' ? digits[ch - '0'] : ch);
        }
        return out.toString();
    }

    public List<QuranDtos.SearchHit> search(String query) {
        String needle = query == null ? "" : query.trim();
        if (needle.length() < 2) {
            return List.of();
        }
        String lower = needle.toLowerCase();
        String plainNeedle = TajweedEngine.plain(needle).toLowerCase();
        List<QuranDtos.SearchHit> hits = new ArrayList<>();
        for (Surah surah : mushaf.get().surahs.values()) {
            for (Ayah ayah : surah.ayahs) {
                boolean match = ayah.translation.toLowerCase().contains(lower)
                        || ayah.text.contains(needle)
                        || TajweedEngine.plain(ayah.text).toLowerCase().contains(plainNeedle);
                if (match) {
                    hits.add(new QuranDtos.SearchHit(
                            surah.number,
                            ayah.numberInSurah,
                            ayah.page,
                            surah.englishName,
                            ayah.text,
                            ayah.translation
                    ));
                    if (hits.size() >= 40) {
                        return hits;
                    }
                }
            }
        }
        return hits;
    }

    private AyahView toAyahView(Surah surah, Ayah ayah, boolean rukuEnds) {
        String text = ayah.text;
        if (!(surah.number == 1 && ayah.numberInSurah == 1)) {
            text = TajweedEngine.stripLeadingBasmala(text);
        }
        List<WordToken> words = tajweedEngine.tag(text);
        return new AyahView(
                surah.number,
                ayah.numberInSurah,
                ayah.globalNumber,
                ayah.page,
                ayah.juz,
                ayah.ruku,
                rukuEnds,
                text,
                ayah.translation,
                properties.audio().ayahUrl(ayah.globalNumber),
                words,
                tajweedEngine.rulesIn(words)
        );
    }

    private boolean rukuEndsAt(List<Ayah> ayahs, int index) {
        if (index < 0 || index >= ayahs.size()) {
            return false;
        }
        if (index == ayahs.size() - 1) {
            return true;
        }
        return ayahs.get(index).ruku != ayahs.get(index + 1).ruku;
    }

    private boolean rukuEnds(Surah surah, Ayah ayah) {
        return rukuEnds(surah, ayah.numberInSurah);
    }

    private boolean rukuEnds(Surah surah, int numberInSurah) {
        for (int i = 0; i < surah.ayahs.size(); i++) {
            if (surah.ayahs.get(i).numberInSurah == numberInSurah) {
                return rukuEndsAt(surah.ayahs, i);
            }
        }
        return false;
    }

    private ReaderAyah toReaderAyah(Surah surah, int numberInSurah, String ar, String en) {
        return new ReaderAyah(numberInSurah, ar, en, rukuEnds(surah, numberInSurah));
    }

    private ReaderSurah toReaderSurah(Surah surah, boolean includeAyahs) {
        ReaderSurah overlay = readerOverlay.get(surah.number);
        String en = overlay != null ? overlay.en() : surah.englishName;
        String ar = overlay != null ? overlay.ar() : surah.name;
        if (!includeAyahs) {
            return new ReaderSurah(surah.number, en, ar, List.of());
        }
        List<ReaderAyah> overlayAyahs = overlay == null || overlay.ayahs() == null ? List.of() : overlay.ayahs();
        List<ReaderAyah> ayahs;
        if (overlayAyahs.isEmpty()) {
            ayahs = surah.ayahs.stream()
                    .map(ayah -> toReaderAyah(surah, ayah.numberInSurah, ayah.text, ayah.translation))
                    .toList();
        } else {
            ayahs = overlayAyahs.stream()
                    .map(row -> toReaderAyah(surah, row.n(), row.ar(), row.en()))
                    .toList();
        }
        return new ReaderSurah(surah.number, en, ar, ayahs);
    }

    private Map<Integer, ReaderSurah> loadReaderOverlay() {
        Map<Integer, ReaderSurah> overlay = new LinkedHashMap<>();
        try (InputStream in = new ClassPathResource("quran-reader.json").getInputStream()) {
            ReaderSurah[] items = objectMapper.readValue(in, ReaderSurah[].class);
            for (ReaderSurah item : items) {
                overlay.put(item.num(), item);
            }
            log.info("Loaded reader catalog overlay ({} surahs)", overlay.size());
        } catch (IOException ex) {
            log.warn("Reader catalog overlay missing: {}", ex.getMessage());
        }
        return overlay;
    }

    private SurahSummary toSummary(Surah surah) {
        int rukuCount = (int) surah.ayahs.stream().map(ayah -> ayah.ruku).distinct().count();
        int startPage = surah.ayahs.isEmpty() ? 1 : surah.ayahs.get(0).page;
        return new SurahSummary(
                surah.number,
                surah.name,
                surah.englishName,
                surah.englishNameTranslation,
                surah.revelationType,
                surah.ayahs.size(),
                Math.max(rukuCount, 1),
                Math.max(startPage, 1)
        );
    }

    private Surah requireSurah(int number) {
        Surah surah = mushaf.get().surahs.get(number);
        if (surah == null) {
            throw new IllegalArgumentException("Surah not found");
        }
        return surah;
    }

    private Mushaf load() {
        Mushaf loaded;
        Mushaf cached = readCache();
        if (cached != null && hasPageData(cached)) {
            log.info("Loaded Quran corpus from cache ({} surahs)", cached.surahs.size());
            loaded = cached;
        } else if (properties.corpus().skipRemote()) {
            loaded = readFallback();
        } else {
            try {
                Mushaf remote = fetchRemote();
                writeCache(remote);
                log.info("Loaded full Quran corpus from alquran.cloud ({} surahs)", remote.surahs.size());
                loaded = remote;
            } catch (Exception ex) {
                log.warn("Remote Quran corpus unavailable, using bundled fallback: {}", ex.getMessage());
                loaded = readFallback();
            }
        }
        return withIndopak(loaded);
    }

    private Mushaf withIndopak(Mushaf source) {
        try {
            JsonNode verses = getJson("https://api.quran.com/api/v4/quran/verses/indopak").path("verses");
            Map<String, String> byKey = new LinkedHashMap<>();
            for (JsonNode verse : verses) {
                byKey.put(verse.path("verse_key").asText(), verse.path("text_indopak").asText());
            }
            if (byKey.isEmpty()) {
                return source;
            }
            Map<Integer, Surah> surahs = new LinkedHashMap<>();
            for (Surah surah : source.surahs.values()) {
                List<Ayah> ayahs = new ArrayList<>();
                for (Ayah ayah : surah.ayahs) {
                    String indo = byKey.get(surah.number + ":" + ayah.numberInSurah);
                    ayahs.add(new Ayah(
                            ayah.globalNumber,
                            ayah.numberInSurah,
                            ayah.page,
                            ayah.juz,
                            ayah.ruku,
                            indo == null || indo.isBlank() ? ayah.text : indo,
                            ayah.translation
                    ));
                }
                surahs.put(surah.number, new Surah(
                        surah.number,
                        surah.name,
                        surah.englishName,
                        surah.englishNameTranslation,
                        surah.revelationType,
                        ayahs
                ));
            }
            log.info("Applied Indo-Pak script for Al Majeed rendering");
            return new Mushaf(source.full, surahs);
        } catch (Exception ex) {
            log.warn("Indo-Pak script unavailable, keeping current text: {}", ex.getMessage());
            return source;
        }
    }

    private Mushaf fetchRemote() throws IOException, InterruptedException {
        JsonNode uthmani = getJson(properties.corpus().uthmaniUrl()).path("data");
        JsonNode english = getJson(properties.corpus().translationUrl()).path("data");
        Map<Integer, Surah> surahs = new LinkedHashMap<>();
        JsonNode arSurahs = uthmani.path("surahs");
        JsonNode enSurahs = english.path("surahs");
        for (int i = 0; i < arSurahs.size(); i++) {
            JsonNode ar = arSurahs.get(i);
            JsonNode en = enSurahs.get(i);
            List<Ayah> ayahs = new ArrayList<>();
            JsonNode arAyahs = ar.path("ayahs");
            JsonNode enAyahs = en.path("ayahs");
            for (int a = 0; a < arAyahs.size(); a++) {
                JsonNode arAyah = arAyahs.get(a);
                String translation = enAyahs.size() > a ? enAyahs.get(a).path("text").asText("") : "";
                ayahs.add(new Ayah(
                        arAyah.path("number").asInt(),
                        arAyah.path("numberInSurah").asInt(),
                        arAyah.path("page").asInt(),
                        arAyah.path("juz").asInt(),
                        arAyah.path("ruku").asInt(),
                        arAyah.path("text").asText(),
                        translation
                ));
            }
            int number = ar.path("number").asInt();
            surahs.put(number, new Surah(
                    number,
                    ar.path("name").asText(),
                    ar.path("englishName").asText(),
                    ar.path("englishNameTranslation").asText(),
                    ar.path("revelationType").asText(),
                    ayahs
            ));
        }
        return new Mushaf(true, surahs);
    }

    private JsonNode getJson(String url) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(60))
                .header("Accept", "application/json")
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 400) {
            throw new IOException("HTTP " + response.statusCode() + " for " + url);
        }
        return objectMapper.readTree(response.body());
    }

    private Mushaf readCache() {
        String cacheFile = properties.corpus() == null ? null : properties.corpus().cacheFile();
        if (cacheFile == null || cacheFile.isBlank()) {
            return null;
        }
        Path path = Path.of(cacheFile);
        if (!Files.exists(path)) {
            return null;
        }
        try {
            return objectMapper.readValue(path.toFile(), Mushaf.class);
        } catch (IOException ex) {
            log.warn("Could not read corpus cache: {}", ex.getMessage());
            return null;
        }
    }

    private void writeCache(Mushaf mushaf) {
        try {
            Path path = Path.of(properties.corpus().cacheFile());
            Files.createDirectories(path.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(path.toFile(), mushaf);
        } catch (IOException ex) {
            log.warn("Could not write corpus cache: {}", ex.getMessage());
        }
    }

    private Mushaf readFallback() {
        try (InputStream in = new ClassPathResource("corpus/fallback.json").getInputStream()) {
            return objectMapper.readValue(in, Mushaf.class);
        } catch (IOException ex) {
            throw new IllegalStateException("Bundled Quran fallback is missing", ex);
        }
    }

    public record Mushaf(boolean full, Map<Integer, Surah> surahs) {
    }

    public record Surah(
            int number,
            String name,
            String englishName,
            String englishNameTranslation,
            String revelationType,
            List<Ayah> ayahs
    ) {
    }

    public record Ayah(int globalNumber, int numberInSurah, int page, int juz, int ruku, String text, String translation) {
    }

    private boolean hasPageData(Mushaf cached) {
        return cached.surahs.values().stream()
                .flatMap(surah -> surah.ayahs.stream())
                .anyMatch(ayah -> ayah.page > 0);
    }
}
