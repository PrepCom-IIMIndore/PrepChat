import os
import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from company_mapping import get_canonical_name

# Attempt fuzzy matching imports with difflib fallback
try:
    from rapidfuzz import process
    HAS_RAPIDFUZZ = True
except ImportError:
    import difflib
    HAS_RAPIDFUZZ = False

# Global data containers
QUESTIONS_DATA = []
FORMATS_DATA = {}
SLIDES_DATA = []
COMPANY_INDUSTRIES = {}
ALL_COMPANIES = []

def load_data():
    global QUESTIONS_DATA, FORMATS_DATA, SLIDES_DATA, COMPANY_INDUSTRIES, ALL_COMPANIES
    
    q_path = Path("questions_data.json")
    if q_path.exists():
        with open(q_path, "r", encoding="utf-8") as f:
            QUESTIONS_DATA = json.load(f)
            
    f_path = Path("interview_formats_data.json")
    if f_path.exists():
        with open(f_path, "r", encoding="utf-8") as f:
            FORMATS_DATA = json.load(f)
            
    s_path = Path("slides_data.json")
    if s_path.exists():
        with open(s_path, "r", encoding="utf-8") as f:
            SLIDES_DATA = json.load(f)
            
    i_path = Path("company_industries.json")
    if i_path.exists():
        with open(i_path, "r", encoding="utf-8") as f:
            COMPANY_INDUSTRIES = json.load(f)
            
    # Build list of all canonical companies
    excel_companies = {q["company"] for q in QUESTIONS_DATA}
    format_companies = set(FORMATS_DATA.keys())
    slides_companies = {s["company"] for s in SLIDES_DATA if s["deck_type"] == "company"}
    
    ALL_COMPANIES = sorted(list(excel_companies | format_companies | slides_companies))
    print(f"[Server] Data loaded: {len(QUESTIONS_DATA)} questions, {len(FORMATS_DATA)} formats, {len(SLIDES_DATA)} slides, {len(ALL_COMPANIES)} canonical companies.")

def perform_fuzzy_search(query: str):
    if not query:
        return None, 0.0
        
    query_clean = query.strip()
    
    # 1. Try canonical alias mapping first
    canonical = get_canonical_name(query_clean)
    if canonical in ALL_COMPANIES:
        return canonical, 100.0
        
    # 2. Fuzzy matching against canonical company list
    if HAS_RAPIDFUZZ:
        match = process.extractOne(query_clean, ALL_COMPANIES)
        if match:
            matched_name, score, _ = match
            return matched_name, float(score)
    else:
        import difflib as df_lib
        matches = df_lib.get_close_matches(query_clean, ALL_COMPANIES, n=1, cutoff=0.3)
        if matches:
            matched_name = matches[0]
            score = df_lib.SequenceMatcher(None, query_clean.lower(), matched_name.lower()).ratio() * 100
            return matched_name, float(score)
            
    return None, 0.0

class ProxyRequestHandler(BaseHTTPRequestHandler):
    
    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, file_path, content_type):
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(404, f"File not found: {e}")

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # -------------------------------------------------------------
        # REST API Proxy Endpoints
        # -------------------------------------------------------------
        if path == '/api/health':
            self._send_json({"status": "ok", "message": "Proxy server running"})
            return
            
        elif path == '/api/companies':
            self._send_json({
                "companies": ALL_COMPANIES,
                "stats": {
                    "total_questions": len(QUESTIONS_DATA),
                    "total_companies": len(ALL_COMPANIES),
                    "total_formats": len(FORMATS_DATA),
                    "total_slides": len(SLIDES_DATA)
                }
            })
            return
            
        elif path == '/api/search':
            q = query_params.get('q', [''])[0]
            matched, score = perform_fuzzy_search(q)
            self._send_json({
                "query": q,
                "matched_company": matched,
                "score": score
            })
            return
            
        elif path == '/api/company':
            company_name = query_params.get('name', [''])[0]
            if not company_name:
                self._send_json({"error": "Missing company name parameter 'name'"}, status=400)
                return

            # Canonicalize target company name
            target_company = get_canonical_name(company_name)
            if target_company not in ALL_COMPANIES and company_name in ALL_COMPANIES:
                target_company = company_name

            # 1. Excel questions
            company_questions = [q for q in QUESTIONS_DATA if q["company"] == target_company]
            
            # 2. Format text
            format_text = FORMATS_DATA.get(target_company, None)
            
            # Industry sector lookup
            industry = COMPANY_INDUSTRIES.get(target_company)
            if not industry and company_questions:
                industry = company_questions[0].get("industry", "Other")
            if not industry:
                industry = "Other"
                
            # 3. Slides
            company_slides = [s for s in SLIDES_DATA if s["company"] == target_company and s["deck_type"] == "company"]
            industry_slides = []
            if industry and industry != "Other":
                industry_slides = [s for s in SLIDES_DATA if s["company"].lower() == industry.lower() and s["deck_type"] == "industry"]

            self._send_json({
                "company": target_company,
                "industry": industry,
                "questions": company_questions,
                "format_text": format_text,
                "company_slides": company_slides,
                "industry_slides": industry_slides
            })
            return

        # -------------------------------------------------------------
        # Static Asset Proxy (Frontend & Root Support)
        # -------------------------------------------------------------
        def resolve_static_path(file_name):
            root_file = Path(file_name)
            if root_file.exists():
                return root_file
            return Path("frontend") / file_name

        if path == '/' or path == '/index.html':
            target_file = resolve_static_path("index.html")
            self._send_file(target_file, 'text/html; charset=utf-8')
        elif path == '/styles.css':
            target_file = resolve_static_path("styles.css")
            self._send_file(target_file, 'text/css; charset=utf-8')
        elif path == '/app.js':
            target_file = resolve_static_path("app.js")
            self._send_file(target_file, 'application/javascript; charset=utf-8')
        else:
            rel_path = path.lstrip('/')
            target_file = resolve_static_path(rel_path)
            if target_file.exists() and target_file.is_file():
                content_type = 'text/plain'
                if rel_path.endswith('.js'): content_type = 'application/javascript'
                elif rel_path.endswith('.css'): content_type = 'text/css'
                elif rel_path.endswith('.html'): content_type = 'text/html'
                elif rel_path.endswith('.json'): content_type = 'application/json'
                self._send_file(target_file, content_type)
            else:
                self.send_error(404, "File Not Found")

def run_server(port=8000):
    load_data()
    server_address = ('', port)
    httpd = HTTPServer(server_address, ProxyRequestHandler)
    print(f"[Server] Backend API & Proxy Server running at http://localhost:{port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server] Shutting down server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
