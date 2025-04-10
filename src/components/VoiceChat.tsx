// src/components/VoiceChat.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Mic, MicOff, Loader2, WifiOff } from 'lucide-react';
import { BlandWebClient } from 'bland-client-js-sdk';
import { getSessionToken } from '../api/agent';
import { agentConfig } from '../config/agent-config';
import './VoiceChat.css';

interface VoiceChatProps {
  agentId: string;
}

// Obtain your Bland.AI API key from environment variables.
const BLAND_API_KEY = process.env.NEXT_PUBLIC_BLAND_API_KEY as string;

export default function VoiceChat({ agentId }: VoiceChatProps) {
  const [status, setStatus] = useState<string>('Idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const clientRef = useRef<BlandWebClient | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  // ----------------------------
  // Setup Speech Recognition (STT)
  // ----------------------------
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      console.log('Recognized speech:', transcript);
      // Here you can forward the transcript to your agent conversation.
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event);
      setError('Speech recognition error occurred.');
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended.');
      setIsListening(false);
      setStatus('Connected! Click the mic to speak.');
    };

    recognitionRef.current = recognition;
  }, []);

  // ----------------------------
  // Utility: Wait for Speech Synthesis to Finish
  // ----------------------------
  const waitForSpeechToFinish = (): Promise<void> => {
    return new Promise((resolve) => {
      const checkInterval = 200;
      const maxWait = 10000;
      let waited = 0;
      const interval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(interval);
          resolve();
        }
        waited += checkInterval;
        if (waited > maxWait) {
          clearInterval(interval);
          resolve();
        }
      }, checkInterval);
    });
  };

  // ----------------------------
  // Cleanup: Force disconnect the client, close WebSocket, and cancel TTS
  // ----------------------------
  const cleanup = useCallback(async () => {
    setIsLoading(true);
    try {
      // Cancel any ongoing speech synthesis.
      window.speechSynthesis.cancel();

      if (clientRef.current) {
        try {
          if (typeof (clientRef.current as any).stop === 'function') {
            await (clientRef.current as any).stop();
          }
          const wsInstance =
            (clientRef.current as any)._ws ||
            (clientRef.current as any).ws ||
            (clientRef.current as any).webSocket;
          if (wsInstance && wsInstance.readyState !== WebSocket.CLOSED) {
            wsInstance.close(1000, 'User disconnected');
            await new Promise<void>((resolve) => {
              const checkClosed = setInterval(() => {
                if (wsInstance.readyState === WebSocket.CLOSED) {
                  clearInterval(checkClosed);
                  resolve();
                }
              }, 50);
              setTimeout(() => {
                clearInterval(checkClosed);
                resolve();
              }, 2000);
            });
          }
          if (typeof (clientRef.current as any).disconnect === 'function') {
            await (clientRef.current as any).disconnect();
          }
          clientRef.current = null;
        } catch (err) {
          console.error('Error stopping client:', err);
          throw new Error('Failed to disconnect properly');
        }
      }
    } catch (err) {
      console.error('Error during cleanup:', err);
      setError(err instanceof Error ? err.message : 'Cleanup failed');
    } finally {
      setIsConnected(false);
      setIsListening(false);
      setStatus('Disconnected!');
      setIsLoading(false);
    }
  }, []);

  // ----------------------------
  // Initialize Voice Chat: Connect, let agent speak, and monitor stream state.
  // ----------------------------
  const initVoiceChat = async () => {
    if (!agentId) {
      setError('Agent ID is not set');
      return;
    }

    // Cleanup any previous session.
    await cleanup();
    setStatus('Initializing...');
    setError(null);
    setIsLoading(true);

    try {
      const tokenData = await getSessionToken(agentId);
      console.log('Session token data:', tokenData);
      if (!tokenData.token) {
        throw new Error('No token received');
      }
      setStatus('Connecting to Bland AI...');
      clientRef.current = new BlandWebClient(agentId, tokenData.token);
      const currentCallId = Date.now().toString();
      await clientRef.current.initConversation({
        sampleRate: 44100,
        callId: currentCallId,
      });
      setIsConnected(true);

      // Attach an onclose handler to the underlying stream to monitor when the call ends.
      const wsInstance =
        (clientRef.current as any)._ws ||
        (clientRef.current as any).ws ||
        (clientRef.current as any).webSocket;
      if (wsInstance) {
        wsInstance.onclose = () => {
          console.log('WebSocket stream closed.');
          setIsConnected(false);
          setStatus('Disconnected!');
        };
      }

      setStatus("Connected! Please wait for the agent to finish speaking...");
      await waitForSpeechToFinish();
      setStatus('Connected! Click the mic to speak.');
      // Do not auto-start speech recognition.
    } catch (err) {
      console.error('Voice chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to voice chat');
      setStatus('Error connecting');
      await cleanup();
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------
  // Toggle Microphone (Speech Recognition)
  // ----------------------------
  const handleMicToggle = async () => {
    if (!isConnected) return; // Do nothing if not connected.
    if (!isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          setStatus('Listening...');
        } catch (err) {
          console.error('Error starting speech recognition:', err);
          setError('Could not start speech recognition.');
        }
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  // ----------------------------
  // Disconnect Handler: Delete the agent and terminate the call.
  // ----------------------------
  const handleDisconnect = async () => {
    // Abort speech recognition.
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }
    // Cancel any ongoing TTS.
    window.speechSynthesis.cancel();

    // Delete the web agent via the Bland.AI API.
    try {
      const options = {
        method: 'POST',
        headers: {
          authorization: BLAND_API_KEY,
          'Content-Type': 'application/json'
        }
      };
      const deleteUrl = `https://api.bland.ai/v1/agents/${agentId}/delete`;
      const response = await fetch(deleteUrl, options);
      const result = await response.json();
      console.log('Agent deletion response:', result);
    } catch (deleteError) {
      console.error('Error deleting agent:', deleteError);
      // Optionally set error state if deletion is critical.
    }

    // Force disconnect internal resources.
    await cleanup();
  };

  // ----------------------------
  // Auto-cleanup on Component Unmount
  // ----------------------------
  useEffect(() => {
    return () => {
      cleanup();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [cleanup]);

  // ----------------------------
  // Auto-initialize on Mount (only once)
  // ----------------------------
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      initVoiceChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------
  // Render UI
  // ----------------------------
  return (
    <Card className="voice-card">
      <CardHeader className="voice-card-header">
        <div className="voice-card-header-bg"></div>
        <CardTitle className="voice-title">
          Voice Assistant
          {isLoading && <Loader2 className="loader" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="voice-card-content">
        {/* Connection Status Button */}
        <Button
          onClick={isConnected ? handleDisconnect : () => {}}
          className={`connection-status-button ${isConnected ? 'connected' : 'disconnected'}`}
          disabled={isLoading}
        >
          {isConnected ? 'Connected' : 'Disconnected'}
        </Button>

        {/* Microphone Button */}
        <div className="button-group">
          <Button
            onClick={handleMicToggle}
            className={`mic-button ${isListening ? 'listening' : ''}`}
            disabled={isLoading || !isConnected}
          >
            {isListening ? <MicOff className="mic-icon" /> : <Mic className="mic-icon" />}
          </Button>
        </div>

        <div className="ready-status">
          {!isListening && !isLoading && (
            <div className="ready-text">
              <WifiOff className="wifi-icon" />
              <span>Ready to start</span>
            </div>
          )}
        </div>

        {error && <div className="error-text">{error}</div>}
      </CardContent>
    </Card>
  );
}
