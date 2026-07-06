export interface CanonicalClassification {
  sector: string; // The 11 GICS sectors or "Other"
  industry: string; // Specific industry or fallback to Sector
  country: string; // Normalized country name
  countryCode: string; // ISO-2 country code
  region: string; // Global region (e.g., North America, Asia, Europe)
  exchange: string; // Exchange Name
  exchangeCode: string; // Exchange Code / Suffix
}

// Global memoization cache to avoid redundant regex/normalization for the same asset
const normalizationCache: Record<string, CanonicalClassification> = {};

// GICS Sectors
const GICS = {
  IT: "Information Technology",
  FINANCIALS: "Financials",
  HEALTH_CARE: "Health Care",
  CONSUMER_DISCRETIONARY: "Consumer Discretionary",
  CONSUMER_STAPLES: "Consumer Staples",
  COMMUNICATION_SERVICES: "Communication Services",
  INDUSTRIALS: "Industrials",
  ENERGY: "Energy",
  UTILITIES: "Utilities",
  MATERIALS: "Materials",
  REAL_ESTATE: "Real Estate",
  OTHER: "Other"
};

// Industry normalization rules using Regex
// Exhaustive list based on CompaniesMarketCap categories
const SECTOR_RULES = [
  // IT / Tech
  { regex: /semiconductor|chip|foundry/i, sector: GICS.IT, industry: "Semiconductors" },
  { regex: /software|saas|cloud/i, sector: GICS.IT, industry: "Software" },
  { regex: /hardware|computer|equipment|consumer electronics/i, sector: GICS.IT, industry: "Hardware" },
  { regex: /it services|consulting/i, sector: GICS.IT, industry: "IT Services" },
  { regex: /tech|it|information technology/i, sector: GICS.IT, industry: "Technology" },
  
  // Financials
  { regex: /bank/i, sector: GICS.FINANCIALS, industry: "Banks" },
  { regex: /insurance|life/i, sector: GICS.FINANCIALS, industry: "Insurance" },
  { regex: /broker|capital|asset|investment|private equity/i, sector: GICS.FINANCIALS, industry: "Financial Services" },
  { regex: /credit|payment/i, sector: GICS.FINANCIALS, industry: "Credit Services" },
  { regex: /financ/i, sector: GICS.FINANCIALS, industry: "Financials" },
  
  // Health Care
  { regex: /pharma/i, sector: GICS.HEALTH_CARE, industry: "Pharmaceuticals" },
  { regex: /bio/i, sector: GICS.HEALTH_CARE, industry: "Biotechnology" },
  { regex: /medical device|equipment/i, sector: GICS.HEALTH_CARE, industry: "Medical Devices" },
  { regex: /healthcare|medical|health/i, sector: GICS.HEALTH_CARE, industry: "Healthcare" },
  
  // Consumer Discretionary
  { regex: /auto|car|vehicle/i, sector: GICS.CONSUMER_DISCRETIONARY, industry: "Automakers" },
  { regex: /retail/i, sector: GICS.CONSUMER_DISCRETIONARY, industry: "Retail" },
  { regex: /e-commerce|ecommerce|internet retail/i, sector: GICS.CONSUMER_DISCRETIONARY, industry: "E-Commerce" },
  { regex: /apparel|clothing|shoe/i, sector: GICS.CONSUMER_DISCRETIONARY, industry: "Apparel & Accessories" },
  { regex: /luxury/i, sector: GICS.CONSUMER_DISCRETIONARY, industry: "Luxury Goods" },
  { regex: /leisure|hotel|restaurant|travel|casino/i, sector: GICS.CONSUMER_DISCRETIONARY, industry: "Travel & Leisure" },
  { regex: /discretionary/i, sector: GICS.CONSUMER_DISCRETIONARY, industry: "Consumer Discretionary" },
  
  // Consumer Staples
  { regex: /food/i, sector: GICS.CONSUMER_STAPLES, industry: "Food" },
  { regex: /beverage|drink/i, sector: GICS.CONSUMER_STAPLES, industry: "Beverages" },
  { regex: /tobacco/i, sector: GICS.CONSUMER_STAPLES, industry: "Tobacco" },
  { regex: /household|personal care|staples/i, sector: GICS.CONSUMER_STAPLES, industry: "Consumer Staples" },
  
  // Communication Services
  { regex: /telecom/i, sector: GICS.COMMUNICATION_SERVICES, industry: "Telecommunications" },
  { regex: /media|entertainment|broadcasting|movie/i, sector: GICS.COMMUNICATION_SERVICES, industry: "Media & Entertainment" },
  { regex: /internet|social media|search/i, sector: GICS.COMMUNICATION_SERVICES, industry: "Internet Services" },
  { regex: /communication/i, sector: GICS.COMMUNICATION_SERVICES, industry: "Communication Services" },
  
  // Industrials
  { regex: /aerospace|defense/i, sector: GICS.INDUSTRIALS, industry: "Aerospace & Defense" },
  { regex: /airline/i, sector: GICS.INDUSTRIALS, industry: "Airlines" },
  { regex: /machinery|manufacturing|equipment/i, sector: GICS.INDUSTRIALS, industry: "Machinery" },
  { regex: /transport|logistics|shipping|freight/i, sector: GICS.INDUSTRIALS, industry: "Transportation" },
  { regex: /construction|building/i, sector: GICS.INDUSTRIALS, industry: "Construction" },
  { regex: /industrial/i, sector: GICS.INDUSTRIALS, industry: "Industrials" },
  
  // Energy
  { regex: /oil|gas/i, sector: GICS.ENERGY, industry: "Oil & Gas" },
  { regex: /coal/i, sector: GICS.ENERGY, industry: "Coal" },
  { regex: /renewable|solar|wind/i, sector: GICS.ENERGY, industry: "Renewable Energy" },
  { regex: /energy/i, sector: GICS.ENERGY, industry: "Energy" },
  
  // Utilities
  { regex: /electric/i, sector: GICS.UTILITIES, industry: "Electric Utilities" },
  { regex: /water/i, sector: GICS.UTILITIES, industry: "Water Utilities" },
  { regex: /utility|utilities|power/i, sector: GICS.UTILITIES, industry: "Utilities" },
  
  // Materials
  { regex: /mining|metal/i, sector: GICS.MATERIALS, industry: "Mining" },
  { regex: /gold/i, sector: GICS.MATERIALS, industry: "Gold" },
  { regex: /silver/i, sector: GICS.MATERIALS, industry: "Silver" },
  { regex: /chemical/i, sector: GICS.MATERIALS, industry: "Chemicals" },
  { regex: /steel|iron/i, sector: GICS.MATERIALS, industry: "Steel" },
  { regex: /material/i, sector: GICS.MATERIALS, industry: "Materials" },
  
  // Real Estate
  { regex: /reit/i, sector: GICS.REAL_ESTATE, industry: "REITs" },
  { regex: /real estate|property/i, sector: GICS.REAL_ESTATE, industry: "Real Estate" }
];

