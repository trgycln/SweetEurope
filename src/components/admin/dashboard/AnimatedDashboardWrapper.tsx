'use client';

import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.6 
    } 
  },
};

export function AnimatedDashboardContainer({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5 pb-10"
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants} style={{ willChange: 'transform, opacity' }}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export function AnimatedCard({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      variants={itemVariants}
      style={{ willChange: 'transform, opacity' }}
      className={`transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${className}`}
    >
      {children}
    </motion.div>
  );
}
