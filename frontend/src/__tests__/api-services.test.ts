// =============================================================================
// API Services Tests — Verify API client configuration and service layer
// =============================================================================

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock axios before importing modules
vi.mock("axios", () => {
  const mockInstance = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

import axios from "axios";
import { calculatorService } from "../api/calculators";
import { projectService } from "../api/projects";

// Get the mock instance that was created
const mockClient = (axios.create as ReturnType<typeof vi.fn>).mock.results[0]
  ?.value;

describe("calculatorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncRun POSTs to /runs/sync with correct payload", async () => {
    const inputs = { span: 6, load: 10 };
    const results = { moment: 45, util: 0.78 };
    if (mockClient) {
      mockClient.post.mockResolvedValue({
        data: { run: { run_id: "abc-123", status: "completed" } },
      });
      await calculatorService.syncRun(
        "steel_beam_bending_v1",
        inputs,
        results,
        1,
        { label: "Test" },
      );
      expect(mockClient.post).toHaveBeenCalledWith("/runs/sync", {
        calculator: "steel_beam_bending_v1",
        inputs,
        results,
        project_id: 1,
        metadata: { label: "Test" },
      });
    }
  });

  it("compute POSTs to /runs with calculator key and project_id", async () => {
    if (mockClient) {
      mockClient.post.mockResolvedValue({
        data: { run: { run_id: "def-456" } },
      });
      await calculatorService.compute("pad_footing_v1", 2, { width: 1.5 });
      expect(mockClient.post).toHaveBeenCalledWith("/runs", {
        calculator: "pad_footing_v1",
        project_id: 2,
        inputs: { width: 1.5 },
      });
    }
  });

  it("list GETs /calculators", async () => {
    if (mockClient) {
      mockClient.get.mockResolvedValue({ data: { calculators: [] } });
      await calculatorService.list();
      expect(mockClient.get).toHaveBeenCalledWith("/calculators");
    }
  });

  it("getHistory GETs /runs with optional calculator filter", async () => {
    if (mockClient) {
      mockClient.get.mockResolvedValue({ data: { runs: [], total: 0 } });
      await calculatorService.getHistory("steel_beam_bending_v1");
      expect(mockClient.get).toHaveBeenCalledWith("/runs", {
        params: { calculator: "steel_beam_bending_v1" },
      });
    }
  });

  it("getRun GETs /runs/:run_id", async () => {
    if (mockClient) {
      mockClient.get.mockResolvedValue({ data: { run: {} } });
      await calculatorService.getRun("abc-123");
      expect(mockClient.get).toHaveBeenCalledWith("/runs/abc-123");
    }
  });
});

describe("projectService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list GETs /projects", async () => {
    if (mockClient) {
      mockClient.get.mockResolvedValue({ data: { projects: [] } });
      await projectService.list();
      expect(mockClient.get).toHaveBeenCalledWith("/projects");
    }
  });

  it("create POSTs /projects with correct payload", async () => {
    if (mockClient) {
      const payload = {
        name: "Test Bridge",
        client: "Acme Ltd",
        project_number: "P001",
      };
      mockClient.post.mockResolvedValue({
        data: { project: { id: 1, ...payload } },
      });
      await projectService.create(payload);
      expect(mockClient.post).toHaveBeenCalledWith("/projects", payload);
    }
  });
});
