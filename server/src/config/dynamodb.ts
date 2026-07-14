/**
 * ─── DynamoDB Client Setup ───────────────────────────────────────────────────
 *
 * AWS SDK v3 uses a modular approach — you import only what you need.
 * Two clients are created here:
 *
 * 1. `dynamoClient`  — The low-level DynamoDB client. You'd use this for
 *    table management (CreateTable, DeleteTable, etc.).
 *
 * 2. `docClient`     — The "Document Client" wraps the low-level client and
 *    lets you work with plain JavaScript objects instead of DynamoDB's
 *    verbose attribute-value format (no more `{ S: "hello" }` nonsense).
 *
 * If `DYNAMODB_ENDPOINT` is set in .env (e.g. http://localhost:8000 for
 * DynamoDB Local), the client will point there instead of real AWS.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { config } from "./env.js";

// ── Low-level client ─────────────────────────────────────────────────────────
// We conditionally include `endpoint` only when DYNAMODB_ENDPOINT is defined.
// This avoids accidentally overriding the default AWS endpoint in production.
const clientConfig: ConstructorParameters<typeof DynamoDBClient>[0] = {
  region: config.AWS_REGION,
};

if (config.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = config.DYNAMODB_ENDPOINT;
}

export const dynamoClient = new DynamoDBClient(clientConfig);

// ── Document client ──────────────────────────────────────────────────────────
// `marshallOptions` and `unmarshallOptions` control how JS values are
// converted to/from DynamoDB types.  `removeUndefinedValues: true` is a
// quality-of-life setting so you don't have to strip undefineds manually.
export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true, // ignore undefined fields when writing
  },
  unmarshallOptions: {
    wrapNumbers: false, // return plain JS numbers, not BigNumber wrappers
  },
});
