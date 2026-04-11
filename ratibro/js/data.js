// RatIBro — IB Finance topic data
// Definitions marked [PLACEHOLDER] should be replaced with teacher's exact wording

const TOPICS = [
  {
    unit: '3.1',
    unitName: 'Introduction to Finance',
    skills: [
      { id: 'role-of-finance', name: 'Role of finance for businesses', hl: false, definition: '[PLACEHOLDER]' },
      { id: 'capital-expenditure', name: 'Capital expenditure', hl: false, definition: 'Spending on fixed assets that will be used by the business for more than one year, such as buildings, machinery, or vehicles.' },
      { id: 'revenue-expenditure', name: 'Revenue expenditure', hl: false, definition: 'Day-to-day spending needed to run the business, such as wages, rent, and raw materials, which is used up within one accounting period.' },
    ]
  },
  {
    unit: '3.2',
    unitName: 'Sources of Finance',
    skills: [
      { id: 'personal-funds', name: 'Personal funds', hl: false, definition: 'Money contributed by the sole trader from their own savings to fund the business.' },
      { id: 'retained-profit', name: 'Retained profit', hl: false, definition: 'Profit kept within the business after dividends have been paid, used to fund future investment or operations.' },
      { id: 'sale-of-assets', name: 'Sale of assets', hl: false, definition: 'Raising finance by selling assets the business no longer needs, such as property, machinery, or vehicles.' },
      { id: 'share-capital', name: 'Share capital', hl: false, definition: 'Finance raised by issuing shares (part-ownership) in the business to shareholders.' },
      { id: 'loan-capital', name: 'Loan capital', hl: false, definition: 'Money borrowed from a bank or financial institution, repaid over a fixed period with interest.' },
      { id: 'overdrafts', name: 'Overdrafts', hl: false, definition: 'A short-term borrowing facility allowing a business to spend more than it has in its bank account, up to an agreed limit.' },
      { id: 'trade-credit', name: 'Trade credit', hl: false, definition: 'An arrangement where a business buys goods or services now and pays the supplier at a later agreed date, typically 30–90 days.' },
      { id: 'crowdfunding', name: 'Crowdfunding', hl: false, definition: 'Raising finance from a large number of individuals, typically via an online platform, often in exchange for rewards, equity, or interest.' },
      { id: 'leasing', name: 'Leasing', hl: false, definition: 'Paying regular amounts to use an asset (such as equipment or vehicles) without purchasing it outright.' },
      { id: 'microfinance', name: 'Microfinance providers', hl: false, definition: 'Organisations that provide small loans and financial services to individuals or small businesses in developing economies who lack access to traditional banking.' },
      { id: 'business-angels', name: 'Business angels', hl: false, definition: 'Wealthy private individuals who invest their own money in start-up or early-stage businesses in exchange for equity, often providing expertise as well as finance.' },
      { id: 'finance-appropriateness', name: 'Appropriateness of short/long-term finance', hl: false, definition: '[PLACEHOLDER]' },
    ]
  },
  {
    unit: '3.3',
    unitName: 'Costs and Revenues',
    skills: [
      { id: 'fixed-costs', name: 'Fixed costs', hl: false, definition: 'Costs that do not change with the level of output, such as rent, insurance, and salaries.' },
      { id: 'variable-costs', name: 'Variable costs', hl: false, definition: 'Costs that change directly in proportion to the level of output, such as raw materials and direct labour.' },
      { id: 'direct-costs', name: 'Direct costs', hl: false, definition: 'Costs that can be directly attributed to the production of a specific product or service, such as materials used in making it.' },
      { id: 'indirect-costs', name: 'Indirect costs / Overhead', hl: false, definition: 'Costs that cannot be directly attributed to a specific product or service, such as management salaries or office rent.' },
      { id: 'total-revenue', name: 'Total revenue', hl: false, definition: 'The total income received by a business from selling its goods or services, calculated as price × quantity sold.' },
      { id: 'revenue-streams', name: 'Revenue streams', hl: false, definition: 'The different sources from which a business earns money, for example a hotel might have revenue streams from room bookings, food, and events.' },
    ]
  },
  {
    unit: '3.4',
    unitName: 'Final Accounts',
    skills: [
      { id: 'purpose-of-accounts', name: 'Purpose of accounts to stakeholders', hl: false, definition: '[PLACEHOLDER]' },
      { id: 'statement-profit-loss', name: 'Statement of profit or loss', hl: false, definition: 'A financial statement showing a business\'s revenues and expenses over a period, resulting in a profit or loss figure.' },
      { id: 'statement-financial-position', name: 'Statement of financial position', hl: false, definition: 'A financial statement showing a business\'s assets, liabilities, and equity at a specific point in time. Also known as a balance sheet.' },
      { id: 'intangible-assets', name: 'Intangible assets', hl: false, definition: 'Non-physical assets that have value but cannot be touched, such as goodwill, patents, trademarks, and brand recognition.' },
      { id: 'depreciation-straight-line', name: 'Straight line depreciation', hl: true, definition: 'A method of depreciation that spreads the cost of an asset evenly over its useful life. Annual depreciation = (Cost − Residual value) ÷ Years of useful life.' },
      { id: 'depreciation-units', name: 'Units of production depreciation', hl: true, definition: 'A method of depreciation that allocates cost based on actual usage — the more the asset is used, the more it depreciates.' },
    ]
  },
  {
    unit: '3.5',
    unitName: 'Profitability and Liquidity Ratios',
    skills: [
      { id: 'gross-profit-margin', name: 'Gross profit margin', hl: false, definition: 'A profitability ratio measuring the percentage of revenue remaining after deducting cost of sales. Formula: (Gross profit ÷ Sales revenue) × 100.' },
      { id: 'profit-margin', name: 'Profit margin', hl: false, definition: 'A profitability ratio measuring the percentage of revenue remaining after deducting all operating expenses, before interest and tax. Formula: (Profit before interest and tax ÷ Sales revenue) × 100.' },
      { id: 'roce', name: 'Return on capital employed (ROCE)', hl: false, definition: 'A profitability ratio measuring how efficiently a business uses its capital to generate profit. Formula: (Profit before interest and tax ÷ Capital employed) × 100.' },
      { id: 'current-ratio', name: 'Current ratio', hl: false, definition: 'A liquidity ratio measuring a business\'s ability to pay short-term debts using its current assets. Formula: Current assets ÷ Current liabilities. A result above 1 means the business can cover its short-term debts.' },
      { id: 'acid-test-ratio', name: 'Acid test (quick) ratio', hl: false, definition: 'A stricter liquidity ratio that excludes stock from current assets, as stock may not be quickly converted to cash. Formula: (Current assets − Stock) ÷ Current liabilities.' },
      { id: 'ratio-improvement-strategies', name: 'Strategies to improve profitability/liquidity ratios', hl: false, definition: '[PLACEHOLDER]' },
    ]
  },
  {
    unit: '3.6',
    unitName: 'Efficiency Ratio Analysis',
    skills: [
      { id: 'stock-turnover', name: 'Stock turnover', hl: true, definition: 'An efficiency ratio measuring how many times a business sells and replaces its stock over a period. Can be expressed as a number of times (Cost of sales ÷ Average stock) or number of days (Average stock ÷ Cost of sales × 365).' },
      { id: 'debtor-days', name: 'Debtor days', hl: true, definition: 'An efficiency ratio measuring the average number of days it takes a business to collect payment from its customers. Formula: (Debtors ÷ Total sales revenue) × 365.' },
      { id: 'creditor-days', name: 'Creditor days', hl: true, definition: 'An efficiency ratio measuring the average number of days a business takes to pay its suppliers. Formula: (Creditors ÷ Cost of sales) × 365.' },
      { id: 'gearing-ratio', name: 'Gearing ratio', hl: true, definition: 'An efficiency ratio measuring what proportion of a business\'s capital is financed by long-term debt. Formula: (Non-current liabilities ÷ Capital employed) × 100. A high gearing ratio indicates greater financial risk.' },
      { id: 'insolvency-bankruptcy', name: 'Insolvency vs bankruptcy', hl: true, definition: '[PLACEHOLDER]' },
    ]
  },
  {
    unit: '3.7',
    unitName: 'Cash Flow',
    skills: [
      { id: 'profit-vs-cashflow', name: 'Profit vs cash flow', hl: false, definition: 'Profit is the surplus of revenue over costs over a period; cash flow is the movement of money into and out of a business. A business can be profitable but still run out of cash.' },
      { id: 'working-capital', name: 'Working capital', hl: false, definition: 'The money available for day-to-day operations, calculated as current assets minus current liabilities. Sufficient working capital is essential for a business to meet its short-term obligations.' },
      { id: 'liquidity-position', name: 'Liquidity position', hl: false, definition: '[PLACEHOLDER]' },
      { id: 'cash-flow-forecasts', name: 'Cash flow forecasts', hl: false, definition: 'A financial document predicting the expected cash inflows and outflows over a future period, used to identify potential cash shortfalls in advance.' },
      { id: 'investment-profit-cashflow', name: 'Relationship: investment, profit, cash flow', hl: false, definition: '[PLACEHOLDER]' },
      { id: 'cashflow-strategies', name: 'Strategies for cash flow problems', hl: false, definition: '[PLACEHOLDER]' },
    ]
  },
  {
    unit: '3.8',
    unitName: 'Investment Appraisal',
    skills: [
      { id: 'payback-period', name: 'Payback period', hl: false, definition: 'An investment appraisal method that calculates how long it takes for an investment to generate enough cash to recover its initial cost. Simple to use but ignores the time value of money.' },
      { id: 'arr', name: 'Average rate of return (ARR)', hl: false, definition: 'An investment appraisal method expressing the average annual profit as a percentage of the initial investment. Formula: ((Total returns − Capital cost) ÷ Years of use) ÷ Capital cost × 100.' },
      { id: 'npv', name: 'Net present value (NPV)', hl: true, definition: 'An investment appraisal method that discounts future cash flows to their present value and subtracts the initial cost. Accounts for the time value of money — a positive NPV means the investment adds value.' },
    ]
  },
  {
    unit: '3.9',
    unitName: 'Budgets',
    skills: [
      { id: 'cost-profit-centres', name: 'Cost centres vs profit centres', hl: true, definition: 'A cost centre is a part of the business that incurs costs but does not directly generate revenue (e.g. HR). A profit centre is a part of the business that both incurs costs and generates its own revenue (e.g. a product line).' },
      { id: 'roles-cost-profit-centres', name: 'Roles of cost/profit centres', hl: true, definition: '[PLACEHOLDER]' },
      { id: 'constructing-budget', name: 'Constructing a budget', hl: true, definition: '[PLACEHOLDER]' },
      { id: 'variances', name: 'Variances', hl: true, definition: 'The difference between a budgeted figure and the actual figure. A favourable variance (F) means actual performance was better than budgeted; an adverse variance (A) means it was worse.' },
      { id: 'budgets-decision-making', name: 'Importance of budgets in decision-making', hl: true, definition: '[PLACEHOLDER]' },
    ]
  },
  {
    unit: '4.3',
    unitName: 'Sales Forecasting',
    skills: [
      { id: 'sales-forecasting', name: 'Sales forecasting', hl: true, definition: '[PLACEHOLDER]' },
    ]
  },
];

