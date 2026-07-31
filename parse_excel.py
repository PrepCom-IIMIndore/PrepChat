import json
import pandas as pd
from pathlib import Path
from company_mapping import get_canonical_name

# Mappings of Excel columns to question types
QUESTION_COLUMNS = {
    "GD Topics & Tips": "GD",
    "Domain Specific Questions": "Domain",
    "Situational/Behavioural Questions": "Behavioural",
    "HR/Current Affairs Questions": "HR/Current Affairs",
    "Technical Skills Assessed": "Technical"
}

def clean_text(text):
    """
    Cleans bullet points and formatting noise from the text.
    """
    if pd.isna(text) or not isinstance(text, str):
        return ""
    cleaned = text.strip()
    # Replace common bullet symbols
    cleaned = re_replace_bullets(cleaned)
    # Remove consecutive newlines
    cleaned = re_replace_newlines(cleaned)
    return cleaned.strip()

def re_replace_bullets(text):
    import re
    # Replace bullets like , •, -, *, etc. at the start of lines with a standard markdown bullet
    text = re.sub(r'^[\t\s•\-\*]+\s*', '- ', text, flags=re.MULTILINE)
    return text

def re_replace_newlines(text):
    import re
    return re.sub(r'\n{3,}', '\n\n', text)

def main():
    excel_path = Path("Source Data files/Consolidated_Interview_Experience_Database.xlsx")
    if not excel_path.exists():
        print(f"Error: {excel_path} not found.")
        return

    # Load company to industry mappings
    company_to_industry = {}
    industry_mapping_path = Path("company_industries.json")
    if industry_mapping_path.exists():
        print("Loading company to industry mappings...")
        with open(industry_mapping_path, "r", encoding="utf-8") as f:
            company_to_industry = json.load(f)
            
    print(f"Loading Excel file: {excel_path.name}...")
    df = pd.read_excel(excel_path, sheet_name="Consolidated")
    print(f"Loaded {len(df)} rows from Excel sheet 'Consolidated'.")
    
    questions = []
    
    for idx, row in df.iterrows():
        raw_company = row.get("Company")
        if pd.isna(raw_company):
            continue
            
        canonical_company = get_canonical_name(str(raw_company))
        if canonical_company == "Unknown":
            continue
            
        # Get industry (from MD TOC mapping, or fallback to Excel Domain, or default to Other)
        industry = company_to_industry.get(canonical_company)
        if not industry:
            raw_domain = row.get("Domain")
            if pd.notna(raw_domain):
                # Clean and take the first domain term as industry
                domain_str = str(raw_domain).split(',')[0].strip()
                industry = domain_str.title()
            else:
                industry = "Other"
                
        domain = str(row.get("Domain", "Other")) if pd.notna(row.get("Domain")) else "Other"
        year = str(row.get("Year", "Unknown")) if pd.notna(row.get("Year")) else "Unknown"
        
        # Scan through each question column
        for col_name, q_type in QUESTION_COLUMNS.items():
            col_val = row.get(col_name)
            cleaned_q = clean_text(col_val)
            if cleaned_q and cleaned_q.lower() != 'na':
                questions.append({
                    "company": canonical_company,
                    "industry": industry,
                    "domain": domain,
                    "year": year,
                    "question": cleaned_q,
                    "question_type": q_type
                })
                
    output_path = Path("questions_data.json")
    print(f"Parsed {len(questions)} normalized questions. Saving to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
        
    print("Excel parsing completed successfully.")

if __name__ == "__main__":
    main()
