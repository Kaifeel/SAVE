package com.save.university;

import static org.assertj.core.api.Assertions.assertThat;

import com.save.item.PickupLocation;
import com.save.item.PickupLocationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class DevelopmentReferenceDataTest {
    @Autowired UniversityRepository universityRepository;
    @Autowired PickupLocationRepository pickupLocationRepository;

    @Test
    void seedsPukyongPickupLocations() {
        University university = universityRepository.findByName("부경대학교").orElseThrow();

        assertThat(pickupLocationRepository.findByUniversityIdOrderByName(university.getId()))
                .extracting(PickupLocation::getName)
                .contains("청운관", "중앙도서관", "누리관");
    }
}
