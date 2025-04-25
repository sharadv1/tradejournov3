import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addMediaComment } from "@/lib/supabase";
import { MediaComment } from "@/models/TradeIdea";

interface MediaCommentFormProps {
  mediaId: string;
  onCommentAdded: (comment: MediaComment) => void;
}

const MediaCommentForm: React.FC<MediaCommentFormProps> = ({
  mediaId,
  onCommentAdded,
}) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      const newComment = await addMediaComment(mediaId, comment);
      if (newComment) {
        onCommentAdded(newComment);
        setComment("");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment..."
        className="min-h-[80px]"
      />
      <div className="flex justify-end mt-2">
        <Button
          type="submit"
          disabled={!comment.trim() || isSubmitting}
          size="sm"
        >
          {isSubmitting ? "Posting..." : "Post Comment"}
        </Button>
      </div>
    </form>
  );
};

export default MediaCommentForm;
