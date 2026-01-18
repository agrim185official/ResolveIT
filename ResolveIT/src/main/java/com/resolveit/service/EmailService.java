package com.resolveit.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.email.from:noreply@resolveit.com}")
    private String fromEmail;

    /**
     * Send email notification for status update
     */
    @Async
    public void sendStatusUpdateEmail(String toEmail, String complaintNumber, String oldStatus, String newStatus,
            String title) {
        if (mailSender == null) {
            logger.warn("Email service not configured. Skipping email to: {}", toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("ResolveIT: Status Update for " + complaintNumber);
            message.setText(String.format(
                    "Hello,\n\n" +
                            "Your complaint '%s' (%s) has been updated.\n\n" +
                            "Status changed from: %s\n" +
                            "Status changed to: %s\n\n" +
                            "Please log in to ResolveIT to view more details.\n\n" +
                            "Best regards,\n" +
                            "ResolveIT Team",
                    title, complaintNumber, oldStatus, newStatus));

            mailSender.send(message);
            logger.info("Status update email sent to: {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send status update email to {}: {}", toEmail, e.getMessage());
        }
    }

    /**
     * Send email notification for escalation
     */
    @Async
    public void sendEscalationEmail(String toEmail, String complaintNumber, String title, String priority) {
        if (mailSender == null) {
            logger.warn("Email service not configured. Skipping escalation email to: {}", toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("⚠️ ResolveIT: Complaint Escalated - " + complaintNumber);
            message.setText(String.format(
                    "Hello,\n\n" +
                            "Your complaint '%s' (%s) has been ESCALATED.\n\n" +
                            "Priority: %s\n" +
                            "This complaint has exceeded the expected resolution time and has been escalated " +
                            "to higher authorities for faster resolution.\n\n" +
                            "We apologize for any inconvenience and are working to resolve this as soon as possible.\n\n"
                            +
                            "Best regards,\n" +
                            "ResolveIT Team",
                    title, complaintNumber, priority));

            mailSender.send(message);
            logger.info("Escalation email sent to: {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send escalation email to {}: {}", toEmail, e.getMessage());
        }
    }

    /**
     * Send email notification when staff reports complaint as resolved
     */
    @Async
    public void sendStaffReportEmail(String userEmail, String adminEmail, String complaintNumber, String title,
            String staffName) {
        if (mailSender == null) {
            logger.warn("Email service not configured. Skipping staff report email.");
            return;
        }

        // Notify user
        try {
            SimpleMailMessage userMessage = new SimpleMailMessage();
            userMessage.setFrom(fromEmail);
            userMessage.setTo(userEmail);
            userMessage.setSubject("ResolveIT: Resolution Reported for " + complaintNumber);
            userMessage.setText(String.format(
                    "Hello,\n\n" +
                            "Good news! Staff member '%s' has reported your complaint '%s' (%s) as resolved.\n\n" +
                            "The admin will review and confirm the resolution shortly.\n\n" +
                            "Best regards,\n" +
                            "ResolveIT Team",
                    staffName, title, complaintNumber));

            mailSender.send(userMessage);
            logger.info("Staff report email sent to user: {}", userEmail);
        } catch (Exception e) {
            logger.error("Failed to send staff report email to user {}: {}", userEmail, e.getMessage());
        }

        // Notify admin
        try {
            SimpleMailMessage adminMessage = new SimpleMailMessage();
            adminMessage.setFrom(fromEmail);
            adminMessage.setTo(adminEmail);
            adminMessage.setSubject("ResolveIT: Staff Reported Resolution - " + complaintNumber);
            adminMessage.setText(String.format(
                    "Hello Admin,\n\n" +
                            "Staff member '%s' has reported complaint '%s' (%s) as resolved.\n\n" +
                            "Please log in to ResolveIT to review and approve the resolution.\n\n" +
                            "Best regards,\n" +
                            "ResolveIT System",
                    staffName, title, complaintNumber));

            mailSender.send(adminMessage);
            logger.info("Staff report email sent to admin: {}", adminEmail);
        } catch (Exception e) {
            logger.error("Failed to send staff report email to admin {}: {}", adminEmail, e.getMessage());
        }
    }

    /**
     * Send generic notification email
     */
    @Async
    public void sendNotificationEmail(String toEmail, String subject, String body) {
        if (mailSender == null) {
            logger.warn("Email service not configured. Skipping notification email to: {}", toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            logger.info("Notification email sent to: {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send notification email to {}: {}", toEmail, e.getMessage());
        }
    }
}
