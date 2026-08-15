package com.nur.quran.api;

import com.nur.quran.api.dto.QuranDtos.LessonView;
import com.nur.quran.lesson.LessonService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/lessons")
public class LessonController {

    private final LessonService lessonService;

    public LessonController(LessonService lessonService) {
        this.lessonService = lessonService;
    }

    @GetMapping
    public List<LessonView> all() {
        return lessonService.all();
    }

    @GetMapping("/{id}")
    public LessonView one(@PathVariable String id) {
        return lessonService.get(id);
    }
}