// Explicit symbol overrides when metadata is completely missing or wrong
const SYMBOL_SECTOR_OVERRIDES: Record<string, { sector: string; industry: string }> = {
  "NVDA": { sector: GICS.IT, industry: "Semiconductors" },
  "AAPL": { sector: GICS.IT, industry: "Consumer Electronics" },
  "MSFT": { sector: GICS.IT, industry: "Software" },
  "TSLA": { sector: GICS.CONSUMER_DISCRETIONARY, industry: "Automakers" },
  "JPM": { sector: GICS.FINANCIALS, industry: "Banks" },
  "XOM": { sector: GICS.ENERGY, industry: "Oil & Gas" },
  "JNJ": { sector: GICS.HEALTH_CARE, industry: "Pharmaceuticals" },
  "WMT": { sector: GICS.CONSUMER_STAPLES, industry: "Retail" },
  "SPCX": { sector: GICS.INDUSTRIALS, industry: "Aerospace & Defense" },
  
  // Custom user symbols
  "TSM": { sector: GICS.IT, industry: "Semiconductors" },
  "MU": { sector: GICS.IT, industry: "Semiconductors" },
  "000660.KS": { sector: GICS.IT, industry: "Semiconductors" },
  "LLY": { sector: GICS.HEALTH_CARE, industry: "Pharmaceuticals" },
  "AMD": { sector: GICS.IT, industry: "Semiconductors" },
  "ASML.AS": { sector: GICS.IT, industry: "Semiconductors" },
  "AMAT": { sector: GICS.IT, industry: "Semiconductors" },
  "LRCX": { sector: GICS.IT, industry: "Semiconductors" },
  "CAT": { sector: GICS.INDUSTRIALS, industry: "Machinery" },
  "AMZN": { sector: GICS.CONSUMER_DISCRETIONARY, industry: "E-Commerce" },
  "AVGO": { sector: GICS.IT, industry: "Semiconductors" },
  "KLAC": { sector: GICS.IT, industry: "Semiconductors" },
  "PLTR": { sector: GICS.IT, industry: "Software" },
  "MRVL": { sector: GICS.IT, industry: "Semiconductors" },
  "2454.TW": { sector: GICS.IT, industry: "Semiconductors" },
  "CRWD": { sector: GICS.IT, industry: "Software" },
  "SANTA": { sector: GICS.FINANCIALS, industry: "Banks" },
  "005930.KS": { sector: GICS.IT, industry: "Hardware" },
  "ARM": { sector: GICS.IT, industry: "Semiconductors" },
  "SNDK": { sector: GICS.IT, industry: "Hardware" },
  "PANW": { sector: GICS.IT, industry: "Software" },
  "0700.HK": { sector: GICS.COMMUNICATION_SERVICES, industry: "Internet Services" },
  "GOOG": { sector: GICS.COMMUNICATION_SERVICES, industry: "Internet Services" },
  "ADI": { sector: GICS.IT, industry: "Semiconductors" },
  "MUFG": { sector: GICS.FINANCIALS, industry: "Banks" },
  "9984.T": { sector: GICS.FINANCIALS, industry: "Financial Services" },
  "SMFG": { sector: GICS.FINANCIALS, industry: "Banks" },
  "6981.T": { sector: GICS.IT, industry: "Hardware" },
  "6857.T": { sector: GICS.IT, industry: "Semiconductors" },
  "9983.T": { sector: GICS.CONSUMER_DISCRETIONARY, industry: "Apparel & Accessories" },
  "BAC": { sector: GICS.FINANCIALS, industry: "Banks" }
};

