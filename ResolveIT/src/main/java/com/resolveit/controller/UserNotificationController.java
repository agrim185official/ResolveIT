package com.resolveit.controller;

import com.resolveit.model.UserNotification;
import com.resolveit.repository.UserNotificationRepository;
import com.resolveit.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user-notifications")
@CrossOrigin(origins = "http://localhost:3000")
public class UserNotificationController {

    @Autowired
    private UserNotificationRepository userNotificationRepository;

    @Autowired
    private UserRepository userRepository;

    // Get all notifications for current user
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_USER', 'ROLE_ADMIN', 'ROLE_STAFF')")
    public ResponseEntity<List<Map<String, Object>>> getUserNotifications(Authentication authentication) {
        String username = authentication.getName();

        return userRepository.findByEmail(username)
                .map(user -> {
                    List<UserNotification> notifications = userNotificationRepository
                            .findByUserIdOrderByCreatedAtDesc(user.getId());

                    List<Map<String, Object>> response = notifications.stream().map(n -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", n.getId());
                        map.put("type", n.getType());
                        map.put("message", n.getMessage());
                        map.put("complaintId", n.getComplaintId());
                        map.put("isRead", n.isRead());
                        map.put("createdAt", n.getCreatedAt());
                        return map;
                    }).collect(Collectors.toList());

                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Get unread notification count
    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyAuthority('ROLE_USER', 'ROLE_ADMIN', 'ROLE_STAFF')")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication authentication) {
        String username = authentication.getName();

        return userRepository.findByEmail(username)
                .map(user -> {
                    Long count = userNotificationRepository.countByUserIdAndIsReadFalse(user.getId());
                    Map<String, Long> response = new HashMap<>();
                    response.put("count", count);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Mark notification as read
    @PutMapping("/{id}/read")
    @PreAuthorize("hasAnyAuthority('ROLE_USER', 'ROLE_ADMIN', 'ROLE_STAFF')")
    public ResponseEntity<Map<String, String>> markAsRead(@PathVariable Long id, Authentication authentication) {
        return userNotificationRepository.findById(id)
                .map(notification -> {
                    notification.setRead(true);
                    userNotificationRepository.save(notification);
                    Map<String, String> response = new HashMap<>();
                    response.put("message", "Notification marked as read");
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Mark all notifications as read
    @PutMapping("/read-all")
    @PreAuthorize("hasAnyAuthority('ROLE_USER', 'ROLE_ADMIN', 'ROLE_STAFF')")
    public ResponseEntity<Map<String, String>> markAllAsRead(Authentication authentication) {
        String username = authentication.getName();

        return userRepository.findByEmail(username)
                .map(user -> {
                    List<UserNotification> unread = userNotificationRepository
                            .findByUserIdAndIsReadFalseOrderByCreatedAtDesc(user.getId());
                    unread.forEach(n -> n.setRead(true));
                    userNotificationRepository.saveAll(unread);

                    Map<String, String> response = new HashMap<>();
                    response.put("message", "All notifications marked as read");
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
