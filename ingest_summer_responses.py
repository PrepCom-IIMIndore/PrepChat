import csv
import json
import re
from pathlib import Path
from company_mapping import get_canonical_name

def clean_str(val):
    if not val:
        return ""
    s = str(val).strip()
    if s.lower() in ["na", "n/a", "none", "nil", "null", "nan", "-"]:
        return ""
    return s

def normalize_domain(raw):
    if not raw:
        return "Others"
    r = raw.lower().strip()
    if "consult" in r or "strategy" in r:
        return "Consulting"
    if "fin" in r:
        return "Finance"
    if "market" in r or "sales" in r or "s&m" in r:
        return "Marketing"
    if "gen" in r:
        return "GenMan"
    if "prod" in r or "it" in r:
        return "Prodman"
    if "oper" in r or "supply" in r:
        return "Operations"
    return "Others"

def parse_int_rounds(s):
    if not s:
        return None
    s_clean = s.strip().lower()
    if s_clean in ['na', 'nil', 'none', '']:
        return None
    if "did not get shortlisted" in s_clean or "no interview" in s_clean:
        return 0
    if "the first two" in s_clean and "third" in s_clean and "last hr" in s_clean:
        return 4
    if "buddy round" in s_clean and "interview" in s_clean:
        return 2
    if "buddy call" in s_clean and "got placed after" in s_clean:
        return 1
    if "buddy round" in s_clean and "didn't move" in s_clean:
        return 1
    if "pi round 1" in s_clean and "pi round 2" in s_clean:
        return 2
    if "pi round 1" in s_clean:
        return 1
    m = re.search(r'(\d+)\s*(?:interview|round)', s_clean)
    if m:
        return int(m.group(1))
    m = re.search(r'^(\d+)', s_clean)
    if m:
        return int(m.group(1))
    return None

def is_gd_conducted(topic, duration):
    t = clean_str(topic)
    d = clean_str(duration)
    if not t and not d:
        return "No"
    lower_t = t.lower()
    if any(k in lower_t for k in ["case", "topic", "china", "biryani", "vs", "women", "beer", "esg", "protest", "ev", "hiring", "pricing"]):
        return "Yes"
    if d and d not in ["0", "na", "none"]:
        return "Yes"
    if t:
        return "Yes"
    return "No"

def is_buddy_round(preprocess, rounds_str, outline):
    text = f"{preprocess} {rounds_str} {outline}".lower()
    return "Yes" if "buddy" in text else "No"

def detect_buckets(outline, domain_q, hr_gk_q, tech_skills, prep_res, looking_for, tips):
    all_text = f"{outline} {domain_q} {hr_gk_q} {tech_skills} {prep_res} {looking_for} {tips}".lower()
    
    # Case / Guesstimate
    b_case = bool(re.search(r'\b(case|guesstimate|market sizing|market entry|profitability)\b', all_text))
    
    # Technical / Domain
    b_tech = bool(clean_str(tech_skills) or clean_str(domain_q) or re.search(r'\b(dcf|wacc|valuation|ebitda|balance sheet|sql|python|lbo|derivatives|npv|red book)\b', all_text))
    
    # Resume-based
    b_resume = bool(re.search(r'\b(resume|cv|tmay|workex|work ex|internship|projects|tell me about yourself)\b', all_text))
    
    # HR / Behavioral
    b_hr = bool(clean_str(hr_gk_q) or re.search(r'\b(hr|why company|why mba|strengths|weaknesses|conflict|culture fit|leadership)\b', all_text))
    
    # Current Affairs / GK
    b_gk = bool(re.search(r'\b(current affairs|gk|geopolitics|macroeconomic|gdp|news|newspaper|china\+1)\b', all_text))
    
    # Situational
    b_situational = bool(re.search(r'\b(situational|behavioural|dilemma|handle|conflict)\b', all_text))

    buckets = []
    if b_case: buckets.append("Case/Guesstimate")
    if b_tech: buckets.append("Technical/Domain")
    if b_resume: buckets.append("Resume-based")
    if b_hr: buckets.append("HR/Behavioral")
    if b_gk: buckets.append("Current Affairs/GK")
    if b_situational: buckets.append("Situational")
    
    if not buckets:
        buckets.append("Resume-based")
        b_resume = True

    return buckets, {
        "technical": b_tech,
        "resume": b_resume,
        "hr": b_hr,
        "case": b_case,
        "gk": b_gk,
        "situational": b_situational
    }