// Flatten all skills into one array for easy lookup
const ALL_SKILLS = TOPICS.flatMap(unit =>
  unit.skills.map(skill => ({ ...skill, unit: unit.unit, unitName: unit.unitName }))
);

// Get a skill by id
function getSkill(id) {
  return ALL_SKILLS.find(s => s.id === id);
}

// Formulas for calculations practice
const FORMULAS = {
  'gross-profit-margin': {
    name: 'Gross profit margin',
    formula: '(Gross profit ÷ Sales revenue) × 100',
    unit: '%',
    hl: false,
    inputs: ['grossProfit', 'salesRevenue'],
    calculate: (v) => (v.grossProfit / v.salesRevenue) * 100,
  },
  'profit-margin': {
    name: 'Profit margin',
    formula: '(Profit before interest and tax ÷ Sales revenue) × 100',
    unit: '%',
    hl: false,
    inputs: ['pbit', 'salesRevenue'],
    calculate: (v) => (v.pbit / v.salesRevenue) * 100,
  },
  'roce': {
    name: 'ROCE',
    formula: '(Profit before interest and tax ÷ Capital employed) × 100',
    unit: '%',
    hl: false,
    inputs: ['pbit', 'capitalEmployed'],
    calculate: (v) => (v.pbit / v.capitalEmployed) * 100,
  },
  'current-ratio': {
    name: 'Current ratio',
    formula: 'Current assets ÷ Current liabilities',
    unit: ':1',
    hl: false,
    inputs: ['currentAssets', 'currentLiabilities'],
    calculate: (v) => v.currentAssets / v.currentLiabilities,
  },
  'acid-test': {
    name: 'Acid test ratio',
    formula: '(Current assets − Stock) ÷ Current liabilities',
    unit: ':1',
    hl: false,
    inputs: ['currentAssets', 'stock', 'currentLiabilities'],
    calculate: (v) => (v.currentAssets - v.stock) / v.currentLiabilities,
  },
  'arr': {
    name: 'Average rate of return (ARR)',
    formula: '((Total returns − Capital cost) ÷ Years of use) ÷ Capital cost × 100',
    unit: '%',
    hl: false,
    inputs: ['totalReturns', 'capitalCost', 'yearsOfUse'],
    calculate: (v) => (((v.totalReturns - v.capitalCost) / v.yearsOfUse) / v.capitalCost) * 100,
  },
  'stock-turnover-times': {
    name: 'Stock turnover (times)',
    formula: 'Cost of sales ÷ Average stock',
    unit: ' times',
    hl: true,
    inputs: ['costOfSales', 'avgStock'],
    calculate: (v) => v.costOfSales / v.avgStock,
  },
  'stock-turnover-days': {
    name: 'Stock turnover (days)',
    formula: '(Average stock ÷ Cost of sales) × 365',
    unit: ' days',
    hl: true,
    inputs: ['avgStock', 'costOfSales'],
    calculate: (v) => (v.avgStock / v.costOfSales) * 365,
  },
  'debtor-days': {
    name: 'Debtor days',
    formula: '(Debtors ÷ Total sales revenue) × 365',
    unit: ' days',
    hl: true,
    inputs: ['debtors', 'salesRevenue'],
    calculate: (v) => (v.debtors / v.salesRevenue) * 365,
  },
  'creditor-days': {
    name: 'Creditor days',
    formula: '(Creditors ÷ Cost of sales) × 365',
    unit: ' days',
    hl: true,
    inputs: ['creditors', 'costOfSales'],
    calculate: (v) => (v.creditors / v.costOfSales) * 365,
  },
  'gearing': {
    name: 'Gearing ratio',
    formula: '(Non-current liabilities ÷ Capital employed) × 100',
    unit: '%',
    hl: true,
    inputs: ['nonCurrentLiabilities', 'capitalEmployed'],
    calculate: (v) => (v.nonCurrentLiabilities / v.capitalEmployed) * 100,
  },
};

