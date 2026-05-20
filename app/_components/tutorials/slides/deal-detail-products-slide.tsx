'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { PackageIcon, WrenchIcon, TagIcon } from 'lucide-react'

const LINE_ITEMS = [
  {
    type: 'PRODUCT',
    icon: PackageIcon,
    label: 'Produto',
    name: 'Software CRM',
    qty: '1x',
    price: 'R$ 4.764',
    style: 'text-primary bg-primary/10',
  },
  {
    type: 'SERVICE',
    icon: WrenchIcon,
    label: 'Serviço',
    name: 'Implantação',
    qty: '1x',
    price: 'R$ 1.500',
    style: 'text-kronos-blue bg-kronos-blue/10',
  },
  {
    type: 'PROMOTION',
    icon: TagIcon,
    label: 'Promoção',
    name: 'Desconto anual 20%',
    qty: '—',
    price: '- R$ 953',
    style: 'text-kronos-green bg-kronos-green/10',
    priceStyle: 'text-kronos-green',
  },
]

const TARGET_VALUE = 5311

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
}

export const DealDetailProductsSlide = () => {
  const count = useMotionValue(0)
  const displayValue = useTransform(count, (v) =>
    `R$ ${Math.round(v).toLocaleString('pt-BR')}`
  )

  useEffect(() => {
    const controls = animate(count, TARGET_VALUE, {
      duration: 1.4,
      delay: 1.0,
      ease: 'easeOut',
    })
    return controls.stop
  }, [count])

  return (
    <motion.div
      className="w-full max-w-[360px] overflow-hidden rounded-xl border border-border bg-card"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div
        variants={rowVariants}
        className="flex items-center justify-between border-b border-border px-3.5 py-2.5"
      >
        <p className="text-sm font-semibold text-foreground">Produtos & Serviços</p>
        <button className="rounded-md bg-primary px-2.5 py-1 text-[9px] font-semibold text-primary-foreground">
          + Adicionar
        </button>
      </motion.div>

      {/* Table head */}
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 border-b border-border px-3.5 py-1.5">
        <span className="text-[8px] font-medium uppercase text-muted-foreground">Tipo</span>
        <span className="text-[8px] font-medium uppercase text-muted-foreground">Item</span>
        <span className="text-[8px] font-medium uppercase text-muted-foreground">Qtd</span>
        <span className="text-[8px] font-medium uppercase text-muted-foreground">Valor</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/60">
        {LINE_ITEMS.map((item) => (
          <motion.div
            key={item.type}
            variants={rowVariants}
            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 px-3.5 py-2.5"
          >
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[7px] font-semibold ${item.style}`}>
              <item.icon className="h-2 w-2" />
              {item.label}
            </span>
            <span className="text-[9px] font-medium text-foreground">{item.name}</span>
            <span className="text-[9px] text-muted-foreground">{item.qty}</span>
            <span className={`text-[9px] font-semibold ${item.priceStyle ?? 'text-foreground'}`}>
              {item.price}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Total */}
      <motion.div
        variants={rowVariants}
        className="flex items-center justify-between border-t border-border bg-muted/30 px-3.5 py-2.5"
      >
        <span className="text-[10px] font-semibold text-foreground">Total</span>
        <motion.span className="text-sm font-bold text-primary">{displayValue}</motion.span>
      </motion.div>
    </motion.div>
  )
}
