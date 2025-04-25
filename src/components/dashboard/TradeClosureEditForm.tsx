import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

interface TradeClosureEditFormProps {
  closureId: string;
  tradeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentData: {
    close_date: string;
    close_time: string;
    close_price: number;
    closed_position_size: number;
    notes: string;
  };
}

interface EditData {
  close_date: string;
  close_time: string;
  close_price: string;
  closed_position_size: string;
  notes: string;
  reason: string;
}

const TradeClosureEditForm: React.FC<TradeClosureEditFormProps> = ({
  closureId,
  tradeId,
  open,
  onOpenChange,
  onSuccess,
  currentData,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with current data
  const [editData, setEditData] = useState<EditData>({
    close_date: currentData.close_date,
    close_time: currentData.close_time,
    close_price: currentData.close_price.toString(),
    closed_position_size: currentData.closed_position_size.toString(),
    notes: currentData.notes || "",
    reason: "",
  });

  const handleChange = (field: keyof EditData, value: string) => {
    // Ensure numeric values are properly formatted
    let formattedValue = value;
    if (field === "close_price" || field === "closed_position_size") {
      // Remove any non-numeric characters except decimal point
      formattedValue = value.replace(/[^0-9.]/g, "");

      // Ensure only one decimal point
      const parts = formattedValue.split(".");
      if (parts.length > 2) {
        formattedValue = parts[0] + "." + parts.slice(1).join("");
      }
    }

    setEditData((prev) => ({
      ...prev,
      [field]: formattedValue,
    }));
  };

  const validateForm = (): boolean => {
    if (!editData.close_price) {
      setError("Close price is required");
      return false;
    }

    if (!editData.closed_position_size) {
      setError("Closed position size is required");
      return false;
    }

    if (!editData.reason) {
      setError("Please provide a reason for this edit");
      return false;
    }

    const closedSize = parseFloat(editData.closed_position_size);
    if (isNaN(closedSize) || closedSize <= 0) {
      setError("Closed position size must be a positive number");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // First, update the trade closure record
      const { error: updateError } = await supabase
        .from("trade_closures")
        .update({
          close_date: editData.close_date,
          close_time: editData.close_time,
          close_price: parseFloat(editData.close_price),
          closed_position_size: parseFloat(editData.closed_position_size),
          notes: editData.notes,
        })
        .eq("id", closureId);

      if (updateError) throw updateError;

      // Ensure the trade_closure_edits table exists before trying to insert
      try {
        // Import the function to ensure the table exists
        const { ensureTradeClosureEditsTable } = await import("@/lib/supabase");
        await ensureTradeClosureEditsTable();

        // Now try to insert the record
        const { error: editError } = await supabase
          .from("trade_closure_edits")
          .insert({
            closure_id: closureId,
            trade_id: tradeId,
            previous_close_price: currentData.close_price,
            previous_closed_position_size: currentData.closed_position_size,
            new_close_price: parseFloat(editData.close_price),
            new_closed_position_size: parseFloat(editData.closed_position_size),
            edit_reason: editData.reason,
          });

        if (editError) {
          console.warn("Could not insert into trade_closure_edits:", editError);
          // Continue execution even if this fails
        } else {
          console.log("Successfully recorded edit in trade_closure_edits");
        }
      } catch (editInsertError) {
        console.warn(
          "Error inserting into trade_closure_edits:",
          editInsertError,
        );
        // Continue execution even if this fails
      }

      // Fetch all closures for this trade to recalculate the total closed size
      const { data: closures, error: closuresError } = await supabase
        .from("trade_closures")
        .select("closed_position_size")
        .eq("trade_id", tradeId);

      if (closuresError) throw closuresError;

      // Calculate total closed size
      const totalClosedSize = closures.reduce(
        (sum, closure) => sum + (parseFloat(closure.closed_position_size) || 0),
        0,
      );

      // Fetch the trade to get the position size
      const { data: trade, error: tradeError } = await supabase
        .from("trades")
        .select("position_size")
        .eq("id", tradeId)
        .single();

      if (tradeError) throw tradeError;

      // Calculate remaining size
      const remainingSize = Math.max(0, trade.position_size - totalClosedSize);

      // Determine the new status based on remaining size
      let newStatus;
      if (remainingSize === 0) {
        newStatus = "closed"; // Fully closed
      } else if (remainingSize < trade.position_size) {
        newStatus = "partial"; // Partially closed
      } else {
        newStatus = "open"; // No closures or all closures were deleted
      }

      // Update the trade with the new remaining size and status
      const { error: updateTradeError } = await supabase
        .from("trades")
        .update({
          remaining_size: remainingSize,
          status: newStatus,
        })
        .eq("id", tradeId);

      if (updateTradeError) throw updateTradeError;

      // Success - close the dialog and notify parent
      onOpenChange(false);
      if (onSuccess) onSuccess();

      toast({
        title: "Closure Updated",
        description: "The trade closure has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating trade closure:", error);
      setError(error.message || "Failed to update trade closure");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent
        className="sm:max-w-[500px] bg-background"
        aria-describedby="edit-closure-description"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Edit Trade Closure
          </DialogTitle>
          <DialogDescription id="edit-closure-description">
            Update the details of this trade closure.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="close_date">Close Date</Label>
            <Input
              id="close_date"
              type="datetime-local"
              value={`${editData.close_date}T${editData.close_time}`}
              onChange={(e) => {
                const dateTime = new Date(e.target.value);
                const date = dateTime.toISOString().split("T")[0];
                const time = dateTime.toTimeString().split(" ")[0].slice(0, 5);
                handleChange("close_date", date);
                handleChange("close_time", time);
              }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="close_price">Close Price</Label>
              <Input
                id="close_price"
                type="text"
                inputMode="decimal"
                placeholder="Close price"
                value={editData.close_price}
                onChange={(e) => handleChange("close_price", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closed_position_size">Position Size Closed</Label>
              <Input
                id="closed_position_size"
                type="text"
                inputMode="decimal"
                placeholder="Position size closed"
                value={editData.closed_position_size}
                onChange={(e) =>
                  handleChange("closed_position_size", e.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this closure"
              value={editData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="font-medium text-red-600">
              Reason for Edit *
            </Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you're editing this closure"
              value={editData.reason}
              onChange={(e) => handleChange("reason", e.target.value)}
              className="min-h-[80px] border-red-200"
              required
            />
            <p className="text-xs text-muted-foreground">
              This information will be stored for audit purposes
            </p>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TradeClosureEditForm;
