import type { ReactNode } from 'react'
import type { CaptureAppearance } from '@/_lib/capture-form/appearance-config'
import type { CaptureFields, CaptureFieldKey } from '@/_lib/capture-form/field-config'

interface CaptureFormViewProps {
  appearance: CaptureAppearance
  fields: CaptureFields
  buttonLabel: string
  /** Slot para os inputs reais (renderer) ou inputs fake (preview) */
  children: ReactNode
  /** Slot para o botão — renderer usa botão real com isSubmitting; preview usa div estilizada */
  submitButton: ReactNode
}

export const CaptureFormView = ({
  appearance,
  children,
  submitButton,
}: CaptureFormViewProps) => {
  const containerStyle: React.CSSProperties = {
    backgroundColor: appearance.backgroundColor,
  }

  const containerClass = [
    'p-6',
    appearance.borderStyle === 'rounded' ? 'rounded-xl' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div style={containerStyle} className={containerClass}>
      {/* Logo */}
      {appearance.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={appearance.logoUrl}
          alt="Logo"
          className="mb-4 h-10 object-contain"
        />
      )}

      {/* Título */}
      {appearance.title && (
        <h2
          className="mb-1 text-xl font-semibold"
          style={{ color: appearance.primaryColor }}
        >
          {appearance.title}
        </h2>
      )}

      {/* Descrição */}
      {appearance.description && (
        <p className="mb-4 text-sm" style={{ color: appearance.primaryColor, opacity: 0.7 }}>
          {appearance.description}
        </p>
      )}

      {/* Campos (slot) */}
      {children}

      {/* Botão (slot) */}
      {submitButton}
    </div>
  )
}

/** Helper: retorna o style do asterisco de obrigatório baseado na cor primária */
export function requiredAsteriskStyle(primaryColor: string): React.CSSProperties {
  return { color: primaryColor }
}

/** Helper: lista campos visíveis ordenados pela ordem canônica */
export function getVisibleFieldKeys(fields: CaptureFields): CaptureFieldKey[] {
  const ORDER: CaptureFieldKey[] = ['name', 'email', 'phone', 'role']
  return ORDER.filter((key) => fields[key].visible)
}
