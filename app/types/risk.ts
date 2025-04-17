export interface RiskCategory {
  name: string;
  riskLevel: "Low" | "High";
  approvalRisk: number;
  goNoGoProbability: number;
  devEx: number;
  capExIncrease: number;
  devExLow: number;
  devExHigh: number;
  capExIncreaseLow: number;
  capExIncreaseHigh: number;
  worstCaseScenario: number;
} 