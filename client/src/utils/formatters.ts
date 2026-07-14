// ============================================
// Billow — Formatting Utilities
// ============================================
import { format, parseISO } from 'date-fns';

/**
 * Formats a number as a currency string (USD).
 * Example: 1234.56 -> "$1,234.56"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats an ISO date string or YYYY-MM-DD string to a short user-friendly date.
 * Example: "2026-07-14" -> "Jul 14"
 */
export function formatDate(dateStr: string): string {
  try {
    // If it's just YYYY-MM-DD, parse it carefully to avoid timezone shifts
    if (dateStr.length === 10) {
      const [year, month, day] = dateStr.split('-').map(Number);
      // month is 0-indexed in JS Date
      const date = new Date(year, month - 1, day);
      return format(date, 'MMM dd');
    }
    return format(parseISO(dateStr), 'MMM dd');
  } catch (error) {
    return dateStr;
  }
}

/**
 * Formats a date string to a full user-friendly date.
 * Example: "2026-07-14" -> "Jul 14, 2026"
 */
export function formatFullDate(dateStr: string): string {
  try {
    if (dateStr.length === 10) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'MMM dd, yyyy');
    }
    return format(parseISO(dateStr), 'MMM dd, yyyy');
  } catch (error) {
    return dateStr;
  }
}

/**
 * Formats a decimal number (0-100) as a percentage string.
 * Example: 75.4 -> "75.4%"
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Returns a consistent hex color code for each AWS service.
 * These match our CSS custom properties defined in index.css.
 */
export function getServiceColor(serviceName: string): string {
  const service = serviceName.toLowerCase();
  
  if (service.includes('elastic compute cloud') || service.includes('ec2')) {
    return '#ff9900'; // AWS Orange
  }
  if (service.includes('simple storage service') || service.includes('s3')) {
    return '#569a31'; // S3 Green
  }
  if (service.includes('lambda')) {
    return '#ff9900'; // Lambda Orange
  }
  if (service.includes('dynamodb')) {
    return '#4053d6'; // DynamoDB Blue
  }
  if (service.includes('cloudfront')) {
    return '#8c4fff'; // CloudFront Purple
  }
  if (service.includes('rds') || service.includes('relational database')) {
    return '#3b48cc'; // RDS Blue
  }
  if (service.includes('api gateway')) {
    return '#ff4f8b'; // API Gateway Pink
  }
  if (service.includes('cloudwatch')) {
    return '#e7157b'; // CloudWatch Magenta
  }
  
  // Default fallback color
  return '#6366f1'; 
}

/**
 * Determines the direction of the cost trend.
 */
export function getTrendDirection(current: number, previous: number): 'up' | 'down' | 'stable' {
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return 'stable';
  return diff > 0 ? 'up' : 'down';
}
