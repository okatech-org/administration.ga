'use client';

import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONSTANTS = {
  itemSize: 48,
  containerSize: 250,
  openStagger: 0.05,
  closeStagger: 0.12,
  shakeDuration: 0.15,
};

const STYLES: Record<string, Record<string, string>> = {
  trigger: {
    container:
      'rounded-full flex items-center justify-center cursor-pointer outline-none ring-0 hover:brightness-125 transition-all duration-100 z-50',
  },
  item: {
    container:
      'rounded-full flex items-center justify-center absolute cursor-pointer',
    label: 'text-[10px] font-bold text-foreground absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap'
  }
};

const pointOnCircle = (i: number, n: number, r: number, cx = 0, cy = 0) => {
  const theta = (2 * Math.PI * i) / n - Math.PI / 2;
  return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
};

interface CircleMenuItemConfig {
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

// ─── Menu Item ────────────────────────────────────────────────
const MenuItem = ({
  icon, label, href, onClick, index, totalItems, isOpen, itemClassName
}: {
  icon: React.ReactNode; label: string; href?: string; onClick?: () => void;
  index: number; totalItems: number; isOpen: boolean; itemClassName?: string;
}) => {
  const { x, y } = pointOnCircle(index, totalItems, CONSTANTS.containerSize / 2);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.();
  };

