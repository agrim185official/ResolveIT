package com.resolveit.repository;

import com.resolveit.model.ApplicationStatus;
import com.resolveit.model.StaffApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffApplicationRepository extends JpaRepository<StaffApplication, Long> {

    List<StaffApplication> findByApplicantId(Long userId);

    List<StaffApplication> findByStatus(ApplicationStatus status);

    List<StaffApplication> findByStatusOrderBySubmittedAtDesc(ApplicationStatus status);

    boolean existsByApplicantIdAndStatus(Long userId, ApplicationStatus status);

    Optional<StaffApplication> findTopByApplicantIdOrderBySubmittedAtDesc(Long userId);
}
