package com.resolveit.controller;

import com.resolveit.model.Complaint;
import com.resolveit.model.ComplaintStatus;
import com.resolveit.repository.ComplaintRepository;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "http://localhost:3000")
public class ReportController {

    @Autowired
    private ComplaintRepository complaintRepository;

    // Get aggregated statistics
    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getStats() {
        List<Complaint> complaints = complaintRepository.findAll();

        Map<String, Object> stats = new HashMap<>();

        // Total counts
        stats.put("totalComplaints", complaints.size());
        stats.put("resolvedCount", complaints.stream().filter(c -> c.getStatus() == ComplaintStatus.RESOLVED).count());
        stats.put("closedCount", complaints.stream().filter(c -> c.getStatus() == ComplaintStatus.CLOSED).count());
        stats.put("pendingCount",
                complaints.stream().filter(
                        c -> c.getStatus() == ComplaintStatus.NEW || c.getStatus() == ComplaintStatus.UNDER_REVIEW)
                        .count());
        stats.put("escalatedCount", complaints.stream().filter(Complaint::isEscalated).count());

        // By Status
        Map<String, Long> byStatus = complaints.stream()
                .collect(Collectors.groupingBy(c -> c.getStatus().name(), Collectors.counting()));
        stats.put("byStatus", byStatus);

        // By Category
        Map<String, Long> byCategory = complaints.stream()
                .collect(Collectors.groupingBy(Complaint::getCategory, Collectors.counting()));
        stats.put("byCategory", byCategory);

        // By Priority
        Map<String, Long> byPriority = complaints.stream()
                .collect(Collectors.groupingBy(Complaint::getPriority, Collectors.counting()));
        stats.put("byPriority", byPriority);

        return ResponseEntity.ok(stats);
    }

    // Get trends over time (last 30 days)
    @GetMapping("/trends")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getTrends() {
        List<Complaint> complaints = complaintRepository.findAll();
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        // Group by date
        Map<String, Long> byDate = complaints.stream()
                .filter(c -> c.getCreatedAt().isAfter(thirtyDaysAgo))
                .collect(Collectors.groupingBy(
                        c -> c.getCreatedAt().toLocalDate().toString(),
                        Collectors.counting()));

        // Convert to list of objects for chart
        List<Map<String, Object>> trends = byDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    Map<String, Object> point = new HashMap<>();
                    point.put("date", entry.getKey());
                    point.put("count", entry.getValue());
                    return point;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(trends);
    }

    // Export complaints as CSV
    @GetMapping("/export/csv")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<byte[]> exportCsv() {
        List<Complaint> complaints = complaintRepository.findAll();

        StringBuilder csv = new StringBuilder();
        csv.append("Complaint Number,Title,Category,Priority,Status,Created By,Assigned To,Created At,Escalated\n");

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        for (Complaint c : complaints) {
            csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                    c.getComplaintNumber(),
                    c.getTitle().replace("\"", "\"\""),
                    c.getCategory(),
                    c.getPriority(),
                    c.getStatus().name(),
                    c.getCreatedBy() != null ? c.getCreatedBy().getEmail() : "N/A",
                    c.getAssignedTo() != null ? c.getAssignedTo().getEmail() : "Unassigned",
                    c.getCreatedAt().format(fmt),
                    c.isEscalated() ? "Yes" : "No"));
        }

        byte[] csvBytes = csv.toString().getBytes();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "complaints_report.csv");

        return ResponseEntity.ok().headers(headers).body(csvBytes);
    }

    // Export complaints as PDF
    @GetMapping("/export/pdf")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<byte[]> exportPdf() {
        List<Complaint> complaints = complaintRepository.findAll();

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            // Title
            Paragraph title = new Paragraph("ResolveIT - Complaints Report")
                    .setFontSize(20)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER);
            document.add(title);

            // Date
            Paragraph date = new Paragraph(
                    "Generated: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER);
            document.add(date);

            document.add(new Paragraph("\n"));

            // Summary stats
            long resolved = complaints.stream().filter(c -> c.getStatus() == ComplaintStatus.RESOLVED).count();
            long pending = complaints.stream()
                    .filter(c -> c.getStatus() == ComplaintStatus.NEW || c.getStatus() == ComplaintStatus.UNDER_REVIEW)
                    .count();
            long escalated = complaints.stream().filter(Complaint::isEscalated).count();

            document.add(new Paragraph("Summary: Total: " + complaints.size() + " | Resolved: " + resolved
                    + " | Pending: " + pending + " | Escalated: " + escalated));
            document.add(new Paragraph("\n"));

            // Table
            Table table = new Table(UnitValue.createPercentArray(new float[] { 15, 25, 15, 10, 15, 20 }))
                    .setWidth(UnitValue.createPercentValue(100));

            // Header
            table.addHeaderCell(new Cell().add(new Paragraph("ID").setBold()));
            table.addHeaderCell(new Cell().add(new Paragraph("Title").setBold()));
            table.addHeaderCell(new Cell().add(new Paragraph("Category").setBold()));
            table.addHeaderCell(new Cell().add(new Paragraph("Priority").setBold()));
            table.addHeaderCell(new Cell().add(new Paragraph("Status").setBold()));
            table.addHeaderCell(new Cell().add(new Paragraph("Created").setBold()));

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            for (Complaint c : complaints) {
                table.addCell(new Cell().add(new Paragraph(c.getComplaintNumber())));
                table.addCell(new Cell().add(new Paragraph(
                        c.getTitle().length() > 30 ? c.getTitle().substring(0, 30) + "..." : c.getTitle())));
                table.addCell(new Cell().add(new Paragraph(c.getCategory())));
                table.addCell(new Cell().add(new Paragraph(c.getPriority())));
                table.addCell(new Cell().add(new Paragraph(c.getStatus().name())));
                table.addCell(new Cell().add(new Paragraph(c.getCreatedAt().format(fmt))));
            }

            document.add(table);
            document.close();

            byte[] pdfBytes = baos.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "complaints_report.pdf");

            return ResponseEntity.ok().headers(headers).body(pdfBytes);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
