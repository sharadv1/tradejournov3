import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  PlusCircle,
  Menu,
  BarChart3,
  BookOpen,
  LineChart,
  Settings,
  Users,
  Briefcase,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import MetricsGrid from "./dashboard/MetricsGrid";
import PerformanceChart from "./dashboard/PerformanceChart";
import TradesTable from "./dashboard/TradesTable";
import QuickAddTradeForm from "./dashboard/QuickAddTradeForm";

const Home = () => {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );
  const [showQuickAddForm, setShowQuickAddForm] = useState(false);

  return (
    <div className="h-screen bg-background">
      <div className="overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Your trading performance at a glance
              </p>
            </div>
            <Button
              onClick={() => setShowQuickAddForm(true)}
              className="flex items-center"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Add Trade</span>
            </Button>
          </div>

          {/* Metrics Grid */}
          <Card>
            <CardContent className="p-6">
              <MetricsGrid />
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <Card>
            <CardContent className="p-6">
              <PerformanceChart timeframe={timeframe} />
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
              <TradesTable key={showQuickAddForm.toString()} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Add Trade Form */}
      <QuickAddTradeForm
        open={showQuickAddForm}
        onOpenChange={setShowQuickAddForm}
        onSubmit={() => {
          setShowQuickAddForm(false);
          // Force a re-render of the TradesTable by changing its key
          setShowQuickAddForm((prev) => !prev);
        }}
        onTradeUpdate={() => setShowQuickAddForm((prev) => !prev)}
      />
    </div>
  );
};

export default Home;
