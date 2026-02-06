'use client'

import { useState, useCallback } from 'react'

interface ViaCepResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

interface CepData {
  street: string
  neighborhood: string
  city: string
  state: string
}

interface UseCepLookupReturn {
  lookup: (cep: string) => Promise<CepData | null>
  isLoading: boolean
  error: string | null
}

export function useCepLookup(): UseCepLookupReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookup = useCallback(async (cep: string): Promise<CepData | null> => {
    const cleanCep = cep.replace(/\D/g, '')

    if (cleanCep.length !== 8) {
      setError('CEP deve ter 8 dígitos')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)

      if (!response.ok) {
        throw new Error('Erro ao buscar CEP')
      }

      const data: ViaCepResponse = await response.json()

      if (data.erro) {
        setError('CEP não encontrado')
        return null
      }

      return {
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      }
    } catch {
      setError('Erro ao buscar CEP')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { lookup, isLoading, error }
}
