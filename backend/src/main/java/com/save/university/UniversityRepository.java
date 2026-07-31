package com.save.university;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UniversityRepository extends JpaRepository<University, Integer> {
    Optional<University> findByName(String name);
}
