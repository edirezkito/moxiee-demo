import "@testing-library/jest-dom/vitest";

// Supabase client reads these at import time — provide dummy values so
// importing modules that touch src/lib/supabase.ts doesn't throw during
// tests. Tests that need real Supabase behavior should mock the client
// directly instead of relying on these.
import { vi } from "vitest";

vi.stubEnv("VITE_SUPABASE_URL", "https://test-project.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
