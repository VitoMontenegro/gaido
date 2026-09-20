import type { ReactNode } from 'react'
import { GuideRoleGate } from './RoleGate'

export function GuideGate({ children }: { children: ReactNode }) {
  return <GuideRoleGate>{children}</GuideRoleGate>
}
