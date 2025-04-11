// src/App.tsx
import React, { useState, useEffect } from 'react';
import VoiceChat, { Persona } from './components/VoiceChat';

interface LoadedPersona extends Persona {
  label: string;
  id: string;
  config: any;
}

function App() {
  const [personas, setPersonas] = useState<LoadedPersona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<LoadedPersona | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [started, setStarted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamically load all agent configuration files matching "agent-*.js" or "agent-*.ts"
  useEffect(() => {
    try {
      const context = require.context('./config', false, /^\.\/agent-.*\.(js|ts)$/i);
      console.log('Loaded configuration keys:', context.keys());
      const loaded: (LoadedPersona | null)[] = context.keys().map((key: string) => {
        const mod = context(key);
        const config = mod.default;
        if (!config || !config.prompt) {
          console.warn(`Configuration missing or invalid in module ${key}`);
          return null;
        }
        return {
          label: config.prompt.role, // Use role for dropdown option text.
          id: config.prompt.name.toLowerCase().replace(/\s/g, '-'),
          ...config.prompt, // Spread the prompt properties for convenience.
          config // Save the complete configuration.
        };
      });
      const validPersonas = loaded.filter((p): p is LoadedPersona => p !== null);
      setPersonas(validPersonas);
      if (validPersonas.length > 0) {
        setSelectedPersona(validPersonas[0]);
      }
    } catch (err) {
      console.error("Error loading agent configurations:", err);
      setError("Failed to load agent configurations.");
    }
  }, []);

  // Create a new agent using the selected persona's configuration.
  const createNewAgent = async () => {
    if (!selectedPersona) {
      setError('No persona selected');
      return;
    }
    try {
      const agentModule = await import('./api/agent');
      const { createWebAgent } = agentModule;
      const result = await createWebAgent(selectedPersona.config);
      const newId = result.agent?.agent_id || result.agent?.id || result.agent_id || result.id;
      if (!newId) {
        throw new Error('Agent ID not returned from API.');
      }
      setAgentId(newId);
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(err instanceof Error ? err.message : 'Error creating agent');
    }
  };

  // Landing page: show persona selection and "Get Started" button,
  // with content positioned 100px below the top.
  if (!started) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #1e3a8a, #000)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingLeft: "1rem",
          paddingTop: "50px",
          paddingRight: "1rem"
        }}
      >
        <div style={{ textAlign: "center", color: "white", width: "100%", maxWidth: "600px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
            Welcome to the Voice Chat Tool
          </h1>
          <p style={{ marginBottom: "1rem" }}>
            <br />Please select a persona for your session:
          </p>
          <select
            value={selectedPersona?.label || ''}
            onChange={(e) => {
              const persona = personas.find(p => p.label === e.target.value);
              if (persona) setSelectedPersona(persona);
            }}
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              marginBottom: "1rem",
              fontSize: "1rem",
              width: "100%",
              maxWidth: "400px"
            }}
          >
            {personas.map((p, idx) => (
              <option key={idx} value={p.label}>
                {p.role} {/* Display the role */}
              </option>
            ))}
          </select>
          <br />
          <button
            onClick={async () => {
              await createNewAgent();
              setStarted(true);
            }}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              background: "#3b82f6",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              color: "white"
            }}
          >
            Get Started
          </button>
          {error && (
            <p style={{ color: "red", marginTop: "1rem" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render VoiceChat once started and an agent ID is available.
  if (agentId && selectedPersona) {
    return (
      <VoiceChat
        agentId={agentId}
        persona={selectedPersona}
        onBack={() => {
          setStarted(false);
          setAgentId(null);
        }}
      />
    );
  }

  return <div style={{ color: "white" }}>Loading Agent...</div>;
}

export default App;
