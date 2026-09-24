package com.resolveit;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootTest
class ResolveItApplicationTests {

    @Test
    void contextLoads() {
    }

    @Test
    void testPasswordMatch() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawPassword = "agrim1234";
        String encodedPassword = "$2a$10$K7U4uS.k3R7QJ/pUfK8T/u.Q0J5jN1G5C/jP1fX5j2G.jC.jP1fX5";

        boolean matches = encoder.matches(rawPassword, encodedPassword);
        System.out.println("DEBUG: Password matches: " + matches);
    }

}
