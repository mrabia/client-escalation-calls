/**
 * Page Animations with Framer Motion
 * Provides smooth page transitions and entrance animations
 */

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ReactNode } from 'react';
import { useLocation } from 'wouter';

// Page transition variants
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      when: 'beforeChildren',
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

// Slide variants for different directions
const slideVariants = {
  left: {
    initial: { opacity: 0, x: -50 },
    enter: { opacity: 1, x: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, x: 50, transition: { duration: 0.3 } },
  },
  right: {
    initial: { opacity: 0, x: 50 },
    enter: { opacity: 1, x: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
  },
  up: {
    initial: { opacity: 0, y: 50 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -50, transition: { duration: 0.3 } },
  },
  down: {
    initial: { opacity: 0, y: -50 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: 50, transition: { duration: 0.3 } },
  },
};

// Fade variants
const fadeVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

// Scale variants
const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  enter: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.3 } },
};

// Stagger container for child animations
const staggerContainerVariants: Variants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

// Stagger item variants
const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  },
};

// Card entrance variants
const cardVariants: Variants = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  enter: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.25, 0.46, 0.45, 0.94] 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  },
  hover: {
    y: -5,
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  },
};

// List item variants with stagger
const listItemVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  enter: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.2 }
  },
};

// Modal variants
const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  enter: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      duration: 0.3, 
      ease: [0.25, 0.46, 0.45, 0.94] 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    y: 20,
    transition: { duration: 0.2 }
  },
};

// Backdrop variants
const backdropVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Components

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'fade' | 'scale';
}

export function AnimatedPage({ children, className = '', variant = 'default' }: AnimatedPageProps) {
  const getVariants = () => {
    switch (variant) {
      case 'slide-left':
        return slideVariants.left;
      case 'slide-right':
        return slideVariants.right;
      case 'slide-up':
        return slideVariants.up;
      case 'slide-down':
        return slideVariants.down;
      case 'fade':
        return fadeVariants;
      case 'scale':
        return scaleVariants;
      default:
        return pageVariants;
    }
  };

  return (
    <motion.div
      className={className}
      initial="initial"
      animate="enter"
      exit="exit"
      variants={getVariants()}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedRouteProps {
  children: ReactNode;
}

export function AnimatedRoute({ children }: AnimatedRouteProps) {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function MotionStaggerContainer({ children, className = '', delay = 0.1 }: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="enter"
      exit="exit"
      variants={{
        ...staggerContainerVariants,
        enter: {
          transition: {
            staggerChildren: 0.08,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function MotionStaggerItem({ children, className = '' }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={staggerItemVariants}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export function AnimatedCard({ children, className = '', onClick, interactive = true }: AnimatedCardProps) {
  return (
    <motion.div
      className={className}
      variants={cardVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      whileHover={interactive ? "hover" : undefined}
      whileTap={interactive && onClick ? "tap" : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedList({ children, className = '' }: AnimatedListProps) {
  return (
    <motion.ul
      className={className}
      initial="initial"
      animate="enter"
      exit="exit"
      variants={staggerContainerVariants}
    >
      {children}
    </motion.ul>
  );
}

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedListItem({ children, className = '' }: AnimatedListItemProps) {
  return (
    <motion.li
      className={className}
      variants={listItemVariants}
    >
      {children}
    </motion.li>
  );
}

interface AnimatedModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function AnimatedModal({ children, isOpen, onClose, className = '' }: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            variants={backdropVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            onClick={onClose}
          />
          <motion.div
            className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none ${className}`}
            variants={modalVariants}
            initial="initial"
            animate="enter"
            exit="exit"
          >
            <div className="pointer-events-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Animated counter with spring physics
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedNumber({ value, duration = 1, className = '', formatter }: AnimatedNumberProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={value}
    >
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {formatter ? formatter(value) : value}
      </motion.span>
    </motion.span>
  );
}

// Animated progress bar
interface AnimatedProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}

export function AnimatedProgressBar({ value, max = 100, className = '', color = '#00ff9d' }: AnimatedProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={`h-2 bg-muted rounded-full overflow-hidden ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

// Floating action button with animation
interface FloatingButtonProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

export function FloatingButton({ children, onClick, className = '' }: FloatingButtonProps) {
  return (
    <motion.button
      className={`fixed bottom-6 right-6 p-4 rounded-full bg-neon-green text-background shadow-lg ${className}`}
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
}

// Skeleton loader with shimmer animation
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function AnimatedSkeleton({ className = '', variant = 'rectangular', width, height }: SkeletonProps) {
  const baseClasses = 'bg-muted animate-pulse';
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// Export all variants for custom use
export {
  pageVariants,
  slideVariants,
  fadeVariants,
  scaleVariants,
  staggerContainerVariants,
  staggerItemVariants,
  cardVariants,
  listItemVariants,
  modalVariants,
  backdropVariants,
};
