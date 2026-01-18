package com.resolveit.service;

import com.resolveit.dto.StaffApplicationRequest;
import com.resolveit.dto.StaffApplicationResponse;
import com.resolveit.model.*;
import com.resolveit.repository.StaffApplicationRepository;
import com.resolveit.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class StaffApplicationService {

    @Autowired
    private StaffApplicationRepository applicationRepository;

    @Autowired
    private UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Correct answers for the test (0-indexed: 0=A, 1=B, 2=C, 3=D)
    private static final int[] CORRECT_ANSWERS = { 1, 1, 1, 2, 1, 1, 1, 1, 1, 1 };

    /**
     * Get test questions for staff application
     */
    public List<Map<String, Object>> getTestQuestions() {
        List<Map<String, Object>> questions = new ArrayList<>();

        questions.add(createQuestion(1,
                "What is the primary goal of a grievance management system?",
                Arrays.asList("To ignore complaints", "To resolve issues efficiently", "To create more problems",
                        "To delay responses")));

        questions.add(createQuestion(2,
                "How should you prioritize grievances?",
                Arrays.asList("Random order", "By urgency and impact", "Oldest first always", "Newest first always")));

        questions.add(createQuestion(3,
                "What is the best response time target for urgent issues?",
                Arrays.asList("1 week", "24-48 hours", "1 month", "No target needed")));

        questions.add(createQuestion(4,
                "How should you communicate with a frustrated user?",
                Arrays.asList("Ignore them", "Be defensive", "Listen empathetically and professionally",
                        "Argue back")));

        questions.add(createQuestion(5,
                "What should you do if you cannot resolve an issue?",
                Arrays.asList("Close it anyway", "Escalate to appropriate authority", "Delete the complaint",
                        "Blame the user")));

        questions.add(createQuestion(6,
                "Why is documentation important in grievance handling?",
                Arrays.asList("It's not important", "For accountability and tracking", "To waste time",
                        "To confuse users")));

        questions.add(createQuestion(7,
                "What is proper follow-up etiquette?",
                Arrays.asList("Never follow up", "Follow up once resolved to ensure satisfaction",
                        "Follow up every hour", "Only if user complains again")));

        questions.add(createQuestion(8,
                "How should confidential information be handled?",
                Arrays.asList("Share with everyone", "Keep it secure and private", "Post on social media",
                        "Ignore privacy rules")));

        questions.add(createQuestion(9,
                "What is the correct status flow for a complaint?",
                Arrays.asList("NEW → CLOSED", "NEW → UNDER_REVIEW → RESOLVED → CLOSED", "CLOSED → NEW",
                        "Any order works")));

        questions.add(createQuestion(10,
                "What attitude should staff maintain?",
                Arrays.asList("Indifferent", "Helpful and solution-oriented", "Rude", "Lazy")));

        return questions;
    }

    private Map<String, Object> createQuestion(int number, String question, List<String> options) {
        Map<String, Object> q = new LinkedHashMap<>();
        q.put("number", number);
        q.put("question", question);
        q.put("options", options);
        return q;
    }

    /**
     * Submit a staff application with test answers
     */
    @Transactional
    public StaffApplicationResponse submitApplication(User applicant, StaffApplicationRequest request) {
        // Check if user already has a pending application
        if (applicationRepository.existsByApplicantIdAndStatus(applicant.getId(), ApplicationStatus.PENDING)) {
            throw new IllegalStateException("You already have a pending application");
        }

        // Check if user is already staff
        if (applicant.getRoles().contains(Role.ROLE_STAFF) || applicant.getRoles().contains(Role.ROLE_ADMIN)) {
            throw new IllegalStateException("You are already a staff member or admin");
        }

        // Calculate score
        List<Integer> answers = request.getAnswers();
        if (answers == null || answers.size() != CORRECT_ANSWERS.length) {
            throw new IllegalArgumentException("Invalid number of answers. Expected " + CORRECT_ANSWERS.length);
        }

        int score = 0;
        for (int i = 0; i < CORRECT_ANSWERS.length; i++) {
            if (answers.get(i) != null && answers.get(i) == CORRECT_ANSWERS[i]) {
                score++;
            }
        }

        // Save application
        String answersJson;
        try {
            answersJson = objectMapper.writeValueAsString(answers);
        } catch (Exception e) {
            answersJson = answers.toString();
        }

        StaffApplication application = new StaffApplication(applicant, score, CORRECT_ANSWERS.length, answersJson);
        application = applicationRepository.save(application);

        return convertToResponse(application);
    }

    /**
     * Get user's latest application status
     */
    public StaffApplicationResponse getMyApplicationStatus(Long userId) {
        return applicationRepository.findTopByApplicantIdOrderBySubmittedAtDesc(userId)
                .map(this::convertToResponse)
                .orElse(null);
    }

    /**
     * Get all pending applications (for admin)
     */
    public List<StaffApplicationResponse> getPendingApplications() {
        return applicationRepository.findByStatusOrderBySubmittedAtDesc(ApplicationStatus.PENDING)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    /**
     * Get application by ID (for admin)
     */
    public StaffApplicationResponse getApplicationById(Long id) {
        return applicationRepository.findById(id)
                .map(this::convertToResponse)
                .orElseThrow(() -> new NoSuchElementException("Application not found"));
    }

    /**
     * Approve application and promote user to staff
     */
    @Transactional
    public StaffApplicationResponse approveApplication(Long applicationId, User admin) {
        StaffApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NoSuchElementException("Application not found"));

        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new IllegalStateException("Application is not pending");
        }

        // Update application status
        application.setStatus(ApplicationStatus.APPROVED);
        application.setReviewedAt(LocalDateTime.now());
        application.setReviewedBy(admin);

        // Get number of existing staff to generate staff name
        Long staffCount = userRepository.countByRole(Role.ROLE_STAFF);
        int staffNumber = staffCount.intValue() + 1;
        String newStaffName = "Staff" + staffNumber;

        // Promote user to staff and rename
        User applicant = application.getApplicant();
        applicant.setName(newStaffName);
        applicant.getRoles().clear();
        applicant.addRole(Role.ROLE_STAFF);
        userRepository.save(applicant);

        application = applicationRepository.save(application);

        return convertToResponse(application);
    }

    /**
     * Get all staff members
     */
    public List<Map<String, String>> getAllStaffMembers() {
        List<User> staffUsers = userRepository.findByRole(Role.ROLE_STAFF);
        List<Map<String, String>> staffList = new ArrayList<>();

        for (User staff : staffUsers) {
            Map<String, String> staffInfo = new LinkedHashMap<>();
            staffInfo.put("id", staff.getEmail());
            staffInfo.put("name", staff.getName());
            staffList.add(staffInfo);
        }

        return staffList;
    }

    /**
     * Reject application
     */
    @Transactional
    public StaffApplicationResponse rejectApplication(Long applicationId, User admin, String reason) {
        StaffApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NoSuchElementException("Application not found"));

        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new IllegalStateException("Application is not pending");
        }

        application.setStatus(ApplicationStatus.REJECTED);
        application.setReviewedAt(LocalDateTime.now());
        application.setReviewedBy(admin);
        application.setRejectionReason(reason);

        application = applicationRepository.save(application);

        return convertToResponse(application);
    }

    private StaffApplicationResponse convertToResponse(StaffApplication app) {
        StaffApplicationResponse response = new StaffApplicationResponse();
        response.setId(app.getId());
        response.setApplicantId(app.getApplicant().getId());
        response.setApplicantName(app.getApplicant().getName());
        response.setApplicantEmail(app.getApplicant().getEmail());
        response.setStatus(app.getStatus());
        response.setTestScore(app.getTestScore());
        response.setTotalQuestions(app.getTotalQuestions());
        response.setScorePercentage(app.getScorePercentage());
        response.setIsPassing(app.isPassing());
        response.setSubmittedAt(app.getSubmittedAt());
        response.setReviewedAt(app.getReviewedAt());
        if (app.getReviewedBy() != null) {
            response.setReviewedByName(app.getReviewedBy().getName());
        }
        response.setRejectionReason(app.getRejectionReason());
        return response;
    }
}
