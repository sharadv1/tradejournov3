import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import TradeClosureEditForm from "./TradeClosureEditForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TradeClosuresListProps {
  tradeId: string;
  onClosureUpdate?: () => void;
}

interface TradeClosure {
  id: string;
  close_date: string;
  close_time: string;
  close_price: number;
  closed_position_size: number;
  notes: string | null;
  created_at: string;
  r_multiple: number | null;
}

const TradeClosuresList: React.FC<TradeClosuresListProps> = ({
  tradeId,
  onClosureUpdate,
}) => {
  const [closures, setClosures] = useState<TradeClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClosure, setEditingClosure] = useState<TradeClosure | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [closureToDelete, setClosureToDelete] = useState<string | null>(null);

  const fetchClosures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trade_closures")
        .select("*")
        .eq("trade_id", tradeId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setClosures(data || []);
    } catch (error) {
      console.error("Error fetching trade closures:", error);
      toast({
        title: "Error",
        description: "Failed to load trade closures",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tradeId) {
      fetchClosures();
    }
  }, [tradeId]);

  const handleEditClosure = (closure: TradeClosure) => {
    setEditingClosure(closure);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClosure = async () => {
    if (!closureToDelete) return;

    try {
      // First, get the closure details before deleting it
      const { data: closureData, error: fetchError } = await supabase
        .from("trade_closures")
        .select("*")
        .eq("id", closureToDelete)
        .single();

      if (fetchError) throw fetchError;

      // Delete the closure
      const { error } = await supabase
        .from("trade_closures")
        .delete()
        .eq("id", closureToDelete);

      if (error) throw error;

      // Fetch all remaining closures for this trade
      const { data: remainingClosures, error: closuresError } = await supabase
        .from("trade_closures")
        .select("closed_position_size")
        .eq("trade_id", tradeId);

      if (closuresError) throw closuresError;

      // Calculate total closed size from remaining closures
      const totalClosedSize = remainingClosures.reduce(
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

      toast({
        title: "Closure Deleted",
        description: "The trade closure has been deleted successfully",
      });

      // Refresh the closures list
      fetchClosures();

      // Notify parent component if needed
      if (onClosureUpdate) onClosureUpdate();
    } catch (error) {
      console.error("Error deleting trade closure:", error);
      toast({
        title: "Error",
        description: "Failed to delete trade closure",
        variant: "destructive",
      });
    } finally {
      setClosureToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleClosureUpdated = () => {
    fetchClosures();
    if (onClosureUpdate) onClosureUpdate();
  };

  const formatDate = (dateStr: string, timeStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleDateString()} ${timeStr}`;
  };

  if (loading && closures.length === 0) {
    return <div className="text-center py-4">Loading closures...</div>;
  }

  if (closures.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No partial closures found for this trade.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Closure History</h3>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Close Price</TableHead>
              <TableHead>Size Closed</TableHead>
              <TableHead>R Multiple</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closures.map((closure) => (
              <TableRow key={closure.id}>
                <TableCell>
                  {formatDate(closure.close_date, closure.close_time)}
                </TableCell>
                <TableCell>
                  $
                  {typeof closure.close_price === "number"
                    ? closure.close_price.toFixed(2)
                    : "0.00"}
                </TableCell>
                <TableCell>{closure.closed_position_size}</TableCell>
                <TableCell>
                  {closure.r_multiple !== null &&
                  closure.r_multiple !== undefined ? (
                    <span
                      className={
                        closure.r_multiple >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {closure.r_multiple > 0 ? "+" : ""}
                      {typeof closure.r_multiple === "number"
                        ? closure.r_multiple.toFixed(2)
                        : "0.00"}
                      R
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {closure.notes || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClosure(closure)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setClosureToDelete(closure.id);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Closure Dialog */}
      {editingClosure && (
        <TradeClosureEditForm
          closureId={editingClosure.id}
          tradeId={tradeId}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={handleClosureUpdated}
          currentData={{
            close_date: editingClosure.close_date,
            close_time: editingClosure.close_time,
            close_price: editingClosure.close_price,
            closed_position_size: editingClosure.closed_position_size,
            notes: editingClosure.notes || "",
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade Closure</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trade closure? This action
              cannot be undone and will affect the trade's remaining position
              size and status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClosure}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TradeClosuresList;
