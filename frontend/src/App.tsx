import React, { useState } from 'react';
import './App.css';
import ConnectorList from './components/ConnectorList';
import CreateConnector from './components/CreateConnector';
import GovernancePanel from './components/GovernancePanel';
import ApprovalQueue from './components/ApprovalQueue';
import LogsViewer from './components/LogsViewer';

type Page = 'connectors' | 'create' | 'governance' | 'approvals' | 'logs';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('connectors');
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  const handleSelectConnector = (id: string) => {
    setSelectedConnectorId(id);
    setCurrentPage('governance');
  };

  const handleCreateConnector = () => {
    setCurrentPage('create');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>MCP Connector Platform</h1>
        <nav className="app-nav">
          <button
            className={currentPage === 'connectors' ? 'active' : ''}
            onClick={() => setCurrentPage('connectors')}
          >
            Connectors
          </button>
          <button
            className={currentPage === 'approvals' ? 'active' : ''}
            onClick={() => setCurrentPage('approvals')}
          >
            Approvals
          </button>
          <button
            className={currentPage === 'logs' ? 'active' : ''}
            onClick={() => setCurrentPage('logs')}
          >
            Logs
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentPage === 'connectors' && (
          <ConnectorList
            onSelectConnector={handleSelectConnector}
            onCreateConnector={handleCreateConnector}
          />
        )}

        {currentPage === 'create' && (
          <CreateConnector
            onSuccess={() => setCurrentPage('connectors')}
            onCancel={() => setCurrentPage('connectors')}
          />
        )}

        {currentPage === 'governance' && selectedConnectorId && (
          <GovernancePanel
            connectorId={selectedConnectorId}
            onBack={() => setCurrentPage('connectors')}
          />
        )}

        {currentPage === 'approvals' && (
          <ApprovalQueue />
        )}

        {currentPage === 'logs' && (
          <LogsViewer />
        )}
      </main>
    </div>
  );
}
