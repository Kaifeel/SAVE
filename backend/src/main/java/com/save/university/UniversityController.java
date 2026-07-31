package com.save.university;

import com.save.item.PickupLocation;
import com.save.item.PickupLocationRepository;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/universities")
public class UniversityController {
    private final UniversityRepository universityRepository;
    private final PickupLocationRepository pickupLocationRepository;

    public UniversityController(UniversityRepository universityRepository,
                                PickupLocationRepository pickupLocationRepository) {
        this.universityRepository = universityRepository;
        this.pickupLocationRepository = pickupLocationRepository;
    }

    @GetMapping
    public List<UniversityResponse> list() {
        return universityRepository.findAll().stream()
                .map(UniversityResponse::from).toList();
    }

    @GetMapping("/{universityId}/pickup-locations")
    public List<PickupLocationResponse> pickupLocations(@PathVariable Integer universityId) {
        return pickupLocationRepository.findByUniversityIdOrderByName(universityId)
                .stream().map(PickupLocationResponse::from).toList();
    }

    public record UniversityResponse(Integer id, String name) {
        static UniversityResponse from(University university) {
            return new UniversityResponse(university.getId(), university.getName());
        }
    }

    public record PickupLocationResponse(Integer id, String name) {
        static PickupLocationResponse from(PickupLocation location) {
            return new PickupLocationResponse(location.getId(), location.getName());
        }
    }
}
