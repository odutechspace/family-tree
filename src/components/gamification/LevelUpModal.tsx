"use client";
import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { motionTransition } from "@/src/components/motion";

const LEVEL_ICONS = ["🌱", "🔍", "🌿", "🌳", "✍️", "🦁", "🎙️", "🏆"];

interface Props {
  newLevel: number;
  newLevelName: string;
  onClose: () => void;
}

export default function LevelUpModal({ newLevel, newLevelName, onClose }: Props) {
  const reduce = useReducedMotion();
  const icon = LEVEL_ICONS[newLevel - 1] || "⭐";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduce ? undefined : { opacity: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.25 }}
      >
        <motion.div
          className="relative mx-4 w-full max-w-sm rounded-3xl border-2 border-amber-500 bg-stone-900 p-10 text-center"
          initial={reduce ? false : { opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, scale: 0.95, y: 8 }}
          transition={reduce ? { duration: 0 } : { ...motionTransition, duration: 0.38 }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${(i * 7.5) % 90}%`,
                  top: `${(i * 11) % 85}%`,
                  animationDelay: `${(i % 5) * 0.1}s`,
                  animationDuration: `${0.85 + (i % 3) * 0.15}s`,
                  fontSize: `${12 + (i % 4) * 2}px`,
                }}
              >
                {["✨", "🌟", "⭐", "💫"][i % 4]}
              </div>
            ))}
          </div>

          <div className="relative z-[1]">
            <div className="mb-4 animate-bounce text-7xl">{icon}</div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-amber-400">Level Up!</p>
            <h2 className="mb-1 text-3xl font-bold text-white">Level {newLevel}</h2>
            <p className="mb-6 text-xl font-semibold text-amber-300">{newLevelName}</p>

            <p className="mb-8 text-sm leading-relaxed text-stone-400">
              The ancestors are proud. Keep adding family members, recording stories, and preserving your heritage.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-amber-600 py-3 text-lg font-bold text-white transition hover:bg-amber-500"
            >
              Continue Building 🌳
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface AchievementToastProps {
  achievements: Array<{ key: string; name: string; icon: string; xpReward: number }>;
  onClose: () => void;
}

export function AchievementToast({ achievements, onClose }: AchievementToastProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[90] flex max-w-xs flex-col gap-2">
      <AnimatePresence>
        {achievements.map((ach, i) => (
          <motion.div
            key={ach.key}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-amber-600 bg-stone-800 p-4 shadow-xl"
            initial={reduce ? false : { opacity: 0, x: 48, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, x: 32 }}
            transition={{
              ...motionTransition,
              delay: reduce ? 0 : i * 0.06,
            }}
            layout
          >
            <span className="text-3xl">{ach.icon}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Achievement Unlocked!</p>
              <p className="text-sm font-semibold text-white">{ach.name}</p>
              {ach.xpReward > 0 && <p className="text-xs text-amber-300">+{ach.xpReward} XP</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

interface QuestToastProps {
  quests: Array<{ key: string; title: string; icon: string; xpReward: number }>;
  onClose: () => void;
}

export function QuestCompletedToast({ quests, onClose }: QuestToastProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-[90] flex max-w-xs flex-col gap-2">
      <AnimatePresence>
        {quests.map((q, i) => (
          <motion.div
            key={q.key}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-green-600 bg-stone-800 p-4 shadow-xl"
            initial={reduce ? false : { opacity: 0, x: -48, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, x: -32 }}
            transition={{
              ...motionTransition,
              delay: reduce ? 0 : i * 0.06,
            }}
            layout
          >
            <span className="text-2xl">{q.icon}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-400">Quest Complete!</p>
              <p className="text-sm font-semibold text-white">{q.title}</p>
              <p className="text-xs text-amber-300">+{q.xpReward} XP</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
