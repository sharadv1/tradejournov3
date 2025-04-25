import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { X, Loader2, Maximize2, XCircle, BookmarkPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SetupsList from "@/components/SetupsList";

interface NotesTabProps {
  notes: string;
  mediaFiles?: MediaFile[];
  tradeId?: string;
  handleChange: (field: string, value: string) => void;
  handleMediaUpload?: (files: MediaFile[]) => void;
  selectedSetupIds?: string[];
  onSetupSelect?: (setupIds: string[]) => void;
}

export interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
  filePath?: string;
  fileName?: string;
  uploaded?: boolean;
  uploading?: boolean;
}

const NotesTab: React.FC<NotesTabProps> = ({
  notes,
  mediaFiles = [],
  tradeId,
  handleChange,
  handleMediaUpload = () => {},
  selectedSetupIds = [],
  onSetupSelect = () => {},
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localMediaFiles, setLocalMediaFiles] =
    useState<MediaFile[]>(mediaFiles);
  const [bucketInitialized, setBucketInitialized] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [setupsDialogOpen, setSetupsDialogOpen] = useState(false);

  // Initialize bucket on component mount
  useEffect(() => {
    const initializeBucket = async () => {
      try {
        // Instead of creating the bucket, check if we can access it
        const { data: buckets, error: listError } =
          await supabase.storage.listBuckets();

        if (!listError) {
          // Check if media bucket exists in the list
          const mediaBucket = buckets.find((bucket) => bucket.name === "media");

          if (mediaBucket) {
            console.log("Media bucket exists and is accessible");
            setBucketInitialized(true);
            return;
          }

          // If we don't find the bucket but have permission to list buckets,
          // we might have permission to create it
          try {
            const { data: createData, error: createError } =
              await supabase.storage.createBucket("media", {
                public: true,
                fileSizeLimit: 10485760, // 10MB
              });

            if (!createError) {
              console.log("Bucket created successfully");
              setBucketInitialized(true);
              return;
            }

            console.error("Error creating bucket:", createError);
            toast({
              title: "Storage Setup Error",
              description:
                "There was an issue setting up file storage. Please contact an administrator.",
              variant: "destructive",
            });
          } catch (createError) {
            console.error("Unexpected error creating bucket:", createError);
          }
        } else if (listError.message.includes("Permission denied")) {
          // If we can't list buckets due to permissions, try to use the bucket anyway
          // It might already exist and we might have permission to use it but not list/create
          console.log(
            "Cannot list buckets, but will try to use media bucket anyway",
          );
          setBucketInitialized(true);
        } else {
          console.error("Error listing buckets:", listError);
          toast({
            title: "Storage Access Error",
            description:
              "Unable to access file storage. Please try again later.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Unexpected error initializing bucket:", error);
        // Even if there's an error, we'll try to use the bucket anyway
        // It might work for uploads if the bucket already exists
        setBucketInitialized(true);
      }
    };

    initializeBucket();
  }, []);

  // Update local files when mediaFiles prop changes
  useEffect(() => {
    console.log("NotesTab: mediaFiles prop changed:", mediaFiles);
    if (mediaFiles && mediaFiles.length > 0) {
      console.log("Setting local media files with:", mediaFiles);
      // Ensure all media files have valid preview URLs
      const validMediaFiles = mediaFiles.map((file) => {
        if (!file.preview && file.filePath) {
          // If preview is missing but we have a filePath, generate the URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("media").getPublicUrl(file.filePath);
          console.log(
            `Generated missing preview URL for ${file.fileName || "unnamed file"}:`,
            publicUrl,
          );
          return { ...file, preview: publicUrl };
        }
        return file;
      });
      setLocalMediaFiles(validMediaFiles);
    } else {
      // Reset local media files when the prop is empty
      console.log("Resetting local media files as prop is empty");
      setLocalMediaFiles([]);
    }
  }, [mediaFiles]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const uploadFileToSupabase = async (file: MediaFile): Promise<MediaFile> => {
    if (!file.file) {
      toast({
        title: "Upload Error",
        description: "Invalid file. Please try again.",
        variant: "destructive",
      });
      return { ...file, uploading: false };
    }

    if (!bucketInitialized) {
      toast({
        title: "Upload Error",
        description: "Storage is not ready. Please try again later.",
        variant: "destructive",
      });
      return { ...file, uploading: false };
    }

    // Mark file as uploading
    const updatedFile = { ...file, uploading: true };

    try {
      // Create a unique file path
      const fileName = `${Date.now()}-${file.file.name.replace(/\s+/g, "-")}`;
      const filePath = tradeId
        ? `trades/${tradeId}/${fileName}`
        : `trades/temp/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from("media")
        .upload(filePath, file.file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Error uploading file:", error);
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.file.name}: ${error.message}`,
          variant: "destructive",
        });
        return { ...updatedFile, uploading: false };
      }

      // Get public URL for the file
      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(filePath);

      // Return updated file with storage info
      return {
        ...updatedFile,
        filePath,
        fileName,
        preview: publicUrl,
        uploaded: true,
        uploading: false,
      };
    } catch (error) {
      console.error("Unexpected error uploading file:", error);
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      });
      return { ...updatedFile, uploading: false };
    }
  };

  const handleFiles = async (fileList: FileList) => {
    if (!bucketInitialized) {
      toast({
        title: "Storage Not Ready",
        description:
          "File storage is initializing. Please try again in a moment.",
        variant: "warning",
      });
      return;
    }

    const newFiles: MediaFile[] = [];

    // First create local previews for immediate display
    Array.from(fileList).forEach((file) => {
      // Only accept images and videos
      if (!file.type.match("image.*") && !file.type.match("video.*")) {
        return;
      }

      const fileType = file.type.match("image.*") ? "image" : "video";
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          const newFile: MediaFile = {
            id: `${file.name}-${Date.now()}`,
            file,
            preview: e.target.result as string,
            type: fileType,
            uploading: true,
          };

          // Add to local state first for immediate feedback
          const updatedFiles = [...localMediaFiles, newFile];
          setLocalMediaFiles(updatedFiles);

          // Then start the upload process
          uploadFileToSupabase(newFile).then((uploadedFile) => {
            // Update the file with upload info
            const filesWithUploadedFile = updatedFiles.map((f) =>
              f.id === newFile.id ? uploadedFile : f,
            );
            setLocalMediaFiles(filesWithUploadedFile);
            handleMediaUpload(filesWithUploadedFile);
          });
        }
      };

      reader.readAsDataURL(file);
      newFiles.push({
        id: `${file.name}-${Date.now()}`,
        file,
        preview: "",
        type: fileType,
      });
    });
  };

  const removeFile = async (id: string) => {
    // Find the file to remove
    const fileToRemove = localMediaFiles.find((file) => file.id === id);

    // Remove from local state first for immediate feedback
    const updatedFiles = localMediaFiles.filter((file) => file.id !== id);
    setLocalMediaFiles(updatedFiles);
    handleMediaUpload(updatedFiles);

    // If the file was uploaded to Supabase, delete it from storage
    if (fileToRemove?.filePath && bucketInitialized) {
      try {
        const { error } = await supabase.storage
          .from("media")
          .remove([fileToRemove.filePath]);

        if (error) {
          console.error("Error deleting file from storage:", error);
          toast({
            title: "Delete Failed",
            description: `File removed from view but could not be deleted from storage: ${error.message}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Unexpected error deleting file:", error);
      }
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add your trade notes here..."
          className="min-h-[100px]"
          value={notes}
          onChange={(e) => handleChange("notes", e.target.value)}
        />
      </div>

      <div
        className={`border-2 border-dashed rounded-md p-4 text-center ${isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*"
          multiple
          onChange={handleFileInputChange}
        />
        <p className="text-sm text-muted-foreground">
          Drag and drop images or videos here, or click to select files
        </p>
      </div>

      {localMediaFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {localMediaFiles.map((file) => (
            <Card
              key={file.id}
              className="relative overflow-hidden group cursor-pointer"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.id);
                }}
                className="absolute top-1 right-1 bg-background/80 rounded-full p-1 z-10"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedMedia(file);
                  setModalOpen(true);
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
                  setModalOpen(true);
                }}
              >
                {file.type === "image" ? (
                  <img
                    src={file.preview}
                    alt="Uploaded"
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <video
                    src={file.preview}
                    className="w-full h-32 object-cover"
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Image/Video Preview Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-background/95">
          <DialogClose className="absolute right-4 top-4 z-10">
            <XCircle className="h-6 w-6 text-white bg-black/50 rounded-full" />
          </DialogClose>
          <div className="flex items-center justify-center w-full h-full p-4">
            {selectedMedia?.type === "image" ? (
              <img
                src={selectedMedia?.preview}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : (
              <video
                src={selectedMedia?.preview}
                controls
                autoPlay
                className="max-w-full max-h-[80vh]"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotesTab;
