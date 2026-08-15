package com.nur.quran.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @DefaultValue Audio audio,
        @DefaultValue Corpus corpus
) {

    public record Audio(
            @DefaultValue("https://cdn.islamic.network/quran/audio/128") String baseUrl,
            @DefaultValue("ar.alafasy") String reciter
    ) {
        public String ayahUrl(int globalAyahNumber) {
            return baseUrl + "/" + reciter + "/" + globalAyahNumber + ".mp3";
        }
    }

    public record Corpus(
            @DefaultValue("https://api.alquran.cloud/v1/quran/quran-uthmani") String uthmaniUrl,
            @DefaultValue("https://api.alquran.cloud/v1/quran/en.sahih") String translationUrl,
            @DefaultValue("data/quran-cache.json") String cacheFile,
            @DefaultValue("false") boolean skipRemote
    ) {
    }
}
