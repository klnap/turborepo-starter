---
name: to-spec
description: Turn the current conversation into a formal technical specification targeted at global, workspace, or module scope.
disable-model-invocation: true
---

This skill synthesizes conversation context and codebase understanding into a formal RFC specification.

## Target Output Path (Select Appropriate Scope)

1. **Global Spec** (Multi-package/Infra/DB): \specs/[feature-name].md2. **Workspace Spec** (App-wide/Routing): \pps/[workspace]/specs/[feature-name].md3. **Module Spec** (Domain-isolated feature): \pps/web/src/modules/[module-name]/specs/[feature-name].md
   _Ephemeral Scratchpads_: Route temporary drafts to \.generated/specs/\.

## Process

1. **Determine Scope**: Choose Global, Workspace, or Module level based on blast radius.
2. **Explore the Codebase**: Map affected modules and existing domain invariants.
3. **Draft the Specification**: Use the structure below and write to the chosen scope.

<spec-template>

# [Feature Name] Technical Specification

## 1. Problem Statement

The problem the user is facing, from the user's perspective.

## 2. Solution Overview

The technical solution and architecture overview.

## 3. User Stories & Acceptance Criteria

1. As an <actor>, I want <capability>, so that <benefit>.
   - **Acceptance Criteria**: [Concrete verifiable check]

## 4. Implementation Decisions

- Packages and modules modified.
- Schemas (Valibot), API contracts, and Server Action boundaries.
- State machines and data models.

## 5. Testing Decisions

- Testing seams, unit tests (\un test\), and Playwright E2E flows.

## 6. Out of Scope

Explicitly declare boundaries.

</spec-template>
