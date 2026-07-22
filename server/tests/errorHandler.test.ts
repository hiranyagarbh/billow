/**
 * ─── Error Handler Middleware Tests ──────────────────────────────────────────
 *
 * Covers the global Express error handler from middleware/errorHandler.ts.
 *
 * Uses lightweight request/response mocks instead of supertest to keep
 * dependencies at zero and test the middleware in isolation.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ZodError, ZodIssue } from "zod";
import { errorHandler } from "../src/middleware/errorHandler.js";

// ─── Mock Helpers ───────────────────────────────────────────────────────────

/** Minimal mock of Express Request */
function mockRequest(method = "GET", path = "/test") {
  return { method, path } as any;
}

/** Minimal mock of Express Response that captures status and JSON output */
function mockResponse() {
  let _status = 200;
  let _body: any = null;

  const res: any = {
    status(code: number) {
      _status = code;
      return res;
    },
    json(body: any) {
      _body = body;
      return res;
    },
    // Expose captured values for assertions
    get _statusCode() {
      return _status;
    },
    get _jsonBody() {
      return _body;
    },
  };

  return res;
}

const noop = () => {};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("errorHandler", () => {
  // Suppress console.error during tests to keep output clean
  let originalConsoleError: typeof console.error;
  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = () => {};
  });

  // Restore after each test — using a workaround since node:test
  // afterEach can be imported but we keep it simple
  function restore() {
    console.error = originalConsoleError;
  }

  it("returns 400 with field details for ZodError", () => {
    const issues: ZodIssue[] = [
      {
        code: "invalid_type",
        expected: "string",
        received: "undefined",
        path: ["start"],
        message: "Start date must be YYYY-MM-DD format",
      },
    ];
    const zodError = new ZodError(issues);

    const req = mockRequest("GET", "/api/costs/daily");
    const res = mockResponse();

    errorHandler(zodError, req, res, noop);
    restore();

    assert.equal(res._statusCode, 400);
    assert.equal(res._jsonBody.error, "Validation failed");
    assert.ok(Array.isArray(res._jsonBody.details));
    assert.equal(res._jsonBody.details.length, 1);
    assert.equal(res._jsonBody.details[0].field, "start");
    assert.ok(res._jsonBody.timestamp, "should include a timestamp");
  });

  it("returns 500 for generic Error in development", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const error = new Error("Something broke");
    const req = mockRequest("POST", "/api/budget");
    const res = mockResponse();

    errorHandler(error, req, res, noop);
    restore();
    process.env.NODE_ENV = originalEnv;

    assert.equal(res._statusCode, 500);
    assert.equal(res._jsonBody.error, "Something broke");
    assert.ok(res._jsonBody.stack, "should include stack in development");
  });

  it("hides error message and stack in production for 500 errors", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const error = new Error("Internal DB connection failed");
    const req = mockRequest("GET", "/api/costs/summary");
    const res = mockResponse();

    errorHandler(error, req, res, noop);
    restore();
    process.env.NODE_ENV = originalEnv;

    assert.equal(res._statusCode, 500);
    assert.equal(res._jsonBody.error, "An unexpected server error occurred.");
    assert.equal(res._jsonBody.stack, undefined, "should not leak stack in production");
  });

  it("uses custom status code from error object", () => {
    const error: any = new Error("Not Found");
    error.status = 404;

    const req = mockRequest("GET", "/api/unknown");
    const res = mockResponse();

    errorHandler(error, req, res, noop);
    restore();

    assert.equal(res._statusCode, 404);
    assert.equal(res._jsonBody.error, "Not Found");
  });

  it("includes a timestamp in every error response", () => {
    const error = new Error("test");
    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req, res, noop);
    restore();

    assert.ok(res._jsonBody.timestamp, "response should have a timestamp");
    // Validate it's a parseable ISO string
    const parsed = new Date(res._jsonBody.timestamp);
    assert.ok(!isNaN(parsed.getTime()), "timestamp should be valid ISO date");
  });

  it("handles ZodError with multiple field failures", () => {
    const issues: ZodIssue[] = [
      {
        code: "invalid_type",
        expected: "string",
        received: "undefined",
        path: ["start"],
        message: "Required",
      },
      {
        code: "invalid_type",
        expected: "string",
        received: "undefined",
        path: ["end"],
        message: "Required",
      },
    ];
    const zodError = new ZodError(issues);

    const req = mockRequest("GET", "/api/costs/daily");
    const res = mockResponse();

    errorHandler(zodError, req, res, noop);
    restore();

    assert.equal(res._statusCode, 400);
    assert.equal(res._jsonBody.details.length, 2);
    assert.equal(res._jsonBody.details[0].field, "start");
    assert.equal(res._jsonBody.details[1].field, "end");
  });
});
