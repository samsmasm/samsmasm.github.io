// RatIBro — IB Finance topic data
// Definitions sourced from IB BM glossary and curriculum. Adjust wording as needed.
//
// Structure: TOPICS → units → clusters[] → skills[]
// Skills are self-rated on the dashboard.
// VOCAB_TERMS are definitions-practice only (no progress tracking).

const TOPICS = [
  {
    unit: '3.1',
    unitName: 'Introduction to Finance',
    clusters: [
      {
        id: 'intro-finance',
        name: 'Finance fundamentals',
        skills: [
          { id: 'role-of-finance', name: 'Role of finance for businesses', hl: false, definition: 'Finance enables businesses to fund start-up costs, cover day-to-day expenditure, invest in growth, and measure performance. Without finance, a business cannot acquire resources, pay employees, or pursue its objectives.' },
          { id: 'capital-expenditure', name: 'Capital expenditure', hl: false, definition: 'Spending on the non-current (fixed) assets of a business, such as buildings, machinery, or vehicles. These assets are used for more than one year.' },
          { id: 'revenue-expenditure', name: 'Revenue expenditure', hl: false, definition: 'Spending on a company\'s general operational costs — such as wages, rent, and raw materials — that enables the business to generate ongoing revenue within the accounting period.' },
        ]
      }
    ]
  },
  {
    unit: '3.2',
    unitName: 'Sources of Finance',
    clusters: [
      {
        id: 'internal-sources',
        name: 'Internal sources',
        skills: [
          { id: 'personal-funds', name: 'Personal funds', hl: false, definition: 'Money contributed by the sole trader or partners from their own savings to fund the business. No interest is paid and no ownership is given away, but the owner bears all the risk.' },
          { id: 'retained-profit', name: 'Retained profit', hl: false, definition: 'Money that a company has left at the end of the trading year after paying all costs, expenses, dividends and taxes. It is reinvested into the business rather than distributed to owners.' },
          { id: 'sale-of-assets', name: 'Sale of assets', hl: false, definition: 'Raising finance by selling assets the business no longer needs, such as property, machinery, or vehicles. Provides a one-off cash inflow but reduces the asset base.' },
        ]
      },
      {
        id: 'short-term-external',
        name: 'Short-term external sources',
        skills: [
          { id: 'overdrafts', name: 'Overdrafts', hl: false, definition: 'A high-cost, short-term loan attached to a bank account that allows the account holder to withdraw more than they currently hold, up to an agreed limit. Flexible but expensive.' },
          { id: 'trade-credit', name: 'Trade credit', hl: false, definition: 'A type of external finance whereby a business receives products from a supplier immediately but pays for them at a later agreed date, typically 30–90 days. Effectively an interest-free short-term loan.' },
          { id: 'crowdfunding', name: 'Crowdfunding', hl: false, definition: 'A form of finance where many people, perhaps thousands, invest small amounts of money to fund a business or project — typically via an online platform, in exchange for rewards, equity, or interest.' },
        ]
      },
      {
        id: 'long-term-external',
        name: 'Long-term external sources',
        skills: [
          { id: 'loan-capital', name: 'Loan capital', hl: false, definition: 'Money borrowed from a bank or financial institution, repaid over a fixed period with interest. Suitable for major capital expenditure. The lender has no ownership stake but must be repaid regardless of profit.' },
          { id: 'share-capital', name: 'Share capital', hl: false, definition: 'Finance for a business raised through the issue of shares to investors on a stock market. Shareholders gain part-ownership and dividends; the business gains permanent capital with no repayment obligation.' },
          { id: 'leasing', name: 'Leasing', hl: false, definition: 'A business renting (hiring) a fixed asset over a period of time rather than buying it. Preserves cash flow and avoids obsolescence risk, but the business never owns the asset.' },
          { id: 'microfinance', name: 'Microfinance providers', hl: false, definition: 'Financial services provided to individuals who have very limited income and assets and are not able to get services from traditional banks. Particularly relevant for entrepreneurs in developing economies.' },
          { id: 'business-angels', name: 'Business angels', hl: false, definition: 'Wealthy private individuals who invest their own money into new businesses in exchange for equity, often providing expertise and contacts as well as finance. Typically fund early-stage businesses.' },
        ]
      },
      {
        id: 'choosing-finance',
        name: 'Choosing the right source',
        skills: [
          { id: 'finance-appropriateness', name: 'Appropriateness of short/long-term finance', hl: false, definition: 'Short-term finance (e.g. overdrafts, trade credit) suits temporary working capital needs. Long-term finance (e.g. loans, share capital) suits capital expenditure on assets. The appropriate choice depends on the purpose, cost, and financial position of the business.' },
        ]
      }
    ]
  },
  {
    unit: '3.3',
    unitName: 'Costs and Revenues',
    clusters: [
      {
        id: 'cost-types',
        name: 'Cost types',
        skills: [
          { id: 'fixed-costs', name: 'Fixed costs', hl: false, definition: 'Those costs that, during the relevant period, do not vary with output or activity — such as rent, insurance, and salaries. They are incurred whether or not the business produces anything.' },
          { id: 'variable-costs', name: 'Variable costs', hl: false, definition: 'Those costs that vary directly with output — such as raw materials and piece-rate labour. If output doubles, total variable costs double.' },
          { id: 'direct-costs', name: 'Direct costs', hl: false, definition: 'A cost that is precisely traceable to a specific cost object — which may be a product, a service or a department. For example, the leather used to make a specific shoe.' },
          { id: 'indirect-costs', name: 'Indirect costs / Overheads', hl: false, definition: 'Costs that are used in multiple areas or activities of the business and, therefore, are not traceable to a specific cost object — such as management salaries or office rent.' },
        ]
      },
      {
        id: 'revenue',
        name: 'Revenue',
        skills: [
          { id: 'total-revenue', name: 'Total revenue', hl: false, definition: 'The total income received by a business from selling its goods or services, calculated as price × quantity sold.' },
          { id: 'revenue-streams', name: 'Revenue streams', hl: false, definition: 'The different sources from which a business earns money. For example, a hotel might have revenue streams from room bookings, food and beverage, and event hire.' },
        ]
      }
    ]
  },
  {
    unit: '3.4',
    unitName: 'Final Accounts',
    clusters: [
      {
        id: 'financial-statements',
        name: 'Financial statements',
        skills: [
          { id: 'purpose-of-accounts', name: 'Purpose of accounts to stakeholders', hl: false, definition: 'Final accounts provide financial information to different stakeholders: shareholders assess profitability and returns; managers use them for decision-making; creditors assess whether the business can repay debts; governments check tax compliance; employees assess job security.' },
          { id: 'statement-profit-loss', name: 'Statement of profit or loss', hl: false, definition: 'A statement that records sales revenues and costs of a business to determine the net profit and distribution of profit; also known as the income statement. Shows performance over a period of time.' },
          { id: 'statement-financial-position', name: 'Statement of financial position', hl: false, definition: 'A statement that records a business\'s assets, liabilities and equity at a specific point in time; also known as the balance sheet. Shows what the business owns and owes.' },
        ]
      },
      {
        id: 'assets-depreciation',
        name: 'Assets and depreciation',
        skills: [
          { id: 'intangible-assets', name: 'Intangible assets', hl: false, definition: 'Non-physical items of value owned by a company that have a lifespan of more than a year — such as goodwill, patents, trademarks, and brand recognition. Harder to value than tangible assets.' },
          { id: 'depreciation-straight-line', name: 'Straight line depreciation', hl: true, definition: 'A method of depreciation that spreads the cost of an asset evenly over its useful life. Annual depreciation = (Cost − Residual value) ÷ Years of useful life.' },
          { id: 'depreciation-units', name: 'Units of production depreciation', hl: true, definition: 'A method of depreciation that allocates cost based on actual usage — the more the asset is used, the more it depreciates. Depreciation per unit = (Cost − Residual value) ÷ Estimated total units.' },
        ]
      }
    ]
  },
  {
    unit: '3.5',
    unitName: 'Profitability and Liquidity Ratios',
    clusters: [
      {
        id: 'profitability-ratios',
        name: 'Profitability ratios',
        skills: [
          { id: 'gross-profit-margin', name: 'Gross profit margin', hl: false, definition: 'A profitability ratio that shows the gross profit as a percentage of sales revenue. Formula: (Gross profit ÷ Sales revenue) × 100. Measures how efficiently a business converts sales into gross profit.' },
          { id: 'profit-margin', name: 'Profit margin', hl: false, definition: 'A profitability ratio that shows the profit before interest and tax as a percentage of sales revenue. Formula: (PBIT ÷ Sales revenue) × 100. A broader measure than GPM as it accounts for all operating costs.' },
          { id: 'roce', name: 'Return on capital employed (ROCE)', hl: false, definition: 'A profitability ratio that shows the profit before interest and tax as a percentage of capital employed. Formula: (PBIT ÷ Capital employed) × 100. Often considered the most important profitability ratio.' },
        ]
      },
      {
        id: 'liquidity-ratios',
        name: 'Liquidity ratios',
        skills: [
          { id: 'current-ratio', name: 'Current ratio', hl: false, definition: 'A liquidity ratio that measures the value of current assets relative to current liabilities. Formula: Current assets ÷ Current liabilities. A result above 1 means the business can cover its short-term debts; around 1.5–2 is typically healthy.' },
          { id: 'acid-test-ratio', name: 'Acid test (quick) ratio', hl: false, definition: 'A liquidity ratio that measures the value of current assets without stock included, relative to current liabilities. Formula: (Current assets − Stock) ÷ Current liabilities. A stricter test of liquidity than the current ratio.' },
          { id: 'ratio-improvement-strategies', name: 'Strategies to improve profitability/liquidity ratios', hl: false, definition: 'Profitability ratios can be improved by increasing revenue (e.g. higher prices, greater volume) or reducing costs. Liquidity ratios can be improved by increasing current assets (e.g. better cash management) or reducing current liabilities (e.g. paying off short-term debt).' },
        ]
      }
    ]
  },
  {
    unit: '3.6',
    unitName: 'Efficiency Ratio Analysis',
    clusters: [
      {
        id: 'efficiency-ratios',
        name: 'Efficiency ratios',
        skills: [
          { id: 'stock-turnover', name: 'Stock turnover', hl: true, definition: 'An efficiency ratio measuring how quickly a business sells its stock. Times: Cost of sales ÷ Average stock. Days: (Average stock ÷ Cost of sales) × 365. A higher turnover (fewer days) is generally better, but depends on industry.' },
          { id: 'debtor-days', name: 'Debtor days', hl: true, definition: 'An efficiency ratio measuring the average number of days it takes a business to collect its debts. Formula: (Debtors ÷ Sales revenue) × 365. Fewer days means the business collects cash faster.' },
          { id: 'creditor-days', name: 'Creditor days', hl: true, definition: 'An efficiency ratio measuring the average number of days it takes a business to pay its debts. Formula: (Creditors ÷ Cost of sales) × 365. More days means the business holds onto cash longer before paying suppliers.' },
        ]
      },
      {
        id: 'gearing-solvency',
        name: 'Gearing and solvency',
        skills: [
          { id: 'gearing-ratio', name: 'Gearing ratio', hl: true, definition: 'A measure of how much of a business\'s capital employed is financed by long-term debt. Formula: (Non-current liabilities ÷ Capital employed) × 100. A high gearing ratio indicates greater financial risk and vulnerability to interest rate changes.' },
          { id: 'insolvency-bankruptcy', name: 'Insolvency vs bankruptcy', hl: true, definition: 'Insolvency is a situation in which a business is unable to pay its debts as they fall due. Bankruptcy is the legal process that follows when an insolvent individual or business cannot repay creditors, resulting in assets being sold to settle debts.' },
        ]
      }
    ]
  },
  {
    unit: '3.7',
    unitName: 'Cash Flow',
    clusters: [
      {
        id: 'cashflow-concepts',
        name: 'Cash flow concepts',
        skills: [
          { id: 'profit-vs-cashflow', name: 'Profit vs cash flow', hl: false, definition: 'Profit is the surplus of revenue over costs over a period; cash flow is the movement of money into and out of a business. A business can be profitable but still run out of cash — for example, if customers pay late or inventory is bought in large quantities.' },
          { id: 'working-capital', name: 'Working capital', hl: false, definition: 'The difference between current assets and current liabilities. Sufficient working capital is essential for a business to meet its short-term obligations and fund day-to-day operations.' },
          { id: 'liquidity-position', name: 'Liquidity position', hl: false, definition: 'A measure of a business\'s ability to meet its short-term financial obligations. A strong liquidity position means the business can pay its debts as they fall due; a weak liquidity position risks insolvency even if the business is profitable.' },
        ]
      },
      {
        id: 'cashflow-management',
        name: 'Managing cash flow',
        skills: [
          { id: 'cash-flow-forecasts', name: 'Cash flow forecasts', hl: false, definition: 'A prediction of future cash inflows, cash outflows and net cash flow for a specific time period. Used to identify potential cash shortfalls in advance so that corrective action can be taken.' },
          { id: 'investment-profit-cashflow', name: 'Relationship: investment, profit, cash flow', hl: false, definition: 'Investment requires an initial cash outflow, which harms short-term cash flow. Over time, a successful investment generates returns that increase profit. However, a profitable investment can still cause cash flow problems in the short term, and profit does not always equal cash received.' },
          { id: 'cashflow-strategies', name: 'Strategies for cash flow problems', hl: false, definition: 'Businesses facing cash flow problems can: chase debtors to speed up collections, delay payments to creditors, cut costs, sell surplus assets, arrange a bank overdraft, or seek additional finance such as a loan. Prevention through accurate cash flow forecasting is preferable to reactive measures.' },
        ]
      }
    ]
  },
  {
    unit: '3.8',
    unitName: 'Investment Appraisal',
    clusters: [
      {
        id: 'investment-appraisal',
        name: 'Investment appraisal methods',
        skills: [
          { id: 'payback-period', name: 'Payback period', hl: false, definition: 'A calculation of the length of time it takes for a capital investment to pay for itself from estimated future cash flows. Simple to calculate and understand, but ignores the time value of money and returns beyond the payback point.' },
          { id: 'arr', name: 'Average rate of return (ARR)', hl: false, definition: 'An investment appraisal technique that expresses the average annual forecast returns as a percentage of the initial capital cost. Formula: ((Total returns − Capital cost) ÷ Years of use) ÷ Capital cost × 100.' },
          { id: 'npv', name: 'Net present value (NPV)', hl: true, definition: 'A method of investment appraisal that uses a discount rate to adjust the value of future returns to their present-day equivalent, then subtracts the initial cost. A positive NPV means the investment adds value. Accounts for the time value of money.' },
        ]
      }
    ]
  },
  {
    unit: '3.9',
    unitName: 'Budgets',
    clusters: [
      {
        id: 'cost-profit-centres',
        name: 'Cost and profit centres',
        skills: [
          { id: 'cost-profit-centres', name: 'Cost centres vs profit centres', hl: true, definition: 'A cost centre is a department in a business that generates costs but no revenue (e.g. HR). A profit centre is a department that generates both revenues and costs, so its contribution to overall profit can be measured (e.g. a product line).' },
          { id: 'roles-cost-profit-centres', name: 'Roles of cost/profit centres', hl: true, definition: 'Cost and profit centres allow businesses to monitor the financial performance of individual departments, allocate resources more effectively, identify areas of strength or weakness, and motivate managers by giving them responsibility for financial results in their area.' },
        ]
      },
      {
        id: 'budgets',
        name: 'Budgets',
        skills: [
          { id: 'constructing-budget', name: 'Constructing a budget', hl: true, definition: 'A budget is a financial plan that outlines expected revenue and expenditure over a set period. It is constructed using historical data, sales forecasts, and knowledge of planned costs, and is used to set targets and allocate resources across the business.' },
          { id: 'variances', name: 'Variances', hl: true, definition: 'The difference between a budgeted figure and the actual figure. A favourable variance (F) means actual performance was better than budgeted; an adverse variance (A) means it was worse. Variance analysis helps managers identify and investigate deviations.' },
          { id: 'budgets-decision-making', name: 'Importance of budgets in decision-making', hl: true, definition: 'Budgets provide a financial benchmark against which actual performance is measured. They help managers control costs, allocate resources, coordinate activities across departments, and make informed decisions based on the analysis of variances between budgeted and actual figures.' },
        ]
      }
    ]
  },
  {
    unit: '4.3',
    unitName: 'Sales Forecasting',
    clusters: [
      {
        id: 'sales-forecasting',
        name: 'Sales forecasting',
        skills: [
          { id: 'sales-forecasting', name: 'Sales forecasting', hl: true, definition: 'A quantitative technique used by businesses to predict future sales levels, using historical data, trend analysis, and moving averages. Accurate sales forecasts feed into budgets, production planning, and cash flow forecasts.' },
        ]
      }
    ]
  },
];

