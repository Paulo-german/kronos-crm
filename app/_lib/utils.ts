import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// Formatters - Helpers para exibição de dados formatados
// ============================================================================

/**
 * Formata CNPJ: 12345678000190 → 12.345.678/0001-90
 */
export function formatCnpj(value: string | null | undefined): string {
  if (!value) return ''
  const numbers = value.replace(/\D/g, '')
  if (numbers.length !== 14) return value

  return numbers.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  )
}

/**
 * Formata CPF: 12345678901 → 123.456.789-01
 */
export function formatCpf(value: string | null | undefined): string {
  if (!value) return ''
  const numbers = value.replace(/\D/g, '')
  if (numbers.length !== 11) return value

  return numbers.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

/**
 * Formata CEP: 01310100 → 01310-100
 */
export function formatCep(value: string | null | undefined): string {
  if (!value) return ''
  const numbers = value.replace(/\D/g, '')
  if (numbers.length !== 8) return value

  return numbers.replace(/^(\d{5})(\d{3})$/, '$1-$2')
}

/**
 * Formata telefone: 11999998888 → (11) 99999-8888
 * Suporta fixo (10 dígitos) e celular (11 dígitos)
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return ''
  const numbers = value.replace(/\D/g, '')

  if (numbers.length === 10) {
    return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  }

  if (numbers.length === 11) {
    return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }

  return value
}

/**
 * Formata data para pt-BR
 * @param date - Data a ser formatada
 * @param options - Opções de formatação (default: dia, mês por extenso e ano)
 */
export function formatDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) return '-'

  return new Intl.DateTimeFormat('pt-BR', options).format(dateObj)
}

/**
 * Formata data curta: 06/02/2026
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  return formatDate(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Formata data e hora: 6 de fevereiro de 2026 às 14:30
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================================
// Cleaners - Helpers para remover máscaras antes de salvar
// ============================================================================

/**
 * Remove todos os caracteres não numéricos
 */
export function onlyNumbers(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/\D/g, '')
}
