import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  User,
  Settings,
  ChevronDown,
  Lightbulb,
  BarChart3,
  BookOpen,
  LineChart,
  Briefcase,
  Users,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "There was a problem signing out.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <nav className="bg-background border-b border-border py-3 px-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <h1
          className="text-xl font-bold cursor-pointer mr-2"
          onClick={() => navigate("/")}
        >
          Trading Journal
        </h1>
        <div className="hidden md:flex space-x-1">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <BarChart3 className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/journal")}
          >
            <BookOpen className="h-4 w-4 mr-1" />
            Journal
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/trade-ideas")}
          >
            <Lightbulb className="h-4 w-4 mr-1" />
            Trade Ideas
          </Button>
          <Button variant="ghost" size="sm">
            <LineChart className="h-4 w-4 mr-1" />
            Trade Logs
          </Button>
          <Button variant="ghost" size="sm">
            <BarChart3 className="h-4 w-4 mr-1" />
            Analytics
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Settings
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/risk-settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Risk Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/account-management")}>
                <Users className="h-4 w-4 mr-2" />
                Account Management
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/strategy-management")}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Strategy Management
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span className="hidden md:inline-block">
                {user.email?.split("@")[0]}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mt-1">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/account-management")}>
              <Settings className="h-4 w-4 mr-2" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default Navbar;
