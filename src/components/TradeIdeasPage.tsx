import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  CalendarIcon,
  Plus,
  Upload,
  X,
  XCircle,
  Maximize2,
  Loader2,
  Edit,
  Trash2,
  ChevronRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TradeIdea,
  tradeIdeaTypes,
  rMultipleOptions,
  MediaFile,
  MediaFileWithPreview,
} from "@/models/TradeIdea";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import MediaCommentForm from "@/components/MediaCommentForm";
import MediaCommentsList from "@/components/MediaCommentsList";
import { useTradeIdeaMedia } from "@/hooks/useTradeIdeaMedia";
import { v4 as uuidv4 } from "uuid";

interface FileWithPreview extends File {
  preview?: string;
}

const TradeIdeasPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [tradeIdeas, setTradeIdeas] = useState<TradeIdea[]>([]);
  const [formData, setFormData] = useState<TradeIdea>({
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    type: "Trade Idea",
    r_multiple: null,
    media_files: [],
  });
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const {
    mediaFiles,
    setMediaFiles,
    selectedMedia,
    setSelectedMedia,
    isDragging,
    setIsDragging,
    fileInputRef,
    setFileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFiles,
    openFileDialog,
    handleFileInputChange,
    removeFile,
    selectMedia,
    processMediaFiles,
  } = useTradeIdeaMedia();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  useEffect(() => {
    const loadTradeIdeas = async () => {
      try {
        // First try to load from Supabase
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: supabaseIdeas, error } = await supabase
            .from("trade_ideas")
            .select(
              `
              *,
              trade_idea_media(*)
            `,
            )
            .order("created_at", { ascending: false });

          if (error) {
            console.error("Error fetching trade ideas from Supabase:", error);
          } else if (supabaseIdeas && supabaseIdeas.length > 0) {
            // Format the data to match our app's structure
            const formattedIdeas = supabaseIdeas.map((idea) => ({
              id: idea.id,
              title: idea.title,
              date: idea.date,
              description: idea.description,
              type: idea.type,
              r_multiple: idea.r_multiple,
              created_at: idea.created_at,
              updated_at: idea.updated_at,
              stored_in_supabase: true,
              media_files: idea.trade_idea_media
                ? idea.trade_idea_media.map((media) => {
                    // Get public URL for media files
                    let publicUrl = media.file_path;
                    if (
                      media.file_path &&
                      !media.file_path.startsWith("http")
                    ) {
                      const { data } = supabase.storage
                        .from("media")
                        .getPublicUrl(media.file_path);
                      publicUrl = data.publicUrl;
                    }

                    return {
                      id: media.id,
                      trade_idea_id: media.trade_idea_id,
                      file_path: publicUrl,
                      file_type: media.file_type,
                      description: media.description || "",
                      stored_in_supabase: true,
                      already_in_database: true,
                      file_name: media.file_name,
                    };
                  })
                : [],
            }));

            setTradeIdeas(formattedIdeas);
            if (formattedIdeas.length > 0 && !selectedIdeaId) {
              setSelectedIdeaId(formattedIdeas[0].id);
            }
            return; // Skip localStorage loading if we have Supabase data
          }
        }

        // Fall back to localStorage if no Supabase data
        const savedIdeas = localStorage.getItem("tradeIdeas");
        if (savedIdeas) {
          try {
            const parsedIdeas = JSON.parse(savedIdeas);
            console.log("Loaded trade ideas:", parsedIdeas);

            console.log("All localStorage keys:");
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith("tradeIdea_media_")) {
                console.log(`Found media key: ${key}`);
              }
            }

            const ideasWithMedia = parsedIdeas.map((idea) => {
              const mediaWithContent =
                idea.media_files?.map((file) => {
                  const mediaKey = `tradeIdea_media_${file.id}`;
                  let filePath = localStorage.getItem(mediaKey);

                  console.log(`Looking for media file ${file.id}:`, {
                    mediaKey,
                    found: !!filePath,
                    filePathPreview: filePath
                      ? filePath.substring(0, 50) + "..."
                      : "null",
                  });

                  if (!filePath) {
                    console.warn(`Media file not found for ID: ${file.id}`);
                    filePath = `https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80`;
                  }

                  return {
                    ...file,
                    file_path: filePath,
                    id: file.id || uuidv4(),
                  };
                }) || [];

              return {
                ...idea,
                media_files: mediaWithContent,
              };
            });

            setTradeIdeas(ideasWithMedia);
            if (ideasWithMedia.length > 0 && !selectedIdeaId) {
              setSelectedIdeaId(ideasWithMedia[0].id);
            }
          } catch (error) {
            console.error("Error parsing saved trade ideas:", error);
          }
        }
      } catch (error) {
        console.error("Error loading trade ideas:", error);
      }
    };

    loadTradeIdeas();
  }, []);

  useEffect(() => {
    if (selectedIdeaId) {
      const idea = tradeIdeas.find((idea) => idea.id === selectedIdeaId);
      if (idea && idea.media_files && idea.media_files.length > 0) {
        const mediaFile = idea.media_files[0];
        const mediaCopy = {
          id: mediaFile.id,
          file_path: mediaFile.file_path,
          file_type: mediaFile.file_type,
        };

        setSelectedMedia(mediaCopy);
      } else {
        setSelectedMedia(null);
      }
    }
  }, [selectedIdeaId, tradeIdeas]);

  // Filter trade ideas based on type filter
  const filteredIdeas = tradeIdeas.filter((idea) => {
    if (typeFilter === "all") {
      return true;
    }
    return idea.type === typeFilter;
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleTypeChange = (value: string) => {
    setFormData({
      ...formData,
      type: value as "Trade Idea" | "Missed Trade" | "No Trade",
      r_multiple: value === "Missed Trade" ? formData.r_multiple : null,
    });
  };

  const handleRMultipleChange = (value: string) => {
    setFormData({
      ...formData,
      r_multiple: parseFloat(value),
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData({
        ...formData,
        date: format(date, "yyyy-MM-dd"),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting trade idea:", formData);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Generate a proper UUID for the trade idea
    const ideaId = isEditing && formData.id ? formData.id : uuidv4();

    const processedMediaFiles = await processMediaFiles(
      mediaFiles,
      ideaId,
      user?.id,
    );

    let updatedIdeas;

    if (user) {
      try {
        if (isEditing && formData.id) {
          // First, check if any media files need to be deleted
          const existingIdea = tradeIdeas.find(
            (idea) => idea.id === formData.id,
          );
          const existingMediaIds =
            existingIdea?.media_files?.map((file) => file.id) || [];
          const newMediaIds = mediaFiles.map((file) => file.id);

          // Find media files that were removed
          const removedMediaIds = existingMediaIds.filter(
            (id) => !newMediaIds.includes(id),
          );

          // Delete removed media files from the database
          if (removedMediaIds.length > 0) {
            console.log(
              `Deleting ${removedMediaIds.length} removed media files:`,
              removedMediaIds,
            );

            for (const mediaId of removedMediaIds) {
              const { error: deleteMediaError } = await supabase
                .from("trade_idea_media")
                .delete()
                .eq("id", mediaId);

              if (deleteMediaError) {
                console.error(
                  `Error deleting media file ${mediaId}:`,
                  deleteMediaError,
                );
              } else {
                console.log(
                  `Successfully deleted media file ${mediaId} from database`,
                );
              }
            }
          }

          // Update the trade idea
          const { error: updateError } = await supabase
            .from("trade_ideas")
            .update({
              title: formData.title,
              date: formData.date,
              description: formData.description,
              type: formData.type,
              r_multiple: formData.r_multiple,
              updated_at: new Date().toISOString(),
            })
            .eq("id", formData.id);

          if (updateError) {
            console.error(
              "Error updating trade idea in Supabase:",
              updateError,
            );
          }
        } else {
          const { data: insertedIdea, error: insertError } = await supabase
            .from("trade_ideas")
            .insert({
              id: ideaId, // Using UUID format
              user_id: user.id,
              title: formData.title,
              date: formData.date,
              description: formData.description,
              type: formData.type,
              r_multiple: formData.r_multiple,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select();

          if (insertError) {
            console.error(
              "Error inserting trade idea to Supabase:",
              insertError,
            );
          }
        }

        for (const mediaFile of processedMediaFiles) {
          if (mediaFile.stored_in_supabase) {
            if (mediaFile.already_in_database) {
              // Update existing media file description
              const { error: mediaUpdateError } = await supabase
                .from("trade_idea_media")
                .update({
                  description: mediaFile.description || "",
                })
                .eq("id", mediaFile.id);

              if (mediaUpdateError) {
                console.error(
                  "Error updating media file description in Supabase:",
                  mediaUpdateError,
                );
              }
            } else {
              // Insert new media file
              const { error: mediaInsertError } = await supabase
                .from("trade_idea_media")
                .insert({
                  id: mediaFile.id, // Using UUID format
                  trade_idea_id: ideaId, // Using UUID format
                  file_path: mediaFile.file_path,
                  file_type: mediaFile.file_type,
                  description: mediaFile.description || "",
                  file_name: mediaFile.file_name,
                  user_id: user.id,
                });

              if (mediaInsertError) {
                console.error(
                  "Error inserting media file record to Supabase:",
                  mediaInsertError,
                );
              } else {
                console.log("Successfully inserted media file to Supabase:", {
                  id: mediaFile.id,
                  trade_idea_id: ideaId,
                  file_path: mediaFile.file_path,
                  file_type: mediaFile.file_type,
                  description: mediaFile.description || "",
                  file_name: mediaFile.file_name,
                });
              }
            }
          }
        }
      } catch (supabaseError) {
        console.error("Error saving to Supabase:", supabaseError);
      }
    }

    if (isEditing && formData.id) {
      updatedIdeas = tradeIdeas.map((idea) =>
        idea.id === formData.id
          ? {
              ...formData,
              media_files: processedMediaFiles,
            }
          : idea,
      );
    } else {
      const newTradeIdea = {
        ...formData,
        id: ideaId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        media_files: processedMediaFiles,
      };
      updatedIdeas = [...tradeIdeas, newTradeIdea];
      setSelectedIdeaId(newTradeIdea.id);
    }

    try {
      const minimalIdeas = updatedIdeas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        date: idea.date,
        type: idea.type,
        r_multiple: idea.r_multiple,
        description: idea.description,
        created_at: idea.created_at,
        updated_at: idea.updated_at,
        stored_in_supabase: true,
        media_files:
          idea.media_files?.map((file) => ({
            id: file.id,
            file_type: file.file_type,
            description: file.description || "",
            stored_in_supabase: file.stored_in_supabase || false,
            file_path: file.file_path,
            file_name: file.file_name,
          })) || [],
      }));

      localStorage.setItem("tradeIdeas", JSON.stringify(minimalIdeas));
      setTradeIdeas(updatedIdeas);
    } catch (error) {
      console.error("Error saving trade ideas to localStorage:", error);
      setTradeIdeas(updatedIdeas);
    }

    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setMediaFiles([]);
    setFormData({
      title: "",
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      type: "Trade Idea",
      r_multiple: null,
      media_files: [],
    });
  };

  const handleEditIdea = (idea: TradeIdea) => {
    setIsEditing(true);
    setFormData(idea);

    if (idea.media_files && idea.media_files.length > 0) {
      setMediaFiles(
        idea.media_files.map((file) => ({
          ...file,
          id:
            file.id ||
            `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file_path: file.file_path,
          file_type: file.file_type,
          description: file.description || "",
        })),
      );
    } else {
      setMediaFiles([]);
    }

    setShowForm(true);
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      const ideaToDelete = tradeIdeas.find((idea) => idea.id === id);

      if (!ideaToDelete) return;

      if (ideaToDelete.stored_in_supabase) {
        try {
          // Use the deleteMediaFilesFromStorage function directly
          // Delete all media files from storage
          if (ideaToDelete.media_files && ideaToDelete.media_files.length > 0) {
            console.log(`Deleting media files for trade idea ${id}...`);
            console.log("Media files to delete:", ideaToDelete.media_files);

            // First delete media records from the database
            const { error: mediaDeleteError } = await supabase
              .from("trade_idea_media")
              .delete()
              .eq("trade_idea_id", id);

            if (mediaDeleteError) {
              console.error(
                "Error deleting media records from database:",
                mediaDeleteError,
              );
            } else {
              console.log(
                `Successfully deleted media records for trade idea ${id}`,
              );
            }

            // Then delete the actual files from storage
            const { deleteMediaFilesFromStorage } = await import(
              "@/lib/supabase"
            );
            const { success, error: storageError } =
              await deleteMediaFilesFromStorage(id);

            if (!success) {
              console.error(
                "Error deleting media files from storage:",
                storageError,
              );
            } else {
              console.log(
                `Successfully deleted media files for trade idea ${id}`,
              );
            }
          }

          // Delete the trade idea itself
          const { error: deleteError } = await supabase
            .from("trade_ideas")
            .delete()
            .eq("id", id);

          if (deleteError) {
            console.error(
              "Error deleting trade idea from Supabase:",
              deleteError,
            );
          } else {
            console.log(`Successfully deleted trade idea ${id}`);
          }
        } catch (supabaseError) {
          console.error("Supabase deletion error:", supabaseError);
        }
      }

      // Clean up localStorage regardless of whether the idea was in Supabase
      if (ideaToDelete && ideaToDelete.media_files) {
        ideaToDelete.media_files.forEach((file) => {
          try {
            localStorage.removeItem(`tradeIdea_media_${file.id}`);
            console.log(`Removed media file ${file.id} from localStorage`);
          } catch (e) {
            console.error("Error removing media file from localStorage:", e);
          }
        });
      }

      // Update the UI
      const updatedIdeas = tradeIdeas.filter((idea) => idea.id !== id);
      setTradeIdeas(updatedIdeas);

      try {
        const minimalIdeas = updatedIdeas.map((idea) => ({
          id: idea.id,
          title: idea.title,
          date: idea.date,
          type: idea.type,
          r_multiple: idea.r_multiple,
          description: idea.description,
          created_at: idea.created_at,
          updated_at: idea.updated_at,
          stored_in_supabase: idea.stored_in_supabase || false,
          media_files:
            idea.media_files?.map((file) => ({
              id: file.id,
              file_type: file.file_type,
              description: file.description || "",
              stored_in_supabase: file.stored_in_supabase || false,
              file_path: file.file_path,
              file_name: file.file_name,
            })) || [],
        }));

        localStorage.setItem("tradeIdeas", JSON.stringify(minimalIdeas));
      } catch (storageError) {
        console.error("Error updating localStorage:", storageError);
      }

      if (id === selectedIdeaId) {
        setSelectedIdeaId(updatedIdeas.length > 0 ? updatedIdeas[0].id : null);
      }
    } catch (error) {
      console.error("Error deleting trade idea:", error);
      alert("Error deleting trade idea. Please try again.");
    }
  };

  const selectedIdea = tradeIdeas.find((idea) => idea.id === selectedIdeaId);

  return (
    <div className="container mx-auto py-6 bg-background">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Trade Ideas & Missed Trades</h1>
        <div className="flex items-center gap-2">
          <div className="mr-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {tradeIdeaTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => (isEditing ? resetForm() : setShowForm(!showForm))}
          >
            {showForm ? (
              "Cancel"
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> New Entry
              </>
            )}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {isEditing ? "Edit Entry" : "Create New Entry"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? (
                          format(new Date(formData.date), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={
                          formData.date ? new Date(formData.date) : undefined
                        }
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {tradeIdeaTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === "Missed Trade" && (
                  <div className="space-y-2">
                    <Label htmlFor="r_multiple">R Multiple</Label>
                    <Select
                      value={formData.r_multiple?.toString() || ""}
                      onValueChange={handleRMultipleChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select R multiple" />
                      </SelectTrigger>
                      <SelectContent>
                        {rMultipleOptions.map((value) => (
                          <SelectItem key={value} value={value.toString()}>
                            {value}R
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                  {formData.type === "Missed Trade" && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (Include setup, entry, target, stop loss)
                    </span>
                  )}
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={6}
                  placeholder={
                    formData.type === "Missed Trade"
                      ? "Setup:\n\nEntry:\n\nTarget:\n\nStop Loss:"
                      : ""
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Media Files</Label>
                <div
                  className={`border-2 border-dashed rounded-md p-4 text-center ${isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25"}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={openFileDialog}
                >
                  <input
                    type="file"
                    ref={(ref) => setFileInputRef(ref)}
                    className="hidden"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileInputChange}
                  />
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop files here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported formats: JPG, PNG, GIF, MP4
                  </p>
                </div>

                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {mediaFiles.map((file) => (
                      <Card
                        key={file.id}
                        className="relative overflow-hidden group cursor-pointer"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id || "");
                          }}
                          className="absolute top-1 right-1 bg-background/80 rounded-full p-1 z-10"
                          aria-label="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMedia(file);
                          }}
                          className="absolute top-1 left-1 bg-background/80 rounded-full p-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="View full size"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>
                        {file.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-5">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        )}
                        <div
                          onClick={() => {
                            setSelectedMedia(file);
                          }}
                        >
                          {file.file_type === "image" ? (
                            <img
                              src={file.file_path}
                              alt="Uploaded"
                              onError={(e) => {
                                e.currentTarget.src =
                                  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80";
                                e.currentTarget.onerror = null;
                              }}
                              className="w-full h-32 object-cover"
                            />
                          ) : (
                            <video
                              src={file.file_path}
                              className="w-full h-32 object-cover"
                            />
                          )}
                        </div>
                        <div className="p-2">
                          <Input
                            placeholder="Add caption"
                            value={file.description || ""}
                            onChange={(e) => {
                              const updatedFiles = mediaFiles.map((f) =>
                                f.id === file.id
                                  ? { ...f, description: e.target.value }
                                  : f,
                              );
                              setMediaFiles(updatedFiles);
                            }}
                            className="text-xs"
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit">
                  {isEditing ? "Update" : "Save"} Entry
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm &&
        (tradeIdeas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No trade ideas or missed trades yet.
            </p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" /> Create Your First Entry
            </Button>
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No trade ideas match the selected filter.
            </p>
            <Button onClick={() => setTypeFilter("all")} className="mt-4">
              Clear Filter
            </Button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Ideas List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredIdeas.map((idea) => (
                      <div
                        key={idea.id}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedIdeaId === idea.id ? "bg-muted" : ""}`}
                        onClick={() => setSelectedIdeaId(idea.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium">{idea.title}</h3>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <span>
                                {format(new Date(idea.date), "MMM d, yyyy")}
                              </span>
                              <span className="mx-2">•</span>
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                                {idea.type}
                                {idea.type === "Missed Trade" &&
                                  idea.r_multiple && (
                                    <span className="ml-1">
                                      {idea.r_multiple}R
                                    </span>
                                  )}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="w-full md:w-4/5">
              {selectedIdea ? (
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{selectedIdea.title}</CardTitle>
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(selectedIdea.date), "MMM d, yyyy")}
                        </span>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary mt-1">
                          {selectedIdea.type}
                          {selectedIdea.type === "Missed Trade" &&
                            selectedIdea.r_multiple && (
                              <span className="ml-1">
                                {selectedIdea.r_multiple}R
                              </span>
                            )}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedIdea.media_files &&
                      selectedIdea.media_files.length > 0 && (
                        <div className="mb-6">
                          <div className="flex flex-col gap-4">
                            <div className="bg-muted/30 rounded-lg p-4 flex flex-col h-[840px]">
                              <div className="flex-1 flex items-center justify-center">
                                {selectedMedia ? (
                                  selectedMedia.file_type === "image" ? (
                                    <img
                                      src={selectedMedia.file_path}
                                      alt="Selected media"
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80";
                                        e.currentTarget.onerror = null;
                                      }}
                                      className="max-w-full max-h-[680px] object-contain w-auto h-auto"
                                    />
                                  ) : (
                                    <video
                                      src={selectedMedia.file_path}
                                      controls
                                      className="max-w-full max-h-[680px]"
                                    />
                                  )
                                ) : selectedIdea.media_files[0].file_type ===
                                  "image" ? (
                                  <img
                                    src={selectedIdea.media_files[0].file_path}
                                    alt="Selected media"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80";
                                      e.currentTarget.onerror = null;
                                    }}
                                    className="max-w-full max-h-[680px] object-contain"
                                  />
                                ) : (
                                  <video
                                    src={selectedIdea.media_files[0].file_path}
                                    controls
                                    className="max-w-full max-h-[680px]"
                                  />
                                )}
                              </div>

                              <div className="mt-4 w-full">
                                <div className="flex justify-between items-center mb-2">
                                  <h3 className="text-sm font-medium">
                                    {selectedMedia
                                      ? `Image ${selectedIdea.media_files.findIndex((m) => m.id === selectedMedia.id) + 1} of ${selectedIdea.media_files.length}`
                                      : `Image 1 of ${selectedIdea.media_files.length}`}
                                  </h3>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const currentMedia =
                                        selectedMedia ||
                                        selectedIdea.media_files[0];
                                      if (!currentMedia) return;

                                      const newDescription = prompt(
                                        "Enter caption for this image:",
                                        currentMedia.description || "",
                                      );
                                      if (newDescription === null) return;

                                      const updatedIdeas = JSON.parse(
                                        JSON.stringify(tradeIdeas),
                                      );
                                      const ideaIndex = updatedIdeas.findIndex(
                                        (idea) => idea.id === selectedIdeaId,
                                      );
                                      if (ideaIndex === -1) return;

                                      const mediaIndex = updatedIdeas[
                                        ideaIndex
                                      ].media_files.findIndex(
                                        (file) => file.id === currentMedia.id,
                                      );
                                      if (mediaIndex === -1) return;

                                      updatedIdeas[ideaIndex].media_files[
                                        mediaIndex
                                      ].description = newDescription;

                                      if (selectedMedia) {
                                        setSelectedMedia({
                                          ...selectedMedia,
                                          description: newDescription,
                                        });
                                      }

                                      // Update the description in the database
                                      supabase
                                        .from("trade_idea_media")
                                        .update({ description: newDescription })
                                        .eq("id", currentMedia.id)
                                        .then(({ error }) => {
                                          if (error) {
                                            console.error(
                                              "Error updating media description:",
                                              error,
                                            );
                                          } else {
                                            console.log(
                                              "Media description updated successfully",
                                            );
                                          }
                                        });

                                      setTradeIdeas(updatedIdeas);
                                      localStorage.setItem(
                                        "tradeIdeas",
                                        JSON.stringify(updatedIdeas),
                                      );
                                    }}
                                  >
                                    Edit Caption
                                  </Button>
                                </div>

                                {(selectedMedia?.description ||
                                  selectedIdea.media_files[0]?.description) && (
                                  <div className="bg-muted/30 p-3 rounded-md">
                                    <p className="text-sm whitespace-pre-line">
                                      {selectedMedia?.description ||
                                        selectedIdea.media_files[0]
                                          ?.description}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {selectedIdea.media_files.length > 1 && (
                              <div>
                                <h3 className="text-sm font-medium mb-2">
                                  Media Files
                                </h3>
                                <div className="grid grid-cols-6 gap-2">
                                  {selectedIdea.media_files.map((file) => (
                                    <div
                                      key={file.id}
                                      className={`cursor-pointer border-2 rounded-md overflow-hidden ${selectedMedia && selectedMedia.id === file.id ? "border-primary" : "border-transparent"}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        selectMedia(file);
                                      }}
                                    >
                                      {file.file_type === "image" ? (
                                        <img
                                          src={file.file_path}
                                          alt=""
                                          onError={(e) => {
                                            e.currentTarget.src =
                                              "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80";
                                            e.currentTarget.onerror = null;
                                          }}
                                          className="w-full h-16 object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-16 bg-muted flex items-center justify-center">
                                          <video
                                            src={file.file_path}
                                            className="w-full h-16 object-cover"
                                          />
                                        </div>
                                      )}
                                      {file.description && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                          {file.description}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Description
                      </h3>
                      <p className="whitespace-pre-line">
                        {selectedIdea.description}
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditIdea(selectedIdea)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteIdea(selectedIdea.id || "")}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center p-6">
                  <p className="text-muted-foreground">
                    Select an idea to view details
                  </p>
                </Card>
              )}
            </div>
          </div>
        ))}
    </div>
  );
};

export default TradeIdeasPage;
