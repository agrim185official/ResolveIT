package com.resolveit.service;

import com.resolveit.model.Complaint;
import com.resolveit.model.ComplaintStatus;
import com.resolveit.repository.ComplaintRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class EscalationService {

    private static final Logger logger = LoggerFactory.getLogger(EscalationService.class);

    @Autowired
    private ComplaintRepository complaintRepository;

    // Escalation thresholds in days based on priority
    private int getEscalationDays(String priority) {
        if (priority == null)
            return 15; // Default to LOW
        switch (priority.toUpperCase()) {
            case "CRITICAL":
                return 3;
            case "HIGH":
                return 7;
            case "MEDIUM":
                return 10;
            case "LOW":
            default:
                return 15;
        }
    }

    /**
     * Scheduled job that runs every hour to check for complaints that need
     * escalation.
     * Escalates complaints that have exceeded their time threshold based on
     * priority.
     */
    @Scheduled(fixedRate = 3600000) // Run every hour (3600000 ms)
    @Transactional(timeout = 30)
    public void checkAndEscalateComplaints() {
        logger.info("Running escalation check...");

        // Get all non-resolved, non-closed, non-escalated complaints
        List<Complaint> complaints = complaintRepository.findAll();

        int escalatedCount = 0;
        LocalDateTime now = LocalDateTime.now();

        for (Complaint complaint : complaints) {
            // Skip already escalated, resolved, or closed complaints
            if (complaint.isEscalated() ||
                    complaint.getStatus() == ComplaintStatus.RESOLVED ||
                    complaint.getStatus() == ComplaintStatus.CLOSED) {
                continue;
            }

            // Calculate days since creation
            long daysSinceCreation = ChronoUnit.DAYS.between(complaint.getCreatedAt(), now);
            int escalationThreshold = getEscalationDays(complaint.getPriority());

            // Escalate if exceeded threshold
            if (daysSinceCreation >= escalationThreshold) {
                try {
                    complaint.setEscalated(true);
                    complaint.setEscalatedAt(now);
                    complaintRepository.save(complaint);
                    escalatedCount++;
                    logger.info("Escalated complaint {} (Priority: {}, Days: {})",
                            complaint.getComplaintNumber(), complaint.getPriority(), daysSinceCreation);
                } catch (Exception e) {
                    logger.warn("Could not escalate complaint {} - likely concurrent update: {}",
                            complaint.getComplaintNumber(), e.getMessage());
                }
            }
        }

        logger.info("Escalation check complete. Escalated {} complaints.", escalatedCount);
    }

    /**
     * Manual method to check escalation for a single complaint.
     * Useful for immediate escalation check after status changes.
     */
    @Transactional
    public boolean checkEscalation(Complaint complaint) {
        if (complaint.isEscalated() ||
                complaint.getStatus() == ComplaintStatus.RESOLVED ||
                complaint.getStatus() == ComplaintStatus.CLOSED) {
            return false;
        }

        long daysSinceCreation = ChronoUnit.DAYS.between(complaint.getCreatedAt(), LocalDateTime.now());
        int escalationThreshold = getEscalationDays(complaint.getPriority());

        if (daysSinceCreation >= escalationThreshold) {
            complaint.setEscalated(true);
            complaint.setEscalatedAt(LocalDateTime.now());
            complaintRepository.save(complaint);
            return true;
        }
        return false;
    }
}
