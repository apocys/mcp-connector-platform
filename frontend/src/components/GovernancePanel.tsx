import React, { useState } from 'react';

interface Props {
  connectorId: string;
  onBack: () => void;
}

export default function GovernancePanel({ connectorId, onBack }: Props) {
  const [governance, setGovernance] = useState({
    allowedVerbs: ['GET'],
    rateLimitPerMinute: 60,
    requireApprovalForWrites: true,
    requireApprovalForHighRisk: true,
    dryRunMode: false,
    aiReviewerEnabled: true,
    aiReviewerMode: 'ENFORCING',
    aiReviewerTimeoutMs: 2000,
    aiReviewerAllowMaxRisk: 30,
    aiReviewerApprovalMinRisk: 31,
    aiReviewerBlockMinRisk: 71,
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (field: string, value: any) => {
    setGovernance(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    // Mock save
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Governance Rules - {connectorId}</h2>
        <button className="button button-secondary" onClick={onBack}>
          ← Back
        </button>
      </div>

      {saved && <div className="alert alert-success">✓ Governance rules saved successfully</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Deterministic Rules */}
        <div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Deterministic Rules</h3>

          <div className="form-group">
            <label>Allowed HTTP Verbs</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(verb => (
                <label key={verb} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input
                    type="checkbox"
                    checked={governance.allowedVerbs.includes(verb)}
                    onChange={e => {
                      if (e.target.checked) {
                        handleChange('allowedVerbs', [...governance.allowedVerbs, verb]);
                      } else {
                        handleChange('allowedVerbs', governance.allowedVerbs.filter(v => v !== verb));
                      }
                    }}
                  />
                  {verb}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Rate Limit (requests per minute)</label>
            <input
              type="number"
              value={governance.rateLimitPerMinute}
              onChange={e => handleChange('rateLimitPerMinute', parseInt(e.target.value))}
              min="1"
              max="10000"
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={governance.requireApprovalForWrites}
                onChange={e => handleChange('requireApprovalForWrites', e.target.checked)}
              />
              {' '}Require Approval for WRITE Operations
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={governance.requireApprovalForHighRisk}
                onChange={e => handleChange('requireApprovalForHighRisk', e.target.checked)}
              />
              {' '}Require Approval for High-Risk Operations
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={governance.dryRunMode}
                onChange={e => handleChange('dryRunMode', e.target.checked)}
              />
              {' '}Dry Run Mode (simulate without executing)
            </label>
          </div>
        </div>

        {/* AI Reviewer Configuration */}
        <div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>AI Reviewer (Point 12)</h3>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={governance.aiReviewerEnabled}
                onChange={e => handleChange('aiReviewerEnabled', e.target.checked)}
              />
              {' '}Enable AI Reviewer
            </label>
          </div>

          {governance.aiReviewerEnabled && (
            <>
              <div className="form-group">
                <label>Reviewer Mode</label>
                <select
                  value={governance.aiReviewerMode}
                  onChange={e => handleChange('aiReviewerMode', e.target.value)}
                >
                  <option value="ADVISORY">Advisory (recommendations only)</option>
                  <option value="ENFORCING">Enforcing (gates execution)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Timeout (milliseconds)</label>
                <input
                  type="number"
                  value={governance.aiReviewerTimeoutMs}
                  onChange={e => handleChange('aiReviewerTimeoutMs', parseInt(e.target.value))}
                  min="500"
                  max="10000"
                />
              </div>

              <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>Risk Thresholds</h4>
                <div className="form-group">
                  <label>Allow (risk score 0-{governance.aiReviewerAllowMaxRisk})</label>
                  <input
                    type="number"
                    value={governance.aiReviewerAllowMaxRisk}
                    onChange={e => handleChange('aiReviewerAllowMaxRisk', parseInt(e.target.value))}
                    min="0"
                    max="100"
                  />
                </div>

                <div className="form-group">
                  <label>Require Approval ({governance.aiReviewerApprovalMinRisk}-{governance.aiReviewerBlockMinRisk - 1})</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number"
                      value={governance.aiReviewerApprovalMinRisk}
                      onChange={e => handleChange('aiReviewerApprovalMinRisk', parseInt(e.target.value))}
                      min="0"
                      max="100"
                      style={{ flex: 1 }}
                    />
                    <span style={{ alignSelf: 'center' }}>to</span>
                    <input
                      type="number"
                      value={governance.aiReviewerBlockMinRisk - 1}
                      onChange={e => handleChange('aiReviewerBlockMinRisk', parseInt(e.target.value) + 1)}
                      min="0"
                      max="100"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Block (risk score {governance.aiReviewerBlockMinRisk}+)</label>
                  <input
                    type="number"
                    value={governance.aiReviewerBlockMinRisk}
                    onChange={e => handleChange('aiReviewerBlockMinRisk', parseInt(e.target.value))}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
        <button className="button button-primary" onClick={handleSave}>
          Save Governance Rules
        </button>
      </div>
    </div>
  );
}
