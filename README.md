# Pre-Development at Scale: Community Solar Financial Model

A sophisticated financial modeling tool for community solar development that provides probabilistic insights into project viability and portfolio-level returns.

## Overview

This interactive web application helps solar developers analyze and understand the financial implications of community solar development at scale. It incorporates risk assessment, probability-based outcomes, and detailed cash flow analysis to provide a comprehensive view of both individual project and portfolio-level performance.

To dive deeper into how this model was built and what it means for
solar development, please visit [the whitepaper](https://derisksolar.us/).

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd irr-web-demo
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Model Inputs

1. **Risk Categories**

   - Set risk levels (High/Low) for each development category
   - Adjust approval risk ratings (1-15)
   - View probability calculations for project advancement

2. **System Parameters**

   - Configure capacity factor
   - Set system size
   - Adjust project length
   - Define degradation rates

3. **Financial Parameters**
   - Set base case CapEx
   - Configure OpEx rates
   - Adjust ITC rates
   - Set electricity rates and escalation factors

### Viewing Results

- Toggle between individual project and portfolio views
- Download detailed cash flow analysis in Excel format
- View sensitivity analysis for different risk scenarios
- Analyze risk category impacts through interactive graphs

## Contributing

We welcome contributions to improve the model and its assumptions, and for developers to adjust parameters to match their industry experience.

---

_Note: This is a financial modeling tool designed to provide directional insights rather than precise financial forecasts. Users should apply their own judgment and expertise when making investment decisions._
