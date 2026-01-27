package com.resolveit.controller;

import com.resolveit.dto.ComplaintRequest;
import com.resolveit.dto.ComplaintResponse;
import com.resolveit.dto.StatusUpdateRequest;
import com.resolveit.dto.ComplaintUpdateResponse;
import com.resolveit.model.Comment;
import com.resolveit.model.ComplaintStatus;
import com.resolveit.model.Notification;
import com.resolveit.model.User;
import com.resolveit.repository.ComplaintRepository;
import com.resolveit.repository.NotificationRepository;
import com.resolveit.service.AttachmentService;
import com.resolveit.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * ComplaintController - REST API for Complaint/Grievance Management
 * 
 * This controller handles all complaint-related operations including:
 * - CRUD operations for complaints (Create, Read, Update, Delete)
 * - Status workflow management (NEW -> UNDER_REVIEW -> RESOLVED -> CLOSED)
 * - Staff assignment and complaint delegation
 * - File attachment handling
 * - Timeline/history tracking
 * - Manual escalation by admins
 * 
 * Base URL: /api/complaints
 * 
 * Access Control:
 * - Users can create complaints and view their own
 * - Staff can view and update assigned complaints
 * - Admins have full access to all complaints
 */
@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private AttachmentService attachmentService;

    // ==================== READ Operations ====================

    /**
     * Get all complaints with pagination (for admin dashboard)
     */
    @GetMapping
    public ResponseEntity<Page<ComplaintResponse>> getAllComplaints(Pageable pageable) {
        return ResponseEntity.ok(complaintService.getAllComplaints(pageable));
    }

    /**
     * Get all complaints as a simple list (Admin only)
     * Used by admin dashboard for displaying all grievances
     */
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ComplaintResponse>> getAllComplaintsList() {
        return ResponseEntity.ok(complaintService.getAllComplaintsList());
    }

    /**
     * Get a single complaint by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ComplaintResponse> getComplaintById(@PathVariable Long id) {
        return ResponseEntity.ok(complaintService.getComplaintById(id));
    }

    // ==================== CREATE Operations ====================

    @PostMapping
    public ResponseEntity<ComplaintResponse> createComplaint(
            @Valid @RequestBody ComplaintRequest complaintRequest,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        ComplaintResponse response = complaintService.createComplaint(complaintRequest, currentUser);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @complaintService.isOwner(#id, #currentUser.username)")
    public ResponseEntity<ComplaintResponse> updateComplaint(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintRequest complaintRequest,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(complaintService.updateComplaint(id, complaintRequest));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @complaintService.isOwner(#id, #currentUser.username)")
    public ResponseEntity<Void> deleteComplaint(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        complaintService.deleteComplaint(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_STAFF')")
    public ResponseEntity<?> updateComplaintStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest statusUpdate,
            @AuthenticationPrincipal User currentUser) {
        ComplaintResponse response = complaintService.updateComplaintStatus(id, statusUpdate, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-complaints")
    public ResponseEntity<List<ComplaintResponse>> getMyComplaints(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(complaintService.getComplaintsByUser(currentUser));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('STAFF') or #userId == #currentUser.id")
    public ResponseEntity<List<ComplaintResponse>> getComplaintsByUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(complaintService.getComplaintsByUserId(userId));
    }

    @PostMapping("/{id}/assign/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ComplaintResponse> assignComplaint(
            @PathVariable Long id,
            @PathVariable Long userId) {
        return ResponseEntity.ok(complaintService.assignComplaint(id, userId));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Comment> addComment(
            @PathVariable Long id,
            @RequestParam String content,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(complaintService.addComment(id, content, user));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('STAFF')")
    public ResponseEntity<Page<ComplaintResponse>> getComplaintsByStatus(
            @PathVariable String status,
            Pageable pageable) {
        return ResponseEntity
                .ok(complaintService.getComplaintsByStatus(ComplaintStatus.valueOf(status.toUpperCase()), pageable));
    }

    @PostMapping("/{id}/escalate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ComplaintResponse> escalateComplaint(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(complaintService.escalateComplaint(id, currentUser));
    }

    // ==================== Attachment Endpoints ====================

    @PostMapping("/{id}/attachments")
    public ResponseEntity<?> uploadAttachment(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) {
        try {
            return ResponseEntity.ok(attachmentService.saveAttachment(file, id, currentUser));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/attachments")
    public ResponseEntity<?> getAttachments(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(attachmentService.getAttachmentsByComplaint(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    // ==================== Timeline Endpoints ====================

    @GetMapping("/{id}/timeline")
    public ResponseEntity<List<ComplaintUpdateResponse>> getTimeline(@PathVariable Long id) {
        return ResponseEntity.ok(complaintService.getTimeline(id));
    }

    @PostMapping("/reset-data")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> resetData() {
        complaintService.resetComplaints();
        return ResponseEntity.ok("Complaint data reset successfully");
    }

    // ==================== Staff Endpoints ====================

    @GetMapping("/assigned")
    @PreAuthorize("hasAuthority('ROLE_STAFF') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<ComplaintResponse>> getAssignedComplaints(@AuthenticationPrincipal User currentUser) {
        List<ComplaintResponse> assigned = complaintService.getAssignedComplaints(currentUser.getId());
        return ResponseEntity.ok(assigned);
    }

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @PostMapping("/{id}/report-resolved")
    @PreAuthorize("hasAuthority('ROLE_STAFF')")
    public ResponseEntity<?> reportResolved(@PathVariable Long id, @AuthenticationPrincipal User currentUser) {
        return complaintRepository.findById(id)
                .map(complaint -> {
                    Notification notification = new Notification();
                    notification.setType("RESOLVED_PENDING");
                    notification.setMessage("Staff " + currentUser.getUsername() + " reports complaint #" +
                            complaint.getComplaintNumber() + " (\"" + complaint.getTitle()
                            + "\") as resolved. Awaiting admin approval.");
                    notification.setComplaintId(id);
                    notification.setCreatedBy(currentUser);
                    notificationRepository.save(notification);

                    Map<String, String> response = new HashMap<>();
                    response.put("message", "Complaint reported as resolved. Admin will be notified.");
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/request-status-change")
    @PreAuthorize("hasAuthority('ROLE_STAFF')")
    public ResponseEntity<?> requestStatusChange(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {

        String requestedStatus = body.get("requestedStatus");
        String comment = body.get("comment");

        if (requestedStatus == null || requestedStatus.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Requested status is required"));
        }

        // Validate status value
        try {
            ComplaintStatus.valueOf(requestedStatus);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid status: " + requestedStatus));
        }

        return complaintRepository.findById(id)
                .map(complaint -> {
                    Notification notification = new Notification();
                    notification.setType("STATUS_CHANGE_REQUEST");
                    notification.setRequestedStatus(requestedStatus);
                    notification.setMessage("Staff " + currentUser.getName() + " requests to change complaint #" +
                            complaint.getComplaintNumber() + " (\"" + complaint.getTitle() +
                            "\") from " + complaint.getStatus() + " to " + requestedStatus +
                            (comment != null ? ". Comment: " + comment : ""));
                    notification.setComplaintId(id);
                    notification.setCreatedBy(currentUser);
                    notificationRepository.save(notification);

                    Map<String, String> response = new HashMap<>();
                    response.put("message", "Status change request submitted. Admin will be notified.");
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
