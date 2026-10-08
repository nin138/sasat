# Changing and updating your application

[README](../README.md) · [Configuration and CLI](configuration.md) · [Customization](runtime.md)

This guide continues from the README quick start. Run commands from your application root.

## Changing tables or columns

Create a new migration:

```sh
yarn sasat migration:create addUserEmail
```

Describe the change in up and its reversal in down. Access an existing table through `store.table('user')`; use addColumn and dropColumn to change its columns. The `sasat/migration` declarations and editor completion describe the available arguments.

Keep applied migrations unchanged and express changes in new files. When adding a column to a table with existing data, decide how nullability, defaults, and existing-row values should work.

Check the connection target, then use a development database:

```sh
yarn sasat migrate --dry
yarn sasat migrate --generateFiles
yarn tsc --noEmit
```

Restart your server and verify reads, creates, and updates using the changed fields. A dry run replays migration definitions without running apply hooks. See [dry-run behavior](configuration.md#dry-run).

## Changing the exposed API

Queries and Mutations select the operations to expose. Add new operations with the table's addGQLQuery/addGQLMutation methods. To replace existing settings, use setGQLOption with the complete intended configuration.

- Enable GraphQL on the table and register the desired operations.
- Implement middleware in out/middlewares.ts and register its exported name in the operation configuration.
- Keep context.ts types consistent with the server's context factory.
- Extend out/schema.ts for custom fields and resolvers.

Apply and regenerate after changing migration definitions. To rebuild code from existing definitions without applying the normal database migration SQL:

```sh
yarn sasat generate
yarn tsc --noEmit
```

Generation does not guarantee that the connected database has reached those definitions. Keep the code and database state in sync.

## Verifying your application

Start the README server:

```sh
yarn tsx server.ts
```

Check that the GraphQL endpoint responds:

```sh
curl http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"{ __typename }"}'
```

The response `{"data":{"__typename":"Query"}}` verifies HTTP and schema setup, not database access. Also run createUser and users from the README to exercise the database.

Application tests should cover the CRUD operations, relationships, paging, and permitted/denied access that you actually use. If subscriptions are enabled, test subscription cleanup and cross-process delivery as well.

The `makeTestDB` helper from `sasat/testing` creates a temporary database using generated test.migration.json. Calling release on the returned client drops that database. Configure a test-only connection through testDB; without it, the helper falls back to db. The account needs permission to create and drop databases.

## Upgrading Sasat

After updating the Sasat version in your application:

1. Review the changes affecting generated code and your public schema.
2. Run `yarn sasat generate` and inspect the generated diff.
3. Apply required updates to preserved files such as schema.ts, context.ts, and pubsub.ts.
4. Run `yarn tsc --noEmit` and your application tests.
5. Update API clients if field names, types, or required inputs have changed.

Generation prepares and syntax-checks TypeScript before replacing output. `generate` and `migrate --generateFiles` publish generated code, extension updates, `currentSchema.yml`, and `test.migration.json` together, with rollback on ordinary filesystem errors. Existing custom files retain their preservation rules. See [generation failure and recovery](migration-lifecycle.md#generation-failure-and-recovery) for the scope and limitations. Keep generated output and custom extensions under version control.

## Applying changes in another environment

Provide the environment's connection settings and sasat.yml, apply the required migrations, then start the application with matching generated code. Starting the server does not automatically run migrate.

If the CLI compiles migrations in that environment, include their TypeScript sources. Even with precompiled .mjs files and `--skipBuild`, .ts files are still needed for migration enumeration. Build and distribute the application according to your chosen server and runtime environment.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Configuration is not loaded | Run from the application directory containing sasat.yml |
| Database connection fails | Database existence, host/port, permissions, and environment variables for both CLI and server |
| .env values are ignored | Load the file through your startup tooling; Sasat does not load it automatically |
| Generated imports lack .js | Set generator.addJsExtToImportStatement to true and regenerate; inspect preserved files too |
| An operation is absent from GraphQL | enableGQL, operation registration, regeneration, and server restart |
| Events do not reach another process | Both servers' PUBSUB_BACKEND, REDIS_URL, and PUBSUB_PREFIX settings |
| An upgrade appears to have no effect | Check regenerated output and whether preserved files need manual changes |

For input and column-type boundaries, see [usage considerations](runtime.md#limitations).
