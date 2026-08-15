package com.nur.quran.api;

import com.nur.quran.api.dto.QuranDtos.AssessRequest;
import com.nur.quran.api.dto.QuranDtos.AssessResponse;
import com.nur.quran.api.dto.QuranDtos.AyahView;
import com.nur.quran.api.dto.QuranDtos.ProgressRequest;
import com.nur.quran.api.dto.QuranDtos.ProgressResponse;
import com.nur.quran.corpus.CorpusService;
import com.nur.quran.recitation.RecitationAssessor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recitation")
public class RecitationController {

    private final CorpusService corpusService;
    private final RecitationAssessor assessor;

    public RecitationController(CorpusService corpusService, RecitationAssessor assessor) {
        this.corpusService = corpusService;
        this.assessor = assessor;
    }

    @PostMapping("/assess")
    public AssessResponse assess(@RequestBody AssessRequest request) {
        AyahView ayah = corpusService.getAyah(request.surah(), request.ayah());
        return assessor.assess(ayah, request.transcript(), request.durationSeconds());
    }

    @PostMapping("/progress")
    public ProgressResponse progress(@RequestBody ProgressRequest request) {
        AyahView ayah = corpusService.getAyah(request.surah(), request.ayah());
        boolean partial = request.partial() == null || request.partial();
        return assessor.progress(ayah, request.transcript(), partial, request.durationSeconds());
    }
}
