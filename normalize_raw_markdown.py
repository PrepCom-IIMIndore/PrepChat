import re
import json
from pathlib import Path
from company_mapping import get_canonical_name

def parse_index_for_industries(pages):
    """
    Parses the table of contents pages (index 1 to 9) to build a mapping from
    canonical company name to its industry sector.
    """
    company_to_industry = {}
    current_industry = "Other"
    
    # Common industry headers in the index
    industry_headers = ["CONSULTING", "FINANCE", "OPERATIONS", "MARKETING", "GENERAL MANAGEMENT", "HR", "SYSTEMS", "IT/PRODUCT", "IT", "PRODUCT"]
    
    for idx, page in enumerate(pages[1:10], 1):
        # Look in the full text of the index block
        lines = page.splitlines()
        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
                
            # Check for industry header
            upper_line = line_str.upper()
            matched_header = False
            for header in industry_headers:
                if header in upper_line and len(line_str) < 30:
                    current_industry = header.title()
                    matched_header = True
                    break
            
            if matched_header:
                continue
                
            # Check for company entry in index (typically ends with dots and page number)
            # E.g. "Cognizant Business Consulting   ................................   12"
            # Or table row "| Cognizant Business Consulting | ... | 12 |"
            if "..." in line_str or " . ." in line_str or "|" in line_str:
                # Clean line to extract company name
                # If table row
                if line_str.startswith("|"):
                    parts = [p.strip() for p in line_str.split("|") if p.strip()]
                    if parts and not parts[0].startswith("---") and not "Consolidated" in parts[0]:
                        name = parts[0]
                        # Remove dots if any
                        name = re.sub(r'\.+\s*$', '', name).strip()
                        if name and name.lower() != 'na' and not name.lower().startswith('company'):
                            canonical = get_canonical_name(name)
                            if canonical != "Unknown":
                                company_to_industry[canonical] = current_industry
                else:
                    # Non-table line
                    # Match name up to dots
                    m = re.match(r'^([^\.]+?)(?:\.|\s\.)+\s*\d+$', line_str)
                    if m:
                        name = m.group(1).strip()
                        canonical = get_canonical_name(name)
                        if canonical != "Unknown":
                            company_to_industry[canonical] = current_industry
                            
    return company_to_industry

def clean_page_content(text):
    """
    Removes repetitive headers, footers, and markers from page text.
    """
    cleaned_lines = []
    lines = text.splitlines()
    for line in lines:
        line_str = line.strip()
        # Remove empty lines
        if not line_str:
            cleaned_lines.append("")
            continue
            
        # Ignore page header/footer pattern matches
        if "Placemen t Preparation" in line_str or "Placement Preparation" in line_str or "PrepCom Material" in line_str:
            continue
        if "Consolidated interview experiences" in line_str:
            continue
        if "Confidential" in line_str and "Page" in line_str:
            continue
        if line_str.startswith("### Extracted Data Table"):
            continue
        if line_str.startswith("### Full Text:"):
            continue
        if line_str == "```text" or line_str == "```":
            continue
            
        cleaned_lines.append(line)
        
    return "\n".join(cleaned_lines).strip()

def main():
    raw_md_path = Path("Source Data files/Final Interview Experience - 2013-2016.md")
    if not raw_md_path.exists():
        print(f"Error: {raw_md_path} not found.")
        return

    print("Reading raw markdown file...")
    with open(raw_md_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    pages = re.split(r'## Page \d+', content)
    print(f"Total pages parsed: {len(pages) - 1}")
    
    # 1. Parse index for industry mapping
    print("Parsing index pages for industry categories...")
    company_to_industry = parse_index_for_industries(pages)
    print(f"Mapped {len(company_to_industry)} companies to industries in index.")
    
    # Write company-to-industry mapping to JSON for parse_excel.py
    with open("company_industries.json", "w", encoding="utf-8") as f:
        json.dump(company_to_industry, f, indent=2, ensure_ascii=False)
    print("Saved company_industries.json")

    # 2. Parse pages 10 onwards and group by company
    company_content = {}
    current_company = None
    
    for idx, page_content in enumerate(pages[1:], 1):
        if idx < 10:
            continue
            
        # Extract company name from the page
        m = re.search(r'(?:Company|Compan\s*y)\s*/\s*(?:Organisation|Organ\s*i?sation|Organization)\s*\|?\s*([^\n|]+)', page_content, re.IGNORECASE)
        cname = None
        if m:
            cname = m.group(1).strip()
            cname = re.sub(r'[\s|]+$', '', cname).strip()
            if cname and cname.lower() != 'na':
                current_company = get_canonical_name(cname)
        else:
            # Try full text match in text block if table regex didn't hit
            m2 = re.search(r'Company\s*/\s*Organisation\s+([^\n]+)', page_content, re.IGNORECASE)
            if m2:
                cname = m2.group(1).strip()
                if cname and cname.lower() != 'na':
                    current_company = get_canonical_name(cname)
                    
        if not current_company:
            # If still None, it's a page that couldn't be parsed at all and is the start
            current_company = "Unknown"
            
        cleaned = clean_page_content(page_content)
        if cleaned:
            if current_company not in company_content:
                company_content[current_company] = []
            company_content[current_company].append(cleaned)
            
    # Remove Unknown if empty or merge it
    if "Unknown" in company_content:
        print(f"Warning: {len(company_content['Unknown'])} pages grouped under 'Unknown'.")
        
    # Write to Normalized_Interview_Formats.md
    output_path = Path("Source Data files/Normalized_Interview_Formats.md")
    print(f"Generating {output_path}...")
    
    with open(output_path, "w", encoding="utf-8") as out:
        out.write("# Normalized Company Interview Formats\n\n")
        out.write("This file contains the normalized interview experiences grouped by company.\n\n")
        
        # Sort companies alphabetically
        for company in sorted(company_content.keys()):
            if company == "Unknown":
                continue
                
            industry = company_to_industry.get(company, "Other")
            out.write(f"## {company}\n")
            out.write(f"**Industry:** {industry}\n\n")
            
            # Combine content of all pages
            combined_text = "\n\n---\n\n".join(company_content[company])
            out.write(combined_text)
            out.write("\n\n")
            
    print(f"Successfully created {output_path}")

if __name__ == "__main__":
    main()
