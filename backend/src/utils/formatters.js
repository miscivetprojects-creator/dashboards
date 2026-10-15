function formatIndianNumber(numericValue, decimals = 2) {
  if (numericValue === null || numericValue === undefined || isNaN(numericValue)) return '0.00';
  const num = Number(numericValue);
  const parts = num.toFixed(decimals).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] !== undefined ? '.' + parts[1] : '';

  const isNegative = integerPart.startsWith('-');
  if (isNegative) integerPart = integerPart.substring(1);

  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return (isNegative ? '-' : '') + integerPart + decimalPart;
}

function formatIndianCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rs. 0.00';
  const val = Number(amount);
  const absVal = Math.abs(val);
  const prefix = val < 0 ? '-Rs. ' : 'Rs. ';
  return `${prefix}${formatIndianNumber(absVal, 2)}`;
}

module.exports = {
  formatIndianNumber,
  formatIndianCurrency
};
