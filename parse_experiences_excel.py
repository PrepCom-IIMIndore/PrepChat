import json
import math
import pandas as pd
from pathlib import Path
from company_mapping import get_canonical_name

def clean_val(val):
    if pd.isna(val):
        return ""
    if isinstance(val, (int, float)):
        if math.isnan(val):
            return ""
        if val == int(val):
            return str(int(val))
        return str(val)
    s = str(val).strip()
    if s.lower() in ["nan", "none", "na", "n/a", "null"]:
        return ""
    return s

def parse_yes_no(val):
    s = clean_val(val).lower()
    if s in ["yes", "y", "true", "1"]:
        return "Yes"
    if s in ["no", "n", "false", "0"]:
        return "No"
    return "Not Specified"

def main():
    excel_path = Path("Source Data files/Interview_Experience_Question_Buckets.xlsx")
    if not excel_path.exists():
        print(f"Error: {excel_path} not found.")
        return

    print(f"Reading Excel dataset: {excel_path}...")
    xl = pd.ExcelFile(excel_path)
    
    df_lean = pd.read_excel(xl, sheet_name="Consolidated (Lean)")
    df_freq = pd.read_excel(xl, sheet_name="Question Bucket Frequency")
    df_rounds = pd.read_excel(xl, sheet_name="Avg Interview Rounds by Co.")
    df_full = pd.read_excel(xl, sheet_name="Full Data (Reference)")
    df_domain = pd.read_excel(xl, sheet_name="Bucket Frequency by Domain")

    print(f"Loaded {len(df_lean)} rows from Lean sheet, {len(df_full)} rows from Full Reference sheet.")

    experiences = []
    
    # Process 1,202 response rows
    for i in range(len(df_lean)):
        row_lean = df_lean.iloc[i]
        row_full = df_full.iloc[i]

        raw_company = clean_val(row_lean.get("Company"))
        if not raw_company:
            raw_company = clean_val(row_full.get("Company"))
        
        canonical_company = get_canonical_name(raw_company) if raw_company else "Other"

        domain = clean_val(row_lean.get("Domain")) or clean_val(row_full.get("Domain")) or "Other"
        year = clean_val(row_lean.get("Year")) or clean_val(row_full.get("Year")) or "Unknown"
        raw_proc = clean_val(row_lean.get("Process Type")) or clean_val(row_full.get("Process Type")) or ""
        p_lower = raw_proc.lower().strip()
        if "summer" in p_lower:
            process_type = "Summer"
        else:
            process_type = "Other"
        role_offered = clean_val(row_lean.get("Profile/Role Offered")) or clean_val(row_full.get("Profile/Role Offered")) or ""

        gd_conducted = parse_yes_no(row_lean.get("GD Conducted"))
        if gd_conducted == "Not Specified":
            gd_conducted = parse_yes_no(row_full.get("GD Conducted (Yes/No)"))

        buddy_round = parse_yes_no(row_lean.get("Buddy Round Mentioned"))

        rounds_raw = row_lean.get("Interview Rounds (Excl. HR)")
        if pd.isna(rounds_raw):
            rounds_raw = row_full.get("Interview Rounds (Excl. HR)")
        
        rounds_cnt = None
        if pd.notna(rounds_raw):
            try:
                rounds_cnt = int(float(rounds_raw))
            except (ValueError, TypeError):
                rounds_cnt = None

        # Question buckets flags
        b_hr = parse_yes_no(row_lean.get("HR/Behavioral")) == "Yes"
        b_resume = parse_yes_no(row_lean.get("Resume-based")) == "Yes"
        b_case = parse_yes_no(row_lean.get("Case/Guesstimate")) == "Yes"
        b_tech = parse_yes_no(row_lean.get("Technical/Domain")) == "Yes"
        b_gk = parse_yes_no(row_lean.get("Current Affairs/GK")) == "Yes"
        b_situational = parse_yes_no(row_lean.get("Situational")) == "Yes"

        buckets = []
        if b_tech: buckets.append("Technical/Domain")
        if b_resume: buckets.append("Resume-based")
        if b_hr: buckets.append("HR/Behavioral")
        if b_case: buckets.append("Case/Guesstimate")
        if b_gk: buckets.append("Current Affairs/GK")
        if b_situational: buckets.append("Situational")

        converted = clean_val(row_full.get("Converted?")) or clean_val(row_full.get("Were You Able to Convert the Interview?")) or ""

        exp_item = {
            "id": i + 1,
            "company": canonical_company,
            "raw_company": raw_company,
            "domain": domain,
            "year": year,
            "process_type": process_type,
            "role_offered": role_offered,
            "converted": converted,
            "gd_conducted": gd_conducted,
            "buddy_round": buddy_round,
            "interview_rounds": rounds_cnt,
            "buckets": buckets,
            "bucket_flags": {
                "technical": b_tech,
                "resume": b_resume,
                "hr": b_hr,
                "case": b_case,
                "gk": b_gk,
                "situational": b_situational
            },
            "ug_background": clean_val(row_full.get("UG Background")),
            "certifications": clean_val(row_full.get("Professional Certifications")),
            "pre_process_tips": clean_val(row_full.get("Pre-Process Details & Tips")),
            "gd_topics_tips": clean_val(row_full.get("GD Topics & Tips")),
            "gd_duration": clean_val(row_full.get("GD Duration (mins)")),
            "no_interviews_duration": clean_val(row_full.get("No. of Interviews & Duration")),
            "interview_outline": clean_val(row_full.get("Outline of Interview(s)")),
            "domain_questions": clean_val(row_full.get("Domain Specific Questions")),
            "situational_questions": clean_val(row_full.get("Situational/Behavioural Questions")),
            "hr_gk_questions": clean_val(row_full.get("HR/Current Affairs Questions")),
            "prep_resources": clean_val(row_full.get("Resources/Prep Methods that Helped")),
            "looking_for": clean_val(row_full.get("What They Were Looking For")),
            "right_wrong": clean_val(row_full.get("What Went Wrong/Right")),
            "tips": clean_val(row_full.get("Tips That Helped")),
            "tech_skills": clean_val(row_full.get("Technical Skills Assessed")),
            "dos_and_donts": clean_val(row_full.get("Do's and Don'ts / Special Preparation")),
            "additional_remarks": clean_val(row_full.get("Additional Remarks"))
        }

        # Calculate total word count for sorting (most detailed responses first)
        text_parts = [
            exp_item["pre_process_tips"], exp_item["gd_topics_tips"], exp_item["interview_outline"],
            exp_item["domain_questions"], exp_item["situational_questions"], exp_item["hr_gk_questions"],
            exp_item["prep_resources"], exp_item["looking_for"], exp_item["right_wrong"],
            exp_item["tips"], exp_item["tech_skills"], exp_item["dos_and_donts"],
            exp_item["additional_remarks"]
        ]
        full_text = " ".join([t for t in text_parts if t])
        exp_item["word_count"] = len(full_text.split()) if full_text.strip() else 0

        experiences.append(exp_item)

    # Sort experiences by word_count descending (most detailed entries first)
    experiences.sort(key=lambda x: x.get("word_count", 0), reverse=True)

    # Save experiences dataset
    out_experiences_path = Path("interview_experiences_data.json")
    with open(out_experiences_path, "w", encoding="utf-8") as f:
        json.dump(experiences, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(experiences)} experiences sorted by word count descending to {out_experiences_path}.")

    # --- Precompute Statistics (Sheets 2, 3, 5 & Company Aggregations) ---
    
    # Sheet 2: Question Bucket Frequency
    overall_bucket_frequency = []
    for _, r in df_freq.iterrows():
        b_name = clean_val(r.get("Question Bucket"))
        b_count = r.get("Count of Responses")
        b_pct = r.get("%\nof Total Responses") if "%\nof Total Responses" in r else r.get("% of Total Responses")
        if b_name and pd.notna(b_count) and b_name != "Total Responses in Database":
            overall_bucket_frequency.append({
                "bucket": b_name,
                "count": int(b_count),
                "pct": float(b_pct) if pd.notna(b_pct) else round(int(b_count) / 12.02, 1)
            })

    # Per-Company Aggregated Statistics
    company_stats = {}
    company_groups = {}
    for exp in experiences:
        c = exp["company"]
        if c not in company_groups:
            company_groups[c] = []
        company_groups[c].append(exp)

    # Incorporate Sheet 3 Avg Rounds by Company
    sheet3_rounds = {}
    for _, r in df_rounds.iterrows():
        c_name = get_canonical_name(clean_val(r.get("Company")))
        avg_r = r.get("Avg Interview Rounds (Excl. HR)")
        resp_cnt = r.get("No. of Responses Used")
        if c_name and pd.notna(avg_r):
            sheet3_rounds[c_name] = {
                "avg_rounds": round(float(avg_r), 1),
                "responses_used": int(resp_cnt) if pd.notna(resp_cnt) else 0
            }

    for c_name, exp_list in company_groups.items():
        total_resp = len(exp_list)
        rounds_list = [e["interview_rounds"] for e in exp_list if e["interview_rounds"] is not None]
        avg_rounds = round(sum(rounds_list) / len(rounds_list), 1) if rounds_list else None
        
        # Override or fallback with Sheet 3 if available
        if c_name in sheet3_rounds and sheet3_rounds[c_name]["avg_rounds"]:
            avg_rounds = sheet3_rounds[c_name]["avg_rounds"]
        elif avg_rounds is None:
            avg_rounds = 2.0  # default fallback

        gd_yes = sum(1 for e in exp_list if e["gd_conducted"] == "Yes")
        buddy_yes = sum(1 for e in exp_list if e["buddy_round"] == "Yes")

        bucket_counts = {
            "Technical/Domain": sum(1 for e in exp_list if e["bucket_flags"]["technical"]),
            "Resume-based": sum(1 for e in exp_list if e["bucket_flags"]["resume"]),
            "HR/Behavioral": sum(1 for e in exp_list if e["bucket_flags"]["hr"]),
            "Case/Guesstimate": sum(1 for e in exp_list if e["bucket_flags"]["case"]),
            "Current Affairs/GK": sum(1 for e in exp_list if e["bucket_flags"]["gk"]),
            "Situational": sum(1 for e in exp_list if e["bucket_flags"]["situational"])
        }

        # Sorted buckets by frequency for this company
        top_buckets = sorted(bucket_counts.items(), key=lambda x: x[1], reverse=True)

        company_stats[c_name] = {
            "company": c_name,
            "total_experiences": total_resp,
            "avg_rounds": int(round(avg_rounds)),
            "gd_conducted_pct": round((gd_yes / total_resp) * 100, 1),
            "gd_conducted_count": gd_yes,
            "buddy_round_pct": round((buddy_yes / total_resp) * 100, 1),
            "buddy_round_count": buddy_yes,
            "bucket_counts": bucket_counts,
            "top_buckets": [b[0] for b in top_buckets if b[1] > 0][:3]
        }

    # Sheet 5: Bucket Frequency by Domain
    domain_bucket_frequency = []
    # Parse first table in Sheet 5 (counts)
    for _, r in df_domain.iterrows():
        dom_name = clean_val(r.get("Domain (Grouped)"))
        tot_resp = r.get("Total Responses")
        if dom_name and pd.notna(tot_resp) and dom_name != "Domain (Grouped)" and not str(dom_name).startswith("Same data"):
            domain_bucket_frequency.append({
                "domain": dom_name,
                "total_responses": int(tot_resp),
                "hr": int(r.get("HR/Behavioral", 0)) if pd.notna(r.get("HR/Behavioral")) else 0,
                "resume": int(r.get("Resume-based", 0)) if pd.notna(r.get("Resume-based")) else 0,
                "case": int(r.get("Case/Guesstimate", 0)) if pd.notna(r.get("Case/Guesstimate")) else 0,
                "technical": int(r.get("Technical/Domain", 0)) if pd.notna(r.get("Technical/Domain")) else 0,
                "gk": int(r.get("Current Affairs/GK", 0)) if pd.notna(r.get("Current Affairs/GK")) else 0,
                "situational": int(r.get("Situational", 0)) if pd.notna(r.get("Situational")) else 0,
            })

    stats_output = {
        "overall_bucket_frequency": overall_bucket_frequency,
        "company_stats": company_stats,
        "domain_bucket_frequency": domain_bucket_frequency,
        "total_experiences": len(experiences),
        "total_companies": len(company_stats)
    }

    out_stats_path = Path("interview_experience_stats.json")
    with open(out_stats_path, "w", encoding="utf-8") as f:
        json.dump(stats_output, f, indent=2, ensure_ascii=False)
    print(f"Saved stats to {out_stats_path}.")
    print("Parsing completed successfully!")

if __name__ == "__main__":
    main()
