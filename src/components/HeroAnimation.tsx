import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, File } from 'lucide-react';

const animationStates = ['typing', 'card', 'icon'];
const textToType = "Sales order for 10 widgets";

const HeroAnimation = () => {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentState((prev) => (prev + 1) % animationStates.length);
    }, 4000); // Cycle every 4 seconds

    return () => clearInterval(interval);
  }, []);

  const currentAnimation = animationStates[currentState];

  return (
    <div className="mt-16 w-full max-w-xl h-64 bg-brand-gray-medium/50 rounded-lg flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {currentAnimation === 'typing' && (
          <motion.div
            key="typing"
            data-testid="hero-animation-typing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <motion.div
              className="w-2 h-6 bg-brand-violet mr-2"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            ></motion.div>
            <p className="font-mono text-lg text-brand-dark">
              {Array.from(textToType).map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  {letter}
                </motion.span>
              ))}
            </p>
          </motion.div>
        )}

        {currentAnimation === 'card' && (
          <motion.div
            key="card"
            data-testid="hero-animation-card"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full bg-white rounded-md shadow-lg p-4 flex flex-col font-sans"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-brand-dark text-sm">INVOICE</h3>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>To: Acme Corp</p>
              <p>From: Your Company</p>
            </div>
            <div className="flex-grow border-t border-b border-gray-200 my-2 py-1 space-y-1 text-xs">
              <div className="flex justify-between"><span>10x Widgets</span><span>$100.00</span></div>
              <div className="flex justify-between"><span>5x Gadgets</span><span>$75.00</span></div>
            </div>
            <div className="flex justify-end font-bold text-xs">Total: $175.00</div>
          </motion.div>
        )}

        {currentAnimation === 'icon' && (
          <motion.div
            key="icon"
            data-testid="hero-animation-icon"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            <File className="w-24 h-24 text-brand-violet" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeroAnimation;
