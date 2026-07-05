package com.acme.investment.application.journal;

import com.acme.investment.infrastructure.config.JournalAttachmentStorageProperties;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

@Service
public class JournalAttachmentStorageService {

    public record StoredAttachment(
            String storageKey,
            String publicUrl,
            String fileName,
            String attachmentType,
            String mimeType,
            long sizeBytes
    ) {}

    public record StoredAttachmentContent(
            Resource resource,
            String mimeType,
            String fileName,
            long sizeBytes
    ) {}

    private final JournalAttachmentStorageProperties properties;

    public JournalAttachmentStorageService(JournalAttachmentStorageProperties properties) {
        this.properties = properties;
    }

    public StoredAttachment store(UUID userId, MultipartFile file, String attachmentType) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Attachment file is empty");
        }
        if (file.getSize() > properties.getMaxFileSizeBytes()) {
            throw new IllegalArgumentException("Attachment exceeds maximum allowed size");
        }

        String originalName = file.getOriginalFilename() == null || file.getOriginalFilename().isBlank()
                ? "attachment"
                : Paths.get(file.getOriginalFilename()).getFileName().toString();
        String extension = extractExtension(originalName);
        LocalDate now = LocalDate.now();
        String storageKey = userId + "/"
                + now.getYear() + "/"
                + String.format(Locale.ROOT, "%02d", now.getMonthValue()) + "/"
                + UUID.randomUUID() + extension;

        Path root = Paths.get(properties.getStorageRoot()).toAbsolutePath().normalize();
        Path destination = root.resolve(storageKey).normalize();
        if (!destination.startsWith(root)) {
            throw new IllegalArgumentException("Invalid attachment storage path");
        }

        try {
            Files.createDirectories(destination.getParent());
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store attachment file", e);
        }

        String mimeType = file.getContentType();
        if (mimeType == null || mimeType.isBlank()) {
            mimeType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        String publicUrl = "/api/v1/journal/attachments/content?storageKey="
                + URLEncoder.encode(storageKey, StandardCharsets.UTF_8);

        return new StoredAttachment(
                storageKey,
                publicUrl,
                originalName,
                attachmentType,
                mimeType,
                file.getSize()
        );
    }

    public StoredAttachmentContent load(UUID userId, String storageKey) {
        String normalizedKey = storageKey == null ? "" : storageKey.replace("\\", "/");
        String userPrefix = userId + "/";
        if (!normalizedKey.startsWith(userPrefix)) {
            throw new IllegalArgumentException("Attachment does not belong to current user");
        }

        Path root = Paths.get(properties.getStorageRoot()).toAbsolutePath().normalize();
        Path filePath = root.resolve(normalizedKey).normalize();
        if (!filePath.startsWith(root) || !Files.exists(filePath) || !Files.isRegularFile(filePath)) {
            throw new IllegalArgumentException("Attachment file not found");
        }

        String mimeType;
        try {
            mimeType = Files.probeContentType(filePath);
        } catch (IOException e) {
            mimeType = null;
        }
        if (mimeType == null || mimeType.isBlank()) {
            mimeType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        try {
            return new StoredAttachmentContent(
                    new FileSystemResource(filePath),
                    mimeType,
                    filePath.getFileName().toString(),
                    Files.size(filePath)
            );
        } catch (IOException e) {
            throw new RuntimeException("Failed to read attachment file", e);
        }
    }

    private String extractExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return "";
        }
        String ext = fileName.substring(dotIndex);
        if (ext.length() > 10) {
            return "";
        }
        return ext;
    }
}
