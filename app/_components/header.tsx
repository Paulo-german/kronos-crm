import { ReactNode } from 'react'

export const HeaderSubTitle = ({ children }: { children: ReactNode }) => {
  return <span className="text-sm text-muted-foreground">{children}</span>
}

export const HeaderTitle = ({ children }: { children: ReactNode }) => {
  return <h2 className="text-2xl font-bold">{children}</h2>
}

export const HeaderLeft = ({ children }: { children: ReactNode }) => {
  return <div className="space-y-2">{children}</div>
}

export const HeaderRight = ({ children }: { children: ReactNode }) => {
  return <div>{children}</div>
}

const Header = ({ children }: { children: ReactNode }) => {
  return <div className="flex items-center justify-between">{children}</div>
}

export default Header
