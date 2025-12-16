import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Connector {
  id: string;
  name: string;
  baseUrl: string;
  deploymentStatus: string;
  createdAt: string;
}

interface Props {
  onSelectConnector: (id: string) => void;
  onCreateConnector: () => void;
}

export default function ConnectorList({ onSelectConnector, onCreateConnector }: Props) {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectors();
  }, []);

  const fetchConnectors = async () => {
    try {
      setLoading(true);
      // Mock data for demo
      setConnectors([
        {
          id: 'stripe-1',
          name: 'Stripe API',
          baseUrl: 'https://api.stripe.com',
          deploymentStatus: 'deployed',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'github-1',
          name: 'GitHub API',
          baseUrl: 'https://api.github.com',
          deploymentStatus: 'deployed',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="spinner"></div>
        <p>Loading connectors...</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Connectors</h2>
        <button className="button button-primary" onClick={onCreateConnector}>
          + Create Connector
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {connectors.length === 0 ? (
        <div className="empty-state">
          <h3>No connectors yet</h3>
          <p>Create your first connector to get started</p>
          <button className="button button-primary" onClick={onCreateConnector}>
            Create Connector
          </button>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Base URL</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {connectors.map(connector => (
              <tr key={connector.id}>
                <td>
                  <strong>{connector.name}</strong>
                </td>
                <td>
                  <code>{connector.baseUrl}</code>
                </td>
                <td>
                  <span
                    className={`badge badge-${
                      connector.deploymentStatus === 'deployed' ? 'success' : 'warning'
                    }`}
                  >
                    {connector.deploymentStatus}
                  </span>
                </td>
                <td>{new Date(connector.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="button button-secondary"
                    onClick={() => onSelectConnector(connector.id)}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
