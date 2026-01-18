package com.resolveit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.context.annotation.Bean;
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
 * @EnableScheduling - Enables scheduled tasks (e.g., auto-escalation of overdue
 *                   complaints)
 * @EnableAsync - Enables asynchronous method execution (e.g., sending emails in
 *              background)
 */
@SpringBootApplication
@EnableScheduling
@EnableAsync
public class ResolveItApplication {

    /**
     * Application entry point - Bootstraps the Spring Boot application
     */
    public static void main(String[] args) {
        SpringApplication.run(ResolveItApplication.class, args);
    }

    // Configure a dedicated thread pool for scheduled tasks to avoid blocking HTTP
    // requests
    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("scheduled-task-");
        scheduler.setErrorHandler(t -> System.err.println("Scheduled task error: " + t.getMessage()));
        return scheduler;
    }

    @org.springframework.context.annotation.Bean
    public org.springframework.boot.CommandLineRunner updateStaffRole(
            com.resolveit.repository.UserRepository userRepository,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        return args -> {
            // ========== DELETE OLD ADMIN USERS ==========
            String adminEmail = "admin@gmail.com";
            userRepository.findByEmail(adminEmail).ifPresent(admin -> {
                userRepository.delete(admin);
                System.out.println("🗑️ Deleted admin@gmail.com from database");
            });

            String testAdminEmail = "testadmin@gmail.com";
            userRepository.findByEmail(testAdminEmail).ifPresent(testAdmin -> {
                userRepository.delete(testAdmin);
                System.out.println("🗑️ Deleted testadmin@gmail.com from database");
            });

            // ========== DEMOTE DEMOX TO NORMAL USER ==========
            String demoAdminEmail = "demox@gmail.com";
            userRepository.findByEmail(demoAdminEmail).ifPresent(demoAdmin -> {
                demoAdmin.getRoles().clear();
                demoAdmin.addRole(com.resolveit.model.Role.ROLE_USER);
                userRepository.save(demoAdmin);
                System.out.println("✅ Demoted demox@gmail.com to ROLE_USER");
            });

            // ========== DEMOTE ADMIN1 TO NORMAL USER ==========
            String admin1Email = "admin1@gmail.com";
            userRepository.findByEmail(admin1Email).ifPresent(admin1 -> {
                admin1.getRoles().clear();
                admin1.addRole(com.resolveit.model.Role.ROLE_USER);
                userRepository.save(admin1);
                System.out.println("✅ Demoted admin1@gmail.com to ROLE_USER");
            });

            // ========== AGRIM185 ADMIN SETUP ==========
            String newAdminEmail = "agrim185official@gmail.com";
            java.util.Optional<com.resolveit.model.User> existingAdmin = userRepository.findByEmail(newAdminEmail);

            if (existingAdmin.isPresent()) {
                // User exists - promote to admin
                com.resolveit.model.User admin = existingAdmin.get();
                admin.getRoles().clear();
                admin.addRole(com.resolveit.model.Role.ROLE_ADMIN);
                userRepository.save(admin);
                System.out.println("✅ Promoted agrim185official@gmail.com to ROLE_ADMIN");
            } else {
                // User doesn't exist - create new admin user
                com.resolveit.model.User newAdmin = new com.resolveit.model.User(
                        "agrim185", // username
                        newAdminEmail, // email
                        passwordEncoder.encode("agrim1234"), // password matched to provided credentials
                        "Agrim Admin" // name
                );
                newAdmin.addRole(com.resolveit.model.Role.ROLE_ADMIN);
                userRepository.save(newAdmin);
                System.out.println("✅ Created agrim185official@gmail.com with ROLE_ADMIN (password: agrim1234)");
            }

            // ========== STAFF1 SETUP ==========
            String email = "staff1@gmail.com";
            java.util.Optional<com.resolveit.model.User> existingUser = userRepository.findByEmail(email);

            if (existingUser.isPresent()) {
                // User exists - update role, password, and name
                com.resolveit.model.User user = existingUser.get();
                user.setName("Staff1"); // Ensure proper naming
                user.getRoles().clear();
                user.addRole(com.resolveit.model.Role.ROLE_STAFF);
                user.setPassword(passwordEncoder.encode("staff1")); // Reset password
                userRepository.save(user);
                System.out.println("✅ Updated staff1@gmail.com to ROLE_STAFF as Staff1 (password reset to: staff1)");
            } else {
                // User doesn't exist - create new staff user
                com.resolveit.model.User newStaff = new com.resolveit.model.User(
                        "staff1", // username
                        email, // email
                        passwordEncoder.encode("staff1"), // password
                        "Staff1" // name - serial naming
                );
                newStaff.addRole(com.resolveit.model.Role.ROLE_STAFF);
                userRepository.save(newStaff);
                System.out.println("✅ Created staff1@gmail.com with ROLE_STAFF as Staff1 (password: staff1)");
            }
        };
    }

}