const SYMBOL_COUNTRY_OVERRIDES: Record<string, { country: string; countryCode: string; region: string }> = {
  "MSFT": { country: "United States", countryCode: "US", region: "North America" },
  "TSM": { country: "Taiwan", countryCode: "TW", region: "Asia Pacific" },
  "TSLA": { country: "United States", countryCode: "US", region: "North America" },
  "MU": { country: "United States", countryCode: "US", region: "North America" },
  "000660.KS": { country: "South Korea", countryCode: "KR", region: "Asia Pacific" },
  "LLY": { country: "United States", countryCode: "US", region: "North America" },
  "AMD": { country: "United States", countryCode: "US", region: "North America" },
  "ASML.AS": { country: "Netherlands", countryCode: "NL", region: "Europe" },
  "AMAT": { country: "United States", countryCode: "US", region: "North America" },
  "LRCX": { country: "United States", countryCode: "US", region: "North America" },
  "CAT": { country: "United States", countryCode: "US", region: "North America" },
  "NVDA": { country: "United States", countryCode: "US", region: "North America" },
  "AMZN": { country: "United States", countryCode: "US", region: "North America" },
  "AVGO": { country: "United States", countryCode: "US", region: "North America" },
  "KLAC": { country: "United States", countryCode: "US", region: "North America" },
  "PLTR": { country: "United States", countryCode: "US", region: "North America" },
  "MRVL": { country: "United States", countryCode: "US", region: "North America" },
  "2454.TW": { country: "Taiwan", countryCode: "TW", region: "Asia Pacific" },
  "CRWD": { country: "United States", countryCode: "US", region: "North America" },
  "JPM": { country: "United States", countryCode: "US", region: "North America" },
  "SANTA": { country: "Spain", countryCode: "ES", region: "Europe" },
  "SPCX": { country: "United States", countryCode: "US", region: "North America" },
  "005930.KS": { country: "South Korea", countryCode: "KR", region: "Asia Pacific" },
  "ARM": { country: "United Kingdom", countryCode: "GB", region: "Europe" },
  "SNDK": { country: "United States", countryCode: "US", region: "North America" },
  "PANW": { country: "United States", countryCode: "US", region: "North America" },
  "0700.HK": { country: "China", countryCode: "CN", region: "Asia Pacific" },
  "AAPL": { country: "United States", countryCode: "US", region: "North America" },
  "GOOG": { country: "United States", countryCode: "US", region: "North America" },
  "ADI": { country: "United States", countryCode: "US", region: "North America" },
  "MUFG": { country: "Japan", countryCode: "JP", region: "Asia Pacific" },
  "9984.T": { country: "Japan", countryCode: "JP", region: "Asia Pacific" },
  "SMFG": { country: "Japan", countryCode: "JP", region: "Asia Pacific" },
  "6981.T": { country: "Japan", countryCode: "JP", region: "Asia Pacific" },
  "6857.T": { country: "Japan", countryCode: "JP", region: "Asia Pacific" },
  "9983.T": { country: "Japan", countryCode: "JP", region: "Asia Pacific" },
  "BAC": { country: "United States", countryCode: "US", region: "North America" }
};

