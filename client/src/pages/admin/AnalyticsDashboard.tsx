import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  TrendingUp,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  MousePointerClick,
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const DATE_RANGES = [
  { label: "7 Days", value: "7daysAgo" },
  { label: "30 Days", value: "30daysAgo" },
  { label: "90 Days", value: "90daysAgo" },
] as const;

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

// KPI Card component
function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// Section wrapper
function Section({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <Icon className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// Loading skeleton
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

// Error display
function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
      <span className="font-medium">Error:</span> {message}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<string>("30daysAgo");

  const dateInput = { startDate: dateRange, endDate: "today" };

  // Fetch all analytics data
  const overview = trpc.analytics.getOverview.useQuery(dateInput, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const dailyVisitors = trpc.analytics.getDailyVisitors.useQuery(dateInput, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const topPages = trpc.analytics.getTopPages.useQuery(
    { ...dateInput, limit: 15 },
    { retry: 1, refetchOnWindowFocus: false }
  );
  const trafficSources = trpc.analytics.getTrafficSources.useQuery(dateInput, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const deviceStats = trpc.analytics.getDeviceStats.useQuery(dateInput, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const geoStats = trpc.analytics.getGeoStats.useQuery(dateInput, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const customEvents = trpc.analytics.getCustomEvents.useQuery(dateInput, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const realtime = trpc.analytics.getRealtime.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30s
    retry: 1,
  });

  const isLoading = overview.isLoading;
  const apiError = overview.data?.error;
  const hasError =
    overview.error ||
    dailyVisitors.error ||
    topPages.error ||
    !!apiError;

  const refetchAll = () => {
    overview.refetch();
    dailyVisitors.refetch();
    topPages.refetch();
    trafficSources.refetch();
    deviceStats.refetch();
    geoStats.refetch();
    customEvents.refetch();
    realtime.refetch();
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Website Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track visitor activity on the public website
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time indicator */}
          {realtime.data && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>{realtime.data.totalActive} active now</span>
            </div>
          )}

          {/* Date range selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {DATE_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  dateRange === range.value
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={refetchAll}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Refresh data"
          >
            <RefreshCw
              className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* GA4 not configured warning */}
      {hasError && (
        <ErrorBox
          message={
            apiError ||
            overview.error?.message ||
            "Failed to load analytics data. Ensure GA4 credentials are configured in .env"
          }
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))
        ) : overview.data ? (
          <>
            <KpiCard
              title="Total Users"
              value={formatNumber(overview.data.totalUsers)}
              icon={Users}
              color="bg-blue-500"
            />
            <KpiCard
              title="New Users"
              value={formatNumber(overview.data.newUsers)}
              icon={TrendingUp}
              color="bg-green-500"
            />
            <KpiCard
              title="Sessions"
              value={formatNumber(overview.data.sessions)}
              icon={Activity}
              color="bg-purple-500"
            />
            <KpiCard
              title="Page Views"
              value={formatNumber(overview.data.pageViews)}
              icon={Eye}
              color="bg-orange-500"
            />
            <KpiCard
              title="Avg. Duration"
              value={formatDuration(overview.data.avgSessionDuration)}
              icon={Clock}
              color="bg-teal-500"
            />
            <KpiCard
              title="Bounce Rate"
              value={`${(overview.data.bounceRate * 100).toFixed(1)}%`}
              icon={ArrowDownRight}
              color="bg-red-500"
            />
          </>
        ) : null}
      </div>

      {/* Charts Row 1: Daily Visitors + Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Visitors Line Chart - takes 2/3 */}
        <Section
          title="Daily Visitors"
          icon={TrendingUp}
          className="lg:col-span-2"
        >
          {dailyVisitors.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : dailyVisitors.data && dailyVisitors.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyVisitors.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  labelFormatter={(label) => {
                    try {
                      return new Date(label as string).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                    } catch {
                      return label as string;
                    }
                  }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  name="Sessions"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  name="New Users"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 py-12">
              No visitor data available for this period
            </p>
          )}
        </Section>

        {/* Traffic Sources Pie Chart - takes 1/3 */}
        <Section title="Traffic Sources" icon={Globe}>
          {trafficSources.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : trafficSources.data && trafficSources.data.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={trafficSources.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="sessions"
                    nameKey="source"
                    paddingAngle={2}
                  >
                    {trafficSources.data.map((_: any, i: number) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {trafficSources.data.slice(0, 5).map((s: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                      <span className="text-gray-700">
                        {s.source} / {s.medium}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {s.sessions}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-12">
              No traffic source data available
            </p>
          )}
        </Section>
      </div>

      {/* Charts Row 2: Device Stats + Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Stats Bar Chart */}
        <Section title="Device Breakdown" icon={Monitor}>
          {deviceStats.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : deviceStats.data && deviceStats.data.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deviceStats.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="device" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Bar
                    dataKey="users"
                    name="Users"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {deviceStats.data.map((d: any, i: number) => {
                  const total = deviceStats.data!.reduce(
                    (s: number, x: any) => s + x.users,
                    0
                  );
                  const pct = total > 0 ? ((d.users / total) * 100).toFixed(1) : "0";
                  const DeviceIcon =
                    d.device === "mobile"
                      ? Smartphone
                      : d.device === "tablet"
                      ? Tablet
                      : Monitor;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 text-gray-700">
                        <DeviceIcon className="w-4 h-4" />
                        <span className="capitalize">{d.device}</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-12">
              No device data available
            </p>
          )}
        </Section>

        {/* Top Pages Table */}
        <Section title="Top Pages" icon={Eye} className="lg:col-span-2">
          {topPages.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : topPages.data && topPages.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="pb-3 font-semibold text-gray-600">Page</th>
                    <th className="pb-3 font-semibold text-gray-600 text-right">
                      Views
                    </th>
                    <th className="pb-3 font-semibold text-gray-600 text-right">
                      Users
                    </th>
                    <th className="pb-3 font-semibold text-gray-600 text-right hidden sm:table-cell">
                      Avg. Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.data.map((page: any, i: number) => (
                    <tr
                      key={i}
                      className="border-b border-gray-50 hover:bg-gray-50 transition"
                    >
                      <td className="py-2.5">
                        <div>
                          <p className="font-medium text-gray-800 truncate max-w-[250px]">
                            {page.pageTitle || page.pagePath}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-[250px]">
                            {page.pagePath}
                          </p>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-900">
                        {formatNumber(page.pageViews)}
                      </td>
                      <td className="py-2.5 text-right text-gray-600">
                        {formatNumber(page.users)}
                      </td>
                      <td className="py-2.5 text-right text-gray-600 hidden sm:table-cell">
                        {formatDuration(page.avgDuration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-12">
              No page data available
            </p>
          )}
        </Section>
      </div>

      {/* Row 3: Geographic Data + Custom Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Data */}
        <Section title="Top Locations" icon={MapPin}>
          {geoStats.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : geoStats.data && geoStats.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="pb-3 font-semibold text-gray-600">City</th>
                    <th className="pb-3 font-semibold text-gray-600">
                      Country
                    </th>
                    <th className="pb-3 font-semibold text-gray-600 text-right">
                      Users
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {geoStats.data.map((geo: any, i: number) => (
                    <tr
                      key={i}
                      className="border-b border-gray-50 hover:bg-gray-50 transition"
                    >
                      <td className="py-2 text-gray-800 font-medium">
                        {geo.city}
                      </td>
                      <td className="py-2 text-gray-600">{geo.country}</td>
                      <td className="py-2 text-right font-medium text-gray-900">
                        {geo.users}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-12">
              No geographic data available
            </p>
          )}
        </Section>

        {/* Custom Events */}
        <Section title="Event Tracking" icon={MousePointerClick}>
          {customEvents.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : customEvents.data && customEvents.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="pb-3 font-semibold text-gray-600">Event</th>
                    <th className="pb-3 font-semibold text-gray-600 text-right">
                      Count
                    </th>
                    <th className="pb-3 font-semibold text-gray-600 text-right">
                      Users
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customEvents.data.map((evt: any, i: number) => (
                    <tr
                      key={i}
                      className="border-b border-gray-50 hover:bg-gray-50 transition"
                    >
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          <MousePointerClick className="w-3 h-3" />
                          {evt.eventName}
                        </span>
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900">
                        {formatNumber(evt.count)}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {evt.users}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-12">
              No events tracked yet. Button clicks and form submissions will
              appear here once visitors interact with the website.
            </p>
          )}
        </Section>
      </div>

      {/* Real-time section */}
      {realtime.data && realtime.data.pages.length > 0 && (
        <Section title="Live — Currently Active Pages" icon={Activity}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {realtime.data.pages.map((page: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-4 py-3"
              >
                <span className="text-sm text-gray-700 truncate max-w-[200px]">
                  {page.page}
                </span>
                <span className="text-sm font-bold text-green-700 ml-2">
                  {page.activeUsers} <span className="font-normal">users</span>
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
