/**
 * Shared check result types for repository doctor.
 *
 * @packageDocumentation
 */

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'optional'

export interface DoctorCheck {
  section: string
  name: string
  status: CheckStatus
  message?: string
}

export type DoctorStatus = 'healthy' | 'warnings' | 'unhealthy'

export interface DoctorReport {
  status: DoctorStatus
  checks: DoctorCheck[]
}

export function summarizeDoctorReport(checks: DoctorCheck[]): DoctorStatus {
  if (checks.some((check) => check.status === 'fail')) {
    return 'unhealthy'
  }
  if (checks.some((check) => check.status === 'warn')) {
    return 'warnings'
  }
  return 'healthy'
}

export function doctorExitCode(status: DoctorStatus): number {
  return status === 'unhealthy' ? 1 : 0
}