// Country normalization
const COUNTRY_MAP: Record<string, { name: string; code: string; region: string }> = {
  // Americas
  US: { name: "United States", code: "US", region: "North America" },
  USA: { name: "United States", code: "US", region: "North America" },
  "UNITED STATES": { name: "United States", code: "US", region: "North America" },
  "UNITED STATES OF AMERICA": { name: "United States", code: "US", region: "North America" },
  CA: { name: "Canada", code: "CA", region: "North America" },
  CANADA: { name: "Canada", code: "CA", region: "North America" },
  MX: { name: "Mexico", code: "MX", region: "Latin America" },
  MEXICO: { name: "Mexico", code: "MX", region: "Latin America" },
  BR: { name: "Brazil", code: "BR", region: "Latin America" },
  BRAZIL: { name: "Brazil", code: "BR", region: "Latin America" },
  AR: { name: "Argentina", code: "AR", region: "Latin America" },
  ARGENTINA: { name: "Argentina", code: "AR", region: "Latin America" },
  CL: { name: "Chile", code: "CL", region: "Latin America" },
  CHILE: { name: "Chile", code: "CL", region: "Latin America" },

  // Europe
  UK: { name: "United Kingdom", code: "GB", region: "Europe" },
  "UNITED KINGDOM": { name: "United Kingdom", code: "GB", region: "Europe" },
  GB: { name: "United Kingdom", code: "GB", region: "Europe" },
  DE: { name: "Germany", code: "DE", region: "Europe" },
  GERMANY: { name: "Germany", code: "DE", region: "Europe" },
  FR: { name: "France", code: "FR", region: "Europe" },
  FRANCE: { name: "France", code: "FR", region: "Europe" },
  CH: { name: "Switzerland", code: "CH", region: "Europe" },
  SWITZERLAND: { name: "Switzerland", code: "CH", region: "Europe" },
  IT: { name: "Italy", code: "IT", region: "Europe" },
  ITALY: { name: "Italy", code: "IT", region: "Europe" },
  ES: { name: "Spain", code: "ES", region: "Europe" },
  SPAIN: { name: "Spain", code: "ES", region: "Europe" },
  NL: { name: "Netherlands", code: "NL", region: "Europe" },
  NETHERLANDS: { name: "Netherlands", code: "NL", region: "Europe" },
  SE: { name: "Sweden", code: "SE", region: "Europe" },
  SWEDEN: { name: "Sweden", code: "SE", region: "Europe" },
  NO: { name: "Norway", code: "NO", region: "Europe" },
  NORWAY: { name: "Norway", code: "NO", region: "Europe" },
  DK: { name: "Denmark", code: "DK", region: "Europe" },
  DENMARK: { name: "Denmark", code: "DK", region: "Europe" },
  FI: { name: "Finland", code: "FI", region: "Europe" },
  FINLAND: { name: "Finland", code: "FI", region: "Europe" },
  BE: { name: "Belgium", code: "BE", region: "Europe" },
  BELGIUM: { name: "Belgium", code: "BE", region: "Europe" },
  IE: { name: "Ireland", code: "IE", region: "Europe" },
  IRELAND: { name: "Ireland", code: "IE", region: "Europe" },
  AT: { name: "Austria", code: "AT", region: "Europe" },
  AUSTRIA: { name: "Austria", code: "AT", region: "Europe" },
  PL: { name: "Poland", code: "PL", region: "Europe" },
  POLAND: { name: "Poland", code: "PL", region: "Europe" },
  PT: { name: "Portugal", code: "PT", region: "Europe" },
  PORTUGAL: { name: "Portugal", code: "PT", region: "Europe" },

  // Asia Pacific
  CN: { name: "China", code: "CN", region: "Asia Pacific" },
  CHINA: { name: "China", code: "CN", region: "Asia Pacific" },
  JP: { name: "Japan", code: "JP", region: "Asia Pacific" },
  JAPAN: { name: "Japan", code: "JP", region: "Asia Pacific" },
  HK: { name: "Hong Kong", code: "HK", region: "Asia Pacific" },
  "HONG KONG": { name: "Hong Kong", code: "HK", region: "Asia Pacific" },
  TW: { name: "Taiwan", code: "TW", region: "Asia Pacific" },
  TAIWAN: { name: "Taiwan", code: "TW", region: "Asia Pacific" },
  KR: { name: "South Korea", code: "KR", region: "Asia Pacific" },
  "SOUTH KOREA": { name: "South Korea", code: "KR", region: "Asia Pacific" },
  KOREA: { name: "South Korea", code: "KR", region: "Asia Pacific" },
  IN: { name: "India", code: "IN", region: "Asia Pacific" },
  INDIA: { name: "India", code: "IN", region: "Asia Pacific" },
  SG: { name: "Singapore", code: "SG", region: "Asia Pacific" },
  SINGAPORE: { name: "Singapore", code: "SG", region: "Asia Pacific" },
  MY: { name: "Malaysia", code: "MY", region: "Asia Pacific" },
  MALAYSIA: { name: "Malaysia", code: "MY", region: "Asia Pacific" },
  TH: { name: "Thailand", code: "TH", region: "Asia Pacific" },
  THAILAND: { name: "Thailand", code: "TH", region: "Asia Pacific" },
  ID: { name: "Indonesia", code: "ID", region: "Asia Pacific" },
  INDONESIA: { name: "Indonesia", code: "ID", region: "Asia Pacific" },
  PH: { name: "Philippines", code: "PH", region: "Asia Pacific" },
  PHILIPPINES: { name: "Philippines", code: "PH", region: "Asia Pacific" },
  VN: { name: "Vietnam", code: "VN", region: "Asia Pacific" },
  VIETNAM: { name: "Vietnam", code: "VN", region: "Asia Pacific" },
  AU: { name: "Australia", code: "AU", region: "Asia Pacific" },
  AUSTRALIA: { name: "Australia", code: "AU", region: "Asia Pacific" },
  NZ: { name: "New Zealand", code: "NZ", region: "Asia Pacific" },
  "NEW ZEALAND": { name: "New Zealand", code: "NZ", region: "Asia Pacific" },

  // Middle East & Africa
  AE: { name: "United Arab Emirates", code: "AE", region: "Middle East" },
  UAE: { name: "United Arab Emirates", code: "AE", region: "Middle East" },
  SA: { name: "Saudi Arabia", code: "SA", region: "Middle East" },
  "SAUDI ARABIA": { name: "Saudi Arabia", code: "SA", region: "Middle East" },
  IL: { name: "Israel", code: "IL", region: "Middle East" },
  ISRAEL: { name: "Israel", code: "IL", region: "Middle East" },
  ZA: { name: "South Africa", code: "ZA", region: "Africa" },
  "SOUTH AFRICA": { name: "South Africa", code: "ZA", region: "Africa" }
};

