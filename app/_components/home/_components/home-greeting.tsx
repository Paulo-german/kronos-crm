'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Header, { HeaderLeft, HeaderTitle } from '@/_components/header'

interface HomeGreetingProps {
  firstName: string
}

const HomeGreeting = ({ firstName }: HomeGreetingProps) => {
  const shouldReduce = useReducedMotion()

  return (
    <Header>
      <HeaderLeft>
        <HeaderTitle>
          Olá,{' '}
          <motion.span
            initial={{ opacity: 0, x: shouldReduce ? 0 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
            className="inline-block text-primary"
          >
            {firstName}
          </motion.span>
          !
        </HeaderTitle>
      </HeaderLeft>
    </Header>
  )
}

export default HomeGreeting
