package com.jiahong.tennishub.controller;

import com.jiahong.tennishub.model.AppData;
import com.jiahong.tennishub.model.Booking;
import com.jiahong.tennishub.service.DataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class BookingController {

    @Autowired
    private DataService dataService;

    @GetMapping("/bookings")
    public Map<String, Map<String, Booking>> getBookings() {
        return dataService.getData().getBookings();
    }

    @GetMapping("/residents")
    public Map<String, String> getResidents() {
        return dataService.getData().getResidents();
    }

    @PostMapping("/residents")
    public ResponseEntity<?> addResident(@RequestBody Map<String, String> req) throws IOException {
        String phone = req.get("phone");
        String room = req.get("room");
        if (phone == null || room == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "缺少手机号或房号"));
        }
        dataService.getData().getResidents().put(phone, room);
        dataService.save();
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/residents/{phone}")
    public ResponseEntity<?> deleteResident(@PathVariable String phone) throws IOException {
        if (dataService.getData().getResidents().containsKey(phone)) {
            dataService.getData().getResidents().remove(phone);
            dataService.save();
            return ResponseEntity.ok(Map.of("success", true));
        }
        return ResponseEntity.status(404).body(Map.of("error", "未找到该住户"));
    }

    @PostMapping("/book")
    public ResponseEntity<?> book(@RequestBody Map<String, String> req) throws IOException {
        String date = req.get("date");
        String slot = req.get("slot");
        String phone = req.get("phone");

        if (date == null || slot == null || phone == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "缺少必要信息"));
        }

        AppData data = dataService.getData();
        String roomNumber = data.getResidents().get(phone);
        if (roomNumber == null) {
            return ResponseEntity.ok(Map.of("success", false, "error", "非白名单住户，无法预定"));
        }

        Map<String, Booking> dayBookings = data.getBookings().computeIfAbsent(date, k -> new HashMap<>());

        // Concurrency Check
        if (dayBookings.containsKey(slot) && dayBookings.get(slot).getStatus() != 0) {
            return ResponseEntity.ok(Map.of("success", false, "error", "该时段已被占用，请刷新重试"));
        }

        // Limit Check (2 slots per day)
        long count = dayBookings.values().stream()
                .filter(b -> b.getUserPhone().equals(phone) && b.getStatus() != 0)
                .count();
        if (count >= 2) {
            return ResponseEntity.ok(Map.of("success", false, "error", "每户单日限约 2 场"));
        }

        Booking b = new Booking();
        b.setBookingID("BK" + UUID.randomUUID().toString().substring(0, 7).toUpperCase());
        b.setUserPhone(phone);
        b.setBookingDate(date);
        b.setTimeSlot(slot);
        b.setStatus(1);
        b.setCreatedAt(Instant.now().toString());
        b.setRoomNumber(roomNumber);
        b.setMaskedPhone(phone.replaceAll("(\\d{3})\\d{4}(\\d{4})", "$1****$2"));

        dayBookings.put(slot, b);
        dataService.save();

        return ResponseEntity.ok(Map.of("success", true, "booking", b));
    }

    @PostMapping("/cancel")
    public ResponseEntity<?> cancel(@RequestBody Map<String, String> req) throws IOException {
        String date = req.get("date");
        String slot = req.get("slot");
        String phone = req.get("phone");

        AppData data = dataService.getData();
        Map<String, Booking> dayBookings = data.getBookings().get(date);
        if (dayBookings != null && dayBookings.containsKey(slot) && dayBookings.get(slot).getUserPhone().equals(phone)) {
            dayBookings.get(slot).setStatus(0);
            dataService.save();
            return ResponseEntity.ok(Map.of("success", true));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "取消失败：未找到预定或无权操作"));
    }
}
