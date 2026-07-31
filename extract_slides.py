import os
import sys
import json
import argparse
from pathlib import Path
from company_mapping import get_canonical_name

# Attempt to import Google API libraries.
# If not installed, script can still run in --mock mode.
GOOGLE_LIBS_AVAILABLE = False
try:
    from googleapiclient.discovery import build
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    GOOGLE_LIBS_AVAILABLE = True
except ImportError:
    pass

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/presentations.readonly']

MOCK_SLIDES = [
    # BCG slides (Company deck)
    {
        "company": "BCG",
        "deck_type": "company",
        "slide_number": 1,
        "slide_title": "BCG Company Overview & Values",
        "slide_text": "Boston Consulting Group (BCG) is a global management consulting firm and the world's leading advisor on business strategy.\nKey values: Client first, integrity, diversity, collaboration, and delivering social impact."
    },
    {
        "company": "BCG",
        "deck_type": "company",
        "slide_number": 2,
        "slide_title": "BCG Case Interview Structure",
        "slide_text": "Our interviews consist of Case Questions and Personal Experience Interview (PEI) questions.\nExpect 2 rounds of interviews. Each round has 2 case interviews (45 minutes each).\nFocus areas: Structured thinking, mental math, business intuition, synthesis, and communication."
    },
    # McKinsey slides (Company deck)
    {
        "company": "McKinsey & Company",
        "deck_type": "company",
        "slide_number": 1,
        "slide_title": "McKinsey & Company Brief",
        "slide_text": "Founded in 1926, McKinsey is a trusted advisor to global leaders across private, public, and social sectors.\nWe look for exceptional problem solvers, leaders, and collaborative team players."
    },
    {
        "company": "McKinsey & Company",
        "deck_type": "company",
        "slide_number": 2,
        "slide_title": "McKinsey PEI & Interview Prep",
        "slide_text": "McKinsey interviews are divided 50/50 between the Personal Experience Interview (PEI) and Case Solving.\nPEI topics: Leadership, Personal Impact, Entrepreneurial Drive, and Inclusive Leadership.\nCase format: Interviewer-led. Be prepared for structured brainstorming and quantitative calculations."
    },
    # EY slides (Company deck)
    {
        "company": "EY",
        "deck_type": "company",
        "slide_number": 1,
        "slide_title": "EY Transaction Advisory Services (TAS)",
        "slide_text": "EY helps clients evaluate and execute mergers, acquisitions, valuations, and restructuring.\nOur service lines: Valuation, modeling & economics, corporate finance, transaction diligence, and restructuring."
    },
    {
        "company": "EY",
        "deck_type": "company",
        "slide_number": 2,
        "slide_title": "EY Interview Expectations",
        "slide_text": "Rounds: 1 Online Test (Aptitude/Technical), 1 Technical Round, 1 Partner/Director Round.\nQuestions cover basic financial accounting, corporate valuation, corporate strategy, and behavioral alignment."
    },
    # PwC slides (Company deck)
    {
        "company": "PwC",
        "deck_type": "company",
        "slide_number": 1,
        "slide_title": "PwC Advisory Overview",
        "slide_text": "PwC provides management, technology, and strategy consulting services.\nFocus industries: Financial Services, Consumer Markets, Energy, Utilities, and Technology."
    },
    {
        "company": "PwC",
        "deck_type": "company",
        "slide_number": 2,
        "slide_title": "PwC Interview Format",
        "slide_text": "Rounds: Case Interview, Group Discussion (GD), and final Partner Interview.\nGD topics usually revolve around recent economic policy, digital transformation, or business case studies."
    },
    # Amazon slides (Company deck)
    {
        "company": "Amazon",
        "deck_type": "company",
        "slide_number": 1,
        "slide_title": "Amazon's Leadership Principles",
        "slide_text": "Amazon uses 16 Leadership Principles to guide our work and evaluate candidates.\nTop principles: Customer Obsession, Ownership, Bias for Action, Dive Deep, and Deliver Results."
    },
    {
        "company": "Amazon",
        "deck_type": "company",
        "slide_number": 2,
        "slide_title": "Amazon Interview Loop",
        "slide_text": "Rounds: 1 Online Assessment (Coding/System Design for tech, Case studies for business), followed by a 4-5 round 'Loop'.\nAll questions are evaluated against Leadership Principles using the STAR method (Situation, Task, Action, Result)."
    },
    # Axis Bank slides (Company deck)
    {
        "company": "Axis Bank",
        "deck_type": "company",
        "slide_number": 1,
        "slide_title": "Axis Bank Strategy & Operations",
        "slide_text": "Axis Bank is one of India's leading private sector banks.\nFocus areas: Retail banking, corporate lending, digital treasury operations, and transaction services."
    },
    {
        "company": "Axis Bank",
        "deck_type": "company",
        "slide_number": 2,
        "slide_title": "Axis Bank Interview Round",
        "slide_text": "Usually includes a Group Discussion on banking technology or economic trends, followed by a Technical Interview focusing on finance/risk metrics and an HR fit round."
    },
    # Consulting Industry slides
    {
        "company": "Consulting",
        "deck_type": "industry",
        "slide_number": 1,
        "slide_title": "Consulting Case Frameworks",
        "slide_text": "Core frameworks for case solving:\n1. Profitability: Revenue (Price x Volume) - Cost (Fixed + Variable)\n2. Market Entry: Market attractiveness, barriers, financial viability, entry modes\n3. M&A: Strategic fit, valuation, synergy potential, post-merger integration"
    },
    {
        "company": "Consulting",
        "deck_type": "industry",
        "slide_number": 2,
        "slide_title": "Guesstimates and Estimation Cases",
        "slide_text": "Top-down approach: Start with general population (e.g. India 1.4B) -> Segment by age/income -> Estimate penetration rate -> Deduce usage.\nBottom-up approach: Identify average store/unit capacity -> Estimate hourly/daily sales -> Scale up.\nAlways check constraints and state assumptions clearly."
    },
    # Finance Industry slides
    {
        "company": "Finance",
        "deck_type": "industry",
        "slide_number": 1,
        "slide_title": "Corporate Finance Key Concepts",
        "slide_text": "Valuation Methods:\n- Discounted Cash Flow (DCF): Value based on present value of future cash flows using WACC.\n- Comparable Companies Analysis: Multiples like EV/EBITDA, P/E ratios.\n- Precedent Transactions Analysis: Looking at historical M&A prices."
    },
    {
        "company": "Finance",
        "deck_type": "industry",
        "slide_number": 2,
        "slide_title": "Three Financial Statements Integration",
        "slide_text": "1. Income Statement: Revenue down to Net Income.\n2. Balance Sheet: Assets = Liabilities + Equity.\n3. Cash Flow Statement: Operating, Investing, and Financing Cash Flows.\nNet Income flows from IS to CFS, Cash flows from CFS to BS, and BS Retained Earnings updates."
    },
    # Operations Industry slides
    {
        "company": "Operations",
        "deck_type": "industry",
        "slide_number": 1,
        "slide_title": "Operations & Supply Chain Basics",
        "slide_text": "Key terms: Lead time, cycle time, bottleneck, economic order quantity (EOQ), safety stock, and inventory turnover.\nTheory of Constraints (TOC): Identify the system bottleneck and optimize around it."
    },
    {
        "company": "Operations",
        "deck_type": "industry",
        "slide_number": 2,
        "slide_title": "Six Sigma & Lean Management",
        "slide_text": "Lean: Eliminating waste (Muda) - overproduction, waiting, transport, inventory, defects.\nSix Sigma: Reducing variance and defects using DMAIC (Define, Measure, Analyze, Improve, Control)."
    }
]

