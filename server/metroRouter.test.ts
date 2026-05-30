import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("metroRouter", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  afterEach(() => {
    delete process.env.SEOUL_METRO_API_KEY;
  });

  describe("getApiStatus", () => {
    it("should return hasApiKey: false when SEOUL_METRO_API_KEY is not set", async () => {
      delete process.env.SEOUL_METRO_API_KEY;
      const { metroRouter } = await import("./metroRouter");
      
      // Access the procedure directly
      const caller = metroRouter.createCaller({} as any);
      const result = await caller.getApiStatus();
      
      expect(result).toEqual({ hasApiKey: false });
    });

    it("should return hasApiKey: true when SEOUL_METRO_API_KEY is set", async () => {
      process.env.SEOUL_METRO_API_KEY = "test-api-key-123";
      const { metroRouter } = await import("./metroRouter");
      
      const caller = metroRouter.createCaller({} as any);
      const result = await caller.getApiStatus();
      
      expect(result).toEqual({ hasApiKey: true });
    });
  });

  describe("getArrivals", () => {
    it("should return simulated data when no API key is set", async () => {
      delete process.env.SEOUL_METRO_API_KEY;
      const { metroRouter } = await import("./metroRouter");
      
      const caller = metroRouter.createCaller({} as any);
      const result = await caller.getArrivals({ stationName: "강남" });
      
      expect(result.isSimulated).toBe(true);
      expect(result.arrivals).toBeDefined();
      expect(Array.isArray(result.arrivals)).toBe(true);
      expect(result.arrivals.length).toBeGreaterThan(0);
      
      // Check arrival structure
      const arrival = result.arrivals[0];
      expect(arrival).toHaveProperty("stationName", "강남");
      expect(arrival).toHaveProperty("lineId");
      expect(arrival).toHaveProperty("direction");
      expect(arrival).toHaveProperty("destination");
      expect(arrival).toHaveProperty("arrivalMessage");
      expect(arrival).toHaveProperty("arrivalTime");
      expect(arrival).toHaveProperty("trainType");
      expect(arrival).toHaveProperty("currentStation");
    });

    it("should call Seoul API when API key is set", async () => {
      process.env.SEOUL_METRO_API_KEY = "test-api-key-123";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          realtimeArrivalList: [
            {
              statnNm: "강남",
              subwayId: "1002",
              trainLineNm: "잠실 방면",
              bstatnNm: "잠실",
              statnTid: "1002000216",
              statnTnm: "잠실",
              lstcarAt: "1",
              arvlMsg2: "3분 후",
              arvlMsg3: "역삼",
              barvlDt: "180",
              btrainSttus: "0",
            },
          ],
        }),
      });

      const { metroRouter } = await import("./metroRouter");
      const caller = metroRouter.createCaller({} as any);
      const result = await caller.getArrivals({ stationName: "강남" });
      
      expect(result.isSimulated).toBe(false);
      expect(result.arrivals).toHaveLength(1);
      expect(result.arrivals[0]).toEqual({
        stationName: "강남",
        lineId: "2",
        direction: "잠실 방면",
        destination: "잠실",
        terminusId: "1002000216",
        terminusName: "잠실",
        isLastTrain: true,
        arrivalMessage: "3분 후",
        arrivalTime: 180,
        trainType: "일반",
        currentStation: "역삼",
      });
      
      // Verify fetch was called with correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("test-api-key-123")
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("강남"))
      );
    });

    it("should fallback to simulated data when API returns error", async () => {
      process.env.SEOUL_METRO_API_KEY = "test-api-key-123";
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { metroRouter } = await import("./metroRouter");
      const caller = metroRouter.createCaller({} as any);
      const result = await caller.getArrivals({ stationName: "강남" });
      
      expect(result.isSimulated).toBe(true);
      expect(result.arrivals.length).toBeGreaterThan(0);
    });

    it("should fallback to simulated data when fetch throws", async () => {
      process.env.SEOUL_METRO_API_KEY = "test-api-key-123";
      
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { metroRouter } = await import("./metroRouter");
      const caller = metroRouter.createCaller({} as any);
      const result = await caller.getArrivals({ stationName: "강남" });
      
      expect(result.isSimulated).toBe(true);
      expect(result.arrivals.length).toBeGreaterThan(0);
    });

    it("should map subway IDs correctly for express trains", async () => {
      process.env.SEOUL_METRO_API_KEY = "test-api-key-123";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          realtimeArrivalList: [
            {
              statnNm: "서울역",
              subwayId: "1065",
              trainLineNm: "인천공항 방면",
              bstatnNm: "인천공항",
              arvlMsg2: "5분 후",
              arvlMsg3: "공덕",
              barvlDt: "300",
              btrainSttus: "1", // 급행
            },
          ],
        }),
      });

      const { metroRouter } = await import("./metroRouter");
      const caller = metroRouter.createCaller({} as any);
      const result = await caller.getArrivals({ stationName: "서울역" });
      
      expect(result.isSimulated).toBe(false);
      expect(result.arrivals[0].lineId).toBe("airport");
      expect(result.arrivals[0].trainType).toBe("급행");
    });
  });
});