export const ALL_INDUSTRIES = Array.from(new Set(SECTOR_RULES.map(r => r.industry))).sort();
export const ALL_COUNTRIES = Array.from(new Set(Object.values(COUNTRY_MAP).map(c => c.name))).sort();

function inferExchangeFromSymbol(symbol: string, countryCode: string): { exchange: string; exchangeCode: string } {
  if (symbol.endsWith(".VN") || countryCode === "VN") return { exchange: "Vietnam Exchanges", exchangeCode: "VN" };
  if (symbol.endsWith(".KS")) return { exchange: "Korea Exchange", exchangeCode: "KRX" };
  if (symbol.endsWith(".T")) return { exchange: "Tokyo Stock Exchange", exchangeCode: "TSE" };
  if (symbol.endsWith(".HK")) return { exchange: "Hong Kong Stock Exchange", exchangeCode: "HKEX" };
  if (symbol.endsWith(".L")) return { exchange: "London Stock Exchange", exchangeCode: "LSE" };
  if (symbol.endsWith(".DE")) return { exchange: "Xetra", exchangeCode: "XETRA" };
  if (symbol.endsWith(".PA")) return { exchange: "Euronext Paris", exchangeCode: "EPA" };
  if (symbol.endsWith(".TO")) return { exchange: "Toronto Stock Exchange", exchangeCode: "TSX" };
  
  if (countryCode === "US") return { exchange: "US Exchanges", exchangeCode: "US" };
  if (countryCode === "CN") return { exchange: "Shanghai/Shenzhen", exchangeCode: "CN" };
  
  return { exchange: "Unknown Exchange", exchangeCode: "UNK" };
}

