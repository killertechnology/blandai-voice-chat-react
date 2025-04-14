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

  // Dynamically load all agent configuration files matching "agent-*.js" or "agent-*.ts" from the config folder.
  useEffect(() => {
    try {
      // Use a case-insensitive regex to load both .js and .ts files.
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
          // Use role for display in the grid.
          label: config.prompt.role,
          id: config.prompt.name.toLowerCase().replace(/\s/g, '-'),
          ...config.prompt, // Spread prompt properties for convenience.
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

  // Create a new agent using a provided configuration (if passed) or the selectedPersona's configuration.
  const createNewAgent = async (configOverride?: any) => {
    const configToUse = configOverride || selectedPersona?.config;
    if (!configToUse) {
      setError('No persona selected');
      return;
    }
    try {
      const agentModule = await import('./api/agent');
      const { createWebAgent } = agentModule;
      const result = await createWebAgent(configToUse);
      // Attempt to extract the new agent's ID from either the nested "agent" property or the root.
      const newId =
        result.agent?.agent_id ||
        result.agent?.id ||
        result.agent_id ||
        result.id;
      if (!newId) {
        throw new Error('Agent ID not returned from API.');
      }
      setAgentId(newId);
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(err instanceof Error ? err.message : 'Error creating agent');
    }
  };

  // Landing page with a two-column grid of images.
  if (!started) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #1e3a8a, #000)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "10px",
          paddingLeft: "1rem",
          paddingRight: "1rem"
        }}
      >
        <div style={{ textAlign: "center", color: "white", maxWidth: "800px", width: "100%" }}>
          <h1 >
            Talk To Me!
          </h1>
          <p style={{ marginBottom: "1rem" }}>
            Please select a persona for your session:
          </p>
          {/* Two-column grid for persona selection */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              justifyItems: "center",
              alignItems: "center",
              marginBottom: "1rem"
            }}
          >
            {personas.map((p, idx) => (
              <div
                key={idx}
                style={{
                  cursor: "pointer",
                  textAlign: "center",
                  width: "100%",
                  maxWidth: "200px"
                }}
                onClick={async () => {
                  // Immediately use the clicked persona's configuration
                  setSelectedPersona(p);
                  await createNewAgent(p.config);
                  setStarted(true);
                }}
              >
                <img
                  src={`./images/agent-${idx + 1}.gif`}
                  alt={p.role}
                  style={{ width: "100%", borderRadius: "8px" }}
                />
                <p style={{ marginTop: "8px", color: "white", fontSize: "1rem" }}>
                  {p.role}
                </p>
              </div>
            ))}
          </div>
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
