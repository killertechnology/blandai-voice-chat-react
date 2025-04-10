// src/App.tsx
import React, { useState, useEffect } from 'react';
import VoiceChat from './components/VoiceChat';
import LandingPage from '../src/LandingPage';

function App() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate agent creation or retrieval.
  useEffect(() => {
    // Replace this with your actual agent creation logic if needed.
    // For example, call createWebAgent() and then set the agentId.
    setTimeout(() => {
      // Simulated agent response: note that your agent property is named "agent_id".
      setAgentId("b794640f-8222-4d2b-ac35-488b0dcfd9ef");
    }, 500); // Simulate a small delay.
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black flex items-center justify-center p-4">
      {!started ? (
        <LandingPage onGetStarted={() => setStarted(true)} />
      ) : agentId ? (
        <VoiceChat agentId={agentId} />
      ) : (
        <div className="text-white">Loading Agent...</div>
      )}
    </div>
  );
}

export default App;