def detect_conversion(text, remarks):
    comb = f"{text} {remarks}".lower()
    if any(k in comb for k in ["selected", "converted", "got placed", "got through", "i was placed", "offered"]):
        return "Yes"
    if any(k in comb for k in ["not selected", "did not get shortlisted", "didn't got hr call", "didn't get shortlisted", "could not convert", "rejected"]):
        return "No"
    return ""

def main():
    csv_path = Path("Source Data files/Summer_Internship_Responses_2026.csv")
    if not csv_path.exists():
        print(f"Error: {csv_path} not found.")
        return

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        raw_rows = list(reader)

    print(f"Loaded {len(raw_rows)} rows from CSV.")

    # Load existing experiences
    exp_path = Path("interview_experiences_data.json")
    with open(exp_path, "r", encoding="utf-8") as f:
        existing_experiences = json.load(f)

    max_id = max(e["id"] for e in existing_experiences) if existing_experiences else 0
    print(f"Existing experiences: {len(existing_experiences)}, max ID: {max_id}")

    # Check for existing emails to avoid duplicates
    existing_fingerprints = set(
        f"{e.get('company')}_{e.get('role_offered')}_{e.get('word_count')}"
        for e in existing_experiences
    )

    new_experiences = []
    next_id = max_id + 1

    for row in raw_rows:
        raw_company = row.get("Company Name (As listed on Reculta)", "").strip()
        canonical_company = get_canonical_name(raw_company)
        role = row.get("Role (As listed on Reculta)", "").strip()
        domain = normalize_domain(row.get("Domain", ""))
        year = "2026"
        process_type = "Summer"

        pre_process = clean_str(row.get("Describe company pre-process like filling Application forms, screening tests"))
        gd_topic = clean_str(row.get("Topic of GD (if any) | Write NA if GD wasn't a part of the process."))
        gd_duration = clean_str(row.get("Approximate Duration of GD (in mins) | Please write NA if GD wasn't a part of the process."))
        rounds_str = clean_str(row.get("No. of Interviews & Duration of each"))
        interview_outline = clean_str(row.get("Outline of Interview(s)"))
        domain_q = clean_str(row.get("Domain Specific Questions (If any)"))
        hr_gk_q = clean_str(row.get("HR/Current Affairs based Questions (If any)"))
        prep_res = clean_str(row.get("Which resources/preparation methods helped you the most?"))
        looking_for = clean_str(row.get("What do you think they were looking for?"))
        right_wrong = clean_str(row.get("What went wrong/right?"))
        tips = clean_str(row.get("Tips on what you think helped in the Interview"))
        tech_skills = clean_str(row.get("List the technical skill assessed during your interview (one word or phrase).  "))
        dos_donts = clean_str(row.get("Do(s) and Don’t(s)/Special Preparation"))
        certs = clean_str(row.get('Did you have any of the following professional certifications at the time of your selection process? If you have any significant certificate apart from the ones mentioned, please type it in the "other" section'))
        remarks = clean_str(row.get("Additional Remarks"))
        ug_bg = clean_str(row.get("Please specify your background in UG degree"))

        gd_conducted = is_gd_conducted(gd_topic, gd_duration)
        buddy_round = is_buddy_round(pre_process, rounds_str, interview_outline)
        rounds_cnt = parse_int_rounds(rounds_str)
        converted = detect_conversion(right_wrong, remarks)

        buckets, bucket_flags = detect_buckets(
            interview_outline, domain_q, hr_gk_q, tech_skills, prep_res, looking_for, tips
        )

        text_parts = [
            pre_process, gd_topic, interview_outline, domain_q, hr_gk_q,
            prep_res, looking_for, right_wrong, tips, tech_skills, dos_donts, remarks
        ]
        full_text = " ".join([t for t in text_parts if t])
        word_count = len(full_text.split()) if full_text.strip() else 0

        fingerprint = f"{canonical_company}_{role}_{word_count}"
        if fingerprint in existing_fingerprints:
            print(f"Skipping duplicate: {fingerprint}")
            continue

        exp_item = {
            "id": next_id,
            "company": canonical_company,
            "raw_company": raw_company,
            "domain": domain,
            "year": year,
            "process_type": process_type,
            "role_offered": role,
            "converted": converted,
            "gd_conducted": gd_conducted,
            "buddy_round": buddy_round,
            "interview_rounds": rounds_cnt,
            "buckets": buckets,
            "bucket_flags": bucket_flags,
            "ug_background": ug_bg,
            "certifications": certs,
            "pre_process_tips": pre_process,
            "gd_topics_tips": gd_topic,
            "gd_duration": gd_duration,
            "no_interviews_duration": rounds_str,
            "interview_outline": interview_outline,
            "domain_questions": domain_q,
            "situational_questions": "",
            "hr_gk_questions": hr_gk_q,
            "prep_resources": prep_res,
            "looking_for": looking_for,
            "right_wrong": right_wrong,
            "tips": tips,
            "tech_skills": tech_skills,
            "dos_and_donts": dos_donts,
            "additional_remarks": remarks,
            "word_count": word_count
        }

        new_experiences.append(exp_item)
        next_id += 1

    print(f"Prepared {len(new_experiences)} new summer internship experiences.")

    # Save standalone JSON artifact of just the new responses
    out_new_json = Path("summer_internship_2026_data.json")
    with open(out_new_json, "w", encoding="utf-8") as f:
        json.dump(new_experiences, f, indent=2, ensure_ascii=False)
    print(f"Saved standalone new summer experiences to {out_new_json}")

    # Combine with existing experiences and sort by word_count descending
    combined_experiences = existing_experiences + new_experiences
    combined_experiences.sort(key=lambda x: x.get("word_count", 0), reverse=True)

    with open(exp_path, "w", encoding="utf-8") as f:
        json.dump(combined_experiences, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(combined_experiences)} combined experiences to {exp_path}")

    # --- Precompute and update interview_experience_stats.json ---
    company_groups = {}
    for exp in combined_experiences:
        c = exp["company"]
        if c not in company_groups:
            company_groups[c] = []
        company_groups[c].append(exp)

    # Load existing stats to preserve sheet3 overrides if present
    stats_path = Path("interview_experience_stats.json")
    with open(stats_path, "r", encoding="utf-8") as f:
        old_stats = json.load(f)

    company_stats = {}
    for c_name, exp_list in company_groups.items():
        total_resp = len(exp_list)
        rounds_list = [e["interview_rounds"] for e in exp_list if e["interview_rounds"] is not None]
        avg_rounds = round(sum(rounds_list) / len(rounds_list), 1) if rounds_list else 2.0

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

    # Precompute overall bucket frequency across all combined experiences
    total_all = len(combined_experiences)
    overall_bucket_counts = {
        "Technical/Domain": sum(1 for e in combined_experiences if e["bucket_flags"]["technical"]),
        "Resume-based": sum(1 for e in combined_experiences if e["bucket_flags"]["resume"]),
        "HR/Behavioral": sum(1 for e in combined_experiences if e["bucket_flags"]["hr"]),
        "Case/Guesstimate": sum(1 for e in combined_experiences if e["bucket_flags"]["case"]),
        "Current Affairs/GK": sum(1 for e in combined_experiences if e["bucket_flags"]["gk"]),
        "Situational": sum(1 for e in combined_experiences if e["bucket_flags"]["situational"])
    }

    overall_bucket_frequency = [
        {
            "bucket": b_name,
            "count": cnt,
            "pct": round((cnt / total_all) * 100, 1) if total_all else 0
        }
        for b_name, cnt in sorted(overall_bucket_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    new_stats_output = {
        "overall_bucket_frequency": overall_bucket_frequency,
        "company_stats": company_stats,
        "domain_bucket_frequency": old_stats.get("domain_bucket_frequency", []),
        "total_experiences": total_all,
        "total_companies": len(company_stats)
    }

    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(new_stats_output, f, indent=2, ensure_ascii=False)
    print(f"Updated {stats_path} for {len(company_stats)} companies.")

    print("\n[SUCCESS] Ingestion completed successfully!")

if __name__ == "__main__":
    main()
