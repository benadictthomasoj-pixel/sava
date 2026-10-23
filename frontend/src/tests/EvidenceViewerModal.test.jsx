import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EvidenceViewerModal, { formatRetrievalScore } from '../components/EvidenceViewerModal';
import * as api from '../services/api';

describe('EvidenceViewerModal Component & Retrieval Score Formatting', () => {
  const mockCitations = [
    '[Ref 1] SQLite Asset Registry: ASSET-BRG-001 (Mandovi River Estuary Bridge)',
    '[Ref 2] Mandovi Bridge Pier Scour Audit 2023 (PDF), Page 1 - Page 1 by Public Works Dept (PWD) Engineering Wing (2023-11-18)',
  ];

  const mockEvidence = [
    {
      asset_id: 'ASSET-BRG-001',
      asset_name: 'Mandovi River Estuary Bridge',
      category: 'Bridge',
      district: 'North Goa',
      state: 'Goa',
      source: 'State Highway Authority',
      evidence_type: 'asset_telemetry_record',
      description: 'Status: Critical Attention | Risk Score: 88.5/100 | Health Index: 38.2% | Flags: Sub-surface Pier Scour Exceedance',
      risk_score: 88.5,
      status: 'Critical Attention',
      last_inspection_date: '2024-01-15',
      document_name: null,
      page_number: null,
      section_title: null,
      timestamp: null,
      excerpt: null,
      citation_label: 'Ref 1',
      relevance_score: 135.0,
      confidence_score: 135.0,
      source_file: 'sqlite:ASSET-BRG-001',
      file_type: 'SQLITE',
      chunk_id: 'sqlite-ASSET-BRG-001',
    },
    {
      asset_id: 'ASSET-BRG-001',
      asset_name: null,
      category: null,
      district: null,
      state: null,
      source: 'Public Works Dept (PWD) Engineering Wing',
      evidence_type: 'document_audit_passage',
      description: 'Section: Page 1 | File: Mandovi Bridge Pier Scour Audit 2023 (PDF)',
      document_name: 'Mandovi Bridge Pier Scour Audit 2023',
      page_number: 1,
      section_title: 'Page 1',
      timestamp: '2023-11-18',
      excerpt: 'Underwater bathymetric sonar inspection was conducted on 2023-11-18. Scour hole depth of 2.4 meters detected under Pier 4 footing, exceeding permissible tolerance by 65cm.',
      citation_label: 'Ref 2',
      relevance_score: 270.0,
      confidence_score: 270.0,
      source_file: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
      file_type: 'PDF',
      chunk_id: 'Mandovi_Bridge_Pier_Scour_Audit_2023-p1-c1',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatRetrievalScore Helper Function', () => {
    it('handles zero score accurately', () => {
      expect(formatRetrievalScore({ relevance_score: 0 })).toBe('0 pts');
      expect(formatRetrievalScore({ confidence_score: 0 })).toBe('0 pts');
      expect(formatRetrievalScore({ relevance_score: 0.0 })).toBe('0 pts');
    });

    it('formats typical scores accurately on the points scale without exceeding or fabricating percentages', () => {
      expect(formatRetrievalScore({ relevance_score: 85 })).toBe('85 pts');
      expect(formatRetrievalScore({ relevance_score: 135.4 })).toBe('135 pts');
      // The issue specifically reported: 270 must display as points, never 270%
      expect(formatRetrievalScore({ relevance_score: 270 })).toBe('270 pts');
      expect(formatRetrievalScore({ relevance_score: 270.0 })).toBe('270 pts');
    });

    it('handles maximum / large score values without artificial clamping to 100', () => {
      expect(formatRetrievalScore({ relevance_score: 500 })).toBe('500 pts');
      expect(formatRetrievalScore({ relevance_score: 1000 })).toBe('1000 pts');
    });

    it('handles out-of-range negative values gracefully by clamping to 0 pts', () => {
      expect(formatRetrievalScore({ relevance_score: -10 })).toBe('0 pts');
      expect(formatRetrievalScore({ relevance_score: -999.5 })).toBe('0 pts');
    });

    it('handles out-of-range or missing non-numeric inputs gracefully', () => {
      expect(formatRetrievalScore(null)).toBe('N/A');
      expect(formatRetrievalScore(undefined)).toBe('N/A');
      expect(formatRetrievalScore({})).toBe('N/A');
      expect(formatRetrievalScore({ relevance_score: null })).toBe('N/A');
      expect(formatRetrievalScore({ relevance_score: NaN })).toBe('N/A');
      expect(formatRetrievalScore({ relevance_score: 'invalid' })).toBe('N/A');
    });

    it('handles legacy decimal fractions (<= 1.0) by converting to points scale', () => {
      expect(formatRetrievalScore({ confidence_score: 0.85 })).toBe('85 pts');
      expect(formatRetrievalScore({ confidence_score: 0.95 })).toBe('95 pts');
    });
  });

  describe('EvidenceViewerModal UI Rendering', () => {
    it('1. Does not render when isOpen is false', () => {
      const { container } = render(
        <EvidenceViewerModal
          isOpen={false}
          onClose={vi.fn()}
          selectedCitationLabel="Ref 2"
          citations={mockCitations}
          evidence={mockEvidence}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('2. Displays document citation metadata and accurately labeled Retrieval Score (270 pts)', () => {
      render(
        <EvidenceViewerModal
          isOpen={true}
          onClose={vi.fn()}
          selectedCitationLabel="Ref 2"
          citations={mockCitations}
          evidence={mockEvidence}
        />
      );

      // Dialog title and Ground truth distinction
      expect(screen.getByText('Retrieved Supporting Evidence & Provenance')).toBeDefined();
      expect(screen.getByText(/100% Unaltered Retrieval Evidence/i)).toBeDefined();

      // Source metadata
      expect(screen.getByText('Mandovi Bridge Pier Scour Audit 2023')).toBeDefined();
      expect(screen.getAllByText(/Page 1/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Public Works Dept (PWD) Engineering Wing')).toBeDefined();
      expect(screen.getByText('2023-11-18')).toBeDefined();

      // Accurately labeled Retrieval Score (NOT "270% Confidence")
      expect(screen.getByText('Retrieval Score')).toBeDefined();
      expect(screen.getByText('270 pts')).toBeDefined();
      expect(screen.queryByText(/270% Confidence/i)).toBeNull();

      // Verbatim retrieved passage
      expect(
        screen.getByText(/Scour hole depth of 2\.4 meters detected under Pier 4 footing/i)
      ).toBeDefined();
    });

    it('3. Allows switching citations between document and telemetry records and shows accurate telemetry score', () => {
      render(
        <EvidenceViewerModal
          isOpen={true}
          onClose={vi.fn()}
          selectedCitationLabel="Ref 2"
          citations={mockCitations}
          evidence={mockEvidence}
        />
      );

      // Click on [Ref 1] tab
      const ref1Tab = screen.getByText('[Ref 1]').closest('button');
      expect(ref1Tab).toBeDefined();
      fireEvent.click(ref1Tab);

      // Should now display SQLite asset record details
      expect(screen.getByText('SQLite Asset Primary Entity')).toBeDefined();
      expect(screen.getByText('Mandovi River Estuary Bridge')).toBeDefined();
      expect(screen.getByText(/North Goa, Goa/i)).toBeDefined();
      expect(screen.getAllByText(/Risk Score: 88\.5\/100/i).length).toBeGreaterThanOrEqual(1);

      // Retrieval Score for Ref 1 (135 pts)
      expect(screen.getByText('135 pts')).toBeDefined();
    });

    it('4. Handles missing citations gracefully without fabricating content', () => {
      render(
        <EvidenceViewerModal
          isOpen={true}
          onClose={vi.fn()}
          selectedCitationLabel="Ref 99"
          citations={mockCitations}
          evidence={mockEvidence}
        />
      );

      // Missing citation banner
      expect(
        screen.getByText(/Citation \[Ref 99\] Not Found in Retrieved Set/i)
      ).toBeDefined();
      expect(
        screen.getByText(/To prevent hallucination, source content is never fabricated/i)
      ).toBeDefined();
    });

    it('5. Handles unavailable source documents gracefully when switching to document reader tab', async () => {
      vi.spyOn(api, 'fetchSourceDocument').mockRejectedValue(
        new Error("Source document 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf' is unavailable or not found in evidence repository.")
      );

      render(
        <EvidenceViewerModal
          isOpen={true}
          onClose={vi.fn()}
          selectedCitationLabel="Ref 2"
          citations={mockCitations}
          evidence={mockEvidence}
        />
      );

      // Click on "Full Source Document" tab
      const fullDocTab = screen.getByRole('button', { name: /Full Source Document/i });
      fireEvent.click(fullDocTab);

      // Should display graceful notice
      await waitFor(() => {
        expect(screen.getByText(/Source Document Archive Notice/i)).toBeDefined();
        expect(
          screen.getByText(/is unavailable or not found in evidence repository/i)
        ).toBeDefined();
      });

      // Option to return to verified excerpt
      const returnBtn = screen.getByRole('button', { name: /Return to Verified Excerpt/i });
      expect(returnBtn).toBeDefined();
      fireEvent.click(returnBtn);

      expect(
        screen.getByText(/Scour hole depth of 2\.4 meters detected under Pier 4 footing/i)
      ).toBeDefined();
    });

    it('6. Loads and displays full source document pages when available', async () => {
      vi.spyOn(api, 'fetchSourceDocument').mockResolvedValue({
        document_name: 'Mandovi Bridge Pier Scour Audit 2023',
        filename: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
        file_type: 'PDF',
        total_pages: 2,
        pages: [
          { page_number: 1, text: 'Mandovi Bridge Pier 4 Sonar Audit Report Page 1 text content' },
          { page_number: 2, text: 'Superstructure Joint Deflection Page 2 text content' },
        ],
        status: 'available',
      });

      render(
        <EvidenceViewerModal
          isOpen={true}
          onClose={vi.fn()}
          selectedCitationLabel="Ref 2"
          citations={mockCitations}
          evidence={mockEvidence}
        />
      );

      const fullDocTab = screen.getByRole('button', { name: /Full Source Document/i });
      fireEvent.click(fullDocTab);

      await waitFor(() => {
        expect(screen.getByText('Certified Archive File')).toBeDefined();
        expect(
          screen.getByText(/Mandovi Bridge Pier 4 Sonar Audit Report Page 1 text content/i)
        ).toBeDefined();
        expect(
          screen.getByText(/Superstructure Joint Deflection Page 2 text content/i)
        ).toBeDefined();
      });
    });

    it('7. Calls onClose when close button or Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <EvidenceViewerModal
          isOpen={true}
          onClose={handleClose}
          selectedCitationLabel="Ref 2"
          citations={mockCitations}
          evidence={mockEvidence}
        />
      );

      const closeBtn = screen.getByLabelText(/Close Evidence Viewer/i);
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });
});
