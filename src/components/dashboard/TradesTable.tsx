import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  Search,
  Eye,
  TrendingDown,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import TradeClosureForm from "./TradeClosureForm";
import TradeClosuresList from "./TradeClosuresList";
import EditTradeHandler from "./EditTradeHandler";
import { supabase, getCurrentUser, deleteRecord } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

interface MediaFile {
  id: string;
  preview: string;
  type: "image" | "video";
  filePath?: string;
  fileName?: string;
  uploaded?: boolean;
}

interface Trade {
  id: string;
  date: string;
  symbol: string;
  type: "buy" | "sell";
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  status: "win" | "loss" | "breakeven" | "open" | "partial";
  notes?: string;
  remainingSize?: number;
  account?: string;
  strategy?: string;
  initialStopLoss?: string;
  currentStopLoss?: string;
  takeProfit?: string;
  riskRewardRatio?: string;
  riskAmount?: string;
  rewardAmount?: string;
  timeframe?: string;
  tradeGrade?: string;
  highestPrice?: string;
  lowestPrice?: string;
  pspTime?: string;
  mediaFiles?: MediaFile[];
  avgRMultiple?: number | null;
  hasMedia?: boolean;
}

interface TradesTableProps {
  trades?: Trade[];
}

const TradesTable = ({ trades = [] }: TradesTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Trade>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [closureTradeId, setClosureTradeId] = useState<string | null>(null);
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  const [displayTrades, setDisplayTrades] = useState<Trade[]>(
    trades.length > 0 ? trades : [],
  );

  const fetchTrades = async () => {
    console.log("Fetching trades from database...");
    try {
      setIsLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        console.log("No user found, using default user ID");
      }

      const { data, error } = await supabase
        .from("trades")
        .select(`*, trade_closures(*), media_files(*)`)
        .order("date", { ascending: false });

      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log("Trades from database:", data.length, "trades found");

        const transformedTrades: Trade[] = data.map((trade) => {
          let totalClosedFromClosures = 0;
          let totalRMultiple = 0;
          let validRMultipleCount = 0;

          if (trade.trade_closures && trade.trade_closures.length > 0) {
            trade.trade_closures.forEach((closure: any) => {
              totalClosedFromClosures +=
                parseFloat(closure.closed_position_size) || 0;

              if (
                closure.r_multiple !== null &&
                closure.r_multiple !== undefined
              ) {
                totalRMultiple += parseFloat(closure.r_multiple);
                validRMultipleCount++;
              }
            });

            console.log(
              `Trade ${trade.id} has ${trade.trade_closures.length} closures totaling ${totalClosedFromClosures}`,
            );
          }

          let pnl = 0;
          if (
            totalClosedFromClosures > 0 ||
            (trade.position_size_closed > 0 &&
              trade.trade_closures &&
              trade.trade_closures.length > 0) ||
            (trade.status === "closed" &&
              trade.trade_closures &&
              trade.trade_closures.length > 0)
          ) {
            if (trade.trade_closures && trade.trade_closures.length > 0) {
              pnl = trade.trade_closures.reduce((sum: number, closure: any) => {
                const closurePrice = parseFloat(closure.close_price) || 0;
                const closureSize =
                  parseFloat(closure.closed_position_size) || 0;

                let closurePnl = 0;
                if (trade.direction === "long") {
                  closurePnl = (closurePrice - trade.entry_price) * closureSize;
                } else {
                  // For short trades
                  closurePnl = (trade.entry_price - closurePrice) * closureSize;

                  // Special handling for futures contracts like MES
                  if (trade.symbol.toLowerCase() === "mes") {
                    // For short trades closed at stop loss, use the risk amount directly
                    if (
                      trade.direction === "short" &&
                      trade.initial_stop_loss &&
                      Math.abs(
                        closurePrice - parseFloat(trade.initial_stop_loss),
                      ) < 1
                    ) {
                      if (
                        trade.risk_amount &&
                        parseFloat(trade.risk_amount) > 0
                      ) {
                        const riskAmount = parseFloat(trade.risk_amount);
                        console.log(
                          `Using risk amount for MES short trade closed at stop: ${riskAmount}`,
                        );
                        closurePnl = -riskAmount; // Negative because it's a loss
                      }
                    }

                    // If P&L still seems incorrect, recalculate using tick values
                    if (
                      Math.abs(closurePnl) < 100 ||
                      (trade.risk_amount &&
                        Math.abs(closurePnl) <
                          parseFloat(trade.risk_amount) * 0.5)
                    ) {
                      const entryPrice = trade.entry_price;
                      const closePrice = closurePrice;
                      const tickSize = 0.25; // MES tick size
                      const tickValue = 1.25; // Value per tick

                      // Calculate ticks between entry and close
                      const ticks =
                        Math.abs(entryPrice - closePrice) / tickSize;
                      // Calculate P&L based on ticks * tick value * position size
                      const recalculatedPnl = ticks * tickValue * closureSize;

                      // For short trades, P&L is negative if close > entry (loss), positive otherwise (profit)
                      if (trade.direction === "short") {
                        closurePnl =
                          closePrice > entryPrice
                            ? -recalculatedPnl
                            : recalculatedPnl;
                      } else {
                        closurePnl =
                          closePrice > entryPrice
                            ? recalculatedPnl
                            : -recalculatedPnl;
                      }

                      console.log(
                        `Recalculated MES P&L using ticks: ${ticks} ticks * $${tickValue} * ${closureSize} contracts = $${closurePnl}`,
                      );
                    }
                  }
                }

                console.log(`Closure P&L calculation for ${trade.id}:`, {
                  direction: trade.direction,
                  entryPrice: trade.entry_price,
                  closurePrice,
                  closureSize,
                  closurePnl,
                  symbol: trade.symbol,
                  riskAmount: trade.risk_amount,
                  initialStopLoss: trade.initial_stop_loss,
                });

                return sum + closurePnl;
              }, 0);
            } else {
              const closedSize =
                totalClosedFromClosures > 0
                  ? totalClosedFromClosures
                  : trade.position_size_closed || trade.position_size;

              if (trade.direction === "long") {
                pnl = (trade.exit_price - trade.entry_price) * closedSize;
              } else {
                pnl = (trade.entry_price - trade.exit_price) * closedSize;

                // Special handling for futures contracts like MES
                if (trade.symbol.toLowerCase() === "mes") {
                  // For short trades closed at stop loss, use the risk amount directly
                  if (
                    trade.direction === "short" &&
                    trade.initial_stop_loss &&
                    trade.exit_price &&
                    Math.abs(
                      trade.exit_price - parseFloat(trade.initial_stop_loss),
                    ) < 1
                  ) {
                    if (
                      trade.risk_amount &&
                      parseFloat(trade.risk_amount) > 0
                    ) {
                      const riskAmount = parseFloat(trade.risk_amount);
                      console.log(
                        `Using risk amount for MES short trade closed at stop: ${riskAmount}`,
                      );
                      pnl = -riskAmount; // Negative because it's a loss
                    }
                  }

                  // If P&L still seems incorrect, recalculate using tick values
                  if (
                    Math.abs(pnl) < 100 ||
                    (trade.risk_amount &&
                      Math.abs(pnl) < parseFloat(trade.risk_amount) * 0.5)
                  ) {
                    const entryPrice = trade.entry_price;
                    const closePrice = trade.exit_price || 0;
                    const tickSize = 0.25; // MES tick size
                    const tickValue = 1.25; // Value per tick

                    // Calculate ticks between entry and close
                    const ticks = Math.abs(entryPrice - closePrice) / tickSize;
                    // Calculate P&L based on ticks * tick value * position size
                    const recalculatedPnl = ticks * tickValue * closedSize;

                    // For short trades, P&L is positive if entry > close, negative otherwise
                    if (trade.direction === "short") {
                      pnl =
                        entryPrice > closePrice
                          ? recalculatedPnl
                          : -recalculatedPnl;
                    } else {
                      pnl =
                        closePrice > entryPrice
                          ? recalculatedPnl
                          : -recalculatedPnl;
                    }

                    console.log(
                      `Recalculated MES P&L using ticks: ${ticks} ticks * ${tickValue} * ${closedSize} contracts = ${recalculatedPnl}`,
                    );
                  }
                }
              }
            }
          }

          let remainingSize = trade.position_size;
          if (
            trade.status === "open" &&
            (trade.remaining_size === 0 || trade.remaining_size === null)
          ) {
            remainingSize = trade.position_size;
            console.log(
              `Trade ${trade.id} is open with zero remaining_size, using full position_size: ${remainingSize}`,
            );
          } else if (
            trade.remaining_size !== null &&
            trade.remaining_size !== undefined
          ) {
            remainingSize = trade.remaining_size;
          } else if (totalClosedFromClosures > 0) {
            remainingSize = trade.position_size - totalClosedFromClosures;
          } else if (
            trade.position_size_closed !== null &&
            trade.position_size_closed !== undefined
          ) {
            remainingSize = trade.position_size - trade.position_size_closed;
          }

          remainingSize = Math.max(0, remainingSize);

          let status: Trade["status"];
          if (trade.status === "open") {
            status = "open";
          } else if (
            trade.status === "partial" ||
            (totalClosedFromClosures > 0 && remainingSize > 0)
          ) {
            status = "partial";
          } else if (pnl > 0) {
            status = "win";
          } else if (pnl < 0) {
            status = "loss";
          } else {
            status = "breakeven";
          }

          let dateStr = trade.date;
          if (typeof dateStr === "string" && dateStr.includes("T")) {
            dateStr = dateStr.split("T")[0];
          }

          const avgRMultiple =
            validRMultipleCount > 0
              ? totalRMultiple / validRMultipleCount
              : null;

          const hasMedia = trade.media_files && trade.media_files.length > 0;
          console.log(
            `Trade ${trade.id} has media files: ${hasMedia}`,
            trade.media_files,
          );

          return {
            id: trade.id,
            date: dateStr,
            symbol: trade.symbol,
            type: trade.direction === "long" ? "buy" : "sell",
            entryPrice: trade.entry_price,
            exitPrice: trade.exit_price || 0,
            size: trade.position_size,
            pnl: pnl,
            status: status,
            notes: trade.notes || "",
            remainingSize: remainingSize,
            account: trade.account_name || trade.account_id || "",
            strategy: trade.strategy_name || trade.strategy_id || "",
            initialStopLoss: trade.initial_stop_loss?.toString() || "",
            currentStopLoss: trade.current_stop_loss?.toString() || "",
            takeProfit: trade.take_profit?.toString() || "",
            riskRewardRatio: trade.risk_reward_ratio || "",
            riskAmount: trade.risk_amount?.toString() || "",
            rewardAmount: trade.reward_amount?.toString() || "",
            timeframe: trade.timeframe || "",
            tradeGrade: trade.trade_grade || "",
            highestPrice: trade.highest_price?.toString() || "",
            lowestPrice: trade.lowest_price?.toString() || "",
            pspTime: trade.psp_time || "",
            hasClosures:
              trade.trade_closures && trade.trade_closures.length > 0,
            hasMedia: hasMedia,
            avgRMultiple: avgRMultiple,
          };
        });

        setDisplayTrades(transformedTrades);
        console.log("Transformed trades:", transformedTrades);
      } else {
        console.log("No trades found in database");
        setDisplayTrades([]);
      }
    } catch (error) {
      console.error("Error fetching trades:", error);
      toast({
        title: "Error",
        description: "There was an error fetching your trades",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
    console.log("TradesTable: Initial fetch completed");
  }, []);

  useEffect(() => {
    if (trades.length > 0) {
      setDisplayTrades(trades);
    }
  }, [trades]);

  const handleSort = (field: keyof Trade) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log("Search query changed to:", value);
    setSearchQuery(value);
  };

  const filteredTrades = displayTrades
    .filter((trade) => {
      if (!searchQuery.trim()) {
        return filterStatus === "all" || trade.status === filterStatus;
      }

      const searchLower = searchQuery.toLowerCase();

      const matchesSymbol = trade.symbol.toLowerCase().includes(searchLower);
      const matchesNotes =
        trade.notes?.toLowerCase().includes(searchLower) || false;
      const matchesAccount =
        trade.account?.toLowerCase().includes(searchLower) || false;
      const matchesStrategy =
        trade.strategy?.toLowerCase().includes(searchLower) || false;

      const matchesSearch =
        matchesSymbol || matchesNotes || matchesAccount || matchesStrategy;
      const matchesStatus =
        filterStatus === "all" || trade.status === filterStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

  const viewTradeDetails = async (trade: Trade) => {
    console.log("Viewing trade details:", trade);

    try {
      const { data, error } = await supabase
        .from("trades")
        .select(`*, media_files(*), trade_closures(*)`)
        .eq("id", trade.id)
        .single();

      console.log("Trade details with media files:", data);

      if (error) throw error;

      let mediaFiles: MediaFile[] = [];
      let hasMedia = false;
      if (data.media_files && data.media_files.length > 0) {
        hasMedia = true;
        console.log(
          `Trade ${data.id} has ${data.media_files.length} media files`,
        );
        mediaFiles = data.media_files.map((file: any) => {
          const {
            data: { publicUrl },
          } = supabase.storage.from("media").getPublicUrl(file.file_path);

          return {
            id: file.id,
            preview: publicUrl,
            type:
              file.file_type ||
              (file.file_path.match(/\.(jpg|jpeg|png|gif)$/i)
                ? "image"
                : "video"),
            filePath: file.file_path,
            fileName: file.file_name,
            uploaded: true,
          };
        });
      }

      let totalClosedFromClosures = 0;
      let totalRMultiple = 0;
      let validRMultipleCount = 0;
      let hasClosures = false;

      if (data.trade_closures && data.trade_closures.length > 0) {
        hasClosures = true;

        data.trade_closures.forEach((closure: any) => {
          totalClosedFromClosures +=
            parseFloat(closure.closed_position_size) || 0;

          if (closure.r_multiple !== null && closure.r_multiple !== undefined) {
            totalRMultiple += parseFloat(closure.r_multiple);
            validRMultipleCount++;
          }
        });

        console.log(
          `Trade ${data.id} has ${data.trade_closures.length} closures totaling ${totalClosedFromClosures}`,
        );
      }

      let remainingSize = data.position_size;
      if (
        data.status === "open" &&
        (data.remaining_size === 0 || data.remaining_size === null)
      ) {
        remainingSize = data.position_size;
        console.log(
          `Trade ${data.id} is open with zero remaining_size, using full position_size: ${remainingSize}`,
        );
      } else if (
        data.remaining_size !== null &&
        data.remaining_size !== undefined
      ) {
        remainingSize = data.remaining_size;
      } else if (totalClosedFromClosures > 0) {
        remainingSize = data.position_size - totalClosedFromClosures;
      } else if (
        data.position_size_closed !== null &&
        data.position_size_closed !== undefined
      ) {
        remainingSize = data.position_size - data.position_size_closed;
      }

      remainingSize = Math.max(0, remainingSize);

      const avgRMultiple =
        validRMultipleCount > 0 ? totalRMultiple / validRMultipleCount : null;

      const enhancedTrade = {
        ...trade,
        initialStopLoss: data.initial_stop_loss?.toString() || "",
        currentStopLoss: data.current_stop_loss?.toString() || "",
        takeProfit: data.take_profit?.toString() || "",
        riskRewardRatio: data.risk_reward_ratio || "",
        riskAmount: data.risk_amount?.toString() || "",
        rewardAmount: data.reward_amount?.toString() || "",
        timeframe: data.timeframe || "",
        tradeGrade: data.trade_grade || "",
        highestPrice: data.highest_price?.toString() || "",
        lowestPrice: data.lowest_price?.toString() || "",
        pspTime: data.psp_time || "",
        mediaFiles: mediaFiles,
        remainingSize: remainingSize,
        hasClosures: hasClosures,
        hasMedia: hasMedia,
        avgRMultiple: avgRMultiple,
      };

      console.log("Enhanced trade with media and closures:", enhancedTrade);
      setSelectedTrade(enhancedTrade);
    } catch (error) {
      console.error("Error fetching complete trade details:", error);
      setSelectedTrade(trade);
    }
  };

  const openClosureDialog = (tradeId: string) => {
    console.log("Opening closure dialog for trade ID:", tradeId);

    const fetchLatestTradeData = async () => {
      try {
        const { data: directData, error: directError } = await supabase.rpc(
          "exec_sql",
          {
            sql_query: `SELECT position_size, remaining_size, status FROM trades WHERE id = '${tradeId}'`,
          },
        );

        if (directError) throw directError;
        if (!directData || !directData[0]) throw new Error("Trade not found");

        console.log("Direct SQL query result:", directData);

        const position_size = parseFloat(directData[0].position_size);
        const status = directData[0].status || "open";
        let remaining_size =
          directData[0].remaining_size !== null
            ? parseFloat(directData[0].remaining_size)
            : position_size;

        if (status === "open" && remaining_size === 0) {
          remaining_size = position_size;
          console.log(
            "Open trade with zero remaining size, using full position size:",
            remaining_size,
          );
        }

        console.log("Position size from direct query:", position_size);
        console.log("Remaining size from direct query:", remaining_size);

        setDisplayTrades((prevTrades) =>
          prevTrades.map((t) =>
            t.id === tradeId ? { ...t, remainingSize: remaining_size } : t,
          ),
        );

        setClosureTradeId(tradeId);
        setClosureDialogOpen(true);
      } catch (error) {
        console.error("Error fetching latest trade data for closure:", error);

        try {
          const { data, error: queryError } = await supabase
            .from("trades")
            .select(`position_size, remaining_size, status`)
            .eq("id", tradeId)
            .single();

          if (queryError) throw queryError;
          if (!data) throw new Error("Trade not found");

          const position_size = data.position_size;
          const status = data.status || "open";
          let remaining_size =
            data.remaining_size !== null ? data.remaining_size : position_size;

          if (status === "open" && remaining_size === 0) {
            remaining_size = position_size;
            console.log(
              "Open trade with zero remaining size, using full position size:",
              remaining_size,
            );
          }

          console.log("Position size from fallback query:", position_size);
          console.log("Remaining size from fallback query:", remaining_size);

          setDisplayTrades((prevTrades) =>
            prevTrades.map((t) =>
              t.id === tradeId ? { ...t, remainingSize: remaining_size } : t,
            ),
          );

          setClosureTradeId(tradeId);
          setClosureDialogOpen(true);
        } catch (fallbackError) {
          console.error("Fallback query also failed:", fallbackError);
          toast({
            title: "Error",
            description: "Could not fetch the latest trade data",
            variant: "destructive",
          });
        }
      }
    };

    fetchLatestTradeData();
  };

  const handleClosureSuccess = () => {
    console.log("Trade closure successful, refreshing data...");
    fetchTrades();

    setClosureDialogOpen(false);
    setClosureTradeId(null);

    toast({
      title: "Trade Closed",
      description: "Your trade has been closed successfully",
    });
  };

  return (
    <Card className="w-full bg-background">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CardTitle>Recent Trades</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchTrades}
              disabled={isLoading}
              title="Refresh trades"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trades..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-8"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="win">Wins</SelectItem>
                <SelectItem value="loss">Losses</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("date")}
                    className="flex items-center p-0 h-auto font-medium"
                  >
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("symbol")}
                    className="flex items-center p-0 h-auto font-medium"
                  >
                    Symbol
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Exit</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("pnl")}
                    className="flex items-center p-0 h-auto font-medium ml-auto"
                  >
                    P&L
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">R Multiple</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Media</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-4 text-muted-foreground"
                  >
                    Loading trades...
                  </TableCell>
                </TableRow>
              ) : filteredTrades.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-4 text-muted-foreground"
                  >
                    {searchQuery
                      ? `No trades found matching "${searchQuery}"`
                      : "No trades found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium">{trade.date}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge
                        variant={trade.type === "buy" ? "default" : "secondary"}
                      >
                        {trade.type === "buy" ? "BUY" : "SELL"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {trade.strategy ? (
                        <span className="text-sm">{trade.strategy}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.entryPrice
                        ? `$${trade.entryPrice.toFixed(2)}`
                        : "--"}
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.exitPrice && trade.exitPrice > 0
                        ? `$${trade.exitPrice.toFixed(2)}`
                        : "--"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <div className="flex items-center justify-end gap-1">
                        {trade.hasClosures ? (
                          <>
                            {trade.pnl > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : trade.pnl < 0 ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : null}
                            <span
                              className={
                                trade.pnl > 0
                                  ? "text-green-500"
                                  : trade.pnl < 0
                                    ? "text-red-500"
                                    : ""
                              }
                            >
                              {trade.pnl > 0 ? "$" : "-$"}
                              {Math.abs(trade.pnl).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.hasClosures &&
                      trade.avgRMultiple !== null &&
                      trade.avgRMultiple !== undefined ? (
                        <span
                          className={
                            trade.avgRMultiple >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          {trade.avgRMultiple > 0 ? "+" : ""}
                          {Number(trade.avgRMultiple).toFixed(2)}R
                        </span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          trade.status === "win"
                            ? "success"
                            : trade.status === "loss"
                              ? "destructive"
                              : "outline"
                        }
                        className={
                          trade.status === "win"
                            ? "bg-green-500"
                            : trade.status === "loss"
                              ? "bg-red-500"
                              : "bg-gray-200"
                        }
                      >
                        {trade.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(trade.mediaFiles && trade.mediaFiles.length > 0) ||
                      trade.hasMedia ? (
                        <div
                          className="flex items-center"
                          title={`${(trade.mediaFiles && trade.mediaFiles.length) || 1} media attachment(s)`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-blue-500"
                          >
                            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5z"></path>
                            <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                            <circle cx="10" cy="13" r="2"></circle>
                            <path d="m20 17-1.09-1.09a2 2 0 0 0-2.82 0L10 22"></path>
                          </svg>
                          <span className="ml-1 text-xs">
                            {(trade.mediaFiles && trade.mediaFiles.length) || 1}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => viewTradeDetails(trade)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const fetchCompleteTradeData = async () => {
                              try {
                                const { data, error } = await supabase
                                  .from("trades")
                                  .select(`*`)
                                  .eq("id", trade.id)
                                  .single();

                                if (error) throw error;
                                if (!data) throw new Error("Trade not found");

                                console.log(
                                  "Complete trade data from DB:",
                                  data,
                                );

                                const editData = {
                                  symbol: data.symbol,
                                  tradeType:
                                    data.direction === "long" ? "buy" : "sell",
                                  direction:
                                    data.direction ||
                                    (trade.type === "buy" ? "long" : "short"),
                                  entryPrice:
                                    data.entry_price?.toString() ||
                                    trade.entryPrice.toString(),
                                  exitPrice:
                                    data.exit_price?.toString() ||
                                    (trade.exitPrice
                                      ? trade.exitPrice.toString()
                                      : ""),
                                  positionSize:
                                    data.position_size?.toString() ||
                                    trade.size.toString(),
                                  date: data.date
                                    ? new Date(data.date)
                                        .toISOString()
                                        .split("T")[0]
                                    : trade.date,
                                  time: data.time || "09:30",
                                  notes: data.notes || trade.notes || "",
                                  status: data.status || trade.status,
                                  remainingSize:
                                    data.status === "open" &&
                                    (data.remaining_size === 0 ||
                                      data.remaining_size === null)
                                      ? data.position_size
                                      : data.remaining_size !== null &&
                                          data.remaining_size !== undefined
                                        ? data.remaining_size
                                        : data.position_size -
                                          (data.position_size_closed || 0),
                                  marketType: data.market_type || "stock",
                                  maxRiskPerTrade:
                                    data.max_risk_per_trade?.toString() || "",
                                  initialStopLoss:
                                    data.initial_stop_loss?.toString() || "",
                                  currentStopLoss:
                                    data.current_stop_loss?.toString() || "",
                                  takeProfit:
                                    data.take_profit?.toString() || "",
                                  timeframe: data.timeframe || "1h",
                                  tradeGrade: data.trade_grade || "B",
                                  highestPrice:
                                    data.highest_price?.toString() || "",
                                  lowestPrice:
                                    data.lowest_price?.toString() || "",
                                  pspTime: data.psp_time || "",
                                  ssmtQuarter: data.ssmt_quarter || "Q1",
                                  riskRewardRatio: data.risk_reward_ratio || "",
                                  riskAmount:
                                    data.risk_amount?.toString() || "",
                                  rewardAmount:
                                    data.reward_amount?.toString() || "",
                                  riskFormula: data.risk_formula || "",
                                  rewardFormula: data.reward_formula || "",
                                  account:
                                    data.account_name ||
                                    data.account_id ||
                                    (data.notes?.match(/Account: ([^\n]+)/)
                                      ?.length > 1
                                      ? data.notes.match(/Account: ([^\n]+)/)[1]
                                      : ""),
                                  strategy:
                                    data.strategy_name ||
                                    data.strategy_id ||
                                    (data.notes?.match(/Strategy: ([^\n]+)/)
                                      ?.length > 1
                                      ? data.notes.match(
                                          /Strategy: ([^\n]+)/,
                                        )[1]
                                      : ""),
                                };

                                console.log(
                                  "Field values being passed to edit form:",
                                  {
                                    symbol: editData.symbol,
                                    marketType: editData.marketType,
                                    direction: editData.direction,
                                    highestPrice: editData.highestPrice,
                                    lowestPrice: editData.lowestPrice,
                                    account: editData.account,
                                    strategy: editData.strategy,
                                    timeframe: editData.timeframe,
                                    tradeGrade: editData.tradeGrade,
                                    initialStopLoss: editData.initialStopLoss,
                                    takeProfit: editData.takeProfit,
                                  },
                                );

                                console.log("Prepared edit data:", editData);

                                const editTradeHandler =
                                  document.getElementById("edit-trade-handler");
                                if (
                                  editTradeHandler &&
                                  editTradeHandler.dataset
                                ) {
                                  editTradeHandler.dataset.tradeId = trade.id;
                                  editTradeHandler.dataset.tradeData =
                                    JSON.stringify(editData);

                                  const clickEvent = new MouseEvent("click", {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window,
                                  });
                                  editTradeHandler.dispatchEvent(clickEvent);
                                  console.log(
                                    "Direct click event dispatched with complete data",
                                  );
                                } else {
                                  console.error(
                                    "Edit trade handler element not found",
                                  );
                                }
                              } catch (error) {
                                console.error(
                                  "Error fetching complete trade data:",
                                  error,
                                );
                                toast({
                                  title: "Error",
                                  description:
                                    "Could not load trade details for editing",
                                  variant: "destructive",
                                });
                              }
                            };

                            fetchCompleteTradeData();
                          }}
                          title="Edit trade"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                          </svg>
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openClosureDialog(trade.id)}
                          title="Close position"
                          className="bg-green-600 hover:bg-green-700 text-white font-medium"
                          disabled={
                            !(
                              trade.status === "open" ||
                              trade.status === "partial"
                            )
                          }
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Close
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTradeToDelete(trade.id);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete trade"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog
        open={!!selectedTrade}
        onOpenChange={(open) => !open && setSelectedTrade(null)}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trade Details</DialogTitle>
            <DialogDescription>
              {selectedTrade?.symbol} - {selectedTrade?.date}
            </DialogDescription>
          </DialogHeader>

          {selectedTrade && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Symbol</h4>
                  <p>{selectedTrade.symbol}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Date</h4>
                  <p>{selectedTrade.date}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Type</h4>
                  <Badge
                    variant={
                      selectedTrade.type === "buy" ? "default" : "secondary"
                    }
                  >
                    {selectedTrade.type === "buy" ? "BUY" : "SELL"}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <Badge
                    variant={
                      selectedTrade.status === "win"
                        ? "success"
                        : selectedTrade.status === "loss"
                          ? "destructive"
                          : "outline"
                    }
                    className={
                      selectedTrade.status === "win"
                        ? "bg-green-500"
                        : selectedTrade.status === "loss"
                          ? "bg-red-500"
                          : "bg-gray-200"
                    }
                  >
                    {selectedTrade.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Entry Price</h4>
                  <p>${selectedTrade.entryPrice.toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Exit Price</h4>
                  <p>${selectedTrade.exitPrice.toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Position Size</h4>
                  <p>{selectedTrade.size} shares</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">P&L</h4>
                  <p
                    className={
                      selectedTrade.pnl > 0
                        ? "text-green-500"
                        : selectedTrade.pnl < 0
                          ? "text-red-500"
                          : ""
                    }
                  >
                    {selectedTrade.pnl > 0 ? "$" : "-$"}
                    {Math.abs(selectedTrade.pnl).toFixed(2)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Avg R Multiple</h4>
                  {selectedTrade.avgRMultiple !== null &&
                  selectedTrade.avgRMultiple !== undefined ? (
                    <p
                      className={
                        selectedTrade.avgRMultiple >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {selectedTrade.avgRMultiple > 0 ? "+" : ""}
                      {Number(selectedTrade.avgRMultiple).toFixed(2)}R
                    </p>
                  ) : (
                    <p className="text-muted-foreground">--</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Account</h4>
                  <p className="text-sm">
                    {selectedTrade.account ||
                      (selectedTrade.notes &&
                      selectedTrade.notes.includes("Account: ")
                        ? selectedTrade.notes.match(/Account: ([^\n]+)/)
                          ? selectedTrade.notes.match(/Account: ([^\n]+)/)[1]
                          : ""
                        : "None")}
                  </p>
                </div>
              </div>

              {(selectedTrade.status === "partial" ||
                selectedTrade.status === "open" ||
                selectedTrade.hasClosures) && (
                <div className="border-t pt-4">
                  <TradeClosuresList
                    tradeId={selectedTrade.id}
                    onClosureUpdate={() => {
                      if (selectedTrade) {
                        viewTradeDetails(selectedTrade);
                      }
                    }}
                  />
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="text-md font-semibold mb-3">Risk & Reward</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">
                      Initial Stop Loss
                    </h4>
                    <p className="text-sm">
                      {selectedTrade.initialStopLoss
                        ? `$${selectedTrade.initialStopLoss}`
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">
                      Current Stop Loss
                    </h4>
                    <p className="text-sm">
                      {selectedTrade.currentStopLoss
                        ? `$${selectedTrade.currentStopLoss}`
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Take Profit</h4>
                    <p className="text-sm">
                      {selectedTrade.takeProfit
                        ? `$${selectedTrade.takeProfit}`
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">
                      Risk/Reward Ratio
                    </h4>
                    <p className="text-sm">
                      {selectedTrade.riskRewardRatio || "Not calculated"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Risk Amount</h4>
                    <p className="text-sm">
                      {selectedTrade.riskAmount
                        ? `$${selectedTrade.riskAmount}`
                        : "Not calculated"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Reward Amount</h4>
                    <p className="text-sm">
                      {selectedTrade.rewardAmount
                        ? `$${selectedTrade.rewardAmount}`
                        : "Not calculated"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-md font-semibold mb-3">Analysis</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Strategy</h4>
                    <p className="text-sm">
                      {selectedTrade.strategy ||
                        (selectedTrade.notes &&
                        selectedTrade.notes.includes("Strategy: ")
                          ? selectedTrade.notes.match(/Strategy: ([^\n]+)/)
                            ? selectedTrade.notes.match(/Strategy: ([^\n]+)/)[1]
                            : ""
                          : "None")}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Timeframe</h4>
                    <p className="text-sm">
                      {selectedTrade.timeframe || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Trade Grade</h4>
                    <p className="text-sm">
                      {selectedTrade.tradeGrade || "Not graded"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Highest Price</h4>
                    <p className="text-sm">
                      {selectedTrade.highestPrice
                        ? `$${selectedTrade.highestPrice}`
                        : "Not recorded"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Lowest Price</h4>
                    <p className="text-sm">
                      {selectedTrade.lowestPrice
                        ? `$${selectedTrade.lowestPrice}`
                        : "Not recorded"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">PSP Time</h4>
                    <p className="text-sm">
                      {selectedTrade.pspTime || "Not recorded"}
                    </p>
                  </div>
                </div>
              </div>

              {selectedTrade.notes && (
                <div className="border-t pt-4">
                  <h3 className="text-md font-semibold mb-3">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTrade.notes
                      .replace(/Account: [^\n]+\n?/g, "")
                      .replace(/Strategy: [^\n]+\n?/g, "")
                      .trim()}
                  </p>
                </div>
              )}

              {selectedTrade.mediaFiles &&
                selectedTrade.mediaFiles.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-md font-semibold mb-3">
                      Images & Media
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedTrade.mediaFiles.map((file, index) => (
                        <div
                          key={file.id || index}
                          className="relative overflow-hidden rounded-md border cursor-pointer"
                          onClick={() => {
                            setSelectedMedia(file);
                            setMediaModalOpen(true);
                          }}
                        >
                          {file.type === "image" ? (
                            <img
                              src={file.preview}
                              alt="Trade media"
                              className="w-full h-32 object-cover"
                            />
                          ) : (
                            <div className="w-full h-32 flex items-center justify-center bg-muted">
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
                                className="h-8 w-8 text-muted-foreground"
                              >
                                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                <rect
                                  x="1"
                                  y="5"
                                  width="15"
                                  height="14"
                                  rx="2"
                                  ry="2"
                                ></rect>
                              </svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="border-t pt-4 flex justify-end space-x-2">
                {(selectedTrade.status === "open" ||
                  selectedTrade.status === "partial") &&
                  selectedTrade.remainingSize &&
                  selectedTrade.remainingSize > 0 && (
                    <Button
                      onClick={() => {
                        setSelectedTrade(null);
                        openClosureDialog(selectedTrade.id);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Close Position
                    </Button>
                  )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedTrade(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {closureTradeId && (
        <TradeClosureForm
          tradeId={closureTradeId}
          open={closureDialogOpen}
          onOpenChange={setClosureDialogOpen}
          onSuccess={handleClosureSuccess}
          remainingSize={
            filteredTrades.find((t) => t.id === closureTradeId)
              ?.remainingSize ||
            filteredTrades.find((t) => t.id === closureTradeId)?.size ||
            0
          }
          symbol={
            filteredTrades.find((t) => t.id === closureTradeId)?.symbol || ""
          }
        />
      )}

      <EditTradeHandler onTradeUpdate={fetchTrades} />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Trade</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this trade? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (tradeToDelete) {
                  try {
                    const { success, error } = await deleteRecord(
                      "trades",
                      tradeToDelete,
                    );
                    if (success) {
                      toast({
                        title: "Trade Deleted",
                        description: "The trade has been successfully deleted",
                      });
                      fetchTrades();
                    } else {
                      console.error("Error deleting trade:", error);
                      toast({
                        title: "Error",
                        description: "Failed to delete the trade",
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    console.error("Error deleting trade:", error);
                    toast({
                      title: "Error",
                      description: "An unexpected error occurred",
                      variant: "destructive",
                    });
                  }
                  setDeleteConfirmOpen(false);
                  setTradeToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mediaModalOpen} onOpenChange={setMediaModalOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-background/95">
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMediaModalOpen(false)}
              className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
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
                className="h-4 w-4"
              >
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </Button>
          </div>
          <div className="flex items-center justify-center w-full h-full p-4">
            {selectedMedia?.type === "image" ? (
              <img
                src={selectedMedia?.preview}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : (
              <video
                src={selectedMedia?.preview}
                controls
                autoPlay
                className="max-w-full max-h-[80vh]"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TradesTable;