// Flatten all skills into one array for easy lookup
const ALL_SKILLS = TOPICS.flatMap(unit =>
  unit.clusters.flatMap(cluster =>
    cluster.skills.map(skill => ({
      ...skill,
      unit: unit.unit,
      unitName: unit.unitName,
      clusterId: cluster.id,
      clusterName: cluster.name
    }))
  )
);

// Get a skill by id
function getSkill(id) {
  return ALL_SKILLS.find(s => s.id === id);
}

// ============================================================
// Vocabulary terms — definitions practice only, no dashboard tracking
// ============================================================
const VOCAB_TERMS = [
  // 3.2 Sources of Finance
  { id: 'collateral',          name: 'Collateral',               definition: 'An asset that a business or individual can offer a lender in the event that they do not pay back a loan. Reduces the risk to the lender.',                                                                          unit: '3.2', unitName: 'Sources of Finance',              hl: false },
  { id: 'debt-finance',        name: 'Debt finance',             definition: 'Money that is borrowed from a bank or other financial institution, usually to fund investments. Must be repaid with interest, regardless of profit.',                                                               unit: '3.2', unitName: 'Sources of Finance',              hl: false },
  { id: 'equity-finance',      name: 'Equity finance',           definition: 'A type of funding whereby the provider receives part ownership of the business in exchange for the finance. No repayment obligation, but ownership and control are diluted.',                                       unit: '3.2', unitName: 'Sources of Finance',              hl: false },
  { id: 'internal-source',     name: 'Internal source of finance', definition: 'Money for a business that is raised from the business\'s or owner\'s existing assets — such as retained profit, sale of assets, or personal savings.',                                                          unit: '3.2', unitName: 'Sources of Finance',              hl: false },
  { id: 'external-source',     name: 'External source of finance', definition: 'Money for a business that is raised from outside the business — such as a bank loan, share issue, or crowdfunding.',                                                                                            unit: '3.2', unitName: 'Sources of Finance',              hl: false },
  { id: 'long-term-financing', name: 'Long-term financing',      definition: 'Large-scale funds needed to finance expensive equipment and facilities that a business needs to operate. Typically repaid or held for more than one year.',                                                        unit: '3.2', unitName: 'Sources of Finance',              hl: false },
  { id: 'short-term-financing',name: 'Short-term financing',     definition: 'Small-scale funds needed to pay for inputs that will soon be processed and sold by the business; used to cover short-term working capital needs.',                                                                unit: '3.2', unitName: 'Sources of Finance',              hl: false },
  { id: 'seed-capital',        name: 'Seed capital',             definition: 'Money raised by a business in the very early stages of its development, before it has a proven product or revenue stream.',                                                                                       unit: '3.2', unitName: 'Sources of Finance',              hl: false },
  { id: 'mortgage',            name: 'Mortgage',                 definition: 'A special type of long-term loan that is used to purchase land or buildings, with the property itself serving as collateral.',                                                                                     unit: '3.2', unitName: 'Sources of Finance',              hl: false },
  { id: 'venture-capital',     name: 'Venture capital',          definition: 'Financing that pools resources from a group of investors to fund new or growing businesses with high potential. Investors receive equity and typically take an active interest in the business.',                   unit: '3.2', unitName: 'Sources of Finance',              hl: false },

  // 3.3 Costs and Revenues
  { id: 'cost-of-sales',       name: 'Cost of sales',            definition: 'The cost of goods actually sold by a business over a period of time. Calculated as: Opening stock + Purchases − Closing stock.',                                                                                 unit: '3.3', unitName: 'Costs and Revenues',              hl: false },
  { id: 'gross-profit',        name: 'Gross profit',             definition: 'The sales revenue of a business minus the cost of sales. It measures how efficiently the business produces or sources its products before overhead costs are considered.',                                        unit: '3.3', unitName: 'Costs and Revenues',              hl: false },
  { id: 'contribution',        name: 'Contribution (per unit)',  definition: 'The selling price of one unit minus its variable (direct) costs. Each unit sold contributes this amount towards covering fixed costs and, eventually, profit.',                                                   unit: '3.3', unitName: 'Costs and Revenues',              hl: false },
  { id: 'total-contribution',  name: 'Total contribution',       definition: 'The sum of all contributions across total units sold: (Selling price − Variable cost) × Quantity. Once total contribution exceeds fixed costs, the business makes a profit.',                                   unit: '3.3', unitName: 'Costs and Revenues',              hl: false },
  { id: 'break-even',          name: 'Break-even',               definition: 'The level of output or sales at which total revenue equals total costs — the business makes neither a profit nor a loss. Formula: Fixed costs ÷ Contribution per unit.',                                        unit: '3.3', unitName: 'Costs and Revenues',              hl: false },
  { id: 'margin-of-safety',    name: 'Margin of safety',         definition: 'The difference between the current (or forecasted) output and the break-even output. It shows how far sales can fall before the business starts making a loss.',                                                unit: '3.3', unitName: 'Costs and Revenues',              hl: false },
  { id: 'unit-average-cost',   name: 'Unit (average) cost',      definition: 'The cost of producing a single unit of output. Formula: Total costs ÷ Total output. Falls as output increases (due to fixed costs being spread over more units).',                                              unit: '3.3', unitName: 'Costs and Revenues',              hl: false },
  { id: 'total-costs',         name: 'Total costs',              definition: 'The sum of fixed costs and variable costs at a given level of output. Total costs = Fixed costs + Variable costs.',                                                                                               unit: '3.3', unitName: 'Costs and Revenues',              hl: false },

  // 3.4 Final Accounts
  { id: 'asset',               name: 'Asset',                    definition: 'An item of property that has value and is owned by a person or business. Assets appear on the statement of financial position.',                                                                                  unit: '3.4', unitName: 'Final Accounts',                  hl: false },
  { id: 'fixed-asset',         name: 'Fixed asset (non-current asset)', definition: 'An item of property that has value, is owned by a business, and which the business plans on holding or using for longer than one year — such as machinery, land, or vehicles.',                          unit: '3.4', unitName: 'Final Accounts',                  hl: false },
  { id: 'current-assets',      name: 'Current assets',           definition: 'Cash and other assets that a business plans to convert into cash within less than one year — including debtors (accounts receivable) and stock (inventory).',                                                    unit: '3.4', unitName: 'Final Accounts',                  hl: false },
  { id: 'current-liabilities', name: 'Current liabilities',      definition: 'Debts and other payables that are due within one year — such as overdrafts, trade creditors, and short-term loans.',                                                                                            unit: '3.4', unitName: 'Final Accounts',                  hl: false },
  { id: 'non-current-assets',  name: 'Non-current assets',       definition: 'Assets that are likely to be kept by the business for more than one year — including tangible assets (e.g. property, machinery) and intangible assets (e.g. goodwill, patents).',                              unit: '3.4', unitName: 'Final Accounts',                  hl: false },
  { id: 'non-current-liabilities', name: 'Non-current liabilities', definition: 'Funds that a company owes to individuals or institutions that are paid back over a period typically longer than 12 months — such as long-term loans or mortgages.',                                         unit: '3.4', unitName: 'Final Accounts',                  hl: false },
  { id: 'net-assets',          name: 'Net assets',               definition: 'The total assets of a business minus the total liabilities. On the statement of financial position, net assets = equity.',                                                                                       unit: '3.4', unitName: 'Final Accounts',                  hl: false },
  { id: 'equity-sfp',          name: 'Equity (balance sheet)',   definition: 'The residual interest in the assets of the business after deducting all liabilities. Represents the owners\' stake. Equity = Assets − Liabilities. Includes share capital and retained profit.',               unit: '3.4', unitName: 'Final Accounts',                  hl: false },
  { id: 'capital-employed',    name: 'Capital employed',         definition: 'The total value of long-term finance invested in a business, calculated as non-current liabilities + equity (or equivalently, total assets − current liabilities). Used in the ROCE formula.',                  unit: '3.4', unitName: 'Final Accounts',                  hl: false },
  { id: 'dividends',           name: 'Dividends',                definition: 'A portion of a business\'s profits distributed to its shareholders. Dividends are paid after tax and reduce retained profit. The amount is decided by the board of directors.',                                 unit: '3.4', unitName: 'Final Accounts',                  hl: false },
  { id: 'depreciation-gen',    name: 'Depreciation',             definition: 'The loss in value of a long-term (non-current) asset over time, recorded as an expense in the statement of profit or loss. Reflects wear and tear, obsolescence, or passage of time.',                         unit: '3.4', unitName: 'Final Accounts',                  hl: false },
  { id: 'debtor',              name: 'Debtor (accounts receivable)', definition: 'A person or business that has bought products on credit from another business but has not yet paid for them. Debtors are a current asset on the statement of financial position.',                         unit: '3.4', unitName: 'Final Accounts',                  hl: false },

  // 3.5/3.6 Ratio Analysis
  { id: 'ratio-analysis',      name: 'Ratio analysis',           definition: 'A quantitative method used to evaluate the liquidity, profitability, and efficiency of a business by analysing relationships between figures in the final accounts.',                                             unit: '3.5', unitName: 'Profitability and Liquidity Ratios', hl: false },
  { id: 'financial-ratios',    name: 'Financial ratios',         definition: 'Quantitative expressions of the relationship between variables in the final accounts. Useful for evaluating business performance and making comparisons over time or against competitors.',                      unit: '3.5', unitName: 'Profitability and Liquidity Ratios', hl: false },
  { id: 'liquidity-ratios',    name: 'Liquidity ratios',         definition: 'Financial ratios that measure a business\'s ability to settle its short-term debt obligations by comparing current assets to current liabilities. Include the current ratio and acid test ratio.',              unit: '3.5', unitName: 'Profitability and Liquidity Ratios', hl: false },
  { id: 'profitability-ratios-gen', name: 'Profitability ratios', definition: 'Financial ratios that show the profit of a business in relation to other financial figures such as revenue or capital employed. Include GPM, profit margin, and ROCE.',                                         unit: '3.5', unitName: 'Profitability and Liquidity Ratios', hl: false },
  { id: 'efficiency-ratios',   name: 'Efficiency ratios',        definition: 'Financial ratios that show how well a business is managing its operations in relation to the working capital cycle. Include stock turnover, debtor days, creditor days, and gearing.',                          unit: '3.6', unitName: 'Efficiency Ratio Analysis',         hl: true  },

  // 3.7 Cash Flow
  { id: 'cash-inflow',         name: 'Cash inflow',              definition: 'Cash flowing into a business — from sales revenue, loans received, asset sales, or other sources. Recorded in the cash flow forecast as a positive figure.',                                                    unit: '3.7', unitName: 'Cash Flow',                       hl: false },
  { id: 'cash-outflow',        name: 'Cash outflow',             definition: 'Cash flowing out of a business — for raw materials, wages, rent, loan repayments, or other payments. Recorded in the cash flow forecast as a negative figure.',                                                 unit: '3.7', unitName: 'Cash Flow',                       hl: false },
  { id: 'net-cash-flow',       name: 'Net cash flow',            definition: 'The total cash inflows minus total cash outflows for a given period. A positive net cash flow increases the closing balance; a negative one decreases it.',                                                     unit: '3.7', unitName: 'Cash Flow',                       hl: false },
  { id: 'working-capital-cycle', name: 'Working capital cycle',  definition: 'The process of turning current assets into cash that can be used to purchase the resources needed to produce a product. A faster cycle means less cash is tied up in operations.',                             unit: '3.7', unitName: 'Cash Flow',                       hl: false },

  // 3.8 Investment Appraisal
  { id: 'discount-rate',       name: 'Discount rate',            definition: 'The rate of return that a business could earn on another comparable investment, used in NPV calculations to reduce future cash flows to their present-day value.',                                               unit: '3.8', unitName: 'Investment Appraisal',             hl: true  },
  { id: 'investment-appraisal-gen', name: 'Investment appraisal', definition: 'A process of quantitative and qualitative evaluation of an investment decision — to determine whether a capital investment is worthwhile. Methods include payback period, ARR, and NPV.',                     unit: '3.8', unitName: 'Investment Appraisal',             hl: false },

  // 3.9 Budgets
  { id: 'adverse-variance',    name: 'Adverse variance',         definition: 'A situation where actual income and expenditure figures are worse for the business than expected — e.g. revenue is lower or costs are higher than budgeted. Denoted (A).',                                      unit: '3.9', unitName: 'Budgets',                          hl: true  },
  { id: 'favourable-variance', name: 'Favourable variance',      definition: 'A situation where actual income and expenditure figures are better for the business than expected — e.g. revenue is higher or costs are lower than budgeted. Denoted (F).',                                    unit: '3.9', unitName: 'Budgets',                          hl: true  },
  { id: 'variance-analysis',   name: 'Variance analysis',        definition: 'A tool used to compare a business\'s budgeted sales revenue and costs with the actual figures over a period of time. Helps managers identify where performance is above or below plan and take corrective action.', unit: '3.9', unitName: 'Budgets',                       hl: true  },

  // 4.3 Sales Forecasting
  { id: 'time-series-analysis', name: 'Time series analysis',    definition: 'A statistical technique used by businesses to identify trends in historical sales data, recorded at regular intervals, in order to make forecasts about future performance.',                                    unit: '4.3', unitName: 'Sales Forecasting',               hl: true  },
  { id: 'moving-average',      name: 'Moving average',           definition: 'A calculation that smooths out fluctuations in a data series by averaging consecutive groups of values. Used in sales forecasting to reveal the underlying trend.',                                             unit: '4.3', unitName: 'Sales Forecasting',               hl: true  },
  { id: 'extrapolation',       name: 'Extrapolation',            definition: 'A forecasting method that identifies trends in past data and extends them to predict future values. Assumes that historical patterns will continue, which may not always hold.',                                 unit: '4.3', unitName: 'Sales Forecasting',               hl: true  },
  { id: 'seasonal-variations', name: 'Seasonal variations',      definition: 'Predictable fluctuations in sales that occur at the same time each year — for example, higher ice cream sales in summer or toy sales before Christmas.',                                                       unit: '4.3', unitName: 'Sales Forecasting',               hl: true  },
  { id: 'cyclical-variations', name: 'Cyclical variations',      definition: 'Variations in data due to cyclical changes in economic activity — such as periods of growth and recession — which affect sales levels over the medium to long term.',                                           unit: '4.3', unitName: 'Sales Forecasting',               hl: true  },
  { id: 'random-variation',    name: 'Random variation',         definition: 'Variations in sales data caused by unpredictable, one-off events that cannot be anticipated or planned for — such as extreme weather or a sudden news event.',                                                  unit: '4.3', unitName: 'Sales Forecasting',               hl: true  },
];

// Combined pool for definitions practice: all skills + all vocab terms
const ALL_DEFN_ITEMS = [
  ...ALL_SKILLS.map(s => ({ ...s, isVocab: false })),
  ...VOCAB_TERMS.map(t => ({ ...t, isVocab: true })),
];

// ============================================================
// Formulas for calculations practice
// ============================================================
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
