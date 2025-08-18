import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import HeroAnimation from './HeroAnimation';

interface HeroSectionProps {
  onTryNow: (formData: any) => void;
  onNavigate: (path: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onTryNow, onNavigate }) => {
  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden">
      {/* Subtle background gradient and shapes */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-brand-gray-light to-white"></div>
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-brand-violet/10 rounded-full filter blur-2xl animate-blob"></div>
      <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-brand-violet/10 rounded-full filter blur-2xl animate-blob animation-delay-2000"></div>

      <div className="relative min-h-screen flex flex-col justify-center items-center text-center p-4 z-10">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-bold text-brand-dark tracking-tight mb-6">
            Create professional invoices in seconds.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Type one line. Get a clean PDF. No spreadsheets.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button
              size="lg"
              onClick={() => onTryNow({})}
              className="bg-brand-violet text-white hover:bg-brand-violet/90 px-8 py-6 text-lg w-full sm:w-auto"
            >
              Try Demo
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onNavigate('/auth')}
              className="px-8 py-6 text-lg w-full sm:w-auto border-gray-300 hover:bg-gray-100"
            >
              Sign Up Free
            </Button>
          </div>
        </div>

        <HeroAnimation />
      </div>
    </div>
  );
};

export default HeroSection;
