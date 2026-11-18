// One number for the cost of one access window, used by the texts and by the budget panel.
// 15 minutes of window + about 7 minutes of start + about 2 minutes of stop = about 24 minutes
// of node time at US$ 0.104 per hour (Standard_D2as_v4) = about US$ 0.04.
export const WINDOW_COST_USD = 0.04
// The budget is in the billing currency of the subscription (BRL): R$ 330 per month = the owner's US$60 at about
// R$ 5.50 per US dollar (rate of 2026-11-18). This rate only turns the window cost into BRL for the budget panel.
export const BUDGET_BRL = 330
export const BRL_PER_USD = 5.5
/** The cost of one window in the currency of the budget, or null when the currency is not USD or BRL. */
export const windowCostIn = (currency: string): number | null =>
  currency === 'USD' ? WINDOW_COST_USD : currency === 'BRL' ? WINDOW_COST_USD * BRL_PER_USD : null
/** "0.04" in English, "0,04" in Portuguese. */
export const windowCostText = (decimalMark: '.' | ',') => WINDOW_COST_USD.toFixed(2).replace('.', decimalMark)
