import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

interface TradeData {
  highestPrice: string;
  lowestPrice: string;
}

interface PriceTrackingTabProps {
  tradeData: TradeData;
  handleChange: (field: keyof TradeData, value: string) => void;
  onCloseTrade?: () => void;
  showCloseButton?: boolean;
}

const PriceTrackingTab: React.FC<PriceTrackingTabProps> = ({
  tradeData,
  handleChange,
  onCloseTrade,
  showCloseButton = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="highestPrice">Highest Price Reached</Label>
        <Input
          id="highestPrice"
          type="number"
          step="0.01"
          placeholder="Highest price during trade"
          value={tradeData.highestPrice}
          onChange={(e) => handleChange("highestPrice", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lowestPrice">Lowest Price Reached</Label>
        <Input
          id="lowestPrice"
          type="number"
          step="0.01"
          placeholder="Lowest price during trade"
          value={tradeData.lowestPrice}
          onChange={(e) => handleChange("lowestPrice", e.target.value)}
        />
      </div>

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

export default PriceTrackingTab;
