export function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rs. 0.00';
  const val = Number(amount);
  const parts = Math.abs(val).toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] !== undefined ? '.' + parts[1] : '.00';
  const isNegative = val < 0;

  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return (isNegative ? '-Rs. ' : 'Rs. ') + integerPart + decimalPart;
}

export function formatNumber(val, decimals = 0) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const num = Number(val);
  const parts = Math.abs(num).toFixed(decimals).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] !== undefined && decimals > 0 ? '.' + parts[1] : '';
  const isNegative = num < 0;

  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return (isNegative ? '-' : '') + integerPart + decimalPart;
}
