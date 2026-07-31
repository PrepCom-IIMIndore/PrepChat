import re

# Canonical name definition
CANONICAL_COMPANIES = {
    "EY": "EY",
    "PwC": "PwC",
    "BCG": "BCG",
    "McKinsey & Company": "McKinsey & Company",
    "Bain & Company": "Bain & Company",
    "Bain Capability Network": "Bain Capability Network",
    "Deloitte": "Deloitte",
    "KPMG": "KPMG",
    "J.P. Morgan": "J.P. Morgan",
    "American Express": "American Express",
    "Goldman Sachs": "Goldman Sachs",
    "Accenture": "Accenture",
    "Wipro": "Wipro",
    "HUL": "HUL",
    "Deutsche Bank": "Deutsche Bank",
    "Cognizant": "Cognizant",
    "ICICI Bank": "ICICI Bank",
    "Walmart": "Walmart",
    "Bank of America": "Bank of America",
    "Cipla": "Cipla",
    "D.E. Shaw": "D.E. Shaw",
    "Credit Suisse": "Credit Suisse",
    "Microsoft": "Microsoft",
    "Axis Bank": "Axis Bank",
    "Kotak Mahindra Bank": "Kotak Mahindra Bank",
    "Tata Steel": "Tata Steel",
    "Salesforce": "Salesforce",
    "L&T": "L&T",
    "CRISIL": "CRISIL",
    "PepsiCo": "PepsiCo",
    "Kearney": "Kearney",
    "HDFC Bank": "HDFC Bank",
    "Everest Group": "Everest Group",
    "Merilytics": "Merilytics",
    "AB InBev": "AB InBev",
    "Synergy Consulting": "Synergy Consulting",
    "Asian Paints": "Asian Paints",
    "Haleon": "Haleon",
    "General Mills": "General Mills",
    "ZS Associates": "ZS Associates",
    "Google": "Google",
    "Flipkart": "Flipkart",
    "Infosys": "Infosys",
    "HCL": "HCL",
    "IBM": "IBM",
    "Capgemini": "Capgemini",
    "Vodafone": "Vodafone",
    "TCS": "TCS",
    "Tata Motors": "Tata Motors",
    "Maruti Suzuki": "Maruti Suzuki",
    "Mahindra": "Mahindra",
    "Airtel": "Airtel",
    "Drishti Soft": "Drishti Soft",
    "Emerson": "Emerson",
    "Evosys Global": "Evosys Global",
    "Grail Research": "Grail Research",
    "ICRA": "ICRA",
    "Phronesis Partners": "Phronesis Partners",
    "Redseer": "Redseer",
    "SKP Consulting": "SKP Consulting",
    "Think Tankers": "Think Tankers",
}

