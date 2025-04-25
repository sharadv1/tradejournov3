import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import {
  format,
  subDays,
  startOfWeek,
  startOfMonth,
  parseISO,
  isValid,
} from "date-fns";
import Calendar from "./Calendar";

interface PerformanceChartProps {
  timeframe?: "daily" | "weekly" | "monthly";
}

interface PerformanceData {
  date: string;
  cumulativeValue: number;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  timeframe: initialTimeframe = "daily",
}) => {
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">(
    initialTimeframe,
  );
  const [viewMode, setViewMode] = useState<"chart" | "calendar">("chart");
  const [chartData, setChartData] = useState<{
    daily: PerformanceData[];
    weekly: PerformanceData[];
    monthly: PerformanceData[];
  }>({
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [calendarData, setCalendarData] = useState<
    {
      date: string;
      pl: number;
      tradeCount: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTradeData = async () => {
      setLoading(true);
      try {
        // Fetch all closed or partially closed trades with trade closures
        const { data: trades, error } = await supabase
          .from("trades")
          .select("*, trade_closures(*)")
          .or("status.eq.closed,status.eq.partial");

        if (error) throw error;

        if (trades && trades.length > 0) {
          // Process trades for different timeframes
          const processedData = processTradeData(trades);
          setChartData(processedData);

          // Process data for calendar view
          const calendarProcessedData = processCalendarData(trades);
          setCalendarData(calendarProcessedData);
        }
      } catch (error) {
        console.error("Error fetching trade data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTradeData();
  }, []);

  const calculateTradePL = (trade: any) => {
    let pnl = 0;
    let totalClosedFromClosures = 0;
    let totalRMultiple = 0;
    let validRMultipleCount = 0;

    // Calculate total closed position size from closures
    if (trade.trade_closures && trade.trade_closures.length > 0) {
      trade.trade_closures.forEach((closure: any) => {
        totalClosedFromClosures +=
          parseFloat(closure.closed_position_size) || 0;

        if (closure.r_multiple !== null && closure.r_multiple !== undefined) {
          totalRMultiple += parseFloat(closure.r_multiple);
          validRMultipleCount++;
        }
      });

      // Calculate P&L from closures
      pnl = trade.trade_closures.reduce((sum: number, closure: any) => {
        const closurePrice = parseFloat(closure.close_price) || 0;
        const closureSize = parseFloat(closure.closed_position_size) || 0;
        const symbol = trade.symbol?.toLowerCase() || "";
        const isFutures =
          symbol === "mes" || symbol === "es" || symbol === "nq";

        let closurePnl = 0;

        if (isFutures) {
          // For futures, calculate using tick size and tick value
          let tickSize = 0.25;
          let tickValue = 1.25; // Default for MES

          if (symbol === "es") {
            tickSize = 0.25;
            tickValue = 12.5;
          } else if (symbol === "nq") {
            tickSize = 0.25;
            tickValue = 5.0;
          } else if (symbol === "mnq") {
            tickSize = 0.25;
            tickValue = 0.5;
          }

          const priceDiff =
            trade.direction === "long"
              ? closurePrice - trade.entry_price
              : trade.entry_price - closurePrice;

          const ticksOfPL = Math.abs(priceDiff) / tickSize;
          closurePnl =
            (priceDiff >= 0 ? 1 : -1) * ticksOfPL * tickValue * closureSize;
        } else {
          // For stocks, crypto, forex
          if (trade.direction === "long") {
            closurePnl = (closurePrice - trade.entry_price) * closureSize;
          } else {
            closurePnl = (trade.entry_price - closurePrice) * closureSize;
          }
        }

        return sum + closurePnl;
      }, 0);
    } else {
      // Fallback to simple calculation if no closures
      const closedSize =
        totalClosedFromClosures > 0
          ? totalClosedFromClosures
          : trade.position_size_closed || trade.position_size;

      const symbol = trade.symbol?.toLowerCase() || "";
      const isFutures = symbol === "mes" || symbol === "es" || symbol === "nq";

      if (isFutures) {
        // For futures, calculate using tick size and tick value
        let tickSize = 0.25;
        let tickValue = 1.25; // Default for MES

        if (symbol === "es") {
          tickSize = 0.25;
          tickValue = 12.5;
        } else if (symbol === "nq") {
          tickSize = 0.25;
          tickValue = 5.0;
        } else if (symbol === "mnq") {
          tickSize = 0.25;
          tickValue = 0.5;
        }

        const priceDiff =
          trade.direction === "long"
            ? (trade.exit_price || 0) - trade.entry_price
            : trade.entry_price - (trade.exit_price || 0);

        const ticksOfPL = Math.abs(priceDiff) / tickSize;
        pnl = (priceDiff >= 0 ? 1 : -1) * ticksOfPL * tickValue * closedSize;
      } else {
        // For stocks, crypto, forex
        if (trade.direction === "long") {
          pnl = ((trade.exit_price || 0) - trade.entry_price) * closedSize;
        } else {
          pnl = (trade.entry_price - (trade.exit_price || 0)) * closedSize;
        }
      }
    }

    return {
      pnl,
      avgRMultiple:
        validRMultipleCount > 0 ? totalRMultiple / validRMultipleCount : null,
    };
  };

  const processTradeData = (trades: any[]) => {
    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate P&L for each trade using the improved calculation
    const tradesWithPL = sortedTrades.map((trade) => {
      const { pnl } = calculateTradePL(trade);

      return {
        ...trade,
        pl: pnl,
        date: new Date(`${trade.date}T${trade.time}`),
      };
    });

    // Group by day, week, and month
    const dailyData = groupByTimeframe(tradesWithPL, "daily");
    const weeklyData = groupByTimeframe(tradesWithPL, "weekly");
    const monthlyData = groupByTimeframe(tradesWithPL, "monthly");

    return {
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
    };
  };

  const groupByTimeframe = (
    trades: any[],
    timeframe: "daily" | "weekly" | "monthly",
  ) => {
    const grouped: Record<string, number> = {};
    let cumulativeValue = 0;

    trades.forEach((trade) => {
      if (!isValid(trade.date)) return;

      let dateKey;
      if (timeframe === "daily") {
        dateKey = format(trade.date, "MM/dd");
      } else if (timeframe === "weekly") {
        const weekStart = startOfWeek(trade.date);
        dateKey = `Week ${format(weekStart, "MM/dd")}`;
      } else {
        dateKey = format(trade.date, "MMM");
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = 0;
      }
      grouped[dateKey] += trade.pl;
    });

    // Convert to array and calculate cumulative values
    const result: PerformanceData[] = [];
    Object.entries(grouped).forEach(([date, value]) => {
      cumulativeValue += value;
      result.push({
        date,
        cumulativeValue: parseFloat(cumulativeValue.toFixed(2)),
      });
    });

    return result;
  };

  const currentData = chartData[timeframe] || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-blue-500">
            {payload[0].name}: ${payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Process data for calendar view
  const processCalendarData = (trades: any[]) => {
    // Group trades by date and calculate P&L and trade count
    const groupedByDate: Record<string, { pl: number; tradeCount: number }> =
      {};

    trades.forEach((trade) => {
      // Only include closed or partially closed trades
      if (
        !trade.date ||
        !trade.time ||
        (trade.status !== "closed" && trade.status !== "partial")
      )
        return;

      const dateKey = format(new Date(`${trade.date}T${trade.time}`), "MM/dd");

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = { pl: 0, tradeCount: 0 };
      }

      // Calculate P&L for this trade using the improved calculation
      const { pnl } = calculateTradePL(trade);

      groupedByDate[dateKey].pl += pnl;
      groupedByDate[dateKey].tradeCount += 1;
    });

    // Convert to array format needed by Calendar component
    return Object.entries(groupedByDate).map(([date, data]) => ({
      date,
      pl: parseFloat(data.pl.toFixed(2)),
      tradeCount: data.tradeCount,
    }));
  };

  return (
    <Card className="w-full bg-background">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Performance Chart</CardTitle>
          <div className="flex space-x-4">
            <Tabs
              value={viewMode}
              onValueChange={(value) =>
                setViewMode(value as "chart" | "calendar")
              }
            >
              <TabsList>
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
              </TabsList>
            </Tabs>
            {viewMode === "chart" && (
              <Tabs
                value={timeframe}
                onValueChange={(value) =>
                  setTimeframe(value as "daily" | "weekly" | "monthly")
                }
              >
                <TabsList>
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[650px] w-full overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading chart data...</p>
            </div>
          ) : viewMode === "chart" ? (
            currentData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No trade data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={currentData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cumulativeValue"
                    name="Cumulative P&L"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )
          ) : calendarData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                No trade data available for calendar view
              </p>
            </div>
          ) : (
            <div className="h-full">
              <Calendar tradeData={calendarData} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceChart;
