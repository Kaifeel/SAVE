package com.save.university;

import com.save.common.BusinessException;
import com.save.item.PickupLocation;
import com.save.item.PickupLocationRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/universities")
@PreAuthorize("hasRole('ADMIN')")
public class UniversityAdminController {
    private final UniversityRepository universityRepository;
    private final PickupLocationRepository pickupLocationRepository;

    public UniversityAdminController(UniversityRepository universityRepository,
                                     PickupLocationRepository pickupLocationRepository) {
        this.universityRepository = universityRepository;
        this.pickupLocationRepository = pickupLocationRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public UniversityResult createUniversity(@Valid @RequestBody NameRequest request) {
        String name = request.name().trim();
        if (universityRepository.findByName(name).isPresent()) {
            throw new BusinessException(HttpStatus.CONFLICT, "이미 등록된 대학입니다.");
        }
        University saved = universityRepository.save(new University(name));
        return new UniversityResult(saved.getId(), saved.getName());
    }

    @PostMapping("/{universityId}/pickup-locations")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public PickupLocationResult createPickupLocation(
            @PathVariable Integer universityId, @Valid @RequestBody NameRequest request) {
        University university = universityRepository.findById(universityId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND,
                        "등록되지 않은 대학입니다."));
        String name = request.name().trim();
        if (pickupLocationRepository.existsByUniversityIdAndName(universityId, name)) {
            throw new BusinessException(HttpStatus.CONFLICT, "이미 등록된 수령 장소입니다.");
        }
        PickupLocation saved = pickupLocationRepository.save(new PickupLocation(university, name));
        return new PickupLocationResult(saved.getId(), saved.getName());
    }

    public record NameRequest(@NotBlank @Size(max = 100) String name) {}
    public record UniversityResult(Integer id, String name) {}
    public record PickupLocationResult(Integer id, String name) {}
}
