import type { ReactNode } from 'react'
import { RoleGate } from './RoleGate'

export function GuideGate({ children }: { children: ReactNode }) {
  return <RoleGate role="ROLE_GUIDE">{children}</RoleGate>
}