# Regex-based rules for matching variations
# Checked from longest/most specific pattern to shortest
ALIAS_RULES = [
    (r'\bey\b|ernst\s*&\s*young|ernst\s*and\s*young', 'EY'),
    (r'\bpwc\b|pricewaterhousecoopers', 'PwC'),
    (r'\bbcg\b|boston\s*consulting\s*group', 'BCG'),
    (r'\bmckinsey\b', 'McKinsey & Company'),
    (r'\bbain\s*&\s*company|\bbain\s*and\s*company\b', 'Bain & Company'),
    (r'\bbcn\b|bain\s*capability\s*network', 'Bain Capability Network'),
    (r'\bdeloitte\b', 'Deloitte'),
    (r'\bkpmg\b', 'KPMG'),
    (r'\bjpmc\b|jp\s*morgan|j\.p\.\s*morgan', 'J.P. Morgan'),
    (r'\bamerican\s*express|\bamex\b', 'American Express'),
    (r'\bgoldman\s*sachs|\bgoldman\b', 'Goldman Sachs'),
    (r'\baccenture\b', 'Accenture'),
    (r'\bwipro\b', 'Wipro'),
    (r'\bhul\b|hindustan\s*unilever', 'HUL'),
    (r'\bdeutsche\s*bank\b', 'Deutsche Bank'),
    (r'\bcognizant\b|cts\b', 'Cognizant'),
    (r'\bicici\b', 'ICICI Bank'),
    (r'\bwalmart\b', 'Walmart'),
    (r'\bbank\s*of\s*america\b', 'Bank of America'),
    (r'\bcipla\b', 'Cipla'),
    (r'\bde\s*shaw\b|d\.\s*e\.\s*shaw\b', 'D.E. Shaw'),
    (r'\bcredit\s*suisse\b', 'Credit Suisse'),
    (r'\bmicrosoft\b', 'Microsoft'),
    (r'\baxis\b', 'Axis Bank'),
    (r'\bkotak\b', 'Kotak Mahindra Bank'),
    (r'\btata\s*steel\b', 'Tata Steel'),
    (r'\bsalesforce\b', 'Salesforce'),
    (r'\bl\s*&\s*t\b|larsen\s*&\s*toubro|larsen\s*and\s*toubro', 'L&T'),
    (r'\bcrisil\b', 'CRISIL'),
    (r'\bpepsico\b|pepsi\b', 'PepsiCo'),
    (r'\bkearney\b', 'Kearney'),
    (r'\bhdfc\b', 'HDFC Bank'),
    (r'\beverest\b', 'Everest Group'),
    (r'\bmerilytics\b', 'Merilytics'),
    (r'\bab\s*inbev\b|abinbev\b', 'AB InBev'),
    (r'\bsynergy\s*consulting\b', 'Synergy Consulting'),
    (r'\basian\s*paints\b', 'Asian Paints'),
    (r'\bhaleon\b', 'Haleon'),
    (r'\bgeneral\s*mills\b', 'General Mills'),
    (r'\bzs\b|zs\s*associates\b', 'ZS Associates'),
    (r'\bgoogle\b', 'Google'),
    (r'\bamazon\b', 'Amazon'),
    (r'\bflipkart\b', 'Flipkart'),
    (r'\binfosys\b', 'Infosys'),
    (r'\bhcl\b', 'HCL'),
    (r'\bibm\b', 'IBM'),
    (r'\bcapgemini\b', 'Capgemini'),
    (r'\bvodafone\b', 'Vodafone'),
    (r'\btcs\b|tata\s*consultancy\s*services\b', 'TCS'),
    (r'\btata\s*motors\b', 'Tata Motors'),
    (r'\bmaruti\b', 'Maruti Suzuki'),
    (r'\bmahindra\b', 'Mahindra'),
    (r'\bairtel\b|bharti\s*airtel\b', 'Airtel'),
    (r'\bdrishti\b', 'Drishti Soft'),
    (r'\bemerson\b', 'Emerson'),
    (r'\bevosys\b', 'Evosys Global'),
    (r'\bgrail\b', 'Grail Research'),
    (r'\bicra\b', 'ICRA'),
    (r'\bphronesis\b', 'Phronesis Partners'),
    (r'\bredseer\b', 'Redseer'),
    (r'\bskp\b', 'SKP Consulting'),
    (r'\bthink\s*tankers\b', 'Think Tankers'),
]

# Suffixes and noise words to strip for generic normalization fallback
CLEAN_SUFFIXES = [
    r'\s+india\b', r'\s+us\b', r'\s+group\b', r'\s+advisory\b', r'\s+consulting\b',
    r'\s+limited\b', r'\s+ltd\b', r'\s+inc\b', r'\s+pvt\b', r'\s+private\b',
    r'\s+global\b', r'\s+technologies\b', r'\s+services\b', r'\s+business\b',
    r'\s+solutions\b', r'\s+operations\b', r'\s+strategy\b', r'\s+technology\b'
]

def get_canonical_name(company_name: str) -> str:
    """
    Normalizes a company name and maps it to a canonical representation.
    If no pre-defined mapping is found, it cleans up noise words and returns Title Case.
    """
    if not company_name or not isinstance(company_name, str):
        return "Unknown"
        
    cleaned = company_name.strip()
    if not cleaned or cleaned.lower() == 'na':
        return "Unknown"
        
    # Remove surrounding double/single quotes or brackets
    cleaned = re.sub(r'^[\'"\[\(]+|[\'"\]\)]+$', '', cleaned).strip()
    
    # 1. Check explicit regular expression rules
    lower_name = cleaned.lower()
    for pattern, canonical in ALIAS_RULES:
        if re.search(pattern, lower_name):
            return canonical
            
    # 2. General fallback normalization
    temp = cleaned
    for suffix_pattern in CLEAN_SUFFIXES:
        temp = re.sub(suffix_pattern, '', temp, flags=re.IGNORECASE)
        
    # Strip any remaining punctuation and redundant spaces
    temp = re.sub(r'[^\w\s&]', ' ', temp)
    temp = re.sub(r'\s+', ' ', temp).strip()
    
    if temp:
        # Check if the cleaned version matches any rule again
        lower_temp = temp.lower()
        for pattern, canonical in ALIAS_RULES:
            if re.search(pattern, lower_temp):
                return canonical
        return temp.title()
        
    return cleaned.title()
