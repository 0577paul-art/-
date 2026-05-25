package com.jiahong.tennishub.controller;

import com.jiahong.tennishub.service.DataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private DataService dataService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> req) {
        String username = req.get("username");
        String password = req.get("password");
        if ("admin".equals(username) && dataService.getData().getAdminPassword().equals(password)) {
            return ResponseEntity.ok(Map.of("success", true, "token", "admin-token-" + System.currentTimeMillis()));
        }
        return ResponseEntity.status(401).body(Map.of("error", "用户名或密码错误"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> req) throws IOException {
        String newPassword = req.get("newPassword");
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "密码长度至少为6位"));
        }
        dataService.getData().setAdminPassword(newPassword);
        dataService.save();
        return ResponseEntity.ok(Map.of("success", true));
    }
}
