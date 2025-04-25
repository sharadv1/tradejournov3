import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TradeIdeaDebugger = () => {
  const [localStorageKeys, setLocalStorageKeys] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<{ [key: string]: string }>({});
  const [tradeIdeas, setTradeIdeas] = useState<any>(null);

  useEffect(() => {
    // Collect all localStorage keys
    const keys: string[] = [];
    const mediaData: { [key: string]: string } = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);

        // If it's a media file, store its content
        if (key.startsWith("tradeIdea_media_")) {
          const value = localStorage.getItem(key);
          if (value) {
            mediaData[key] = value.substring(0, 50) + "...";
          }
        }
      }
    }

    setLocalStorageKeys(keys);
    setMediaFiles(mediaData);

    // Get the trade ideas
    const savedIdeas = localStorage.getItem("tradeIdeas");
    if (savedIdeas) {
      try {
        setTradeIdeas(JSON.parse(savedIdeas));
      } catch (error) {
        console.error("Error parsing saved trade ideas:", error);
      }
    }
  }, []);

  const clearAllTradeIdeas = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all trade ideas? This cannot be undone.",
      )
    ) {
      // First, remove all media files
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("tradeIdea_media_")) {
          localStorage.removeItem(key);
        }
      }

      // Then remove the trade ideas
      localStorage.removeItem("tradeIdeas");

      // Update state
      setLocalStorageKeys((prevKeys) =>
        prevKeys.filter(
          (key) => !key.startsWith("tradeIdea_media_") && key !== "tradeIdeas",
        ),
      );
      setMediaFiles({});
      setTradeIdeas(null);

      alert("All trade ideas have been cleared.");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Trade Idea Debugger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">
                LocalStorage Keys ({localStorageKeys.length})
              </h3>
              <div className="bg-muted p-4 rounded-md overflow-auto max-h-40">
                <pre className="text-xs">
                  {JSON.stringify(localStorageKeys, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">
                Media Files ({Object.keys(mediaFiles).length})
              </h3>
              <div className="bg-muted p-4 rounded-md overflow-auto max-h-40">
                <pre className="text-xs">
                  {JSON.stringify(mediaFiles, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Trade Ideas</h3>
              <div className="bg-muted p-4 rounded-md overflow-auto max-h-60">
                <pre className="text-xs">
                  {JSON.stringify(tradeIdeas, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="destructive" onClick={clearAllTradeIdeas}>
                Clear All Trade Ideas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeIdeaDebugger;
