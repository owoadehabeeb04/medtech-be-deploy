# MedTech Monorepo

Central monorepo for MedTech applications and shared utilities.  
Contains isolated domains (merchant backend, experience_1 backend or service, shared utilities) built with **Node.js**, **TypeScript**, and modern monorepo practices.

## Project Structure

MedTech_template/ ← monorepo root
├── merchant/ ← Merchant domain (e.g. backend for payments, orders, provider logic)
│ ├── src/
│ ├── tsconfig.json
│ ├── package.json
│ ├── nodemon.json (optional)
│ └── .env.example
├── experience_1/ ← Experience 1 domain (e.g. patient-facing app, dashboard, or separate service)
│ ├── src/
│ ├── tsconfig.json
│ ├── package.json
│ └── .env.example
├── utils/ ← Shared utilities, helpers, types, constants
│ ├── src/
│ │ ├── index.ts
│ │ └── ... (add.ts, validators, date-utils, etc.)
│ ├── tsconfig.json
│ └── package.json
├── .gitignore
├── tsconfig.base.json ← Shared TypeScript compiler options
├── package.json ← Root workspace config
├── pnpm-workspace.yaml ← (if using pnpm — recommended)
└── README.md

## Install

At root: npm install

This installs all workspaces.

## Run

cd merchant
npm start

Same for experience_1.

## Shared Utilities

Import from '@monorepo/utils'

Example: add function used in index.ts of each domain.

## Environment Variables

- Shared: root .env
- Domain-specific: in each domain .env

In code, load shared then local as shown in index.ts.

## TypeScript

Root tsconfig.json with paths for shared utils.

Each domain and utils has own tsconfig extending root.
