import React from 'react';
import { formatPrice, convertCurrency } from '../lib/currency';

interface PriceDisplayProps {
  amount: number;
  sourceCountry?: string;
  targetCountry?: string;
  className?: string;
  showOriginalIfConverted?: boolean;
  originalPriceClassName?: string;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  sourceCountry,
  targetCountry,
  className = '',
  showOriginalIfConverted = true,
  originalPriceClassName = 'text-xs text-gray-500 line-through ml-2'
}) => {
  // If no target country or same country, just format the original amount
  if (!targetCountry || sourceCountry === targetCountry) {
    return (
      <span className={className}>
        {formatPrice(amount, sourceCountry)}
      </span>
    );
  }

  // Convert the amount
  const convertedAmount = convertCurrency(amount, sourceCountry, targetCountry);
  const formattedConverted = formatPrice(convertedAmount, targetCountry);
  const formattedOriginal = formatPrice(amount, sourceCountry);

  return (
    <span className="inline-flex items-baseline flex-wrap gap-1">
      <span className={className}>{formattedConverted}</span>
      {showOriginalIfConverted && (
        <span className={originalPriceClassName}>
          {formattedOriginal}
        </span>
      )}
    </span>
  );
};

export default PriceDisplay;
