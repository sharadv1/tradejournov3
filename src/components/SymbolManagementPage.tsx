import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

// Define the Symbol interface
export interface TradingSymbol {
  id: string;
  symbol: string;
  name: string;
  type: string;
  tickSize?: number;
  tickValue?: number;
  contractSize?: number;
}

// Default symbols if none exist
const DEFAULT_SYMBOLS: TradingSymbol[] = [
  { id: "1", symbol: "AAPL", name: "Apple Inc.", type: "stock" },
  { id: "2", symbol: "MSFT", name: "Microsoft Corporation", type: "stock" },
  { id: "3", symbol: "GOOGL", name: "Alphabet Inc.", type: "stock" },
  { id: "4", symbol: "AMZN", name: "Amazon.com, Inc.", type: "stock" },
  { id: "5", symbol: "TSLA", name: "Tesla, Inc.", type: "stock" },
  { id: "6", symbol: "BTC", name: "Bitcoin", type: "crypto" },
  { id: "7", symbol: "ETH", name: "Ethereum", type: "crypto" },
  { id: "8", symbol: "ES", name: "E-mini S&P 500", type: "futures" },
  { id: "9", symbol: "NQ", name: "E-mini NASDAQ-100", type: "futures" },
  { id: "10", symbol: "EUR/USD", name: "Euro/US Dollar", type: "forex" },
];

// Fallback to localStorage if Supabase fails
const LOCAL_STORAGE_KEY = "tradingSymbols";

const getStoredSymbols = (): TradingSymbol[] => {
  const storedSymbols = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedSymbols) {
    return JSON.parse(storedSymbols);
  }
  return DEFAULT_SYMBOLS;
};

const saveSymbols = (symbols: TradingSymbol[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(symbols));
};

const SymbolManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState<TradingSymbol[]>([]);
  const [allSymbols, setAllSymbols] = useState<TradingSymbol[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newSymbol, setNewSymbol] = useState<Partial<TradingSymbol>>({
    symbol: "",
    name: "",
    type: "stock",
    tickSize: undefined,
    tickValue: undefined,
    contractSize: undefined,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load symbols from Supabase on component mount
    fetchSymbols();
  }, []);

  // Filter symbols when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSymbols(allSymbols);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allSymbols.filter(
        (symbol) =>
          symbol.symbol.toLowerCase().includes(query) ||
          symbol.name.toLowerCase().includes(query) ||
          symbol.type.toLowerCase().includes(query),
      );
      setSymbols(filtered);
    }
  }, [searchQuery, allSymbols]);

  const fetchSymbols = async () => {
    try {
      setIsLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        console.log("No user found, using default symbols");
        const defaultSymbols = getStoredSymbols();
        setSymbols(defaultSymbols);
        setAllSymbols(defaultSymbols);
        return;
      }

      const { data, error } = await supabase
        .from("symbols")
        .select("*")
        .eq("user_id", user.id)
        .order("symbol");

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Transform the data to match our TradingSymbol interface
        const formattedSymbols = data.map((symbol) => ({
          id: symbol.id,
          symbol: symbol.symbol,
          name: symbol.name,
          type: symbol.type,
          tickSize: symbol.tick_size,
          tickValue: symbol.tick_value,
          contractSize: symbol.contract_size,
        }));
        setSymbols(formattedSymbols);
        setAllSymbols(formattedSymbols);
      } else {
        // If no symbols found in Supabase, use default symbols
        const defaultSymbols = getStoredSymbols();
        setSymbols(defaultSymbols);
        setAllSymbols(defaultSymbols);
      }
    } catch (error) {
      console.error("Error fetching symbols:", error);
      // Fallback to localStorage if Supabase fails
      const defaultSymbols = getStoredSymbols();
      setSymbols(defaultSymbols);
      setAllSymbols(defaultSymbols);
      toast({
        title: "Error",
        description: "There was an error fetching your symbols",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof TradingSymbol, value: string) => {
    setNewSymbol((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddSymbol = async () => {
    if (!newSymbol.symbol || !newSymbol.name || !newSymbol.type) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast({
          title: "Authentication error",
          description: "You must be logged in to add symbols",
          variant: "destructive",
        });
        return;
      }

      if (editingId) {
        // Update existing symbol in Supabase
        const { error } = await supabase
          .from("symbols")
          .update({
            symbol: newSymbol.symbol,
            name: newSymbol.name,
            type: newSymbol.type,
            tick_size: newSymbol.tickSize,
            tick_value: newSymbol.tickValue,
            contract_size: newSymbol.contractSize,
          })
          .eq("id", editingId);

        if (error) throw error;

        // Update local state
        const updatedSymbol = { ...newSymbol, id: editingId } as TradingSymbol;
        setAllSymbols((prevSymbols) =>
          prevSymbols.map((sym) =>
            sym.id === editingId ? updatedSymbol : sym,
          ),
        );

        // If search is active, also update the filtered symbols
        if (searchQuery) {
          setSymbols((prevSymbols) =>
            prevSymbols.map((sym) =>
              sym.id === editingId ? updatedSymbol : sym,
            ),
          );
        }
      } else {
        // Add new symbol to Supabase
        const { data, error } = await supabase
          .from("symbols")
          .insert({
            symbol: newSymbol.symbol,
            name: newSymbol.name,
            type: newSymbol.type,
            tick_size: newSymbol.tickSize,
            tick_value: newSymbol.tickValue,
            contract_size: newSymbol.contractSize,
            user_id: user.id,
          })
          .select();

        if (error) throw error;

        // Fetch the complete updated list from Supabase to ensure consistency
        const { data: refreshedData, error: refreshError } = await supabase
          .from("symbols")
          .select("*")
          .eq("user_id", user.id)
          .order("symbol");

        if (refreshError) {
          console.error("Error refreshing symbols after save:", refreshError);
          // Fall back to local state update if refresh fails
          const updatedSymbols = editingId
            ? allSymbols.map((sym) =>
                sym.id === editingId
                  ? ({ ...newSymbol, id: editingId } as TradingSymbol)
                  : sym,
              )
            : [
                ...allSymbols,
                {
                  ...newSymbol,
                  id: data && data[0] ? data[0].id : `temp-${Date.now()}`,
                } as TradingSymbol,
              ];

          // Save to localStorage
          saveSymbols(updatedSymbols);

          // Dispatch a custom event to notify other components about the symbol change
          const symbolChangeEvent = new CustomEvent("symbolsUpdated", {
            detail: { symbols: updatedSymbols },
          });
          window.dispatchEvent(symbolChangeEvent);
        } else if (refreshedData) {
          // Transform the refreshed data to match our TradingSymbol interface
          const formattedSymbols = refreshedData.map((symbol) => ({
            id: symbol.id,
            symbol: symbol.symbol,
            name: symbol.name,
            type: symbol.type,
            tickSize: symbol.tick_size,
            tickValue: symbol.tick_value,
            contractSize: symbol.contract_size,
          }));

          // Update local state with the refreshed data
          setAllSymbols(formattedSymbols);
          if (!searchQuery) {
            setSymbols(formattedSymbols);
          } else {
            // Apply current search filter to the refreshed data
            const query = searchQuery.toLowerCase();
            const filtered = formattedSymbols.filter(
              (symbol) =>
                symbol.symbol.toLowerCase().includes(query) ||
                symbol.name.toLowerCase().includes(query) ||
                symbol.type.toLowerCase().includes(query),
            );
            setSymbols(filtered);
          }

          // Save to localStorage
          saveSymbols(formattedSymbols);

          // Dispatch a custom event to notify other components about the symbol change
          const symbolChangeEvent = new CustomEvent("symbolsUpdated", {
            detail: { symbols: formattedSymbols },
          });
          window.dispatchEvent(symbolChangeEvent);
        }
      }

      // Reset form
      setNewSymbol({
        symbol: "",
        name: "",
        type: "stock",
        tickSize: undefined,
        tickValue: undefined,
        contractSize: undefined,
      });
      setEditingId(null);

      toast({
        title: editingId ? "Symbol updated" : "Symbol added",
        description: editingId
          ? `${newSymbol.symbol} has been updated`
          : `${newSymbol.symbol} has been added to your symbols`,
      });
    } catch (error) {
      console.error("Error saving symbol:", error);
      toast({
        title: "Error",
        description: "Failed to save symbol. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditSymbol = (symbol: TradingSymbol) => {
    setNewSymbol(symbol);
    setEditingId(symbol.id);
  };

  const handleDeleteSymbol = async (id: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase.from("symbols").delete().eq("id", id);

      if (error) throw error;

      // Update local state
      const updatedSymbols = allSymbols.filter((sym) => sym.id !== id);
      setAllSymbols(updatedSymbols);
      setSymbols((prevSymbols) => prevSymbols.filter((sym) => sym.id !== id));

      // Update localStorage with the filtered symbols
      saveSymbols(updatedSymbols);

      // Dispatch a custom event to notify other components about the symbol change
      const symbolChangeEvent = new CustomEvent("symbolsUpdated", {
        detail: { symbols: updatedSymbols },
      });
      window.dispatchEvent(symbolChangeEvent);

      // If deleting the symbol being edited, reset the form
      if (editingId === id) {
        setNewSymbol({
          symbol: "",
          name: "",
          type: "stock",
          tickSize: undefined,
          tickValue: undefined,
          contractSize: undefined,
        });
        setEditingId(null);
      }

      toast({
        title: "Symbol deleted",
        description: "The symbol has been removed from your list",
      });
    } catch (error) {
      console.error("Error deleting symbol:", error);
      toast({
        title: "Error",
        description: "Failed to delete symbol. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setNewSymbol({
      symbol: "",
      name: "",
      type: "stock",
      tickSize: undefined,
      tickValue: undefined,
      contractSize: undefined,
    });
    setEditingId(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="container mx-auto py-8 bg-background">
      <div className="flex items-center mb-6">
        <Button variant="ghost" className="mr-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Symbol Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit Symbol" : "Add New Symbol"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="AAPL"
                  value={newSymbol.symbol}
                  onChange={(e) => handleInputChange("symbol", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Apple Inc."
                  value={newSymbol.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newSymbol.type}
                  onValueChange={(value) => handleInputChange("type", value)}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="futures">Futures</SelectItem>
                    <SelectItem value="forex">Forex</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="options">Options</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newSymbol.type === "futures" && (
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="tickSize">Tick Size</Label>
                    <Input
                      id="tickSize"
                      type="number"
                      step="0.0001"
                      placeholder="0.25"
                      value={newSymbol.tickSize || ""}
                      onChange={(e) =>
                        handleInputChange("tickSize", e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum price movement (e.g., 0.25 for ES)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tickValue">Tick Value</Label>
                    <Input
                      id="tickValue"
                      type="number"
                      step="0.01"
                      placeholder="12.50"
                      value={newSymbol.tickValue || ""}
                      onChange={(e) =>
                        handleInputChange("tickValue", e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Dollar value per tick (e.g., $12.50 for ES)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contractSize">Contract Size</Label>
                    <Input
                      id="contractSize"
                      type="number"
                      placeholder="1"
                      value={newSymbol.contractSize || ""}
                      onChange={(e) =>
                        handleInputChange("contractSize", e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Size of one contract
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                {editingId && (
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                )}
                <Button onClick={handleAddSymbol}>
                  {editingId ? "Update" : "Add Symbol"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Symbol List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 relative">
              <Input
                placeholder="Search symbols..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            {isLoading ? (
              <div className="flex justify-center p-4">Loading symbols...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {symbols.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        {searchQuery
                          ? "No matching symbols found."
                          : "No symbols found. Add your first symbol."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    symbols.map((symbol) => (
                      <TableRow key={symbol.id}>
                        <TableCell className="font-medium">
                          {symbol.symbol}
                        </TableCell>
                        <TableCell>{symbol.name}</TableCell>
                        <TableCell className="capitalize">
                          {symbol.type}
                        </TableCell>
                        <TableCell>
                          {symbol.type === "futures" && (
                            <>
                              {symbol.tickSize && `Tick: ${symbol.tickSize}`}
                              {symbol.tickValue &&
                                `, Tick Value: $${symbol.tickValue}`}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSymbol(symbol)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSymbol(symbol.id)}
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

export default SymbolManagementPage;
