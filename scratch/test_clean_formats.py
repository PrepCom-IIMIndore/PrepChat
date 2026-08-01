import re
import json
from pathlib import Path
import sys
sys.path.append('.')
from company_mapping import get_canonical_name

def clean_company_text(raw_sec):
    lines = raw_sec.strip().split('\n')
    comp_name = lines[0].strip()
    
    # Extract industry header if present
    industry = "General"
    non_pipe_lines = []
    for line in lines[1:]:
        l_str = line.strip()
        if l_str.startswith("**Industry:**"):
            industry = l_str.replace("**Industry:**", "").strip()
            continue
        if '|' in l_str:
            continue
        if not l_str:
            continue
        non_pipe_lines.append(l_str)
        
    full_text = ' \n '.join(non_pipe_lines)

    # Clean bullet symbols
    full_text = re.sub(r'[\uF0B7\u2022\u2023\u2043\u204F\u2219\uFFFD\u00A0]', ' • ', full_text)
    
    # Split into clean lines & fix broken line wraps
    raw_lines = [l.strip() for l in full_text.split('\n') if l.strip()]
    
    formatted_lines = []
    if industry and industry != "General":
        formatted_lines.append(f"**Industry:** {industry}\n")

    in_section = False
    
    for l in raw_lines:
        # Standardize Section Headings
        if re.search(r'Domain\s+Specific\s+Questions', l, re.I):
            formatted_lines.append("\n### 💼 Domain Specific Questions")
            l = re.sub(r'Domain\s+Specific\s+Questions\s*\(if any\)\s*:?', '', l, flags=re.I).strip()
            if not l: continue
            
        elif re.search(r'HR\s*/\s*Current\s+affair', l, re.I):
            formatted_lines.append("\n### 👥 HR & Current Affairs Questions")
            l = re.sub(r'HR\s*/\s*Current\s+affair\s+based\s+questions\s*\(if any\)\s*:?', '', l, flags=re.I).strip()
            if not l: continue

        elif re.search(r'Additional\s+Comments\s+about\s+your\s+personal', l, re.I):
            formatted_lines.append("\n### 📝 Candidate Remarks & Comments")
            l = re.sub(r'Additional\s+Comments\s+about\s+your\s+personal\s+interview\s*:?', '', l, flags=re.I).strip()
            if not l: continue

        elif re.search(r'Any\s+Tips\s*/\s*Suggestions', l, re.I):
            formatted_lines.append("\n### 💡 Tips & Suggestions for Candidates")
            l = re.sub(r'Any\s+Tips\s*/\s*Suggestions\s+for\s+future\s+candidates\s*:?', '', l, flags=re.I).strip()
            if not l: continue

        elif re.search(r"Any\s+other\s+comment\s+about\s+the\s+company's", l, re.I):
            formatted_lines.append("\n### 📌 Placement Process Notes")
            l = re.sub(r"Any\s+other\s+comment\s+about\s+the\s+company's\s+placement\s+process\s*:?", '', l, flags=re.I).strip()
            if not l: continue

        # Format Key Metadata Pairs cleanly
        if "Company / Organisation" in l:
            val = l.replace("Company / Organisation", "").strip()
            formatted_lines.append(f"• **Company:** {val}")
            continue
        elif "Profile Offered" in l:
            val = l.replace("Profile Offered", "").strip()
            formatted_lines.append(f"• **Profile Offered:** {val}")
            continue
        elif "Group Discussion" in l and "Topic" not in l and "Comments" not in l and "duration" not in l:
            val = l.replace("Group Discussion", "").strip()
            formatted_lines.append(f"• **GD Conducted:** {val}")
            continue
        elif "Topic of GD" in l:
            val = l.replace("Topic of GD", "").strip()
            formatted_lines.append(f"• **GD Topic:** {val}")
            continue
        elif "Personal Interview" in l and "Rounds" in l:
            val = l.replace("Personal Interview", "").replace("- Number of rounds", "").strip()
            formatted_lines.append(f"• **Interview Rounds:** {val}")
            continue

        # Format Bullets vs Regular Text
        if "•" in l:
            parts = l.split("•")
            for p in parts:
                p_clean = p.strip()
                if p_clean:
                    formatted_lines.append(f"• {p_clean}")
        else:
            formatted_lines.append(l)

    result_text = '\n'.join(formatted_lines).strip()
    # Clean up empty bullets or double bullets
    result_text = re.sub(r'•\s*•', '•', result_text)
    result_text = re.sub(r'\n{3,}', '\n\n', result_text)
    return comp_name, result_text

def main():
    md_path = Path("Source Data files/Normalized_Interview_Formats.md")
    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    sections = content.split('\n## ')
    cleaned_dict = {}

    for sec in sections[1:]:
        comp_name, cleaned_text = clean_company_text(sec)
        canonical = get_canonical_name(comp_name)
        cleaned_dict[canonical] = cleaned_text

    with open("interview_formats_data.json", "w", encoding="utf-8") as f:
        json.dump(cleaned_dict, f, indent=2, ensure_ascii=False)

    print(f"Successfully cleaned and regenerated {len(cleaned_dict)} company formats in interview_formats_data.json.")
    
    if "Goldman Sachs" in cleaned_dict:
        print("\n=== Goldman Sachs Clean Result ===\n")
        print(cleaned_dict["Goldman Sachs"].encode('ascii', 'ignore').decode('ascii'))

if __name__ == "__main__":
    main()
