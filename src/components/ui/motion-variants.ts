// src/components/ui/motion-variants.ts
import { Variants } from 'framer-motion';

export const EASE_PREMIUM = [0.25, 1, 0.5, 1]; // SKILL: premium-animations cubic-bezier

export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            ease: EASE_PREMIUM,
        },
    },
};

export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: EASE_PREMIUM,
        },
    },
};

export const scaleUpHover = {
    scale: 1.05,
    transition: {
        duration: 0.4,
        ease: EASE_PREMIUM,
    },
};

export const glowHover = (color: string) => ({
    boxShadow: `0 0 40px -10px ${color}80`,
    scale: 1.02,
    transition: {
        duration: 0.5,
        ease: EASE_PREMIUM,
    },
});
