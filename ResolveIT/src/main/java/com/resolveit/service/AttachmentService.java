package com.resolveit.service;

import com.resolveit.dto.AttachmentResponse;
import com.resolveit.model.Attachment;
import com.resolveit.model.Complaint;
import com.resolveit.repository.AttachmentRepository;
import com.resolveit.repository.ComplaintRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
public class AttachmentService {

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private FileStorageService fileStorageService;

    // Allowed file types - only PDF, JPG, JPEG, MP4
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("pdf", "jpg", "jpeg", "mp4");

    @Transactional
    public AttachmentResponse saveAttachment(MultipartFile file, Long complaintId, com.resolveit.model.User currentUser)
            throws IOException {
        // Find the complaint
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found with id: " + complaintId));

        // Validate file type
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new IllegalArgumentException("Invalid filename");
        }

        String extension = getFileExtension(originalFilename).toLowerCase();

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("File type not allowed. Only PDF, JPG, JPEG, and MP4 are accepted.");
        }

        // Store file using FileStorageService
        String storedFilename = fileStorageService.storeFile(file);

        // Create attachment entity
        Attachment attachment = new Attachment();
        attachment.setFileName(storedFilename);
        attachment.setOriginalFileName(originalFilename);
        attachment.setFileType(file.getContentType());
        attachment.setFilePath("/uploads/" + storedFilename);
        attachment.setFileSize(file.getSize());
        attachment.setComplaint(complaint);
        attachment.setUploadedBy(currentUser);

        // Save to database
        Attachment saved = attachmentRepository.save(attachment);
        return convertToDto(saved);
    }

    @Transactional(readOnly = true)
    public Attachment getAttachment(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new NoSuchElementException("Attachment not found with id: " + attachmentId));
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> getAttachmentsByComplaint(Long complaintId) {
        return attachmentRepository.findByComplaintId(complaintId)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteAttachment(Long attachmentId) {
        Attachment attachment = getAttachment(attachmentId);
        // Delete file from storage
        fileStorageService.deleteFile(attachment.getFileName());
        attachmentRepository.deleteById(attachmentId);
    }

    @Transactional
    public void deleteAllAttachments() {
        List<Attachment> attachments = attachmentRepository.findAll();
        for (Attachment attachment : attachments) {
            fileStorageService.deleteFile(attachment.getFileName());
        }
        attachmentRepository.deleteAll();
    }

    private AttachmentResponse convertToDto(Attachment attachment) {
        AttachmentResponse response = new AttachmentResponse();
        response.setId(attachment.getId());
        response.setFileName(
                attachment.getOriginalFileName() != null ? attachment.getOriginalFileName() : attachment.getFileName());
        response.setFileType(attachment.getFileType());
        response.setDownloadUrl(attachment.getFilePath());
        response.setFileSize(attachment.getFileSize());
        return response;
    }

    private String getFileExtension(String filename) {
        if (filename == null)
            return "";
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0) {
            return filename.substring(dotIndex + 1);
        }
        return "";
    }
}
