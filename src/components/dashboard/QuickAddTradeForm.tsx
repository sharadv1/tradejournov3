import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRisk } from "@/contexts/RiskContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Settings, DollarSign, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotesTab, { MediaFile } from "./NotesTab";
import { TradingSymbol } from "@/components/SymbolManagementPage";
import TradeClosureForm from "./TradeClosureForm";
import { supabase, getCurrentUser, ensureUserInDatabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

interface QuickAddTradeFormProps {
  onSubmit?: (tradeData: TradeData) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
  existingTradeId?: string;
  existingTradeData?: Partial<TradeData>;
  onTradeUpdate?: () => void;
}

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
  initialStopLoss: string;
  currentStopLoss: string;
  takeProfit: string;
  riskRewardRatio: string;
  riskAmount: string;
  rewardAmount: string;
  riskFormula: string;
  rewardFormula: string;
  highestPrice: string;
  lowestPrice: string;
  timeframe: string;
  pspTime: string;
  ssmtQuarter: string;
  tradeGrade: string;
  account: string;
  strategy: string;
  mediaFiles?: MediaFile[];
  status?: string;
  remainingSize?: number;
  setupIds?: string[];
}

const QuickAddTradeForm: React.FC<QuickAddTradeFormProps> = ({
  onSubmit = () => {},
  open = false,
  onOpenChange = () => {},
  isOpen = false,
  onClose = () => {},
  existingTradeId = "",
  existingTradeData = {},
  onTradeUpdate = () => {},
}) => {
  const navigate = useNavigate();
  const { maxRiskAmount } = useRisk();

  const dialogOpen = open || isOpen;
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) onClose();
  };

  const [activeTab, setActiveTab] = useState("details");
  const [availableSymbols, setAvailableSymbols] = useState<TradingSymbol[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<TradingSymbol[]>([]);
  const [riskExceededMessage, setRiskExceededMessage] = useState<string>("");
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [strategies, setStrategies] = useState<{ id: string; name: string }[]>(
    [],
  );

  const defaultTradeData: TradeData = {
    symbol: "",
    tradeType: "buy",
    entryPrice: "",
    exitPrice: "",
    positionSize: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().split(" ")[0].slice(0, 5),
    notes: "",
    marketType: "stock",
    direction: "long",
    maxRiskPerTrade: maxRiskAmount.toString(),
    initialStopLoss: "",
    currentStopLoss: "",
    takeProfit: "",
    riskRewardRatio: "",
    riskAmount: "",
    rewardAmount: "",
    riskFormula: "",
    rewardFormula: "",
    highestPrice: "",
    lowestPrice: "",
    timeframe: "1h",
    pspTime: "",
    ssmtQuarter: "Q1",
    tradeGrade: "B",
    account: "",
    strategy: "",
    mediaFiles: [],
    status: "open",
    remainingSize: 0,
  };

  const [tradeData, setTradeData] = useState<TradeData>(defaultTradeData);

  useEffect(() => {
    const fetchAccountsAndStrategies = async () => {
      try {
        const { data: accountsData, error: accountsError } = await supabase
          .from("accounts")
          .select("id, name")
          .order("name");

        if (accountsError) throw accountsError;
        console.log("Fetched accounts:", accountsData);
        setAccounts(accountsData || []);

        const { data: strategiesData, error: strategiesError } = await supabase
          .from("strategies")
          .select("id, name")
          .order("name");

        if (strategiesError) throw strategiesError;
        console.log("Fetched strategies:", strategiesData);
        setStrategies(strategiesData || []);
      } catch (error) {
        console.error("Error fetching accounts and strategies:", error);
      }
    };

    fetchAccountsAndStrategies();
  }, []);

  useEffect(() => {
    const storedSymbols = localStorage.getItem("tradingSymbols");
    if (storedSymbols) {
      setAvailableSymbols(JSON.parse(storedSymbols));
    } else {
      const defaultSymbols = [
        { id: "1", symbol: "AAPL", name: "Apple Inc.", type: "stock" },
        {
          id: "2",
          symbol: "MSFT",
          name: "Microsoft Corporation",
          type: "stock",
        },
        { id: "3", symbol: "GOOGL", name: "Alphabet Inc.", type: "stock" },
        { id: "4", symbol: "AMZN", name: "Amazon.com, Inc.", type: "stock" },
        { id: "5", symbol: "TSLA", name: "Tesla, Inc.", type: "stock" },
        { id: "6", symbol: "BTC", name: "Bitcoin", type: "crypto" },
        { id: "7", symbol: "ETH", name: "Ethereum", type: "crypto" },
        { id: "8", symbol: "ES", name: "E-mini S&P 500", type: "futures" },
        { id: "9", symbol: "NQ", name: "E-mini NASDAQ-100", type: "futures" },
        { id: "10", symbol: "EUR/USD", name: "Euro/US Dollar", type: "forex" },
      ];
      setAvailableSymbols(defaultSymbols);
      localStorage.setItem("tradingSymbols", JSON.stringify(defaultSymbols));
    }
  }, []);

  useEffect(() => {
    if (existingTradeId && Object.keys(existingTradeData).length > 0) {
      console.log(
        "QuickAddTradeForm opened in edit mode:",
        existingTradeId,
        existingTradeData,
      );

      const updatedTradeData = {
        ...defaultTradeData,
        ...existingTradeData,
      };

      console.log("Setting form with data:", updatedTradeData);

      const hasClosures =
        updatedTradeData.mediaFiles && updatedTradeData.mediaFiles.length > 0;
      if (hasClosures) {
        console.log(
          "Media files found in existing data (trade has closures):",
          updatedTradeData.mediaFiles,
        );
      }

      setTradeData(updatedTradeData);

      if (updatedTradeData.symbol) {
        setSymbolSearch(updatedTradeData.symbol);
      }

      if (updatedTradeData.marketType) {
        filterSymbolsByType(updatedTradeData.marketType);
      }
    }
  }, [existingTradeId, existingTradeData]);

  const handleChange = (field: keyof TradeData, value: string) => {
    console.log(`Changing field ${field} to value: ${value}`);

    let formattedValue = value;
    if (
      field === "entryPrice" ||
      field === "initialStopLoss" ||
      field === "takeProfit" ||
      field === "positionSize" ||
      field === "currentStopLoss" ||
      field === "highestPrice" ||
      field === "lowestPrice" ||
      field === "exitPrice"
    ) {
      formattedValue = value.replace(/[^0-9.]/g, "");
      const parts = formattedValue.split(".");
      if (parts.length > 2) {
        formattedValue = parts[0] + "." + parts.slice(1).join("");
      }
    }

    setTradeData((prev) => {
      const newData = {
        ...prev,
        [field]: formattedValue,
      };
      console.log(`Updated ${field} from ${prev[field]} to ${newData[field]}`);
      return newData;
    });

    if (field === "marketType") {
      filterSymbolsByType(formattedValue);
    }
  };

  const filterSymbolsByType = (type: string) => {
    console.log(`Filtering symbols by type: ${type}`);
    const filtered = availableSymbols.filter(
      (symbol) => symbol.type.toLowerCase() === type.toLowerCase(),
    );
    console.log(`Found ${filtered.length} symbols of type ${type}`);
    setFilteredSymbols(filtered);
  };

  const handleSymbolSearch = (searchTerm: string) => {
    console.log(`Symbol search term: ${searchTerm}`);
    setSymbolSearch(searchTerm);

    if (!searchTerm.trim()) {
      filterSymbolsByType(tradeData.marketType);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = availableSymbols.filter(
      (symbol) =>
        symbol.type.toLowerCase() === tradeData.marketType.toLowerCase() &&
        (symbol.symbol.toLowerCase().includes(searchLower) ||
          symbol.name.toLowerCase().includes(searchLower)),
    );
    console.log(`Filtered symbols by search: ${filtered.length}`);
    setFilteredSymbols(filtered);
  };

  useEffect(() => {
    filterSymbolsByType(tradeData.marketType);

    const handleSymbolsUpdated = (event: CustomEvent) => {
      console.log("Received symbolsUpdated event", event.detail);
      if (event.detail && event.detail.symbols) {
        setAvailableSymbols(event.detail.symbols);
        filterSymbolsByType(tradeData.marketType);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "tradingSymbols" && event.newValue) {
        console.log("tradingSymbols changed in localStorage");
        try {
          const updatedSymbols = JSON.parse(event.newValue);
          setAvailableSymbols(updatedSymbols);
          filterSymbolsByType(tradeData.marketType);
        } catch (error) {
          console.error(
            "Error parsing updated symbols from localStorage:",
            error,
          );
        }
      }
    };

    window.addEventListener(
      "symbolsUpdated",
      handleSymbolsUpdated as EventListener,
    );
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        "symbolsUpdated",
        handleSymbolsUpdated as EventListener,
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [availableSymbols, tradeData.marketType]);

  const handleMediaUpload = (files: MediaFile[]) => {
    setTradeData((prev) => ({
      ...prev,
      mediaFiles: files,
    }));
  };

  const calculateRiskRewardRatio = () => {
    const {
      entryPrice,
      initialStopLoss,
      takeProfit,
      symbol,
      positionSize,
      marketType,
      direction,
    } = tradeData;

    setRiskExceededMessage("");

    if (!entryPrice || !initialStopLoss || !symbol || !positionSize) {
      console.error("Missing required values for calculation");
      toast({
        title: "Missing Values",
        description:
          "Please enter entry price, stop loss, symbol, and position size",
        variant: "destructive",
      });
      return;
    }

    const entry = parseFloat(entryPrice);
    const stopLoss = parseFloat(initialStopLoss);
    const profit = takeProfit ? parseFloat(takeProfit) : null;
    const quantity = parseFloat(positionSize);

    if (isNaN(entry) || isNaN(stopLoss) || isNaN(quantity)) {
      console.error("Invalid numeric values for calculation");
      toast({
        title: "Invalid Values",
        description:
          "Please enter valid numbers for entry price, stop loss, and position size",
        variant: "destructive",
      });
      return;
    }
    if (profit !== null && isNaN(profit)) {
      console.error("Invalid take profit value");
      toast({
        title: "Invalid Take Profit",
        description: "Please enter a valid number for take profit",
        variant: "destructive",
      });
      return;
    }

    const selectedSymbol = availableSymbols.find((s) => s.symbol === symbol);
    if (!selectedSymbol) {
      console.error("Symbol not found");
      toast({
        title: "Symbol Not Found",
        description: "Please select a valid symbol",
        variant: "destructive",
      });
      return;
    }

    let riskAmount = 0;
    let rewardAmount = 0;
    let riskFormula = "";
    let rewardFormula = "";
    const priceDiffRisk = Math.abs(entry - stopLoss);
    const priceDiffReward = profit !== null ? Math.abs(profit - entry) : 0;

    const symbolLower = symbol.toLowerCase();
    const knownFutures = ["mes", "es", "nq", "mnq"];
    const isFutures =
      marketType.toLowerCase() === "futures" ||
      knownFutures.includes(symbolLower);

    if (isFutures) {
      let tickSize = 0.25; // Default
      let tickValue = 1.25; // Default for MES

      if (selectedSymbol.tick_size && selectedSymbol.tick_value) {
        tickSize = parseFloat(selectedSymbol.tick_size?.toString() || "0.25");
        tickValue = parseFloat(selectedSymbol.tick_value?.toString() || "1.25");
      } else if (symbolLower === "es") {
        tickValue = 12.5;
      } else if (symbolLower === "nq") {
        tickValue = 5.0;
      } else if (symbolLower === "mnq") {
        tickValue = 0.5;
      }

      if (tickSize <= 0) tickSize = 0.25; // Safety check

      const ticksAtRisk = priceDiffRisk / tickSize;
      const ticksReward = profit !== null ? priceDiffReward / tickSize : 0;

      riskAmount = ticksAtRisk * tickValue * quantity;
      rewardAmount = profit !== null ? ticksReward * tickValue * quantity : 0;

      riskFormula = `(|${entry} - ${stopLoss}| / ${tickSize}) × ${tickValue} = ${(ticksAtRisk * tickValue).toFixed(2)} per contract × ${quantity} = ${riskAmount.toFixed(2)}`;
      if (profit !== null) {
        rewardFormula = `(|${profit} - ${entry}| / ${tickSize}) × ${tickValue} = ${(ticksReward * tickValue).toFixed(2)} per contract × ${quantity} = ${rewardAmount.toFixed(2)}`;
      }
    } else {
      riskAmount = priceDiffRisk * quantity;
      rewardAmount = profit !== null ? priceDiffReward * quantity : 0;

      riskFormula = `|${entry} - ${stopLoss}| = ${priceDiffRisk.toFixed(2)} per share × ${quantity} = ${riskAmount.toFixed(2)}`;
      if (profit !== null) {
        rewardFormula = `|${profit} - ${entry}| = ${priceDiffReward.toFixed(2)} per share × ${quantity} = ${rewardAmount.toFixed(2)}`;
      }
    }

    const ratio =
      rewardAmount > 0 && riskAmount > 0
        ? (rewardAmount / riskAmount).toFixed(2)
        : "";

    if (riskAmount > maxRiskAmount) {
      const amountOver = (riskAmount - maxRiskAmount).toFixed(2);
      const percentOver = ((riskAmount / maxRiskAmount - 1) * 100).toFixed(1);
      setRiskExceededMessage(
        `Warning: Risk of ${riskAmount.toFixed(2)} exceeds your max risk of ${maxRiskAmount.toFixed(2)} by ${amountOver} (${percentOver}%)`,
      );
    }

    setTradeData((prev) => ({
      ...prev,
      riskRewardRatio: ratio,
      riskAmount: riskAmount.toFixed(2),
      rewardAmount: rewardAmount > 0 ? rewardAmount.toFixed(2) : "",
      riskFormula: riskFormula,
      rewardFormula: rewardAmount > 0 ? rewardFormula : "",
    }));

    toast({
      title: "Risk/Reward Calculated",
      description: `Risk: ${riskAmount.toFixed(2)}, Reward: ${rewardAmount > 0 ? rewardAmount.toFixed(2) : "N/A"}, Ratio: ${ratio || "N/A"}`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(
      "Form submitted",
      existingTradeId ? "(EDIT MODE)" : "(CREATE MODE)",
    );

    // Auto-calculate risk/reward if not already calculated
    if (
      tradeData.entryPrice &&
      tradeData.initialStopLoss &&
      tradeData.symbol &&
      tradeData.positionSize &&
      (!tradeData.riskRewardRatio || tradeData.riskRewardRatio === "")
    ) {
      console.log("Auto-calculating risk/reward before submission");
      calculateRiskRewardRatio();
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log("No user found, cannot create trade without user");
        toast({
          title: "Authentication Error",
          description: "You must be logged in to save trades",
          variant: "destructive",
        });
        return;
      }

      await ensureUserInDatabase(user);

      console.log(
        "Trade data to be submitted:",
        tradeData,
        "Existing trade ID:",
        existingTradeId,
      );

      const supabaseTradeData = {
        symbol: tradeData.symbol,
        trade_type: tradeData.marketType,
        entry_price: parseFloat(tradeData.entryPrice),
        exit_price: tradeData.exitPrice
          ? parseFloat(tradeData.exitPrice)
          : null,
        position_size: parseFloat(tradeData.positionSize),
        date: new Date(tradeData.date),
        time: tradeData.time,
        notes: tradeData.notes || "",
        account_name: tradeData.account || "",
        strategy_name: tradeData.strategy || "",
        market_type: tradeData.marketType,
        direction: tradeData.direction,
        max_risk_per_trade: tradeData.maxRiskPerTrade
          ? parseFloat(tradeData.maxRiskPerTrade)
          : null,
        initial_stop_loss: tradeData.initialStopLoss
          ? parseFloat(tradeData.initialStopLoss)
          : null,
        current_stop_loss: tradeData.currentStopLoss
          ? parseFloat(tradeData.currentStopLoss)
          : null,
        take_profit: tradeData.takeProfit
          ? parseFloat(tradeData.takeProfit)
          : null,
        risk_reward_ratio: tradeData.riskRewardRatio || null,
        risk_amount: tradeData.riskAmount
          ? parseFloat(tradeData.riskAmount)
          : null,
        reward_amount: tradeData.rewardAmount
          ? parseFloat(tradeData.rewardAmount)
          : null,
        risk_formula: tradeData.riskFormula || null,
        reward_formula: tradeData.rewardFormula || null,
        highest_price: tradeData.highestPrice
          ? parseFloat(tradeData.highestPrice)
          : null,
        lowest_price: tradeData.lowestPrice
          ? parseFloat(tradeData.lowestPrice)
          : null,
        timeframe: tradeData.timeframe || null,
        psp_time: tradeData.pspTime || null,
        ssmt_quarter: tradeData.ssmtQuarter || null,
        trade_grade: tradeData.tradeGrade || null,
        user_id: user?.id || "00000000-0000-0000-0000-000000000000",
      };

      console.log("Formatted data for Supabase:", supabaseTradeData);

      let result;
      let newTradeId = existingTradeId;

      if (existingTradeId) {
        console.log("Updating existing trade with ID:", existingTradeId);
        result = await supabase
          .from("trades")
          .update(supabaseTradeData)
          .eq("id", existingTradeId);
      } else {
        console.log("Creating new trade");
        result = await supabase
          .from("trades")
          .insert(supabaseTradeData)
          .select();

        if (result.data && result.data.length > 0) {
          newTradeId = result.data[0].id;
          console.log("New trade created with ID:", newTradeId);
        }
      }

      if (result.error) {
        console.log("Supabase error details:", result.error);
        throw result.error;
      }

      if (
        tradeData.mediaFiles &&
        tradeData.mediaFiles.length > 0 &&
        newTradeId
      ) {
        console.log(
          "Processing media files for trade:",
          newTradeId,
          tradeData.mediaFiles,
        );

        const mediaFilesToSave = [];

        for (const file of tradeData.mediaFiles || []) {
          if (!file) {
            console.warn("Skipping invalid media file (null or undefined)");
            continue;
          }

          console.log("Processing file:", {
            id: file.id,
            fileName: file.fileName,
            filePath: file.filePath,
            uploaded: file.uploaded,
            type: file.type,
          });

          if (
            file.filePath &&
            !file.filePath.includes("trades/temp/") &&
            existingTradeId
          ) {
            console.log(
              "File already properly saved, keeping reference:",
              file.fileName,
            );
            mediaFilesToSave.push({
              trade_id: newTradeId,
              file_path: file.filePath,
              file_name: file.fileName || `file-${Date.now()}`,
              file_type: file.type,
            });
            continue;
          }

          if (file.filePath && file.filePath.includes("trades/temp/")) {
            const fileName = file.fileName || `file-${Date.now()}`;
            const newPath = `trades/${newTradeId}/${fileName}`;
            try {
              const { data, error } = await supabase.storage
                .from("media")
                .move(file.filePath, newPath);

              if (error) {
                console.error("Error moving file from temp storage:", error);
              } else {
                file.filePath = newPath;
                const {
                  data: { publicUrl },
                } = supabase.storage.from("media").getPublicUrl(newPath);

                file.preview = publicUrl;
                console.log(
                  "File moved from temp to permanent storage:",
                  newPath,
                  publicUrl,
                );
              }
            } catch (error) {
              console.error("Unexpected error moving file:", error);
            }
          }

          if (file.filePath) {
            mediaFilesToSave.push({
              trade_id: newTradeId,
              file_path: file.filePath,
              file_name: file.fileName || `file-${Date.now()}`,
              file_type: file.type,
            });
          }
        }

        if (mediaFilesToSave.length > 0) {
          console.log("Saving media files to database:", mediaFilesToSave);

          if (existingTradeId) {
            const { error: deleteError } = await supabase
              .from("media_files")
              .delete()
              .eq("trade_id", existingTradeId);

            if (deleteError) {
              console.error(
                "Error deleting existing media files:",
                deleteError,
              );
            } else {
              console.log("Existing media files deleted successfully");
            }
          }

          const { error: mediaError } = await supabase
            .from("media_files")
            .insert(mediaFilesToSave);

          if (mediaError) {
            console.error("Error saving media files to database:", mediaError);
          } else {
            console.log(
              "Media files saved successfully:",
              mediaFilesToSave.length,
            );
          }
        }
      }

      console.log("Trade saved successfully", result.data);

      toast({
        title: existingTradeId ? "Trade Updated" : "Trade Added",
        description: existingTradeId
          ? "Your trade has been updated successfully"
          : "Your trade has been added to your journal",
      });

      onSubmit(tradeData);

      if (existingTradeId && onTradeUpdate) {
        onTradeUpdate();
      }

      handleOpenChange(false);

      if (!existingTradeId) {
        setTradeData(defaultTradeData);
      }
    } catch (error) {
      console.error("Error saving trade:", error);
      toast({
        title: "Error",
        description: "There was an error saving your trade",
        variant: "destructive",
      });
    }
  };

  const handleClosureSuccess = () => {
    setClosureDialogOpen(false);
    setTradeData((prev) => ({
      ...prev,
      remainingSize: prev.remainingSize ? prev.remainingSize * 0.5 : 0,
      status:
        prev.remainingSize && prev.remainingSize * 0.5 > 0
          ? "partial"
          : "closed",
    }));
    if (onTradeUpdate) {
      onTradeUpdate();
    }
  };

  const handleSetupSelect = (setupIds: string[]) => {
    console.log("Selected setup IDs:", setupIds);
    setTradeData((prev) => ({
      ...prev,
      setupIds: setupIds,
    }));
  };

  const isEditMode = !!existingTradeId;
  const dialogTitle = isEditMode ? "Edit Trade" : "Add New Trade";

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {!isEditMode && (
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 right-6 rounded-full h-14 w-14 p-0 shadow-lg">
            <PlusCircle className="h-6 w-6" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[800px] bg-background max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{dialogTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="details"
                onClick={() => setActiveTab("details")}
              >
                Trade Details
              </TabsTrigger>
              <TabsTrigger value="notes" onClick={() => setActiveTab("notes")}>
                Notes & Images
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-4">
              <div className="space-y-6">
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Trade Details</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Trade Type</Label>
                      <div className="flex flex-wrap gap-2">
                        {["Stock", "Futures", "Forex", "Crypto", "Options"].map(
                          (type) => (
                            <Button
                              key={type}
                              type="button"
                              variant={
                                tradeData.marketType.toLowerCase() ===
                                type.toLowerCase()
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleChange("marketType", type.toLowerCase())
                              }
                              className="flex-1 min-w-[80px]"
                            >
                              {type}
                            </Button>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="symbol">Symbol</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => {
                            handleOpenChange(false);
                            navigate("/symbol-management");
                          }}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Manage Symbols
                        </Button>
                      </div>

                      <div className="relative mb-2">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search symbols..."
                          value={symbolSearch}
                          onChange={(e) => handleSymbolSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>

                      <Select
                        value={tradeData.symbol || ""}
                        onValueChange={(value) => handleChange("symbol", value)}
                      >
                        <SelectTrigger id="symbol">
                          <SelectValue placeholder="Select symbol..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSymbols.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              No symbols available for this type
                            </div>
                          ) : (
                            filteredSymbols.map((symbol) => (
                              <SelectItem key={symbol.id} value={symbol.symbol}>
                                {symbol.symbol} - {symbol.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Direction</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={
                            tradeData.direction === "long"
                              ? "default"
                              : "outline"
                          }
                          onClick={() => handleChange("direction", "long")}
                          className="w-full"
                        >
                          Long
                        </Button>
                        <Button
                          type="button"
                          variant={
                            tradeData.direction === "short"
                              ? "default"
                              : "outline"
                          }
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
                          const dateTimeValue = e.target.value;
                          console.log(
                            "Selected datetime value:",
                            dateTimeValue,
                          );

                          const dateTime = new Date(dateTimeValue);
                          console.log("Parsed datetime object:", dateTime);

                          const year = dateTime.getFullYear();
                          const month = String(
                            dateTime.getMonth() + 1,
                          ).padStart(2, "0");
                          const day = String(dateTime.getDate()).padStart(
                            2,
                            "0",
                          );
                          const date = `${year}-${month}-${day}`;

                          const hours = String(dateTime.getHours()).padStart(
                            2,
                            "0",
                          );
                          const minutes = String(
                            dateTime.getMinutes(),
                          ).padStart(2, "0");
                          const time = `${hours}:${minutes}`;

                          console.log("Formatted date:", date, "time:", time);

                          handleChange("date", date);
                          handleChange("time", time);
                        }}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="entryPrice">Entry Price</Label>
                        <Input
                          id="entryPrice"
                          type="text"
                          inputMode="decimal"
                          placeholder="Entry price"
                          className={
                            !tradeData.entryPrice ? "border-red-500" : ""
                          }
                          value={tradeData.entryPrice}
                          onChange={(e) =>
                            handleChange("entryPrice", e.target.value)
                          }
                          step="any"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="positionSize">Quantity</Label>
                        <div className="relative mb-2">
                          <Input
                            id="positionSize"
                            type="text"
                            inputMode="decimal"
                            placeholder="1"
                            value={tradeData.positionSize}
                            onChange={(e) =>
                              handleChange("positionSize", e.target.value)
                            }
                            step="any"
                            required
                            disabled={
                              isEditMode &&
                              (tradeData.status === "partial" ||
                                tradeData.status === "closed")
                            }
                            className={`${!tradeData.positionSize ? "border-red-500" : ""} ${
                              isEditMode &&
                              (tradeData.status === "partial" ||
                                tradeData.status === "closed")
                                ? "opacity-70 cursor-not-allowed"
                                : ""
                            }`}
                          />
                          {isEditMode &&
                            (tradeData.status === "partial" ||
                              tradeData.status === "closed") && (
                              <div className="absolute right-2 top-2">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-muted-foreground"
                                >
                                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                                  <path d="m9 12 2 2 4-4"></path>
                                </svg>
                              </div>
                            )}
                        </div>
                        {isEditMode &&
                          (tradeData.status === "partial" ||
                            tradeData.status === "closed") && (
                            <p className="text-xs text-muted-foreground">
                              Quantity cannot be modified for trades with
                              closures
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Risk & Reward</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxRiskPerTrade">
                        Max Risk Per Trade
                      </Label>
                      <div className="flex items-center bg-muted p-2 rounded-md border border-border">
                        <span className="text-muted-foreground mr-2">
                          Global Setting:
                        </span>
                        <span className="font-medium">
                          $
                          {maxRiskAmount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-8 px-2 text-xs"
                          onClick={() => {
                            handleOpenChange(false);
                            navigate("/risk-settings");
                          }}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="initialStopLoss">
                          Initial Stop Loss{" "}
                          <span className="text-orange-500 text-xs">
                            (recommended for R calculation)
                          </span>
                        </Label>
                        <Input
                          id="initialStopLoss"
                          type="text"
                          inputMode="decimal"
                          placeholder="Stop loss price"
                          value={tradeData.initialStopLoss}
                          onChange={(e) =>
                            handleChange("initialStopLoss", e.target.value)
                          }
                          step="any"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="takeProfit">Take Profit</Label>
                        <Input
                          id="takeProfit"
                          type="text"
                          inputMode="decimal"
                          placeholder="Take profit price"
                          value={tradeData.takeProfit}
                          onChange={(e) =>
                            handleChange("takeProfit", e.target.value)
                          }
                          step="any"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currentStopLoss">Current Stop Loss</Label>
                      <Input
                        id="currentStopLoss"
                        type="text"
                        inputMode="decimal"
                        placeholder="Current stop loss price"
                        value={tradeData.currentStopLoss}
                        onChange={(e) =>
                          handleChange("currentStopLoss", e.target.value)
                        }
                        step="any"
                      />
                    </div>

                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={calculateRiskRewardRatio}
                      >
                        Calculate Risk/Reward
                      </Button>
                    </div>

                    <div className="bg-muted p-3 rounded-md border border-border mt-2">
                      <h4 className="font-medium text-sm mb-2">
                        Risk/Reward Analysis
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">R:R Ratio</p>
                          <p className="font-medium">
                            {tradeData.riskRewardRatio || "--"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Risk ($)</p>
                          <p className="font-medium">
                            {tradeData.riskAmount || "--"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reward ($)</p>
                          <p className="font-medium">
                            {tradeData.rewardAmount || "--"}
                          </p>
                        </div>
                      </div>
                      {riskExceededMessage && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-xs text-red-500 font-medium">
                            {riskExceededMessage}
                          </p>
                        </div>
                      )}
                      {tradeData.riskFormula && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">
                            Risk Formula:
                          </p>
                          <p className="text-xs font-mono">
                            {tradeData.riskFormula}
                          </p>
                          {tradeData.rewardFormula && (
                            <>
                              <p className="text-xs text-muted-foreground mt-1 mb-1">
                                Reward Formula:
                              </p>
                              <p className="text-xs font-mono">
                                {tradeData.rewardFormula}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Price Tracking</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="highestPrice">Highest Price</Label>
                        <Input
                          id="highestPrice"
                          type="text"
                          inputMode="decimal"
                          placeholder="Highest price"
                          value={tradeData.highestPrice}
                          onChange={(e) =>
                            handleChange("highestPrice", e.target.value)
                          }
                          step="any"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lowestPrice">Lowest Price</Label>
                        <Input
                          id="lowestPrice"
                          type="text"
                          inputMode="decimal"
                          placeholder="Lowest price"
                          value={tradeData.lowestPrice}
                          onChange={(e) =>
                            handleChange("lowestPrice", e.target.value)
                          }
                          step="any"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Analysis</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="account">Account</Label>
                        <Select
                          value={tradeData.account || ""}
                          onValueChange={(value) =>
                            handleChange("account", value)
                          }
                        >
                          <SelectTrigger id="account">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.length > 0 ? (
                              accounts.map((account) => (
                                <SelectItem
                                  key={account.id}
                                  value={account.name}
                                >
                                  {account.name}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="personal">
                                  Personal
                                </SelectItem>
                                <SelectItem value="ira">IRA</SelectItem>
                                <SelectItem value="trading">Trading</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="strategy">Strategy</Label>
                        <Select
                          value={tradeData.strategy || ""}
                          onValueChange={(value) =>
                            handleChange("strategy", value)
                          }
                        >
                          <SelectTrigger id="strategy">
                            <SelectValue placeholder="Select strategy" />
                          </SelectTrigger>
                          <SelectContent>
                            {strategies.length > 0 ? (
                              strategies.map((strategy) => (
                                <SelectItem
                                  key={strategy.id}
                                  value={strategy.name}
                                >
                                  {strategy.name}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="momentum">
                                  Momentum
                                </SelectItem>
                                <SelectItem value="breakout">
                                  Breakout
                                </SelectItem>
                                <SelectItem value="reversal">
                                  Reversal
                                </SelectItem>
                                <SelectItem value="trend">
                                  Trend Following
                                </SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="timeframe">Timeframe</Label>
                        <Select
                          value={tradeData.timeframe || ""}
                          onValueChange={(value) =>
                            handleChange("timeframe", value)
                          }
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
                        <Label htmlFor="tradeGrade">Trade Grade</Label>
                        <div className="flex gap-1">
                          {["A", "B", "C", "D", "F"].map((grade) => (
                            <Button
                              key={grade}
                              type="button"
                              variant={
                                tradeData.tradeGrade === grade
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => handleChange("tradeGrade", grade)}
                              className="flex-1 min-w-[30px] h-8"
                            >
                              {grade}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pspTime">PSP Time</Label>
                        <Input
                          id="pspTime"
                          type="time"
                          placeholder="Enter PSP time"
                          value={tradeData.pspTime}
                          onChange={(e) =>
                            handleChange("pspTime", e.target.value)
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Price Structure Pivot time
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ssmtQuarter">SSMT Quarter</Label>
                        <Select
                          value={tradeData.ssmtQuarter || ""}
                          onValueChange={(value) =>
                            handleChange("ssmtQuarter", value)
                          }
                        >
                          <SelectTrigger id="ssmtQuarter">
                            <SelectValue placeholder="Select quarter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Q1">Q1</SelectItem>
                            <SelectItem value="Q2">Q2</SelectItem>
                            <SelectItem value="Q3">Q3</SelectItem>
                            <SelectItem value="Q4">Q4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Notes & Images</h3>
                <NotesTab
                  notes={tradeData.notes || ""}
                  mediaFiles={tradeData.mediaFiles}
                  tradeId={existingTradeId}
                  handleChange={handleChange}
                  handleMediaUpload={handleMediaUpload}
                  selectedSetupIds={tradeData.setupIds || []}
                  onSetupSelect={handleSetupSelect}
                />
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            {isEditMode &&
              tradeData.status !== "closed" &&
              tradeData.remainingSize > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setClosureDialogOpen(true)}
                  className="mr-2"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Close Position
                </Button>
              )}
            <Button type="submit">Save Trade</Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {isEditMode && (
        <TradeClosureForm
          tradeId={existingTradeId}
          open={closureDialogOpen}
          onOpenChange={setClosureDialogOpen}
          onSuccess={handleClosureSuccess}
          remainingSize={tradeData.remainingSize || 0}
          symbol={tradeData.symbol}
        />
      )}
    </Dialog>
  );
};

export default QuickAddTradeForm;
