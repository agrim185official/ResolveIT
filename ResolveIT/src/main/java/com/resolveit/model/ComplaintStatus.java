package com.resolveit.model;

public enum ComplaintStatus {
    NEW,
    UNDER_REVIEW,
    RESOLVED,
    CLOSED,
    // Legacy values for backward compatibility
    OPEN,
    IN_PROGRESS
}
