/**
 * API Service for AAYAM Infrastructure Intelligence Layer
 * Communicates with FastAPI backend with structured error handling.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Fetch backend health status
 */
export async function fetchHealth() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Health check failed with status: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Failed to connect to backend health endpoint:', err);
    throw err;
  }
}

/**
 * Fetch summary statistics for dashboard cards
 */
export async function fetchAssetStats() {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/summary/stats`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Stats endpoint failed with status: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch asset summary stats:', err);
    throw err;
  }
}

/**
 * Fetch infrastructure assets with optional filters
 * @param {Object} params - { category, status, district, search }
 */
export async function fetchAssets(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') {
      query.append('category', params.category);
    }
    if (params.status && params.status !== 'All') {
      query.append('status', params.status);
    }
    if (params.district) {
      query.append('district', params.district);
    }
    if (params.search) {
      query.append('search', params.search);
    }

    const url = `${BASE_URL}/api/assets${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch assets (HTTP ${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error('API Error in fetchAssets:', err);
    throw err;
  }
}

/**
 * Fetch single asset detail by unique ID
 * @param {string} assetId
 */
export async function fetchAssetById(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Asset '${assetId}' was not found in registry.`);
      }
      throw new Error(`Failed to load asset details (HTTP ${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetById(${assetId}):`, err);
    throw err;
  }
}

/**
 * Submit an inquiry to the AI Decision Copilot
 * @param {string} question - The infrastructure inquiry text
 */
export async function askCopilot(question, options = {}) {
  if (!question || !question.trim()) {
    throw new Error('Please enter a question before submitting.');
  }

  try {
    const payload = { question: question.trim() };
    if (options.asset_id) payload.asset_id = options.asset_id;
    if (options.category && options.category !== 'All') payload.category = options.category;

    const res = await fetch(`${BASE_URL}/api/copilot/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMessage = `Server error (HTTP ${res.status})`;
      try {
        const errorData = await res.json();
        if (errorData && errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch (parseErr) {
        // use default HTTP error
      }
      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (err) {
    console.error('API Error in askCopilot:', err);
    throw err;
  }
}

/**
 * Fetch dynamic Digital Heartbeat telemetry and explainable factor breakdown
 * @param {string} assetId
 */
export async function fetchAssetHeartbeat(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/heartbeat`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch heartbeat for '${assetId}' (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetHeartbeat(${assetId}):`, err);
    throw err;
  }
}

/**
 * Fetch all historical and pending inspection records for an asset
 * @param {string} assetId
 */
export async function fetchAssetInspections(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/inspections`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to load inspections for '${assetId}' (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetInspections(${assetId}):`, err);
    throw err;
  }
}

/**
 * Record a new field inspection and recommended action
 * @param {string} assetId
 * @param {Object} data - { inspection_date, inspection_type, findings, recommended_action, actual_action_taken, responsible_user, evidence_references }
 */
export async function createInspection(assetId, data) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/inspections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Failed to record inspection (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in createInspection(${assetId}):`, err);
    throw err;
  }
}

/**
 * Update an inspection action status or intervention details
 * @param {string} inspectionId
 * @param {Object} data - { status, actual_action_taken, evidence_references }
 */
export async function updateInspection(inspectionId, data) {
  try {
    const res = await fetch(`${BASE_URL}/api/inspections/${encodeURIComponent(inspectionId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Failed to update inspection (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in updateInspection(${inspectionId}):`, err);
    throw err;
  }
}

/**
 * Verify outcome of an intervention in the closed-loop workflow
 * @param {string} inspectionId
 * @param {Object} data - { verification_notes, verification_date, verifier_name }
 */
export async function verifyInspectionOutcome(inspectionId, data) {
  try {
    const res = await fetch(`${BASE_URL}/api/inspections/${encodeURIComponent(inspectionId)}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Failed to verify inspection outcome (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in verifyInspectionOutcome(${inspectionId}):`, err);
    throw err;
  }
}

/**
 * Fetch unified chronological timeline for an asset
 * @param {string} assetId
 */
export async function fetchAssetTimeline(assetId) {
  try {
    const res = await fetch(`${BASE_URL}/api/assets/${encodeURIComponent(assetId)}/timeline`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to load timeline for '${assetId}' (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error in fetchAssetTimeline(${assetId}):`, err);
    throw err;
  }
}



