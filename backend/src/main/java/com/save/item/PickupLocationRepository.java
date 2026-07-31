package com.save.item;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PickupLocationRepository extends JpaRepository<PickupLocation, Integer> {
    List<PickupLocation> findByUniversityIdOrderByName(Integer universityId);
    boolean existsByUniversityIdAndName(Integer universityId, String name);
}
