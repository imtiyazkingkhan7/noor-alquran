package com.nur.quran.api;

import com.nur.quran.recitation.MaulanaTtsService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher")
public class TeacherVoiceController {

    private final MaulanaTtsService tts;

    public TeacherVoiceController(MaulanaTtsService tts) {
        this.tts = tts;
    }

    @GetMapping(value = "/speak", produces = "audio/mpeg")
    public ResponseEntity<byte[]> speak(
            @RequestParam String text,
            @RequestParam(defaultValue = "ur") String lang
    ) {
        try {
            byte[] audio = tts.speak(text, lang);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CACHE_CONTROL, "no-store")
                    .contentType(MediaType.parseMediaType("audio/mpeg"))
                    .body(audio);
        } catch (Exception ex) {
            return ResponseEntity.status(503).build();
        }
    }
}
