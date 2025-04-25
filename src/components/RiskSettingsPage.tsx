import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Settings } from "lucide-react";
import { useRisk } from "@/contexts/RiskContext";
import { useNavigate } from "react-router-dom";

const RiskSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    accountBalance,
    riskProfile,
    maxRiskPercentage,
    maxRiskAmount,
    setAccountBalance,
    setRiskProfile,
  } = useRisk();

  const [localAccountBalance, setLocalAccountBalance] = useState<string>(
    accountBalance.toString(),
  );

  const handleAccountBalanceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    // Remove any non-numeric characters except decimal point
    const value = e.target.value.replace(/[^0-9.]/g, "");

    // Ensure only one decimal point
    const parts = value.split(".");
    if (parts.length > 2) {
      setLocalAccountBalance(parts[0] + "." + parts.slice(1).join(""));
      return;
    }

    setLocalAccountBalance(value);
  };

  const handleSave = () => {
    const numericBalance = parseFloat(localAccountBalance);
    if (!isNaN(numericBalance) && numericBalance > 0) {
      setAccountBalance(numericBalance);
    }
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Main content */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Risk Settings</h1>
              <p className="text-muted-foreground">
                Configure your account balance and risk profile
              </p>
            </div>
          </div>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                <span>Risk Management Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Balance */}
              <div className="space-y-2">
                <Label htmlFor="accountBalance">Account Balance ($)</Label>
                <Input
                  id="accountBalance"
                  type="text"
                  inputMode="decimal"
                  value={localAccountBalance}
                  onChange={handleAccountBalanceChange}
                  placeholder="Enter your account balance"
                />
              </div>

              {/* Risk Profile */}
              <div className="space-y-2">
                <Label htmlFor="riskProfile">Risk Profile</Label>
                <Select
                  value={riskProfile}
                  onValueChange={(value) =>
                    setRiskProfile(value as "conservative" | "aggressive")
                  }
                >
                  <SelectTrigger id="riskProfile">
                    <SelectValue placeholder="Select risk profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">
                      Conservative (0.5% per trade)
                    </SelectItem>
                    <SelectItem value="aggressive">
                      Aggressive (1% per trade)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Risk Summary */}
              <div className="bg-muted p-4 rounded-md border border-border mt-4">
                <h3 className="font-medium mb-2">Risk Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Account Balance:
                    </span>
                    <span className="font-medium">
                      $
                      {accountBalance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk Profile:</span>
                    <span className="font-medium capitalize">
                      {riskProfile}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Max Risk Percentage:
                    </span>
                    <span className="font-medium">{maxRiskPercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Max Risk Per Trade:
                    </span>
                    <span className="font-medium">
                      $
                      {maxRiskAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <Button onClick={handleSave} className="w-full">
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RiskSettingsPage;
