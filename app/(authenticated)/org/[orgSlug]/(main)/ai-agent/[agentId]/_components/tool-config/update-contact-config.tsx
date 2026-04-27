'use client'

import { Label } from '@/_components/ui/label'

const UpdateContactConfig = () => {
  return (
    <p className="text-xs text-muted-foreground">
      <Label className="text-xs">Campos atualizáveis</Label>
      <span className="block mt-1">
        O agente pode atualizar nome, e-mail, telefone, cargo e empresa do contato durante a conversa, conforme as informações forem fornecidas.
      </span>
    </p>
  )
}

export default UpdateContactConfig
