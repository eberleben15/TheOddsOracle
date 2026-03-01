/**
 * Tests for Config Versioning
 */

import { describe, it, expect, vi } from "vitest";
import {
  getCurrentConfigVersion,
  incrementConfigVersion,
  getConfigByVersion,
  getConfigForUser,
  DEFAULT_PIPELINE_CONFIG,
} from "@/lib/feedback-pipeline-config";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    modelConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    aBTestAssignment: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Config Versioning", () => {
  it("should get current config version", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.modelConfig.findUnique).mockResolvedValue({
      key: "ats_pipeline_config",
      value: { version: 5 },
      updatedAt: new Date(),
    } as any);

    const version = await getCurrentConfigVersion();

    expect(version).toBe(5);
  });

  it("should return 0 if no config exists", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.modelConfig.findUnique).mockResolvedValue(null);

    const version = await getCurrentConfigVersion();

    expect(version).toBe(0);
  });

  it("should increment config version", () => {
    const config = { ...DEFAULT_PIPELINE_CONFIG, version: 3 };
    const incremented = incrementConfigVersion(config);

    expect(incremented.version).toBe(4);
    expect(incremented.updatedAt).not.toBe(config.updatedAt);
  });

  it("should get config for user in A/B test (control)", async () => {
    const { prisma } = await import("@/lib/prisma");
    
    // Mock config with A/B test enabled
    const testConfig = {
      ...DEFAULT_PIPELINE_CONFIG,
      version: 2,
      validationMode: "ab_test" as const,
      abTestName: "config_v2_vs_v1",
    };

    vi.mocked(prisma.modelConfig.findUnique).mockResolvedValue({
      key: "ats_pipeline_config",
      value: testConfig,
      updatedAt: new Date(),
    } as any);

    // Mock user assigned to control
    vi.mocked(prisma.aBTestAssignment.findUnique).mockResolvedValue({
      userId: "user1",
      testName: "config_v2_vs_v1",
      variant: "control",
      assignedAt: new Date(),
    } as any);

    const config = await getConfigForUser("user1", testConfig);

    // Control should get previous version (version 1 or default)
    expect(config.version).toBeLessThanOrEqual(1);
  });

  it("should get config for user in A/B test (treatment)", async () => {
    const { prisma } = await import("@/lib/prisma");
    
    const testConfig = {
      ...DEFAULT_PIPELINE_CONFIG,
      version: 2,
      validationMode: "ab_test" as const,
      abTestName: "config_v2_vs_v1",
    };

    vi.mocked(prisma.modelConfig.findUnique).mockResolvedValue({
      key: "ats_pipeline_config",
      value: testConfig,
      updatedAt: new Date(),
    } as any);

    // Mock user assigned to treatment
    vi.mocked(prisma.aBTestAssignment.findUnique).mockResolvedValue({
      userId: "user2",
      testName: "config_v2_vs_v1",
      variant: "treatment",
      assignedAt: new Date(),
    } as any);

    const config = await getConfigForUser("user2", testConfig);

    // Treatment should get new version
    expect(config.version).toBe(2);
  });

  it("should get config for user when not in A/B test", async () => {
    const { prisma } = await import("@/lib/prisma");
    
    const normalConfig = {
      ...DEFAULT_PIPELINE_CONFIG,
      version: 3,
      validationMode: "live" as const,
    };

    vi.mocked(prisma.modelConfig.findUnique).mockResolvedValue({
      key: "ats_pipeline_config",
      value: normalConfig,
      updatedAt: new Date(),
    } as any);

    const config = await getConfigForUser("user1", normalConfig);

    // Should get current config
    expect(config.version).toBe(3);
  });
});
