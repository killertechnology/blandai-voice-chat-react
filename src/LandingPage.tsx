// src/LandingPage.tsx
import React from 'react';
import { Button } from './components/ui/button';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="text-center">
      <h1 className="text-3xl text-white font-bold mb-4">Welcome to Dave's Roast Chat</h1>
      <p className="text-white mb-8">
        Get ready to interact with Dave, your savage roast comedian.
      </p>
      <Button
        onClick={onGetStarted}
        className="bubbly-button"
      >
        Get Started
      </Button>
    </div>
  );
};

export default LandingPage;
