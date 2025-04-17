import { RiskCategory } from '../types/risk';
import { SystemParameters } from '../types/system';
import { FinancialParameters } from '../types/financial';

export function calculateGoNoGoProbability(
  approvalRisk: number,
  worstCaseScenario: number 
): number {
  return 1 - ((1 - worstCaseScenario) / 14) * (approvalRisk - 1);
}

export interface CashFlowResult {
  flows: number[];
  expectedFlows: number[];
}

export function calculateCashFlows(
  riskCategories: RiskCategory[],
  systemParams: SystemParameters,
  financialParameters: FinancialParameters
): { 
  flows: number[]; 
  expectedFlows: number[];
  successfulProjectIRR: number;
  portfolioIRR: number;
  projectsReachingNTP: number;
} {
  const years = systemParams.projectLength;
  const flows: number[] = [];
  const expectedFlows: number[] = [];
  let cumulativeProbability = 1;

  // Development Phase (Year 0)
  const totalDevEx = riskCategories.reduce((sum, cat) => sum + cat.devEx, 0);
  const totalCapExIncrease = riskCategories.reduce(
    (sum, cat) => sum + cat.capExIncrease,
    0
  );
  const totalCapEx =
    financialParameters.baseCaseCapExPerMW * systemParams.systemSize +
    totalCapExIncrease;
  
  const itcAmount = totalCapEx * financialParameters.itcRate;
  const nySunAmount =
    systemParams.systemSize *
    1000000 *
    financialParameters.nySunIncentivePerWatt;

  // Calculate initial probabilities
  const initialGoNoGo = riskCategories.reduce(
    (prob, cat) =>
      prob * calculateGoNoGoProbability(cat.approvalRisk, cat.worstCaseScenario),
    1
  );

  // Year 0 (Development)
  flows.push(-totalDevEx);
  expectedFlows.push(-totalDevEx * cumulativeProbability);

  cumulativeProbability *= initialGoNoGo;

  // Year 1 (Construction + Incentives)
  flows.push(-totalCapEx + nySunAmount);
  expectedFlows.push((-totalCapEx + nySunAmount) * cumulativeProbability);

  // Calculate probability of reaching NTP (Year 1)
  const projectsReachingNTP = riskCategories.reduce(
    (prob, cat) => prob * cat.goNoGoProbability,
    1
  );

  // Year 2 onwards (Operations)
  const opEx = financialParameters.baseOpExPerMW * systemParams.systemSize;
  let degradationFactor = 1;
  const annualGeneration =
    systemParams.acSystemSize *
    (systemParams.capacityFactor / 100) *
    24 *
    365;

  for (let i = 2; i <= years + 1; i++) {
    // Only apply degradation after year 2
    if (i > 2) {
      degradationFactor -= systemParams.degradationRate;
    }
    const generation = annualGeneration * degradationFactor;
    const escalatedRate =
      financialParameters.electricityRate *
      Math.pow(1 + financialParameters.priceEscalation, i - 2);
    const revenue = generation * escalatedRate;
    const annualOpEx =
      opEx * Math.pow(1 + financialParameters.priceEscalation, i - 2);

    const cashFlow = revenue - annualOpEx;
    flows.push(cashFlow);
    expectedFlows.push(cashFlow * cumulativeProbability);
  }

  // Add ITC in year 2
  flows[2] += itcAmount;
  expectedFlows[2] += itcAmount * cumulativeProbability;

  const successfulProjectIRR = calculateIRR(flows);
  const portfolioIRR = calculateIRR(expectedFlows);

  return {
    flows,
    expectedFlows,
    successfulProjectIRR,
    portfolioIRR,
    projectsReachingNTP
  };
}

