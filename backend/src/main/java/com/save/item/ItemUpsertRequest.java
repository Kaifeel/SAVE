package com.save.item;

import java.util.ArrayList;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public class ItemUpsertRequest {
    private String title;
    private Integer price;
    private String priceUnit;
    private String pickupLocation;
    private String type;
    private String university;
    private String description;
    private String precautions;
    private List<MultipartFile> photos = new ArrayList<>();

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Integer getPrice() { return price; }
    public void setPrice(Integer price) { this.price = price; }
    public String getPriceUnit() { return priceUnit; }
    public void setPriceUnit(String priceUnit) { this.priceUnit = priceUnit; }
    public String getPickupLocation() { return pickupLocation; }
    public void setPickupLocation(String pickupLocation) { this.pickupLocation = pickupLocation; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getUniversity() { return university; }
    public void setUniversity(String university) { this.university = university; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getPrecautions() { return precautions; }
    public void setPrecautions(String precautions) { this.precautions = precautions; }
    public List<MultipartFile> getPhotos() { return photos; }
    public void setPhotos(List<MultipartFile> photos) { this.photos = photos; }
}
