# Decimal and BigInt

Sasat preserves decimal and bigint values across generated types, GraphQL, and its MySQL/PostgreSQL connectors.

| Database column | GraphQL scalar | TypeScript / resolver value | GraphQL JSON value |
| --- | --- | --- | --- |
| decimal / numeric | `Decimal` | `string` | String, e.g. `"123.4500"` |
| bigint | `BigInt` | `bigint` | String, e.g. `"9007199254740993"` |
| Other integer columns | `Int` | `number` | Number (GraphQL's signed 32-bit range) |
| float / double | `Float` | `number` | Number |

Hash ID columns continue to use GraphQL `ID`. A bigint Hash ID uses `bigint` internally and `makeBigIntIdEncoder` for encoding/decoding.

## Inputs and results

Pass strings in JSON variables for both scalars:

```graphql
mutation Save($amount: Decimal!, $quantity: BigInt!) {
  createOrder(order: { amount: $amount, quantity: $quantity }) {
    amount
    quantity
  }
}
```

```json
{
  "amount": "12345678901234567890.123456789012345678",
  "quantity": "9007199254740993"
}
```

`Decimal` accepts finite decimal strings without exponent notation. It also accepts integer/decimal GraphQL literals directly from their source text, without converting through JavaScript `number`. Numeric JSON variables, NaN, Infinity, whitespace, and exponent notation are rejected. Decimal output must be a string; it is not rounded or reformatted by the scalar.

`BigInt` accepts integer strings and integer GraphQL literals. Safe integer numeric variables are also accepted; unsafe or fractional JavaScript numbers are rejected. Resolver inputs are native `bigint`, including small values such as `1n`. GraphQL results always contain strings. Neither scalar imposes a database range: precision, scale, signedness and range are enforced by your column definition. Nullable fields accept and return null through GraphQL's normal null handling. Generated Decimal subscription filters compare strings exactly, including scale; normalize filter values to the representation your publisher emits.

Inside application code, use strings for decimal values and native bigint for integer values:

```ts
await orders.create({ amount: '123.4500', quantity: 9007199254740993n });
```

JavaScript arithmetic on decimal strings requires your own decimal arithmetic implementation. Converting either type to `number` can lose precision. A database may pad decimal values to the column's scale; a mutation with `noRefetch` returns the submitted/default value, while a later query returns the database's representation.

Generated SDL and resolvers register only the numeric scalars used by fields, inputs, or arguments. For a manually assembled schema, import `DecimalScalar` and `BigIntScalar` from `sasat` and register them under `Decimal` and `BigInt`.

## Connectors, defaults and notifications

The built-in connectors return bigint columns as native bigint and decimal/numeric columns as strings. This applies to direct queries, pools, and transactions. PostgreSQL `COUNT(*)` also has type bigint and now returns bigint. Explicit driver parser overrides can change these values; custom SQL executors must provide the same representations expected by generated types.

`CommandResponse.insertId` is `number | bigint`. PostgreSQL bigint IDs are bigint. MySQL command IDs are numbers when safely representable and bigint otherwise; generated data sources normalize bigint auto-increment columns to bigint even for small IDs. For MySQL unsigned auto-increment IDs above the signed 64-bit maximum, generated data sources use column metadata to correct the driver’s signed OK-packet representation. Direct `rawCommand()` IDs retain that signed representation because no column metadata is available; read the column or use `BigInt.asUintN(64, BigInt(result.insertId))` only when you know the column is unsigned. SQL values and query predicates accept bigint without a number conversion.

Define exact migration defaults using strings for decimals and bigint or integer strings for bigint columns:

```ts
t.column('amount').decimal(38, 18).default('0.123456789012345678');
t.column('quantity').bigInt().default(9007199254740993n);
```

Serialized migration metadata stores bigint defaults as strings, and generated data-source defaults reconstruct bigint. Existing numeric defaults remain accepted, but cannot recover precision already lost before they reach Sasat. Use exact strings/bigint when updating them.

Local PubSub retains native values. Redis PubSub uses a versioned envelope for messages containing bigint and restores native bigint on receipt; messages without bigint retain the existing JSON format. Upgrade all publishers and subscribers together before emitting bigint events. Custom PubSub implementations must provide equivalent lossless serialization. Direct `JSON.stringify()` of a data-source result containing bigint still throws; use GraphQL's scalar serialization or an application-specific JSON conversion.

## Upgrading existing applications

1. Update/build Sasat and run `yarn sasat generate` to regenerate entity types, SDL, resolvers, defaults and auto-increment metadata.
2. Change decimal application values to strings and bigint values to native bigint. Update GraphQL clients to map both scalars to strings on the wire; replace `Int` variable declarations with `Decimal`/`BigInt` where appropriate.
3. Regeneration updates standard `makeNumberIdEncoder(...)` declarations for bigint Hash IDs to `makeBigIntIdEncoder(...)`, preserving their arguments and salt. Review custom or aliased encoders manually.
4. Upgrade every Redis subscriber/publisher before sending bigint events, and test custom parser/serialization code.

These are breaking changes to the generated API and driver return types. No database type change is required solely for the new representations.
