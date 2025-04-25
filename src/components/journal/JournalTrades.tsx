import React, { useEffect, useState } from "react";
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
import { Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface JournalTradesProps {
  startDate: string;
  endDate: string;
}

interface Trade {
  id: string;
  symbol: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  position_size: number;
  pnl: number;
  status: string;
  r_multiple: number | null;
  close_date: string;
  close_time: string;
  notes?: string;
}

const JournalTrades = ({ startDate, endDate }: JournalTradesProps) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        setLoading(true);

        // Adjust date range based on entry type (assuming startDate is the reference date)
        let adjustedStartDate = startDate;
        let adjustedEndDate = endDate;

        // For weekly entries, ensure we're using Sunday to Saturday range
        const startDateObj = new Date(startDate);
        const dayOfWeek = startDateObj.getDay(); // 0 = Sunday, 6 = Saturday

        // If this is a weekly entry, adjust to ensure Sunday-Saturday range
        if (startDate !== endDate && dayOfWeek !== 0) {
          // Calculate days to previous Sunday
          const daysToSunday = dayOfWeek;
          const sundayDate = new Date(startDateObj);
          sundayDate.setDate(startDateObj.getDate() - daysToSunday);
          adjustedStartDate = sundayDate.toISOString().split("T")[0];

          // Calculate to next Saturday
          const saturdayDate = new Date(sundayDate);
          saturdayDate.setDate(sundayDate.getDate() + 6);
          adjustedEndDate = saturdayDate.toISOString().split("T")[0];
        }

        // Fetch trade closures within the date range
        const { data: closures, error: closuresError } = await supabase
          .from("trade_closures")
          .select(`*, trades(*)`) // Include the parent trade
          .gte("close_date", startDate) // Use the original startDate from props
          .lte("close_date", endDate) // Use the original endDate from props
          .order("close_date", { ascending: false });

        if (closuresError) throw closuresError;

        if (closures && closures.length > 0) {
          // Transform the data for display
          const transformedTrades = closures
            .map((closure) => {
              const trade = closure.trades;
              if (!trade) return null;

              // Calculate P&L - Corrected formula for both long and short trades
              let pnl = 0;
              const symbol = trade.symbol?.toLowerCase() || "";
              const isFutures =
                symbol === "mes" || symbol === "es" || symbol === "nq";

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
                }

                const priceDiff =
                  trade.direction === "long"
                    ? closure.close_price - trade.entry_price
                    : trade.entry_price - closure.close_price;

                const ticksOfPL = Math.abs(priceDiff) / tickSize;
                pnl =
                  (priceDiff >= 0 ? 1 : -1) *
                  ticksOfPL *
                  tickValue *
                  closure.closed_position_size;
              } else {
                // For stocks, crypto, forex
                if (trade.direction === "long") {
                  // For long trades: (exit_price - entry_price) * position_size
                  pnl =
                    (closure.close_price - trade.entry_price) *
                    closure.closed_position_size;
                } else {
                  // For short trades: (entry_price - exit_price) * position_size
                  pnl =
                    (trade.entry_price - closure.close_price) *
                    closure.closed_position_size;
                }
              }

              // Determine status
              let status = "breakeven";
              if (pnl > 0) status = "win";
              else if (pnl < 0) status = "loss";

              return {
                id: closure.id,
                trade_id: trade.id,
                symbol: trade.symbol,
                direction: trade.direction,
                entry_price: trade.entry_price,
                exit_price: closure.close_price,
                position_size: closure.closed_position_size,
                pnl: pnl,
                status: status,
                r_multiple: closure.r_multiple,
                close_date: closure.close_date,
                close_time: closure.close_time,
                notes: closure.notes || trade.notes,
              };
            })
            .filter(Boolean);

          setTrades(transformedTrades as Trade[]);
        } else {
          setTrades([]);
        }
      } catch (error) {
        console.error("Error fetching trades for journal:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, [startDate, endDate]);

  return (
    <div>
      {loading ? (
        <p className="text-center py-4">Loading trades...</p>
      ) : trades.length === 0 ? (
        <p className="text-center py-4 text-muted-foreground">
          No trades found for this period
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Exit</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead className="text-right">R Multiple</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-medium">
                    {trade.close_date}
                  </TableCell>
                  <TableCell>{trade.symbol}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        trade.direction === "long" ? "default" : "secondary"
                      }
                    >
                      {trade.direction === "long" ? "BUY" : "SELL"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${trade.entry_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${trade.exit_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <span
                      className={
                        trade.pnl > 0
                          ? "text-green-500"
                          : trade.pnl < 0
                            ? "text-red-500"
                            : ""
                      }
                    >
                      {trade.pnl >= 0 ? "$" : "-$"}
                      {Math.abs(trade.pnl).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {trade.r_multiple !== null ? (
                      <span
                        className={
                          trade.r_multiple >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        {trade.r_multiple > 0 ? "+" : ""}
                        {trade.r_multiple.toFixed(2)}R
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
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedTrade(trade)}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Trade Details Dialog */}
      <Dialog
        open={!!selectedTrade}
        onOpenChange={(open) => !open && setSelectedTrade(null)}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trade Details</DialogTitle>
            <DialogDescription>
              {selectedTrade?.symbol} - {selectedTrade?.close_date}
            </DialogDescription>
          </DialogHeader>

          {selectedTrade && (
            <div className="grid gap-6 py-4">
              {/* Basic Trade Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Symbol</h4>
                  <p>{selectedTrade.symbol}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Date</h4>
                  <p>{selectedTrade.close_date}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Time</h4>
                  <p>{selectedTrade.close_time}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Type</h4>
                  <Badge
                    variant={
                      selectedTrade.direction === "long"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {selectedTrade.direction === "long" ? "BUY" : "SELL"}
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
                  <p>${selectedTrade.entry_price.toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Exit Price</h4>
                  <p>${selectedTrade.exit_price.toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Position Size</h4>
                  <p>{selectedTrade.position_size} shares</p>
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
                    {selectedTrade.pnl >= 0 ? "$" : "-$"}
                    {Math.abs(selectedTrade.pnl).toFixed(2)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">R Multiple</h4>
                  {selectedTrade.r_multiple !== null &&
                  selectedTrade.r_multiple !== undefined ? (
                    <p
                      className={
                        selectedTrade.r_multiple >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {selectedTrade.r_multiple > 0 ? "+" : ""}
                      {selectedTrade.r_multiple.toFixed(2)}R
                    </p>
                  ) : (
                    <p className="text-muted-foreground">--</p>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              {selectedTrade.notes && (
                <div className="border-t pt-4">
                  <h3 className="text-md font-semibold mb-3">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTrade.notes}
                  </p>
                </div>
              )}

              {/* Actions Section */}
              <div className="border-t pt-4 flex justify-end space-x-2">
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
    </div>
  );
};

export default JournalTrades;
