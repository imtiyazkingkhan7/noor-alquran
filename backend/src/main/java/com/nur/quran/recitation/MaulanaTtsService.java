package com.nur.quran.recitation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

@Service
public class MaulanaTtsService {

    private static final Logger log = LoggerFactory.getLogger(MaulanaTtsService.class);
    private static final String UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public byte[] speak(String text, String lang) {
        String spoken = prepare(text);
        if (spoken.isBlank()) {
            throw new IllegalArgumentException("empty speech");
        }
        if (spoken.length() > 180) {
            spoken = spoken.substring(0, 180);
        }
        String tl = "ar".equalsIgnoreCase(lang) ? "ar" : "ur";
        Exception last = null;
        for (String host : List.of(
                "https://translate.google.com/translate_tts",
                "https://translate.googleapis.com/translate_tts"
        )) {
            try {
                byte[] body = fetch(host, spoken, tl);
                if (body.length > 400) {
                    return body;
                }
            } catch (Exception ex) {
                last = ex;
                log.warn("Maulana TTS {} failed: {}", host, ex.getMessage());
            }
        }
        throw new IllegalStateException("Maulana TTS unavailable", last);
    }

    private byte[] fetch(String host, String text, String tl) throws Exception {
        String q = URLEncoder.encode(text, StandardCharsets.UTF_8);
        URI uri = URI.create(host + "?ie=UTF-8&client=tw-ob&tl=" + tl + "&q=" + q);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(20))
                .header("User-Agent", UA)
                .header("Accept", "*/*")
                .header("Referer", "https://translate.google.com/")
                .GET()
                .build();
        HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("status " + response.statusCode());
        }
        return response.body();
    }

    static String prepare(String text) {
        if (text == null) {
            return "";
        }
        String spoken = text.trim();
        spoken = spoken.replace("Ruko. Yeh lafz ghalat pada. Sahi yeh hai:", MaulanaLines.WRONG_PREFIX.trim());
        spoken = spoken.replace("Ruko. Yeh lafz ghalat pada. Sahi dubara padho.", MaulanaLines.WRONG_AGAIN);
        spoken = spoken.replace("Ruko. Bahut tez padh rahe ho. Thair kar, saaf saaf padho.", MaulanaLines.TOO_FAST);
        spoken = spoken.replace("Ruko. Awaz saaf nahi aayi. Dubara padho.", MaulanaLines.NO_HEAR);
        spoken = spoken.replace("Ruko. Zyada lafz padh diye. Sahi ayat dubara padho.", MaulanaLines.EXTRA);
        spoken = spoken.replace("Ruko. Poori ayat poori karo.", MaulanaLines.FINISH);
        spoken = spoken.replace("Shabash. Agli ayat padho.", MaulanaLines.GOOD);
        spoken = spoken.replace("Shabash. Yeh para poora ho gaya.", MaulanaLines.PARA_DONE);
        spoken = spoken.replace("Main sun raha hoon.", MaulanaLines.LISTENING);
        spoken = spoken.replace("Chalte raho.", MaulanaLines.KEEP_GOING);
        spoken = spoken.replace("Ruko. Chrome kholo aur microphone allow karo.", MaulanaLines.MIC);
        spoken = spoken.replace("Ruko. Sahi yeh hai.", "رکو۔ صحیح یہ ہے");
        return spoken.trim();
    }
}
