import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("passwords", async () => {
  const { hashPassword, verifyPassword, passwordProblem, temporaryPassword } = await import("@/server/password");

  it("hashes with a random salt and verifies only the right password", async () => {
    const a = await hashPassword("correct horse battery");
    const b = await hashPassword("correct horse battery");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(a).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
    expect(await verifyPassword("correct horse batterY", a)).toBe(false);
  });

  it("rejects everything for an unknown account but still does the work", async () => {
    expect(await verifyPassword("anything at all", null)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });

  it("enforces a minimum length and rejects trivial passwords", () => {
    expect(passwordProblem("short")).toMatch(/at least 10/);
    expect(passwordProblem("aaaaaaaaaaaa")).toBeTruthy();
    expect(passwordProblem("my password 123")).toBeTruthy();
    expect(passwordProblem("river-lamp-orange-42")).toBeNull();
  });

  it("generates readable, unique temporary passwords that pass the rules", () => {
    const a = temporaryPassword();
    expect(a).toMatch(/^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/);
    expect(a).not.toBe(temporaryPassword());
    expect(passwordProblem(a)).toBeNull();
  });
});

describe("sign-in throttle", async () => {
  const { isLocked, recordFailure, clearFailures } = await import("@/server/rate-limit");

  it("locks after five failures, clears on success, and expires after the window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) recordFailure("email:a@x.com", t0);
    expect(isLocked("email:a@x.com", 5, t0)).toBe(false);
    recordFailure("email:a@x.com", t0);
    expect(isLocked("email:a@x.com", 5, t0 + 1000)).toBe(true);
    expect(isLocked("email:b@x.com", 5, t0)).toBe(false);
    expect(isLocked("email:a@x.com", 5, t0 + 16 * 60 * 1000)).toBe(false);
    recordFailure("email:c@x.com", t0);
    clearFailures("email:c@x.com");
    expect(isLocked("email:c@x.com", 1, t0)).toBe(false);
  });
});
