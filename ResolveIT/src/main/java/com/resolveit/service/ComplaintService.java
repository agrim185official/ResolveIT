package com.resolveit.service;

import com.resolveit.dto.ComplaintRequest;
import com.resolveit.dto.ComplaintResponse;
import com.resolveit.dto.StatusUpdateRequest;
import com.resolveit.model.*;
import com.resolveit.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * ComplaintService - Core Business Logic for Complaint Management
 * 
 * This service handles all complaint-related business operations:
 * 
 * 1. COMPLAINT LIFECYCLE:
 * - Creation: Users submit complaints with title, description, category,
 * priority
 * - Unique complaint numbers are auto-generated (e.g., COMP-20240118-001)
 * - Anonymous submissions are supported
 * 
 * 2. STATUS WORKFLOW (strict hierarchy):
 * NEW → UNDER_REVIEW → RESOLVED → CLOSED
 * - Only forward transitions allowed (no going back)
 * - Each transition is logged in ComplaintUpdate for audit trail
 * 
 * 3. STAFF ASSIGNMENT:
 * - Admins can assign complaints to staff members
 * - Staff can view their assigned complaints
 * 
 * 4. ESCALATION:
 * - Auto-escalation: Scheduled task escalates overdue complaints
 * - Manual escalation: Admins can manually escalate urgent complaints
 * 
 * 5. NOTIFICATIONS:
 * - Email notifications sent on status changes
 * - In-app notifications for real-time updates
 * 
 * 6. DATA MANAGEMENT:
 * - Reset functionality for clearing test data (Admin only)
 */
@Service
public class ComplaintService {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ComplaintUpdateRepository complaintUpdateRepository;

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private UserNotificationRepository userNotificationRepository;

    @Autowired
    private AttachmentService attachmentService;

