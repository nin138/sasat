# Agent Working Guide

## How This File Is Used

This file provides shared project instructions that Codex loads automatically.

## Project

Sasat is a TypeScript library and CLI that generates GraphQL code from relational database migration information.
The package uses ESM, and tsdown produces ESM and CommonJS builds along with type declarations.

- `src/`: Library and CLI implementation.
- `src/migration/`: Migration definitions and execution.
- `src/generatorv2/`: Code generation.
- `test/`: Jest tests, migrations, generated output, and related files.
- `dist/`: Build output.
- `docker/` and `docker-compose.yml`: Development environment.

## Working Guidelines

- Write explanations and completion reports concisely in Japanese.
- Review related implementation, tests, and configuration before making changes, and follow existing conventions.
- Preserve the user's existing changes and make the changes needed for the requested scope.
- Check the impact on public APIs, generated code compatibility, and migration behavior.
- When changing generated output, review its source and regenerate as needed.
- Manage dependencies with Yarn and keep `yarn.lock` consistent when updates are needed.
- Do not include credentials in logs, documentation, or commits.

## Validation

Run commands from the repository root.

- Build: `yarn build`
- Lint: `yarn lint`
- Code checks without modifying files: `yarn biome check <changed-files>`
- Targeted tests: `yarn test:single --runInBand <test-file>`

`yarn check` and `yarn format` modify files, so specify the target files and review the diff.
`yarn test` resets the database and runs migrations in its pretest step. Before running it, confirm that the connection points to a disposable test database.
Individual tests may also require a database, so check the prerequisites for the selected tests.

Perform validation appropriate to the changes. On completion, report what changed, validation results, and any checks that were not run with their reasons.
