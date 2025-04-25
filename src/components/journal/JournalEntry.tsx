import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import JournalStats from "./JournalStats";
import JournalTrades from "./JournalTrades";
import { Edit, Check, X } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import { toast } from "@/components/ui/use-toast";

interface JournalEntryProps {
  id: string;
  entryType: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string;
  plan: string;
  review: string;
  hasSubentries?: boolean;
  onEdit?: () => void;
}

interface DailySubEntry {
  id: string;
  day_of_week: string;
  plan: string;
  review: string;
}

const JournalEntry = ({
  id,
  entryType,
  startDate,
  endDate,
  plan,
  review,
  hasSubentries,
  onEdit,
}: JournalEntryProps) => {
  const [activeTab, setActiveTab] = useState("main");
  const [dailySubEntries, setDailySubEntries] = useState<DailySubEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editedPlan, setEditedPlan] = useState(plan);
  const [editedReview, setEditedReview] = useState(review);
  const [editingDailyEntry, setEditingDailyEntry] =
    useState<DailySubEntry | null>(null);
  const [editedDailyPlan, setEditedDailyPlan] = useState("");
  const [editedDailyReview, setEditedDailyReview] = useState("");

  // Format dates for display - ensure timezone doesn't affect display
  const formattedStartDate = format(
    new Date(startDate + "T00:00:00"),
    "MMM d, yyyy",
  );
  const formattedEndDate =
    startDate !== endDate
      ? format(new Date(endDate + "T00:00:00"), "MMM d, yyyy")
      : null;

  // Get title based on entry type
  const getTitle = () => {
    switch (entryType) {
      case "daily":
        return `Daily Journal - ${formattedStartDate}`;
      case "weekly":
        return `Weekly Journal - ${formattedStartDate} to ${formattedEndDate}`;
      case "monthly":
        return `Monthly Journal - ${format(new Date(startDate), "MMMM yyyy")}`;
      default:
        return "Journal Entry";
    }
  };

  // Update local state when props change
  useEffect(() => {
    setEditedPlan(plan);
    setEditedReview(review);
  }, [plan, review]);

  // Save edited content
  const saveContent = async (field: "plan" | "review", content: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("journal_entries")
        .update({ [field]: content })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Journal ${field} updated`,
      });

      if (field === "plan") {
        setIsEditingPlan(false);
      } else {
        setIsEditingReview(false);
      }

      // Update the local state with the new content
      if (field === "plan") {
        setEditedPlan(content);
      } else {
        setEditedReview(content);
      }

      // Notify parent component to refresh the entries list
      if (onContentSaved) {
        onContentSaved();
      }
    } catch (error) {
      console.error(`Error updating journal ${field}:`, error);
      toast({
        title: "Error",
        description: `Failed to update journal ${field}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save daily entry content
  const saveDailyContent = async (
    entryId: string,
    field: "plan" | "review",
    content: string,
  ) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("journal_subentries")
        .update({ [field]: content })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Daily ${field} updated`,
      });

      // Update local state
      setDailySubEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, [field]: content } : entry,
        ),
      );
      setEditingDailyEntry(null);
    } catch (error) {
      console.error(`Error updating daily ${field}:`, error);
      toast({
        title: "Error",
        description: `Failed to update daily ${field}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch daily sub-entries for weekly journals
  useEffect(() => {
    const fetchDailySubEntries = async () => {
      if (entryType !== "weekly" || !hasSubentries) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("journal_subentries")
          .select("*")
          .eq("parent_id", id);

        if (error) throw error;

        if (data && data.length > 0) {
          // Define the correct order of days
          const dayOrder = {
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
            Sunday: 7,
          };

          // Sort the entries by day of week
          const sortedData = [...data].sort((a, b) => {
            return dayOrder[a.day_of_week] - dayOrder[b.day_of_week];
          });

          setDailySubEntries(sortedData as DailySubEntry[]);
          setActiveTab("main"); // Start with main tab
        }
      } catch (error) {
        console.error("Error fetching daily sub-entries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDailySubEntries();
  }, [id, entryType]);

  return (
    <div className="space-y-6">
      {/* Stats section */}
      <JournalStats journalId={id} startDate={startDate} endDate={endDate} />

      {/* Overview section - moved above tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Plan section */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly Plan</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditingPlan(true);
              }}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isEditingPlan ? (
              <div className="space-y-4">
                <div data-color-mode="light">
                  <MDEditor
                    value={editedPlan}
                    onChange={(value) => setEditedPlan(value || "")}
                    height={150}
                    preview="edit"
                    previewOptions={{
                      rehypePlugins: [[rehypeSanitize]],
                    }}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingPlan(false);
                      setEditedPlan(plan); // Reset to original
                    }}
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveContent("plan", editedPlan)}
                    disabled={loading}
                  >
                    <Check className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {plan ? (
                  <MarkdownRenderer>{plan}</MarkdownRenderer>
                ) : (
                  <p className="text-muted-foreground">
                    No weekly plan entered
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Review section */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly Review</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditingReview(true);
              }}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isEditingReview ? (
              <div className="space-y-4">
                <div data-color-mode="light">
                  <MDEditor
                    value={editedReview}
                    onChange={(value) => setEditedReview(value || "")}
                    height={150}
                    preview="edit"
                    previewOptions={{
                      rehypePlugins: [[rehypeSanitize]],
                    }}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingReview(false);
                      setEditedReview(review); // Reset to original
                    }}
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveContent("review", editedReview)}
                    disabled={loading}
                  >
                    <Check className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {review ? (
                  <MarkdownRenderer>{review}</MarkdownRenderer>
                ) : (
                  <p className="text-muted-foreground">
                    No weekly review entered
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily tabs section */}
      {entryType === "weekly" &&
        hasSubentries &&
        dailySubEntries.length > 0 && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-5">
              {dailySubEntries.map((entry) => (
                <TabsTrigger key={entry.id} value={entry.day_of_week}>
                  {entry.day_of_week}
                </TabsTrigger>
              ))}
            </TabsList>

            {dailySubEntries.map((entry) => (
              <TabsContent
                key={entry.id}
                value={entry.day_of_week}
                className="space-y-6 mt-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Daily Plan section */}
                  <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>{entry.day_of_week} Plan</CardTitle>
                      {editingDailyEntry?.id !== entry.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDailyEntry(entry);
                            setEditedDailyPlan(entry.plan || "");
                            setEditedDailyReview(entry.review || "");
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {editingDailyEntry?.id === entry.id ? (
                        <div className="space-y-4">
                          <div data-color-mode="light">
                            <MDEditor
                              value={editedDailyPlan}
                              onChange={(value) =>
                                setEditedDailyPlan(value || "")
                              }
                              height={150}
                              preview="edit"
                              previewOptions={{
                                rehypePlugins: [[rehypeSanitize]],
                              }}
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingDailyEntry(null);
                              }}
                              disabled={loading}
                            >
                              <X className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                saveDailyContent(
                                  entry.id,
                                  "plan",
                                  editedDailyPlan,
                                )
                              }
                              disabled={loading}
                            >
                              <Check className="h-4 w-4 mr-1" /> Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {entry.plan ? (
                            <MarkdownRenderer>{entry.plan}</MarkdownRenderer>
                          ) : (
                            <p className="text-muted-foreground">
                              No plan entered for {entry.day_of_week}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Daily Review section */}
                  <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>{entry.day_of_week} Review</CardTitle>
                      {editingDailyEntry?.id !== entry.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDailyEntry(entry);
                            setEditedDailyPlan(entry.plan || "");
                            setEditedDailyReview(entry.review || "");
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {editingDailyEntry?.id === entry.id ? (
                        <div className="space-y-4">
                          <div data-color-mode="light">
                            <MDEditor
                              value={editedDailyReview}
                              onChange={(value) =>
                                setEditedDailyReview(value || "")
                              }
                              height={150}
                              preview="edit"
                              previewOptions={{
                                rehypePlugins: [[rehypeSanitize]],
                              }}
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingDailyEntry(null);
                              }}
                              disabled={loading}
                            >
                              <X className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                saveDailyContent(
                                  entry.id,
                                  "review",
                                  editedDailyReview,
                                )
                              }
                              disabled={loading}
                            >
                              <Check className="h-4 w-4 mr-1" /> Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {entry.review ? (
                            <MarkdownRenderer>{entry.review}</MarkdownRenderer>
                          ) : (
                            <p className="text-muted-foreground">
                              No review entered for {entry.day_of_week}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

      {/* Trades section */}
      <Card>
        <CardHeader>
          <CardTitle>Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalTrades startDate={startDate} endDate={endDate} />
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntry;
