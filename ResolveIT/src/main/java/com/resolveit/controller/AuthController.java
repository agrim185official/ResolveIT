package com.resolveit.controller;

import com.resolveit.dto.JwtAuthenticationResponse;
import com.resolveit.dto.LoginRequest;
import com.resolveit.dto.RegisterRequest;
import com.resolveit.model.Role;
import com.resolveit.model.User;
import com.resolveit.repository.UserRepository;
import com.resolveit.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            String token = authService.authenticateUser(loginRequest);

            // Fetch user to get their role
            User user = userRepository.findByUsernameOrEmail(
                    loginRequest.getUsernameOrEmail(),
                    loginRequest.getUsernameOrEmail())
                    .orElse(null);

            String role = "ROLE_USER"; // Default role
            if (user != null) {
                Set<Role> roles = user.getRoles();
                if (roles.contains(Role.ROLE_ADMIN)) {
                    role = "ROLE_ADMIN";
                } else if (roles.contains(Role.ROLE_STAFF)) {
                    role = "ROLE_STAFF";
                }
            }

            return ResponseEntity.ok(new JwtAuthenticationResponse(token, role));
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body("Invalid username or password");
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            User user = authService.registerUser(registerRequest);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("message", e.getMessage()));
        }
    }
}
