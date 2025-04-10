// src/api/agent.ts
import { agentConfig } from '../config/agent-config';

// Explicitly cast the environment variable to string.
const BLAND_API_KEY: string = process.env.REACT_APP_BLAND_API_KEY as string;
const BLAND_API_URL = 'https://api.bland.ai';

if (!BLAND_API_KEY) {
  throw new Error('BLAND_API_KEY is not set in environment variables');
}

/**
 * Creates a new web agent using the provided agent configuration.
 */
export async function createWebAgent() {
  try {
    console.log('Creating new web agent...');

    const headers: HeadersInit = {
      'authorization': BLAND_API_KEY,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${BLAND_API_URL}/v1/agents`, {
      method: 'POST',
      headers: headers, // headers is explicitly typed.
      body: JSON.stringify(agentConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agent creation error:', errorText);
      throw new Error(`Failed to create agent: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Created agent:', data);
    return data;
  } catch (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
}

/**
 * Retrieves a session token for a given agentId.
 */
export async function getSessionToken(agentId: string) {
  try {
    const headers: HeadersInit = {
      'authorization': BLAND_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const response = await fetch(`${BLAND_API_URL}/v1/agents/${agentId}/authorize`, {
      method: 'POST',
      headers: headers, // using the explicitly typed headers
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API responded with status: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error getting session token:', error);
    throw error;
  }
}
