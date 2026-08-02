"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useMemo } from "react";
import experiencesData from "@/interview_experiences_data.json";
import experienceStats from "@/interview_experience_stats.json";
import companyIndustries from "@/company_industries.json";
import questionsData from "@/questions_data.json";
import formatsData from "@/interview_formats_data.json";
import slidesData from "@/slides_data.json";

export default function DashboardPage() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "candidate@iimidr.ac.in";
  const userRole = (session?.user as any)?.role || "user";
  const isAdmin = userRole === "admin" || userEmail.startsWith("admin") || userEmail.includes("placecom") || userEmail.includes("prepcom");

  // Navigation & View States
  const [activeSection, setActiveSection] = useState<"experiences" | "catalog">("experiences");
  const [viewMode, setViewMode] = useState<"basic" | "advanced">("basic");

  // Experiences Filtering
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [activeModalExp, setActiveModalExp] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"overview" | "rounds" | "questions" | "tips">("overview");
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminTelemetry, setAdminTelemetry] = useState<any>(null);
  const [adminSearch, setAdminSearch] = useState("");

  // Catalog Section State
  const [catalogCompany, setCatalogCompany] = useState<string>("");

  // Extract unique companies & domains
  const allCompanies = useMemo(() => {
    const set = new Set<string>();
    (experiencesData as any[]).forEach(e => set.add(e.company));
    return Array.from(set).sort();
  }, []);

  const allDomains = useMemo(() => {
    const set = new Set<string>();
    (experiencesData as any[]).forEach(e => set.add(e.domain));
    return Array.from(set).sort();
  }, []);

  const allYears = useMemo(() => {
    const set = new Set<string>();
    (experiencesData as any[]).forEach(e => {
      if (e.year) set.add(e.year);
    });
    return Array.from(set).sort().reverse();
  }, []);

  // Filter experiences
  const filteredExperiences = useMemo(() => {
    return (experiencesData as any[]).filter(exp => {
      if (selectedCompany && exp.company.toLowerCase() !== selectedCompany.toLowerCase()) return false;
      if (selectedDomains.length > 0 && !selectedDomains.includes(exp.domain)) return false;
      if (selectedYears.length > 0 && !selectedYears.includes(exp.year)) return false;
      if (selectedProcess && exp.process_type.toLowerCase() !== selectedProcess.toLowerCase()) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = `${exp.company} ${exp.domain} ${exp.role_offered} ${exp.pre_process_tips} ${exp.gd_topics_tips} ${exp.interview_outline} ${exp.domain_questions} ${exp.hr_gk_questions} ${exp.prep_resources} ${exp.tips} ${exp.tech_skills} ${exp.dos_and_donts}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (b.word_count || 0) - (a.word_count || 0));
  }, [selectedCompany, selectedDomains, selectedYears, selectedProcess, searchQuery]);

  // Clean role title
  const getCleanRoleTitle = (exp: any) => {
    if (!exp) return "Interview Experience";
    let role = exp.role_offered || "";
    if (role.toLowerCase().startsWith("as a part of") || role.length > 50) {
      role = `${exp.company} - ${exp.domain} Candidate`;
    }
    return role;
  };

  const handleFetchAdminTelemetry = async () => {
    try {
      const res = await fetch("/api/telemetry");
      if (res.ok) {
        const data = await res.json();
        setAdminTelemetry(data);
      }
    } catch (e) {}
    setAdminModalOpen(true);
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev => 
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const toggleYear = (year: string) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  return (
    <div className="app-wrapper">
      {/* App Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="logo-area">
            <img src="/logo.png" alt="IIM Indore PrepCom Logo" className="app-logo-img" />
            <div className="logo-text">
              <h1>PrepChat</h1>
              <span className="badge-proxy">Vercel NextAuth Serverless</span>
            </div>
          </div>

          {/* View Switcher Segmented Control */}
          <div className="view-mode-toggle">
            <button
              className={`view-btn ${viewMode === "basic" ? "active" : ""}`}
              onClick={() => setViewMode("basic")}
            >
              <span className="material-symbols-outlined btn-icon">grid_view</span> Basic View
            </button>
            <button
              className={`view-btn ${viewMode === "advanced" ? "active" : ""}`}
              onClick={() => setViewMode("advanced")}
            >
              <span className="material-symbols-outlined btn-icon">analytics</span> Advanced View
            </button>
          </div>

          {/* User Profile & Logout Flow */}
          <div className="header-user-area">
            <span className="user-pill">
              <span className="material-symbols-outlined">person</span> {userEmail}
            </span>
            {isAdmin && (
              <button
                className="btn-admin-nav"
                onClick={handleFetchAdminTelemetry}
                title="Admin Usage & Abuse Monitor"
              >
                <span className="material-symbols-outlined">analytics</span> Telemetry
              </button>
            )}
            <button
              className="btn-logout-nav"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              title="Sign out"
            >
              <span className="material-symbols-outlined">logout</span> Sign Out
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="main-nav-bar">
          <button
            className={`main-nav-btn ${activeSection === "experiences" ? "active" : ""}`}
            onClick={() => setActiveSection("experiences")}
          >
            <span className="material-symbols-outlined nav-btn-icon">work_history</span> Interview Experiences <span className="nav-badge">1,202</span>
          </button>
          <button
            className={`main-nav-btn ${activeSection === "catalog" ? "active" : ""}`}
            onClick={() => setActiveSection("catalog")}
          >
            <span className="material-symbols-outlined nav-btn-icon">menu_book</span> Company Catalog & Decks
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-container">
        {activeSection === "experiences" && (
          <div id="section-experiences" className="app-section">
            {/* Search & Filter Card */}
            <div className="search-card mb-4">
              <div className="filter-row-header mb-3">
                <div className="qtype-filter-title">
                  <span className="material-symbols-outlined">filter_list</span>
                  <span>Multi-Domain Placement Filters</span>
                </div>
                <button
                  className="btn-qtype-clear"
                  onClick={() => {
                    setSelectedCompany("");
                    setSelectedDomains([]);
                    setSelectedYears([]);
                    setSelectedProcess("");
                    setSearchQuery("");
                  }}
                >
                  Reset All Filters
                </button>
              </div>

              <div className="search-grid">
                <div className="exp-filter-group">
                  <label>Company Filter</label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                  >
                    <option value="">All Companies (180+)</option>
                    {allCompanies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="exp-filter-group">
                  <label>Keyword Search</label>
                  <input
                    type="text"
                    placeholder="Search roles, GDs, technical questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Multi-Select Domain Pills */}
              <div className="mt-3">
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: "0.5rem" }}>
                  Domain Selection:
                </label>
                <div className="qtype-pills-row">
                  {allDomains.map(d => {
                    const isSelected = selectedDomains.includes(d);
                    const count = (experiencesData as any[]).filter(e => e.domain === d).length;
                    return (
                      <button
                        key={d}
                        className={`qtype-pill ${isSelected ? "active" : ""}`}
                        onClick={() => toggleDomain(d)}
                      >
                        <span>{d}</span>
                        <span className="qtype-count-badge">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-Select Year Pills */}
              <div className="mt-3">
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: "0.5rem" }}>
                  Batch Year:
                </label>
                <div className="qtype-pills-row">
                  {allYears.map(y => {
                    const isSelected = selectedYears.includes(y);
                    return (
                      <button
                        key={y}
                        className={`qtype-pill ${isSelected ? "active" : ""}`}
                        onClick={() => toggleYear(y)}
                      >
                        <span>{y}</span>
                      </button>
                    );
                  })}
                  {selectedYears.length > 0 && (
                    <button
                      className="btn-qtype-clear"
                      onClick={() => setSelectedYears([])}
                    >
                      Clear Years
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Results Count Banner */}
            <div className="results-bar-header mb-3">
              <span className="results-count-text">
                Showing <strong>{filteredExperiences.length}</strong> placement experiences
              </span>
            </div>

            {/* Experiences Cards Grid */}
            <div className="exp-cards-grid">
              {filteredExperiences.map((exp: any, idx: number) => (
                <div
                  key={exp.id || idx}
                  className="experience-card"
                  onClick={() => {
                    setActiveModalExp(exp);
                    setActiveModalTab("overview");
                  }}
                >
                  <div>
                    <div className="exp-card-header">
                      <div>
                        <div className="exp-card-company">{exp.company}</div>
                      </div>
                      <span className="badge-year-tag">{exp.year || "2024"}</span>
                    </div>

                    <div className="meta-badges-row">
                      <span className="badge-domain-tag">{exp.domain}</span>
                      <span className="badge-process-tag">{exp.process_type || "Placement Process"}</span>
                    </div>

                    <p className="exp-card-snippet">
                      {getCleanRoleTitle(exp)}
                    </p>

                    <div className="at-a-glance-bar">
                      <span className="glance-pill pill-words">📝 {exp.word_count || 300} words</span>
                      {exp.gd_topics_tips && <span className="glance-pill pill-gd-yes">GD Round</span>}
                    </div>
                  </div>

                  <div className="exp-card-footer">
                    <button className="btn-read-exp">
                      <span>View Full Prep Guide</span>
                      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "catalog" && (
          <div id="section-catalog" className="app-section">
            <div className="search-card mb-4">
              <h3>Company Catalog & Decks Search</h3>
              <div className="exp-filter-group mt-3">
                <label>Select Company</label>
                <select
                  value={catalogCompany}
                  onChange={(e) => setCatalogCompany(e.target.value)}
                >
                  <option value="">Select a Company</option>
                  {allCompanies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Drill-Down Experience Modal */}
      {activeModalExp && (
        <div className="modal-overlay" onClick={() => setActiveModalExp(null)}>
          <div className="modal-dialog modal-dialog-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-area">
                <div className="modal-meta-pills">
                  <span className="meta-pill pill-domain">{activeModalExp.domain}</span>
                  <span className="meta-pill pill-process">{activeModalExp.process_type || "Placement Process"}</span>
                </div>
                <h3>{activeModalExp.company} - {getCleanRoleTitle(activeModalExp)}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModalExp(null)}>&times;</button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="modal-nav-tabs">
              <button
                className={`modal-tab-btn ${activeModalTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveModalTab("overview")}
              >
                Overview & Summary
              </button>
              <button
                className={`modal-tab-btn ${activeModalTab === "rounds" ? "active" : ""}`}
                onClick={() => setActiveModalTab("rounds")}
              >
                GD & Rounds
              </button>
              <button
                className={`modal-tab-btn ${activeModalTab === "questions" ? "active" : ""}`}
                onClick={() => setActiveModalTab("questions")}
              >
                Questions Asked
              </button>
              <button
                className={`modal-tab-btn ${activeModalTab === "tips" ? "active" : ""}`}
                onClick={() => setActiveModalTab("tips")}
              >
                Strategy & Tips
              </button>
            </div>

            <div className="modal-body">
              {activeModalTab === "overview" && (
                <div className="modal-pane">
                  <div className="modal-section-box mb-3">
                    <h4>Pre-Process Preparation</h4>
                    <p>{activeModalExp.pre_process_tips || "No pre-process notes provided."}</p>
                  </div>
                  <div className="modal-section-box">
                    <h4>Role Details & Position Description</h4>
                    <p>{activeModalExp.role_offered || "Standard Placement Role."}</p>
                  </div>
                </div>
              )}

              {activeModalTab === "rounds" && (
                <div className="modal-pane">
                  <div className="modal-section-box mb-3">
                    <h4>GD Topics & Discussion Notes</h4>
                    <p>{activeModalExp.gd_topics_tips || "No GD topics recorded."}</p>
                  </div>
                  <div className="modal-section-box">
                    <h4>Interview Outline & Structure</h4>
                    <p>{activeModalExp.interview_outline || "Standard multi-round technical and HR interview."}</p>
                  </div>
                </div>
              )}

              {activeModalTab === "questions" && (
                <div className="modal-pane">
                  <div className="modal-section-box mb-3">
                    <h4>Technical & Domain Specific Questions</h4>
                    <p>{activeModalExp.domain_questions || "Refer to general domain questions."}</p>
                  </div>
                  <div className="modal-section-box mb-3">
                    <h4>HR & Behavioral Questions</h4>
                    <p>{activeModalExp.hr_gk_questions || "Standard behavioral questions."}</p>
                  </div>
                  <div className="modal-section-box">
                    <h4>Technical Skills & Competencies Tested</h4>
                    <p>{activeModalExp.tech_skills || "Financial modeling, analytics, consulting frameworks."}</p>
                  </div>
                </div>
              )}

              {activeModalTab === "tips" && (
                <div className="modal-pane">
                  <div className="modal-section-box mb-3">
                    <h4>Do's and Don'ts / Critical Tips</h4>
                    <p>{activeModalExp.dos_and_donts || "Be crisp, confident, and well-versed with your resume."}</p>
                  </div>
                  <div className="modal-section-box">
                    <h4>Preparation Resources & References</h4>
                    <p>{activeModalExp.prep_resources || "IIM Indore Placement Decks, Wall Street Prep, Case in Point."}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Telemetry Modal */}
      {adminModalOpen && (
        <div className="modal-overlay" onClick={() => setAdminModalOpen(false)}>
          <div className="modal-dialog modal-dialog-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-area">
                <div className="modal-meta-pills">
                  <span className="meta-pill pill-domain">Admin Control Panel</span>
                  <span className="meta-pill pill-process">NextAuth Serverless Telemetry</span>
                </div>
                <h3>📊 Institutional User Logins & Audit Monitor</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setAdminModalOpen(false)}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="admin-stats-grid mb-4">
                <div className="admin-stat-card">
                  <div className="stat-icon material-symbols-outlined">group</div>
                  <div className="stat-info">
                    <span className="stat-value">{adminTelemetry?.summary?.total_registered_users || 1}</span>
                    <span className="stat-label">Registered Accounts</span>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <div className="stat-icon material-symbols-outlined">login</div>
                  <div className="stat-info">
                    <span className="stat-value">{adminTelemetry?.summary?.total_logins || 1}</span>
                    <span className="stat-label">Total Login Sessions</span>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <div className="stat-icon material-symbols-outlined">bolt</div>
                  <div className="stat-info">
                    <span className="stat-value">{adminTelemetry?.summary?.total_actions || 1}</span>
                    <span className="stat-label">Total Queries</span>
                  </div>
                </div>
                <div className="admin-stat-card stat-alert">
                  <div className="stat-icon material-symbols-outlined">warning</div>
                  <div className="stat-info">
                    <span className="stat-value">{adminTelemetry?.summary?.flagged_abuse_count || 0}</span>
                    <span className="stat-label">High-Usage Flags</span>
                  </div>
                </div>
              </div>

              <div className="admin-table-container">
                <div className="admin-table-header">
                  <h4>Audit Trail of Logged-in @iimidr.ac.in Users</h4>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Search email..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                  />
                </div>
                <div className="table-scroll-wrap">
                  <table className="telemetry-table">
                    <thead>
                      <tr>
                        <th>User Email (@iimidr.ac.in)</th>
                        <th>Role</th>
                        <th>Login Count</th>
                        <th>Queries</th>
                        <th>First Access</th>
                        <th>Last Active</th>
                        <th>Risk Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminTelemetry?.users || []).map((u: any, idx: number) => (
                        <tr key={idx}>
                          <td><strong>{u.email}</strong></td>
                          <td><span className="status-badge status-active">{u.role?.toUpperCase()}</span></td>
                          <td><strong>{u.login_count || 1}</strong> logins</td>
                          <td>{u.activity_count || 0} queries</td>
                          <td>{u.first_login || "N/A"}</td>
                          <td>{u.last_login || "N/A"}</td>
                          <td><span className="status-badge status-active">Active / Normal</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
