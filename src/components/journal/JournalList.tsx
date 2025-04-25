import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import JournalEntryForm from "./JournalEntryForm";

interface JournalEntry {
  id: string;
  entry_type: "daily" | "weekly" | "monthly";
  start_date: string;
  end_date: string;
  plan: string;
  review: string;
  created_at: string;
  updated_at: string;
  has_subentries?: boolean;
}

interface JournalListProps {
  selectedEntry: JournalEntry | null;
  setSelectedEntry: (entry: JournalEntry | null) => void;
  setIsCreateDialogOpen: (isOpen: boolean) => void;
  setIsEditDialogOpen: (isOpen: boolean) => void;
  setEntryToEdit: (id: string | null) => void;
  onRefreshEntries?: () => void;
}

const JournalList = ({
  selectedEntry,
  setSelectedEntry,
  setIsCreateDialogOpen,
  setIsEditDialogOpen,
  setEntryToEdit,
  onRefreshEntries,
}: JournalListProps) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Fetch journal entries (weekly only)
  const fetchEntries = async () => {
    // Call the onRefreshEntries callback if provided
    if (typeof onRefreshEntries === "function") {
      onRefreshEntries();
    }
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("entry_type", "weekly")
        .order("start_date", { ascending: false });

      if (error) throw error;

      if (data) {
        // Use the exact dates from the database without any manipulation
        setEntries(data as JournalEntry[]);

        // Select the first entry if none is selected
        if (!selectedEntry && data.length > 0) {
          setSelectedEntry(data[0] as JournalEntry);
        }
      }
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      toast({
        title: "Error",
        description: "Failed to load journal entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load entries on component mount
  useEffect(() => {
    fetchEntries();
  }, []);

  // Filter entries based on search query only
  const filteredEntries = entries.filter((entry) => {
    // Filter by search query
    if (searchQuery && searchQuery.trim() !== "") {
      const searchLower = searchQuery.toLowerCase().trim();
      const startDate = format(new Date(entry.start_date), "MMM d");
      const endDate = format(new Date(entry.end_date), "MMM d, yyyy");
      const dateRange = `${startDate} to ${endDate}`;
      const month = format(
        new Date(entry.start_date),
        "MMMM yyyy",
      ).toLowerCase();

      // Search in plan, review, date range, and month
      return (
        (entry.plan?.toLowerCase() || "").includes(searchLower) ||
        (entry.review?.toLowerCase() || "").includes(searchLower) ||
        dateRange.toLowerCase().includes(searchLower) ||
        month.includes(searchLower)
      );
    }

    return true;
  });

  // Handle entry deletion
  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", entryToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Journal entry deleted",
      });

      // If the deleted entry is the selected one, clear the selection
      if (selectedEntry && selectedEntry.id === entryToDelete) {
        setSelectedEntry(null);
      }

      // Refresh entries
      fetchEntries();
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      toast({
        title: "Error",
        description: "Failed to delete journal entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  return (
    <Card className="w-full h-full bg-background">
      <CardHeader className="pb-2">
        <div className="flex flex-col justify-between items-start gap-4">
          <div className="flex items-center gap-2 w-full justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Journal Entries</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchEntries}
                disabled={loading}
                title="Refresh entries"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Entry
            </Button>
          </div>
          <div className="w-full">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-4">Loading journal entries...</p>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? `No entries match your search criteria: "${searchQuery}"`
                : "No journal entries found"}
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Your First Entry
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredEntries.map((entry) => {
              // Format dates for display - ensure timezone doesn't affect display
              const startDateObj = new Date(entry.start_date + "T00:00:00");
              const endDateObj = new Date(entry.end_date + "T00:00:00");

              const startDate = format(startDateObj, "MMM d");
              const endDate = format(endDateObj, "MMM d, yyyy");

              // Use exact dates from database
              const timeframe = `${startDate} to ${endDate}`;

              return (
                <div
                  key={entry.id}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedEntry && selectedEntry.id === entry.id ? "bg-muted" : ""}`}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="font-medium">
                          {format(
                            new Date(entry.start_date + "T00:00:00"),
                            "MMMM yyyy",
                          )}
                        </h3>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {timeframe}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEntryToEdit(entry.id);
                            setIsEditDialogOpen(true);
                          }}
                          title="Edit entry"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEntryToDelete(entry.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground ml-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Journal Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this journal entry? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setEntryToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEntry}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default JournalList;
