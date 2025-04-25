import React from "react";
import TradeClosureForm from "./dashboard/TradeClosureForm";
import { AuthProvider } from "@/contexts/AuthContext";

export default function TradeClosureDemoStoryboard() {
  return (
    <AuthProvider>
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Trade Closure Demo</h2>
        <TradeClosureForm
          tradeId="1"
          symbol="AAPL"
          remainingSize={100}
          open={true}
          onOpenChange={() => console.log("Dialog state changed")}
          onSuccess={() => console.log("Trade closed")}
        />
      </div>
    </AuthProvider>
  );
}
