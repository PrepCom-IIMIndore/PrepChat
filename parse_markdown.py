import json
from pathlib import Path
from company_mapping import get_canonical_name

def main():
    md_path = Path("Source Data files/Normalized_Interview_Formats.md")
    if not md_path.exists():
        print(f"Error: {md_path} not found. Run normalize_raw_markdown.py first.")
        return
        
    print(f"Parsing {md_path} by company heading...")
    with open(md_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    company_data = {}
    current_company = None
    current_lines = []
    
    for line in lines:
        if line.startswith("## "):
            # Save the previous company's data
            if current_company and current_lines:
                format_text = "".join(current_lines).strip()
                company_data[current_company] = format_text
                
            # Extract new company
            raw_company = line[3:].strip()
            current_company = get_canonical_name(raw_company)
            current_lines = []
        else:
            if current_company:
                current_lines.append(line)
                
    # Save the last company
    if current_company and current_lines:
        format_text = "".join(current_lines).strip()
        company_data[current_company] = format_text

    output_path = Path("interview_formats_data.json")
    print(f"Saving parsed formats to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(company_data, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully processed {len(company_data)} companies.")

if __name__ == "__main__":
    main()
