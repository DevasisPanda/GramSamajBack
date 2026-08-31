export function numberToWords(amount: number | string): string {
  if (typeof amount === 'string') {
    amount = parseFloat(amount.replace(/[^\d.-]/g, ''));
  }
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(num: number): string {
    if (num === 0) return '';
    if (num < 20) return units[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + units[num % 10] : '');
    return units[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertChunk(num % 100) : '');
  }

  function convertNumber(num: number): string {
    if (num === 0) return 'Zero';
    
    let result = '';
    
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    
    const remainder = num;

    if (crore > 0) result += convertChunk(crore) + ' Crore ';
    if (lakh > 0) result += convertChunk(lakh) + ' Lakh ';
    if (thousand > 0) result += convertChunk(thousand) + ' Thousand ';
    if (remainder > 0) result += convertChunk(remainder);

    return result.trim();
  }

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let words = convertNumber(integerPart) + ' Rupees';
  
  if (decimalPart > 0) {
    words += ' and ' + convertNumber(decimalPart) + ' Paise';
  }
  
  return words + ' Only';
}
