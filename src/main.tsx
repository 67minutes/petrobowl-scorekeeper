import React from 'react';
import ReactDOM from 'react-dom/client';
import './ui/theme.css';
import { App } from './ui/App';
import { enableCrossWindowSync } from './store/store';

enableCrossWindowSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
