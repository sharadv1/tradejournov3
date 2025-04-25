import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RMultipleDemo: React.FC = () => {
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [closePrice, setClosePrice] = useState<string>("");
  const [rMultiple, setRMultiple] = useState<number | null>(null);
  const [riskPerShare, setRiskPerShare] = useState<number | null>(null);
  const [profitPerShare, setProfitPerShare] = useState<number | null>(null);

  // Calculate R multiple whenever inputs change
  useEffect(() => {
    calculateRMultiple();
  }, [direction, entryPrice, stopLoss, closePrice]);

  const calculateRMultiple = () => {
    // Reset values if any input is missing
    if (!entryPrice || !stopLoss || !closePrice) {
      setRMultiple(null);
      setRiskPerShare(null);
      setProfitPerShare(null);
      return;
    }

    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const close = parseFloat(closePrice);

    // Validate inputs are numbers
    if (isNaN(entry) || isNaN(stop) || isNaN(close)) {
      setRMultiple(null);
      setRiskPerShare(null);
      setProfitPerShare(null);
      return;
    }

    // Calculate risk per share (R value)
    let risk;
    if (direction === "long") {
      // For long trades, risk is from entry to stop loss (below entry)
      risk = entry - stop;
    } else {
      // For short trades, risk is from entry to stop loss (above entry)
      risk = stop - entry;
    }

    // Ensure risk is positive and not zero
    risk = Math.abs(risk);
    if (risk === 0) {
      setRMultiple(null);
      setRiskPerShare(null);
      setProfitPerShare(null);
      return;
    }

    // Calculate profit/loss based on direction
    let profit;
    if (direction === "long") {
      profit = close - entry;
    } else {
      profit = entry - close;
    }

    // Calculate R multiple (profit divided by risk)
    const rMultipleValue = profit / risk;

    // Round to 2 decimal places
    setRMultiple(Math.round(rMultipleValue * 100) / 100);
    setRiskPerShare(Math.round(risk * 100) / 100);
    setProfitPerShare(Math.round(profit * 100) / 100);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>R Multiple Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="direction">Trade Direction</Label>
          <Select
            value={direction}
            onValueChange={(value) => setDirection(value as "long" | "short")}
          >
            <SelectTrigger id="direction">
              <SelectValue placeholder="Select direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="entryPrice">Entry Price</Label>
          <Input
            id="entryPrice"
            type="number"
            step="0.01"
            placeholder="Enter price"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stopLoss">Initial Stop Loss</Label>
          <Input
            id="stopLoss"
            type="number"
            step="0.01"
            placeholder="Enter stop loss"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="closePrice">Close Price</Label>
          <Input
            id="closePrice"
            type="number"
            step="0.01"
            placeholder="Enter close price"
            value={closePrice}
            onChange={(e) => setClosePrice(e.target.value)}
          />
        </div>

        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">
                Risk Per Share (R)
              </Label>
              <p className="text-lg font-semibold">
                {riskPerShare !== null ? `$${riskPerShare.toFixed(2)}` : "--"}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">
                Profit/Loss Per Share
              </Label>
              <p
                className={`text-lg font-semibold ${profitPerShare !== null ? (profitPerShare >= 0 ? "text-green-500" : "text-red-500") : ""}`}
              >
                {profitPerShare !== null
                  ? `$${profitPerShare.toFixed(2)}`
                  : "--"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Label className="text-sm text-muted-foreground">R Multiple</Label>
            <p
              className={`text-2xl font-bold ${rMultiple !== null ? (rMultiple >= 0 ? "text-green-500" : "text-red-500") : ""}`}
            >
              {rMultiple !== null
                ? `${rMultiple > 0 ? "+" : ""}${rMultiple.toFixed(2)}R`
                : "--"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RMultipleDemo;
