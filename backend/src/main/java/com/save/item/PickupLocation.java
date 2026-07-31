package com.save.item;

import com.save.university.University;
import jakarta.persistence.*;

@Entity
@Table(name = "pickup_locations", uniqueConstraints =
        @UniqueConstraint(name = "uk_pickup_location_university_name",
                columnNames = {"university_id", "name"}))
public class PickupLocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "university_id", nullable = false)
    private University university;

    @Column(nullable = false, length = 100)
    private String name;

    protected PickupLocation() {}

    public PickupLocation(University university, String name) {
        this.university = university;
        this.name = name;
    }

    public Integer getId() { return id; }
    public University getUniversity() { return university; }
    public String getName() { return name; }
}
