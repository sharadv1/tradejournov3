import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TradeData {
  initialStopLoss: string;
  currentStopLoss: string;
  takeProfit: string;
  riskRewardRatio: string;
  symbol?: string;
  entryPrice?: string;
  positionSize?: string;
  marketType?: string;
  direction?: string;
}

interface RiskRewardTabProps {
  tradeData: TradeData;
  handleChange: (field: keyof TradeData, value: string) => void;
  onCloseTrade?: () => void;
  showCloseButton?: boolean;
  calculateRiskReward?: () => void;
}

const RiskRewardTab: React.FC<RiskRewardTabProps> = ({
  tradeData,
  handleChange,
  onCloseTrade,
  showCloseButton = false,
  calculateRiskReward,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="initialStopLoss">Initial Stop Loss</Label>
        <Input
          id="initialStopLoss"
          type="number"
          step="0.01"
          placeholder="Initial stop loss price"
          value={tradeData.initialStopLoss}
          onChange={(e) => handleChange("initialStopLoss", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="currentStopLoss">Current Stop Loss</Label>
        <Input
          id="currentStopLoss"
          type="number"
          step="0.01"
          placeholder="Current stop loss price"
          value={tradeData.currentStopLoss}
          onChange={(e) => handleChange("currentStopLoss", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="takeProfit">Take Profit</Label>
        <Input
          id="takeProfit"
          type="number"
          step="0.01"
          placeholder="Take profit price"
          value={tradeData.takeProfit}
          onChange={(e) => handleChange("takeProfit", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="riskRewardRatio">Risk/Reward Ratio</Label>
        <Input
          id="riskRewardRatio"
          type="text"
          placeholder="Calculated automatically"
          value={tradeData.riskRewardRatio}
          readOnly
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Calculated automatically based on entry price, stop loss, and take
          profit
        </p>
      </div>

      {calculateRiskReward && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={calculateRiskReward}
        >
          Calculate Risk/Reward
        </Button>
      )}

      {showCloseButton && (
        <Button
          onClick={onCloseTrade}
          className="w-full mt-4 bg-green-600 hover:bg-green-700"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Close Trade
        </Button>
      )}
    </div>
  );
};

export default RiskRewardTab;
