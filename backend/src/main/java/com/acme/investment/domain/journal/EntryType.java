package com.acme.investment.domain.journal;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum EntryType {
    ai_analysis,
    manual_note,
    ai_chart,
    external_image;

    @JsonValue
    public String toJson() {
        return name();
    }

    @JsonCreator
    public static EntryType fromJson(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim()
                .replace('-', '_')
                .replace(' ', '_');

        if (normalized.equals(normalized.toUpperCase())) {
            normalized = normalized.toLowerCase();
        } else {
            normalized = normalized
                    .replaceAll("([a-z0-9])([A-Z])", "$1_$2")
                    .toLowerCase();
        }

        return switch (normalized) {
            case "ai_analysis" -> ai_analysis;
            case "manual_note" -> manual_note;
            case "aichart", "ai_chart" -> ai_chart;
            case "external_image" -> external_image;
            default -> throw new IllegalArgumentException("Unsupported entry type: " + value);
        };
    }
}
