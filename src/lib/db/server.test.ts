import { afterEach, describe, expect, it, vi } from "vitest";
import { hasSupabaseServerConfig, shouldUseLocalDevelopmentStore } from "./server";

const originalEnv = { ...process.env };

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...originalEnv };
});

describe("database server configuration", () => {
  it("uses local development storage only outside production when Supabase is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.stubEnv("NODE_ENV", "development");

    expect(hasSupabaseServerConfig()).toBe(false);
    expect(shouldUseLocalDevelopmentStore()).toBe(true);
  });

  it("does not use local development storage in production when Supabase is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.stubEnv("NODE_ENV", "production");

    expect(hasSupabaseServerConfig()).toBe(false);
    expect(shouldUseLocalDevelopmentStore()).toBe(false);
  });
});
