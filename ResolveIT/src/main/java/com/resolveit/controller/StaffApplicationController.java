package com.resolveit.controller;

import com.resolveit.dto.StaffApplicationRequest;
import com.resolveit.dto.StaffApplicationResponse;
import com.resolveit.model.User;
import com.resolveit.service.StaffApplicationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff-applications")
public class StaffApplicationController {

    @Autowired
    private StaffApplicationService applicationService;

    /**
     * Get test questions (for users)
     */
    @GetMapping("/questions")
    public ResponseEntity<List<Map<String, Object>>> getTestQuestions() {
        return ResponseEntity.ok(applicationService.getTestQuestions());
    }

    /**
     * Submit staff application with test answers
     */
    @PostMapping("/submit")
    public ResponseEntity<?> submitApplication(
            @RequestBody StaffApplicationRequest request,
            @AuthenticationPrincipal User currentUser) {
        try {
            StaffApplicationResponse response = applicationService.submitApplication(currentUser, request);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get current user's application status
     */
    @GetMapping("/my-status")
    public ResponseEntity<?> getMyApplicationStatus(@AuthenticationPrincipal User currentUser) {
        StaffApplicationResponse status = applicationService.getMyApplicationStatus(currentUser.getId());
        if (status == null) {
            return ResponseEntity.ok(Map.of("hasApplied", false));
        }
        return ResponseEntity.ok(status);
    }

    /**
     * Get all pending applications (admin only)
     */
    @GetMapping("/pending")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<StaffApplicationResponse>> getPendingApplications() {
        return ResponseEntity.ok(applicationService.getPendingApplications());
    }

    /**
     * Get application by ID (admin only)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getApplicationById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(applicationService.getApplicationById(id));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Approve application and promote user to staff (admin only)
     */
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> approveApplication(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin) {
        try {
            StaffApplicationResponse response = applicationService.approveApplication(id, admin);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Reject application (admin only)
     */
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> rejectApplication(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal User admin) {
        try {
            String reason = body != null ? body.get("reason") : null;
            StaffApplicationResponse response = applicationService.rejectApplication(id, admin, reason);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get all staff members (admin only)
     */
    @GetMapping("/staff-list")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<Map<String, String>>> getAllStaffMembers() {
        return ResponseEntity.ok(applicationService.getAllStaffMembers());
    }
}
