import React, { useState } from 'react';
import axios from 'axios';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreateConnector({ onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<'upload' | 'config' | 'endpoints' | 'deploy'>('upload');
  const [formData, setFormData] = useState({
    name: '',
    openApiUrl: '',
    baseUrl: '',
    authType: 'bearer_token',
    authSecret: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Mock API call to parse OpenAPI spec
      const response = await axios.post('http://localhost:3000/api/connectors', {
        name: formData.name,
        openApiUrl: formData.openApiUrl,
        baseUrl: formData.baseUrl,
        authType: formData.authType,
        authSecret: formData.authSecret,
      });

      setEndpoints(response.data.endpoints || []);
      setSelectedEndpoints(response.data.endpoints.map((e: any) => e.path) || []);
      setStep('endpoints');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEndpoint = (path: string) => {
    setSelectedEndpoints(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Mock deployment
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStep('deploy');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Create New Connector</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {step === 'upload' && (
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Connector Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Stripe API"
              required
            />
          </div>

          <div className="form-group">
            <label>OpenAPI URL</label>
            <input
              type="url"
              name="openApiUrl"
              value={formData.openApiUrl}
              onChange={handleInputChange}
              placeholder="https://api.example.com/openapi.json"
              required
            />
          </div>

          <div className="form-group">
            <label>Base URL (auto-detected, editable)</label>
            <input
              type="url"
              name="baseUrl"
              value={formData.baseUrl}
              onChange={handleInputChange}
              placeholder="https://api.example.com"
            />
          </div>

          <div className="form-group">
            <label>Authentication Type</label>
            <select name="authType" value={formData.authType} onChange={handleInputChange}>
              <option value="bearer_token">Bearer Token</option>
              <option value="api_key">API Key</option>
            </select>
          </div>

          <div className="form-group">
            <label>Authentication Secret</label>
            <input
              type="password"
              name="authSecret"
              value={formData.authSecret}
              onChange={handleInputChange}
              placeholder="Your API key or token"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? 'Parsing...' : 'Next: Select Endpoints'}
            </button>
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {step === 'endpoints' && (
        <div>
          <h3>Select Endpoints to Expose</h3>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Choose which endpoints to expose via MCP. Read-only endpoints are selected by default.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            {endpoints.map((endpoint: any) => (
              <div key={endpoint.path} className="card">
                <div className="card-header">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedEndpoints.includes(endpoint.path)}
                      onChange={() => handleToggleEndpoint(endpoint.path)}
                    />
                    <strong>{endpoint.method}</strong> {endpoint.path}
                  </label>
                  <span className={`badge badge-${endpoint.category === 'READ' ? 'success' : 'warning'}`}>
                    {endpoint.category}
                  </span>
                </div>
                <p className="card-meta">{endpoint.summary}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="button button-primary"
              onClick={handleDeploy}
              disabled={loading || selectedEndpoints.length === 0}
            >
              {loading ? 'Deploying...' : 'Deploy Connector'}
            </button>
            <button className="button button-secondary" onClick={() => setStep('upload')}>
              Back
            </button>
          </div>
        </div>
      )}

      {step === 'deploy' && (
        <div className="empty-state">
          <h3>✓ Connector Deployed Successfully!</h3>
          <p>Your MCP server is now live and ready to use with Claude.</p>
          <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', marginTop: '1rem', textAlign: 'left' }}>
            <p><strong>MCP URL:</strong> <code>https://mcp.example.com/stripe-1</code></p>
            <p><strong>Token:</strong> <code>mcp_xxxxxxxxxxxxx</code></p>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
              Paste the URL into Claude Custom Connectors and use the token for authentication.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
