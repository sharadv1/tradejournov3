import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

interface TradeClosureFormProps {
  tradeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  remainingSize: number;
  symbol: string;
}

interface ClosureData {
  close_date: string;
  close_time: string;
  close_price: string;
  closed_position_size: string;
  notes: string;
}

interface TradeData {
  position_size: number;
  remaining_size: number | null;
  position_size_closed: number | null;
  status: string | null;
  initial_stop_loss?: number | null;
  entry_price?: number;
  direction?: string;
}

interface SymbolData {
  id: string;
  symbol: string;
  name: string;
  type: string;
  tick_size?: number;
  tick_value?: number;
}

const TradeClosureForm: React.FC<TradeClosureFormProps> = ({
  tradeId,
  open,
  onOpenChange,
  onSuccess,
  remainingSize: initialRemainingSize,
  symbol,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingSize, setRemainingSize] =
    useState<number>(initialRemainingSize);
  const [tradeData, setTradeData] = useState<TradeData | null>(null);
  const [closureData, setClosureData] = useState<ClosureData>({
    close_date: new Date().toISOString().split("T")[0],
    close_time: new Date().toTimeString().split(" ")[0].slice(0, 5),
    close_price: "",
    closed_position_size: "",
    notes: "",
  });

  const [rMultiple, setRMultiple] = useState<number | null>(null);
  const [symbolData, setSymbolData] = useState<SymbolData | null>(null);
  const [isFutures, setIsFutures] = useState(false);

  useEffect(() => {
    if (symbol) {
      fetchSymbolData(symbol);
    }
  }, [symbol]);

  const fetchSymbolData = async (symbolName: string) => {
    try {
      // First try to get from database
      const { data, error } = await supabase
        .from("symbols")
        .select("*")
        .eq("symbol", symbolName)
        .maybeSingle();

      if (!error && data) {
        console.log("Symbol data from database:", data);
        setSymbolData(data);
        setIsFutures(data.type?.toLowerCase() === "futures");
        return;
      }

      // Fallback to localStorage
      const storedSymbols = localStorage.getItem("tradingSymbols");
      if (storedSymbols) {
        const symbols = JSON.parse(storedSymbols);
        const foundSymbol = symbols.find(
          (s: any) => s.symbol.toLowerCase() === symbolName.toLowerCase(),
        );
        if (foundSymbol) {
          console.log("Symbol data from localStorage:", foundSymbol);
          setSymbolData(foundSymbol);
          setIsFutures(foundSymbol.type?.toLowerCase() === "futures");
          return;
        }
      }

      // Last resort fallback for known futures
      const symbolLower = symbolName.toLowerCase();
      const knownFutures = ["mes", "es", "nq", "mnq"];
      if (knownFutures.includes(symbolLower)) {
        setIsFutures(true);
        let fallbackData: SymbolData = {
          id: symbolLower,
          symbol: symbolName,
          name: symbolName,
          type: "futures",
          tick_size: 0.25,
          tick_value: 1.25, // Default for MES
        };

        if (symbolLower === "es") {
          fallbackData.tick_value = 12.5;
        } else if (symbolLower === "nq") {
          fallbackData.tick_value = 5.0;
        } else if (symbolLower === "mnq") {
          fallbackData.tick_value = 0.5;
        }

        console.log("Using fallback data for known futures:", fallbackData);
        setSymbolData(fallbackData);
      } else {
        setIsFutures(false);
        setSymbolData(null);
      }
    } catch (err) {
      console.error("Error fetching symbol data:", err);
      setSymbolData(null);
      setIsFutures(false);
    }
  };

  const handleChange = (field: keyof ClosureData, value: string) => {
    let formattedValue = value;
    if (field === "close_price" || field === "closed_position_size") {
      formattedValue = value.replace(/[^0-9.]/g, "");
      const parts = formattedValue.split(".");
      if (parts.length > 2) {
        formattedValue = parts[0] + "." + parts.slice(1).join("");
      }
    }

    setClosureData((prev) => ({
      ...prev,
      [field]: formattedValue,
    }));

    if (
      field === "close_price" &&
      tradeData &&
      tradeData.initial_stop_loss &&
      tradeData.entry_price
    ) {
      calculateRMultiple(parseFloat(formattedValue));
    }
  };

  const calculateRMultiple = (closePrice: number) => {
    if (
      !tradeData ||
      !tradeData.entry_price ||
      !tradeData.initial_stop_loss ||
      isNaN(closePrice)
    ) {
      setRMultiple(null);
      return;
    }

    const entryPrice = tradeData.entry_price;
    const initialStopLoss = tradeData.initial_stop_loss;

    if (!initialStopLoss) {
      setRMultiple(null);
      return;
    }

    let rValue;
    if (tradeData.direction === "long") {
      rValue = entryPrice - initialStopLoss;
    } else {
      rValue = initialStopLoss - entryPrice;
    }

    if (isFutures && symbolData) {
      // Use symbol data from database or fallback
      const tickSize = symbolData.tick_size || 0.25;
      const tickValue = symbolData.tick_value || 1.25;

      const ticksAtRisk = Math.abs(rValue) / tickSize;
      rValue = ticksAtRisk * tickValue;
    }

    rValue = Math.abs(rValue);
    if (rValue === 0) {
      console.log("R value is zero, cannot calculate R multiple");
      setRMultiple(null);
      return;
    }

    console.log("Calculating R multiple with rValue:", rValue);

    // Calculate entry-exit difference and stop difference based on direction
    let entryExitDiff, stopDiff;

    if (tradeData.direction === "long") {
      entryExitDiff = closePrice - entryPrice;
      stopDiff = entryPrice - initialStopLoss;
    } else {
      entryExitDiff = entryPrice - closePrice;
      stopDiff = initialStopLoss - entryPrice;
    }

    // For futures, convert to ticks then to dollar value
    let profit, risk;

    if (isFutures && symbolData) {
      // Use symbol data from database or fallback
      const tickSize = symbolData.tick_size || 0.25;
      const tickValue = symbolData.tick_value || 1.25;

      // Convert entry-exit difference to ticks then to dollars
      profit = (Math.abs(entryExitDiff) / tickSize) * tickValue;
      // Apply sign based on direction and price movement
      if (
        (tradeData.direction === "long" && closePrice < entryPrice) ||
        (tradeData.direction === "short" && closePrice > entryPrice)
      ) {
        profit = -profit;
      }

      // Convert stop difference to ticks then to dollars
      risk = (Math.abs(stopDiff) / tickSize) * tickValue;
    } else {
      // For non-futures, use price differences directly
      profit = entryExitDiff;
      risk = Math.abs(stopDiff);
    }

    // Calculate R multiple (profit divided by risk)
    const rMultipleValue = profit / risk;

    setRMultiple(Math.round(rMultipleValue * 100) / 100);
  };

  useEffect(() => {
    if (open && tradeId) {
      console.log(
        "TradeClosureForm opened with initialRemainingSize:",
        initialRemainingSize,
      );
      fetchLatestTradeData(true);
    }
  }, [open, tradeId]);

  const fetchLatestTradeData = async (forceRefresh = false) => {
    try {
      console.log("Fetching latest trade data for trade ID:", tradeId);

      try {
        const { data: directData, error: directError } = await supabase.rpc(
          "exec_sql",
          {
            sql_query: `SELECT position_size, remaining_size, status, entry_price, initial_stop_loss, direction FROM trades WHERE id = '${tradeId}'`,
          },
        );

        if (!directError && directData && directData[0]) {
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

          setRemainingSize(remaining_size);
          setTradeData({
            position_size: position_size,
            remaining_size: remaining_size,
            position_size_closed: position_size - remaining_size,
            status: status,
            entry_price: parseFloat(directData[0].entry_price) || null,
            initial_stop_loss:
              parseFloat(directData[0].initial_stop_loss) || null,
            direction: directData[0].direction,
          });

          return;
        }
      } catch (directQueryError) {
        console.warn(
          "Direct SQL query failed, falling back to standard query:",
          directQueryError,
        );
      }

      const timestamp = Date.now();
      const { data: tradeWithClosures, error: tradeError } = await supabase
        .from("trades")
        .select(
          "position_size, remaining_size, position_size_closed, status, entry_price, initial_stop_loss, direction, trade_closures(closed_position_size)",
        )
        .eq("id", tradeId)
        .single()
        .then((result) => {
          console.log(
            "Fresh trade data fetched at:",
            new Date().toISOString(),
            "with timestamp:",
            timestamp,
          );
          return result;
        });

      if (tradeError) {
        console.error("Error fetching latest trade data:", tradeError);
        toast({
          title: "Error",
          description: "Could not fetch the latest trade data",
          variant: "destructive",
        });
        return;
      }

      if (tradeWithClosures) {
        console.log("Trade with closures (raw data):", tradeWithClosures);

        const data = {
          position_size: tradeWithClosures.position_size,
          remaining_size: tradeWithClosures.remaining_size,
          position_size_closed: tradeWithClosures.position_size_closed,
          status: tradeWithClosures.status,
          entry_price: tradeWithClosures.entry_price,
          initial_stop_loss: tradeWithClosures.initial_stop_loss,
          direction: tradeWithClosures.direction,
        };

        console.log("Extracted trade data:", data);
        setTradeData(data);

        let totalClosedSize = 0;
        if (
          tradeWithClosures.trade_closures &&
          tradeWithClosures.trade_closures.length > 0
        ) {
          totalClosedSize = tradeWithClosures.trade_closures.reduce(
            (sum: number, closure: any) =>
              sum + (parseFloat(closure.closed_position_size) || 0),
            0,
          );
          console.log("Total closed size from closures:", totalClosedSize);
        }

        let actualRemainingSize: number;

        if (
          data.status === "open" &&
          (data.remaining_size === 0 || data.remaining_size === null)
        ) {
          actualRemainingSize = data.position_size;
          console.log(
            "Open trade with zero remaining_size, using full position size:",
            actualRemainingSize,
          );
        } else if (
          data.remaining_size !== null &&
          data.remaining_size !== undefined
        ) {
          actualRemainingSize = data.remaining_size;
          console.log(
            "Using remaining_size from database:",
            actualRemainingSize,
          );
        } else if (totalClosedSize > 0) {
          actualRemainingSize = data.position_size - totalClosedSize;
          console.log("Calculated from closures:", {
            position_size: data.position_size,
            totalClosedSize,
            result: actualRemainingSize,
          });
        } else if (
          data.position_size_closed !== null &&
          data.position_size_closed !== undefined
        ) {
          actualRemainingSize = data.position_size - data.position_size_closed;
          console.log("Calculated from position_size_closed:", {
            position_size: data.position_size,
            position_size_closed: data.position_size_closed,
            result: actualRemainingSize,
          });
        } else {
          actualRemainingSize = data.position_size;
          console.log("Using full position_size:", actualRemainingSize);
        }

        actualRemainingSize = Math.max(0, actualRemainingSize);

        console.log("Latest trade data from DB:", data);
        console.log("Final calculated remaining size:", actualRemainingSize);
        console.log("Initial remaining size from props:", initialRemainingSize);

        setRemainingSize(actualRemainingSize);

        setClosureData((prev) => ({
          ...prev,
          closed_position_size: prev.closed_position_size || "",
        }));
      }
    } catch (error) {
      console.error("Unexpected error fetching trade data:", error);
    }
  };

  const validateForm = (): boolean => {
    setError(null);
    if (!closureData.close_price) {
      setError("Close price is required");
      return false;
    }

    if (!closureData.closed_position_size) {
      setError("Closed position size is required");
      return false;
    }

    const closedSize = parseFloat(closureData.closed_position_size);
    if (isNaN(closedSize) || closedSize <= 0) {
      setError("Closed position size must be a positive number");
      return false;
    }

    if (closedSize > remainingSize) {
      setError(
        `Cannot close more than the remaining position size (${remainingSize})`,
      );
      return false;
    }

    // Validate that initial stop loss and entry price are available for R multiple calculation
    if (!tradeData || !tradeData.initial_stop_loss || !tradeData.entry_price) {
      setError(
        "Initial stop loss and entry price are required to calculate R multiple. Please set these values in the trade details.",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      let riskAmount = null;
      let calculatedRMultiple = null;

      if (tradeData && tradeData.initial_stop_loss && tradeData.entry_price) {
        const closedSize = parseFloat(closureData.closed_position_size);
        const riskPerShare = Math.abs(
          tradeData.entry_price - tradeData.initial_stop_loss,
        );
        riskAmount = riskPerShare * closedSize;

        // Force recalculation of R multiple if it's still null
        if (rMultiple === null && closureData.close_price) {
          console.log("Forcing R multiple calculation before submission");
          calculateRMultiple(parseFloat(closureData.close_price));
          // Wait a moment for the state to update
          setTimeout(() => {
            calculatedRMultiple = rMultiple;
            console.log(
              "Calculated R multiple before submission:",
              calculatedRMultiple,
            );
          }, 0);
        }
      }

      const { data: closureResult, error: closureError } = await supabase
        .from("trade_closures")
        .insert({
          trade_id: tradeId,
          close_date: closureData.close_date,
          close_time: closureData.close_time,
          close_price: parseFloat(closureData.close_price),
          closed_position_size: parseFloat(closureData.closed_position_size),
          notes:
            closureData.notes +
            (rMultiple === null &&
            tradeData &&
            tradeData.entry_price &&
            tradeData.initial_stop_loss
              ? "\n\nDebug info: Entry: " +
                tradeData.entry_price +
                ", Stop: " +
                tradeData.initial_stop_loss +
                ", Close: " +
                closureData.close_price
              : ""),
          r_multiple: rMultiple,
          risk_amount: riskAmount,
        });

      if (closureError) throw closureError;

      console.log("Trade closure successful:", { closureResult });

      setClosureData({
        close_date: new Date().toISOString().split("T")[0],
        close_time: new Date().toTimeString().split(" ")[0].slice(0, 5),
        close_price: "",
        closed_position_size: "",
        notes: "",
      });
      setRMultiple(null);

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error adding trade closure:", error);
      setError(error.message || "Failed to add trade closure");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="sm:max-w-[500px] bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Close Position for {symbol}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="close_date">
              Close Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="close_date"
              type="datetime-local"
              value={`${closureData.close_date}T${closureData.close_time}`}
              onChange={(e) => {
                const dateTime = new Date(e.target.value);
                const date = dateTime.toISOString().split("T")[0];
                const time = dateTime.toTimeString().split(" ")[0].slice(0, 5);
                handleChange("close_date", date);
                handleChange("close_time", time);
              }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="close_price">
              Close Price <span className="text-red-500">*</span>
            </Label>
            <Input
              id="close_price"
              type="text"
              inputMode="decimal"
              placeholder="Close price"
              value={closureData.close_price}
              onChange={(e) => handleChange("close_price", e.target.value)}
              required
            />
            {rMultiple !== null && (
              <p
                className={`text-xs ${rMultiple >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                R Multiple: {rMultiple > 0 ? "+" : ""}
                {rMultiple.toFixed(2)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closed_position_size">
                Position Size to Close <span className="text-red-500">*</span>
              </Label>
              <Input
                id="closed_position_size"
                type="text"
                inputMode="decimal"
                placeholder={`Max: ${remainingSize}`}
                value={closureData.closed_position_size}
                onChange={(e) =>
                  handleChange("closed_position_size", e.target.value)
                }
                required
                className={
                  (error && !closureData.closed_position_size) ||
                  parseFloat(closureData.closed_position_size) > remainingSize
                    ? "border-red-500"
                    : ""
                }
              />
              {parseFloat(closureData.closed_position_size) > remainingSize && (
                <p className="text-xs text-red-500">
                  Cannot exceed remaining size of {remainingSize}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this closure"
              value={closureData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Closure"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TradeClosureForm;
