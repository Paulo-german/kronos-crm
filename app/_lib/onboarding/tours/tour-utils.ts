import type { Config, DriveStep } from 'driver.js'

const KEY_PREFIX = 'kronos-tour'

function pendingKey(tourId: string): string {
  return `${KEY_PREFIX}-${tourId}-pending`
}

function completedKey(tourId: string): string {
  return `${KEY_PREFIX}-${tourId}-completed`
}

export function shouldShowTour(tourId: string): boolean {
  if (typeof window === 'undefined') return false
  return (
    localStorage.getItem(pendingKey(tourId)) === 'true' &&
    localStorage.getItem(completedKey(tourId)) !== 'true'
  )
}

export function markTourPending(tourId: string): void {
  localStorage.setItem(pendingKey(tourId), 'true')
}

export function markTourCompleted(tourId: string): void {
  localStorage.setItem(completedKey(tourId), 'true')
  localStorage.removeItem(pendingKey(tourId))
}

/**
 * Executa um tour com driver.js usando config padrao do projeto.
 * - Dynamic import (lazy load)
 * - Filtra steps cujo elemento DOM nao existe
 * - Config PT-BR, dark theme, animate
 * - Marca completed ao finalizar/fechar
 */
export async function runTour(
  tourId: string,
  steps: DriveStep[],
  options?: Partial<Config>,
): Promise<void> {
  const { driver } = await import('driver.js')

  // Filtra steps cujo elemento DOM existe
  const validSteps = steps.filter((step) => {
    if (!step.element) return true
    return document.querySelector(step.element as string) !== null
  })

  if (validSteps.length === 0) {
    markTourCompleted(tourId)
    return
  }

  const driverObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayOpacity: 0.7,
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: 'kronos-tour-popover',
    nextBtnText: 'Próximo',
    prevBtnText: 'Anterior',
    doneBtnText: 'Finalizar',
    progressText: '{{current}} de {{total}}',
    steps: validSteps,
    onDestroyStarted: () => {
      markTourCompleted(tourId)
      driverObj.destroy()
    },
    ...options,
  })

  driverObj.drive()
}
