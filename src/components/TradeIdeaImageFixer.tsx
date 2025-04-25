import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TradeIdeaImageFixer = () => {
  const [tradeIdeas, setTradeIdeas] = useState<any[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    loadTradeIdeas();
  }, []);

  useEffect(() => {
    if (selectedIdeaId) {
      const idea = tradeIdeas.find((idea) => idea.id === selectedIdeaId);
      setSelectedIdea(idea || null);
      setSelectedMediaId(null);
      setImageUrl("");
    } else {
      setSelectedIdea(null);
    }
  }, [selectedIdeaId, tradeIdeas]);

  const loadTradeIdeas = () => {
    try {
      const savedIdeas = localStorage.getItem("tradeIdeas");
      if (savedIdeas) {
        const parsedIdeas = JSON.parse(savedIdeas);
        setTradeIdeas(parsedIdeas);
        setStatus("Loaded " + parsedIdeas.length + " trade ideas");
      } else {
        setStatus("No trade ideas found in localStorage");
      }
    } catch (error) {
      console.error("Error loading trade ideas:", error);
      setStatus("Error loading trade ideas");
    }
  };

  const handleSelectMedia = (mediaId: string) => {
    setSelectedMediaId(mediaId);
    // Try to get the current image URL from localStorage
    const currentUrl = localStorage.getItem(`tradeIdea_media_${mediaId}`);
    setImageUrl(currentUrl || "");
  };

  const handleSaveImage = () => {
    if (!selectedMediaId || !imageUrl.trim()) {
      setStatus("Please select a media file and enter an image URL");
      return;
    }

    try {
      // Save the image URL to localStorage
      localStorage.setItem(`tradeIdea_media_${selectedMediaId}`, imageUrl);
      setStatus(`Image URL saved for media ID: ${selectedMediaId}`);

      // Force reload of trade ideas to see the change
      loadTradeIdeas();
    } catch (error) {
      console.error("Error saving image URL:", error);
      setStatus("Error saving image URL");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Trade Idea Image Fixer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Select Trade Idea</h3>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-auto">
                {tradeIdeas.map((idea) => (
                  <Button
                    key={idea.id}
                    variant={selectedIdeaId === idea.id ? "default" : "outline"}
                    className="justify-start text-left h-auto py-2"
                    onClick={() => setSelectedIdeaId(idea.id)}
                  >
                    <div>
                      <div className="font-medium">{idea.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {idea.date} • {idea.type} •
                        {idea.media_files?.length || 0} media files
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {selectedIdea && (
              <div>
                <h3 className="text-lg font-medium mb-2">Select Media File</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-auto">
                  {selectedIdea.media_files?.map((media: any) => (
                    <Button
                      key={media.id}
                      variant={
                        selectedMediaId === media.id ? "default" : "outline"
                      }
                      className="justify-start text-left h-auto py-2"
                      onClick={() => handleSelectMedia(media.id)}
                    >
                      <div>
                        <div className="font-medium">Media ID: {media.id}</div>
                        <div className="text-xs text-muted-foreground">
                          Type: {media.file_type}
                          {media.description && ` • ${media.description}`}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {selectedMediaId && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Enter image URL"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter a direct URL to an image (e.g.,
                    https://example.com/image.jpg)
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveImage}>Save Image URL</Button>
                </div>
              </div>
            )}

            {status && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">{status}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeIdeaImageFixer;
