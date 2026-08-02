"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
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
  
  // EXCLUSIVE TELEMETRY & ADMIN ACCESS FOR prepcom@iimidr.ac.in
  const isPrepComAdmin = userEmail === "prepcom@iimidr.ac.in" || userEmail.startsWith("prepcom");

  // Main Navigation & View Mode
  const [activeSection, setActiveSection] = useState<"experiences" | "catalog">("experiences");
  const [viewMode, setViewMode] = useState<"basic" | "advanced">("basic");

  // Experiences Filtering State
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Catalog Section State
  const [catalogCompany, setCatalogCompany] = useState<string>("Accenture");
  const [catalogAdvTab, setCatalogAdvTab] = useState<"questions" | "format" | "slides">("questions");
  const [catalogDeckTab, setCatalogDeckTab] = useState<"company" | "industry">("company");
  const [catalogSelectedQYears, setCatalogSelectedQYears] = useState<string[]>([]);
  const [catalogSelectedQTypes, setCatalogSelectedQTypes] = useState<string[]>(["Domain", "Technical", "HR/Current Affairs", "Behavioural", "GD"]);
  const [expandedYearAccordion, setExpandedYearAccordion] = useState<{ [year: string]: boolean }>({});

  // Modal State
  const [activeModalExp, setActiveModalExp] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"overview" | "rounds" | "questions" | "tips">("overview");
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminTelemetry, setAdminTelemetry] = useState<any>(null);
  const [adminSearch, setAdminSearch] = useState("");

  // Session Activity Heartbeat Timer
  useEffect(() => {
    if (!session || !userEmail) return;

    // Send initial session login telemetry ping
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login" })
    }).catch(() => {});

    // Send periodic session active heartbeats every 15 seconds
    const interval = setInterval(() => {
      fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat" })
      }).catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, [session, userEmail]);

  // Extract unique companies & domains
  const allCompanies = useMemo(() => {
    const set = new Set<string>();
    (experiencesData as any[]).forEach(e => set.add(e.company));
    (questionsData as any[]).forEach(q => set.add(q.company));
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

  // Catalog Company Intelligence Data
  const catalogIntelligence = useMemo(() => {
    if (!catalogCompany) return null;
    const name = catalogCompany;
    const questions = (questionsData as any[]).filter(q => q.company.toLowerCase() === name.toLowerCase());
    const formatText = (formatsData as any)[name] || null;
    const industry = (companyIndustries as any)[name] || (questions[0]?.industry || "Consulting");
    const companySlides = (slidesData as any[]).filter(s => s.company.toLowerCase() === name.toLowerCase() && s.deck_type === "company");
    const industrySlides = (slidesData as any[]).filter(s => s.company.toLowerCase() === industry.toLowerCase() && s.deck_type === "industry");
    const compExperiences = (experiencesData as any[]).filter(e => e.company.toLowerCase() === name.toLowerCase());

    const qYears = Array.from(new Set(questions.map(q => q.year || "2024"))).sort().reverse();

    const groupedQuestions: { [year: string]: { [type: string]: any[] } } = {};
    questions.forEach(q => {
      const y = q.year || "2024";
      const t = q.type || "Domain";
      if (!groupedQuestions[y]) groupedQuestions[y] = {};
      if (!groupedQuestions[y][t]) groupedQuestions[y][t] = [];
      groupedQuestions[y][t].push(q);
    });

    return {
      name,
      industry,
      questions,
      formatText,
      companySlides,
      industrySlides,
      compExperiences,
      qYears,
      groupedQuestions
    };
  }, [catalogCompany]);

  // Clean role title helper
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

  const toggleCatalogQType = (type: string) => {
    setCatalogSelectedQTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleCatalogQYear = (year: string) => {
    setCatalogSelectedQYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const toggleAccordion = (year: string) => {
    setExpandedYearAccordion(prev => ({ ...prev, [year]: !prev[year] }));
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

            {/* TELEMETRY BUTTON SHOWN EXCLUSIVELY TO prepcom@iimidr.ac.in */}
            {isPrepComAdmin && (
              <button
                className="btn-admin-nav"
                onClick={handleFetchAdminTelemetry}
                title="PrepCom Session Telemetry & User Analytics"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#ffffff" }}
              >
                <span className="material-symbols-outlined">monitoring</span> PrepCom Analytics
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

        {/* SECTION 2: COMPANY CATALOG & INTELLIGENCE */}
        {activeSection === "catalog" && (
          <div id="section-catalog" className="app-section">
            <div className="search-card mb-4">
              <div className="exp-filter-group">
                <label style={{ fontSize: "1.1rem", fontWeight: 800 }}>🏢 Select Company from Institutional Intelligence Catalog</label>
                <select
                  value={catalogCompany}
                  onChange={(e) => setCatalogCompany(e.target.value)}
                  style={{ marginTop: "0.5rem" }}
                >
                  {allCompanies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {catalogIntelligence && (
              <div>
                {/* Company Header Banner */}
                <div className="company-header-banner">
                  <div>
                    <h2>{catalogIntelligence.name}</h2>
                    <span className="company-sector-badge">Sector: {catalogIntelligence.industry}</span>
                  </div>
                  <span className="view-indicator-pill">Mode: {viewMode === "basic" ? "Basic Overview" : "Advanced Intelligence"}</span>
                </div>

                {/* BASIC VIEW FOR CATALOG */}
                {viewMode === "basic" && (
                  <div className="bento-metrics-grid mb-4">
                    <div className="bento-card">
                      <span className="material-symbols-outlined bento-icon">help_center</span>
                      <div className="bento-num">{catalogIntelligence.questions.length}</div>
                      <div className="bento-label">Questions Recorded</div>
                    </div>

                    <div className="bento-card">
                      <span className="material-symbols-outlined bento-icon">format_list_bulleted</span>
                      <div className="bento-num">{catalogIntelligence.formatText ? "Available" : "N/A"}</div>
                      <div className="bento-label">Process Overview</div>
                    </div>

                    <div className="bento-card">
                      <span className="material-symbols-outlined bento-icon">slideshow</span>
                      <div className="bento-num">{catalogIntelligence.companySlides.length}</div>
                      <div className="bento-label">Company Decks</div>
                    </div>

                    <div className="bento-card">
                      <span className="material-symbols-outlined bento-icon">view_carousel</span>
                      <div className="bento-num">{catalogIntelligence.industrySlides.length}</div>
                      <div className="bento-label">Sector Decks</div>
                    </div>
                  </div>
                )}

                {/* BASIC VIEW: PROCESS OVERVIEW */}
                {viewMode === "basic" && catalogIntelligence.formatText && (
                  <div className="academic-card mb-4">
                    <div className="academic-card-header">
                      <span className="material-symbols-outlined">summarize</span>
                      <h3>Executive Process Overview</h3>
                    </div>
                    <div className="academic-card-body" style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: "0.95rem" }}>
                      {catalogIntelligence.formatText}
                    </div>
                  </div>
                )}

                {/* ADVANCED VIEW FOR CATALOG */}
                {viewMode === "advanced" && (
                  <div>
                    {/* Advanced Navigation Sub-tabs */}
                    <div className="advanced-nav-tabs mb-4">
                      <button
                        className={`adv-tab-btn ${catalogAdvTab === "questions" ? "active" : ""}`}
                        onClick={() => setCatalogAdvTab("questions")}
                      >
                        <span className="material-symbols-outlined">quiz</span> Previous Questions ({catalogIntelligence.questions.length})
                      </button>
                      <button
                        className={`adv-tab-btn ${catalogAdvTab === "format" ? "active" : ""}`}
                        onClick={() => setCatalogAdvTab("format")}
                      >
                        <span className="material-symbols-outlined">description</span> Interview Format Details
                      </button>
                      <button
                        className={`adv-tab-btn ${catalogAdvTab === "slides" ? "active" : ""}`}
                        onClick={() => setCatalogAdvTab("slides")}
                      >
                        <span className="material-symbols-outlined">present_to_all</span> Company & Sector Decks ({catalogIntelligence.companySlides.length + catalogIntelligence.industrySlides.length})
                      </button>
                    </div>

                    {/* ADVANCED PANE 1: QUESTIONS ACCORDION */}
                    {catalogAdvTab === "questions" && (
                      <div className="adv-pane">
                        {/* Question Type & Year Filter Card */}
                        <div className="qtype-filter-card mb-3">

                          {/* ROW 1: BATCH YEARS MULTI-SELECT */}
                          <div className="filter-row mb-3">
                            <div className="filter-row-header">
                              <div className="qtype-filter-title">
                                <span className="material-symbols-outlined">calendar_month</span>
                                <span>Batch Years (Multi-Select):</span>
                              </div>
                              <div className="qtype-filter-actions">
                                <button
                                  className="btn-qtype-select-all"
                                  onClick={() => setCatalogSelectedQYears(catalogIntelligence.qYears)}
                                >
                                  Select All Years
                                </button>
                                <button
                                  className="btn-qtype-clear"
                                  onClick={() => setCatalogSelectedQYears([])}
                                >
                                  Clear All
                                </button>
                              </div>
                            </div>
                            <div className="qtype-pills-row">
                              {catalogIntelligence.qYears.map(y => {
                                const isSel = catalogSelectedQYears.includes(y);
                                const qCount = (catalogIntelligence.groupedQuestions[y] ? Object.values(catalogIntelligence.groupedQuestions[y]).flat().length : 0);
                                return (
                                  <button
                                    key={y}
                                    className={`qtype-pill ${isSel ? "active" : ""}`}
                                    onClick={() => toggleCatalogQYear(y)}
                                  >
                                    <span>{y}</span>
                                    <span className="qtype-count-badge">{qCount}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* ROW 2: QUESTION TYPES MULTI-SELECT */}
                          <div className="filter-row">
                            <div className="filter-row-header">
                              <div className="qtype-filter-title">
                                <span className="material-symbols-outlined">category</span>
                                <span>Question Types (Multi-Select):</span>
                              </div>
                              <div className="qtype-filter-actions">
                                <button
                                  className="btn-qtype-select-all"
                                  onClick={() => setCatalogSelectedQTypes(["Domain", "Technical", "HR/Current Affairs", "Behavioural", "GD"])}
                                >
                                  Select All
                                </button>
                                <button
                                  className="btn-qtype-clear"
                                  onClick={() => setCatalogSelectedQTypes([])}
                                >
                                  Clear All
                                </button>
                              </div>
                            </div>
                            <div className="qtype-pills-row">
                              {["Domain", "Technical", "HR/Current Affairs", "Behavioural", "GD"].map(t => {
                                const isSel = catalogSelectedQTypes.includes(t);
                                const count = catalogIntelligence.questions.filter(q => (q.type || "Domain").toLowerCase() === t.toLowerCase()).length;
                                return (
                                  <button
                                    key={t}
                                    className={`qtype-pill ${isSel ? "active" : ""}`}
                                    onClick={() => toggleCatalogQType(t)}
                                  >
                                    <span>{t}</span>
                                    <span className="qtype-count-badge">{count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Questions Grouped by Year */}
                        {catalogIntelligence.qYears.map(y => {
                          if (catalogSelectedQYears.length > 0 && !catalogSelectedQYears.includes(y)) {
                            return null;
                          }

                          const yearData = catalogIntelligence.groupedQuestions[y] || {};
                          const isExpanded = expandedYearAccordion[y] !== false;

                          return (
                            <div key={y} className="year-group">
                              <div className="year-header" onClick={() => toggleAccordion(y)}>
                                <span>📅 Batch Year: {y}</span>
                                <span className="material-symbols-outlined">
                                  {isExpanded ? "expand_less" : "expand_more"}
                                </span>
                              </div>

                              {isExpanded && (
                                <div className="year-questions-list">
                                  {Object.keys(yearData).map(typeKey => {
                                    if (catalogSelectedQTypes.length > 0 && !catalogSelectedQTypes.some(st => st.toLowerCase() === typeKey.toLowerCase())) {
                                      return null;
                                    }
                                    const qList = yearData[typeKey] || [];

                                    return (
                                      <div key={typeKey} className="qtype-subgroup">
                                        <div className={`qtype-subgroup-title type-${typeKey.toLowerCase().replace(/[^a-z]/g, "")}`}>
                                          <span>{typeKey} Questions</span>
                                          <span className="qtype-count-badge">{qList.length}</span>
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                          {qList.map((qItem: any, qIdx: number) => (
                                            <div key={qIdx} className="question-card">
                                              <div className="question-meta">
                                                <span className="tag-base tag-domain">{qItem.domain || "Placement"}</span>
                                                <span className="question-domain">{qItem.role || "Candidate"}</span>
                                              </div>
                                              <div className="question-text">{qItem.question}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ADVANCED PANE 2: FORMAT DETAILS */}
                    {catalogAdvTab === "format" && (
                      <div className="format-card">
                        {catalogIntelligence.formatText ? (
                          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                            {catalogIntelligence.formatText}
                          </div>
                        ) : (
                          <p style={{ color: "var(--text-muted)" }}>No detailed format note recorded for {catalogIntelligence.name}.</p>
                        )}
                      </div>
                    )}

                    {/* ADVANCED PANE 3: SLIDES & DECKS */}
                    {catalogAdvTab === "slides" && (
                      <div>
                        <div className="deck-tabs-header">
                          <button
                            className={`deck-tab-btn ${catalogDeckTab === "company" ? "active" : ""}`}
                            onClick={() => setCatalogDeckTab("company")}
                          >
                            🏢 Company Presentation Slides ({catalogIntelligence.companySlides.length})
                          </button>
                          <button
                            className={`deck-tab-btn ${catalogDeckTab === "industry" ? "active" : ""}`}
                            onClick={() => setCatalogDeckTab("industry")}
                          >
                            📈 Industry Sector Slides ({catalogIntelligence.industrySlides.length})
                          </button>
                        </div>

                        <div className="tab-pane">
                          {catalogDeckTab === "company" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                              {catalogIntelligence.companySlides.length > 0 ? (
                                catalogIntelligence.companySlides.map((slide: any, sIdx: number) => (
                                  <div key={sIdx} className="slide-card">
                                    <div className="slide-header">Slide #{slide.slide_number}: {slide.slide_title || "Company Overview"}</div>
                                    <div className="slide-text">{slide.slide_content}</div>
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: "var(--text-muted)", padding: "1.5rem" }}>No PPT slides extracted for {catalogIntelligence.name}.</p>
                              )}
                            </div>
                          )}

                          {catalogDeckTab === "industry" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                              {catalogIntelligence.industrySlides.length > 0 ? (
                                catalogIntelligence.industrySlides.map((slide: any, sIdx: number) => (
                                  <div key={sIdx} className="slide-card">
                                    <div className="slide-header">{slide.company} Sector - Slide #{slide.slide_number}: {slide.slide_title}</div>
                                    <div className="slide-text">{slide.slide_content}</div>
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: "var(--text-muted)", padding: "1.5rem" }}>No industry sector slides extracted for {catalogIntelligence.industry}.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Candidate Interview Experiences inside Company Catalog */}
                <div className="academic-card mt-4">
                  <div className="academic-card-header">
                    <span className="material-symbols-outlined">record_voice_over</span>
                    <h3>Candidate Interview Experiences for {catalogIntelligence.name} ({catalogIntelligence.compExperiences.length})</h3>
                  </div>
                  <div className="academic-card-body">
                    <div className="exp-cards-grid">
                      {catalogIntelligence.compExperiences.map((exp: any, idx: number) => (
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
                              <div className="exp-card-company">{exp.company}</div>
                              <span className="badge-year-tag">{exp.year || "2024"}</span>
                            </div>
                            <div className="meta-badges-row">
                              <span className="badge-domain-tag">{exp.domain}</span>
                              <span className="badge-process-tag">{exp.process_type || "Placement Process"}</span>
                            </div>
                            <p className="exp-card-snippet">{getCleanRoleTitle(exp)}</p>
                          </div>
                          <div className="exp-card-footer">
                            <button className="btn-read-exp">
                              <span>View Prep Guide</span>
                              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
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

      {/* PrepCom Telemetry & Analytics Dashboard Modal */}
      {adminModalOpen && isPrepComAdmin && (
        <div className="modal-overlay" onClick={() => setAdminModalOpen(false)}>
          <div className="modal-dialog modal-dialog-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-area">
                <div className="modal-meta-pills">
                  <span className="meta-pill pill-domain" style={{ background: "#4f46e5", color: "#fff" }}>Exclusive Admin View</span>
                  <span className="meta-pill pill-process">prepcom@iimidr.ac.in</span>
                </div>
                <h3>📊 PrepCom Institutional Analytics & Session Audit Log</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setAdminModalOpen(false)}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="admin-stats-grid mb-4">
                <div className="admin-stat-card">
                  <div className="stat-icon material-symbols-outlined">group</div>
                  <div className="stat-info">
                    <span className="stat-value">{adminTelemetry?.summary?.total_registered_users || 0}</span>
                    <span className="stat-label">Unique Active Users</span>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <div className="stat-icon material-symbols-outlined">login</div>
                  <div className="stat-info">
                    <span className="stat-value">{adminTelemetry?.summary?.total_logins || 0}</span>
                    <span className="stat-label">Total Login Sessions</span>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <div className="stat-icon material-symbols-outlined">timer</div>
                  <div className="stat-info">
                    <span className="stat-value" style={{ color: "#4f46e5" }}>{adminTelemetry?.summary?.avg_time_display || "0 mins"}</span>
                    <span className="stat-label">Avg Duration / User</span>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <div className="stat-icon material-symbols-outlined">schedule</div>
                  <div className="stat-info">
                    <span className="stat-value">{adminTelemetry?.summary?.total_time_hours || "0"} hrs</span>
                    <span className="stat-label">Total Time Spent</span>
                  </div>
                </div>
              </div>

              <div className="admin-table-container">
                <div className="admin-table-header">
                  <h4>Live Session Audit Log of @iimidr.ac.in Accounts</h4>
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
                        <th>User Account (@iimidr.ac.in)</th>
                        <th>Role</th>
                        <th>Session Start</th>
                        <th>Session End / Last Active</th>
                        <th>Total Time Spent</th>
                        <th>Actions</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminTelemetry?.users || [])
                        .filter((u: any) => !adminSearch || u.email.toLowerCase().includes(adminSearch.toLowerCase()))
                        .map((u: any, idx: number) => (
                          <tr key={idx}>
                            <td><strong>{u.email}</strong></td>
                            <td>
                              <span
                                className="status-badge"
                                style={{
                                  background: u.role === "admin" ? "#e0e7ff" : "#f1f5f9",
                                  color: u.role === "admin" ? "#4338ca" : "#475569"
                                }}
                              >
                                {u.role?.toUpperCase()}
                              </span>
                            </td>
                            <td>{u.session_start || "Just Now"}</td>
                            <td>{u.last_active || "Active Now"}</td>
                            <td><strong>{u.duration_display || "1 min"}</strong></td>
                            <td>{u.activity_count || 1} pings</td>
                            <td>
                              <span className="status-badge status-active">Active Session</span>
                            </td>
                          </tr>
                        ))}
                      {(!adminTelemetry?.users || adminTelemetry.users.length === 0) && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)" }}>
                            Clean telemetry logging active. Pings recorded when users sign in and browse.
                          </td>
                        </tr>
                      )}
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
