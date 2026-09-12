/**
 * Shared TypeScript interfaces for the monorepo scope CLI.
 *
 * @packageDocumentation
 */

export type Scope = 'root' | 'ws' | 'pkg'

export type WorkspaceType = 'app' | 'package'

export type PackageMgmtCommand = 'install' | 'add' | 'remove' | 'update'

export interface WorkspaceInfo {
  name: string
  dirName: string
  dirPath: string
  type: WorkspaceType
}

export interface AppWorkspace {
  dirName: string
  packageName: string
  path: string
}

export interface CliItem {
  isHeader: boolean
  label: string
  value?: string
  hint?: string
}

export interface RunnerIO {
  stdout: (msg: string) => void
  stderr: (msg: string) => void
  isTTY?: boolean
  prompt?: (question: string) => Promise<string>
  spawn?: (cmd: string[], args: string[], cwd: string) => Promise<number>
}
