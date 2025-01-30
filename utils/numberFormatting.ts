/**
 * Converts a formatted number string or number to a clean number
 * Handles strings with commas and pure numbers
 */
export const cleanNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  
  // Remove any commas and convert to number
  return Number(value.replace(/,/g, ''));
};

/**
 * Clean all number fields in an expense object
 */
export const cleanExpense = (expense: any) => ({
  ...expense,
  amount: cleanNumber(expense.amount)
});

/**
 * Clean all number fields in a financial summary object
 */
export const cleanFinancialSummary = (summary: any) => ({
  ...summary,
  total_expenses: cleanNumber(summary.total_expenses),
  total_grant_received: cleanNumber(summary.total_grant_received),
  total_other_sources: cleanNumber(summary.total_other_sources),
  remainder: cleanNumber(summary.remainder)
});

/**
 * Clean all number fields in a form object
 * Handles both flat and nested data structures
 */
export const cleanFormData = (formData: any) => {
  // Handle flat structure (as used in PrefilledForm)
  if (formData.total_expenses !== undefined) {
    return {
      ...formData,
      expenses: formData.expenses.map(cleanExpense),
      total_expenses: cleanNumber(formData.total_expenses),
      total_grant: cleanNumber(formData.total_grant),
      total_other_sources: cleanNumber(formData.total_other_sources),
      remainder: cleanNumber(formData.remainder)
    };
  }

  // Handle nested structure (as used in API response)
  if (formData.financial_summary) {
    return {
      ...formData,
      expenses: formData.expenses.map(cleanExpense),
      financial_summary: cleanFinancialSummary(formData.financial_summary)
    };
  }

  // If neither structure is found, return original data
  return formData;
}; 