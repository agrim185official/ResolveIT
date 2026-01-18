package com.resolveit.dto;

import java.util.List;

public class StaffApplicationRequest {
    private List<Integer> answers; // List of selected answer indices (0-3 for A-D)

    public StaffApplicationRequest() {
    }

    public StaffApplicationRequest(List<Integer> answers) {
        this.answers = answers;
    }

    public List<Integer> getAnswers() {
        return answers;
    }

    public void setAnswers(List<Integer> answers) {
        this.answers = answers;
    }
}
