import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnalysisTabProps {
  timeframe: string;
  pspTime: string;
  ssmtQuarter: string;
  tradeGrade: string;
  handleChange: (field: string, value: string) => void;
}

const AnalysisTab: React.FC<AnalysisTabProps> = ({
  timeframe,
  pspTime,
  ssmtQuarter,
  tradeGrade,
  handleChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="timeframe">Timeframe</Label>
        <Select
          value={timeframe}
          onValueChange={(value) => handleChange("timeframe", value)}
        >
          <SelectTrigger id="timeframe">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">1 Minute</SelectItem>
            <SelectItem value="5m">5 Minutes</SelectItem>
            <SelectItem value="15m">15 Minutes</SelectItem>
            <SelectItem value="30m">30 Minutes</SelectItem>
            <SelectItem value="1h">1 Hour</SelectItem>
            <SelectItem value="4h">4 Hours</SelectItem>
            <SelectItem value="1d">Daily</SelectItem>
            <SelectItem value="1w">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pspTime">PSP Time</Label>
        <Input
          id="pspTime"
          type="time"
          placeholder="Enter PSP time"
          value={pspTime}
          onChange={(e) => handleChange("pspTime", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Price Structure Pivot time
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ssmtQuarter">SSMT Quarter</Label>
        <Select
          value={ssmtQuarter}
          onValueChange={(value) => handleChange("ssmtQuarter", value)}
        >
          <SelectTrigger id="ssmtQuarter">
            <SelectValue placeholder="Select SSMT quarter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Q1">Q1</SelectItem>
            <SelectItem value="Q2">Q2</SelectItem>
            <SelectItem value="Q3">Q3</SelectItem>
            <SelectItem value="Q4">Q4</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Session, Swing, Momentum, Trend quarter
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tradeGrade">Trade Grade</Label>
        <div className="flex flex-wrap gap-2">
          {["A", "B", "C", "D", "F"].map((grade) => (
            <Button
              key={grade}
              type="button"
              variant={tradeGrade === grade ? "default" : "outline"}
              onClick={() => handleChange("tradeGrade", grade)}
              className="flex-1 min-w-[50px]"
            >
              {grade}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Grade the quality of your trade execution
        </p>
      </div>
    </div>
  );
};

export default AnalysisTab;
