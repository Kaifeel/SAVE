package com.save.university;

import jakarta.persistence.*;

@Entity
@Table(name = "universities", uniqueConstraints =
        @UniqueConstraint(name = "uk_universities_name", columnNames = "name"))
public class University {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String name;

    protected University() {}

    public University(String name) {
        this.name = name;
    }

    public Integer getId() { return id; }
    public String getName() { return name; }
}
