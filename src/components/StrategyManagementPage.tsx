import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

// Define the Strategy interface
export interface Strategy {
  id: string;
  name: string;
  description: string;
}

// Fallback to localStorage if Supabase fails
const getStoredStrategies = (): Strategy[] => {
  const storedStrategies = localStorage.getItem("tradingStrategies");
  if (storedStrategies) {
    return JSON.parse(storedStrategies);
  }
  // Default strategies if none exist
  return [
    {
      id: "1",
      name: "Momentum",
      description: "Trading based on price momentum",
    },
    {
      id: "2",
      name: "Breakout",
      description: "Trading breakouts from consolidation",
    },
    { id: "3", name: "Reversal", description: "Trading market reversals" },
    {
      id: "4",
      name: "Trend Following",
      description: "Following established market trends",
    },
  ];
};

const StrategyManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [newStrategy, setNewStrategy] = useState<Partial<Strategy>>({
    name: "",
    description: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load strategies from Supabase on component mount
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("strategies")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      if (data) {
        // Transform the data to match our Strategy interface
        const formattedStrategies = data.map((strategy) => ({
          id: strategy.id,
          name: strategy.name,
          description: strategy.description || "",
        }));
        setStrategies(formattedStrategies);
      }
    } catch (error) {
      console.error("Error fetching strategies:", error);
      // Fallback to localStorage if Supabase fails
      setStrategies(getStoredStrategies());
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Strategy, value: string) => {
    setNewStrategy((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddStrategy = async () => {
    if (!newStrategy.name) {
      alert("Please enter a strategy name");
      return;
    }

    try {
      if (editingId) {
        // Update existing strategy in Supabase
        const { error } = await supabase
          .from("strategies")
          .update({
            name: newStrategy.name,
            description: newStrategy.description,
          })
          .eq("id", editingId);

        if (error) throw error;

        // Update local state
        setStrategies((prevStrategies) =>
          prevStrategies.map((strat) =>
            strat.id === editingId
              ? ({ ...newStrategy, id: editingId } as Strategy)
              : strat,
          ),
        );
      } else {
        // Add new strategy to Supabase
        const { data, error } = await supabase
          .from("strategies")
          .insert({
            name: newStrategy.name,
            description: newStrategy.description,
          })
          .select();

        if (error) throw error;

        // Update local state with the returned data
        if (data && data[0]) {
          const newStrategyWithId = {
            id: data[0].id,
            name: data[0].name,
            description: data[0].description || "",
          };
          setStrategies((prevStrategies) => [
            ...prevStrategies,
            newStrategyWithId,
          ]);
        }
      }

      // Reset form
      setNewStrategy({
        name: "",
        description: "",
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error saving strategy:", error);
      alert("Failed to save strategy. Please try again.");
    }
  };

  const handleEditStrategy = (strategy: Strategy) => {
    setNewStrategy(strategy);
    setEditingId(strategy.id);
  };

  const handleDeleteStrategy = async (id: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase.from("strategies").delete().eq("id", id);

      if (error) throw error;

      // Update local state
      setStrategies((prevStrategies) =>
        prevStrategies.filter((strat) => strat.id !== id),
      );

      // If deleting the strategy being edited, reset the form
      if (editingId === id) {
        setNewStrategy({
          name: "",
          description: "",
        });
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error deleting strategy:", error);
      alert("Failed to delete strategy. Please try again.");
    }
  };

  const handleCancel = () => {
    setNewStrategy({
      name: "",
      description: "",
    });
    setEditingId(null);
  };

  return (
    <div className="container mx-auto py-8 bg-background">
      <div className="flex items-center mb-6">
        <Button variant="ghost" className="mr-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Strategy Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit Strategy" : "Add New Strategy"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Strategy Name</Label>
                <Input
                  id="name"
                  placeholder="Momentum"
                  value={newStrategy.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Trading based on price momentum"
                  value={newStrategy.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                {editingId && (
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                )}
                <Button onClick={handleAddStrategy}>
                  {editingId ? "Update" : "Add Strategy"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Strategy List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">
                Loading strategies...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {strategies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        No strategies found. Add your first strategy.
                      </TableCell>
                    </TableRow>
                  ) : (
                    strategies.map((strategy) => (
                      <TableRow key={strategy.id}>
                        <TableCell className="font-medium">
                          {strategy.name}
                        </TableCell>
                        <TableCell>{strategy.description}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditStrategy(strategy)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStrategy(strategy.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StrategyManagementPage;
