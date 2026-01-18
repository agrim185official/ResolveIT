package com.resolveit.service;

import com.resolveit.dto.LoginRequest;
import com.resolveit.dto.RegisterRequest;
import com.resolveit.model.User;

public interface AuthService {
    String authenticateUser(LoginRequest loginRequest);

    User registerUser(RegisterRequest registerRequest);
}
