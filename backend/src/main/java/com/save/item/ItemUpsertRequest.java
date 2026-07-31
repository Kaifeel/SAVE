package com.save.item;

import java.util.ArrayList;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public class ItemUpsertRequest {
    private String title;
    private Integer rentalFee;
    private String rentalUnit;
    private Integer pickupLocationId;
    private String type;
    private String description;
    private String precautions;
    private List<MultipartFile> photos = new ArrayList<>();

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Integer getRentalFee() { return rentalFee; }
    public void setRentalFee(Integer rentalFee) { this.rentalFee = rentalFee; }
    public String getRentalUnit() { return rentalUnit; }
    public void setRentalUnit(String rentalUnit) { this.rentalUnit = rentalUnit; }
    public Integer getPickupLocationId() { return pickupLocationId; }
    public void setPickupLocationId(Integer pickupLocationId) {
        this.pickupLocationId = pickupLocationId;
    }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getPrecautions() { return precautions; }
    public void setPrecautions(String precautions) { this.precautions = precautions; }
    public List<MultipartFile> getPhotos() { return photos; }
    public void setPhotos(List<MultipartFile> photos) { this.photos = photos; }
}
