package com.jiahong.tennishub.model;

import lombok.Data;

@Data
public class Booking {
    private String BookingID;
    private String UserPhone;
    private String BookingDate;
    private String TimeSlot;
    private int Status; // 1: Active, 0: Cancelled
    private String CreatedAt;
    private String RoomNumber;
    private String maskedPhone;
}
