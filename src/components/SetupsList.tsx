import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Tag,
  Image,
  Video,
} from "lucide-react";
import { fetchSetups, Setup, SetupMedia } from "@/models/Setup";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface SetupsListProps {
  onSelectSetup?: (setup: Setup) => void;
  selectedSetupId?: string;
  showAddButton?: boolean;
  compact?: boolean;
}

const SetupsList: React.FC<SetupsListProps> = ({
  onSelectSetup,
  selectedSetupId,
  showAddButton = true,
  compact = false,
}) => {
  const [setups, setSetups] = useState<Setup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSetup, setSelectedSetup] = useState<Setup | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SetupMedia | null>(null);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  // Fetch setups on component mount
  useEffect(() => {
    const loadSetups = async () => {
      setIsLoading(true);
      try {
        const setupsData = await fetchSetups();
        setSetups(setupsData);
      } catch (error) {
        console.error("Error loading setups:", error);
        toast({
          title: "Error",
          description: "Failed to load trading setups",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSetups();
  }, []);

  // Filter setups based on search query
  const filteredSetups = setups.filter((setup) => {
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase();
    const titleMatch = setup.title.toLowerCase().includes(searchLower);
    const descriptionMatch =
      setup.description?.toLowerCase().includes(searchLower) || false;
    const tagsMatch = setup.tags.some((tag) =>
      tag.toLowerCase().includes(searchLower),
    );

    return titleMatch || descriptionMatch || tagsMatch;
  });

  // View setup details
  const viewSetupDetails = (setup: Setup) => {
    setSelectedSetup(setup);
    setDetailsOpen(true);
  };

  // Handle setup selection
  const handleSelectSetup = (setup: Setup) => {
    if (onSelectSetup) {
      onSelectSetup(setup);
    }
  };

  return (
    <div className={`w-full ${compact ? "space-y-2" : "space-y-4"}`}>
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search setups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        {showAddButton && (
          <Button className="whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Add Setup
          </Button>
        )}
      </div>

      {/* Setups list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : filteredSetups.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery
            ? `No setups found matching "${searchQuery}"`
            : "No trading setups found"}
        </div>
      ) : (
        <div
          className={`grid ${compact ? "grid-cols-1 gap-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}`}
        >
          {filteredSetups.map((setup) => (
            <Card
              key={setup.id}
              className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${selectedSetupId === setup.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => handleSelectSetup(setup)}
            >
              <div className="relative">
                {setup.media.length > 0 && (
                  <div className="h-40 bg-muted">
                    {setup.media[0].type === "image" ? (
                      <img
                        src={setup.media[0].preview}
                        alt={setup.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Video className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    {setup.media.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-background/80 text-foreground px-2 py-1 rounded-md text-xs font-medium">
                        +{setup.media.length - 1} more
                      </div>
                    )}
                  </div>
                )}
              </div>
              <CardContent className={`${compact ? "p-3" : "p-4"}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3
                    className={`font-medium ${compact ? "text-sm" : "text-base"} truncate`}
                  >
                    {setup.title}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 ml-2 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewSetupDetails(setup);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                {!compact && setup.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {setup.description}
                  </p>
                )}
                {setup.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {setup.tags.slice(0, compact ? 2 : 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {setup.tags.length > (compact ? 2 : 3) && (
                      <Badge variant="outline" className="text-xs">
                        +{setup.tags.length - (compact ? 2 : 3)} more
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Image className="h-3 w-3 mr-1" />
                    {setup.media.length} media
                  </div>
                  <div className="mx-2">•</div>
                  <div>{new Date(setup.createdAt).toLocaleDateString()}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Setup Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedSetup && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSetup.title}</DialogTitle>
                <DialogDescription>
                  Created on{" "}
                  {new Date(selectedSetup.createdAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="media">
                    Media ({selectedSetup.media.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  {selectedSetup.description && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedSetup.description}
                      </p>
                    </div>
                  )}

                  {selectedSetup.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedSetup.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSetup.tradeId && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">
                        Related Trade
                      </h4>
                      <Button variant="outline" size="sm">
                        View Trade
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="media" className="mt-4">
                  {selectedSetup.media.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No media files available
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedSetup.media.map((media) => (
                        <div
                          key={media.id}
                          className="relative overflow-hidden rounded-md border cursor-pointer aspect-square"
                          onClick={() => {
                            setSelectedMedia(media);
                            setMediaModalOpen(true);
                          }}
                        >
                          {media.type === "image" ? (
                            <img
                              src={media.preview}
                              alt="Setup media"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Video className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <div className="flex justify-between w-full">
                  <Button variant="outline" size="sm" className="text-red-500">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setDetailsOpen(false)}
                    >
                      Close
                    </Button>
                    <Button>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Media Preview Modal */}
      <Dialog open={mediaModalOpen} onOpenChange={setMediaModalOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-background/95">
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMediaModalOpen(false)}
              className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </Button>
          </div>
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

export default SetupsList;
