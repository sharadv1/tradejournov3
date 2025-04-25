import React, { useEffect, useState } from "react";
import QuickAddTradeForm from "./QuickAddTradeForm";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

interface EditTradeHandlerProps {
  onTradeUpdate?: () => void;
}

interface TradeEventDetail {
  tradeId: string;
  tradeData: Record<string, any>;
}

interface MediaFileData {
  id: string;
  preview: string;
  type: "image" | "video";
  filePath: string;
  fileName: string;
  uploaded: boolean;
}

const EditTradeHandler: React.FC<EditTradeHandlerProps> = ({
  onTradeUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tradeId, setTradeId] = useState("");
  const [tradeData, setTradeData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch complete trade data including media files
  const fetchCompleteTradeData = async (
    tradeId: string,
    initialData: Record<string, any>,
  ) => {
    setIsLoading(true);
    try {
      console.log(`Fetching complete trade data for trade ID: ${tradeId}`);

      // Fetch trade data and media files in parallel
      const [tradeResult, mediaResult] = await Promise.all([
        supabase.from("trades").select("*").eq("id", tradeId).single(),
        supabase.from("media_files").select("*").eq("trade_id", tradeId),
      ]);

      if (tradeResult.error) {
        console.error("Error fetching trade data:", tradeResult.error);
        toast({
          title: "Error",
          description: `Failed to fetch trade data: ${tradeResult.error.message}`,
          variant: "destructive",
        });
        return initialData;
      }

      const data = tradeResult.data;
      const mediaFiles = mediaResult.data || [];

      console.log(
        "Complete trade data from DB:",
        data,
        "Media files:",
        mediaFiles,
      );

      // Process media files to convert them to the format expected by the form
      const processedMediaFiles = mediaFiles
        .map((file) => {
          if (!file.file_path) {
            console.error("Media file missing file_path:", file);
            return null;
          }

          // Get public URL for the file
          const {
            data: { publicUrl },
          } = supabase.storage.from("media").getPublicUrl(file.file_path);

          console.log(
            `Generated public URL for file ${file.file_name || "unnamed"}:`,
            publicUrl,
          );

          return {
            id: file.id,
            preview: publicUrl,
            type:
              file.file_type ||
              (file.file_path.match(/\.(jpg|jpeg|png|gif)$/i)
                ? "image"
                : "video"),
            filePath: file.file_path,
            fileName: file.file_name,
            uploaded: true,
          };
        })
        .filter(Boolean); // Filter out any null entries

      console.log("Processed media files:", processedMediaFiles);

      // Create a complete trade data object with all fields from database
      const completeTradeData = {
        ...initialData,
        symbol: data.symbol,
        tradeType: data.direction === "long" ? "buy" : "sell",
        direction:
          data.direction ||
          (initialData.tradeType === "buy" ? "long" : "short"),
        entryPrice:
          data.entry_price?.toString() ||
          initialData.entryPrice?.toString() ||
          "",
        exitPrice:
          data.exit_price?.toString() ||
          initialData.exitPrice?.toString() ||
          "",
        positionSize:
          data.position_size?.toString() ||
          initialData.positionSize?.toString() ||
          "",
        date: data.date
          ? new Date(data.date).toISOString().split("T")[0]
          : initialData.date || "",
        time: data.time || initialData.time || "09:30",
        notes: data.notes || initialData.notes || "",
        status: data.status || initialData.status || "open",
        remainingSize: data.remaining_size || initialData.remainingSize || 0,
        marketType: data.market_type || initialData.marketType || "stock",
        maxRiskPerTrade:
          data.max_risk_per_trade?.toString() ||
          initialData.maxRiskPerTrade?.toString() ||
          "",
        initialStopLoss:
          data.initial_stop_loss?.toString() ||
          initialData.initialStopLoss?.toString() ||
          "",
        currentStopLoss:
          data.current_stop_loss?.toString() ||
          initialData.currentStopLoss?.toString() ||
          "",
        takeProfit:
          data.take_profit?.toString() ||
          initialData.takeProfit?.toString() ||
          "",
        timeframe: data.timeframe || initialData.timeframe || "1h",
        tradeGrade: data.trade_grade || initialData.tradeGrade || "B",
        highestPrice:
          data.highest_price?.toString() ||
          initialData.highestPrice?.toString() ||
          "",
        lowestPrice:
          data.lowest_price?.toString() ||
          initialData.lowestPrice?.toString() ||
          "",
        pspTime: data.psp_time || initialData.pspTime || "",
        ssmtQuarter: data.ssmt_quarter || initialData.ssmtQuarter || "Q1",
        riskRewardRatio:
          data.risk_reward_ratio || initialData.riskRewardRatio || "",
        riskAmount:
          data.risk_amount?.toString() ||
          initialData.riskAmount?.toString() ||
          "",
        rewardAmount:
          data.reward_amount?.toString() ||
          initialData.rewardAmount?.toString() ||
          "",
        riskFormula: data.risk_formula || initialData.riskFormula || "",
        rewardFormula: data.reward_formula || initialData.rewardFormula || "",
        account:
          data.account_name || data.account_id || initialData.account || "",
        strategy:
          data.strategy_name || data.strategy_id || initialData.strategy || "",
        // Add the media files to the edit data
        mediaFiles: processedMediaFiles,
      };

      return completeTradeData;
    } catch (error) {
      console.error("Error fetching complete trade data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch complete trade data",
        variant: "destructive",
      });
      return initialData;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle click event directly instead of custom event
  const handleClick = async () => {
    const handlerElement = document.getElementById("edit-trade-handler");
    if (handlerElement && handlerElement.dataset) {
      const tradeId = handlerElement.dataset.tradeId;
      const tradeDataStr = handlerElement.dataset.tradeData;

      if (tradeId && tradeDataStr) {
        try {
          const initialTradeData = JSON.parse(tradeDataStr);
          console.log(
            "Edit trade details from click handler:",
            tradeId,
            initialTradeData,
          );

          // Convert string values to the expected format for the form
          const formattedTradeData = {
            ...initialTradeData,
            // Ensure these fields are properly formatted
            entryPrice: initialTradeData.entryPrice || "",
            exitPrice: initialTradeData.exitPrice || "",
            positionSize: initialTradeData.positionSize || "",
            // Ensure marketType is set correctly - use trade_type as fallback
            marketType:
              initialTradeData.marketType ||
              (initialTradeData.tradeType &&
              typeof initialTradeData.tradeType === "string"
                ? initialTradeData.tradeType.toLowerCase()
                : "stock"),
            direction: initialTradeData.direction || "long",
            highestPrice: initialTradeData.highestPrice || "",
            lowestPrice: initialTradeData.lowestPrice || "",
            account: initialTradeData.account || "",
            strategy: initialTradeData.strategy || "",
            timeframe: initialTradeData.timeframe || "1h",
            tradeGrade: initialTradeData.tradeGrade || "B",
            pspTime: initialTradeData.pspTime || "",
            ssmtQuarter: initialTradeData.ssmtQuarter || "Q1",
            initialStopLoss: initialTradeData.initialStopLoss || "",
            currentStopLoss: initialTradeData.currentStopLoss || "",
            takeProfit: initialTradeData.takeProfit || "",
            // Initialize with empty media files array
            mediaFiles: initialTradeData.mediaFiles || [],
          };

          console.log(
            "Formatted initial trade data for form:",
            formattedTradeData,
          );

          // Set the trade ID immediately to open the form
          setTradeId(tradeId);
          setTradeData(formattedTradeData);
          setIsOpen(true);

          // Fetch complete data including media files
          const completeData = await fetchCompleteTradeData(
            tradeId,
            formattedTradeData,
          );
          console.log("Complete trade data with media files:", completeData);

          // Update the form with complete data including media files
          setTradeData(completeData);
        } catch (error) {
          console.error("Error parsing trade data:", error);
          toast({
            title: "Error",
            description: "Failed to parse trade data",
            variant: "destructive",
          });
        }
      } else {
        console.error("Missing tradeId or tradeData in dataset");
        toast({
          title: "Error",
          description: "Missing trade ID or trade data",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    // Get the handler element
    const handlerElement = document.getElementById("edit-trade-handler");

    if (handlerElement) {
      // Add click event listener
      handlerElement.addEventListener("click", handleClick);
      console.log("EditTradeHandler: Click event listener added");

      // Clean up
      return () => {
        handlerElement.removeEventListener("click", handleClick);
        console.log("EditTradeHandler: Click event listener removed");
      };
    } else {
      console.error("Edit trade handler element not found in useEffect");
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTradeId("");
    setTradeData({});
  };

  const handleTradeUpdate = () => {
    if (onTradeUpdate) {
      onTradeUpdate();
    }
    handleClose();
  };

  return (
    <>
      {/* Hidden element to handle edit trade events */}
      <div
        id="edit-trade-handler"
        style={{ display: "none" }}
        data-trade-id=""
        data-trade-data=""
      ></div>

      <QuickAddTradeForm
        open={isOpen}
        onOpenChange={setIsOpen}
        isOpen={isOpen}
        onClose={handleClose}
        existingTradeId={tradeId}
        existingTradeData={tradeData}
        onTradeUpdate={handleTradeUpdate}
      />
    </>
  );
};

export default EditTradeHandler;
