import React, { useState, useEffect } from 'react';

interface Approval {
  id: string;
  connectorId: string;
  toolName: string;
  method: string;
  path: string;
  arguments: Record<string, any>;
  reviewerRiskScore: number;
  reviewerReasons: string[];
  createdAt: string;
  expiresAt: string;
}

export default function ApprovalQueue() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      // Mock data
      setApprovals([
        {
          id: 'approval-1',
          connectorId: 'stripe-1',
          toolName: 'create_invoice',
          method: 'POST',
          path: '/v1/invoices',
          arguments: { amount: 5000, currency: 'USD', customer_id: 'cus_123' },
          reviewerRiskScore: 45,
          reviewerReasons: [
            'High-impact write operation',
            'Large numeric value (amount: 5000)',
            'Payment-related endpoint',
          ],
          createdAt: new Date(Date.now() - 300000).toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Error fetching approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      // Mock approval
      await new Promise(resolve => setTimeout(resolve, 500));
      setApprovals(approvals.filter(a => a.id !== id));
      setSelectedApproval(null);
    } catch (err) {
      console.error('Error approving:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      // Mock rejection
      await new Promise(resolve => setTimeout(resolve, 500));
      setApprovals(approvals.filter(a => a.id !== id));
      setSelectedApproval(null);
    } catch (err) {
      console.error('Error rejecting:', err);
    }
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="spinner"></div>
        <p>Loading approvals...</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Approval Queue</h2>
        <span className="badge badge-warning">{approvals.length} pending</span>
      </div>

      {approvals.length === 0 ? (
        <div className="empty-state">
          <h3>No pending approvals</h3>
          <p>All requests have been processed</p>
        </div>
      ) : (
        <div>
          {approvals.map(approval => (
            <div
              key={approval.id}
              className="card"
              style={{
                cursor: 'pointer',
                borderLeft: selectedApproval === approval.id ? '4px solid #667eea' : '4px solid transparent',
              }}
              onClick={() => setSelectedApproval(selectedApproval === approval.id ? null : approval.id)}
            >
              <div className="card-header">
                <div>
                  <strong>{approval.toolName}</strong>
                  <span style={{ marginLeft: '0.5rem' }} className="badge badge-info">
                    {approval.method} {approval.path}
                  </span>
                </div>
                <span className={`badge badge-${approval.reviewerRiskScore > 60 ? 'danger' : 'warning'}`}>
                  Risk: {approval.reviewerRiskScore}
                </span>
              </div>

              {selectedApproval === approval.id && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                  <h4>Arguments:</h4>
                  <pre style={{ background: '#f5f5f5', padding: '0.75rem', borderRadius: '4px', overflow: 'auto' }}>
                    {JSON.stringify(approval.arguments, null, 2)}
                  </pre>

                  <h4 style={{ marginTop: '1rem' }}>AI Reviewer Assessment:</h4>
                  <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                    {approval.reviewerReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>

                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="button button-success"
                      onClick={() => handleApprove(approval.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="button button-danger"
                      onClick={() => handleReject(approval.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              <p className="card-meta">
                Created {new Date(approval.createdAt).toLocaleTimeString()} •
                Expires {new Date(approval.expiresAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
