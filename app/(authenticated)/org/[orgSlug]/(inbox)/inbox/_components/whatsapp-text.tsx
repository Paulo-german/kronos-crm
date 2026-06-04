import { Fragment, type ReactNode } from 'react'
import { tokenizeWhatsappText } from '@/_lib/whatsapp/format-text'

export function renderWhatsappText(content: string): ReactNode[] {
  return tokenizeWhatsappText(content).map((token, index) => {
    if (token.type === 'bold') {
      return (
        <strong key={index} className="font-semibold">
          {token.value}
        </strong>
      )
    }
    if (token.type === 'italic') {
      return (
        <em key={index} className="italic">
          {token.value}
        </em>
      )
    }
    if (token.type === 'strike') {
      return (
        <span key={index} className="line-through">
          {token.value}
        </span>
      )
    }
    if (token.type === 'mono') {
      return (
        <code
          key={index}
          className="rounded bg-black/20 px-1 font-mono text-[0.85em]"
        >
          {token.value}
        </code>
      )
    }
    return <Fragment key={index}>{token.value}</Fragment>
  })
}
