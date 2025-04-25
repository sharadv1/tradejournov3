import React from "react";
import { MediaComment } from "@/models/TradeIdea";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MediaCommentsListProps {
  comments: MediaComment[];
}

const MediaCommentsList: React.FC<MediaCommentsListProps> = ({ comments }) => {
  if (!comments || comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground mt-2">No comments yet</p>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {comment.user_email
                ? comment.user_email.substring(0, 2).toUpperCase()
                : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {comment.user_email || "Anonymous"}
              </span>
              <span className="text-xs text-muted-foreground">
                {comment.created_at
                  ? formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })
                  : ""}
              </span>
            </div>
            <p className="text-sm mt-1">{comment.comment}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MediaCommentsList;
