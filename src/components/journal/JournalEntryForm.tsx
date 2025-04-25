import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getDay,
} from "date-fns";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Import markdown editor and viewer
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";

const formSchema = z.object({
  entryType: z.literal("weekly"),
  date: z.date(),
});

interface DailySubEntry {
  day_of_week: string;
  plan: string;
  review: string;
  id?: string;
}

interface JournalEntryFormProps {
  journalId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

const JournalEntryForm = ({
  journalId,
  onSuccess,
  onCancel,
  isOpen = false,
  setIsOpen,
}: JournalEntryFormProps) => {
  const [loading, setLoading] = useState(false);
  const [planContent, setPlanContent] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("main");
  const [dailySubEntries, setDailySubEntries] = useState<DailySubEntry[]>([
    { day_of_week: "Monday", plan: "", review: "" },
    { day_of_week: "Tuesday", plan: "", review: "" },
    { day_of_week: "Wednesday", plan: "", review: "" },
    { day_of_week: "Thursday", plan: "", review: "" },
    { day_of_week: "Friday", plan: "", review: "" },
  ]);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryType: "weekly",
      date: new Date(),
    },
  });

  // Load existing journal entry if editing
  useEffect(() => {
    // Reset date range when form is initialized
    if (!journalId) {
      const currentDate = form.getValues("date");
      if (currentDate) {
        const start = startOfWeek(currentDate); // Sunday (default in date-fns)
        const end = addDays(start, 6); // Saturday
        setStartDate(start);
        setEndDate(end);
        // Don't modify the selected date
      }
    }

    const loadJournalEntry = async () => {
      if (!journalId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("journal_entries")
          .select("*")
          .eq("id", journalId)
          .single();

        if (error) throw error;

        if (data) {
          form.setValue("entryType", data.entry_type);

          // Set the date to the exact start date from the database
          // Add T00:00:00 to ensure consistent timezone handling
          const storedStartDate = new Date(data.start_date + "T00:00:00");
          const storedEndDate = new Date(data.end_date + "T00:00:00");

          // Ensure we're using the exact dates from the database
          form.setValue("date", storedStartDate);
          setStartDate(storedStartDate);
          setEndDate(storedEndDate);

          // Set the markdown content
          if (data.plan) {
            setPlanContent(data.plan);
          }

          if (data.review) {
            setReviewContent(data.review);
          }

          // If this is a weekly entry, load sub-entries
          if (data.entry_type === "weekly" && data.has_subentries) {
            const { data: subEntries, error: subEntriesError } = await supabase
              .from("journal_subentries")
              .select("*")
              .eq("parent_id", journalId);

            if (subEntriesError) throw subEntriesError;

            if (subEntries && subEntries.length > 0) {
              // Map the sub-entries to our state format
              const mappedSubEntries = [
                { day_of_week: "Monday", plan: "", review: "", id: "" },
                { day_of_week: "Tuesday", plan: "", review: "", id: "" },
                { day_of_week: "Wednesday", plan: "", review: "", id: "" },
                { day_of_week: "Thursday", plan: "", review: "", id: "" },
                { day_of_week: "Friday", plan: "", review: "", id: "" },
              ];

              // Update with data from database
              subEntries.forEach((entry) => {
                const index = mappedSubEntries.findIndex(
                  (item) => item.day_of_week === entry.day_of_week,
                );
                if (index !== -1) {
                  mappedSubEntries[index] = {
                    day_of_week: entry.day_of_week,
                    plan: entry.plan || "",
                    review: entry.review || "",
                    id: entry.id,
                  };
                }
              });

              setDailySubEntries(mappedSubEntries);
              setActiveTab("Monday");
            }
          }
        }
      } catch (error) {
        console.error("Error loading journal entry:", error);
        toast({
          title: "Error",
          description: "Failed to load journal entry",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadJournalEntry();
  }, [journalId, form]);

  // Update date range when date changes - always set to the week containing the selected date
  useEffect(() => {
    const date = form.watch("date");

    if (!date) return;

    // Always use Sunday to Saturday for the week containing the selected date
    const start = startOfWeek(date); // Sunday (default in date-fns)
    const end = addDays(start, 6); // Saturday

    // Don't modify the selected date, just update the range display
    setStartDate(start);
    setEndDate(end);
  }, [form.watch("date")]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);

      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Use the already calculated start and end dates from state
      if (!startDate || !endDate) {
        throw new Error("Date range not properly calculated");
      }

      // Use the exact date selected by the user
      const selectedDate = values.date;
      // Calculate Sunday-Saturday range for the selected date
      const weekStart = startOfWeek(selectedDate); // Sunday
      const weekEnd = addDays(weekStart, 6); // Saturday

      // Format dates for database - ensure consistent date format without time component
      const formattedStartDate = format(weekStart, "yyyy-MM-dd");
      const formattedEndDate = format(weekEnd, "yyyy-MM-dd");

      // All entries are weekly and have sub-entries
      const hasSubEntries = true;

      // Prepare data
      const journalData = {
        user_id: user.id,
        entry_type: values.entryType,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        plan: planContent,
        review: reviewContent,
        has_subentries: hasSubEntries,
        updated_at: new Date().toISOString(),
      };

      let entryId = journalId;
      let result;

      if (journalId) {
        // Update existing entry
        result = await supabase
          .from("journal_entries")
          .update(journalData)
          .eq("id", journalId);
      } else {
        // Create new entry
        result = await supabase
          .from("journal_entries")
          .insert(journalData)
          .select();

        if (result.data && result.data.length > 0) {
          entryId = result.data[0].id;
        }
      }

      if (result.error) throw result.error;

      // If this is a weekly entry, save the daily sub-entries
      if (hasSubEntries && entryId) {
        // For existing entries, first delete any existing sub-entries
        if (journalId) {
          await supabase
            .from("journal_subentries")
            .delete()
            .eq("parent_id", journalId);
        }

        // Insert all sub-entries
        const subEntryData = dailySubEntries.map((entry) => ({
          parent_id: entryId,
          day_of_week: entry.day_of_week,
          plan: entry.plan,
          review: entry.review,
        }));

        const subEntryResult = await supabase
          .from("journal_subentries")
          .insert(subEntryData);

        if (subEntryResult.error) throw subEntryResult.error;
      }

      toast({
        title: "Success",
        description: journalId
          ? "Journal entry updated"
          : "Journal entry created",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving journal entry:", error);
      toast({
        title: "Error",
        description: "Failed to save journal entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper text for markdown
  const MarkdownHelp = () => (
    <div className="text-xs text-muted-foreground mb-2">
      <p>
        Markdown supported: **bold**, *italic*, # Heading, - list items,
        [link](url), etc.
      </p>
    </div>
  );

  // Handle updating a daily sub-entry
  const updateDailySubEntry = (
    day: string,
    field: "plan" | "review",
    value: string,
  ) => {
    setDailySubEntries((prev) =>
      prev.map((entry) =>
        entry.day_of_week === day ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {journalId ? "Edit" : "Create"} Journal Entry
          </DialogTitle>
          <DialogDescription>
            {journalId ? "Update" : "Create a new"} journal entry to track your
            trading progress.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <FormLabel>Weekly Plan</FormLabel>
                <MarkdownHelp />
                <div data-color-mode="light">
                  <MDEditor
                    value={planContent}
                    onChange={(value) => setPlanContent(value || "")}
                    height={150}
                    preview="edit"
                    previewOptions={{
                      rehypePlugins: [[rehypeSanitize]],
                    }}
                  />
                </div>
              </div>

              <div>
                <FormLabel>Weekly Review</FormLabel>
                <MarkdownHelp />
                <div data-color-mode="light">
                  <MDEditor
                    value={reviewContent}
                    onChange={(value) => setReviewContent(value || "")}
                    height={150}
                    preview="edit"
                    previewOptions={{
                      rehypePlugins: [[rehypeSanitize]],
                    }}
                  />
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default JournalEntryForm;
