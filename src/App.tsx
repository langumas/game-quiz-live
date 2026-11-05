import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { OverlayView } from './components/OverlayView';
import { AdminDashboard } from './components/AdminDashboard';

export const App: React.FC = () => {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/overlay"
            element={
              <div className="w-screen h-screen overflow-hidden">
                <OverlayView />
              </div>
            }
          />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
};

export default App;