export function normalizeClassification(
  symbol: string,
  rawSector?: string,
  rawIndustry?: string,
  rawCountry?: string
): CanonicalClassification {
  const cacheKey = `${symbol}|${rawSector}|${rawIndustry}|${rawCountry}`;
  if (normalizationCache[cacheKey]) {
    return normalizationCache[cacheKey];
  }

  const cleanSymbol = (symbol || "").toUpperCase().trim();
  const baseSymbol = cleanSymbol.split(".")[0];
  const cleanSector = (rawSector || "").trim();
  const cleanIndustry = (rawIndustry || cleanSector).trim();
  const cleanCountry = (rawCountry || "").toUpperCase().trim();

  // 1. Determine Sector & Industry
  let sector = GICS.OTHER;
  let industry = cleanIndustry || "Unspecified";

  // Check explicit overrides first
  if (SYMBOL_SECTOR_OVERRIDES[cleanSymbol]) {
    sector = SYMBOL_SECTOR_OVERRIDES[cleanSymbol].sector;
    industry = SYMBOL_SECTOR_OVERRIDES[cleanSymbol].industry;
  } else if (SYMBOL_SECTOR_OVERRIDES[baseSymbol]) {
    sector = SYMBOL_SECTOR_OVERRIDES[baseSymbol].sector;
    industry = SYMBOL_SECTOR_OVERRIDES[baseSymbol].industry;
  } else if (cleanSector || cleanIndustry) {
    // Regex matching on the raw sector
    const matchedRule = SECTOR_RULES.find(rule => rule.regex.test(cleanSector) || rule.regex.test(cleanIndustry));
    if (matchedRule) {
      sector = matchedRule.sector;
      // If the provided industry is very broad or unspecified, use the matched specific industry
      if (industry === "Unspecified" || industry.toLowerCase() === sector.toLowerCase() || industry.toLowerCase() === cleanSector.toLowerCase()) {
         industry = matchedRule.industry;
      }
    }
  }

  // 2. Determine Country & Region
  let country = "Other";
  let countryCode = "UNK";
  let region = "Global";

  const cleanCountryUpper = cleanCountry.toUpperCase().trim();
  const hasNoCountry = !cleanCountryUpper || cleanCountryUpper === "OTHER";

  if (SYMBOL_COUNTRY_OVERRIDES[cleanSymbol]) {
    country = SYMBOL_COUNTRY_OVERRIDES[cleanSymbol].country;
    countryCode = SYMBOL_COUNTRY_OVERRIDES[cleanSymbol].countryCode;
    region = SYMBOL_COUNTRY_OVERRIDES[cleanSymbol].region;
  } else if (SYMBOL_COUNTRY_OVERRIDES[baseSymbol]) {
    country = SYMBOL_COUNTRY_OVERRIDES[baseSymbol].country;
    countryCode = SYMBOL_COUNTRY_OVERRIDES[baseSymbol].countryCode;
    region = SYMBOL_COUNTRY_OVERRIDES[baseSymbol].region;
  } else if (COUNTRY_MAP[cleanCountryUpper]) {
    country = COUNTRY_MAP[cleanCountryUpper].name;
    countryCode = COUNTRY_MAP[cleanCountryUpper].code;
    region = COUNTRY_MAP[cleanCountryUpper].region;
  } else if (cleanSymbol.endsWith(".VN")) {
    country = "Vietnam";
    countryCode = "VN";
    region = "Asia Pacific";
  }

  if (countryCode === "UNK") {
    // Attempt parsing suffix for country
    if (cleanSymbol.endsWith(".US")) { country = "United States"; countryCode = "US"; region = "North America"; }
    else if (cleanSymbol.endsWith(".KS")) { country = "South Korea"; countryCode = "KR"; region = "Asia Pacific"; }
    else if (cleanSymbol.endsWith(".SS") || cleanSymbol.endsWith(".SZ")) { country = "China"; countryCode = "CN"; region = "Asia Pacific"; }
    else if (cleanSymbol.endsWith(".T")) { country = "Japan"; countryCode = "JP"; region = "Asia Pacific"; }
    else if (cleanSymbol.endsWith(".L")) { country = "United Kingdom"; countryCode = "GB"; region = "Europe"; }
    else if (cleanSymbol.endsWith(".TO")) { country = "Canada"; countryCode = "CA"; region = "North America"; }
    else if (cleanSymbol.endsWith(".DE")) { country = "Germany"; countryCode = "DE"; region = "Europe"; }
    else if (cleanSymbol.endsWith(".PA")) { country = "France"; countryCode = "FR"; region = "Europe"; }
    else if (cleanSymbol.endsWith(".MI")) { country = "Italy"; countryCode = "IT"; region = "Europe"; }
    else if (cleanSymbol.endsWith(".AS")) { country = "Netherlands"; countryCode = "NL"; region = "Europe"; }
    else if (cleanSymbol.endsWith(".MC")) { country = "Spain"; countryCode = "ES"; region = "Europe"; }
    else if (cleanSymbol.endsWith(".AX")) { country = "Australia"; countryCode = "AU"; region = "Asia Pacific"; }
    else if (cleanSymbol.endsWith(".TW")) { country = "Taiwan"; countryCode = "TW"; region = "Asia Pacific"; }
    else if (cleanSymbol.endsWith(".HK")) { country = "China"; countryCode = "CN"; region = "Asia Pacific"; }
  }

  // Default to US if completely unknown and it's a standard short ticker (optional heuristic)
  if (countryCode === "UNK" && /^[A-Z]{1,5}$/.test(cleanSymbol) && hasNoCountry && !cleanSymbol.includes(".")) {
     country = "United States";
     countryCode = "US";
     region = "North America";
  }

  // 3. Determine Exchange
  const { exchange, exchangeCode } = inferExchangeFromSymbol(cleanSymbol, countryCode);

  const result: CanonicalClassification = {
    sector,
    industry,
    country,
    countryCode,
    region,
    exchange,
    exchangeCode
  };

  normalizationCache[cacheKey] = result;
  return result;
}
