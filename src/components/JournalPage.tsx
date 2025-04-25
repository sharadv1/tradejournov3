import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import JournalList from "./journal/JournalList";
import JournalEntry from "./journal/JournalEntry";
import JournalEntryForm from "./journal/JournalEntryForm";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  BookOpen,
  LineChart,
  Settings,
  Users,
  Briefcase,
} from "lucide-react";

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

const JournalPage = () => {
  const navigate = useNavigate();
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<string | null>(null);

  return (
    <div className="h-screen bg-background">
      <div className="overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Trading Journal</h1>
            <p className="text-muted-foreground mt-1">
              Track your trading progress with daily, weekly, and monthly
              journal entries.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/4">
              <JournalList
                selectedEntry={selectedEntry}
                setSelectedEntry={setSelectedEntry}
                setIsCreateDialogOpen={setIsCreateDialogOpen}
                setIsEditDialogOpen={setIsEditDialogOpen}
                setEntryToEdit={setEntryToEdit}
              />
            </div>
            <div className="w-full md:w-3/4">
              {selectedEntry ? (
                <Card className="h-full">
                  <div className="h-full flex flex-col">
                    <JournalEntry
                      id={selectedEntry.id}
                      entryType={selectedEntry.entry_type}
                      startDate={selectedEntry.start_date}
                      endDate={selectedEntry.end_date}
                      plan={selectedEntry.plan}
                      review={selectedEntry.review}
                      hasSubentries={selectedEntry.has_subentries}
                      onEdit={() => {
                        setEntryToEdit(selectedEntry.id);
                        setIsEditDialogOpen(true);
                      }}
                    />
                  </div>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center p-6">
                  <p className="text-muted-foreground">
                    Select a journal entry to view details or create a new entry
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Entry Dialog */}
      {isCreateDialogOpen && (
        <JournalEntryForm
          onSuccess={() => {
            setIsCreateDialogOpen(false);
          }}
          onCancel={() => setIsCreateDialogOpen(false)}
          isOpen={isCreateDialogOpen}
          setIsOpen={setIsCreateDialogOpen}
        />
      )}

      {/* Edit Entry Dialog */}
      {isEditDialogOpen && entryToEdit && (
        <JournalEntryForm
          journalId={entryToEdit}
          onSuccess={() => {
            setIsEditDialogOpen(false);
            setEntryToEdit(null);
          }}
          onCancel={() => {
            setIsEditDialogOpen(false);
            setEntryToEdit(null);
          }}
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
        />
      )}
    </div>
  );
};

export default JournalPage;
