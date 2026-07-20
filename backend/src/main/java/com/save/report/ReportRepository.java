package com.save.report;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, Integer> {
    List<Report> findAllByOrderByCreatedAtDesc();
}
