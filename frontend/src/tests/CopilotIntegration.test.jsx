import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CopilotPlaceholder from '../pages/CopilotPlaceholder';
import * as api from '../services/api';

describe('CopilotPlaceholder Evidence Viewer Integration', () => {
  const mockCopilotResponse = {
    question: 'What did the underwater sonar scour audit find for Mandovi Bridge Pier 4?',
    matched_assets_count: 1,
    answer: 'The underwater sonar audit for Mandovi Bridge [Ref 2] identified significant scour near Pier 4 footing. The asset [Ref 1] is currently in Critical Attention status.',
    observed_facts: [
      '[Ref 2] Underwater bathymetric sonar inspection revealed 2.4m scour hole depth.',
      '[Ref 1] ASSET-BRG-001 has risk score of 88.5/100.',
    ],
    recommendations: [
      '[Ref 1] Priority: Immediate sub-surface rip-rap armouring around Pier 4 footing.',
    ],
    citations: [
      '[Ref 1] SQLite Asset Registry: ASSET-BRG-001 (Mandovi River Estuary Bridge)',
      '[Ref 2] Mandovi Bridge Pier Scour Audit 2023 (PDF), Page 1 - Page 1 by Public Works Dept (PWD) Engineering Wing (2023-11-18)',
    ],
    evidence_sufficiency: 'sufficient',
    confidence_level: 'High',
    limitations_note: 'Grounded response generated via certified engineering audits.',
    pipeline_type: 'retrieval_only_fallback',
    evidence: [
      {
        asset_id: 'ASSET-BRG-001',
        asset_name: 'Mandovi River Estuary Bridge',
        category: 'Bridge',
        district: 'North Goa',
        state: 'Goa',
        source: 'State Highway Authority',
        evidence_type: 'asset_telemetry_record',
        description: 'Status: Critical Attention | Risk Score: 88.5/100',
        risk_score: 88.5,
        status: 'Critical Attention',
        last_inspection_date: '2024-01-15',
        citation_label: 'Ref 1',
        confidence_score: 0.95,
        source_file: 'sqlite:ASSET-BRG-001',
        file_type: 'SQLITE',
        chunk_id: 'sqlite-ASSET-BRG-001',
      },
      {
        asset_id: 'ASSET-BRG-001',
        document_name: 'Mandovi Bridge Pier Scour Audit 2023',
        source: 'Public Works Dept (PWD) Engineering Wing',
        evidence_type: 'document_audit_passage',
        description: 'Section: Page 1 | File: Mandovi Bridge Pier Scour Audit 2023 (PDF)',
        page_number: 1,
        section_title: 'Page 1',
        timestamp: '2023-11-18',
        excerpt: 'Underwater bathymetric sonar inspection was conducted on 2023-11-18. Scour hole depth of 2.4 meters detected under Pier 4 footing.',
        citation_label: 'Ref 2',
        confidence_score: 0.85,
        source_file: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
        file_type: 'PDF',
        chunk_id: 'Mandovi_Bridge_Pier_Scour_Audit_2023-p1-c1',
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Renders citations in citation box and opens modal on clicking Inspect Evidence', async () => {
    vi.spyOn(api, 'askCopilot').mockResolvedValue(mockCopilotResponse);

    render(<CopilotPlaceholder assets={[]} onNavigate={vi.fn()} />);

    // Trigger inquiry
    const input = screen.getByPlaceholderText(/Ask about any infrastructure asset/i);
    fireEvent.change(input, { target: { value: 'Mandovi Bridge scour' } });
    fireEvent.submit(input.closest('form'));

    // Wait for response to render
    await waitFor(() => {
      expect(screen.getByText('Evidence Citations & Source Provenance')).toBeDefined();
    });

    // Inspect Evidence button in citation list
    const inspectButtons = screen.getAllByRole('button', { name: /Inspect Evidence/i });
    expect(inspectButtons.length).toBe(2);

    // Click the second citation inspect button (Ref 2)
    fireEvent.click(inspectButtons[1]);

    // Modal should be open displaying Mandovi document metadata
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Retrieved Supporting Evidence & Provenance')).toBeDefined();
    expect(within(modal).getByText('Mandovi Bridge Pier Scour Audit 2023')).toBeDefined();
    expect(within(modal).getByText(/Scour hole depth of 2\.4 meters detected/i)).toBeDefined();
  });

  it('2. Clicking inline citation button [Ref 2] in the answer opens modal for Ref 2', async () => {
    vi.spyOn(api, 'askCopilot').mockResolvedValue(mockCopilotResponse);

    render(<CopilotPlaceholder assets={[]} onNavigate={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Ask about any infrastructure asset/i);
    fireEvent.change(input, { target: { value: 'Mandovi Bridge scour' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText('Grounded Technical Synthesis')).toBeDefined();
    });

    // Find inline citation buttons for Ref 2
    const ref2Buttons = screen.getAllByRole('button', { name: /\[Ref 2\]/i });
    expect(ref2Buttons.length).toBeGreaterThanOrEqual(1);

    // Click the inline [Ref 2] button
    fireEvent.click(ref2Buttons[0]);

    // Modal should open
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Retrieved Supporting Evidence & Provenance')).toBeDefined();
    expect(within(modal).getByText('Mandovi Bridge Pier Scour Audit 2023')).toBeDefined();
  });

  it('3. Clicking Inspect button on an evidence card opens modal for that evidence item', async () => {
    vi.spyOn(api, 'askCopilot').mockResolvedValue(mockCopilotResponse);

    render(<CopilotPlaceholder assets={[]} onNavigate={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Ask about any infrastructure asset/i);
    fireEvent.change(input, { target: { value: 'Mandovi Bridge scour' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/Retrieved Evidence Passages & Records/i)).toBeDefined();
    });

    // Find Inspect buttons on evidence cards
    const inspectCardBtns = screen.getAllByRole('button', { name: /^Inspect$/i });
    expect(inspectCardBtns.length).toBe(2);

    // Click Inspect on first card (Ref 1)
    fireEvent.click(inspectCardBtns[0]);

    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Retrieved Supporting Evidence & Provenance')).toBeDefined();
    expect(within(modal).getByText('SQLite Asset Primary Entity')).toBeDefined();
    expect(within(modal).getByText('Mandovi River Estuary Bridge')).toBeDefined();
  });
});
