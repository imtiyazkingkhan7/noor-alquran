package com.nur.quran.api;

import com.nur.quran.api.dto.QuranDtos.AyahView;
import com.nur.quran.api.dto.QuranDtos.JuzReader;
import com.nur.quran.api.dto.QuranDtos.JuzView;
import com.nur.quran.api.dto.QuranDtos.PageView;
import com.nur.quran.api.dto.QuranDtos.ReaderSurah;
import com.nur.quran.api.dto.QuranDtos.ReciterView;
import com.nur.quran.api.dto.QuranDtos.SearchHit;
import com.nur.quran.corpus.CorpusService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class QuranController {

    private final CorpusService corpusService;

    public QuranController(CorpusService corpusService) {
        this.corpusService = corpusService;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "ok",
                "fullCorpus", corpusService.isFullCorpus(),
                "pageCount", corpusService.pageCount()
        );
    }

    @GetMapping("/pages/{page}")
    public PageView page(@PathVariable int page) {
        return corpusService.getPage(page);
    }

    @GetMapping("/juz")
    public List<JuzView> juz() {
        return corpusService.listJuz();
    }

    @GetMapping("/juz/{number}")
    public JuzReader juzDetail(@PathVariable int number) {
        return corpusService.getJuz(number);
    }

    @GetMapping("/search")
    public List<SearchHit> search(@RequestParam String q) {
        return corpusService.search(q);
    }

    @GetMapping("/surahs")
    public List<ReaderSurah> surahs() {
        return corpusService.listReaderSurahs();
    }

    @GetMapping("/surahs/{number}")
    public ReaderSurah surah(@PathVariable int number) {
        return corpusService.getReaderSurah(number);
    }

    @GetMapping("/surahs/{number}/ayahs/{ayah}")
    public AyahView ayah(@PathVariable int number, @PathVariable int ayah) {
        return corpusService.getAyah(number, ayah);
    }

    @GetMapping("/reciters")
    public List<ReciterView> reciters() {
        return corpusService.reciters();
    }

    @GetMapping("/audio/{globalAyah}")
    public Map<String, String> audio(
            @PathVariable int globalAyah,
            @RequestParam(required = false) String reciter
    ) {
        return Map.of("url", corpusService.audioUrl(globalAyah, reciter));
    }

    @GetMapping("/audio")
    public Map<String, String> audioByAyah(
            @RequestParam int surah,
            @RequestParam int ayah,
            @RequestParam(required = false) String reciter
    ) {
        return Map.of("url", corpusService.audioUrl(surah, ayah, reciter));
    }
}
