"use client";

import { useState, useEffect, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface RiskCategory {
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
}

interface SystemParameters {
  capacityFactor: number;
  systemSize: number;
  acSystemSize: number;
  projectLength: number;
}

interface FinancialParameters {
  baseCaseCapExPerMW: number;
  baseOpExPerMW: number;
  itcRate: number;
}

function RiskCategories({
  riskCategories,
  setRiskCategories,
}: {
  riskCategories: RiskCategory[];
  setRiskCategories: (categories: RiskCategory[]) => void;
}) {
  const updateRiskValues = (category: RiskCategory) => {
    if (category.riskLevel === "High") {
      category.devEx = category.devExHigh;
      category.capExIncrease = category.capExIncreaseHigh;
    } else {
      category.devEx = category.devExLow;
      category.capExIncrease = category.capExIncreaseLow;
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Risk Categories
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead>
            <tr className="bg-purple-50">
              <th className="px-3 py-3 text-purple-700">Category</th>
              <th className="px-3 py-3 text-purple-700">Financial Risk</th>
              <th className="px-3 py-3 text-purple-700">Approval Risk</th>
            </tr>
          </thead>
          <tbody>
            {riskCategories.map((category, index) => (
              <tr key={index} className="border-b border-purple-100">
                <td className="px-3 py-3 font-medium text-purple-700">
                  {category.name}
                </td>
                <td className="px-3 py-3">
                  <select
                    className="w-full p-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={category.riskLevel}
                    onChange={(e) => {
                      const newCategories = [...riskCategories];
                      newCategories[index].riskLevel = e.target.value as
                        | "Low"
                        | "High";
                      updateRiskValues(newCategories[index]);
                      setRiskCategories(newCategories);
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="High">High</option>
                  </select>
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    className="w-full p-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={category.approvalRisk}
                    onChange={(e) => {
                      const newCategories = [...riskCategories];
                      newCategories[index].approvalRisk = parseInt(
                        e.target.value
                      );
                      newCategories[index].goNoGoProbability =
                        calculateGoNoGoProbability(
                          newCategories[index].approvalRisk
                        );
                      setRiskCategories(newCategories);
                    }}
                    min="0"
                    max="15"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Add this helper function before the component
const calculateGoNoGoProbability = (approvalRisk: number): number => {
  return 1 - (0.5 / 14) * (approvalRisk - 1);
};

// Update the IRR calculation functions
function npv(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i), 0);
}

function npvDerivative(cashFlows: number[], rate: number): number {
  return cashFlows.reduce(
    (sum, cf, i) =>
      i === 0 ? sum : sum - (i * cf) / Math.pow(1 + rate, i + 1),
    0
  );
}

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
    if (Math.abs(fx) < tolerance) {
      return x;
    }

    const fPrimeX = fPrime(x);

    // If derivative is zero or very small, try a different approach
    if (Math.abs(fPrimeX) < 1e-10) {
      // Try a small random perturbation
      x = x + (Math.random() - 0.5) * 0.1;
      continue;
    }

    const newX = x - fx / fPrimeX;

    // If we're not making progress, try a different approach
    if (Math.abs(newX - x) < tolerance || Math.abs(f(newX)) >= Math.abs(fx)) {
      // Try bisection method as fallback
      let a = -0.5;
      let b = 0.5;
      const fa = f(a);

      for (let j = 0; j < 50; j++) {
        const c = (a + b) / 2;
        const fc = f(c);

        if (Math.abs(fc) < tolerance) {
          return c;
        }

        if (fa * fc < 0) {
          b = c;
        } else {
          a = c;
        }
      }

      return (a + b) / 2;
    }

    x = newX;
  }

  // If we've reached max iterations, return the best guess
  return x;
}

// Update the calculateIRR function
const calculateIRR = (cashFlows: number[]): number => {
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
};

export default function Home() {
  // Risk Categories
  const [riskCategories, setRiskCategories] = useState<RiskCategory[]>([
    {
      name: "Site Control",
      riskLevel: "Low",
      devEx: 7700,
      capExIncrease: 0,
      approvalRisk: 5,
      goNoGoProbability: calculateGoNoGoProbability(5),
      devExLow: 7700,
      devExHigh: 9000,
      capExIncreaseLow: 0,
      capExIncreaseHigh: 0,
    },
    {
      name: "Permitting",
      riskLevel: "Low",
      devEx: 40000,
      capExIncrease: 0,
      approvalRisk: 6,
      goNoGoProbability: calculateGoNoGoProbability(6),
      devExLow: 40000,
      devExHigh: 90000,
      capExIncreaseLow: 0,
      capExIncreaseHigh: 0,
    },
    {
      name: "Interconnection",
      riskLevel: "Low",
      devEx: 146250,
      capExIncrease: 250000,
      approvalRisk: 8,
      goNoGoProbability: calculateGoNoGoProbability(8),
      devExLow: 146250,
      devExHigh: 157750,
      capExIncreaseLow: 250000,
      capExIncreaseHigh: 2000000,
    },
    {
      name: "Design",
      riskLevel: "Low",
      devEx: 44500,
      capExIncrease: 150000,
      approvalRisk: 2,
      goNoGoProbability: calculateGoNoGoProbability(2),
      devExLow: 44500,
      devExHigh: 52500,
      capExIncreaseLow: 150000,
      capExIncreaseHigh: 2000000,
    },
    {
      name: "Environmental",
      riskLevel: "Low",
      devEx: 26750,
      capExIncrease: 0,
      approvalRisk: 6,
      goNoGoProbability: calculateGoNoGoProbability(6),
      devExLow: 26750,
      devExHigh: 53000,
      capExIncreaseLow: 0,
      capExIncreaseHigh: 250000,
    },
  ]);

  // System Parameters
  const [systemParams, setSystemParams] = useState<SystemParameters>({
    capacityFactor: 20,
    systemSize: 3,
    acSystemSize: 2.4,
    projectLength: 30,
  });

  // Financial Parameters
  const [financialParams, setFinancialParams] = useState<FinancialParameters>({
    baseCaseCapExPerMW: 900000,
    baseOpExPerMW: 12500,
    itcRate: 0.3,
  });

  const [cashFlows, setCashFlows] = useState<number[]>([]);
  const [expectedCashFlows, setExpectedCashFlows] = useState<number[]>([]);

  // Add this state for chart view toggle
  const [chartView, setChartView] = useState<"individual" | "portfolio">(
    "individual"
  );

  // Calculate IRR for successful projects and portfolio
  const [successfulProjectIRR, setSuccessfulProjectIRR] = useState<number>(0);
  const [portfolioIRR, setPortfolioIRR] = useState<number>(0);

  // Update IRR calculations when cash flows change
  useEffect(() => {
    if (cashFlows.length > 0) {
      setSuccessfulProjectIRR(calculateIRR(cashFlows));
    }
    if (expectedCashFlows.length > 0) {
      setPortfolioIRR(calculateIRR(expectedCashFlows));
    }
  }, [cashFlows, expectedCashFlows]);

  const calculateCashFlows = useCallback(() => {
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
      financialParams.baseCaseCapExPerMW * systemParams.systemSize +
      totalCapExIncrease;
    const itcAmount = totalCapEx * financialParams.itcRate;

    // Calculate initial probabilities
    const initialGoNoGo = riskCategories.reduce(
      (prob, cat) => prob * calculateGoNoGoProbability(cat.approvalRisk),
      1
    );

    // Year 0 (Development)
    flows.push(-totalDevEx);
    expectedFlows.push(-totalDevEx * cumulativeProbability);

    cumulativeProbability *= initialGoNoGo;

    // Year 1 (Construction)
    flows.push(-totalCapEx);
    expectedFlows.push(-totalCapEx * cumulativeProbability);

    // Year 2 onwards (Operations)
    const opEx = financialParams.baseOpExPerMW * systemParams.systemSize;
    let degradationFactor = 1;
    const electricityRate = 120;
    const priceEscalation = 0.02;
    const degradationRate = 0.005;
    const annualGeneration =
      systemParams.acSystemSize *
      (systemParams.capacityFactor / 100) *
      24 *
      365;

    for (let i = 2; i <= years; i++) {
      degradationFactor -= degradationRate;
      const generation = annualGeneration * degradationFactor;
      const escalatedRate =
        electricityRate * Math.pow(1 + priceEscalation, i - 2);
      const revenue = generation * escalatedRate;
      const annualOpEx = opEx * Math.pow(1.01, i - 2);

      const cashFlow = revenue - annualOpEx;
      flows.push(cashFlow);
      expectedFlows.push(cashFlow * cumulativeProbability);
    }

    // Add ITC in year 3
    flows[2] += itcAmount;
    expectedFlows[2] += itcAmount * cumulativeProbability;

    setCashFlows(flows);
    setExpectedCashFlows(expectedFlows);

    // Calculate IRR values
    if (flows.length > 0) {
      setSuccessfulProjectIRR(calculateIRR(flows));
    }
    if (expectedFlows.length > 0) {
      setPortfolioIRR(calculateIRR(expectedFlows));
    }
  }, [riskCategories, systemParams, financialParams]);

  useEffect(() => {
    calculateCashFlows();
  }, [calculateCashFlows]);

  // Update the chart data to use the project length
  const chartData = {
    individual: {
      labels: Array(systemParams.projectLength + 1)
        .fill(0)
        .map((_, i) => `Year ${i}`),
      datasets: [
        {
          label: "DevEx",
          data: Array(systemParams.projectLength + 1)
            .fill(0)
            .map((_, i) =>
              i === 0
                ? -riskCategories.reduce((sum, cat) => sum + cat.devEx, 0)
                : 0
            ),
          backgroundColor: "rgba(255, 0, 0, 0.6)",
          borderColor: "rgb(255, 0, 0)",
          borderWidth: 1,
        },
        {
          label: "CapEx",
          data: Array(systemParams.projectLength + 1)
            .fill(0)
            .map((_, i) =>
              i === 1
                ? -(
                    financialParams.baseCaseCapExPerMW *
                      systemParams.systemSize +
                    riskCategories.reduce(
                      (sum, cat) => sum + cat.capExIncrease,
                      0
                    )
                  )
                : 0
            ),
          backgroundColor: "rgba(255, 165, 0, 0.6)",
          borderColor: "rgb(255, 165, 0)",
          borderWidth: 1,
        },
        {
          label: "OpEx",
          data: Array(systemParams.projectLength + 1)
            .fill(0)
            .map((_, i) =>
              i > 1
                ? -(
                    financialParams.baseOpExPerMW *
                    systemParams.systemSize *
                    Math.pow(1.01, i - 2)
                  )
                : 0
            ),
          backgroundColor: "rgba(255, 0, 255, 0.6)",
          borderColor: "rgb(255, 0, 255)",
          borderWidth: 1,
        },
        {
          label: "Revenue",
          data: Array(systemParams.projectLength + 1)
            .fill(0)
            .map((_, i) =>
              i > 1
                ? systemParams.acSystemSize *
                  (systemParams.capacityFactor / 100) *
                  24 *
                  365 *
                  (1 - 0.005 * (i - 2)) *
                  120 *
                  Math.pow(1 + 0.02, i - 2)
                : 0
            ),
          backgroundColor: "rgba(0, 0, 255, 0.6)",
          borderColor: "rgb(0, 0, 255)",
          borderWidth: 1,
        },
        {
          label: "ITC",
          data: Array(systemParams.projectLength + 1)
            .fill(0)
            .map((_, i) =>
              i === 2
                ? (financialParams.baseCaseCapExPerMW *
                    systemParams.systemSize +
                    riskCategories.reduce(
                      (sum, cat) => sum + cat.capExIncrease,
                      0
                    )) *
                  financialParams.itcRate
                : 0
            ),
          backgroundColor: "rgba(0, 255, 0, 0.6)",
          borderColor: "rgb(0, 255, 0)",
          borderWidth: 1,
        },
      ],
    },
    portfolio: {
      labels: Array(systemParams.projectLength + 1)
        .fill(0)
        .map((_, i) => `Year ${i}`),
      datasets: [
        {
          label: "DevEx",
          data: Array(systemParams.projectLength + 1)
            .fill(0)
            .map((_, i) => {
              // Calculate cumulative probability correctly
              let cumulativeProbability = 1;

              // For year 0, probability is 100%
              // For year 1 and beyond, apply the cumulative probability
              if (i > 0) {
                cumulativeProbability = riskCategories.reduce(
                  (prob, cat) => prob * cat.goNoGoProbability,
                  1
                );
              }

              return i === 0
                ? -riskCategories.reduce((sum, cat) => sum + cat.devEx, 0) *
                    cumulativeProbability
                : 0;
            }),
          backgroundColor: "rgba(255, 0, 0, 0.6)",
          borderColor: "rgb(255, 0, 0)",
          borderWidth: 1,
        },
        {
          label: "CapEx",
          data: Array(systemParams.projectLength + 1)
            .fill(0)
            .map((_, i) => {
              // Calculate cumulative probability correctly
              let cumulativeProbability = 1;

              // For year 0, probability is 100%
              // For year 1 and beyond, apply the cumulative probability
              if (i > 0) {
                cumulativeProbability = riskCategories.reduce(
                  (prob, cat) => prob * cat.goNoGoProbability,
                  1
                );
              }

              return i === 1
                ? -(
                    financialParams.baseCaseCapExPerMW *
                      systemParams.systemSize +
                    riskCategories.reduce(
                      (sum, cat) => sum + cat.capExIncrease,
                      0
                    )
                  ) * cumulativeProbability
                : 0;
            }),
          backgroundColor: "rgba(255, 165, 0, 0.6)",
          borderColor: "rgb(255, 165, 0)",
          borderWidth: 1,
        },
        {
          label: "OpEx",
          data: Array(systemParams.projectLength + 1)
            .fill(0)
            .map((_, i) => {
              // Calculate cumulative probability correctly
              let cumulativeProbability = 1;

              // For year 0, probability is 100%
              // For year 1 and beyond, apply the cumulative probability
              if (i > 0) {
                cumulativeProbability = riskCategories.reduce(
                  (prob, cat) => prob * cat.goNoGoProbability,
                  1
                );
              }

              return i > 1
                ? -(
                    financialParams.baseOpExPerMW *
                    systemParams.systemSize *
                    Math.pow(1.01, i - 2)
                  ) * cumulativeProbability
                : 0;
            }),
          backgroundColor: "rgba(255, 0, 255, 0.6)",
          borderColor: "rgb(255, 0, 255)",
          borderWidth: 1,
        },
        {
          label: "Revenue",
          data: Array(systemParams.projectLength + 1)
            .fill(0)
            .map((_, i) => {
              // Calculate cumulative probability correctly
              let cumulativeProbability = 1;

              // For year 0, probability is 100%
              // For year 1 and beyond, apply the cumulative probability
              if (i > 0) {
                cumulativeProbability = riskCategories.reduce(
                  (prob, cat) => prob * cat.goNoGoProbability,
                  1
                );
              }

              return i > 1
                ? systemParams.acSystemSize *
                    (systemParams.capacityFactor / 100) *
                    24 *
                    365 *
                    (1 - 0.005 * (i - 2)) *
                    120 *
                    Math.pow(1 + 0.02, i - 2) *
                    cumulativeProbability
                : 0;
            }),
          backgroundColor: "rgba(0, 0, 255, 0.6)",
          borderColor: "rgb(0, 0, 255)",
          borderWidth: 1,
        },
        {
          label: "ITC",
          data: Array(systemParams.projectLength + 1)
            .fill(0)
            .map((_, i) => {
              // Calculate cumulative probability correctly
              let cumulativeProbability = 1;

              // For year 0, probability is 100%
              // For year 1 and beyond, apply the cumulative probability
              if (i > 0) {
                cumulativeProbability = riskCategories.reduce(
                  (prob, cat) => prob * cat.goNoGoProbability,
                  1
                );
              }

              return i === 2
                ? (financialParams.baseCaseCapExPerMW *
                    systemParams.systemSize +
                    riskCategories.reduce(
                      (sum, cat) => sum + cat.capExIncrease,
                      0
                    )) *
                    financialParams.itcRate *
                    cumulativeProbability
                : 0;
            }),
          backgroundColor: "rgba(0, 255, 0, 0.6)",
          borderColor: "rgb(0, 255, 0)",
          borderWidth: 1,
        },
      ],
    },
  };

  // Add a function to download cash flow table as CSV
  const downloadCashFlowCSV = () => {
    let csvContent = "Category,";
    for (let i = 0; i <= systemParams.projectLength; i++) {
      csvContent += `Year ${i},`;
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add DevEx row
    csvContent += "DevEx,";
    for (let i = 0; i <= systemParams.projectLength; i++) {
      csvContent +=
        i === 0
          ? `$${Math.round(
              riskCategories.reduce((sum, cat) => sum + cat.devEx, 0)
            ).toLocaleString()},`
          : ",";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add CapEx row
    csvContent += "CapEx,";
    for (let i = 0; i <= systemParams.projectLength; i++) {
      csvContent +=
        i === 1
          ? `$${Math.round(
              financialParams.baseCaseCapExPerMW * systemParams.systemSize +
                riskCategories.reduce((sum, cat) => sum + cat.capExIncrease, 0)
            ).toLocaleString()},`
          : ",";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add OpEx row
    csvContent += "OpEx,";
    for (let i = 0; i <= systemParams.projectLength; i++) {
      csvContent +=
        i > 1
          ? `$${Math.round(
              financialParams.baseOpExPerMW *
                systemParams.systemSize *
                Math.pow(1.01, i - 2)
            ).toLocaleString()},`
          : ",";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add Revenue row
    csvContent += "Revenue,";
    for (let i = 0; i <= systemParams.projectLength; i++) {
      csvContent +=
        i > 1
          ? `$${Math.round(
              systemParams.acSystemSize *
                (systemParams.capacityFactor / 100) *
                24 *
                365 *
                (1 - 0.005 * (i - 2)) *
                120 *
                Math.pow(1 + 0.02, i - 2)
            ).toLocaleString()},`
          : ",";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add Cash Flow row
    csvContent += "Cash Flow,";
    for (let i = 0; i < cashFlows.length; i++) {
      csvContent += `$${Math.round(cashFlows[i]).toLocaleString()},`;
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add Expected Cash Flow row
    csvContent += "Expected Cash Flow,";
    for (let i = 0; i < expectedCashFlows.length; i++) {
      csvContent += `$${Math.round(expectedCashFlows[i]).toLocaleString()},`;
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add % of projects row
    csvContent += "% of projects,";
    for (let i = 0; i <= systemParams.projectLength; i++) {
      let cumulativeProbability = 1;
      if (i > 0) {
        cumulativeProbability = riskCategories.reduce(
          (prob, cat) => prob * cat.goNoGoProbability,
          1
        );
      }
      csvContent += Math.round(cumulativeProbability * 100) + "%,";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "cash_flow_table.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <header className="bg-gradient-to-r from-purple-700 to-indigo-700 py-8 px-4 shadow-lg rounded-lg mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center tracking-tight">
          <span className="inline-block transform hover:scale-105 transition-transform duration-200">
            Predevelopment at Scale
          </span>
        </h1>
        <p className="text-purple-100 text-center mt-2 text-lg">
          A Probabilistic Financial Model for Solar Development
        </p>
      </header>

      <main className="main-content">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-semibold mb-8 text-gray-800">
            Community Solar
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="card p-6">
              <RiskCategories
                riskCategories={riskCategories}
                setRiskCategories={setRiskCategories}
              />
            </div>

            {/* System Parameters */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                System Parameters
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-purple-700">
                    Capacity Factor (%)
                  </label>
                  <input
                    type="number"
                    className="mt-1 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    value={systemParams.capacityFactor || ""}
                    onChange={(e) =>
                      setSystemParams({
                        ...systemParams,
                        capacityFactor:
                          e.target.value === ""
                            ? 0
                            : parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-purple-700">
                    System Size (MW)
                  </label>
                  <input
                    type="number"
                    className="mt-1 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    value={systemParams.systemSize || ""}
                    onChange={(e) =>
                      setSystemParams({
                        ...systemParams,
                        systemSize:
                          e.target.value === ""
                            ? 0
                            : parseFloat(e.target.value),
                        acSystemSize:
                          e.target.value === ""
                            ? 0
                            : parseFloat(e.target.value) / 1.25,
                      })
                    }
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-purple-700">
                    Project Length (years)
                  </label>
                  <input
                    type="number"
                    className="mt-1 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    value={systemParams.projectLength || ""}
                    onChange={(e) =>
                      setSystemParams({
                        ...systemParams,
                        projectLength:
                          e.target.value === "" ? 0 : parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Financial Parameters */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Financial Parameters
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-700">
                    Base Case CapEx ($/MW)
                  </label>
                  <input
                    type="number"
                    value={financialParams.baseCaseCapExPerMW}
                    onChange={(e) =>
                      setFinancialParams({
                        ...financialParams,
                        baseCaseCapExPerMW: Number(e.target.value),
                      })
                    }
                    className="mt-2 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-700">
                    Additional CapEx
                  </label>
                  <div className="text-base text-gray-600 mt-2 p-2">
                    $
                    {riskCategories
                      .reduce((sum, cat) => sum + cat.capExIncrease, 0)
                      .toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-700">
                    Base OpEx ($/MW/year)
                  </label>
                  <input
                    type="number"
                    value={financialParams.baseOpExPerMW}
                    onChange={(e) =>
                      setFinancialParams({
                        ...financialParams,
                        baseOpExPerMW: Number(e.target.value),
                      })
                    }
                    className="mt-2 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-700">
                    Total CapEx
                  </label>
                  <div className="text-base text-gray-600 mt-2 p-2">
                    $
                    {(
                      financialParams.baseCaseCapExPerMW *
                        systemParams.systemSize +
                      riskCategories.reduce(
                        (sum, cat) => sum + cat.capExIncrease,
                        0
                      )
                    ).toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-700">
                    ITC Rate (%)
                  </label>
                  <input
                    type="number"
                    value={(financialParams.itcRate * 100).toFixed(2)}
                    onChange={(e) =>
                      setFinancialParams({
                        ...financialParams,
                        itcRate: Number(e.target.value) / 100,
                      })
                    }
                    className="mt-2 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-700">
                    Total DevEx
                  </label>
                  <div className="text-base text-gray-600 mt-2 p-2">
                    $
                    {riskCategories
                      .reduce((sum, cat) => sum + cat.devEx, 0)
                      .toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="mt-8 mb-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-purple-700">
                Project Cash Flow
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setChartView("individual")}
                  className={`px-4 py-2 rounded-md ${
                    chartView === "individual"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  Individual Project
                </button>
                <button
                  onClick={() => setChartView("portfolio")}
                  className={`px-4 py-2 rounded-md ${
                    chartView === "portfolio"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  Portfolio View
                </button>
              </div>
            </div>

            {/* IRR Display */}
            <div className="flex justify-center mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center mx-8">
                <div className="text-lg font-medium text-purple-700">
                  Successful Project IRR
                </div>
                <div className="text-3xl font-bold text-purple-700">
                  {(successfulProjectIRR * 100).toFixed(2)}%
                </div>
              </div>
              <div className="text-center mx-8">
                <div className="text-lg font-medium text-purple-700">
                  Portfolio IRR
                </div>
                <div className="text-3xl font-bold text-purple-700">
                  {(portfolioIRR * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            {chartView === "individual" ? (
              <Bar
                data={chartData.individual}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: "top" as const,
                      labels: {
                        color: "rgb(107, 33, 168)",
                      },
                    },
                    title: {
                      display: true,
                      text: "Individual Project Cash Flow Breakdown",
                      color: "rgb(107, 33, 168)",
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const value = context.raw as number;
                          return `${
                            context.dataset.label
                          }: $${value.toLocaleString()}`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      stacked: true,
                      ticks: {
                        color: "rgb(107, 33, 168)",
                        callback: function (value) {
                          return `$${value.toLocaleString()}`;
                        },
                      },
                    },
                    x: {
                      stacked: true,
                      ticks: {
                        color: "rgb(107, 33, 168)",
                      },
                    },
                  },
                }}
              />
            ) : (
              <Bar
                data={chartData.portfolio}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: "top" as const,
                      labels: {
                        color: "rgb(107, 33, 168)",
                      },
                    },
                    title: {
                      display: true,
                      text: "Portfolio View - Expected Cash Flow Breakdown",
                      color: "rgb(107, 33, 168)",
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const value = context.raw as number;
                          const year = context.dataIndex;
                          // Calculate cumulative probability for portfolio view
                          let cumulativeProbability = 1;
                          if (year > 0) {
                            cumulativeProbability = riskCategories.reduce(
                              (prob, cat) => prob * cat.goNoGoProbability,
                              1
                            );
                          }
                          return `${
                            context.dataset.label
                          }: $${value.toLocaleString()} (% of projects: ${(
                            cumulativeProbability * 100
                          ).toFixed(2)}%)`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      stacked: true,
                      ticks: {
                        color: "rgb(107, 33, 168)",
                        callback: function (value) {
                          return `$${value.toLocaleString()}`;
                        },
                      },
                    },
                    x: {
                      stacked: true,
                      ticks: {
                        color: "rgb(107, 33, 168)",
                      },
                    },
                  },
                }}
              />
            )}
          </div>

          {/* Sensitivity Analysis - Moved before Cash Flow Table */}
          <div className="mt-8 mb-8">
            <SensitivityAnalysis
              riskCategories={riskCategories}
              systemParams={systemParams}
              financialParams={financialParams}
            />
          </div>

          {/* Cash Flow Table - Moved after Sensitivity Analysis */}
          <div className="mt-8 mb-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-purple-700">
                Cash Flow Table
              </h2>
              <button
                onClick={downloadCashFlowCSV}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Download CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead>
                  <tr className="bg-purple-50">
                    <th className="px-3 py-3 text-purple-700">Category</th>
                    {Array(systemParams.projectLength + 1)
                      .fill(0)
                      .map((_, i) => (
                        <th key={i} className="px-3 py-3 text-purple-700">
                          Year {i}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-3 font-medium text-purple-700">
                      DevEx
                    </td>
                    {Array(systemParams.projectLength + 1)
                      .fill(0)
                      .map((_, i) => (
                        <td key={i} className="px-3 py-3 text-gray-600">
                          {i === 0
                            ? `$${Math.round(
                                riskCategories.reduce(
                                  (sum, cat) => sum + cat.devEx,
                                  0
                                )
                              ).toLocaleString()}`
                            : ""}
                        </td>
                      ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-3 font-medium text-purple-700">
                      CapEx
                    </td>
                    {Array(systemParams.projectLength + 1)
                      .fill(0)
                      .map((_, i) => (
                        <td key={i} className="px-3 py-3 text-gray-600">
                          {i === 1
                            ? `$${Math.round(
                                financialParams.baseCaseCapExPerMW *
                                  systemParams.systemSize +
                                  riskCategories.reduce(
                                    (sum, cat) => sum + cat.capExIncrease,
                                    0
                                  )
                              ).toLocaleString()}`
                            : ""}
                        </td>
                      ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-3 font-medium text-purple-700">
                      OpEx
                    </td>
                    {Array(systemParams.projectLength + 1)
                      .fill(0)
                      .map((_, i) => (
                        <td key={i} className="px-3 py-3 text-gray-600">
                          {i > 1
                            ? `$${Math.round(
                                financialParams.baseOpExPerMW *
                                  systemParams.systemSize *
                                  Math.pow(1.01, i - 2)
                              ).toLocaleString()}`
                            : ""}
                        </td>
                      ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-3 font-medium text-purple-700">
                      Revenue
                    </td>
                    {Array(systemParams.projectLength + 1)
                      .fill(0)
                      .map((_, i) => (
                        <td key={i} className="px-3 py-3 text-gray-600">
                          {i > 1
                            ? `$${Math.round(
                                systemParams.acSystemSize *
                                  (systemParams.capacityFactor / 100) *
                                  24 *
                                  365 *
                                  (1 - 0.005 * (i - 2)) *
                                  120 *
                                  Math.pow(1 + 0.02, i - 2)
                              ).toLocaleString()}`
                            : ""}
                        </td>
                      ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-3 font-medium text-purple-700">
                      Cash Flow
                    </td>
                    {cashFlows.map((flow, i) => (
                      <td key={i} className="px-3 py-3 text-gray-600">
                        {`$${Math.round(flow).toLocaleString()}`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-3 font-medium text-purple-700">
                      % of projects
                    </td>
                    {Array(systemParams.projectLength + 1)
                      .fill(0)
                      .map((_, i) => {
                        let cumulativeProbability = 1;
                        if (i > 0) {
                          cumulativeProbability = riskCategories.reduce(
                            (prob, cat) => prob * cat.goNoGoProbability,
                            1
                          );
                        }
                        return (
                          <td key={i} className="px-3 py-3 text-gray-600">
                            {Math.round(cumulativeProbability * 100)}%
                          </td>
                        );
                      })}
                  </tr>
                  <tr>
                    <td className="px-3 py-3 font-medium text-purple-700">
                      Expected Cash Flow
                    </td>
                    {expectedCashFlows.map((flow, i) => (
                      <td key={i} className="px-3 py-3 text-gray-600">
                        {`$${Math.round(flow).toLocaleString()}`}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// Sensitivity Analysis Component
function SensitivityAnalysis({
  riskCategories,
  systemParams,
  financialParams,
}: {
  riskCategories: RiskCategory[];
  systemParams: SystemParameters;
  financialParams: FinancialParameters;
}) {
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Site Control");
  const [sensitivityData, setSensitivityData] = useState<{
    [key: string]: { [key: string]: number };
  }>({});

  // Add calculateIRR function back
  const calculateIRR = (cashFlows: number[]): number => {
    let guess = 0.1;
    const maxIterations = 100;
    const tolerance = 0.0001;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivative = 0;

      for (let j = 0; j < cashFlows.length; j++) {
        npv += cashFlows[j] / Math.pow(1 + guess, j);
        if (j > 0) {
          derivative += (-j * cashFlows[j]) / Math.pow(1 + guess, j + 1);
        }
      }

      const newGuess = guess - npv / derivative;
      if (Math.abs(newGuess - guess) < tolerance) {
        return newGuess;
      }
      guess = newGuess;
    }
    return guess;
  };

  const calculateSensitivityIRR = useCallback(
    (
      categoryName: string,
      riskLevel: "Low" | "High",
      approvalRisk: number
    ): number => {
      // Create a copy of the risk categories
      const modifiedCategories = riskCategories.map((cat) => {
        if (cat.name === categoryName) {
          // Calculate DevEx and CapEx based on risk level
          const devEx = riskLevel === "Low" ? cat.devExLow : cat.devExHigh;
          const capExIncrease =
            riskLevel === "Low" ? cat.capExIncreaseLow : cat.capExIncreaseHigh;
          const goNoGoProbability = 1 - (0.5 / 14) * (approvalRisk - 1);

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

      // Calculate cash flows with the modified risk category
      const years = systemParams.projectLength;
      const flows: number[] = [];
      const expectedFlows: number[] = [];
      let cumulativeProbability = 1;

      // Development Phase (Year 0)
      const totalDevEx = modifiedCategories.reduce(
        (sum, cat) => sum + cat.devEx,
        0
      );
      const totalCapExIncrease = modifiedCategories.reduce(
        (sum, cat) => sum + cat.capExIncrease,
        0
      );
      const totalCapEx =
        financialParams.baseCaseCapExPerMW * systemParams.systemSize +
        totalCapExIncrease;
      const itcAmount = totalCapEx * financialParams.itcRate;

      // Calculate initial probabilities
      const initialGoNoGo = modifiedCategories.reduce(
        (prob, cat) => prob * cat.goNoGoProbability,
        1
      );

      // Year 0 (Development)
      flows.push(-totalDevEx);
      expectedFlows.push(-totalDevEx * cumulativeProbability);

      cumulativeProbability *= initialGoNoGo;

      // Year 1 (Construction)
      flows.push(-totalCapEx);
      expectedFlows.push(-totalCapEx * cumulativeProbability);

      // Year 2 onwards (Operations)
      const opEx =
        financialParams.baseOpExPerMW *
        systemParams.systemSize *
        systemParams.systemSize;
      let degradationFactor = 1;
      const electricityRate = 120;
      const priceEscalation = 0.02;
      const degradationRate = 0.005;
      const annualGeneration =
        systemParams.acSystemSize *
        (systemParams.capacityFactor / 100) *
        24 *
        365;

      for (let i = 2; i <= years; i++) {
        degradationFactor -= degradationRate;
        const generation = annualGeneration * degradationFactor;
        const escalatedRate =
          electricityRate * Math.pow(1 + priceEscalation, i - 2);
        const revenue = generation * escalatedRate;
        const annualOpEx = opEx * Math.pow(1.01, i - 2);

        const cashFlow = revenue - annualOpEx;
        flows.push(cashFlow);
        expectedFlows.push(cashFlow * cumulativeProbability);
      }

      // Add ITC in year 3
      flows[2] += itcAmount;
      expectedFlows[2] += itcAmount * cumulativeProbability;

      // Calculate IRR using the expected cash flows
      return calculateIRR(expectedFlows);
    },
    [riskCategories, systemParams, financialParams]
  );

  // Generate sensitivity data when selected category changes
  useEffect(() => {
    const approvalRisks = [0, 5, 10, 15];
    const riskLevels = ["Low", "High"] as const;
    const newData: {
      [key: string]: { [key: string]: number };
    } = {};

    riskLevels.forEach((riskLevel) => {
      newData[riskLevel] = {};
      approvalRisks.forEach((approvalRisk) => {
        newData[riskLevel][approvalRisk] = calculateSensitivityIRR(
          selectedCategory,
          riskLevel,
          approvalRisk
        );
      });
    });

    setSensitivityData(newData);
  }, [
    selectedCategory,
    riskCategories,
    systemParams,
    financialParams,
    calculateSensitivityIRR,
  ]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-purple-700">
        Sensitivity Analysis
      </h2>
      <div className="mb-4">
        <label className="block text-lg font-medium text-purple-700 mb-2">
          Select Risk Category
        </label>
        <select
          className="w-full p-3 text-lg border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {riskCategories.map((category) => (
            <option key={category.name} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-1/2 mx-auto text-lg">
          <thead>
            <tr className="bg-purple-50">
              <th className="px-4 py-3 text-purple-700">Financing Risk</th>
              <th className="px-4 py-3 text-purple-700">Approval Risk: 0</th>
              <th className="px-4 py-3 text-purple-700">Approval Risk: 5</th>
              <th className="px-4 py-3 text-purple-700">Approval Risk: 10</th>
              <th className="px-4 py-3 text-purple-700">Approval Risk: 15</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(sensitivityData).map(([riskLevel, data]) => (
              <tr key={riskLevel} className="border-b border-purple-100">
                <td className="px-4 py-3 font-medium text-purple-700">
                  {riskLevel}
                </td>
                {[0, 5, 10, 15].map((approvalRisk) => {
                  const irrValue = data[approvalRisk];
                  const isLowIrr = irrValue < 0.1; // 10% threshold

                  return (
                    <td
                      key={approvalRisk}
                      className={`px-4 py-3 ${
                        isLowIrr ? "text-red-600 font-bold" : "text-gray-600"
                      }`}
                    >
                      {(irrValue * 100).toFixed(2)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        This table shows how the Portfolio IRR changes based on different
        combinations of financing risk and approval risk for the selected
        category. All other parameters remain unchanged. Values below 10% are
        highlighted in red.
      </p>
    </div>
  );
}
