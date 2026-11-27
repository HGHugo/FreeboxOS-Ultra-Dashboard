import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DashboardGate } from './components/DashboardGate';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DashboardGate>
      <App />
    </DashboardGate>
  </React.StrictMode>
);
