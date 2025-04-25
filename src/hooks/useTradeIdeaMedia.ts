import { useState } from "react";
import { MediaFile, MediaFileWithPreview } from "@/models/TradeIdea";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

// Helper function to check if a string is a data URL
const isDataUrl = (url: string): boolean => {
  return url.startsWith("data:");
};

// Helper function to convert data URL to Blob
const dataURLtoBlob = (dataURL: string): Blob => {
  // Split the data URL to get the content type and base64 data
  const parts = dataURL.split(";base64,");
  if (parts.length !== 2) {
    throw new Error("Invalid data URL format");
  }

  const contentType = parts[0].split(":")[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
};

// Helper function to generate a unique filename
const generateUniqueFilename = (
  file: File | Blob,
  fileType: string,
): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 9);
  const extension = fileType === "image" ? "jpg" : "mp4";
  return `${timestamp}-${randomString}.${extension}`;
};

// Helper function to upload a file to Supabase storage
const uploadFileToSupabase = async (
  file: File | Blob,
  fileType: string,
  ideaId: string,
): Promise<{ filePath: string; fileName: string } | null> => {
  try {
    // Generate a unique filename
    const fileName = generateUniqueFilename(file, fileType);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("media")
      .upload(`trade_ideas/${ideaId}/${fileName}`, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: fileType === "image" ? "image/jpeg" : "video/mp4",
      });

    if (error) {
      console.error("Error uploading file to Supabase:", error);
      return null;
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from("media")
      .getPublicUrl(`trade_ideas/${ideaId}/${fileName}`);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("Failed to get public URL for uploaded file");
      return null;
    }

    return {
      filePath: publicUrlData.publicUrl,
      fileName: fileName,
    };
  } catch (error) {
    console.error("Unexpected error uploading file:", error);
    return null;
  }
};

export interface UseTradeIdeaMediaReturn {
  mediaFiles: MediaFileWithPreview[];
  setMediaFiles: React.Dispatch<React.SetStateAction<MediaFileWithPreview[]>>;
  selectedMedia: MediaFileWithPreview | null;
  setSelectedMedia: React.Dispatch<
    React.SetStateAction<MediaFileWithPreview | null>
  >;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: HTMLInputElement | null;
  setFileInputRef: React.Dispatch<
    React.SetStateAction<HTMLInputElement | null>
  >;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFiles: (files: File[]) => void;
  openFileDialog: () => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (fileId: string) => void;
  selectMedia: (mediaFile: MediaFile) => void;
  processMediaFiles: (
    mediaFiles: MediaFileWithPreview[],
    ideaId: string,
    userId?: string,
  ) => Promise<MediaFile[]>;
}

