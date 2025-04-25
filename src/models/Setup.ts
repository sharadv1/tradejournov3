import { supabase } from "@/lib/supabase";

export interface SetupMedia {
  id: string;
  setupId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  preview?: string;
  file?: File;
  type?: "image" | "video";
  uploaded?: boolean;
  uploading?: boolean;
}

export interface Setup {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  tags: string[];
  tradeId: string | null;
  createdAt: string;
  updatedAt: string;
  media: SetupMedia[];
}

export interface CreateSetupParams {
  title: string;
  description?: string;
  tags?: string[];
  tradeId?: string;
  media?: (File | SetupMedia)[];
}

export interface UpdateSetupParams {
  title?: string;
  description?: string;
  tags?: string[];
  tradeId?: string;
  media?: (File | SetupMedia)[];
}

export const fetchSetups = async (userId?: string): Promise<Setup[]> => {
  try {
    const { data, error } = await supabase
      .from("setups")
      .select(`*, setup_media(*)`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((setup: any) => ({
      id: setup.id,
      userId: setup.user_id,
      title: setup.title,
      description: setup.description,
      tags: setup.tags || [],
      tradeId: setup.trade_id,
      createdAt: setup.created_at,
      updatedAt: setup.updated_at,
      media: setup.setup_media
        ? setup.setup_media.map((media: any) => ({
            id: media.id,
            setupId: media.setup_id,
            fileName: media.file_name,
            filePath: media.file_path,
            fileType: media.file_type,
            preview: supabase.storage
              .from("media")
              .getPublicUrl(media.file_path).data.publicUrl,
            type: media.file_type.startsWith("image/") ? "image" : "video",
          }))
        : [],
    }));
  } catch (error) {
    console.error("Error fetching setups:", error);
    return [];
  }
};

export const fetchSetupById = async (id: string): Promise<Setup | null> => {
  try {
    const { data, error } = await supabase
      .from("setups")
      .select(`*, setup_media(*)`)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      tags: data.tags || [],
      tradeId: data.trade_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      media: data.setup_media
        ? data.setup_media.map((media: any) => ({
            id: media.id,
            setupId: media.setup_id,
            fileName: media.file_name,
            filePath: media.file_path,
            fileType: media.file_type,
            preview: supabase.storage
              .from("media")
              .getPublicUrl(media.file_path).data.publicUrl,
            type: media.file_type.startsWith("image/") ? "image" : "video",
          }))
        : [],
    };
  } catch (error) {
    console.error("Error fetching setup by ID:", error);
    return null;
  }
};
