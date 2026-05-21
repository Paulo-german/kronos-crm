'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileIcon, FileTextIcon, Loader2, UploadCloudIcon } from 'lucide-react'

type FileStatus = 'pending' | 'processing' | 'done'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.6 } },
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

const StatusBadge = ({ status }: { status: FileStatus }) => {
  return (
    <AnimatePresence mode="wait">
      {status === 'pending' && (
        <motion.span
          key="pending"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.15 }}
          className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground"
        >
          Pendente
        </motion.span>
      )}
      {status === 'processing' && (
        <motion.span
          key="processing"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.15 }}
          className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-medium text-amber-500"
        >
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          Processando
        </motion.span>
      )}
      {status === 'done' && (
        <motion.span
          key="done"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.15 }}
          className="inline-flex rounded bg-kronos-green/10 px-1.5 py-0.5 text-[8px] font-medium text-kronos-green"
        >
          Concluído
        </motion.span>
      )}
    </AnimatePresence>
  )
}

export const AgentDetailKnowledgeSlide = () => {
  const [file1Status, setFile1Status] = useState<FileStatus>('pending')

  useEffect(() => {
    const processingTimer = setTimeout(() => setFile1Status('processing'), 1200)
    const doneTimer = setTimeout(() => setFile1Status('done'), 2800)
    return () => {
      clearTimeout(processingTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  return (
    <div className="w-full max-w-[300px] overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <p className="text-sm font-semibold text-foreground">Conhecimento</p>
        <span className="text-[9px] text-muted-foreground">3 arquivos</span>
      </div>

      <div className="px-3 py-3">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-3 rounded-lg border-2 border-dashed border-border/60 bg-muted/20 px-4 py-5 text-center"
        >
          <UploadCloudIcon className="mx-auto mb-1 h-6 w-6 text-muted-foreground/50" />
          <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">
            Arraste arquivos aqui
          </p>
          <p className="mb-1 text-[9px] text-muted-foreground/70">
            ou clique para selecionar
          </p>
          <p className="text-[8px] text-muted-foreground/50">
            PDF · TXT · DOCX · MD — 10 MB
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col gap-0.5"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={rowVariants}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          >
            <FileIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-medium text-foreground">
                Manual de vendas.pdf
              </p>
              <p className="text-[9px] text-muted-foreground">128 KB</p>
            </div>
            <StatusBadge status={file1Status} />
          </motion.div>

          <motion.div
            variants={rowVariants}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          >
            <FileTextIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-medium text-foreground">
                FAQ clientes.txt
              </p>
              <p className="text-[9px] text-muted-foreground">42 KB</p>
            </div>
            <span className="inline-flex rounded bg-kronos-green/10 px-1.5 py-0.5 text-[8px] font-medium text-kronos-green">
              Concluído
            </span>
          </motion.div>

          <motion.div
            variants={rowVariants}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          >
            <FileIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-medium text-foreground">
                Política de preços.pdf
              </p>
              <p className="text-[9px] text-muted-foreground">67 KB</p>
            </div>
            <span className="inline-flex rounded bg-kronos-green/10 px-1.5 py-0.5 text-[8px] font-medium text-kronos-green">
              Concluído
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
