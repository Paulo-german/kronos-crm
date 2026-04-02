'use client'

import { AnimatePresence, motion } from 'framer-motion'

interface SlideContainerProps {
  currentStep: number
  direction: number
  children: React.ReactNode[]
}

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
}

export const SlideContainer = ({ currentStep, direction, children }: SlideContainerProps) => {
  const childArray = Array.isArray(children) ? children : [children]

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={currentStep}
        custom={direction}
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        {childArray[currentStep]}
      </motion.div>
    </AnimatePresence>
  )
}