// Input label display names
const INPUT_LABELS = {
  grossProfit: 'Gross profit',
  salesRevenue: 'Sales revenue',
  pbit: 'Profit before interest and tax',
  capitalEmployed: 'Capital employed',
  currentAssets: 'Current assets',
  currentLiabilities: 'Current liabilities',
  stock: 'Stock',
  totalReturns: 'Total returns',
  capitalCost: 'Capital cost',
  yearsOfUse: 'Years of use',
  costOfSales: 'Cost of sales',
  avgStock: 'Average stock',
  debtors: 'Debtors',
  creditors: 'Creditors',
  nonCurrentLiabilities: 'Non-current liabilities',
};

// Random number within a range, rounded to nearest step
function randBetween(min, max, step = 1) {
  const steps = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * (steps + 1)) * step;
}

// Generate random values for a given formula
function generateCalcQuestion(formulaKey) {
  const f = FORMULAS[formulaKey];
  const values = {};

  // Generate realistic randomised values per formula
  switch (formulaKey) {
    case 'gross-profit-margin':
      values.salesRevenue = randBetween(200, 2000, 50) * 1000;
      values.grossProfit = Math.round(values.salesRevenue * randBetween(30, 65, 5) / 100);
      break;
    case 'profit-margin':
      values.salesRevenue = randBetween(200, 2000, 50) * 1000;
      values.pbit = Math.round(values.salesRevenue * randBetween(5, 30, 5) / 100);
      break;
    case 'roce':
      values.pbit = randBetween(50, 500, 10) * 1000;
      values.capitalEmployed = randBetween(300, 3000, 100) * 1000;
      break;
    case 'current-ratio':
      values.currentAssets = randBetween(100, 800, 25) * 1000;
      values.currentLiabilities = randBetween(50, 600, 25) * 1000;
      break;
    case 'acid-test':
      values.currentAssets = randBetween(150, 800, 25) * 1000;
      values.stock = randBetween(30, 150, 10) * 1000;
      values.currentLiabilities = randBetween(50, 600, 25) * 1000;
      break;
    case 'arr':
      values.capitalCost = randBetween(50, 500, 25) * 1000;
      values.yearsOfUse = randBetween(3, 10, 1);
      values.totalReturns = Math.round(values.capitalCost * randBetween(120, 200, 10) / 100);
      break;
    case 'stock-turnover-times':
      values.avgStock = randBetween(20, 200, 10) * 1000;
      values.costOfSales = randBetween(100, 1000, 50) * 1000;
      break;
    case 'stock-turnover-days':
      values.avgStock = randBetween(20, 200, 10) * 1000;
      values.costOfSales = randBetween(100, 1000, 50) * 1000;
      break;
    case 'debtor-days':
      values.salesRevenue = randBetween(200, 2000, 50) * 1000;
      values.debtors = Math.round(values.salesRevenue * randBetween(5, 25, 5) / 100);
      break;
    case 'creditor-days':
      values.costOfSales = randBetween(100, 1000, 50) * 1000;
      values.creditors = Math.round(values.costOfSales * randBetween(5, 25, 5) / 100);
      break;
    case 'gearing':
      values.nonCurrentLiabilities = randBetween(100, 800, 25) * 1000;
      values.capitalEmployed = values.nonCurrentLiabilities + randBetween(100, 800, 25) * 1000;
      break;
  }

  const answer = f.calculate(values);
  return { formulaKey, formula: f, values, answer };
}
