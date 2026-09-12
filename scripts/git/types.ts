/**
 * Type definitions for Git hook guards and security verifications.
 *
 * @packageDocumentation
 */

export interface SecurityViolation {
  file?: string
  rule: string
  detail: string
}

export interface SecurityCheckResult {
  passed: boolean
  violations: SecurityViolation[]
}