def extract_presentation_text(service, presentation_id):
    """
    Calls the Google Slides API to extract slides text.
    """
    print(f"Fetching presentation ID: {presentation_id} from Google Slides API...")
    presentation = service.presentations().get(presentationId=presentation_id).execute()
    slides = presentation.get('slides', [])
    print(f"Found {len(slides)} slides.")
    
    slide_records = []
    for i, slide in enumerate(slides, 1):
        slide_title = ""
        slide_text_parts = []
        
        # Traverse layout elements
        for element in slide.get('pageElements', []):
            if 'shape' in element and 'text' in element['shape']:
                text_content = ""
                for text_element in element['shape']['text'].get('textElements', []):
                    if 'textRun' in text_element and 'content' in text_element['textRun']:
                        text_content += text_element['textRun']['content']
                
                # Check shape type to identify slide title
                shape_type = element.get('shape', {}).get('shapeType', '')
                is_title = 'TITLE' in shape_type or element.get('layoutProperties', {}).get('displayName') == 'Title'
                
                text_cleaned = text_content.strip()
                if text_cleaned:
                    if is_title and not slide_title:
                        slide_title = text_cleaned
                    else:
                        slide_text_parts.append(text_cleaned)
                        
        slide_text = "\n".join(slide_text_parts)
        slide_records.append({
            "slide_number": i,
            "slide_title": slide_title if slide_title else f"Slide {i}",
            "slide_text": slide_text
        })
        
    return slide_records

