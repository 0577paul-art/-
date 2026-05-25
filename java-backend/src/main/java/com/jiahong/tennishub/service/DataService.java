package com.jiahong.tennishub.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jiahong.tennishub.model.AppData;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;

@Service
public class DataService {
    private final String DATA_FILE = "data.json";
    private final ObjectMapper mapper = new ObjectMapper();
    private AppData data;

    @Value("${ADMIN_PASSWORD:jiahong888}")
    private String envAdminPassword;

    @PostConstruct
    public void init() throws IOException {
        File file = new File(DATA_FILE);
        if (file.exists()) {
            try {
                data = mapper.readValue(file, AppData.class);
            } catch (Exception e) {
                System.err.println("Failed to load data.json, using defaults");
                data = new AppData();
                data.setAdminPassword(envAdminPassword);
            }
        } else {
            data = new AppData();
            data.setAdminPassword(envAdminPassword);
            save();
        }
    }

    public synchronized void save() throws IOException {
        mapper.writerWithDefaultPrettyPrinter().writeValue(new File(DATA_FILE), data);
    }

    public AppData getData() {
        return data;
    }
}