  return (
    <div className={STYLES.item.container} onClick={handleClick}>
      <motion.button
        initial={false}
        suppressHydrationWarning
        animate={{
          x: isOpen ? x : 0,
          y: isOpen ? y : 0,
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.3,
        }}
        whileHover={{ scale: 1.15, transition: { duration: 0.1, delay: 0 } }}
        whileTap={{ scale: 0.9 }}
        transition={{
          delay: isOpen ? index * CONSTANTS.openStagger : index * CONSTANTS.closeStagger,
          type: 'spring', stiffness: 180, damping: 22
        }}
        style={{ height: CONSTANTS.itemSize - 2, width: CONSTANTS.itemSize - 2 }}
        className={cn(STYLES.item.container, itemClassName ?? 'bg-muted hover:bg-muted/70')}
        onClick={handleClick}
      >
        {icon}
        <AnimatePresence>
          {isOpen && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.25 + index * 0.05 }}
              className={STYLES.item.label}
            >
              {label}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

// ─── Circle Menu ──────────────────────────────────────────────
const CircleMenu = ({
  items,
  openIcon = <Menu size={18} className="text-background" />,
  triggerClassName,
  itemClassName,
  defaultOpen = false,
  onCloseComplete,
  onTriggerClick,
}: {
  items: CircleMenuItemConfig[];
  openIcon?: React.ReactNode;
  triggerClassName?: string;
  itemClassName?: string;
  defaultOpen?: boolean;
  onCloseComplete?: () => void;
  onTriggerClick?: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerAnimate = useAnimationControls();
  const shakeAnimate = useAnimationControls();
  const orbitAnimate = useAnimationControls();

  const maxScale = Math.min(
    CONSTANTS.itemSize * (1 + (items.length - 2) * 0.15),
    CONSTANTS.itemSize + CONSTANTS.itemSize / 2
  );

  // ── Shake sequence (shared between open & close) ──
  const shakeSequence = useCallback(async (direction: 1 | -1) => {
    const d = direction;
    shakeAnimate.start({
      translateX: [0, 1.5 * d, -1.5 * d, 0, 1.5 * d, -1.5 * d, 0],
      transition: {
        duration: CONSTANTS.shakeDuration,
        ease: 'linear',
        repeat: Infinity,
        repeatType: 'loop' as const
      }
    });
  }, [shakeAnimate]);

  const stopShake = useCallback(async () => {
    shakeAnimate.stop();
    await shakeAnimate.start({ translateX: 0, transition: { duration: 0 } });
  }, [shakeAnimate]);

  // ── OPEN animation (exact rewind of close) ──
  // Close: items collapse → wait → shake+grow → pause → settle to normal
  // Open:  un-settle (grow) → pause → shake+shrink → wait → orbit reverse → items deploy → trigger 2x
  const playOpenAnimation = useCallback(async () => {
    // Ensure starting state (critical after strict mode remount)
    triggerAnimate.set({ height: CONSTANTS.itemSize, width: CONSTANTS.itemSize });

    // Reverse of close's settle: grow from normal to maxScale
    await triggerAnimate.start({
      height: maxScale,
      width: maxScale,
      transition: { duration: 0.25, ease: 'backInOut' }
    });

    // Reverse of close's pause
    await new Promise(r => setTimeout(r, 150));

    // Reverse of close's shake+grow: shake while shrinking back
    await shakeSequence(-1);

    await triggerAnimate.start({
      height: CONSTANTS.itemSize,
      width: CONSTANTS.itemSize,
      transition: { duration: 0.3, ease: 'easeIn' }
    });

    await stopShake();

    // Reverse of close's collapse wait
    await new Promise(r => setTimeout(r, 250));

    // Reverse of close's orbit: spin +360° while items deploy outward
    orbitAnimate.start({
      rotate: 360,
      filter: 'blur(1px)',
      transition: {
        duration: CONSTANTS.closeStagger * (items.length + 2),
        ease: 'linear'
      }
    }).then(() => {
      orbitAnimate.start({ rotate: 0, filter: 'blur(0px)', transition: { duration: 0 } });
    });

    setIsOpen(true);

    // Grow trigger to 2x after items deployed
    await triggerAnimate.start({
      height: CONSTANTS.itemSize * 2,
      width: CONSTANTS.itemSize * 2,
      transition: { type: 'spring', stiffness: 200, damping: 18 }
    });
  }, [triggerAnimate, shakeSequence, stopShake, maxScale, orbitAnimate, items.length]);

  // ── CLOSE animation (original) ──
  // items collapse → shake + scale up → settle → notify parent
  const playCloseAnimation = useCallback(async () => {
    // Shrink trigger back to normal first (from 2x)
    await triggerAnimate.start({
      height: CONSTANTS.itemSize,
      width: CONSTANTS.itemSize,
      transition: { type: 'spring', stiffness: 200, damping: 18 }
    });

    // Collapse items
    setIsOpen(false);

    // Orbit spin
    orbitAnimate.start({
      rotate: -360,
      filter: 'blur(1px)',
      transition: {
        duration: CONSTANTS.closeStagger * (items.length + 2),
        ease: 'linear'
      }
    }).then(() => {
      orbitAnimate.start({ rotate: 0, filter: 'blur(0px)', transition: { duration: 0 } });
    });

    // Wait for items to collapse
    await new Promise(r => setTimeout(r, 250));

    // Shake while growing
    await shakeSequence(1);

    // Scale up to max
    await triggerAnimate.start({
      height: maxScale,
      width: maxScale,
      transition: { duration: 0.3, ease: 'easeOut' }
    });

    await new Promise(r => setTimeout(r, 150));

    // Stop shake, shrink back
    await stopShake();
    await triggerAnimate.start({
      height: CONSTANTS.itemSize,
      width: CONSTANTS.itemSize,
      transition: { duration: 0.25, ease: 'backInOut' }
    });

    onCloseComplete?.();
  }, [triggerAnimate, shakeSequence, stopShake, maxScale, orbitAnimate, items.length, onCloseComplete]);

  // ── Auto-open on mount ──
  useEffect(() => {
    if (!defaultOpen) return;
    // Delay lets animation controls attach after mount
    const t = setTimeout(() => playOpenAnimation(), 150);
    return () => clearTimeout(t);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleTriggerClick = () => {
    if (isOpen) {
      // Quand ouvert, le trigger sert d'interaction (chat/voix)
      onTriggerClick?.();
    } else {
      playOpenAnimation();
    }
  };

  return (
    <div
      style={{
        width: isOpen ? CONSTANTS.containerSize : CONSTANTS.itemSize,
        height: isOpen ? CONSTANTS.containerSize : CONSTANTS.itemSize,
        transition: 'width 0.3s ease, height 0.3s ease',
      }}
      className="relative flex items-center justify-center place-self-center"
    >
      {/* Trigger — always shows openIcon, grows 2x when open */}
      <motion.div initial={false} animate={shakeAnimate} className="z-50 relative">
        <motion.button
          animate={triggerAnimate}
          initial={false}
          style={{ height: CONSTANTS.itemSize, width: CONSTANTS.itemSize }}
          className={cn(STYLES.trigger.container, triggerClassName ?? 'bg-foreground')}
          onClick={handleTriggerClick}
        >
          <motion.span
            initial={false}
            animate={{ scale: isOpen ? 1.3 : 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          >
            {openIcon}
          </motion.span>
        </motion.button>

        {/* Close button — appears next to trigger when open */}
        <AnimatePresence>
          {isOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%' }}
              exit={{ opacity: 0, scale: 0, x: '-50%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
              onClick={(e) => { e.stopPropagation(); playCloseAnimation(); }}
              className="absolute -bottom-2 left-1/2 h-7 w-7 rounded-full bg-foreground/80 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-foreground transition-colors"
              style={{ translateY: '100%' }}
            >
              <X size={14} className="text-background" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Orbiting items */}
      <motion.div
        animate={orbitAnimate}
        className="absolute inset-0 z-0 flex items-center justify-center"
      >
        {items.map((item, index) => (
          <MenuItem
            key={`menu-item-${index}`}
            icon={item.icon}
            label={item.label}
            href={item.href}
            onClick={item.onClick}
            index={index}
            totalItems={items.length}
            isOpen={isOpen}
            itemClassName={item.className ?? itemClassName}
          />
        ))}
      </motion.div>
    </div>
  );
};

export { CircleMenu };
export type { CircleMenuItemConfig };
