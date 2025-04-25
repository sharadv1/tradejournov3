export interface TradeIdea {
  id?: string;
  user_id?: string;
  title: string;
  date: string;
  description: string;
  type: "Trade Idea" | "Missed Trade" | "No Trade";
  r_multiple?: number | null;
  media_files?: MediaFile[];
  created_at?: string;
  updated_at?: string;
}

export interface MediaFile {
  id?: string;
  trade_idea_id?: string;
  file_path: string;
  file_type: "image" | "video";
  created_at?: string;
  comments?: MediaComment[];
  description?: string;
  stored_in_supabase?: boolean;
  file_name?: string;
  // Track if this media has already been saved to the database
  already_in_database?: boolean;
}

export interface MediaFileWithPreview extends MediaFile {
  preview?: string;
  file?: File;
  uploading?: boolean;
  ideaId?: string; // Added to track which idea the media belongs to
}

export interface MediaComment {
  id?: string;
  media_id?: string;
  user_id?: string;
  comment: string;
  created_at?: string;
  updated_at?: string;
  user_email?: string; // For displaying who made the comment
}

export const tradeIdeaTypes = [
  "Trade Idea",
  "Missed Trade",
  "No Trade",
] as const;

export const rMultipleOptions = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5,
  10,
];
