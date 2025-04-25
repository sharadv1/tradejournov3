import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TradeData {
  symbol: string;
  tradeType: string;
  entryPrice: string;
  exitPrice: string;
  positionSize: string;
  date: string;
  time: string;
  notes: string;
  marketType: string;
  direction: string;
  maxRiskPerTrade: string;
  account: string;
  strategy: string;
}

interface TradeDetailsTabProps {
  tradeData: TradeData;
  handleChange: (field: keyof TradeData, value: string) => void;
}

const TradeDetailsTab: React.FC<TradeDetailsTabProps> = ({
  tradeData,
  handleChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Trade Type</Label>
        <div className="flex flex-wrap gap-2">
          {["Stock", "Futures", "Forex", "Crypto", "Options"].map((type) => (
            <Button
              key={type}
              type="button"
              variant={
                tradeData.marketType.toLowerCase() === type.toLowerCase()
                  ? "default"
                  : "outline"
              }
              onClick={() => handleChange("marketType", type.toLowerCase())}
              className="flex-1 min-w-[80px]"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="symbol">Symbol</Label>
        <Select
          value={tradeData.symbol}
          onValueChange={(value) => handleChange("symbol", value)}
        >
          <SelectTrigger id="symbol">
            <SelectValue placeholder="Select symbol..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AAPL">AAPL</SelectItem>
            <SelectItem value="MSFT">MSFT</SelectItem>
            <SelectItem value="GOOGL">GOOGL</SelectItem>
            <SelectItem value="AMZN">AMZN</SelectItem>
            <SelectItem value="TSLA">TSLA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Direction</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={tradeData.direction === "long" ? "default" : "outline"}
            onClick={() => handleChange("direction", "long")}
            className="w-full"
          >
            Long
          </Button>
          <Button
            type="button"
            variant={tradeData.direction === "short" ? "default" : "outline"}
            onClick={() => handleChange("direction", "short")}
            className="w-full"
          >
            Short
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Entry Date</Label>
        <Input
          id="date"
          type="datetime-local"
          value={`${tradeData.date}T${tradeData.time}`}
          onChange={(e) => {
            const dateTime = new Date(e.target.value);
            const date = dateTime.toISOString().split("T")[0];
            const time = dateTime.toTimeString().split(" ")[0].slice(0, 5);
            handleChange("date", date);
            handleChange("time", time);
          }}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entryPrice">Entry Price</Label>
        <Input
          id="entryPrice"
          type="number"
          step="0.01"
          placeholder="Entry price"
          value={tradeData.entryPrice}
          onChange={(e) => handleChange("entryPrice", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="positionSize">Quantity</Label>
        <Input
          id="positionSize"
          type="number"
          placeholder="1"
          value={tradeData.positionSize}
          onChange={(e) => handleChange("positionSize", e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Supports small values (e.g. 0.000033432)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="account">Account</Label>
        <Select
          value={tradeData.account}
          onValueChange={(value) => handleChange("account", value)}
        >
          <SelectTrigger id="account">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="ira">IRA</SelectItem>
            <SelectItem value="trading">Trading</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="strategy">Strategy</Label>
        <Select
          value={tradeData.strategy}
          onValueChange={(value) => handleChange("strategy", value)}
        >
          <SelectTrigger id="strategy">
            <SelectValue placeholder="Select strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="momentum">Momentum</SelectItem>
            <SelectItem value="breakout">Breakout</SelectItem>
            <SelectItem value="reversal">Reversal</SelectItem>
            <SelectItem value="trend">Trend Following</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TradeDetailsTab;
