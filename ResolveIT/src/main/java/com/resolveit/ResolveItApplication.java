package com.resolveit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * ResolveIT Application - A Grievance Management System
 *
 * This is the main entry point for the Spring Boot application.
 * The application provides a complete grievance/complaint management system
 * with:
 * - User registration and authentication (JWT-based)
 * - Role-based access control (ADMIN, STAFF, USER)
 * - Complaint creation, tracking, and resolution workflow
 * - File attachment support
 * - Email notifications for status updates
 * - Staff application and approval workflow
 *
 * @EnableScheduling - Enables scheduled tasks (e.g., auto-escalation of overdue complaints)
 * @EnableAsync      - Enables asynchronous method execution (e.g., sending emails in background)
 *
 * Default user seeding (admin + staff accounts) is handled by
 * {@link com.resolveit.config.DataInitializer}, which runs after the full
 * application context is ready and is completely idempotent.
 */
@SpringBootApplication
@EnableScheduling
@EnableAsync
public class ResolveItApplication {

    /**
     * Application entry point — bootstraps the Spring Boot application.
     */
    public static void main(String[] args) {
        SpringApplication.run(ResolveItApplication.class, args);
    }

    /**
     * Configures a dedicated thread pool for scheduled tasks so that background
     * jobs (e.g., auto-escalation) do not block the HTTP request threads.
     */
    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("scheduled-task-");
        scheduler.setErrorHandler(t -> System.err.println("Scheduled task error: " + t.getMessage()));
        return scheduler;
    }
}
