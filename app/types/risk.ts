export type RiskCategory = {
  name: string;
  riskLevel: "Low" | "High";
  devEx: number;
  capExIncrease: number;
  approvalRisk: number | undefined;
  goNoGoProbability: number;
  devExLow: number;
  devExHigh: number;
  capExIncreaseLow: number;
  capExIncreaseHigh: number;
  worstCaseScenario: number;
}; 