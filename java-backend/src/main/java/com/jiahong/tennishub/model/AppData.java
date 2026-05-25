package com.jiahong.tennishub.model;

import lombok.Data;
import java.util.HashMap;
import java.util.Map;

@Data
public class AppData {
    private Map<String, Map<String, Booking>> bookings = new HashMap<>();
    private Map<String, String> residents = new HashMap<>();
    private String adminPassword = "jiahong888";

    public AppData() {
        // Initial defaults
        residents.put("13812345678", "3-702");
        residents.put("13900001111", "1-101");
        residents.put("13788889999", "2-505");
    }
}