    @Transactional(readOnly = true)
    public Page<ComplaintResponse> getAllComplaints(Pageable pageable) {
        return complaintRepository.findAll(pageable).map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> getAllComplaintsList() {
        return complaintRepository.findAll()
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ComplaintResponse getComplaintById(Long id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found with id: " + id));
        return convertToDto(complaint);
    }

    @Transactional
    public ComplaintResponse createComplaint(ComplaintRequest complaintRequest, User createdBy) {
        Complaint complaint = new Complaint();
        complaint.setComplaintNumber(generateComplaintNumber());
        complaint.setTitle(complaintRequest.getTitle());
        complaint.setDescription(complaintRequest.getDescription());
        complaint.setCategory(complaintRequest.getCategory());
        complaint.setPriority(complaintRequest.getPriority());
        complaint.setAnonymous(complaintRequest.isAnonymous());
        complaint.setStatus(ComplaintStatus.NEW);
        complaint.setCreatedBy(createdBy);
        complaint.setCreatedAt(LocalDateTime.now());
        return convertToDto(complaintRepository.save(complaint));
    }

    private String generateComplaintNumber() {
        Optional<Complaint> lastComplaint = complaintRepository.findTopByOrderByComplaintNumberDesc();

        if (lastComplaint.isPresent()) {
            String lastId = lastComplaint.get().getComplaintNumber();
            if (lastId != null && lastId.startsWith("CMP-")) {
                try {
                    int sequence = Integer.parseInt(lastId.substring(4));
                    return String.format("CMP-%05d", sequence + 1);
                } catch (NumberFormatException e) {
                    // Fallback if format is broken
                    return String.format("CMP-%05d", lastComplaint.get().getId() + 1);
                }
            }
        }

        return "CMP-00001";
    }

    @Transactional
    public ComplaintResponse updateComplaint(Long id, ComplaintRequest complaintRequest) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found with id: " + id));

        if (complaintRequest.getTitle() != null) {
            complaint.setTitle(complaintRequest.getTitle());
        }
        if (complaintRequest.getDescription() != null) {
            complaint.setDescription(complaintRequest.getDescription());
        }
        if (complaintRequest.getCategory() != null) {
            complaint.setCategory(complaintRequest.getCategory());
        }
        if (complaintRequest.getPriority() != null) {
            complaint.setPriority(complaintRequest.getPriority());
        }

        complaint.setUpdatedAt(LocalDateTime.now());
        return convertToDto(complaintRepository.save(complaint));
    }

    @Transactional
    public void deleteComplaint(Long id) {
        if (!complaintRepository.existsById(id)) {
            throw new NoSuchElementException("Complaint not found with id: " + id);
        }
        complaintRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> getComplaintsByUser(User user) {
        return complaintRepository.findByCreatedById(user.getId())
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> getComplaintsByUserId(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new NoSuchElementException("User not found with id: " + userId);
        }
        return complaintRepository.findByCreatedById(userId)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ComplaintResponse> getComplaintsByStatus(ComplaintStatus status, Pageable pageable) {
        return complaintRepository.findByStatus(status, pageable)
                .map(this::convertToDto);
    }

    public boolean isOwner(Long complaintId, String username) {
        return complaintRepository.findById(complaintId)
                .map(complaint -> {
                    Optional<User> createdBy = userRepository.findById(complaint.getCreatedBy().getId());
                    return createdBy.isPresent() && createdBy.get().getUsername().equals(username);
                })
                .orElse(false);
    }

    private ComplaintResponse convertToDto(Complaint complaint) {
        ComplaintResponse response = new ComplaintResponse();
        response.setId(complaint.getId());
        response.setComplaintNumber(complaint.getComplaintNumber());
        response.setTitle(complaint.getTitle());
        response.setDescription(complaint.getDescription());
        response.setStatus(complaint.getStatus());
        response.setCategory(complaint.getCategory());
        response.setPriority(complaint.getPriority());
        response.setCreatedAt(complaint.getCreatedAt());
        response.setUpdatedAt(complaint.getUpdatedAt());
        response.setAnonymous(complaint.isAnonymous());

        // Set created by user details - hide if anonymous
        if (complaint.getCreatedBy() != null) {
            if (complaint.isAnonymous()) {
                response.setCreatedBy("Anonymous");
            } else {
                response.setCreatedBy(complaint.getCreatedBy().getName());
            }
        }

        // Set assigned to user details if exists
        if (complaint.getAssignedTo() != null) {
            response.setAssignedTo(complaint.getAssignedTo().getUsername());
        }

        // Set attachments
        List<com.resolveit.dto.AttachmentResponse> attachmentDtos = attachmentRepository
                .findByComplaintId(complaint.getId())
                .stream()
                .map(att -> {
                    com.resolveit.dto.AttachmentResponse attResponse = new com.resolveit.dto.AttachmentResponse();
                    attResponse.setId(att.getId());
                    attResponse.setFileName(att.getFileName());
                    attResponse.setFileType(att.getFileType());
                    attResponse.setDownloadUrl("/api/complaints/attachments/" + att.getId());
                    return attResponse;
                })
                .collect(Collectors.toList());
        response.setAttachments(attachmentDtos);

        // Set last admin comment from most recent update
        List<ComplaintUpdate> updates = complaintUpdateRepository
                .findByComplaintIdOrderByUpdatedAtDesc(complaint.getId());
        if (!updates.isEmpty()) {
            ComplaintUpdate latestUpdate = updates.get(0);
            if (latestUpdate.getComments() != null && !latestUpdate.getComments().isEmpty()) {
                response.setLastAdminComment(latestUpdate.getComments());
            }
        }

        // Set all updates with comments for history
        List<com.resolveit.dto.ComplaintUpdateResponse> updateDtos = updates.stream()
                .filter(u -> u.getComments() != null && !u.getComments().isEmpty())
                .map(u -> {
                    com.resolveit.dto.ComplaintUpdateResponse updateDto = new com.resolveit.dto.ComplaintUpdateResponse();
                    updateDto.setId(u.getId());
                    updateDto.setOldStatus(u.getOldStatus());
                    updateDto.setNewStatus(u.getNewStatus());
                    updateDto.setComments(u.getComments());
                    updateDto.setUpdatedAt(u.getUpdatedAt());
                    if (u.getUpdatedBy() != null) {
                        updateDto.setUpdatedBy(u.getUpdatedBy().getUsername());
                    }
                    return updateDto;
                })
                .collect(Collectors.toList());
        response.setUpdates(updateDtos);

        // Set escalation info
        response.setEscalated(complaint.isEscalated());
        response.setEscalatedAt(complaint.getEscalatedAt());

        return response;
    }

    @Transactional
    public ComplaintResponse updateComplaintStatus(Long id, StatusUpdateRequest statusUpdate, User updatedBy) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found with id: " + id));

        ComplaintStatus oldStatus = complaint.getStatus();
        ComplaintStatus newStatus = statusUpdate.getStatus();

        if (newStatus == null) {
            throw new IllegalArgumentException("New status cannot be null");
        }

        // Strict Status Hierarchy Validation
        // NEW -> UNDER_REVIEW -> RESOLVED -> CLOSED
        // Allow same status (for adding comments without changing status)
        boolean isValid = false;

        if (oldStatus == newStatus) {
            isValid = true; // Allow staying in same status (Comment only)
        } else {
            switch (oldStatus) {
                case NEW:
                    if (newStatus == ComplaintStatus.UNDER_REVIEW)
                        isValid = true;
                    break;
                case UNDER_REVIEW:
                    if (newStatus == ComplaintStatus.RESOLVED)
                        isValid = true;
                    break;
                case RESOLVED:
                    if (newStatus == ComplaintStatus.CLOSED)
                        isValid = true;
                    break;
                case CLOSED:
                    throw new IllegalStateException("Complaint is already CLOSED and cannot be updated.");
                default:
                    break;
            }
        }

        if (!isValid) {
            throw new IllegalArgumentException(
                    String.format(
                            "Invalid status transition: Cannot move from %s to %s. Strict hierarchy is: NEW -> UNDER_REVIEW -> RESOLVED -> CLOSED.",
                            oldStatus, newStatus));
        }

        // Update status
        complaint.setStatus(newStatus);
        complaint.setUpdatedAt(LocalDateTime.now());

        // Handle assignment if provided
        String assignedToEmail = statusUpdate.getAssignedToEmail();
        if (assignedToEmail != null && !assignedToEmail.trim().isEmpty()) {
            userRepository.findByEmail(assignedToEmail).ifPresent(complaint::setAssignedTo);
        }

        // Create status update record
        if (updatedBy != null) {
            ComplaintUpdate update = new ComplaintUpdate();
            update.setComplaint(complaint);
            update.setUpdatedBy(updatedBy);
            update.setOldStatus(oldStatus);
            update.setNewStatus(newStatus);
            update.setComments(statusUpdate.getComments());
            update.setUpdatedAt(LocalDateTime.now());
            complaintUpdateRepository.save(update);
        }

        Complaint saved = complaintRepository.save(complaint);

        // Send email and in-app notification to user (if status changed)
        if (oldStatus != newStatus && saved.getCreatedBy() != null && !saved.isAnonymous()) {
            String userEmail = saved.getCreatedBy().getEmail();

            // Send email
            emailService.sendStatusUpdateEmail(
                    userEmail,
                    saved.getComplaintNumber(),
                    oldStatus.name(),
                    newStatus.name(),
                    saved.getTitle());

            // Create in-app notification
            UserNotification userNotification = new UserNotification();
            userNotification.setUser(saved.getCreatedBy());
            userNotification.setType("STATUS_UPDATE");
            userNotification.setMessage("Your complaint '" + saved.getTitle() + "' status changed to "
                    + newStatus.name().replace("_", " "));
            userNotification.setComplaintId(saved.getId());
            userNotificationRepository.save(userNotification);
        }

        // Notify admin when an escalated complaint is resolved
        if (saved.isEscalated() && newStatus == ComplaintStatus.RESOLVED) {
            // Create admin notification for escalated resolution
            Notification adminNotification = new Notification();
            adminNotification.setType("ESCALATED_RESOLVED");
            adminNotification.setMessage("⚠️ Escalated complaint '" + saved.getTitle() + "' ("
                    + saved.getComplaintNumber() + ") has been RESOLVED. Please review and close.");
            adminNotification.setComplaintId(saved.getId());
            notificationRepository.save(adminNotification);
        }

        return convertToDto(saved);
    }

    @Transactional
    public Comment addComment(Long complaintId, String content, User user) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found with id: " + complaintId));

        Comment comment = new Comment();
        comment.setContent(content);
        comment.setUser(user);
        comment.setComplaint(complaint);
        comment.setCreatedAt(LocalDateTime.now());

        complaint.getComments().add(comment);
        complaintRepository.save(complaint);

        return comment;
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> getComplaintsByUser(Long userId) {
        return complaintRepository.findByCreatedById(userId)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> getAssignedComplaints(Long userId) {
        return complaintRepository.findByAssignedToId(userId)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ComplaintResponse assignComplaint(Long complaintId, Long userId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found with id: " + complaintId));

        User assignee = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found with id: " + userId));

        complaint.setAssignedTo(assignee);
        complaint.setUpdatedAt(LocalDateTime.now());

        return convertToDto(complaintRepository.save(complaint));
    }

    @Transactional(readOnly = true)
    public long getComplaintCountByStatus(ComplaintStatus status) {
        return complaintRepository.countByStatus(status);
    }

    @Transactional(readOnly = true)
    public List<com.resolveit.dto.ComplaintUpdateResponse> getTimeline(Long complaintId) {
        if (!complaintRepository.existsById(complaintId)) {
            throw new NoSuchElementException("Complaint not found with id: " + complaintId);
        }

        return complaintUpdateRepository.findByComplaintIdOrderByUpdatedAtDesc(complaintId)
                .stream()
                .map(update -> {
                    com.resolveit.dto.ComplaintUpdateResponse response = new com.resolveit.dto.ComplaintUpdateResponse();
                    response.setId(update.getId());
                    response.setOldStatus(update.getOldStatus());
                    response.setNewStatus(update.getNewStatus());
                    response.setComments(update.getComments());
                    response.setUpdatedAt(update.getUpdatedAt());
                    if (update.getUpdatedBy() != null) {
                        response.setUpdatedBy(update.getUpdatedBy().getUsername());
                    }
                    return response;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public ComplaintResponse escalateComplaint(Long id, User escalatedBy) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Complaint not found with id: " + id));

        if (complaint.isEscalated()) {
            throw new IllegalStateException("Complaint is already escalated.");
        }

        complaint.setEscalated(true);
        complaint.setEscalatedAt(LocalDateTime.now());

        // Log update
        ComplaintUpdate update = new ComplaintUpdate();
        update.setComplaint(complaint);
        update.setUpdatedBy(escalatedBy);
        update.setOldStatus(complaint.getStatus());
        update.setNewStatus(complaint.getStatus()); // Status doesn't change
        update.setComments("Manual Escalation by Admin");
        update.setUpdatedAt(LocalDateTime.now());
        complaintUpdateRepository.save(update);

        return convertToDto(complaintRepository.save(complaint));
    }

    @Transactional
    public void resetComplaints() {
        // 1. Delete all attachments (files and DB records)
        attachmentService.deleteAllAttachments();

        // 2. Delete all timelines (history)
        complaintUpdateRepository.deleteAll();

        // 2. Delete all notifications
        notificationRepository.deleteAll();

        // 2. Fetch all complaints sorted by creation date
        List<Complaint> complaints = complaintRepository.findAll(org.springframework.data.domain.Sort.by("createdAt"));

        // 3. Temporarily rename all complaint numbers to avoid unique constraint
        // violations
        // Format: T-{id} (Short enough to fit in 20 char limit)
        for (Complaint c : complaints) {
            c.setComplaintNumber("T-" + c.getId());
        }
        complaintRepository.saveAllAndFlush(complaints);

        // 4. Re-serialize complaint numbers sequentially, reset status to NEW, and
        // clear assignments
        long counter = 1;
        for (Complaint c : complaints) {
            c.setComplaintNumber(String.format("CMP-%05d", counter++));
            c.setStatus(ComplaintStatus.NEW); // Reset status
            c.setAssignedTo(null); // Clear staff assignments
        }
        complaintRepository.saveAll(complaints);
    }
}
