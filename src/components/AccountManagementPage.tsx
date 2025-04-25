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

// Define the Account interface
export interface Account {
  id: string;
  name: string;
  description: string;
}

const AccountManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newAccount, setNewAccount] = useState<Partial<Account>>({
    name: "",
    description: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load accounts from Supabase on component mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      if (data) {
        // Transform the data to match our Account interface
        const formattedAccounts = data.map((account) => ({
          id: account.id,
          name: account.name,
          description: account.description || "",
        }));
        setAccounts(formattedAccounts);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      // Fallback to localStorage if Supabase fails
      const storedAccounts = localStorage.getItem("tradingAccounts");
      if (storedAccounts) {
        setAccounts(JSON.parse(storedAccounts));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Account, value: string) => {
    setNewAccount((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddAccount = async () => {
    if (!newAccount.name) {
      alert("Please enter an account name");
      return;
    }

    try {
      if (editingId) {
        // Update existing account in Supabase
        const { error } = await supabase
          .from("accounts")
          .update({
            name: newAccount.name,
            description: newAccount.description,
          })
          .eq("id", editingId);

        if (error) throw error;

        // Update local state
        setAccounts((prevAccounts) =>
          prevAccounts.map((acc) =>
            acc.id === editingId
              ? ({ ...newAccount, id: editingId } as Account)
              : acc,
          ),
        );
      } else {
        // Add new account to Supabase
        const { data, error } = await supabase
          .from("accounts")
          .insert({
            name: newAccount.name,
            description: newAccount.description,
          })
          .select();

        if (error) throw error;

        // Update local state with the returned data
        if (data && data[0]) {
          const newAccountWithId = {
            id: data[0].id,
            name: data[0].name,
            description: data[0].description || "",
          };
          setAccounts((prevAccounts) => [...prevAccounts, newAccountWithId]);
        }
      }

      // Reset form
      setNewAccount({
        name: "",
        description: "",
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error saving account:", error);
      alert("Failed to save account. Please try again.");
    }
  };

  const handleEditAccount = (account: Account) => {
    setNewAccount(account);
    setEditingId(account.id);
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase.from("accounts").delete().eq("id", id);

      if (error) throw error;

      // Update local state
      setAccounts((prevAccounts) =>
        prevAccounts.filter((acc) => acc.id !== id),
      );

      // If deleting the account being edited, reset the form
      if (editingId === id) {
        setNewAccount({
          name: "",
          description: "",
        });
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Please try again.");
    }
  };

  const handleCancel = () => {
    setNewAccount({
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
        <h1 className="text-2xl font-bold">Account Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit Account" : "Add New Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  placeholder="Personal"
                  value={newAccount.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Personal trading account"
                  value={newAccount.description}
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
                <Button onClick={handleAddAccount}>
                  {editingId ? "Update" : "Add Account"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">Loading accounts...</div>
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
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        No accounts found. Add your first account.
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.name}
                        </TableCell>
                        <TableCell>{account.description}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditAccount(account)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAccount(account.id)}
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

export default AccountManagementPage;