export const useTradeIdeaMedia = (): UseTradeIdeaMediaReturn => {
  const [mediaFiles, setMediaFiles] = useState<MediaFileWithPreview[]>([]);
  const [selectedMedia, setSelectedMedia] =
    useState<MediaFileWithPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(
    null,
  );

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
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const newMediaFiles = files.map((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const fileType = isImage ? "image" : isVideo ? "video" : "image";

      // Create a proper UUID for this file
      const uniqueId = uuidv4();

      return {
        id: uniqueId,
        file,
        file_type: fileType as "image" | "video",
        file_path: "",
        uploading: true,
        description: "",
      };
    });

    // Add the files to state immediately
    setMediaFiles((prev) => [...prev, ...newMediaFiles]);

    // Then process each file to create data URLs
    newMediaFiles.forEach((mediaFile) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        // Update the file_path with the data URL
        setMediaFiles((current) => {
          return current.map((file) => {
            if (file.id === mediaFile.id) {
              return { ...file, file_path: dataUrl, uploading: false };
            }
            return file;
          });
        });
      };
      reader.readAsDataURL(mediaFile.file as File);
    });
  };

  const openFileDialog = () => {
    if (fileInputRef) {
      fileInputRef.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const removeFile = (fileId: string) => {
    setMediaFiles(mediaFiles.filter((file) => file.id !== fileId));
  };

  const selectMedia = (mediaFile: MediaFile) => {
    // Create a completely new object to avoid reference issues
    const mediaToSelect = {
      ...mediaFile,
      id: mediaFile.id,
      file_path: mediaFile.file_path,
      file_type: mediaFile.file_type,
      description: mediaFile.description || "",
    };

    // Force a re-render by using a timeout
    setTimeout(() => {
      setSelectedMedia(mediaToSelect);
    }, 0);
  };

  // Process media files for saving to database
  const processMediaFiles = async (
    mediaFilesToProcess: MediaFileWithPreview[],
    ideaId: string,
    userId?: string,
  ): Promise<MediaFile[]> => {
    // Filter out any media files that are still uploading or have empty paths
    const validMediaFiles = mediaFilesToProcess.filter(
      (file) => !file.uploading && file.file_path && file.file_path.length > 0,
    );

    const processedMediaFiles: MediaFile[] = [];

    // Process each media file
    for (const file of validMediaFiles) {
      let mediaFile: MediaFile;

      // If it's a data URL and we have a user, upload to Supabase
      if (isDataUrl(file.file_path) && userId) {
        try {
          // Convert data URL to blob
          const blob = dataURLtoBlob(file.file_path);

          // Upload to Supabase
          const uploadResult = await uploadFileToSupabase(
            blob,
            file.file_type,
            ideaId,
          );

          if (uploadResult) {
            // Create media file with Supabase URL
            mediaFile = {
              id: file.id || uuidv4(),
              file_path: uploadResult.filePath,
              file_type: file.file_type,
              description: file.description || "",
              stored_in_supabase: true,
              file_name: uploadResult.fileName,
            };
          } else {
            // Fallback to localStorage if upload fails
            const fileId = file.id || uuidv4();
            try {
              localStorage.setItem(`tradeIdea_media_${fileId}`, file.file_path);
            } catch (error) {
              console.error("Error storing media file in localStorage:", error);
            }

            mediaFile = {
              id: fileId,
              file_path: file.file_path,
              file_type: file.file_type,
              description: file.description || "",
              stored_in_supabase: false,
            };
          }
        } catch (error) {
          console.error("Error processing media file for Supabase:", error);

          // Fallback to localStorage
          const fileId = file.id || uuidv4();
          try {
            localStorage.setItem(`tradeIdea_media_${fileId}`, file.file_path);
          } catch (storageError) {
            console.error(
              "Error storing media file in localStorage:",
              storageError,
            );
          }

          mediaFile = {
            id: fileId,
            file_path: file.file_path,
            file_type: file.file_type,
            description: file.description || "",
            stored_in_supabase: false,
          };
        }
      } else {
        // Not a data URL or no user - use as is (might be an already uploaded file or external URL)
        // For localStorage files, ensure they're stored
        if (isDataUrl(file.file_path) && !file.stored_in_supabase) {
          const fileId = file.id || uuidv4();
          try {
            localStorage.setItem(`tradeIdea_media_${fileId}`, file.file_path);
          } catch (error) {
            console.error("Error storing media file in localStorage:", error);
          }

          mediaFile = {
            id: fileId,
            file_path: file.file_path,
            file_type: file.file_type,
            description: file.description || "",
            stored_in_supabase: false,
          };
        } else {
          // Already stored file (either in Supabase or external URL)
          mediaFile = {
            id: file.id || uuidv4(),
            file_path: file.file_path,
            file_type: file.file_type,
            description: file.description || "",
            stored_in_supabase: file.stored_in_supabase || false,
            file_name: file.file_name,
            trade_idea_id: file.trade_idea_id,
            already_in_database:
              file.already_in_database || file.stored_in_supabase,
          };
        }
      }

      processedMediaFiles.push(mediaFile);
    }

    return processedMediaFiles;
  };

  return {
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
  };
};
