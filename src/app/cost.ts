// One number for the cost of one access window, used by the texts and by the budget panel.
// 15 minutes of window + about 7 minutes of start + about 2 minutes of stop = about 24 minutes
// of node time at US$ 0.104 per hour (Standard_D2as_v4) = about US$ 0.04.
export const WINDOW_COST_USD = 0.04
/** "0.04" in English, "0,04" in Portuguese. */
export const windowCostText = (decimalMark: '.' | ',') => WINDOW_COST_USD.toFixed(2).replace('.', decimalMark)
