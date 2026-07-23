export interface City {
  name: string;
  timezone: string;
  country: string;
  countryCode: string;
  emoji: string;
  continent: string;
  popular?: boolean;
}

export const CITIES: City[] = [
  // Americas
  { name: "New York", timezone: "America/New_York", country: "United States", countryCode: "US", emoji: "🇺🇸", continent: "Americas", popular: true },
  { name: "Los Angeles", timezone: "America/Los_Angeles", country: "United States", countryCode: "US", emoji: "🇺🇸", continent: "Americas", popular: true },
  { name: "Chicago", timezone: "America/Chicago", country: "United States", countryCode: "US", emoji: "🇺🇸", continent: "Americas" },
  { name: "Denver", timezone: "America/Denver", country: "United States", countryCode: "US", emoji: "🇺🇸", continent: "Americas" },
  { name: "Phoenix", timezone: "America/Phoenix", country: "United States", countryCode: "US", emoji: "🇺🇸", continent: "Americas" },
  { name: "Honolulu", timezone: "Pacific/Honolulu", country: "United States", countryCode: "US", emoji: "🇺🇸", continent: "Americas" },
  { name: "Anchorage", timezone: "America/Anchorage", country: "United States", countryCode: "US", emoji: "🇺🇸", continent: "Americas" },
  { name: "Toronto", timezone: "America/Toronto", country: "Canada", countryCode: "CA", emoji: "🇨🇦", continent: "Americas" },
  { name: "Vancouver", timezone: "America/Vancouver", country: "Canada", countryCode: "CA", emoji: "🇨🇦", continent: "Americas" },
  { name: "Mexico City", timezone: "America/Mexico_City", country: "Mexico", countryCode: "MX", emoji: "🇲🇽", continent: "Americas" },
  { name: "São Paulo", timezone: "America/Sao_Paulo", country: "Brazil", countryCode: "BR", emoji: "🇧🇷", continent: "Americas" },
  { name: "Buenos Aires", timezone: "America/Argentina/Buenos_Aires", country: "Argentina", countryCode: "AR", emoji: "🇦🇷", continent: "Americas" },
  { name: "Lima", timezone: "America/Lima", country: "Peru", countryCode: "PE", emoji: "🇵🇪", continent: "Americas" },
  { name: "Bogotá", timezone: "America/Bogota", country: "Colombia", countryCode: "CO", emoji: "🇨🇴", continent: "Americas" },
  { name: "Santiago", timezone: "America/Santiago", country: "Chile", countryCode: "CL", emoji: "🇨🇱", continent: "Americas" },
  { name: "Caracas", timezone: "America/Caracas", country: "Venezuela", countryCode: "VE", emoji: "🇻🇪", continent: "Americas" },

  // Europe
  { name: "London", timezone: "Europe/London", country: "United Kingdom", countryCode: "GB", emoji: "🇬🇧", continent: "Europe", popular: true },
  { name: "Paris", timezone: "Europe/Paris", country: "France", countryCode: "FR", emoji: "🇫🇷", continent: "Europe", popular: true },
  { name: "Berlin", timezone: "Europe/Berlin", country: "Germany", countryCode: "DE", emoji: "🇩🇪", continent: "Europe", popular: true },
  { name: "Madrid", timezone: "Europe/Madrid", country: "Spain", countryCode: "ES", emoji: "🇪🇸", continent: "Europe" },
  { name: "Rome", timezone: "Europe/Rome", country: "Italy", countryCode: "IT", emoji: "🇮🇹", continent: "Europe" },
  { name: "Amsterdam", timezone: "Europe/Amsterdam", country: "Netherlands", countryCode: "NL", emoji: "🇳🇱", continent: "Europe" },
  { name: "Brussels", timezone: "Europe/Brussels", country: "Belgium", countryCode: "BE", emoji: "🇧🇪", continent: "Europe" },
  { name: "Zurich", timezone: "Europe/Zurich", country: "Switzerland", countryCode: "CH", emoji: "🇨🇭", continent: "Europe" },
  { name: "Stockholm", timezone: "Europe/Stockholm", country: "Sweden", countryCode: "SE", emoji: "🇸🇪", continent: "Europe" },
  { name: "Oslo", timezone: "Europe/Oslo", country: "Norway", countryCode: "NO", emoji: "🇳🇴", continent: "Europe" },
  { name: "Copenhagen", timezone: "Europe/Copenhagen", country: "Denmark", countryCode: "DK", emoji: "🇩🇰", continent: "Europe" },
  { name: "Helsinki", timezone: "Europe/Helsinki", country: "Finland", countryCode: "FI", emoji: "🇫🇮", continent: "Europe" },
  { name: "Warsaw", timezone: "Europe/Warsaw", country: "Poland", countryCode: "PL", emoji: "🇵🇱", continent: "Europe" },
  { name: "Prague", timezone: "Europe/Prague", country: "Czech Republic", countryCode: "CZ", emoji: "🇨🇿", continent: "Europe" },
  { name: "Vienna", timezone: "Europe/Vienna", country: "Austria", countryCode: "AT", emoji: "🇦🇹", continent: "Europe" },
  { name: "Budapest", timezone: "Europe/Budapest", country: "Hungary", countryCode: "HU", emoji: "🇭🇺", continent: "Europe" },
  { name: "Bucharest", timezone: "Europe/Bucharest", country: "Romania", countryCode: "RO", emoji: "🇷🇴", continent: "Europe" },
  { name: "Athens", timezone: "Europe/Athens", country: "Greece", countryCode: "GR", emoji: "🇬🇷", continent: "Europe" },
  { name: "Istanbul", timezone: "Europe/Istanbul", country: "Turkey", countryCode: "TR", emoji: "🇹🇷", continent: "Europe" },
  { name: "Moscow", timezone: "Europe/Moscow", country: "Russia", countryCode: "RU", emoji: "🇷🇺", continent: "Europe" },
  { name: "Kiev", timezone: "Europe/Kiev", country: "Ukraine", countryCode: "UA", emoji: "🇺🇦", continent: "Europe" },
  { name: "Lisbon", timezone: "Europe/Lisbon", country: "Portugal", countryCode: "PT", emoji: "🇵🇹", continent: "Europe" },
  { name: "Dublin", timezone: "Europe/Dublin", country: "Ireland", countryCode: "IE", emoji: "🇮🇪", continent: "Europe" },

  // Middle East & Africa
  { name: "Dubai", timezone: "Asia/Dubai", country: "UAE", countryCode: "AE", emoji: "🇦🇪", continent: "Middle East", popular: true },
  { name: "Riyadh", timezone: "Asia/Riyadh", country: "Saudi Arabia", countryCode: "SA", emoji: "🇸🇦", continent: "Middle East" },
  { name: "Doha", timezone: "Asia/Qatar", country: "Qatar", countryCode: "QA", emoji: "🇶🇦", continent: "Middle East" },
  { name: "Kuwait City", timezone: "Asia/Kuwait", country: "Kuwait", countryCode: "KW", emoji: "🇰🇼", continent: "Middle East" },
  { name: "Muscat", timezone: "Asia/Muscat", country: "Oman", countryCode: "OM", emoji: "🇴🇲", continent: "Middle East" },
  { name: "Bahrain", timezone: "Asia/Bahrain", country: "Bahrain", countryCode: "BH", emoji: "🇧🇭", continent: "Middle East" },
  { name: "Tel Aviv", timezone: "Asia/Jerusalem", country: "Israel", countryCode: "IL", emoji: "🇮🇱", continent: "Middle East" },
  { name: "Beirut", timezone: "Asia/Beirut", country: "Lebanon", countryCode: "LB", emoji: "🇱🇧", continent: "Middle East" },
  { name: "Baghdad", timezone: "Asia/Baghdad", country: "Iraq", countryCode: "IQ", emoji: "🇮🇶", continent: "Middle East" },
  { name: "Amman", timezone: "Asia/Amman", country: "Jordan", countryCode: "JO", emoji: "🇯🇴", continent: "Middle East" },
  { name: "Cairo", timezone: "Africa/Cairo", country: "Egypt", countryCode: "EG", emoji: "🇪🇬", continent: "Africa" },
  { name: "Casablanca", timezone: "Africa/Casablanca", country: "Morocco", countryCode: "MA", emoji: "🇲🇦", continent: "Africa" },
  { name: "Lagos", timezone: "Africa/Lagos", country: "Nigeria", countryCode: "NG", emoji: "🇳🇬", continent: "Africa" },
  { name: "Nairobi", timezone: "Africa/Nairobi", country: "Kenya", countryCode: "KE", emoji: "🇰🇪", continent: "Africa" },
  { name: "Johannesburg", timezone: "Africa/Johannesburg", country: "South Africa", countryCode: "ZA", emoji: "🇿🇦", continent: "Africa" },
  { name: "Accra", timezone: "Africa/Accra", country: "Ghana", countryCode: "GH", emoji: "🇬🇭", continent: "Africa" },
  { name: "Tunis", timezone: "Africa/Tunis", country: "Tunisia", countryCode: "TN", emoji: "🇹🇳", continent: "Africa" },
  { name: "Algiers", timezone: "Africa/Algiers", country: "Algeria", countryCode: "DZ", emoji: "🇩🇿", continent: "Africa" },

  // Asia & Pacific
  { name: "Tokyo", timezone: "Asia/Tokyo", country: "Japan", countryCode: "JP", emoji: "🇯🇵", continent: "Asia", popular: true },
  { name: "Beijing", timezone: "Asia/Shanghai", country: "China", countryCode: "CN", emoji: "🇨🇳", continent: "Asia", popular: true },
  { name: "Shanghai", timezone: "Asia/Shanghai", country: "China", countryCode: "CN", emoji: "🇨🇳", continent: "Asia" },
  { name: "Hong Kong", timezone: "Asia/Hong_Kong", country: "Hong Kong", countryCode: "HK", emoji: "🇭🇰", continent: "Asia", popular: true },
  { name: "Singapore", timezone: "Asia/Singapore", country: "Singapore", countryCode: "SG", emoji: "🇸🇬", continent: "Asia", popular: true },
  { name: "Seoul", timezone: "Asia/Seoul", country: "South Korea", countryCode: "KR", emoji: "🇰🇷", continent: "Asia" },
  { name: "Mumbai", timezone: "Asia/Kolkata", country: "India", countryCode: "IN", emoji: "🇮🇳", continent: "Asia", popular: true },
  { name: "Delhi", timezone: "Asia/Kolkata", country: "India", countryCode: "IN", emoji: "🇮🇳", continent: "Asia" },
  { name: "Bangalore", timezone: "Asia/Kolkata", country: "India", countryCode: "IN", emoji: "🇮🇳", continent: "Asia" },
  { name: "Karachi", timezone: "Asia/Karachi", country: "Pakistan", countryCode: "PK", emoji: "🇵🇰", continent: "Asia" },
  { name: "Dhaka", timezone: "Asia/Dhaka", country: "Bangladesh", countryCode: "BD", emoji: "🇧🇩", continent: "Asia" },
  { name: "Colombo", timezone: "Asia/Colombo", country: "Sri Lanka", countryCode: "LK", emoji: "🇱🇰", continent: "Asia" },
  { name: "Kathmandu", timezone: "Asia/Kathmandu", country: "Nepal", countryCode: "NP", emoji: "🇳🇵", continent: "Asia" },
  { name: "Bangkok", timezone: "Asia/Bangkok", country: "Thailand", countryCode: "TH", emoji: "🇹🇭", continent: "Asia" },
  { name: "Jakarta", timezone: "Asia/Jakarta", country: "Indonesia", countryCode: "ID", emoji: "🇮🇩", continent: "Asia" },
  { name: "Manila", timezone: "Asia/Manila", country: "Philippines", countryCode: "PH", emoji: "🇵🇭", continent: "Asia" },
  { name: "Kuala Lumpur", timezone: "Asia/Kuala_Lumpur", country: "Malaysia", countryCode: "MY", emoji: "🇲🇾", continent: "Asia" },
  { name: "Taipei", timezone: "Asia/Taipei", country: "Taiwan", countryCode: "TW", emoji: "🇹🇼", continent: "Asia" },
  { name: "Ho Chi Minh", timezone: "Asia/Ho_Chi_Minh", country: "Vietnam", countryCode: "VN", emoji: "🇻🇳", continent: "Asia" },
  { name: "Yangon", timezone: "Asia/Yangon", country: "Myanmar", countryCode: "MM", emoji: "🇲🇲", continent: "Asia" },
  { name: "Tashkent", timezone: "Asia/Tashkent", country: "Uzbekistan", countryCode: "UZ", emoji: "🇺🇿", continent: "Asia" },
  { name: "Sydney", timezone: "Australia/Sydney", country: "Australia", countryCode: "AU", emoji: "🇦🇺", continent: "Pacific", popular: true },
  { name: "Melbourne", timezone: "Australia/Melbourne", country: "Australia", countryCode: "AU", emoji: "🇦🇺", continent: "Pacific" },
  { name: "Brisbane", timezone: "Australia/Brisbane", country: "Australia", countryCode: "AU", emoji: "🇦🇺", continent: "Pacific" },
  { name: "Perth", timezone: "Australia/Perth", country: "Australia", countryCode: "AU", emoji: "🇦🇺", continent: "Pacific" },
  { name: "Auckland", timezone: "Pacific/Auckland", country: "New Zealand", countryCode: "NZ", emoji: "🇳🇿", continent: "Pacific" },
];

export function findCity(key: string): City | undefined {
  return CITIES.find((c) => `${c.name}|${c.timezone}` === key);
}

export function cityKey(c: City): string {
  return `${c.name}|${c.timezone}`;
}
