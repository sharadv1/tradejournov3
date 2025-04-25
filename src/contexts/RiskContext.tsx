import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type RiskProfile = "conservative" | "aggressive";

interface RiskContextType {
  accountBalance: number;
  riskProfile: RiskProfile;
  maxRiskPercentage: number;
  maxRiskAmount: number;
  setAccountBalance: (balance: number) => void;
  setRiskProfile: (profile: RiskProfile) => void;
  calculateMaxRisk: () => number;
}

const defaultContext: RiskContextType = {
  accountBalance: 10000, // Default $10,000
  riskProfile: "conservative",
  maxRiskPercentage: 0.5, // Default 0.5% for conservative
  maxRiskAmount: 50, // Default $50 (0.5% of $10,000)
  setAccountBalance: () => {},
  setRiskProfile: () => {},
  calculateMaxRisk: () => 0,
};

const RiskContext = createContext<RiskContextType>(defaultContext);

export const useRisk = () => useContext(RiskContext);

interface RiskProviderProps {
  children: ReactNode;
}

export const RiskProvider: React.FC<RiskProviderProps> = ({ children }) => {
  const [accountBalance, setAccountBalance] = useState<number>(() => {
    const saved = localStorage.getItem("accountBalance");
    return saved ? parseFloat(saved) : defaultContext.accountBalance;
  });

  const [riskProfile, setRiskProfile] = useState<RiskProfile>(() => {
    const saved = localStorage.getItem("riskProfile") as RiskProfile;
    return saved ? saved : defaultContext.riskProfile;
  });

  const [maxRiskPercentage, setMaxRiskPercentage] = useState<number>(
    riskProfile === "aggressive" ? 1.0 : 0.5,
  );

  const [maxRiskAmount, setMaxRiskAmount] = useState<number>(
    (accountBalance * maxRiskPercentage) / 100,
  );

  // Update maxRiskPercentage when riskProfile changes
  useEffect(() => {
    const newPercentage = riskProfile === "aggressive" ? 1.0 : 0.5;
    setMaxRiskPercentage(newPercentage);
    localStorage.setItem("riskProfile", riskProfile);
  }, [riskProfile]);

  // Update maxRiskAmount when accountBalance or maxRiskPercentage changes
  useEffect(() => {
    const newAmount = (accountBalance * maxRiskPercentage) / 100;
    setMaxRiskAmount(newAmount);
    localStorage.setItem("accountBalance", accountBalance.toString());
  }, [accountBalance, maxRiskPercentage]);

  const calculateMaxRisk = (): number => {
    return maxRiskAmount;
  };

  const value = {
    accountBalance,
    riskProfile,
    maxRiskPercentage,
    maxRiskAmount,
    setAccountBalance,
    setRiskProfile,
    calculateMaxRisk,
  };

  return <RiskContext.Provider value={value}>{children}</RiskContext.Provider>;
};
