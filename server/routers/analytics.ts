import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";

// GA4 Data API Router
let analyticsClient: any = null;

async function getAnalyticsClient() {
  if (analyticsClient) return { client: analyticsClient, error: null };

  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim().replace(/^["']|["']$/g, "");
  let privateKey = process.env.GA4_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "");

  if (!clientEmail) {
    return { client: null, error: "GA4_CLIENT_EMAIL environment variable is missing." };
  }
  if (!privateKey) {
    return { client: null, error: "GA4_PRIVATE_KEY environment variable is missing." };
  }

  // Robustly convert escaped newlines (e.g. \n or \\n) to real newlines
  privateKey = privateKey
    .replace(/\\n/g, "\n")
    .replace(/\\\\n/g, "\n");

  // Ensure header and footer have proper newlines if squashed onto a single line
  if (!privateKey.includes("\n") && privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    privateKey = privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
      .replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----");
  }

  try {
    const { BetaAnalyticsDataClient } = await import("@google-analytics/data");

    analyticsClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });

    return { client: analyticsClient, error: null };
  } catch (err: any) {
    console.error("[GA4 Data API] Failed to initialize Google Analytics client:", err);
    return { client: null, error: `Google Auth Error: ${err?.message || err}` };
  }
}

function getPropertyId() {
  const rawId = process.env.GA4_PROPERTY_ID;
  if (!rawId) return null;
  const cleanId = rawId.trim().replace(/^["']|["']$/g, "");
  if (!cleanId) return null;
  return cleanId.startsWith("properties/") ? cleanId : `properties/${cleanId}`;
}

// Shared date range input schema
const dateRangeInput = z.object({
  startDate: z.string().default("30daysAgo"),
  endDate: z.string().default("today"),
});

export const analyticsRouter = router({
  /**
   * Overview: key metrics (total users, new users, sessions, page views, bounce rate)
   */
  getOverview: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      try {
        const { client, error: clientError } = await getAnalyticsClient();
        const property = getPropertyId();

        if (!client || !property) {
          return {
            totalUsers: 0,
            newUsers: 0,
            sessions: 0,
            pageViews: 0,
            avgSessionDuration: 0,
            bounceRate: 0,
            configured: false,
            error: clientError || (!property ? "GA4_PROPERTY_ID environment variable is missing." : "GA4 Client Error"),
          };
        }

        const [response] = await client.runReport({
          property,
          dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
          metrics: [
            { name: "totalUsers" },
            { name: "newUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
        });

        const row = response?.rows?.[0];
        const metricValues = row?.metricValues || [];

        return {
          totalUsers: parseInt(metricValues[0]?.value || "0"),
          newUsers: parseInt(metricValues[1]?.value || "0"),
          sessions: parseInt(metricValues[2]?.value || "0"),
          pageViews: parseInt(metricValues[3]?.value || "0"),
          avgSessionDuration: parseFloat(metricValues[4]?.value || "0"),
          bounceRate: parseFloat(metricValues[5]?.value || "0"),
          configured: true,
        };
      } catch (err: any) {
        console.error("[GA4 getOverview] Error:", err.message);
        return {
          totalUsers: 0,
          newUsers: 0,
          sessions: 0,
          pageViews: 0,
          avgSessionDuration: 0,
          bounceRate: 0,
          configured: false,
          error: err.message,
        };
      }
    }),

  /**
   * Top pages: most visited pages, ranked by page views
   */
  getTopPages: adminProcedure
    .input(
      dateRangeInput.extend({
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const { client } = await getAnalyticsClient();
        const property = getPropertyId();

        if (!client || !property) return [];

        const [response] = await client.runReport({
          property,
          dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
          dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
            { name: "averageSessionDuration" },
          ],
          limit: input.limit,
          orderBys: [
            { metric: { metricName: "screenPageViews" }, desc: true },
          ],
        });

        return (response?.rows || []).map((row: any) => ({
          pagePath: row.dimensionValues?.[0]?.value || "",
          pageTitle: row.dimensionValues?.[1]?.value || "",
          pageViews: parseInt(row.metricValues?.[0]?.value || "0"),
          users: parseInt(row.metricValues?.[1]?.value || "0"),
          avgDuration: parseFloat(row.metricValues?.[2]?.value || "0"),
        }));
      } catch (err: any) {
        console.error("[GA4 getTopPages] Error:", err.message);
        return [];
      }
    }),

  /**
   * Daily visitors: trend data for line charts (users/sessions per day)
   */
  getDailyVisitors: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      try {
        const { client } = await getAnalyticsClient();
        const property = getPropertyId();

        if (!client || !property) return [];

        const [response] = await client.runReport({
          property,
          dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "totalUsers" },
            { name: "newUsers" },
            { name: "sessions" },
          ],
          orderBys: [
            { dimension: { dimensionName: "date" }, desc: false },
          ],
        });

        return (response?.rows || []).map((row: any) => {
          const dateStr = row.dimensionValues?.[0]?.value || "";
          const formatted = dateStr.length === 8
            ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
            : dateStr;

          return {
            date: formatted,
            users: parseInt(row.metricValues?.[0]?.value || "0"),
            newUsers: parseInt(row.metricValues?.[1]?.value || "0"),
            sessions: parseInt(row.metricValues?.[2]?.value || "0"),
          };
        });
      } catch (err: any) {
        console.error("[GA4 getDailyVisitors] Error:", err.message);
        return [];
      }
    }),

  /**
   * Traffic sources: where visitors are coming from (Google, Direct, Social, etc.)
   */
  getTrafficSources: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      try {
        const { client } = await getAnalyticsClient();
        const property = getPropertyId();

        if (!client || !property) return [];

        const [response] = await client.runReport({
          property,
          dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
          dimensions: [
            { name: "sessionSource" },
            { name: "sessionMedium" },
          ],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }],
          orderBys: [
            { metric: { metricName: "sessions" }, desc: true },
          ],
          limit: 10,
        });

        return (response?.rows || []).map((row: any) => ({
          source: row.dimensionValues?.[0]?.value || "(direct)",
          medium: row.dimensionValues?.[1]?.value || "(none)",
          sessions: parseInt(row.metricValues?.[0]?.value || "0"),
          users: parseInt(row.metricValues?.[1]?.value || "0"),
        }));
      } catch (err: any) {
        console.error("[GA4 getTrafficSources] Error:", err.message);
        return [];
      }
    }),

  /**
   * Device stats: desktop vs mobile vs tablet breakdown
   */
  getDeviceStats: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      try {
        const { client } = await getAnalyticsClient();
        const property = getPropertyId();

        if (!client || !property) return [];

        const [response] = await client.runReport({
          property,
          dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "totalUsers" }, { name: "sessions" }],
        });

        return (response?.rows || []).map((row: any) => ({
          device: row.dimensionValues?.[0]?.value || "unknown",
          users: parseInt(row.metricValues?.[0]?.value || "0"),
          sessions: parseInt(row.metricValues?.[1]?.value || "0"),
        }));
      } catch (err: any) {
        console.error("[GA4 getDeviceStats] Error:", err.message);
        return [];
      }
    }),

  /**
   * Geographic data: top cities and countries of visitors
   */
  getGeoStats: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      try {
        const { client } = await getAnalyticsClient();
        const property = getPropertyId();

        if (!client || !property) return [];

        const [response] = await client.runReport({
          property,
          dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
          dimensions: [{ name: "city" }, { name: "country" }],
          metrics: [{ name: "totalUsers" }, { name: "sessions" }],
          orderBys: [
            { metric: { metricName: "totalUsers" }, desc: true },
          ],
          limit: 15,
        });

        return (response?.rows || []).map((row: any) => ({
          city: row.dimensionValues?.[0]?.value || "(not set)",
          country: row.dimensionValues?.[1]?.value || "(not set)",
          users: parseInt(row.metricValues?.[0]?.value || "0"),
          sessions: parseInt(row.metricValues?.[1]?.value || "0"),
        }));
      } catch (err: any) {
        console.error("[GA4 getGeoStats] Error:", err.message);
        return [];
      }
    }),

  /**
   * Custom events: all tracked events with counts (donate clicks, form submits, etc.)
   */
  getCustomEvents: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      try {
        const { client } = await getAnalyticsClient();
        const property = getPropertyId();

        if (!client || !property) return [];

        const [response] = await client.runReport({
          property,
          dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
          orderBys: [
            { metric: { metricName: "eventCount" }, desc: true },
          ],
        });

        return (response?.rows || []).map((row: any) => ({
          eventName: row.dimensionValues?.[0]?.value || "",
          count: parseInt(row.metricValues?.[0]?.value || "0"),
          users: parseInt(row.metricValues?.[1]?.value || "0"),
        }));
      } catch (err: any) {
        console.error("[GA4 getCustomEvents] Error:", err.message);
        return [];
      }
    }),

  /**
   * Real-time active users: currently online visitors
   */
  getRealtime: adminProcedure.query(async () => {
    try {
      const { client } = await getAnalyticsClient();
      const property = getPropertyId();

      if (!client || !property) return { totalActive: 0, pages: [] };

      const [response] = await client.runRealtimeReport({
        property,
        metrics: [{ name: "activeUsers" }],
        dimensions: [{ name: "unifiedScreenName" }],
      });

      const totalActive = (response?.rows || []).reduce(
        (sum: number, row: any) =>
          sum + parseInt(row.metricValues?.[0]?.value || "0"),
        0
      );

      const pages = (response?.rows || []).map((row: any) => ({
        page: row.dimensionValues?.[0]?.value || "(unknown)",
        activeUsers: parseInt(row.metricValues?.[0]?.value || "0"),
      }));

      return { totalActive, pages };
    } catch (err: any) {
      console.error("[GA4 getRealtime] Error:", err.message);
      return { totalActive: 0, pages: [] };
    }
  }),
});
