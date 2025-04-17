"use client";

import { useState, useEffect, useCallback } from "react";
import { Bar, Line } from "react-chartjs-2";
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
  LineController,
  Filler,
  TooltipItem,
} from "chart.js";
import { RiskCategory } from "./types/risk";
import { SystemParameters } from "./types/system";
import { FinancialParameters } from "./types/financial";
import {
  calculateCashFlows,
  calculateGoNoGoProbability,
  calculateCategoryIRR,
  calculateSensitivityIRR,
} from "./utils/cashFlowCalculations";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  Filler
);

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
      <h2 className="text-xl font-semibold mb-4 text-[#004D40]">
        Risk Categories
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead>
            <tr className="bg-[#E0F2F1]">
              <th className="px-3 py-3 text-[#004D40]">Category</th>
              <th className="px-3 py-3 text-[#004D40] relative group">
                Financial Risk
                <span className="inline-block ml-1 text-xs text-[#004D40]">
                  ⓘ
                </span>
                <div className="absolute hidden group-hover:block bg-white border border-gray-200 p-2 rounded-md shadow-lg text-sm text-gray-600 w-64 z-[100] left-1/2 transform -translate-x-1/2 mt-1">
                  Higher risk means each milestone is more likely to end up on
                  the higher end of the budget range, for development and/or
                  capital expenses.
                </div>
              </th>
              <th className="px-3 py-3 text-[#004D40] relative group">
                Approval Risk
                <span className="inline-block ml-1 text-xs text-[#004D40]">
                  ⓘ
                </span>
                <div className="absolute hidden group-hover:block bg-white border border-gray-200 p-2 rounded-md shadow-lg text-sm text-gray-600 w-64 z-[100] right-0 mt-1">
                  Indicates the likelihood of the project advancing to
                  subsequent milestones. Higher risk means the project is less
                  likely to advance to the next milestone, accounting for
                  projects that fail during development.
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {riskCategories.map((category, index) => (
              <tr key={index} className="border-b border-[#B2DFDB]">
                <td className="px-3 py-3 font-medium text-[#004D40]">
                  {category.name}
                </td>
                <td className="px-3 py-3">
                  <select
                    className="w-full p-2 border border-[#B2DFDB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00695C]"
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
                    className="w-full p-2 border border-[#B2DFDB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00695C]"
                    value={category.approvalRisk}
                    onChange={(e) => {
                      const newCategories = [...riskCategories];
                      newCategories[index].approvalRisk = parseInt(
                        e.target.value
                      );
                      newCategories[index].goNoGoProbability =
                        calculateGoNoGoProbability(
                          newCategories[index].approvalRisk,
                          newCategories[index].worstCaseScenario
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
      1000 // Max iterations
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

function SplitRiskGraph({
  riskCategories,
  systemParams,
  financialParameters,
}: {
  riskCategories: RiskCategory[];
  systemParams: SystemParameters;
  financialParameters: FinancialParameters;
}) {
  const calculateCategoryIRRCallback = useCallback(
    (
      categoryName: string,
      riskLevel: "Low" | "High",
      approvalRisk: number
    ): number => {
      return calculateCategoryIRR(
        categoryName,
        riskLevel,
        approvalRisk,
        riskCategories,
        systemParams,
        financialParameters
      );
    },
    [riskCategories, systemParams, financialParameters]
  );

  const approvalRisks = Array.from({ length: 16 }, (_, i) => i);

  const allIRRs = riskCategories.flatMap((category) =>
    approvalRisks.flatMap((risk) => [
      calculateCategoryIRRCallback(category.name, "Low", risk) * 100,
      calculateCategoryIRRCallback(category.name, "High", risk) * 100,
    ])
  );
  const minIRR = Math.floor(Math.min(...allIRRs));
  const maxIRR = Math.ceil(Math.max(...allIRRs));

  const categoryColors: Record<string, string> = {
    "Site Control": "rgb(255, 99, 132)",
    Permitting: "rgb(54, 162, 235)",
    Interconnection: "rgb(75, 192, 192)",
    Design: "rgb(153, 102, 255)",
    Environmental: "rgb(255, 159, 64)",
  };

  const getChartOptions = (index: number) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: riskCategories[index].name,
        color: "#004D40",
        font: { size: 14 },
        padding: { bottom: 15 },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"line">) =>
            `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`,
        },
      },
    },
    scales: {
      y: {
        display: true,
        min: minIRR,
        max: maxIRR,
        beginAtZero: false,
        position: "left" as const,
        title: {
          display: index === 0,
          text: "Portfolio IRR (%)",
          font: { size: 10 },
        },
        ticks: {
          display: index === 0,
          font: { size: 10 },
          stepSize: 1,
        },
        grid: {
          display: true,
          drawOnChartArea: true,
          color: "rgba(0, 0, 0, 0.1)",
          lineWidth: 1,
          drawTicks: false,
        },
        border: {
          display: index === 0,
          dash: [0],
        },
      },
      x: {
        title: {
          display: true,
          text: "Approval Risk",
          font: { size: 10 },
          padding: { top: 10 },
        },
        ticks: {
          font: { size: 10 },
          stepSize: 5,
        },
        grid: {
          display: false,
        },
        border: {
          display: true,
        },
      },
    },
    layout: {
      padding: {
        left: index === 0 ? 10 : 0,
        right: 10,
      },
    },
  });

  return (
    <div className="mt-12 mb-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-[#004D40]">
        Risk Category Analysis
      </h2>
      <div className="flex items-center justify-center mb-4 space-x-8">
        <div className="flex items-center">
          <div className="w-8 h-0.5 bg-gray-600 mr-2"></div>
          <span className="text-sm text-gray-600">Low Financial Risk</span>
        </div>
        <div className="flex items-center">
          <div className="w-8 h-0.5 mr-2 border-t-2 border-dashed border-gray-600"></div>
          <span className="text-sm text-gray-600">High Financial Risk</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-0">
        {riskCategories.map((category, index) => {
          const color = categoryColors[category.name] || "rgb(201, 203, 207)";

          const categoryData = {
            labels: approvalRisks,
            datasets: [
              {
                label: `${category.name} (Low Risk)`,
                data: approvalRisks.map(
                  (risk) =>
                    calculateCategoryIRRCallback(category.name, "Low", risk) *
                    100
                ),
                borderColor: color,
                backgroundColor: color
                  .replace("rgb", "rgba")
                  .replace(")", ", 0.2)"),
                fill: "+1",
                tension: 0.4,
              },
              {
                label: `${category.name} (High Risk)`,
                data: approvalRisks.map(
                  (risk) =>
                    calculateCategoryIRRCallback(category.name, "High", risk) *
                    100
                ),
                borderColor: color,
                borderDash: [5, 5],
                backgroundColor: "transparent",
                fill: false,
                tension: 0.4,
              },
            ],
          };

          return (
            <div key={category.name} className="h-[300px] relative">
              {index > 0 && (
                <div
                  className="absolute inset-y-0 left-0 w-px bg-gray-200"
                  style={{ left: "-1px", zIndex: 10 }}
                />
              )}
              <Line data={categoryData} options={getChartOptions(index)} />
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-gray-600">
        Each graph shows how IRR varies with approval risk for a specific
        category. The shaded areas represent the range between low and high
        financial risk levels.
      </p>
    </div>
  );
}

export default function Home() {
  // Risk Categories
  const [riskCategories, setRiskCategories] = useState<RiskCategory[]>([
    {
      name: "Site Control",
      riskLevel: "Low",
      devEx: 7700,
      capExIncrease: 0,
      approvalRisk: 5,
      goNoGoProbability: calculateGoNoGoProbability(5, 0.3),
      devExLow: 7700,
      devExHigh: 9000,
      capExIncreaseLow: 0,
      capExIncreaseHigh: 0,
      worstCaseScenario: 0.3,
    },
    {
      name: "Permitting",
      riskLevel: "Low",
      devEx: 40000,
      capExIncrease: 0,
      approvalRisk: 6,
      goNoGoProbability: calculateGoNoGoProbability(6, 0.3),
      devExLow: 40000,
      devExHigh: 90000,
      capExIncreaseLow: 0,
      capExIncreaseHigh: 0,
      worstCaseScenario: 0.3,
    },
    {
      name: "Interconnection",
      riskLevel: "Low",
      devEx: 146250,
      capExIncrease: 250000,
      approvalRisk: 8,
      goNoGoProbability: calculateGoNoGoProbability(8, 0.75),
      devExLow: 146250,
      devExHigh: 157750,
      capExIncreaseLow: 250000,
      capExIncreaseHigh: 2000000,
      worstCaseScenario: 0.75,
    },
    {
      name: "Design",
      riskLevel: "Low",
      devEx: 44500,
      capExIncrease: 150000,
      approvalRisk: 2,
      goNoGoProbability: calculateGoNoGoProbability(2, 0.9),
      devExLow: 44500,
      devExHigh: 52500,
      capExIncreaseLow: 150000,
      capExIncreaseHigh: 2000000,
      worstCaseScenario: 0.9,
    },
    {
      name: "Environmental",
      riskLevel: "Low",
      devEx: 26750,
      capExIncrease: 0,
      approvalRisk: 6,
      goNoGoProbability: calculateGoNoGoProbability(6, 0.5),
      devExLow: 26750,
      devExHigh: 53000,
      capExIncreaseLow: 0,
      capExIncreaseHigh: 250000,
      worstCaseScenario: 0.5,
    },
  ]);

  // System Parameters
  const [systemParams, setSystemParams] = useState<SystemParameters>({
    capacityFactor: 20,
    systemSize: 3,
    acSystemSize: 2.4,
    projectLength: 25,
    degradationRate: 0.005,
  });

  // Financial Parameters
  const [financialParameters, setFinancialParameters] =
    useState<FinancialParameters>({
      baseCaseCapExPerMW: 1850000, // $1.85/Watt * 1000000
      baseOpExPerMW: 22500, // Updated OpEx based on new model
      itcRate: 0.3,
      nySunIncentivePerWatt: 0.17,
      electricityRate: 100,
      priceEscalation: 0.02,
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

  // Add this with the other state declarations at the top of the component
  const [projectsReachingNTP, setProjectsReachingNTP] = useState<number>(0);

  // Update IRR calculations when cash flows change
  useEffect(() => {
    if (cashFlows.length > 0) {
      setSuccessfulProjectIRR(calculateIRR(cashFlows));
    }
    if (expectedCashFlows.length > 0) {
      setPortfolioIRR(calculateIRR(expectedCashFlows));
    }
  }, [cashFlows, expectedCashFlows]);

  // Update the cash flow calculation to use the imported function
  const calculateCashFlowsCallback = useCallback(() => {
    const {
      flows,
      expectedFlows,
      successfulProjectIRR,
      portfolioIRR,
      projectsReachingNTP,
    } = calculateCashFlows(riskCategories, systemParams, financialParameters);
    setCashFlows(flows);
    setExpectedCashFlows(expectedFlows);
    setSuccessfulProjectIRR(successfulProjectIRR);
    setPortfolioIRR(portfolioIRR);
    setProjectsReachingNTP(projectsReachingNTP);
  }, [riskCategories, systemParams, financialParameters]);

  useEffect(() => {
    calculateCashFlowsCallback();
  }, [calculateCashFlowsCallback]);

  // Update the chart data to use the project length
  const chartData = {
    individual: {
      labels: Array(systemParams.projectLength + 2)
        .fill(0)
        .map((_, i) => `Year ${i}`),
      datasets: [
        {
          label: "DevEx",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) =>
              i === 0
                ? -riskCategories.reduce((sum, cat) => sum + cat.devEx, 0)
                : 0
            ),
          backgroundColor: "rgba(220, 80, 100, 0.7)", // Darker red with green undertone
          borderColor: "rgb(200, 60, 80)",
          borderWidth: 1,
        },
        {
          label: "CapEx",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) =>
              i === 1
                ? -(
                    financialParameters.baseCaseCapExPerMW *
                      systemParams.systemSize +
                    riskCategories.reduce(
                      (sum, cat) => sum + cat.capExIncrease,
                      0
                    )
                  )
                : 0
            ),
          backgroundColor: "rgba(45, 145, 190, 0.7)", // Deeper blue with green undertone
          borderColor: "rgb(35, 125, 170)",
          borderWidth: 1,
        },
        {
          label: "OpEx",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) =>
              i > 1
                ? -(
                    financialParameters.baseOpExPerMW *
                    systemParams.systemSize *
                    Math.pow(1 + financialParameters.priceEscalation, i - 2)
                  )
                : 0
            ),
          backgroundColor: "rgba(65, 170, 160, 0.7)", // Teal with more green
          borderColor: "rgb(55, 150, 140)",
          borderWidth: 1,
        },
        {
          label: "Revenue",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) => {
              if (i <= 1) return 0;
              const degradationFactor =
                i === 2 ? 1 : 1 - systemParams.degradationRate * (i - 2);
              const generation =
                systemParams.acSystemSize *
                (systemParams.capacityFactor / 100) *
                24 *
                365 *
                degradationFactor;
              const escalatedRate =
                financialParameters.electricityRate *
                Math.pow(1 + financialParameters.priceEscalation, i - 2);
              return generation * escalatedRate;
            }),
          backgroundColor: "rgba(130, 90, 190, 0.7)", // Deeper purple with green undertone
          borderColor: "rgb(110, 70, 170)",
          borderWidth: 1,
        },
        {
          label: "ITC",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) =>
              i === 2
                ? (financialParameters.baseCaseCapExPerMW *
                    systemParams.systemSize +
                    riskCategories.reduce(
                      (sum, cat) => sum + cat.capExIncrease,
                      0
                    )) *
                  financialParameters.itcRate
                : 0
            ),
          backgroundColor: "rgba(225, 140, 50, 0.7)", // Deeper orange with green undertone
          borderColor: "rgb(205, 120, 30)",
          borderWidth: 1,
        },
        {
          label: "NY Sun",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) =>
              i === 1
                ? systemParams.systemSize *
                  1000000 *
                  financialParameters.nySunIncentivePerWatt
                : 0
            ),
          backgroundColor: "rgba(80, 160, 120, 0.7)", // Professional green
          borderColor: "rgb(60, 140, 100)",
          borderWidth: 1,
        },
      ],
    },
    portfolio: {
      labels: Array(systemParams.projectLength + 2) // +2 for dev and construction years
        .fill(0)
        .map((_, i) => `Year ${i}`),
      datasets: [
        {
          label: "DevEx",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) => {
              let cumulativeProbability = 1;
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
          backgroundColor: "rgba(0, 77, 64, 0.2)", // Paces dark green with opacity
          borderColor: "#004D40", // Paces dark green
          borderWidth: 2,
        },
        {
          label: "CapEx",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) => {
              let cumulativeProbability = 1;
              if (i > 0) {
                cumulativeProbability = riskCategories.reduce(
                  (prob, cat) => prob * cat.goNoGoProbability,
                  1
                );
              }
              return i === 1
                ? -(
                    financialParameters.baseCaseCapExPerMW *
                      systemParams.systemSize +
                    riskCategories.reduce(
                      (sum, cat) => sum + cat.capExIncrease,
                      0
                    )
                  ) * cumulativeProbability
                : 0;
            }),
          backgroundColor: "rgba(0, 105, 92, 0.2)", // Slightly lighter green with opacity
          borderColor: "#00695C", // Slightly lighter green
          borderWidth: 2,
        },
        {
          label: "OpEx",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) => {
              let cumulativeProbability = 1;
              if (i > 0) {
                cumulativeProbability = riskCategories.reduce(
                  (prob, cat) => prob * cat.goNoGoProbability,
                  1
                );
              }
              return i > 1
                ? -(
                    financialParameters.baseOpExPerMW *
                    systemParams.systemSize *
                    Math.pow(1 + financialParameters.priceEscalation, i - 2)
                  ) * cumulativeProbability
                : 0;
            }),
          backgroundColor: "rgba(0, 137, 123, 0.2)", // Even lighter green with opacity
          borderColor: "#00897B", // Even lighter green
          borderWidth: 2,
        },
        {
          label: "Revenue",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) => {
              if (i <= 1) return 0;

              let cumulativeProbability = 1;
              if (i > 0) {
                cumulativeProbability = riskCategories.reduce(
                  (prob, cat) => prob * cat.goNoGoProbability,
                  1
                );
              }

              const degradationFactor =
                i === 2 ? 1 : 1 - systemParams.degradationRate * (i - 2);
              const generation =
                systemParams.acSystemSize *
                (systemParams.capacityFactor / 100) *
                24 *
                365 *
                degradationFactor;
              const escalatedRate =
                financialParameters.electricityRate *
                Math.pow(1 + financialParameters.priceEscalation, i - 2);

              return generation * escalatedRate * cumulativeProbability;
            }),
          backgroundColor: "rgba(178, 223, 219, 0.2)", // Lightest green with opacity
          borderColor: "#B2DFDB", // Lightest green
          borderWidth: 2,
        },
        {
          label: "ITC",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) => {
              let cumulativeProbability = 1;
              if (i > 0) {
                cumulativeProbability = riskCategories.reduce(
                  (prob, cat) => prob * cat.goNoGoProbability,
                  1
                );
              }
              return i === 2
                ? (financialParameters.baseCaseCapExPerMW *
                    systemParams.systemSize +
                    riskCategories.reduce(
                      (sum, cat) => sum + cat.capExIncrease,
                      0
                    )) *
                    financialParameters.itcRate *
                    cumulativeProbability
                : 0;
            }),
          backgroundColor: "rgba(0, 77, 64, 0.2)", // Paces dark green with opacity
          borderColor: "#004D40", // Paces dark green
          borderWidth: 2,
        },
        {
          label: "NY Sun",
          data: Array(systemParams.projectLength + 2)
            .fill(0)
            .map((_, i) => {
              let cumulativeProbability = 1;
              if (i > 0) {
                cumulativeProbability = riskCategories.reduce(
                  (prob, cat) => prob * cat.goNoGoProbability,
                  1
                );
              }
              return i === 1
                ? systemParams.systemSize *
                    1000000 *
                    financialParameters.nySunIncentivePerWatt *
                    cumulativeProbability
                : 0;
            }),
          backgroundColor: "rgba(0, 77, 64, 0.2)", // Paces dark green with opacity
          borderColor: "#004D40", // Paces dark green
          borderWidth: 2,
        },
      ],
    },
  };

  // Add a function to download cash flow table as CSV
  const downloadCashFlowCSV = () => {
    let csvContent = "Category,";
    for (let i = 0; i <= systemParams.projectLength + 1; i++) {
      csvContent += `Year ${i},`;
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add DevEx row
    csvContent += "DevEx,";
    for (let i = 0; i <= systemParams.projectLength + 1; i++) {
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
    for (let i = 0; i <= systemParams.projectLength + 1; i++) {
      csvContent +=
        i === 1
          ? `$${Math.round(
              financialParameters.baseCaseCapExPerMW * systemParams.systemSize +
                riskCategories.reduce((sum, cat) => sum + cat.capExIncrease, 0)
            ).toLocaleString()},`
          : ",";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add OpEx row
    csvContent += "OpEx,";
    for (let i = 0; i <= systemParams.projectLength + 1; i++) {
      csvContent +=
        i > 1
          ? `$${Math.round(
              financialParameters.baseOpExPerMW *
                systemParams.systemSize *
                Math.pow(1 + financialParameters.priceEscalation, i - 2)
            ).toLocaleString()},`
          : ",";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add Revenue row
    csvContent += "Revenue,";
    for (let i = 0; i <= systemParams.projectLength + 1; i++) {
      csvContent +=
        i > 1
          ? `$${Math.round(
              systemParams.acSystemSize *
                (systemParams.capacityFactor / 100) *
                24 *
                365 *
                (1 - 0.005 * (i - 2)) *
                financialParameters.electricityRate *
                Math.pow(1 + financialParameters.priceEscalation, i - 2)
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
    for (let i = 0; i <= systemParams.projectLength + 1; i++) {
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

  // Add logging for Go/No-Go probabilities
  useEffect(() => {
    console.log("Go/No-Go Probabilities for each category:");
    riskCategories.forEach((category: RiskCategory) => {
      console.log(
        `${category.name}: ${(category.goNoGoProbability * 100).toFixed(2)}%`
      );
    });
  }, [riskCategories]);

  // Add summary logging for cash flows
  useEffect(() => {
    if (cashFlows.length > 0) {
      // Calculate totals
      const totalDevEx = -riskCategories.reduce(
        (sum, cat) => sum + cat.devEx,
        0
      );
      const totalCapEx = -(
        financialParameters.baseCaseCapExPerMW * systemParams.systemSize +
        riskCategories.reduce((sum, cat) => sum + cat.capExIncrease, 0)
      );

      // Calculate total OpEx (all negative values after year 1)
      const totalOpEx = cashFlows.slice(2).reduce((sum, flow) => {
        if (flow < 0) return sum + flow;
        return sum;
      }, 0);

      // Calculate total revenue (all positive values after year 1)
      const totalRevenue = cashFlows.slice(2).reduce((sum, flow) => {
        if (flow > 0) return sum + flow;
        return sum;
      }, 0);

      // Calculate total incentives (ITC and NY Sun)
      const totalITC =
        (financialParameters.baseCaseCapExPerMW * systemParams.systemSize +
          riskCategories.reduce((sum, cat) => sum + cat.capExIncrease, 0)) *
        financialParameters.itcRate;
      const totalNYSun =
        systemParams.systemSize *
        1000000 *
        financialParameters.nySunIncentivePerWatt;
      console.log(cashFlows);
      console.log(cashFlows.length);

      console.log("Cash Flow Summary:");
      console.log("-----------------");
      console.log(`Total Development Costs: $${totalDevEx.toLocaleString()}`);
      console.log(`Total Capital Costs: $${totalCapEx.toLocaleString()}`);
      console.log(
        `Total Operating Costs: $${Math.abs(totalOpEx).toLocaleString()}`
      );
      console.log(`Total Revenue: $${totalRevenue.toLocaleString()}`);
      console.log(`Total ITC: $${totalITC.toLocaleString()}`);
      console.log(`Total NY Sun Incentive: $${totalNYSun.toLocaleString()}`);
      console.log(
        `Net Cash Flow: $${cashFlows
          .reduce((sum, flow) => sum + flow, 0)
          .toLocaleString()}`
      );
    }
  }, [cashFlows, riskCategories, systemParams, financialParameters]);

  return (
    <>
      <header className="bg-gradient-to-r from-[#004D40] via-[#00695C] to-[#00897B] py-12 px-6 shadow-md g mb-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl font-bold text-white text-center tracking-tight">
            Pre-Development at Scale
          </h1>
          <p className="text-[#E0F2F1] text-center mt-4 text-xl font-light tracking-wide max-w-3xl mx-auto">
            A Probabilistic Financial Model for Solar Development
          </p>
        </div>
      </header>

      <main className="main-content">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-semibold mb-8 text-[#004D40]">
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
              <h2 className="text-xl font-semibold mb-4 text-[#004D40]">
                System Parameters
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-[#004D40]">
                    Capacity Factor (%)
                  </label>
                  <input
                    type="number"
                    className="mt-1 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-[#00695C] focus:ring-[#00695C]"
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
                  <label className="block text-sm font-medium text-[#004D40]">
                    System Size (MW)
                  </label>
                  <input
                    type="number"
                    className="mt-1 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-[#00695C] focus:ring-[#00695C]"
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
                  <label className="block text-sm font-medium text-[#004D40]">
                    Project Length (years)
                  </label>
                  <input
                    type="number"
                    className="mt-1 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-[#00695C] focus:ring-[#00695C]"
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
              <h2 className="text-xl font-semibold mb-4 text-[#004D40]">
                Financial Parameters
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#004D40]">
                    Base Case CapEx ($/MW)
                  </label>
                  <input
                    type="number"
                    value={financialParameters.baseCaseCapExPerMW}
                    onChange={(e) =>
                      setFinancialParameters({
                        ...financialParameters,
                        baseCaseCapExPerMW: Number(e.target.value),
                      })
                    }
                    className="mt-2 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-[#00695C] focus:ring-[#00695C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#004D40]">
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
                  <label className="block text-sm font-medium text-[#004D40]">
                    Base OpEx ($/MW/year)
                  </label>
                  <input
                    type="number"
                    value={financialParameters.baseOpExPerMW}
                    onChange={(e) =>
                      setFinancialParameters({
                        ...financialParameters,
                        baseOpExPerMW: Number(e.target.value),
                      })
                    }
                    className="mt-2 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-[#00695C] focus:ring-[#00695C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#004D40]">
                    Total CapEx
                  </label>
                  <div className="text-base text-gray-600 mt-2 p-2">
                    $
                    {(
                      financialParameters.baseCaseCapExPerMW *
                        systemParams.systemSize +
                      riskCategories.reduce(
                        (sum, cat) => sum + cat.capExIncrease,
                        0
                      )
                    ).toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#004D40]">
                    ITC Rate (%)
                  </label>
                  <input
                    type="number"
                    value={(financialParameters.itcRate * 100).toFixed(2)}
                    onChange={(e) =>
                      setFinancialParameters({
                        ...financialParameters,
                        itcRate: Number(e.target.value) / 100,
                      })
                    }
                    className="mt-2 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-[#00695C] focus:ring-[#00695C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#004D40]">
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
              <h2 className="text-2xl font-bold text-[#004D40]">
                Project Cash Flow
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setChartView("individual")}
                  className={`px-4 py-2 bg-[#004D40] text-white rounded-md hover:bg-[#00695C] transition-colors`}
                >
                  Individual Project
                </button>
                <button
                  onClick={() => setChartView("portfolio")}
                  className={`px-4 py-2 bg-[#004D40] text-white rounded-md hover:bg-[#00695C] transition-colors`}
                >
                  Portfolio View
                </button>
              </div>
            </div>

            {/* IRR Display */}
            <div className="flex justify-center mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center mx-8">
                <div className="text-lg font-medium text-[#004D40]">
                  Successful Project IRR
                </div>
                <div className="text-3xl font-bold text-[#004D40]">
                  {(successfulProjectIRR * 100).toFixed(2)}%
                </div>
              </div>
              <div className="text-center mx-8">
                <div className="text-lg font-medium text-[#004D40]">
                  Portfolio IRR
                </div>
                <div className="text-3xl font-bold text-[#004D40]">
                  {(portfolioIRR * 100).toFixed(2)}%
                </div>
              </div>
              <div className="text-center mx-8">
                <div className="text-lg font-medium text-[#004D40]">
                  Projects Reaching NTP
                </div>
                <div className="text-3xl font-bold text-[#004D40]">
                  {(projectsReachingNTP * 100).toFixed(1)}%
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
                        color: "#004D40", // Paces dark green
                      },
                    },
                    title: {
                      display: true,
                      text: "Individual Project Cash Flow Breakdown",
                      color: "#004D40", // Paces dark green
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
                        color: "#004D40", // Paces dark green
                        callback: function (value) {
                          return `$${value.toLocaleString()}`;
                        },
                      },
                    },
                    x: {
                      stacked: true,
                      ticks: {
                        color: "#004D40", // Paces dark green
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
                        color: "#004D40", // Paces dark green
                      },
                    },
                    title: {
                      display: true,
                      text: "Portfolio View - Expected Cash Flow Breakdown",
                      color: "#004D40", // Paces dark green
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
                        color: "#004D40", // Paces dark green
                        callback: function (value) {
                          return `$${value.toLocaleString()}`;
                        },
                      },
                    },
                    x: {
                      stacked: true,
                      ticks: {
                        color: "#004D40", // Paces dark green
                      },
                    },
                  },
                }}
              />
            )}
          </div>

          {/* Risk Category Analysis */}
          <SplitRiskGraph
            riskCategories={riskCategories}
            systemParams={systemParams}
            financialParameters={financialParameters}
          />

          {/* Sensitivity Analysis */}
          <div className="mt-8 mb-8">
            <SensitivityAnalysis
              riskCategories={riskCategories}
              systemParams={systemParams}
              financialParameters={financialParameters}
            />
          </div>

          {/* Cash Flow Table */}
          <div className="mt-8 mb-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#004D40]">
                Cash Flow Table
              </h2>
              <button
                onClick={downloadCashFlowCSV}
                className="px-4 py-2 bg-[#004D40] text-white rounded-md hover:bg-[#00695C] transition-colors"
              >
                Download CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead>
                  <tr className="bg-[#E0F2F1]">
                    <th className="px-3 py-3 text-[#004D40]">Category</th>
                    {Array(systemParams.projectLength + 2) // +2 for dev and construction years
                      .fill(0)
                      .map((_, i) => (
                        <th key={i} className="px-3 py-3 text-[#004D40]">
                          Year {i}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-3 font-medium text-[#004D40]">
                      DevEx
                    </td>
                    {Array(systemParams.projectLength + 2)
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
                    <td className="px-3 py-3 font-medium text-[#004D40]">
                      CapEx
                    </td>
                    {Array(systemParams.projectLength + 2)
                      .fill(0)
                      .map((_, i) => (
                        <td key={i} className="px-3 py-3 text-gray-600">
                          {i === 1
                            ? `$${Math.round(
                                financialParameters.baseCaseCapExPerMW *
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
                    <td className="px-3 py-3 font-medium text-[#004D40]">
                      OpEx
                    </td>
                    {Array(systemParams.projectLength + 2)
                      .fill(0)
                      .map((_, i) => (
                        <td key={i} className="px-3 py-3 text-gray-600">
                          {i > 1
                            ? `$${Math.round(
                                financialParameters.baseOpExPerMW *
                                  systemParams.systemSize *
                                  Math.pow(
                                    1 + financialParameters.priceEscalation,
                                    i - 2
                                  )
                              ).toLocaleString()}`
                            : ""}
                        </td>
                      ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-3 font-medium text-[#004D40]">
                      Revenue
                    </td>
                    {Array(systemParams.projectLength + 2)
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
                                  financialParameters.electricityRate *
                                  Math.pow(
                                    1 + financialParameters.priceEscalation,
                                    i - 2
                                  )
                              ).toLocaleString()}`
                            : ""}
                        </td>
                      ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-3 font-medium text-[#004D40]">
                      Cash Flow
                    </td>
                    {cashFlows.map((flow, i) => (
                      <td key={i} className="px-3 py-3 text-gray-600">
                        {`$${Math.round(flow).toLocaleString()}`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-3 font-medium text-[#004D40]">
                      % of projects
                    </td>
                    {Array(systemParams.projectLength + 2)
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
                    <td className="px-3 py-3 font-medium text-[#004D40]">
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
  financialParameters,
}: {
  riskCategories: RiskCategory[];
  systemParams: SystemParameters;
  financialParameters: FinancialParameters;
}) {
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Site Control");
  const [sensitivityData, setSensitivityData] = useState<{
    [key: string]: { [key: string]: number };
  }>({});

  // Remove the local calculateSensitivityIRR function and update the useEffect
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
          approvalRisk,
          riskCategories,
          systemParams,
          financialParameters
        );
      });
    });

    setSensitivityData(newData);
  }, [selectedCategory, riskCategories, systemParams, financialParameters]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-[#004D40]">
        Sensitivity Analysis
      </h2>
      <div className="mb-4">
        <label className="block text-lg font-medium text-[#004D40] mb-2">
          Select Risk Category
        </label>
        <select
          className="w-full p-3 text-lg border border-[#B2DFDB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00695C]"
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
            <tr className="bg-[#E0F2F1]">
              <th className="px-4 py-3 text-[#004D40]">Financing Risk</th>
              <th className="px-4 py-3 text-[#004D40]">Approval Risk: 0</th>
              <th className="px-4 py-3 text-[#004D40]">Approval Risk: 5</th>
              <th className="px-4 py-3 text-[#004D40]">Approval Risk: 10</th>
              <th className="px-4 py-3 text-[#004D40]">Approval Risk: 15</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(sensitivityData).map(([riskLevel, data]) => (
              <tr key={riskLevel} className="border-b border-[#B2DFDB]">
                <td className="px-4 py-3 font-medium text-[#004D40]">
                  {riskLevel}
                </td>
                {[0, 5, 10, 15].map((approvalRisk) => {
                  const irrValue = data[approvalRisk];
                  const isLowIrr = irrValue < 0.1; // 10% threshold

                  return (
                    <td
                      key={approvalRisk}
                      className={`px-4 py-3 ${
                        isLowIrr ? "text-red-700 font-bold" : "text-gray-600"
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
        category. All other parameters remain unchanged.
      </p>
    </div>
  );
}
