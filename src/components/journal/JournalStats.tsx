import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

interface JournalStatsProps {
  journalId: string;
  startDate: string;
  endDate: string;
}

interface Stats {
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  profitLoss: number;
  rMultiple: number;
  expectancy: number;
}

const JournalStats = ({ journalId, startDate, endDate }: JournalStatsProps) => {
  const [stats, setStats] = useState<Stats>({
    tradeCount: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
    profitLoss: 0,
    rMultiple: 0,
    expectancy: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Fetch trades that were closed within the date range
        const { data: closures, error: closuresError } = await supabase
          .from("trade_closures")
          .select(`*, trades(*)`) // Include the parent trade
          .gte("close_date", startDate)
          .lte("close_date", endDate);

        if (closuresError) throw closuresError;

        if (closures && closures.length > 0) {
          // Calculate stats
          const tradeCount = closures.length;
          let winCount = 0;
          let lossCount = 0;
          let totalPL = 0;
          let totalRMultiple = 0;
          let validRMultipleCount = 0;

          // Collect all unique symbols for fetching symbol data
          const uniqueSymbols = new Set();
          closures.forEach((closure) => {
            if (closure.trades?.symbol) {
              uniqueSymbols.add(closure.trades.symbol.toLowerCase());
            }
          });

          // Fetch symbol data for all unique symbols
          const symbolDataMap = {};
          for (const symbol of uniqueSymbols) {
            const { data: symbolData } = await supabase
              .from("symbols")
              .select("*")
              .eq("symbol", symbol)
              .maybeSingle();

            if (symbolData) {
              symbolDataMap[symbol] = symbolData;
            }
          }

          closures.forEach((closure) => {
            const trade = closure.trades;
            if (!trade) return;

            // Calculate P&L for this closure
            let pnl = 0;
            const symbol = trade.symbol?.toLowerCase() || "";
            const knownFutures = ["mes", "es", "nq", "mnq"];
            const isFutures =
              trade.market_type?.toLowerCase() === "futures" ||
              knownFutures.includes(symbol);

            const closureSize = parseFloat(closure.closed_position_size) || 0;
            const closurePrice = parseFloat(closure.close_price) || 0;

            if (isFutures) {
              // For futures, calculate using tick size and tick value
              // Use symbol info from database if available
              const symbolData = symbolDataMap[symbol];
              let tickSize = 0.25; // Default
              let tickValue = 1.25; // Default for MES

              if (symbolData && symbolData.tick_size && symbolData.tick_value) {
                tickSize = parseFloat(symbolData.tick_size) || 0.25;
                tickValue = parseFloat(symbolData.tick_value) || 1.25;
              } else {
                // Fallback for known contracts if not in database
                if (symbol === "es") {
                  tickValue = 12.5;
                } else if (symbol === "nq") {
                  tickValue = 5.0;
                } else if (symbol === "mnq") {
                  tickValue = 0.5;
                }
              }

              const priceDiff =
                trade.direction === "long"
                  ? closurePrice - trade.entry_price
                  : trade.entry_price - closurePrice;

              const ticksOfPL = Math.abs(priceDiff) / tickSize;
              pnl =
                (priceDiff >= 0 ? 1 : -1) * ticksOfPL * tickValue * closureSize;
            } else {
              // For stocks, crypto, forex
              if (trade.direction === "long") {
                pnl = (closurePrice - trade.entry_price) * closureSize;
              } else {
                pnl = (trade.entry_price - closurePrice) * closureSize;
              }
            }

            // Count wins and losses
            if (pnl > 0) winCount++;
            else if (pnl < 0) lossCount++;

            // Add to totals
            totalPL += pnl;

            // Process R multiple if available
            if (
              closure.r_multiple !== null &&
              closure.r_multiple !== undefined
            ) {
              totalRMultiple += parseFloat(closure.r_multiple);
              validRMultipleCount++;
            }
          });

          // Calculate derived stats
          const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;
          const avgRMultiple =
            validRMultipleCount > 0 ? totalRMultiple / validRMultipleCount : 0;
          const expectancy =
            (winRate / 100) * avgRMultiple - (1 - winRate / 100);

          setStats({
            tradeCount,
            winCount,
            lossCount,
            winRate,
            profitLoss: totalPL,
            rMultiple: avgRMultiple,
            expectancy,
          });
        } else {
          // Reset stats if no trades found
          setStats({
            tradeCount: 0,
            winCount: 0,
            lossCount: 0,
            winRate: 0,
            profitLoss: 0,
            rMultiple: 0,
            expectancy: 0,
          });
        }
      } catch (error) {
        console.error("Error fetching journal stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [startDate, endDate]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
        <div className="text-sm text-muted-foreground mb-1">Trades</div>
        <div className="text-3xl font-bold">
          {loading ? "..." : stats.tradeCount}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
        <div className="text-sm text-muted-foreground mb-1">Win Rate</div>
        <div className="text-3xl font-bold">
          {loading ? "..." : `${stats.winRate.toFixed(1)}%`}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {loading
            ? "..."
            : `${stats.winCount} wins, ${stats.lossCount} losses`}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
        <div className="text-sm text-muted-foreground mb-1">P&L</div>
        <div
          className={`text-3xl font-bold ${stats.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
        >
          {loading
            ? "..."
            : `${stats.profitLoss >= 0 ? "+" : "-"}$${Math.abs(stats.profitLoss).toFixed(2)}`}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
        <div className="text-sm text-muted-foreground mb-1">Expectancy</div>
        <div
          className={`text-3xl font-bold ${stats.expectancy >= 0 ? "text-green-500" : "text-red-500"}`}
        >
          {loading ? "..." : `${stats.expectancy.toFixed(2)}R`}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {loading ? "..." : `Avg R-Multiple: ${stats.rMultiple.toFixed(2)}`}
        </div>
      </div>
    </div>
  );
};

export default JournalStats;
