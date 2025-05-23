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
import annotationPlugin from "chartjs-plugin-annotation";
import { RiskCategory } from "./types/risk";
import { SystemParameters } from "./types/system";
import { FinancialParameters } from "./types/financial";
import {
  calculateCashFlows,
  calculateGoNoGoProbability,
  calculateCategoryIRR,
  calculateSensitivityIRR,
} from "./utils/cashFlowCalculations";
import * as XLSX from "xlsx";
import { Tooltip as InfoTooltip } from "./components/Tooltip";

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
  Filler,
  annotationPlugin
);

// Add useMediaQuery hook
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
};

function RiskCategories({
  riskCategories,
  setRiskCategories,
}: {
  riskCategories: RiskCategory[];
  setRiskCategories: (categories: RiskCategory[]) => void;
  isMobile: boolean;
  activeTooltip: string | null;
  handleTooltipInteraction: (tooltipId: string) => void;
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
      <h2 className="text-xl font-semibold mb-4 text-[#1D3834]">
        Risk Categories
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead>
            <tr className="bg-[#E0F2F1]">
              <th className="px-3 py-3 text-[#1D3834]">Category</th>
              <th className="px-3 py-3 text-[#1D3834]">
                <InfoTooltip
                  id="financial-risk-tooltip"
                  trigger={<span>Financial Risk ⓘ</span>}
                >
                  Higher financial risk means each milestone is more likely to
                  end up on the higher end of the budget range, for development
                  and/or capital expenses.
                </InfoTooltip>
              </th>
              <th className="px-3 py-3 text-[#1D3834]">
                <InfoTooltip
                  id="approval-risk-tooltip"
                  trigger={<span>Approval Risk ⓘ</span>}
                >
                  Indicates the likelihood of the project advancing to
                  subsequent milestones. Higher risk means the project is less
                  likely to advance to the next milestone, accounting for
                  projects that fail during development.
                </InfoTooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {riskCategories.map((category, index) => (
              <tr key={index} className="border-b border-[#B2DFDB]">
                <td className="px-3 py-3 font-medium text-[#1D3834]">
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
                    value={category.approvalRisk ?? ""}
                    onChange={(e) => {
                      const newCategories = [...riskCategories];
                      const inputValue = e.target.value;

                      // Allow empty input
                      if (inputValue === "") {
                        newCategories[index].approvalRisk = undefined;
                        // Set a default probability when input is empty
                        newCategories[index].goNoGoProbability =
                          calculateGoNoGoProbability(
                            1, // Default to 1 for probability calculation
                            newCategories[index].worstCaseScenario
                          );
                        setRiskCategories(newCategories);
                        return;
                      }

                      const numValue = parseInt(inputValue);

                      // Only update if it's a valid number
                      if (!isNaN(numValue)) {
                        // Apply constraints and update only if within valid range
                        if (numValue >= 1 && numValue <= 15) {
                          newCategories[index].approvalRisk = numValue;
                          newCategories[index].goNoGoProbability =
                            calculateGoNoGoProbability(
                              numValue,
                              newCategories[index].worstCaseScenario
                            );
                          setRiskCategories(newCategories);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const newCategories = [...riskCategories];
                      const inputValue = e.target.value;

                      // If empty on blur, reset to 1
                      if (inputValue === "" || isNaN(parseInt(inputValue))) {
                        newCategories[index].approvalRisk = 1;
                        newCategories[index].goNoGoProbability =
                          calculateGoNoGoProbability(
                            1,
                            newCategories[index].worstCaseScenario
                          );
                        setRiskCategories(newCategories);
                        return;
                      }

                      // Ensure value is within constraints on blur
                      const numValue = Math.min(
                        15,
                        Math.max(1, parseInt(inputValue))
                      );
                      newCategories[index].approvalRisk = numValue;
                      newCategories[index].goNoGoProbability =
                        calculateGoNoGoProbability(
                          numValue,
                          newCategories[index].worstCaseScenario
                        );
                      setRiskCategories(newCategories);
                    }}
                    min="1"
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
  isMobile,
}: {
  riskCategories: RiskCategory[];
  systemParams: SystemParameters;
  financialParameters: FinancialParameters;
  isMobile: boolean;
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
        color: "#1D3834",
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
          display: isMobile || index === 0,
          text: "Portfolio IRR (%)",
          font: { size: 10 },
        },
        ticks: {
          display: isMobile || index === 0,
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
      <h2 className="text-2xl font-bold mb-4 text-[#1D3834]">
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
      <div
        className={`grid ${
          isMobile ? "grid-cols-1 gap-8" : "grid-cols-5 gap-0"
        }`}
      >
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
            <div
              key={category.name}
              className={`h-[300px] relative ${isMobile ? "w-full" : ""}`}
            >
              {index > 0 && !isMobile && (
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
      <h2 className="text-2xl font-bold mb-4 text-[#1D3834]">
        Sensitivity Analysis
      </h2>
      <div className="mb-4">
        <label className="block text-lg font-medium text-[#1D3834] mb-2">
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
              <th className="px-4 py-3 text-[#1D3834]">Financing Risk</th>
              <th className="px-4 py-3 text-[#1D3834]">Approval Risk: 0</th>
              <th className="px-4 py-3 text-[#1D3834]">Approval Risk: 5</th>
              <th className="px-4 py-3 text-[#1D3834]">Approval Risk: 10</th>
              <th className="px-4 py-3 text-[#1D3834]">Approval Risk: 15</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(sensitivityData).map(([riskLevel, data]) => (
              <tr key={riskLevel} className="border-b border-[#B2DFDB]">
                <td className="px-4 py-3 font-medium text-[#1D3834]">
                  {riskLevel}
                </td>
                {[0, 5, 10, 15].map((approvalRisk) => {
                  const irrValue = data[approvalRisk];
                  const isLowIrr = irrValue < 0.1; // 10% threshold
                  const isHighIrr = irrValue >= 0.1; // 10% threshold

                  return (
                    <td
                      key={approvalRisk}
                      className={`px-4 py-3 ${
                        isLowIrr
                          ? "text-red-700 font-bold"
                          : isHighIrr
                          ? "text-[#006D4B] font-bold"
                          : "text-gray-600"
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

export default function Home() {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Add this helper function to handle tooltip interactions
  const handleTooltipInteraction = (tooltipId: string) => {
    if (isMobile) {
      setActiveTooltip(activeTooltip === tooltipId ? null : tooltipId);
    }
  };

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
    capacityFactor: 14,
    systemSize: 3,
    acSystemSize: 2.4,
    projectLength: 25,
    degradationRate: 0.005,
    pipelineSize: 10, // Fixed value, not user input
  });

  // Financial Parameters
  const [financialParameters, setFinancialParameters] =
    useState<FinancialParameters>({
      baseCaseCapExPerMW: 1700000, // $1.7/Watt * 1000000
      baseOpExPerMW: 22500,
      itcRate: 0.3,
      nySunIncentivePerWatt: 0.17,
      electricityRate: 140,
      priceEscalation: 0.02,
    });

  const [cashFlows, setCashFlows] = useState<number[]>([]);
  const [expectedCashFlows, setExpectedCashFlows] = useState<number[]>([]);

  // Add this state for chart view toggle
  const [view, setView] = useState<"individual" | "portfolio">("individual");

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
  }, [cashFlows, expectedCashFlows, riskCategories, systemParams.pipelineSize]);

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
                systemParams.systemSize *
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
      labels: Array(systemParams.projectLength + 2)
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
                    cumulativeProbability *
                    systemParams.pipelineSize
                : 0;
            }),
          backgroundColor: "rgba(220, 80, 100, 0.7)",
          borderColor: "rgb(200, 60, 80)",
          borderWidth: 1,
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
                  ) *
                    cumulativeProbability *
                    systemParams.pipelineSize
                : 0;
            }),
          backgroundColor: "rgba(45, 145, 190, 0.7)",
          borderColor: "rgb(35, 125, 170)",
          borderWidth: 1,
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
                  ) *
                    cumulativeProbability *
                    systemParams.pipelineSize
                : 0;
            }),
          backgroundColor: "rgba(65, 170, 160, 0.7)",
          borderColor: "rgb(55, 150, 140)",
          borderWidth: 1,
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
                systemParams.systemSize *
                (systemParams.capacityFactor / 100) *
                24 *
                365 *
                degradationFactor;
              const escalatedRate =
                financialParameters.electricityRate *
                Math.pow(1 + financialParameters.priceEscalation, i - 2);

              return (
                generation *
                escalatedRate *
                cumulativeProbability *
                systemParams.pipelineSize
              );
            }),
          backgroundColor: "rgba(130, 90, 190, 0.7)",
          borderColor: "rgb(110, 70, 170)",
          borderWidth: 1,
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
                    cumulativeProbability *
                    systemParams.pipelineSize
                : 0;
            }),
          backgroundColor: "rgba(225, 140, 50, 0.7)",
          borderColor: "rgb(205, 120, 30)",
          borderWidth: 1,
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
                    cumulativeProbability *
                    systemParams.pipelineSize
                : 0;
            }),
          backgroundColor: "rgba(80, 160, 120, 0.7)",
          borderColor: "rgb(60, 140, 100)",
          borderWidth: 1,
        },
      ],
    },
  };

  // Replace the downloadCashFlowCSV function with this new Excel download function
  const downloadExcel = () => {
    // Create the worksheet data
    const wsData = [
      [
        "Category",
        ...Array(systemParams.projectLength + 2)
          .fill(0)
          .map((_, i) => `Year ${i}`),
      ],
      [
        "DevEx",
        ...Array(systemParams.projectLength + 2)
          .fill(0)
          .map((_, i) =>
            i === 0
              ? -riskCategories.reduce((sum, cat) => sum + cat.devEx, 0)
              : 0
          ),
      ],
      [
        "CapEx",
        ...Array(systemParams.projectLength + 2)
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
      ],
      [
        "Incentives",
        ...Array(systemParams.projectLength + 2)
          .fill(0)
          .map((_, i) =>
            i === 1
              ? systemParams.systemSize *
                1000000 *
                financialParameters.nySunIncentivePerWatt
              : i === 2
              ? (financialParameters.baseCaseCapExPerMW *
                  systemParams.systemSize +
                  riskCategories.reduce(
                    (sum, cat) => sum + cat.capExIncrease,
                    0
                  )) *
                financialParameters.itcRate
              : 0
          ),
      ],
      [
        "Revenue",
        ...Array(systemParams.projectLength + 2)
          .fill(0)
          .map((_, i) =>
            i > 1
              ? systemParams.systemSize *
                (systemParams.capacityFactor / 100) *
                24 *
                365 *
                (1 - 0.005 * (i - 2)) *
                financialParameters.electricityRate *
                Math.pow(1 + financialParameters.priceEscalation, i - 2)
              : 0
          ),
      ],
      [
        "OpEx",
        ...Array(systemParams.projectLength + 2)
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
      ],
      ["Cash Flow", ...cashFlows],
      [
        "% of projects",
        ...Array(systemParams.projectLength + 2)
          .fill(0)
          .map((_, i) => {
            let cumulativeProbability = 1;
            if (i > 0) {
              cumulativeProbability = riskCategories.reduce(
                (prob, cat) => prob * cat.goNoGoProbability,
                1
              );
            }
            return cumulativeProbability;
          }),
      ],
      ["Expected Cash Flow", ...expectedCashFlows],
    ];

    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = [{ wch: 20 }]; // First column width
    for (let i = 0; i <= systemParams.projectLength + 1; i++) {
      colWidths.push({ wch: 15 }); // Other columns width
    }
    ws["!cols"] = colWidths;

    // Style the cells
    for (let i = 0; i < wsData.length; i++) {
      for (let j = 0; j < wsData[i].length; j++) {
        const cellRef = XLSX.utils.encode_cell({ r: i, c: j });
        if (!ws[cellRef]) ws[cellRef] = { v: null };

        // Add cell styles
        ws[cellRef].s = {
          font: { bold: i === 0 || j === 0 },
          alignment: { horizontal: j === 0 ? "left" : "right" },
          numFmt:
            j === 0
              ? "@" // Text format for first column
              : i === 7
              ? "0%" // Percentage format for % of projects row
              : "#,##0", // Number format with thousands separator
        };
      }
    }

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Cash Flow Analysis");

    // Generate the Excel file and trigger download
    XLSX.writeFile(wb, "cash_flow_analysis.xlsx");
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

  // Update the chart options to handle mobile view
  const getChartOptions = (isPortfolio: boolean) => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: isMobile ? ("y" as const) : ("x" as const),
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#1D3834",
        },
      },
      title: {
        display: true,
        text: isPortfolio
          ? "Portfolio Cash Flow"
          : "Individual Project Cash Flow",
        color: "#1D3834",
      },
      tooltip: {
        callbacks: {
          label: function (context: TooltipItem<"bar">) {
            const value = context.raw as number;
            const year = context.dataIndex;
            if (isPortfolio) {
              let cumulativeProbability = 1;
              if (year > 0) {
                cumulativeProbability = riskCategories.reduce(
                  (prob, cat) => prob * cat.goNoGoProbability,
                  1
                );
              }
              return `${
                context.dataset.label
              }: $${value.toLocaleString()} (% of pipeline: ${(
                cumulativeProbability * 100
              ).toFixed(2)}%)`;
            }
            return `${context.dataset.label}: $${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        stacked: true,
        ticks: {
          color: "#1D3834",
          callback: function (value: number | string) {
            if (isMobile) {
              if (value === 1) return ["Year 1", "(NTP)"];
              if (value === 2) return ["Year 2", "(COD)"];
              return `Year ${value}`;
            }
            return `$${value.toLocaleString()}`;
          },
        },
        barThickness: isMobile ? 20 : undefined,
        categoryPercentage: isMobile ? 0.95 : undefined,
        barPercentage: isMobile ? 0.98 : undefined,
      },
      x: {
        stacked: true,
        ticks: {
          color: "#1D3834",
          callback: function (value: number | string) {
            if (isMobile) {
              return `$${value.toLocaleString()}`;
            }
            if (value === 1) return ["Year 1", "(NTP)"];
            if (value === 2) return ["Year 2", "(COD)"];
            return `Year ${value}`;
          },
        },
      },
    },
    layout: {
      padding: {
        top: 20,
        bottom: 20,
      },
    },
  });

  return (
    <>
      <header className="bg-[#1D3834] py-12 px-6 shadow-md g mb-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl font-bold text-white text-center tracking-tight">
            Pre-Development at Scale
          </h1>
          <p className="text-[#E0F2F1] text-center mt-4 text-2xl font-light tracking-wide max-w-3xl mx-auto">
            A Probabilistic Financial Model for Community Solar Development
          </p>
          <p className="text-[#E0F2F1] text-center mt-4 text-base font-light tracking-wide max-w-3xl mx-auto italic">
            Dive deeper into how this model was built and what it means for
            solar development.
            <br />
            <a
              href="https://www.paces.com/white-papers/pre-development-at-scale-modeling-risk-in-early-stage-solar-development"
              className="underline hover:text-white"
            >
              Read the whitepaper →
            </a>
          </p>
        </div>
      </header>

      <main className="main-content">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-semibold mb-8 text-[#1D3834]">
            Model Inputs
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="card p-6">
              <RiskCategories
                riskCategories={riskCategories}
                setRiskCategories={setRiskCategories}
                isMobile={isMobile}
                activeTooltip={activeTooltip}
                handleTooltipInteraction={handleTooltipInteraction}
              />
            </div>

            {/* System Parameters */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4 text-[#1D3834]">
                System Parameters
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-[#1D3834]">
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
                  <label className="block text-sm font-medium text-[#1D3834]">
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
                  <label className="block text-sm font-medium text-[#1D3834]">
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
              <h2 className="text-xl font-semibold mb-4 text-[#1D3834]">
                Financial Parameters
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1D3834]">
                    Base Case CapEx ($/MW)
                  </label>
                  <input
                    type="text"
                    value={financialParameters.baseCaseCapExPerMW.toLocaleString()}
                    onChange={(e) =>
                      setFinancialParameters({
                        ...financialParameters,
                        baseCaseCapExPerMW: Number(
                          e.target.value.replace(/,/g, "")
                        ),
                      })
                    }
                    className="mt-2 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-[#00695C] focus:ring-[#00695C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1D3834]">
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
                  <label className="block text-sm font-medium text-[#1D3834]">
                    Base OpEx ($/MW/year)
                  </label>
                  <input
                    type="text"
                    value={financialParameters.baseOpExPerMW.toLocaleString()}
                    onChange={(e) =>
                      setFinancialParameters({
                        ...financialParameters,
                        baseOpExPerMW: Number(e.target.value.replace(/,/g, "")),
                      })
                    }
                    className="mt-2 block w-full p-2 text-base rounded-md border-gray-300 shadow-sm focus:border-[#00695C] focus:ring-[#00695C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1D3834]">
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
                  <label className="block text-sm font-medium text-[#1D3834]">
                    ITC Rate (%)
                  </label>
                  <input
                    type="number"
                    value={Math.round(financialParameters.itcRate * 100)}
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
                  <label className="block text-sm font-medium text-[#1D3834]">
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

              <h3 className="text-lg font-medium mt-6 mb-4 text-[#1D3834] border-t border-[#B2DFDB] pt-4">
                Financial Assumptions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1D3834]">
                    Electricity Rate ($/MWh)
                  </label>
                  <div className="text-base text-gray-600 mt-2 p-2">
                    ${financialParameters.electricityRate.toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1D3834]">
                    Escalation Rate (%)
                  </label>
                  <div className="text-base text-gray-600 mt-2 p-2">
                    {Math.round(financialParameters.priceEscalation * 100)}%
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1D3834]">
                    NY-Sun Incentive ($/W)
                  </label>
                  <div className="text-base text-gray-600 mt-2 p-2">
                    ${financialParameters.nySunIncentivePerWatt.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Section */}
          <div className="mt-8 mb-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div
              className={`${
                isMobile
                  ? "flex flex-col space-y-4"
                  : "flex justify-between items-center"
              } mb-4`}
            >
              <h2 className="text-2xl font-bold text-[#1D3834]">
                {view === "individual" ? (
                  "Project Cash Flow"
                ) : (
                  <InfoTooltip
                    id="portfolio-cash-flow"
                    trigger={<span>Portfolio Cash Flow ⓘ</span>}
                  >
                    The cash flow breakdown for the entire portfolio, showing
                    expected costs and revenues across all projects.
                  </InfoTooltip>
                )}
              </h2>
              <div className="flex space-x-4">
                <button
                  onClick={() => setView("individual")}
                  className={`px-4 py-2 rounded-md ${
                    view === "individual"
                      ? "bg-[#1D3834] text-white"
                      : "bg-[#B2DFDB] text-[#1D3834]"
                  }`}
                >
                  Individual Project
                </button>
                <button
                  onClick={() => setView("portfolio")}
                  className={`px-4 py-2 rounded-md ${
                    view === "portfolio"
                      ? "bg-[#1D3834] text-white"
                      : "bg-[#B2DFDB] text-[#1D3834]"
                  }`}
                >
                  Portfolio View
                </button>
              </div>
            </div>

            {/* Key Metrics - Now inside the cash flow section */}
            <div className="mb-4">
              <div
                className={`grid ${
                  isMobile ? "grid-cols-1" : "grid-cols-3"
                } gap-4 justify-center max-w-2xl mx-auto`}
              >
                <div className="text-center group bg-gray-50/80 p-2 w-60 justify-self-center">
                  <div className="text-sm font-medium text-[#1D3834]">
                    <InfoTooltip
                      id="project-irr"
                      trigger={<span>Project IRR at NTP ⓘ</span>}
                    >
                      The IRR for an individual project that reaches NTP and
                      commercial operation.
                    </InfoTooltip>
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      successfulProjectIRR >= 0.1
                        ? "text-[#004D40]"
                        : "text-red-700"
                    }`}
                  >
                    {(successfulProjectIRR * 100).toFixed(2)}%
                  </div>
                </div>

                <div className="text-center group bg-gray-50/80 p-2 w-60 justify-self-center">
                  <div className="text-sm font-medium text-[#1D3834]">
                    <InfoTooltip
                      id="portfolio-irr"
                      trigger={<span>Portfolio IRR ⓘ</span>}
                    >
                      The expected IRR across the entire portfolio, accounting
                      for both successful and failed projects.
                    </InfoTooltip>
                  </div>
                  <div
                    className={`text-3xl font-bold ${
                      portfolioIRR >= 0.1 ? "text-[#004D40]" : "text-red-700"
                    }`}
                  >
                    {(portfolioIRR * 100).toFixed(2)}%
                  </div>
                </div>

                <div className="text-center group bg-gray-50/80 p-2 w-60 justify-self-center">
                  <div className="text-sm font-medium text-[#1D3834]">
                    <InfoTooltip
                      id="pipeline-ntp"
                      trigger={<span>% Pipeline Reaching NTP ⓘ</span>}
                    >
                      The percentage of projects in the pipeline that obtain
                      full approval and reach NTP, based on the cumulative
                      probability of passing each development milestone.
                    </InfoTooltip>
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      projectsReachingNTP >= 0.25
                        ? "text-[#004D40]"
                        : "text-red-700"
                    }`}
                  >
                    {(projectsReachingNTP * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[700px]">
              {view === "individual" ? (
                <Bar
                  data={chartData.individual}
                  options={getChartOptions(false)}
                />
              ) : (
                <Bar
                  data={chartData.portfolio}
                  options={getChartOptions(true)}
                />
              )}
            </div>
          </div>

          {/* Risk Category Analysis */}
          <SplitRiskGraph
            riskCategories={riskCategories}
            systemParams={systemParams}
            financialParameters={financialParameters}
            isMobile={isMobile}
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
              <h2 className="text-2xl font-bold text-[#1D3834] group">
                Cash Flow Table
              </h2>
              <button
                onClick={downloadExcel}
                className="px-4 py-2 bg-[#1D3834] text-white rounded-md hover:bg-[#00695C] transition-colors"
              >
                Download Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead>
                  <tr className="bg-[#E0F2F1]">
                    <th className="px-3 py-3 text-[#1D3834]">Category</th>
                    {Array(systemParams.projectLength + 2) // +2 for dev and construction years
                      .fill(0)
                      .map((_, i) => (
                        <th key={i} className="px-3 py-3 text-[#1D3834]">
                          Year {i}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-3 font-medium text-[#1D3834]">
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
                    <td className="px-3 py-3 font-medium text-[#1D3834]">
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
                    <td className="px-3 py-3 font-medium text-[#1D3834]">
                      Incentives
                    </td>
                    {Array(systemParams.projectLength + 2)
                      .fill(0)
                      .map((_, i) => (
                        <td key={i} className="px-3 py-3 text-gray-600">
                          {i === 1
                            ? `$${Math.round(
                                systemParams.systemSize *
                                  1000000 *
                                  financialParameters.nySunIncentivePerWatt
                              ).toLocaleString()}`
                            : i === 2
                            ? `$${Math.round(
                                (financialParameters.baseCaseCapExPerMW *
                                  systemParams.systemSize +
                                  riskCategories.reduce(
                                    (sum, cat) => sum + cat.capExIncrease,
                                    0
                                  )) *
                                  financialParameters.itcRate
                              ).toLocaleString()}`
                            : ""}
                        </td>
                      ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-3 font-medium text-[#1D3834]">
                      Revenue
                    </td>
                    {Array(systemParams.projectLength + 2)
                      .fill(0)
                      .map((_, i) => (
                        <td key={i} className="px-3 py-3 text-gray-600">
                          {i > 1
                            ? `$${Math.round(
                                systemParams.systemSize *
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
                    <td className="px-3 py-3 font-medium text-[#1D3834]">
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
                    <td className="px-3 py-3 font-medium text-[#1D3834]">
                      Cash Flow
                    </td>
                    {cashFlows.map((flow, i) => (
                      <td key={i} className="px-3 py-3 text-gray-600">
                        {`$${Math.round(flow).toLocaleString()}`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-3 font-medium text-[#1D3834]">
                      % of Pipeline
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
                    <td className="px-3 py-3 font-medium text-[#1D3834] group relative">
                      <InfoTooltip
                        id="expected-cash-flow"
                        trigger={<span>Expected Cash Flow ⓘ</span>}
                      >
                        The expected cashflow indicates the <i>average</i>{" "}
                        cashflow for a project in the pipeline, by weighting
                        actual cashflows with the % of projects reaching each
                        stage.
                      </InfoTooltip>
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

      {/* Disclaimer Section */}
      <footer className="bg-white py-16 px-8 mt-16 border-t border-[#B2DFDB]">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="flex items-center mb-6">
            <div className="h-8 w-1 bg-[#1D3834] mr-4"></div>
            <h2 className="text-2xl font-semibold text-[#1D3834]">
              Disclaimer
            </h2>
          </div>

          {/* Directional Statement */}
          <div className="text-center">
            <p className="text-2xl font-bold text-[#1D3834] leading-relaxed">
              The financial model is designed to provide directional insights
              rather than a precise financial forecast.
            </p>
          </div>

          {/* Model Assumptions */}
          <div className="bg-[#F5F5F5] p-8 rounded-lg">
            <h3 className="text-xl font-semibold text-[#1D3834] mb-6">
              Model Assumptions
            </h3>
            <ul className="space-y-4 text-gray-700">
              <li className="flex items-start">
                <span className="text-[#1D3834] mr-3 text-xl">•</span>
                <span className="text-lg">
                  No reliance on debt or external financing.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#1D3834] mr-3 text-xl">•</span>
                <span className="text-lg">
                  Specific financial parameters: a $140/MWh electricity rate
                  (derived from{" "}
                  <a
                    href="https://docs.google.com/spreadsheets/d/1eQgW3YfRWVmLgBDu5eB-xldKXDBcNolm/edit?gid=1515816688#gid=1515816688"
                    className="underline"
                  >
                    previous community solar models
                  </a>
                  ), a 2% standard escalation rate, and a base $0.17/W NY Sun
                  incentive for upstate New York.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#1D3834] mr-3 text-xl">•</span>
                <span className="text-lg">
                  All the projects in the portfolio are assumed to be of the
                  same size and have the same financial parameters.
                </span>
              </li>
            </ul>
          </div>

          {/* Model Limitations */}
          <div className="bg-[#F5F5F5] p-8 rounded-lg">
            <h3 className="text-xl font-semibold text-[#1D3834] mb-6">
              Model Limitations
            </h3>
            <div className="space-y-8">
              <div>
                <h4 className="text-lg font-medium text-[#1D3834] mb-3">
                  Risk Interdependencies
                </h4>
                <p className="text-gray-700 text-lg leading-relaxed">
                  The model assumes that risks in the development process are
                  independent, whereas, in reality, these risks can be highly
                  interrelated and may compound one another.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-medium text-[#1D3834] mb-3">
                  Approval Risk Conversion
                </h4>
                <p className="text-gray-700 text-lg leading-relaxed">
                  The conversion formula used to translate approval risk into a
                  probability is not based on empirical data, and is instead
                  based on expert feedback. That being said, we encourage
                  developers to adjust the model based on their historical
                  experience.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-medium text-[#1D3834] mb-3">
                  Simplified Cost Timing
                </h4>
                <p className="text-gray-700 text-lg leading-relaxed">
                  By assuming that all development costs occur simultaneously,
                  the model does not account for the differences in cost impact
                  across stages. This means it fails to distinguish between
                  early-stage failures (e.g., issues with site control, which
                  typically incur lower sunk costs) and later-stage failures
                  (e.g., after receiving CESIR results, which tend to be more
                  costly).
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* GitHub Link */}
        <br></br>
        <div className="py-6 text-center ">
          <a
            href="https://github.com/alexoort/derisksolar-whitepaper"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-[#1D3834] hover:text-[#00695C] transition-colors"
          >
            <svg
              height="24"
              aria-hidden="true"
              viewBox="0 0 16 16"
              version="1.1"
              width="24"
              data-view-component="true"
              className="fill-current"
            >
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
            <span className="text-base font-medium">View on GitHub</span>
          </a>
        </div>
      </footer>
    </>
  );
}
