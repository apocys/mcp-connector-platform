import React, { useState, useEffect } from 'react';

interface LogEntry {
  id: string;
  connectorId: string;
  toolName: string;
  method: string;
  path: string;
  deterministicDecision: string;
  reviewerDecision: string;
  reviewerRiskScore: number;
  finalDecision: string;
  humanApproved: boolean;
  reviewLatencyMs: number;
  executionLatencyMs: number;
  errorCode: string | null;
  createdAt: string;
}

export default function LogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'allowed' | 'blocked' | 'pending'>('all');
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Mock data
      setLogs([
        {
          id: 'log-1',
          connectorId: 'stripe-1',
          toolName: 'list_invoices',
          method: 'GET',
          path: '/v1/invoices',
          deterministicDecision: 'allowed',
          reviewerDecision: 'ALLOW',
          reviewerRiskScore: 15,
          finalDecision: 'allowed',
          humanApproved: false,
          reviewLatencyMs: 250,
          executionLatencyMs: 450,
          errorCode: null,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'log-2',
          connectorId: 'stripe-1',
          toolName: 'create_invoice',
          method: 'POST',
          path: '/v1/invoices',
          deterministicDecision: 'allowed',
          reviewerDecision: 'REQUIRE_HUMAN_APPROVAL',
          reviewerRiskScore: 45,
          finalDecision: 'pending',
          humanApproved: false,
          reviewLatencyMs: 280,
          executionLatencyMs: 0,
          errorCode: null,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'log-3',
          connectorId: 'stripe-1',
          toolName: 'delete_customer',
          method: 'DELETE',
          path: '/v1/customers/{id}',
          deterministicDecision: 'blocked',
          reviewerDecision: 'BLOCK',
          reviewerRiskScore: 85,
          finalDecision: 'blocked',
          humanApproved: false,
          reviewLatencyMs: 200,
          executionLatencyMs: 0,
          errorCode: 'GOVERNANCE_VIOLATION',
          createdAt: new Date(Date.now() - 900000).toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDecisionBadgeClass = (decision: string) => {
    if (decision === 'allowed') return 'badge-success';
    if (decision === 'blocked') return 'badge-danger';
    return 'badge-warning';
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="spinner"></div>
        <p>Loading logs...</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Invocation Logs</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['all', 'allowed', 'blocked', 'pending'] as const).map(f => (
            <button
              key={f}
              className={`button ${filter === f ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          <h3>No logs found</h3>
          <p>No invocations match the selected filter</p>
        </div>
      ) : (
        <div>
          {logs.map(log => (
            <div
              key={log.id}
              className="card"
              style={{
                cursor: 'pointer',
                borderLeft: selectedLog === log.id ? '4px solid #667eea' : '4px solid transparent',
              }}
              onClick={() => setSelectedLog(selectedLog === log.id ? null : log.id)}
            >
              <div className="card-header">
                <div>
                  <strong>{log.toolName}</strong>
                  <span style={{ marginLeft: '0.5rem' }} className="badge badge-info">
                    {log.method} {log.path}
                  </span>
                </div>
                <span className={`badge ${getDecisionBadgeClass(log.finalDecision)}`}>
                  {log.finalDecision}
                </span>
              </div>

              {selectedLog === log.id && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <h4>Deterministic Decision</h4>
                      <p style={{ color: '#666' }}>{log.deterministicDecision}</p>
                    </div>
                    <div>
                      <h4>AI Reviewer Decision</h4>
                      <p style={{ color: '#666' }}>
                        {log.reviewerDecision} (Risk: {log.reviewerRiskScore})
                      </p>
                    </div>
                    <div>
                      <h4>Review Latency</h4>
                      <p style={{ color: '#666' }}>{log.reviewLatencyMs}ms</p>
                    </div>
                    <div>
                      <h4>Execution Latency</h4>
                      <p style={{ color: '#666' }}>
                        {log.executionLatencyMs > 0 ? `${log.executionLatencyMs}ms` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {log.errorCode && (
                    <div style={{ marginTop: '1rem', background: '#ffebee', padding: '0.75rem', borderRadius: '4px' }}>
                      <strong>Error:</strong> {log.errorCode}
                    </div>
                  )}
                </div>
              )}

              <p className="card-meta">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
