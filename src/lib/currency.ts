export const AFRICAN_COUNTRIES = [
  { name: 'Nigeria', currency: 'NGN', symbol: '₦' },
  { name: 'South Africa', currency: 'ZAR', symbol: 'R' },
  { name: 'Kenya', currency: 'KES', symbol: 'KSh' },
  { name: 'Ghana', currency: 'GHS', symbol: 'GH₵' },
  { name: 'Egypt', currency: 'EGP', symbol: 'E£' },
  { name: 'Morocco', currency: 'MAD', symbol: 'MAD' },
  { name: 'Uganda', currency: 'UGX', symbol: 'USh' },
  { name: 'Tanzania', currency: 'TZS', symbol: 'TSh' },
  { name: 'Rwanda', currency: 'RWF', symbol: 'FRw' },
  { name: 'Ethiopia', currency: 'ETB', symbol: 'Br' },
  { name: 'Senegal', currency: 'XOF', symbol: 'CFA' },
  { name: 'Ivory Coast', currency: 'XOF', symbol: 'CFA' },
  { name: 'Cameroon', currency: 'XAF', symbol: 'FCFA' },
  { name: 'Zambia', currency: 'ZMW', symbol: 'ZK' },
  { name: 'Zimbabwe', currency: 'ZWL', symbol: 'Z$' },
  { name: 'Botswana', currency: 'BWP', symbol: 'P' },
  { name: 'Namibia', currency: 'NAD', symbol: 'N$' },
  { name: 'Mozambique', currency: 'MZN', symbol: 'MT' },
  { name: 'Angola', currency: 'AOA', symbol: 'Kz' },
  { name: 'Algeria', currency: 'DZD', symbol: 'DA' },
  { name: 'Tunisia', currency: 'TND', symbol: 'DT' },
  { name: 'Mali', currency: 'XOF', symbol: 'CFA' },
  { name: 'Burkina Faso', currency: 'XOF', symbol: 'CFA' },
  { name: 'Niger', currency: 'XOF', symbol: 'CFA' },
  { name: 'Chad', currency: 'XAF', symbol: 'FCFA' },
  { name: 'Sudan', currency: 'SDG', symbol: 'SDG' },
  { name: 'Somalia', currency: 'SOS', symbol: 'S' },
  { name: 'Madagascar', currency: 'MGA', symbol: 'Ar' },
  { name: 'Malawi', currency: 'MWK', symbol: 'MK' },
  { name: 'Mauritius', currency: 'MUR', symbol: '₨' },
  { name: 'Seychelles', currency: 'SCR', symbol: '₨' },
  { name: 'Liberia', currency: 'LRD', symbol: 'L$' },
  { name: 'Sierra Leone', currency: 'SLL', symbol: 'Le' },
  { name: 'Guinea', currency: 'GNF', symbol: 'FG' },
  { name: 'Gambia', currency: 'GMD', symbol: 'D' },
  { name: 'Togo', currency: 'XOF', symbol: 'CFA' },
  { name: 'Benin', currency: 'XOF', symbol: 'CFA' },
  { name: 'Gabon', currency: 'XAF', symbol: 'FCFA' },
  { name: 'Congo', currency: 'XAF', symbol: 'FCFA' },
  { name: 'DR Congo', currency: 'CDF', symbol: 'FC' },
  { name: 'Burundi', currency: 'BIF', symbol: 'FBu' },
  { name: 'Djibouti', currency: 'DJF', symbol: 'Fdj' },
  { name: 'Eritrea', currency: 'ERN', symbol: 'Nfk' },
  { name: 'Equatorial Guinea', currency: 'XAF', symbol: 'FCFA' },
  { name: 'Central African Republic', currency: 'XAF', symbol: 'FCFA' },
  { name: 'Lesotho', currency: 'LSL', symbol: 'L' },
  { name: 'Eswatini', currency: 'SZL', symbol: 'L' },
  { name: 'Cape Verde', currency: 'CVE', symbol: 'Esc' },
  { name: 'Sao Tome and Principe', currency: 'STN', symbol: 'Db' },
  { name: 'Comoros', currency: 'KMF', symbol: 'CF' },
  { name: 'Mauritania', currency: 'MRU', symbol: 'UM' },
  { name: 'Libya', currency: 'LYD', symbol: 'LD' }
];

export const getCurrencySymbol = (countryNameOrCode?: string) => {
  if (!countryNameOrCode) return '$'; // Default fallback
  const searchStr = countryNameOrCode.toLowerCase();
  const country = AFRICAN_COUNTRIES.find(c => 
    c.name.toLowerCase() === searchStr || 
    c.currency.toLowerCase() === searchStr
  );
  return country ? country.symbol : '$';
};

export const getCurrencyCode = (countryNameOrCode?: string) => {
  if (!countryNameOrCode) return 'USD'; // Default fallback
  const searchStr = countryNameOrCode.toLowerCase();
  const country = AFRICAN_COUNTRIES.find(c => 
    c.name.toLowerCase() === searchStr || 
    c.currency.toLowerCase() === searchStr
  );
  return country ? country.currency : 'USD';
};

let liveRates: Record<string, number> = { 'USD': 1 };

export const initializeExchangeRates = async (retryCount = 0) => {
  try {
    console.log(`Initializing exchange rates (attempt ${retryCount + 1})...`);
    
    const response = await fetch('/api/exchange-rates');
    
    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        liveRates = data;
        console.log('Live exchange rates loaded successfully from API');
      } else {
        throw new Error('Received empty or invalid rates data');
      }
    } else {
      let errorMessage = `Server responded with status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
        if (errorData.message) errorMessage += `: ${errorData.message}`;
      } catch (e) {
        // Fallback to status message
      }
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.warn(`Error initializing exchange rates (attempt ${retryCount + 1}):`, error.message || error);
    
    // Retry logic (up to 3 times)
    if (retryCount < 2) {
      const delay = (retryCount + 1) * 2000;
      console.log(`Retrying in ${delay}ms...`);
      setTimeout(() => initializeExchangeRates(retryCount + 1), delay);
    } else {
      console.error('Max retries reached. Exchange rates will use default values (1.0). Please check server logs.');
    }
  }
};

export const convertCurrency = (amount: number, fromCountry?: string, toCountry?: string) => {
  if (!fromCountry || !toCountry || fromCountry === toCountry) return amount;
  
  const fromCode = getCurrencyCode(fromCountry);
  const toCode = getCurrencyCode(toCountry);
  
  if (fromCode === toCode) return amount;
  
  const fromRate = liveRates[fromCode] || 1;
  const toRate = liveRates[toCode] || 1;
  
  // Convert to USD first, then to target currency
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
};

export const formatPrice = (amount: number | string, countryName?: string) => {
  const symbol = getCurrencySymbol(countryName);
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return `${symbol}0.00`;
  
  // Format with commas for thousands
  return `${symbol}${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
