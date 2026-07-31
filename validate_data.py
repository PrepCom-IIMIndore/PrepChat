import json
from pathlib import Path

def validate_questions():
    path = Path("questions_data.json")
    if not path.exists():
        print("[ERROR] questions_data.json is missing!")
        return False
        
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to load questions_data.json: {e}")
        return False
        
    if not isinstance(data, list):
        print("[ERROR] questions_data.json is not a list!")
        return False
        
    print(f"[OK] questions_data.json is valid. Found {len(data)} questions.")
    if data:
        sample = data[0]
        required_keys = {"company", "industry", "domain", "year", "question", "question_type"}
        missing_keys = required_keys - set(sample.keys())
        if missing_keys:
            print(f"[ERROR] Sample question is missing keys: {missing_keys}")
            return False
        print(f"   Sample question keys are correct: {list(sample.keys())}")
        
    return True

def validate_formats():
    path = Path("interview_formats_data.json")
    if not path.exists():
        print("[ERROR] interview_formats_data.json is missing!")
        return False
        
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to load interview_formats_data.json: {e}")
        return False
        
    if not isinstance(data, dict):
        print("[ERROR] interview_formats_data.json is not a dictionary!")
        return False
        
    print(f"[OK] interview_formats_data.json is valid. Found {len(data)} company formats.")
    if data:
        company, text = list(data.items())[0]
        print(f"   Sample company: '{company}', format text length: {len(text)} characters")
        
    return True

def validate_slides():
    path = Path("slides_data.json")
    if not path.exists():
        print("[ERROR] slides_data.json is missing!")
        return False
        
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to load slides_data.json: {e}")
        return False
        
    if not isinstance(data, list):
        print("[ERROR] slides_data.json is not a list!")
        return False
        
    print(f"[OK] slides_data.json is valid. Found {len(data)} slides.")
    if data:
        sample = data[0]
        required_keys = {"company", "deck_type", "slide_number", "slide_title", "slide_text"}
        missing_keys = required_keys - set(sample.keys())
        if missing_keys:
            print(f"[ERROR] Sample slide is missing keys: {missing_keys}")
            return False
        print(f"   Sample slide keys are correct: {list(sample.keys())}")
        
    return True

def main():
    print("--- Starting Data Validation ---")
    q_ok = validate_questions()
    f_ok = validate_formats()
    s_ok = validate_slides()
    
    if q_ok and f_ok and s_ok:
        print("\n[SUCCESS] All data files validated successfully!")
    else:
        print("\n[ERROR] Some validations failed. Please check the errors above.")

if __name__ == "__main__":
    main()
