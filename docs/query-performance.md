# First-row queries and mutation refetches

[README](../README.md) · [Runtime APIs](runtime.md) · [Development](development.md)

## Selecting one parent

`SasatDBDatasource.first(fields, options, context)` returns one parent or null. Without joins, SQL uses `LIMIT 1`. With joins, a subquery selects one parent identity and the outer query retrieves its matching related rows. Applying `LIMIT 1` to the outer joined result would lose children.

The parent selection preserves the existing WHERE, ORDER BY, explicit joins, context-dependent relation conditions, and lock mode. Composite primary keys are matched using every key column. The outer query retains the same conditions, so a filter on a child column still filters the returned children. A nonzero limit is capped at one parent; `limit: 0` returns null. Negative, fractional, non-finite, and unsafe limits/offsets are rejected before SQL execution.

With joins, an offset still skips matching SQL rows when choosing the first parent, as in the former `find(...)[0]` implementation. It is not a count of distinct parents. Use `findPageable` for parent pagination. Without ORDER BY, the selected parent is unspecified. A parent with many children can still produce many rows, and the database may inspect more rows than it returns to the application.

The operation remains one SELECT. `first` still calls the overridable `find` method; custom overrides should forward the options when delegating to `super.find`. Direct `find` and `findPageable` calls retain their existing behavior.

## Fetching a mutation result

Generated create/update resolvers now pass the GraphQL selection and request context to their data-source `findBy...` method. Selected scalar columns and relations are fetched together. Primary keys needed for hydration are included automatically. Aliases, fragments, `@skip`, and `@include` use the same selection parser as queries.

When a mutation publishes an event, refetch also includes all scalar columns of the parent. Publication keeps the scalar payload, excluding preloaded relations: subscription selections and their context can differ from the mutation request. This preserves subscription fields and filters even when the mutation did not request them. Notification failure handling remains best effort.

`noRefetch` retains its existing return behavior. Update with notifications enabled still refetches scalar values for its event. Direct resolver calls without GraphQL resolve info fall back to the usual scalar refetch. Custom data-source overrides receive the additional fields/options/context arguments; overrides that delegate to the generated base method should forward them.

Install/build the new Sasat version and run `yarn sasat generate` to update mutation resolvers. The `first` change is in the runtime and does not itself require regeneration.

## Sample measurements

The regression fixture uses an isolated database with 200 authors, 2,000 books, and 4,000 chapters. Each author has a 512-character biography, ten books, and two chapters per book. Times below are one sample run in the development containers, using seven measured iterations after one warm-up. Both database fixtures ran concurrently, so these are observations rather than latency guarantees.

| Operation | Engine | SELECTs before → after | Rows returned before → after | Wall time before → after |
| --- | --- | --- | --- | --- |
| first with books and chapters | MySQL | 1 → 1 | 4,000 → 20 | 14.00 → 0.60 ms |
| first with books and chapters | PostgreSQL | 1 → 1 | 4,000 → 20 | 18.76 → 0.99 ms |
| update with books and chapters | MySQL | 12 → 1 | 31 → 20 | 4.21 → 1.35 ms |
| update with books and chapters | PostgreSQL | 12 → 1 | 31 → 20 | 4.82 → 2.43 ms |

Both mutation paths additionally execute one UPDATE, giving 13 → 2 database statements. The first baseline executes `find(...)[0]`; the mutation baseline models the former write/scalar-refetch/lazy-relation path using the current data sources. The latter omits notification publication; the new path includes a local publication.

For `first`, serialized row size decreased from 2,548,997 to 12,465 bytes. Isolated hydration replay decreased from 5.72 to 0.024 ms on MySQL and 6.58 to 0.028 ms on PostgreSQL. Measured SELECT round-trip time decreased from 8.02 to 0.48 ms and 10.93 to 0.83 ms respectively.

For the mutation, serialized row size **increased** from 2,118 to 12,545 bytes because joins repeat parent scalar values, including the biography retained for notifications. Fewer round trips can therefore cost more transferred data. Wide parent rows and multiple child collections should be measured with application data; a join is not guaranteed to be faster for every selection.

Row size here is the UTF-8 size of serialized driver results, measured outside the timed request, not database wire traffic. SELECT round-trip timings include driver/network costs and are summed across requests; concurrent requests can make that sum exceed wall time. Hydration replay measures `hydrate` separately on the captured rows and excludes SQL generation. No server-only execution time was measured.

The fixture prints `S08_METRIC` records when running the integration suites:

```sh
yarn test:integration:postgres
yarn test:integration:redis
```

See [development](development.md) for connection environment variables. These suites create and remove their own temporary databases.
