package com.resolveit.repository;

import com.resolveit.model.Complaint;
import com.resolveit.model.ComplaintStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findByCreatedById(Long userId);

    List<Complaint> findByAssignedToId(Long userId);

    Long countByStatus(ComplaintStatus status);

    Page<Complaint> findByStatus(ComplaintStatus status, Pageable pageable);

    Optional<Complaint> findByComplaintNumber(String complaintNumber);

    Optional<Complaint> findTopByOrderByIdDesc();

    Optional<Complaint> findTopByOrderByComplaintNumberDesc();

    // This method is used by the isOwner check in ComplaintService
    default boolean existsByIdAndCreatedBy(Long id, Long createdBy) {
        return findById(id)
                .map(complaint -> complaint.getCreatedBy().getId().equals(createdBy))
                .orElse(false);
    }
}
