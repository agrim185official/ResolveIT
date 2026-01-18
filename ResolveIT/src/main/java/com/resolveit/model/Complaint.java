package com.resolveit.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Complaint Entity - Core data model for grievances/complaints
 * 
 * Database Table: complaints
 * 
 * Key Fields:
 * - complaintNumber: Auto-generated unique ID (format: COMP-YYYYMMDD-XXX)
 * - title/description: User-provided complaint details
 * - status: Current workflow state (NEW, UNDER_REVIEW, RESOLVED, CLOSED)
 * - category: Type of complaint (General, Technical, Billing, etc.)
 * - priority: Urgency level (Low, Medium, High, Critical)
 * - isAnonymous: Whether submitter identity is hidden
 * - isEscalated: Flag indicating urgent/escalated complaint
 * 
 * Relationships:
 * - createdBy: User who submitted the complaint
 * - assignedTo: Staff member handling the complaint (nullable)
 * - comments: Historical comments on the complaint
 * - updates: Status change audit trail
 * - attachments: Uploaded files (images, PDFs)
 */
@Entity
@Table(name = "complaints")
public class Complaint {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "complaint_number", unique = true, nullable = false, length = 20)
    private String complaintNumber;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ComplaintStatus status = ComplaintStatus.NEW;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, length = 20)
    private String priority;

    @Column(name = "is_anonymous", nullable = false)
    private boolean isAnonymous = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_escalated", nullable = false)
    private boolean isEscalated = false;

    @Column(name = "escalated_at")
    private LocalDateTime escalatedAt;

    @OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Comment> comments = new HashSet<>();

    @OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Attachment> attachments = new HashSet<>();

    @OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("updatedAt DESC")
    private Set<ComplaintUpdate> updates = new HashSet<>();

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ComplaintStatus getStatus() {
        return status;
    }

    public void setStatus(ComplaintStatus status) {
        this.status = status;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getComplaintNumber() {
        return complaintNumber;
    }

    public void setComplaintNumber(String complaintNumber) {
        this.complaintNumber = complaintNumber;
    }

    public boolean isAnonymous() {
        return isAnonymous;
    }

    public void setAnonymous(boolean anonymous) {
        isAnonymous = anonymous;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public User getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(User assignedTo) {
        this.assignedTo = assignedTo;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Set<Comment> getComments() {
        return comments;
    }

    public void setComments(Set<Comment> comments) {
        this.comments = comments;
    }

    public Set<Attachment> getAttachments() {
        return attachments;
    }

    public void setAttachments(Set<Attachment> attachments) {
        this.attachments = attachments;
    }

    public Set<ComplaintUpdate> getUpdates() {
        return updates;
    }

    public void setUpdates(Set<ComplaintUpdate> updates) {
        this.updates = updates;
    }

    public boolean isEscalated() {
        return isEscalated;
    }

    public void setEscalated(boolean escalated) {
        isEscalated = escalated;
    }

    public LocalDateTime getEscalatedAt() {
        return escalatedAt;
    }

    public void setEscalatedAt(LocalDateTime escalatedAt) {
        this.escalatedAt = escalatedAt;
    }

    // Helper methods
    public void addComment(Comment comment) {
        comments.add(comment);
        comment.setComplaint(this);
    }

    public void removeComment(Comment comment) {
        comments.remove(comment);
        comment.setComplaint(null);
    }

    public void addAttachment(Attachment attachment) {
        attachments.add(attachment);
        attachment.setComplaint(this);
    }

    public void removeAttachment(Attachment attachment) {
        attachments.remove(attachment);
        attachment.setComplaint(null);
    }

    public void addUpdate(ComplaintUpdate update) {
        updates.add(update);
        update.setComplaint(this);
    }
}
