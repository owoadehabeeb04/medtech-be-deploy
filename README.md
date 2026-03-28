# MedTech Monorepo

Central monorepo for MedTech applications and shared utilities.  
Contains isolated domains (merchant backend, experience_1 backend or service, shared utilities) built with **Node.js**, **TypeScript**, and modern monorepo practices.

## Documentation

- [Monorepo architecture](./docs/monorepo-architecture.md)
- [experience_1 auth Postman checklist](./docs/postman/experience_1/experience1-auth-postman-checklist.md)
- [Merchant subscription Postman collection](./docs/postman/merchant/Meditech_Merchant_Subscription.postman_collection.json)

## Project Structure

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