def main():
    parser = argparse.ArgumentParser(description="Extract text from Google Slides API into company-tagged JSON structure.")
    parser.add_argument("--presentation-id", help="Google Slides presentation ID")
    parser.add_argument("--deck-type", choices=["company", "industry"], help="Type of slide deck")
    parser.add_argument("--company", help="Company name (or industry category if deck-type is industry)")
    parser.add_argument("--mock", action="store_true", help="Force write mock slide data (no API required)")
    args = parser.parse_args()

    output_path = Path("slides_data.json")
    
    # 1. Run in mock mode if forced or libraries/credentials not found
    credentials_exist = Path("credentials.json").exists()
    
    if args.mock or not GOOGLE_LIBS_AVAILABLE or not credentials_exist:
        if not args.mock:
            if not GOOGLE_LIBS_AVAILABLE:
                print("Notice: google-api-python-client/google-auth-oauthlib not installed. Falling back to mock data.")
            elif not credentials_exist:
                print("Notice: credentials.json not found in workspace directory. Falling back to mock data.")
                print("To use the real Slides API, setup a Google Cloud Console project, enable Google Slides API, download credentials.json, and install dependencies.")
                
        print(f"Writing {len(MOCK_SLIDES)} mock slides to {output_path}...")
        
        # Apply canonical naming to mock slides
        for slide in MOCK_SLIDES:
            if slide["deck_type"] == "company":
                slide["company"] = get_canonical_name(slide["company"])
            # Industry slides have "company" as the industry sector name (e.g. Consulting, Finance)
            
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(MOCK_SLIDES, f, indent=2, ensure_ascii=False)
        print("Mock slides data generated successfully.")
        return

    # 2. Real API mode
    if not args.presentation_id or not args.deck_type or not args.company:
        print("Error: When using Google Slides API, you must specify --presentation-id, --deck-type, and --company.")
        print("Or run with --mock to generate mock data.")
        sys.exit(1)
        
    print("Authenticating with Google API...")
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
            
    service = build('slides', 'v1', credentials=creds)
    
    try:
        slide_records = extract_presentation_text(service, args.presentation_id)
        
        # Format slides with tagging details
        company_tag = get_canonical_name(args.company) if args.deck_type == "company" else args.company.title()
        
        tagged_slides = []
        for s in slide_records:
            tagged_slides.append({
                "company": company_tag,
                "deck_type": args.deck_type,
                "slide_number": s["slide_number"],
                "slide_title": s["slide_title"],
                "slide_text": s["slide_text"]
            })
            
        # Append to existing slides_data.json if exists
        existing_data = []
        if output_path.exists():
            try:
                with open(output_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
            except Exception:
                pass
                
        # Filter out existing slides from the same presentation/company/deck_type to prevent duplicates
        existing_data = [s for s in existing_data if not (s["company"] == company_tag and s["deck_type"] == args.deck_type)]
        existing_data.extend(tagged_slides)
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, indent=2, ensure_ascii=False)
            
        print(f"Successfully saved {len(tagged_slides)} slides for '{company_tag}' ({args.deck_type}) to {output_path}.")
        
    except Exception as e:
        print(f"Error calling Slides API: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
