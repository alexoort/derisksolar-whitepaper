"use client";

import { useState, useEffect } from "react";
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
import * as XLSX from "xlsx";

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
  risk: "Low" | "High";
  devEx: number;
  capExIncrease: number;
  approvalRisk: number;
  goNoGoProbability: number;
}

interface SystemParameters {
  capacityFactor: number;
  degradationRate: number;
  systemSize: number;
  acSystemSize: number;
  projectType: string;
  electricityRate: number;
  priceEscalation: number;
  projectLength: number;
}

interface FinancialParameters {
  baseCaseCapEx: number;
  baseOpEx: number;
  itcRate: number;
}

function RiskCategories({
  riskCategories,
  setRiskCategories,
}: {
  riskCategories: RiskCategory[];
  setRiskCategories: (categories: RiskCategory[]) => void;
}) {
  const handleApprovalRiskChange = (index: number, value: number) => {
    const newCategories = [...riskCategories];
    newCategories[index].approvalRisk = value;
    newCategories[index].goNoGoProbability = calculateGoNoGoProbability(value);
    setRiskCategories(newCategories);
  };

  const updateRiskValues = (index: number, risk: "Low" | "High") => {
    const newCategories = [...riskCategories];
    const category = newCategories[index];

    switch (category.name) {
      case "Site Control":
        category.devEx = risk === "Low" ? 7700 : 9000;
        category.capExIncrease = 0;
        break;
      case "Permitting":
        category.devEx = risk === "Low" ? 40000 : 90000;
        category.capExIncrease = 0;
        break;
      case "Interconnection":
        category.devEx = risk === "Low" ? 146250 : 157750;
        category.capExIncrease = risk === "Low" ? 250000 : 2000000;
        break;
      case "Design":
        category.devEx = risk === "Low" ? 44500 : 52500;
        category.capExIncrease = risk === "Low" ? 150000 : 2000000;
        break;
      case "Environmental":
        category.devEx = risk === "Low" ? 26750 : 53000;
        category.capExIncrease = risk === "Low" ? 0 : 250000;
        break;
    }

    category.risk = risk;
    setRiskCategories(newCategories);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-purple-700">
        Risk Categories
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead>
            <tr className="bg-purple-50">
              <th className="px-3 py-3 text-purple-700">Category</th>
              <th className="px-3 py-3 text-purple-700">Risk Level</th>
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
                    value={category.risk}
                    onChange={(e) => {
                      const newCategories = [...riskCategories];
                      newCategories[index].risk = e.target.value as
                        | "Low"
                        | "High";
                      updateRiskValues(index, newCategories[index].risk);
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

export default function Home() {
  // Risk Categories
  const [riskCategories, setRiskCategories] = useState<RiskCategory[]>([
    {
      name: "Site Control",
      risk: "Low",
      devEx: 7700,
      capExIncrease: 0,
      approvalRisk: 5,
      goNoGoProbability: calculateGoNoGoProbability(5),
    },
    {
      name: "Permitting",
      risk: "Low",
      devEx: 40000,
      capExIncrease: 0,
      approvalRisk: 6,
      goNoGoProbability: calculateGoNoGoProbability(6),
    },
    {
      name: "Interconnection",
      risk: "Low",
      devEx: 146250,
      capExIncrease: 250000,
      approvalRisk: 8,
      goNoGoProbability: calculateGoNoGoProbability(8),
    },
    {
      name: "Design",
      risk: "Low",
      devEx: 44500,
      capExIncrease: 150000,
      approvalRisk: 2,
      goNoGoProbability: calculateGoNoGoProbability(2),
    },
    {
      name: "Environmental",
      risk: "Low",
      devEx: 26750,
      capExIncrease: 0,
      approvalRisk: 6,
      goNoGoProbability: calculateGoNoGoProbability(6),
    },
  ]);

  // System Parameters
  const [systemParams, setSystemParams] = useState<SystemParameters>({
    capacityFactor: 0.2,
    degradationRate: 0.005,
    systemSize: 3,
    acSystemSize: 2.4,
    projectType: "Community Solar",
    electricityRate: 120,
    priceEscalation: 0.02,
    projectLength: 30,
  });

  // Financial Parameters
  const [financialParams, setFinancialParams] = useState<FinancialParameters>({
    baseCaseCapEx: 2700000,
    baseOpEx: 37500, // 3125 * 12
    itcRate: 0.3,
  });

  const [cashFlows, setCashFlows] = useState<number[]>([]);
  const [expectedCashFlows, setExpectedCashFlows] = useState<number[]>([]);
  const [irr, setIrr] = useState<number>(0);

  // Add this state for chart view toggle
  const [chartView, setChartView] = useState<"individual" | "portfolio">(
    "individual"
  );

  // Calculate IRR for successful projects and portfolio
  const calculateIRR = (cashFlows: number[]): number => {
    // Simple IRR calculation using Newton-Raphson method
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

  // Add a new useEffect to recalculate cash flows when any parameter changes
  useEffect(() => {
    calculateCashFlows();
  }, [riskCategories, systemParams, financialParams, chartView]);

  const calculateCashFlows = () => {
    // Use the projectLength from systemParams instead of hardcoded value
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
    const totalCapEx = financialParams.baseCaseCapEx + totalCapExIncrease;
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
    let opEx = financialParams.baseOpEx;
    let degradationFactor = 1;
    let electricityRate = systemParams.electricityRate;
    const annualGeneration =
      systemParams.acSystemSize * systemParams.capacityFactor * 24 * 365;

    for (let year = 2; year <= years; year++) {
      degradationFactor -= systemParams.degradationRate;
      const generation = annualGeneration * degradationFactor;
      electricityRate *= 1 + systemParams.priceEscalation;
      const revenue = generation * electricityRate;
      const annualOpEx = opEx * Math.pow(1.01, year - 2);

      const cashFlow = revenue - annualOpEx;
      flows.push(cashFlow);
      expectedFlows.push(cashFlow * cumulativeProbability);
    }

    // Add ITC in year 3
    flows[2] += itcAmount;
    expectedFlows[2] += itcAmount * cumulativeProbability;

    setCashFlows(flows);
    setExpectedCashFlows(expectedFlows);

    // Calculate IRR
    setIrr(calculateIRR(expectedFlows));
  };

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
                    financialParams.baseCaseCapEx +
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
              i > 1 ? -(financialParams.baseOpEx * Math.pow(1.01, i - 2)) : 0
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
                  systemParams.capacityFactor *
                  24 *
                  365 *
                  (1 - systemParams.degradationRate * (i - 2)) *
                  systemParams.electricityRate *
                  Math.pow(1 + systemParams.priceEscalation, i - 2)
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
                ? (financialParams.baseCaseCapEx +
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
                    financialParams.baseCaseCapEx +
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
                ? -(financialParams.baseOpEx * Math.pow(1.01, i - 2)) *
                    cumulativeProbability
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
                    systemParams.capacityFactor *
                    24 *
                    365 *
                    (1 - systemParams.degradationRate * (i - 2)) *
                    systemParams.electricityRate *
                    Math.pow(1 + systemParams.priceEscalation, i - 2) *
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
                ? (financialParams.baseCaseCapEx +
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
    // Create CSV header
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
          ? riskCategories.reduce((sum, cat) => sum + cat.devEx, 0) + ","
          : ",";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add CapEx row
    csvContent += "CapEx,";
    for (let i = 0; i <= systemParams.projectLength; i++) {
      csvContent +=
        i === 1
          ? financialParams.baseCaseCapEx +
            riskCategories.reduce((sum, cat) => sum + cat.capExIncrease, 0) +
            ","
          : ",";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add OpEx row
    csvContent += "OpEx,";
    for (let i = 0; i <= systemParams.projectLength; i++) {
      csvContent +=
        i > 1 ? financialParams.baseOpEx * Math.pow(1.01, i - 2) + "," : ",";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add Revenue row
    csvContent += "Revenue,";
    for (let i = 0; i <= systemParams.projectLength; i++) {
      csvContent +=
        i > 1
          ? systemParams.acSystemSize *
              systemParams.capacityFactor *
              24 *
              365 *
              (1 - systemParams.degradationRate * (i - 2)) *
              systemParams.electricityRate *
              Math.pow(1 + systemParams.priceEscalation, i - 2) +
            ","
          : ",";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add Cash Flow row
    csvContent += "Cash Flow,";
    for (let i = 0; i < cashFlows.length; i++) {
      csvContent += cashFlows[i] + ",";
    }
    csvContent = csvContent.slice(0, -1) + "\n";

    // Add Expected Cash Flow row
    csvContent += "Expected Cash Flow,";
    for (let i = 0; i < expectedCashFlows.length; i++) {
      csvContent += expectedCashFlows[i] + ",";
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
      csvContent += (cumulativeProbability * 100).toFixed(2) + "%,";
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
    <div className="min-h-screen p-4 bg-gray-50">
      <h1 className="text-4xl font-extrabold mb-8 text-purple-800 text-center">
        Community Solar Financial Model
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <RiskCategories
          riskCategories={riskCategories}
          setRiskCategories={setRiskCategories}
        />

        {/* System Parameters */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 text-purple-700">
            System Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700">
                Capacity Factor
              </label>
              <input
                type="number"
                className="mt-1 block w-full p-3 text-lg rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                value={systemParams.capacityFactor}
                onChange={(e) =>
                  setSystemParams({
                    ...systemParams,
                    capacityFactor: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700">
                Degradation Rate (%)
              </label>
              <input
                type="number"
                className="mt-1 block w-full p-3 text-lg rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                value={(systemParams.degradationRate * 100).toFixed(2)}
                onChange={(e) =>
                  setSystemParams({
                    ...systemParams,
                    degradationRate: parseFloat(e.target.value) / 100 || 0,
                  })
                }
              />
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700">
                System Size (MW)
              </label>
              <input
                type="number"
                className="mt-1 block w-full p-3 text-lg rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                value={systemParams.systemSize}
                onChange={(e) =>
                  setSystemParams({
                    ...systemParams,
                    systemSize: parseFloat(e.target.value) || 0,
                    acSystemSize: (parseFloat(e.target.value) || 0) / 1.25,
                  })
                }
              />
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700">
                Project Type
              </label>
              <select
                className="mt-1 block w-full p-3 text-lg rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 whitespace-normal"
                value={systemParams.projectType}
                onChange={(e) =>
                  setSystemParams({
                    ...systemParams,
                    projectType: e.target.value,
                    electricityRate:
                      e.target.value === "Community Solar"
                        ? 120
                        : e.target.value === "PPA"
                        ? 70
                        : e.target.value === "Wholesale Market"
                        ? 80
                        : 0,
                  })
                }
              >
                <option value="Community Solar">Community Solar</option>
                <option value="PPA">PPA</option>
                <option value="Wholesale Market">Wholesale Market</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700">
                Electricity Rate ($/MWh)
              </label>
              <input
                type="number"
                className="mt-1 block w-full p-3 text-lg rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                value={systemParams.electricityRate}
                onChange={(e) =>
                  setSystemParams({
                    ...systemParams,
                    electricityRate: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700">
                Price Escalation (%)
              </label>
              <input
                type="number"
                className="mt-1 block w-full p-3 text-lg rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                value={(systemParams.priceEscalation * 100).toFixed(2)}
                onChange={(e) =>
                  setSystemParams({
                    ...systemParams,
                    priceEscalation: parseFloat(e.target.value) / 100 || 0,
                  })
                }
              />
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700">
                Project Length (years)
              </label>
              <input
                type="number"
                className="mt-1 block w-full p-3 text-lg rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                value={systemParams.projectLength}
                onChange={(e) =>
                  setSystemParams({
                    ...systemParams,
                    projectLength: parseInt(e.target.value) || 30,
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Financial Parameters */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 text-purple-700">
            Financial Parameters
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-lg font-medium text-gray-700">
                Base Case CapEx ($)
              </label>
              <input
                type="number"
                value={financialParams.baseCaseCapEx}
                onChange={(e) =>
                  setFinancialParams({
                    ...financialParams,
                    baseCaseCapEx: Number(e.target.value),
                  })
                }
                className="mt-2 block w-full p-3 text-lg rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-lg font-medium text-gray-700">
                Additional CapEx
              </label>
              <div className="text-xl text-gray-700 mt-2 p-3">
                $
                {riskCategories
                  .reduce((sum, cat) => sum + cat.capExIncrease, 0)
                  .toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-lg font-medium text-gray-700">
                Base OpEx ($/year)
              </label>
              <input
                type="number"
                value={financialParams.baseOpEx}
                onChange={(e) =>
                  setFinancialParams({
                    ...financialParams,
                    baseOpEx: Number(e.target.value),
                  })
                }
                className="mt-2 block w-full p-3 text-lg rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-lg font-medium text-gray-700">
                Total CapEx
              </label>
              <div className="text-xl text-gray-700 mt-2 p-3">
                $
                {(
                  financialParams.baseCaseCapEx +
                  riskCategories.reduce(
                    (sum, cat) => sum + cat.capExIncrease,
                    0
                  )
                ).toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-lg font-medium text-gray-700">
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
                className="mt-2 block w-full p-3 text-lg rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-lg font-medium text-gray-700">
                Total DevEx
              </label>
              <div className="text-xl text-gray-700 mt-2 p-3">
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
                      const year = context.dataIndex;
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

      {/* Cash Flow Table */}
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
                <td className="px-3 py-3 font-medium text-purple-700">DevEx</td>
                {Array(systemParams.projectLength + 1)
                  .fill(0)
                  .map((_, i) => (
                    <td key={i} className="px-3 py-3 text-gray-600">
                      {i === 0
                        ? riskCategories
                            .reduce((sum, cat) => sum + cat.devEx, 0)
                            .toLocaleString()
                        : ""}
                    </td>
                  ))}
              </tr>
              <tr>
                <td className="px-3 py-3 font-medium text-purple-700">CapEx</td>
                {Array(systemParams.projectLength + 1)
                  .fill(0)
                  .map((_, i) => (
                    <td key={i} className="px-3 py-3 text-gray-600">
                      {i === 1
                        ? (
                            financialParams.baseCaseCapEx +
                            riskCategories.reduce(
                              (sum, cat) => sum + cat.capExIncrease,
                              0
                            )
                          ).toLocaleString()
                        : ""}
                    </td>
                  ))}
              </tr>
              <tr>
                <td className="px-3 py-3 font-medium text-purple-700">OpEx</td>
                {Array(systemParams.projectLength + 1)
                  .fill(0)
                  .map((_, i) => (
                    <td key={i} className="px-3 py-3 text-gray-600">
                      {i > 1
                        ? (
                            financialParams.baseOpEx * Math.pow(1.01, i - 2)
                          ).toLocaleString()
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
                        ? (
                            systemParams.acSystemSize *
                            systemParams.capacityFactor *
                            24 *
                            365 *
                            (1 - systemParams.degradationRate * (i - 2)) *
                            systemParams.electricityRate *
                            Math.pow(1 + systemParams.priceEscalation, i - 2)
                          ).toLocaleString()
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
                    {flow.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-3 font-medium text-purple-700">
                  Expected Cash Flow
                </td>
                {expectedCashFlows.map((flow, i) => (
                  <td key={i} className="px-3 py-3 text-gray-600">
                    {flow.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
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

                    return (
                      <td key={i} className="px-3 py-3 text-gray-600">
                        {(cumulativeProbability * 100).toFixed(2)}%
                      </td>
                    );
                  })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sensitivity Analysis */}
      <div className="mt-8 mb-8">
        <SensitivityAnalysis
          riskCategories={riskCategories}
          systemParams={systemParams}
          financialParams={financialParams}
        />
      </div>
    </div>
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

  // Calculate IRR for a specific risk category with given risk level and approval risk
  const calculateSensitivityIRR = (
    categoryName: string,
    riskLevel: "Low" | "High",
    approvalRisk: number
  ): number => {
    // Create a copy of the risk categories
    const modifiedCategories = riskCategories.map((cat) => {
      if (cat.name === categoryName) {
        // Calculate DevEx and CapEx based on risk level
        let devEx = cat.devEx;
        let capExIncrease = cat.capExIncrease;

        // Update values based on risk level
        switch (categoryName) {
          case "Site Control":
            devEx = riskLevel === "Low" ? 7700 : 9000;
            capExIncrease = 0;
            break;
          case "Permitting":
            devEx = riskLevel === "Low" ? 40000 : 90000;
            capExIncrease = 0;
            break;
          case "Interconnection":
            devEx = riskLevel === "Low" ? 146250 : 157750;
            capExIncrease = riskLevel === "Low" ? 250000 : 2000000;
            break;
          case "Design":
            devEx = riskLevel === "Low" ? 44500 : 52500;
            capExIncrease = riskLevel === "Low" ? 150000 : 2000000;
            break;
          case "Environmental":
            devEx = riskLevel === "Low" ? 26750 : 53000;
            capExIncrease = riskLevel === "Low" ? 0 : 250000;
            break;
        }

        // Calculate Go/No-Go probability based on approval risk
        const goNoGoProbability = 1 - (0.5 / 14) * (approvalRisk - 1);

        return {
          ...cat,
          risk: riskLevel,
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
    const totalCapEx = financialParams.baseCaseCapEx + totalCapExIncrease;
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
    let opEx = financialParams.baseOpEx;
    let degradationFactor = 1;
    let electricityRate = systemParams.electricityRate;
    const annualGeneration =
      systemParams.acSystemSize * systemParams.capacityFactor * 24 * 365;

    for (let year = 2; year <= years; year++) {
      degradationFactor -= systemParams.degradationRate;
      const generation = annualGeneration * degradationFactor;
      electricityRate *= 1 + systemParams.priceEscalation;
      const revenue = generation * electricityRate;
      const annualOpEx = opEx * Math.pow(1.01, year - 2);

      const cashFlow = revenue - annualOpEx;
      flows.push(cashFlow);
      expectedFlows.push(cashFlow * cumulativeProbability);
    }

    // Add ITC in year 3
    flows[2] += itcAmount;
    expectedFlows[2] += itcAmount * cumulativeProbability;

    // Calculate IRR using the expected cash flows
    return calculateIRR(expectedFlows);
  };

  // Calculate IRR using Newton-Raphson method
  const calculateIRR = (cashFlows: number[]): number => {
    // Simple IRR calculation using Newton-Raphson method
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
  }, [selectedCategory, riskCategories, systemParams, financialParams]);

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
