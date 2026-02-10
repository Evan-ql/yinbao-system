import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the S3 storage functions before importing
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test", url: "https://test.com/test" }),
  storageGet: vi.fn().mockResolvedValue({ key: "test", url: "https://test.com/test" }),
}));

// Test that the clear API endpoints are properly defined
describe("Settings Clear API endpoints", () => {
  it("should have clear-products endpoint defined", async () => {
    // Import the router to verify routes exist
    const { default: router } = await import("./settingsApi");
    
    // Check that the router has the expected routes by looking at the stack
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));
    
    const clearProducts = routes.find((r: any) => r.path === "/clear-products");
    expect(clearProducts).toBeDefined();
    expect(clearProducts?.methods).toContain("post");
  });

  it("should have clear-banks endpoint defined", async () => {
    const { default: router } = await import("./settingsApi");
    
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));
    
    const clearBanks = routes.find((r: any) => r.path === "/clear-banks");
    expect(clearBanks).toBeDefined();
    expect(clearBanks?.methods).toContain("post");
  });

  it("should have clear-zhebiao endpoint defined", async () => {
    const { default: router } = await import("./settingsApi");
    
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));
    
    const clearZhebiao = routes.find((r: any) => r.path === "/clear-zhebiao");
    expect(clearZhebiao).toBeDefined();
    expect(clearZhebiao?.methods).toContain("post");
  });

  it("should have clear-core-networks endpoint defined", async () => {
    const { default: router } = await import("./settingsApi");
    
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));
    
    const clearCoreNetworks = routes.find((r: any) => r.path === "/clear-core-networks");
    expect(clearCoreNetworks).toBeDefined();
    expect(clearCoreNetworks?.methods).toContain("post");
  });

  it("should have clear-network-shorts endpoint defined", async () => {
    const { default: router } = await import("./settingsApi");
    
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));
    
    const clearNetworkShorts = routes.find((r: any) => r.path === "/clear-network-shorts");
    expect(clearNetworkShorts).toBeDefined();
    expect(clearNetworkShorts?.methods).toContain("post");
  });

  it("should have all original clear endpoints (clear-targets, clear-org)", async () => {
    const { default: router } = await import("./settingsApi");
    
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));
    
    const clearTargets = routes.find((r: any) => r.path === "/clear-targets");
    expect(clearTargets).toBeDefined();
    expect(clearTargets?.methods).toContain("post");

    const clearOrg = routes.find((r: any) => r.path === "/clear-org");
    expect(clearOrg).toBeDefined();
    expect(clearOrg?.methods).toContain("post");
  });

  it("should have 7 total clear endpoints", async () => {
    const { default: router } = await import("./settingsApi");
    
    const clearRoutes = router.stack
      .filter((layer: any) => layer.route && layer.route.path.startsWith("/clear-"))
      .map((layer: any) => layer.route.path);
    
    expect(clearRoutes).toContain("/clear-targets");
    expect(clearRoutes).toContain("/clear-org");
    expect(clearRoutes).toContain("/clear-products");
    expect(clearRoutes).toContain("/clear-banks");
    expect(clearRoutes).toContain("/clear-zhebiao");
    expect(clearRoutes).toContain("/clear-core-networks");
    expect(clearRoutes).toContain("/clear-network-shorts");
    expect(clearRoutes.length).toBe(7);
  });
});