// Helper function to calculate IRR
function calculateIRR(cashFlows: number[]): number {
  // Check if all cash flows are zero
  if (cashFlows.every((cf) => cf === 0)) {
    return 0;
  }

  // Check if all cash flows are positive or all are negative
  const allPositive = cashFlows.every((cf) => cf >= 0);
  const allNegative = cashFlows.every((cf) => cf <= 0);
  if (allPositive || allNegative) {
    return 0;
  }

  try {
    return newtonRaphson(
      (r) => npv(cashFlows, r),
      (r) => npvDerivative(cashFlows, r),
      0.1, // Initial guess
      0.00001, // Tolerance
      100 // Max iterations
    );
  } catch (error) {
    console.log("Newton-Raphson method failed:", error);
    // If Newton-Raphson fails, try a simpler approach
    const minRate = -0.5;
    const maxRate = 0.5;
    let bestRate = 0;
    let bestNpv = Infinity;

    // Try 100 different rates
    for (let i = 0; i < 100; i++) {
      const rate = minRate + ((maxRate - minRate) * i) / 99;
      const npvValue = Math.abs(npv(cashFlows, rate));

      if (npvValue < bestNpv) {
        bestNpv = npvValue;
        bestRate = rate;
      }
    }

    return bestRate;
  }
}

// Helper function to calculate NPV
function npv(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i), 0);
}

// Helper function to calculate NPV derivative
function npvDerivative(cashFlows: number[], rate: number): number {
  return cashFlows.reduce(
    (sum, cf, i) =>
      i === 0 ? sum : sum - (i * cf) / Math.pow(1 + rate, i + 1),
    0
  );
}

// Helper function for Newton-Raphson method
function newtonRaphson(
  f: (x: number) => number,
  fPrime: (x: number) => number,
  x0: number,
  tolerance: number,
  maxIterations: number
): number {
  let x = x0;
  for (let i = 0; i < maxIterations; i++) {
    const fx = f(x);
    const fpx = fPrime(x);
    const xNew = x - fx / fpx;

    if (Math.abs(xNew - x) < tolerance) {
      return xNew;
    }
    x = xNew;
  }
  throw new Error("Newton-Raphson method did not converge");
}

export function calculateCategoryIRR(
  categoryName: string,
  riskLevel: "Low" | "High",
  approvalRisk: number,
  riskCategories: RiskCategory[],
  systemParams: SystemParameters,
  financialParameters: FinancialParameters
): number {
  // Create a modified copy of the risk categories with the specified category's values
  const modifiedCategories = riskCategories.map((cat) => {
    if (cat.name === categoryName) {
      return {
        ...cat,
        riskLevel,
        devEx: riskLevel === "Low" ? cat.devExLow : cat.devExHigh,
        capExIncrease: riskLevel === "Low" ? cat.capExIncreaseLow : cat.capExIncreaseHigh,
        approvalRisk,
        goNoGoProbability: calculateGoNoGoProbability(approvalRisk, cat.worstCaseScenario)
      };
    }
    return cat;
  });

  // Use the existing calculateCashFlows function with the modified categories
  const { expectedFlows } = calculateCashFlows(
    modifiedCategories,
    systemParams,
    financialParameters
  );

  return calculateIRR(expectedFlows);
}

export function calculateSensitivityIRR(
  categoryName: string,
  riskLevel: "Low" | "High",
  approvalRisk: number,
  riskCategories: RiskCategory[],
  systemParams: SystemParameters,
  financialParameters: FinancialParameters
): number {
  // Create a copy of the risk categories
  const modifiedCategories = riskCategories.map((cat) => {
    if (cat.name === categoryName) {
      // Calculate DevEx and CapEx based on risk level
      const devEx = riskLevel === "Low" ? cat.devExLow : cat.devExHigh;
      const capExIncrease =
        riskLevel === "Low" ? cat.capExIncreaseLow : cat.capExIncreaseHigh;
      const goNoGoProbability = calculateGoNoGoProbability(approvalRisk, cat.worstCaseScenario)

      return {
        ...cat,
        riskLevel,
        devEx,
        capExIncrease,
        approvalRisk,
        goNoGoProbability,
      };
    }
    return cat;
  });

  // Use the existing calculateCashFlows function with the modified categories
  const { expectedFlows } = calculateCashFlows(
    modifiedCategories,
    systemParams,
    financialParameters
  );

  return calculateIRR(expectedFlows);
}
