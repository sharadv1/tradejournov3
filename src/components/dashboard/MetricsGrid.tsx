import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  TrendingUpIcon,
  DollarSignIcon,
  PercentIcon,
  TargetIcon,
  BarChart3Icon,
  CalendarIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  changeDescription?: string;
}

const MetricCard = ({
  title,
  value,
  change = 0,
  icon,
  trend = "neutral",
  changeDescription,
}: MetricCardProps) => {
  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {change !== 0 && (
              <div className="flex items-center mt-1">
                <span
                  className={`text-xs font-medium flex items-center ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500"}`}
                  title={
                    changeDescription ||
                    `${change > 0 ? "+" : ""}${change}% change`
                  }
                >
                  {trend === "up" && <ArrowUpIcon className="h-3 w-3 mr-1" />}
                  {trend === "down" && (
                    <ArrowDownIcon className="h-3 w-3 mr-1" />
                  )}
                  {change > 0 ? "+" : ""}
                  {change}%
                </span>
              </div>
            )}
          </div>
          <div className="p-2 rounded-full bg-primary/10">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MetricsGridProps {
  profitFactor?: number;
  expectedValue?: number;
  calmarRatio?: number;
  paretoIndex?: number;
  avgHoldTimeWinners?: string;
  avgHoldTimeLosers?: string;
  bestPerforming?: string;
  worstPerforming?: string;
  totalTrades?: number;
  profitLoss?: number;
  winRate?: number;
  avgTradeSize?: number;
}

const MetricsGrid = ({
  profitFactor = 2.8,
  expectedValue = 105.25,
  calmarRatio = 3.2,
  paretoIndex = 0.72,
  avgHoldTimeWinners = "2.5 days",
  avgHoldTimeLosers = "4.8 days",
  bestPerforming = "AAPL",
  worstPerforming = "META",
  totalTrades = 124,
  profitLoss = 12450.75,
  winRate = 68.5,
  avgTradeSize = 5280.5,
}: MetricsGridProps) => {
  const [metrics, setMetrics] = useState({
    profitFactor,
    expectedValue,
    calmarRatio,
    paretoIndex,
    avgHoldTimeWinners,
    avgHoldTimeLosers,
    bestPerforming,
    worstPerforming,
    totalTrades,
    profitLoss,
    winRate,
    avgTradeSize,
    openRisk: 0,
    weeklyPnL: 0,
  });

  useEffect(() => {
    const fetchTradesAndCalculateMetrics = async () => {
      try {
        const { data: trades, error } = await supabase
          .from("trades")
          .select("*, trade_closures(*)")
          .order("date", { ascending: false });

        if (error) throw error;

        if (trades && trades.length > 0) {
          console.log("Fetched trades for metrics calculation:", trades.length);

          let grossProfits = 0;
          let grossLosses = 0;
          let winCount = 0;
          let lossCount = 0;
          let totalPnl = 0;

          let winningHoldTimesInMs = 0;
          let losingHoldTimesInMs = 0;

          const assetPerformance = {};

          let monthlyReturns = {};
          let maxDrawdown = 0;
          let cumulativePnl = 0;
          let peakValue = 0;

          let tradeProfits = [];

          // First, collect all unique symbols and fetch their data
          const uniqueSymbols = [
            ...new Set(trades.map((trade) => trade.symbol || "Unknown")),
          ];

          // Fetch symbol data for all unique symbols
          for (const symbol of uniqueSymbols) {
            if (!assetPerformance[symbol]) {
              const { data: symbolData } = await supabase
                .from("symbols")
                .select("*")
                .eq("symbol", symbol)
                .maybeSingle();

              assetPerformance[symbol] = {
                totalPnl: 0,
                tradeCount: 0,
                symbolInfo: symbolData || null,
              };
            }
          }

          // Now process trades with symbol data already loaded
          trades.forEach((trade) => {
            let pnl = 0;
            const direction = trade.direction === "long" ? 1 : -1;
            const symbol = trade.symbol || "Unknown";

            if (trade.trade_closures && trade.trade_closures.length > 0) {
              trade.trade_closures.forEach((closure) => {
                const closureSize =
                  parseFloat(closure.closed_position_size) || 0;
                const closurePrice = parseFloat(closure.close_price) || 0;
                const entryPrice = parseFloat(trade.entry_price) || 0;

                if (closureSize > 0 && closurePrice > 0 && entryPrice > 0) {
                  const closurePnl =
                    direction * (closurePrice - entryPrice) * closureSize;
                  pnl += closurePnl;
                }
              });
            } else if (trade.status === "closed" && trade.exit_price) {
              pnl =
                direction *
                (trade.exit_price - trade.entry_price) *
                trade.position_size;
            }

            if (trade.status === "closed" && trade.date && trade.exit_date) {
              const entryDate = new Date(trade.date);
              const exitDate = new Date(trade.exit_date);
              const holdTimeMs = exitDate.getTime() - entryDate.getTime();

              if (pnl > 0) {
                winningHoldTimesInMs += holdTimeMs;
              } else if (pnl < 0) {
                losingHoldTimesInMs += holdTimeMs;
              }

              const monthYear = `${entryDate.getFullYear()}-${entryDate.getMonth() + 1}`;
              if (!monthlyReturns[monthYear]) {
                monthlyReturns[monthYear] = 0;
              }
              monthlyReturns[monthYear] += pnl;
            }

            if (pnl > 0) {
              grossProfits += pnl;
              winCount++;
              tradeProfits.push(pnl);
            } else if (pnl < 0) {
              grossLosses += Math.abs(pnl);
              lossCount++;
            }

            totalPnl += pnl;

            cumulativePnl += pnl;
            if (cumulativePnl > peakValue) {
              peakValue = cumulativePnl;
            } else if (peakValue - cumulativePnl > maxDrawdown) {
              maxDrawdown = peakValue - cumulativePnl;
            }

            assetPerformance[symbol].totalPnl += pnl;
            assetPerformance[symbol].tradeCount += 1;
          });

          const profitFactor =
            grossLosses > 0
              ? grossProfits / grossLosses
              : grossProfits > 0
                ? 999
                : 0;

          const totalTrades = winCount + lossCount;
          const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

          const expectedValue = totalTrades > 0 ? totalPnl / totalTrades : 0;

          const avgHoldTimeWinners =
            winCount > 0
              ? formatHoldTime(winningHoldTimesInMs / winCount)
              : "N/A";

          const avgHoldTimeLosers =
            lossCount > 0
              ? formatHoldTime(losingHoldTimesInMs / lossCount)
              : "N/A";

          let bestPerforming = { symbol: "N/A", pnl: 0 };
          let worstPerforming = { symbol: "N/A", pnl: 0 };

          Object.entries(assetPerformance).forEach(([symbol, data]) => {
            if (data.tradeCount >= 3) {
              if (data.totalPnl > bestPerforming.pnl) {
                bestPerforming = { symbol, pnl: data.totalPnl };
              }
              if (data.totalPnl < worstPerforming.pnl) {
                worstPerforming = { symbol, pnl: data.totalPnl };
              }
            }
          });

          const calmarRatio =
            maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

          const paretoIndex =
            tradeProfits.length > 0 ? topTradeCount / tradeProfits.length : 0;

          let openRisk = 0;
          trades.forEach((trade) => {
            if (trade.status === "open" || trade.status === "partial") {
              const direction = trade.direction === "long" ? 1 : -1;
              const remainingSize = trade.remaining_size || trade.position_size;
              const entryPrice = parseFloat(trade.entry_price) || 0;
              const stopLoss =
                parseFloat(
                  trade.initial_stop_loss || trade.current_stop_loss,
                ) || 0;

              if (stopLoss > 0 && entryPrice > 0 && remainingSize > 0) {
                const potentialLoss =
                  direction * (stopLoss - entryPrice) * remainingSize;
                if (potentialLoss < 0) {
                  openRisk += Math.abs(potentialLoss);
                }
              }
            }
          });

          let weeklyPnL = 0;
          const now = new Date();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);

          trades.forEach((trade) => {
            if (
              (trade.status === "closed" || trade.status === "partial") &&
              trade.trade_closures &&
              trade.trade_closures.length > 0
            ) {
              trade.trade_closures.forEach((closure) => {
                if (closure.close_date) {
                  const closureDate = new Date(closure.close_date);

                  if (closureDate >= startOfWeek) {
                    const direction = trade.direction === "long" ? 1 : -1;
                    const closureSize =
                      parseFloat(closure.closed_position_size) || 0;
                    const closurePrice = parseFloat(closure.close_price) || 0;
                    const entryPrice = parseFloat(trade.entry_price) || 0;

                    if (closureSize > 0 && closurePrice > 0 && entryPrice > 0) {
                      const closurePnL =
                        direction * (closurePrice - entryPrice) * closureSize;
                      weeklyPnL += closurePnL;
                    }
                  }
                }
              });
            }
          });

          setMetrics((prevMetrics) => ({
            ...prevMetrics,
            profitFactor: profitFactor,
            expectedValue: expectedValue,
            winRate: parseFloat(winRate.toFixed(1)),
            totalTrades: totalTrades,
            profitLoss: totalPnl,
            avgHoldTimeWinners,
            avgHoldTimeLosers,
            bestPerforming: bestPerforming.symbol,
            worstPerforming: worstPerforming.symbol,
            calmarRatio: parseFloat(calmarRatio.toFixed(2)),
            paretoIndex: parseFloat(paretoIndex.toFixed(2)),
            openRisk: openRisk,
            weeklyPnL: weeklyPnL,
          }));

          console.log("Calculated metrics:", {
            profitFactor,
            expectedValue,
            winRate,
            totalTrades,
            totalPnl,
            avgHoldTimeWinners,
            avgHoldTimeLosers,
            bestPerforming: bestPerforming.symbol,
            worstPerforming: worstPerforming.symbol,
            calmarRatio,
            paretoIndex,
          });
        }
      } catch (error) {
        console.error("Error fetching trades for metrics:", error);
      }
    };

    const formatHoldTime = (ms) => {
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        return `${days} day${days !== 1 ? "s" : ""}`;
      } else if (hours > 0) {
        return `${hours} hour${hours !== 1 ? "s" : ""}`;
      } else {
        return "< 1 hour";
      }
    };

    fetchTradesAndCalculateMetrics();
  }, []);

  return (
    <div className="w-full bg-background p-4 rounded-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Profit Factor"
          value={metrics.profitFactor.toFixed(2)}
          change={0.3}
          trend="up"
          icon={<BarChart3Icon className="h-5 w-5 text-primary" />}
          changeDescription="0.3% increase from previous period"
        />

        <MetricCard
          title="Expected Value"
          value={`${metrics.expectedValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          change={12.5}
          trend="up"
          icon={<DollarSignIcon className="h-5 w-5 text-primary" />}
          changeDescription="12.5% increase from previous period"
        />

        <MetricCard
          title="Calmar Ratio"
          value={metrics.calmarRatio.toFixed(2)}
          change={0.4}
          trend="up"
          icon={<TargetIcon className="h-5 w-5 text-primary" />}
          changeDescription="0.4% increase from previous period"
        />

        <MetricCard
          title="Pareto Index"
          value={metrics.paretoIndex.toFixed(2)}
          icon={<PercentIcon className="h-5 w-5 text-primary" />}
        />

        <MetricCard
          title="Win Rate"
          value={`${metrics.winRate}%`}
          change={2.5}
          trend="up"
          icon={<PercentIcon className="h-5 w-5 text-primary" />}
          changeDescription="2.5% increase from previous period"
        />

        <MetricCard
          title="Open Risk"
          value={`${metrics.openRisk.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-primary"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          }
        />

        <MetricCard
          title="Weekly P&L"
          value={`${metrics.weeklyPnL.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          trend={
            metrics.weeklyPnL > 0
              ? "up"
              : metrics.weeklyPnL < 0
                ? "down"
                : "neutral"
          }
          change={
            metrics.weeklyPnL !== 0
              ? Math.abs(
                  (metrics.weeklyPnL / (metrics.profitLoss || 1)) * 100,
                ).toFixed(1)
              : 0
          }
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-primary"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          }
          changeDescription="Percentage of total P&L earned this week"
        />
      </div>
    </div>
  );
};

export default MetricsGrid;
