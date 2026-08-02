"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import experiencesData from "@/interview_experiences_data.json";
import experienceStats from "@/interview_experience_stats.json";
import companyIndustries from "@/company_industries.json";
import questionsData from "@/questions_data.json";
import formatsData from "@/interview_formats_data.json";
import slidesData from "@/slides_data.json";
import { ALL_NORMALIZED_DOMAINS, normalizeDomain } from "@/lib/domainUtils";

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

  // Access Control State for Blocklist & Whitelist
  const [blockInputEmail, setBlockInputEmail] = useState("");
  const [allowInputEmail, setAllowInputEmail] = useState("");

  // Session Activity Heartbeat Timer
  useEffect(() => {
    if (!session || !userEmail) return;

    fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login" })
    }).catch(() => {});

    const interval = setInterval(() => {
      fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat" })
      }).catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, [session, userEmail]);

  // Track Company Visit
  const trackCompanyVisit = (companyName: string) => {
    if (!companyName || !session) return;
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "company_visit", company: companyName })
    }).catch(() => {});
  };

  // Pre-normalize all experiences with clean 7 domain mapping
  const experiencesWithNormalizedDomain = useMemo(() => {
    return (experiencesData as any[]).map(exp => ({
      ...exp,
      normalizedDomain: normalizeDomain(exp.domain)
    }));
  }, []);

  // Extract unique companies
  const allCompanies = useMemo(() => {
    const set = new Set<string>();
    experiencesWithNormalizedDomain.forEach(e => set.add(e.company));
    (questionsData as any[]).forEach(q => set.add(q.company));
    return Array.from(set).sort();
  }, [experiencesWithNormalizedDomain]);

  const allYears = useMemo(() => {
    const set = new Set<string>();
    experiencesWithNormalizedDomain.forEach(e => {
      if (e.year) set.add(e.year);
    });
    return Array.from(set).sort().reverse();
  }, [experiencesWithNormalizedDomain]);

  // Filter experiences using normalized domains
  const filteredExperiences = useMemo(() => {
    return experiencesWithNormalizedDomain.filter(exp => {
      if (selectedCompany && exp.company.toLowerCase() !== selectedCompany.toLowerCase()) return false;
      if (selectedDomains.length > 0 && !selectedDomains.includes(exp.normalizedDomain)) return false;
      if (selectedYears.length > 0 && !selectedYears.includes(exp.year)) return false;
      if (selectedProcess && exp.process_type.toLowerCase() !== selectedProcess.toLowerCase()) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = `${exp.company} ${exp.domain} ${exp.normalizedDomain} ${exp.role_offered} ${exp.pre_process_tips} ${exp.gd_topics_tips} ${exp.interview_outline} ${exp.domain_questions} ${exp.hr_gk_questions} ${exp.prep_resources} ${exp.tips} ${exp.tech_skills} ${exp.dos_and_donts}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (b.word_count || 0) - (a.word_count || 0));
  }, [experiencesWithNormalizedDomain, selectedCompany, selectedDomains, selectedYears, selectedProcess, searchQuery]);

  // Catalog Company Intelligence Data
  const catalogIntelligence = useMemo(() => {
    if (!catalogCompany) return null;
    const name = catalogCompany;
    const questions = (questionsData as any[]).filter(q => q.company.toLowerCase() === name.toLowerCase());
    const formatText = (formatsData as any)[name] || null;
    const industry = (companyIndustries as any)[name] || (questions[0]?.industry || "Consulting");
    const companySlides = (slidesData as any[]).filter(s => s.company.toLowerCase() === name.toLowerCase() && s.deck_type === "company");
    const industrySlides = (slidesData as any[]).filter(s => s.company.toLowerCase() === industry.toLowerCase() && s.deck_type === "industry");
    const compExperiences = experiencesWithNormalizedDomain.filter(e => e.company.toLowerCase() === name.toLowerCase());

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
  }, [catalogCompany, experiencesWithNormalizedDomain]);

  // Clean role title helper
  const getCleanRoleTitle = (exp: any) => {
    if (!exp) return "Interview Experience";
    let role = exp.role_offered || "";
    if (role.toLowerCase().startsWith("as a part of") || role.length > 50) {
      role = `${exp.company} - ${exp.normalizedDomain} Candidate`;
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

  const handleBlockEmail = async (emailToBlock: string) => {
    if (!emailToBlock) return;
    try {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "block_email", targetEmail: emailToBlock })
      });
      setBlockInputEmail("");
      handleFetchAdminTelemetry();
    } catch (e) {}
  };

  const handleUnblockEmail = async (emailToUnblock: string) => {
    if (!emailToUnblock) return;
    try {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblock_email", targetEmail: emailToUnblock })
      });
      handleFetchAdminTelemetry();
    } catch (e) {}
  };

  const handleAllowEmail = async (emailToAllow: string) => {
    if (!emailToAllow) return;
    try {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "allow_email", targetEmail: emailToAllow })
      });
      setAllowInputEmail("");
      handleFetchAdminTelemetry();
    } catch (e) {}
  };

  const handleRemoveAllowedEmail = async (emailToRemove: string) => {
    if (!emailToRemove) return;
    try {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_allowed_email", targetEmail: emailToRemove })
      });
      handleFetchAdminTelemetry();
    } catch (e) {}
  };

  const handleToggleWhitelistMode = async (enabled: boolean) => {
    try {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_whitelist", enabled })
      });
      handleFetchAdminTelemetry();
    } catch (e) {}
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

  // Max value calculation for bar chart scaling
  const maxAvgTime = useMemo(() => {
    const daily = adminTelemetry?.dailyAnalytics || [];
    const maxVal = Math.max(...daily.map((d: any) => d.avg_user_time_mins || 0), 10);
    return maxVal;
  }, [adminTelemetry]);

  const maxAvgCompanies = useMemo(() => {
    const daily = adminTelemetry?.dailyAnalytics || [];
    const maxVal = Math.max(...daily.map((d: any) => d.avg_companies_visited || 0), 5);
    return maxVal;
  }, [adminTelemetry]);

  return (
    <div className="app-wrapper">
      {/* App Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="logo-area">
            <img src="/logo.png" alt="IIM Indore PrepCom Logo" className="app-logo-img" />
            <div className="logo-text">
              <h1>PrepChat</h1>
            </div>
          </div>

          {/* View Switcher Segmented Control */}
          <div className="view-mode-toggle">
            <button
              className={`view-btn ${viewMode === "basic" ? "active" : ""}`}
              onClick={() => setViewMode("basic")}
              title="Basic View: Simplified overview cards and executive summaries"
            >
              <span className="material-symbols-outlined btn-icon">grid_view</span> Basic View
            </button>
            <button
              className={`view-btn ${viewMode === "advanced" ? "active" : ""}`}
              onClick={() => setViewMode("advanced")}
              title="Advanced View: In-depth company intelligence, question archives, and PPT decks"
            >
              <span className="material-symbols-outlined btn-icon">analytics</span> Advanced View
            </button>
          </div>

          {/* User Profile & Logout Flow */}
          <div className="header-user-area">
            <span className="user-pill" title="Currently authenticated Google Workspace account">
              <span className="material-symbols-outlined">person</span> {userEmail}
            </span>

            {/* TELEMETRY BUTTON SHOWN EXCLUSIVELY TO prepcom@iimidr.ac.in */}
            {isPrepComAdmin && (
              <button
                className="btn-admin-nav"
                onClick={handleFetchAdminTelemetry}
                title="Exclusive PrepCom Control Panel: Access security controls, user session telemetry, and graphical trends"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#ffffff" }}
              >
                <span className="material-symbols-outlined">insert_chart</span> PrepCom Analytics & Graphs
              </button>
            )}

            <button
              className="btn-logout-nav"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              title="Sign out of PrepChat"
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
            title="Browse 1,200+ detailed candidate placement interview experiences submitted by seniors"
          >
            <span className="material-symbols-outlined nav-btn-icon">work_history</span> Interview Experiences <span className="nav-badge">1,202</span>
          </button>
          <button
            className={`main-nav-btn ${activeSection === "catalog" ? "active" : ""}`}
            onClick={() => setActiveSection("catalog")}
            title="Explore company intelligence catalog, round structures, presentation decks, and past questions"
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
                  title="Reset all active search filters back to default"
                >
                  Reset All Filters
                </button>
              </div>

              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "-0.5rem 0 1rem 0" }}>
                Filter 1,200+ interview experiences by recruiting firm, normalized domain specialization, graduating batch year, or keyword.
              </p>

              <div className="search-grid">
                <div className="exp-filter-group">
                  <label>Company Filter</label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                  >
                    <option value="">All Companies (180+ firms)</option>
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

              {/* Multi-Select Domain Pills (Normalized into 7 Categories) */}
              <div className="mt-3">
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: "0.25rem" }}>
                  Domain Specialization (Normalized into 7 Standard Categories):
                </label>
                <span style={{ fontSize: "0.78rem", color: "#64748b", display: "block", marginBottom: "0.5rem" }}>
                  Select one or more standardized domain categories to filter student experience guides.
                </span>
                <div className="qtype-pills-row">
                  {ALL_NORMALIZED_DOMAINS.map(d => {
                    const isSelected = selectedDomains.includes(d);
                    const count = experiencesWithNormalizedDomain.filter(e => e.normalizedDomain === d).length;
                    return (
                      <button
                        key={d}
                        className={`qtype-pill ${isSelected ? "active" : ""}`}
                        onClick={() => toggleDomain(d)}
                        title={`Filter by ${d} domain (${count} experiences available)`}
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
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: "0.25rem" }}>
                  Batch Year (Multi-Select):
                </label>
                <span style={{ fontSize: "0.78rem", color: "#64748b", display: "block", marginBottom: "0.5rem" }}>
                  Filter experiences by graduating batch year.
                </span>
                <div className="qtype-pills-row">
                  {allYears.map(y => {
                    const isSelected = selectedYears.includes(y);
                    return (
                      <button
                        key={y}
                        className={`qtype-pill ${isSelected ? "active" : ""}`}
                        onClick={() => toggleYear(y)}
                        title={`Filter experiences from batch year ${y}`}
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
                Showing <strong>{filteredExperiences.length}</strong> candidate placement experiences matching selected criteria
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
                    trackCompanyVisit(exp.company);
                  }}
                >
                  <div>
                    <div className="exp-card-header">
                      <div>
                        <div className="exp-card-company">{exp.company}</div>
                      </div>
                      <span className="badge-year-tag" title="Graduating Batch Year">{exp.year || "2024"}</span>
                    </div>

                    <div className="meta-badges-row">
                      <span className="badge-domain-tag" title="Normalized Domain Specialization">{exp.normalizedDomain}</span>
                      <span className="badge-process-tag" title="Process Type">{exp.process_type || "Placement Process"}</span>
                    </div>

                    <p className="exp-card-snippet">
                      {getCleanRoleTitle(exp)}
                    </p>

                    <div className="at-a-glance-bar">
                      <span className="glance-pill pill-words" title="Total word count & detail level of guide">📝 {exp.word_count || 300} words</span>
                      {exp.gd_topics_tips && <span className="glance-pill pill-gd-yes" title="Includes Group Discussion round details">GD Round</span>}
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
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.25rem 0 0.5rem 0" }}>
                  Access company overview, historical interview questions, selection round formats, and extracted presentation slides.
                </p>
                <select
                  value={catalogCompany}
                  onChange={(e) => {
                    setCatalogCompany(e.target.value);
                    trackCompanyVisit(e.target.value);
                  }}
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
                  <span className="view-indicator-pill">
                    Mode: {viewMode === "basic" ? "Basic Overview (Executive Summaries)" : "Advanced Intelligence (Deep Question Banks & Slides)"}
                  </span>
                </div>

                {/* BASIC VIEW FOR CATALOG */}
                {viewMode === "basic" && (
                  <div className="bento-metrics-grid mb-4">
                    <div className="bento-card">
                      <span className="material-symbols-outlined bento-icon">help_center</span>
                      <div className="bento-num">{catalogIntelligence.questions.length}</div>
                      <div className="bento-label" title="Total interview questions archived for this firm">Questions Recorded</div>
                    </div>

                    <div className="bento-card">
                      <span className="material-symbols-outlined bento-icon">format_list_bulleted</span>
                      <div className="bento-num">{catalogIntelligence.formatText ? "Available" : "N/A"}</div>
                      <div className="bento-label" title="Availability of round-by-round selection process note">Process Overview</div>
                    </div>

                    <div className="bento-card">
                      <span className="material-symbols-outlined bento-icon">slideshow</span>
                      <div className="bento-num">{catalogIntelligence.companySlides.length}</div>
                      <div className="bento-label" title="Extracted PowerPoint slides from official company presentations">Company Decks</div>
                    </div>

                    <div className="bento-card">
                      <span className="material-symbols-outlined bento-icon">view_carousel</span>
                      <div className="bento-num">{catalogIntelligence.industrySlides.length}</div>
                      <div className="bento-label" title="Industry sector overview and market analysis slides">Sector Decks</div>
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
                    <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0.25rem 1.25rem 0 1.25rem" }}>
                      Selection structure, round outline, and panel evaluation expectations for {catalogIntelligence.name}.
                    </p>
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
                        title="Archived questions asked by interview panels grouped by batch year and question type"
                      >
                        <span className="material-symbols-outlined">quiz</span> Previous Questions ({catalogIntelligence.questions.length})
                      </button>
                      <button
                        className={`adv-tab-btn ${catalogAdvTab === "format" ? "active" : ""}`}
                        onClick={() => setCatalogAdvTab("format")}
                        title="Detailed selection process structure, GD topics, and interview guidelines"
                      >
                        <span className="material-symbols-outlined">description</span> Interview Format Details
                      </button>
                      <button
                        className={`adv-tab-btn ${catalogAdvTab === "slides" ? "active" : ""}`}
                        onClick={() => setCatalogAdvTab("slides")}
                        title="Presentation slides extracted from company PPTs and sector analysis decks"
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
                                    title={`Filter questions from batch year ${y} (${qCount} questions)`}
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
                                    title={`Filter by ${t} question type (${count} questions)`}
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
                                                <span className="tag-base tag-domain">{normalizeDomain(qItem.domain)}</span>
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
                            title="View official presentation slides for this firm"
                          >
                            🏢 Company Presentation Slides ({catalogIntelligence.companySlides.length})
                          </button>
                          <button
                            className={`deck-tab-btn ${catalogDeckTab === "industry" ? "active" : ""}`}
                            onClick={() => setCatalogDeckTab("industry")}
                            title="View industry sector analysis slides"
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
                  <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0.25rem 1.25rem 0 1.25rem" }}>
                    Read real candidate interview submissions for {catalogIntelligence.name}.
                  </p>
                  <div className="academic-card-body">
                    <div className="exp-cards-grid">
                      {catalogIntelligence.compExperiences.map((exp: any, idx: number) => (
                        <div
                          key={exp.id || idx}
                          className="experience-card"
                          onClick={() => {
                            setActiveModalExp(exp);
                            setActiveModalTab("overview");
                            trackCompanyVisit(exp.company);
                          }}
                        >
                          <div>
                            <div className="exp-card-header">
                              <div className="exp-card-company">{exp.company}</div>
                              <span className="badge-year-tag">{exp.year || "2024"}</span>
                            </div>
                            <div className="meta-badges-row">
                              <span className="badge-domain-tag">{exp.normalizedDomain}</span>
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
                  <span className="meta-pill pill-domain">{normalizeDomain(activeModalExp.domain)}</span>
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
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "-0.2rem", marginBottom: "0.5rem" }}>
                      Candidate background preparation, resume tweaks, and preliminary research strategy.
                    </p>
                    <p>{activeModalExp.pre_process_tips || "No pre-process notes provided."}</p>
                  </div>
                  <div className="modal-section-box">
                    <h4>Role Details & Position Description</h4>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "-0.2rem", marginBottom: "0.5rem" }}>
                      Specific job title, team placement, and candidate profile context.
                    </p>
                    <p>{activeModalExp.role_offered || "Standard Placement Role."}</p>
                  </div>
                </div>
              )}

              {activeModalTab === "rounds" && (
                <div className="modal-pane">
                  <div className="modal-section-box mb-3">
                    <h4>GD Topics & Discussion Notes</h4>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "-0.2rem", marginBottom: "0.5rem" }}>
                      Group discussion topic statement, group size, and key points presented during the round.
                    </p>
                    <p>{activeModalExp.gd_topics_tips || "No GD topics recorded."}</p>
                  </div>
                  <div className="modal-section-box">
                    <h4>Interview Outline & Structure</h4>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "-0.2rem", marginBottom: "0.5rem" }}>
                      Round sequence, duration per candidate, and panel structure.
                    </p>
                    <p>{activeModalExp.interview_outline || "Standard multi-round technical and HR interview."}</p>
                  </div>
                </div>
              )}

              {activeModalTab === "questions" && (
                <div className="modal-pane">
                  <div className="modal-section-box mb-3">
                    <h4>Technical & Domain Specific Questions</h4>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "-0.2rem", marginBottom: "0.5rem" }}>
                      Exact technical, case framework, financial modeling, or domain questions asked by panelists.
                    </p>
                    <p>{activeModalExp.domain_questions || "Refer to general domain questions."}</p>
                  </div>
                  <div className="modal-section-box mb-3">
                    <h4>HR & Behavioral Questions</h4>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "-0.2rem", marginBottom: "0.5rem" }}>
                      CV walkthrough, conflict resolution, situational ethics, and cultural fit questions.
                    </p>
                    <p>{activeModalExp.hr_gk_questions || "Standard behavioral questions."}</p>
                  </div>
                  <div className="modal-section-box">
                    <h4>Technical Skills & Competencies Tested</h4>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "-0.2rem", marginBottom: "0.5rem" }}>
                      Core analytical tools, domain frameworks, and skills evaluated.
                    </p>
                    <p>{activeModalExp.tech_skills || "Financial modeling, analytics, consulting frameworks."}</p>
                  </div>
                </div>
              )}

              {activeModalTab === "tips" && (
                <div className="modal-pane">
                  <div className="modal-section-box mb-3">
                    <h4>Do's and Don'ts / Critical Tips</h4>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "-0.2rem", marginBottom: "0.5rem" }}>
                      Key mistakes to avoid and advice shared by senior candidate.
                    </p>
                    <p>{activeModalExp.dos_and_donts || "Be crisp, confident, and well-versed with your resume."}</p>
                  </div>
                  <div className="modal-section-box">
                    <h4>Preparation Resources & References</h4>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "-0.2rem", marginBottom: "0.5rem" }}>
                      Books, casebooks, modeling courses, and study materials recommended.
                    </p>
                    <p>{activeModalExp.prep_resources || "IIM Indore Placement Decks, Wall Street Prep, Case in Point."}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PrepCom Telemetry & Graphical Analytics Control Panel Modal */}
      {adminModalOpen && isPrepComAdmin && (
        <div className="modal-overlay" onClick={() => setAdminModalOpen(false)}>
          <div className="modal-dialog modal-dialog-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-area">
                <div className="modal-meta-pills">
                  <span className="meta-pill pill-domain" style={{ background: "#4f46e5", color: "#fff" }}>Exclusive Admin Control</span>
                  <span className="meta-pill pill-process">prepcom@iimidr.ac.in</span>
                </div>
                <h3>📊 PrepCom Graphical Analytics & Security Control Center</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setAdminModalOpen(false)}>&times;</button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
                Real-time usage metrics, daily trend graphs, company visit statistics, and server-side email access control for PrepCom admins.
              </p>

              {/* Analytics Summary Stats Grid */}
              <div className="admin-stats-grid mb-4">
                <div className="admin-stat-card">
                  <div className="stat-icon material-symbols-outlined">group</div>
                  <div className="stat-info">
                    <span className="stat-value">{adminTelemetry?.summary?.total_registered_users || 0}</span>
                    <span className="stat-label">Active Users</span>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                      Unique student accounts logged in telemetry database.
                    </span>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-icon material-symbols-outlined">timer</div>
                  <div className="stat-info">
                    <span className="stat-value" style={{ color: "#4f46e5" }}>{adminTelemetry?.summary?.avg_time_display || "0 mins"}</span>
                    <span className="stat-label">Avg Time / Day</span>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                      Calculated from active 15s session heartbeats per student per day.
                    </span>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-icon material-symbols-outlined">travel_explore</div>
                  <div className="stat-info">
                    <span className="stat-value" style={{ color: "#059669" }}>{adminTelemetry?.summary?.avg_companies_per_user || "0.0"}</span>
                    <span className="stat-label">Avg Companies / User</span>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                      Average unique company catalog pages visited per student.
                    </span>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-icon material-symbols-outlined">domain</div>
                  <div className="stat-info">
                    <span className="stat-value" style={{ color: "#7c3aed" }}>{adminTelemetry?.summary?.total_unique_companies_explored || 0}</span>
                    <span className="stat-label">Companies Explored</span>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                      Total unique recruiting firms researched across all sessions.
                    </span>
                  </div>
                </div>
              </div>

              {/* GRAPHICAL CHARTS SECTION */}
              <div className="search-card mb-4" style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "14px", padding: "1.5rem" }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.25rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="material-symbols-outlined" style={{ color: "#2563eb" }}>bar_chart</span>
                  Graphical Trends: Daily Users, Avg Time, and Companies Explored
                </h4>
                <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "1.25rem" }}>
                  Visual bar charts showing daily breakdown over the past 7 days. Hover or inspect bars for detailed daily metrics.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  {/* GRAPHICAL CHART 1: Avg Time & Daily Active Users */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <strong style={{ fontSize: "0.9rem", color: "#1e293b" }}>📈 Avg User Time per Day (Minutes)</strong>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: "8px" }}>Daily Trend</span>
                    </div>
                    <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "1rem" }}>
                      Average active duration spent per student on each day.
                    </p>

                    <div style={{ display: "flex", alignItems: "flex-end", height: "160px", gap: "0.75rem", paddingBottom: "1.5rem", borderBottom: "2px solid #e2e8f0" }}>
                      {(adminTelemetry?.dailyAnalytics || []).map((d: any, idx: number) => {
                        const heightPct = Math.min(100, Math.max(12, ((d.avg_user_time_mins || 0) / maxAvgTime) * 100));
                        return (
                          <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#2563eb", marginBottom: "4px" }}>{d.avg_user_time_mins}m</span>
                            <div
                              title={`${d.label}: ${d.avg_user_time_mins} mins avg time (${d.active_users} active users)`}
                              style={{
                                width: "100%",
                                height: `${heightPct}%`,
                                background: "linear-gradient(180deg, #2563eb 0%, #4f46e5 100%)",
                                borderRadius: "6px 6px 0 0",
                                transition: "height 0.3s ease"
                              }}
                            />
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginTop: "6px" }}>{d.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* GRAPHICAL CHART 2: Avg Companies Visited per User per Day */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <strong style={{ fontSize: "0.9rem", color: "#1e293b" }}>📊 Avg Companies Visited per User per Day</strong>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "8px" }}>Company Exploration</span>
                    </div>
                    <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "1rem" }}>
                      Average count of unique firm pages explored per active student on each day.
                    </p>

                    <div style={{ display: "flex", alignItems: "flex-end", height: "160px", gap: "0.75rem", paddingBottom: "1.5rem", borderBottom: "2px solid #e2e8f0" }}>
                      {(adminTelemetry?.dailyAnalytics || []).map((d: any, idx: number) => {
                        const heightPct = Math.min(100, Math.max(12, ((d.avg_companies_visited || 0) / maxAvgCompanies) * 100));
                        return (
                          <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#059669", marginBottom: "4px" }}>{d.avg_companies_visited}</span>
                            <div
                              title={`${d.label}: ${d.avg_companies_visited} avg companies visited per user`}
                              style={{
                                width: "100%",
                                height: `${heightPct}%`,
                                background: "linear-gradient(180deg, #059669 0%, #10b981 100%)",
                                borderRadius: "6px 6px 0 0",
                                transition: "height 0.3s ease"
                              }}
                            />
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginTop: "6px" }}>{d.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECURITY CONTROL PANEL: BLOCKLIST & ALLOWED LIST */}
              <div className="search-card mb-4" style={{ background: "#f8fafc", border: "1px solid #cbd5e1" }}>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.25rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span className="material-symbols-outlined" style={{ color: "#dc2626" }}>lock</span>
                  Email Access Control Settings (Block & Restrict Email IDs)
                </h4>
                <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "1rem" }}>
                  Enforced server-side in NextAuth.js callback before a session is ever created.
                </p>

                {/* Whitelist Toggle */}
                <div className="mb-3" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", padding: "0.85rem 1.1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem", color: "#1e293b" }}>Whitelist Mode (Restrict to Specific Allowed Emails Only):</strong>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                      When enabled, ONLY emails in the Allowed List can sign in. All other @iimidr.ac.in accounts will be rejected server-side.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleWhitelistMode(!adminTelemetry?.accessControl?.isWhitelistMode)}
                    style={{
                      background: adminTelemetry?.accessControl?.isWhitelistMode ? "#dc2626" : "#2563eb",
                      color: "#fff",
                      border: "none",
                      padding: "0.55rem 1.1rem",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {adminTelemetry?.accessControl?.isWhitelistMode ? "Disable Whitelist Mode" : "Enable Whitelist Mode"}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                  {/* Blocklist Management Box */}
                  <div style={{ background: "#fff", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <strong style={{ fontSize: "0.88rem", color: "#dc2626" }}>🚫 Block Email Address(es) (Space/Comma Separated)</strong>
                    <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "2px 0 6px 0" }}>
                      Enter one or more email IDs separated by spaces to block instantly.
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="e.g. user1@iimidr.ac.in user2@iimidr.ac.in"
                        value={blockInputEmail}
                        onChange={(e) => setBlockInputEmail(e.target.value)}
                        style={{ flex: 1, padding: "0.45rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      />
                      <button
                        type="button"
                        onClick={() => handleBlockEmail(blockInputEmail)}
                        style={{ background: "#dc2626", color: "#fff", border: "none", padding: "0.45rem 0.9rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        Block ID(s)
                      </button>
                    </div>

                    <div style={{ marginTop: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Currently Blocked ({adminTelemetry?.accessControl?.blockedEmails?.length || 0}):</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.35rem" }}>
                        {(adminTelemetry?.accessControl?.blockedEmails || []).map((bEmail: string) => (
                          <span key={bEmail} style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5", borderRadius: "12px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            {bEmail}
                            <span style={{ cursor: "pointer", fontWeight: 800 }} onClick={() => handleUnblockEmail(bEmail)}>&times;</span>
                          </span>
                        ))}
                        {(!adminTelemetry?.accessControl?.blockedEmails || adminTelemetry.accessControl.blockedEmails.length === 0) && (
                          <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>No emails currently blocked.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Allowed List Management Box */}
                  <div style={{ background: "#fff", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <strong style={{ fontSize: "0.88rem", color: "#059669" }}>✅ Allowed Email Whitelist (Space/Comma Separated)</strong>
                    <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "2px 0 6px 0" }}>
                      List of email IDs permitted to log in when Whitelist Mode is active.
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="e.g. user1@iimidr.ac.in user2@iimidr.ac.in"
                        value={allowInputEmail}
                        onChange={(e) => setAllowInputEmail(e.target.value)}
                        style={{ flex: 1, padding: "0.45rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAllowEmail(allowInputEmail)}
                        style={{ background: "#059669", color: "#fff", border: "none", padding: "0.45rem 0.9rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        Allow ID(s)
                      </button>
                    </div>

                    <div style={{ marginTop: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Allowed Accounts ({adminTelemetry?.accessControl?.allowedEmails?.length || 0}):</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.35rem" }}>
                        {(adminTelemetry?.accessControl?.allowedEmails || []).map((aEmail: string) => (
                          <span key={aEmail} style={{ background: "#d1fae5", color: "#047857", border: "1px solid #6ee7b7", borderRadius: "12px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            {aEmail}
                            {aEmail !== "prepcom@iimidr.ac.in" && (
                              <span style={{ cursor: "pointer", fontWeight: 800 }} onClick={() => handleRemoveAllowedEmail(aEmail)}>&times;</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE SESSION & COMPANY TRACKER AUDIT TABLE */}
              <div className="admin-table-container">
                <div className="admin-table-header">
                  <div>
                    <h4>Live Session Audit Log & Companies Explored per User</h4>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "2px 0 0 0" }}>
                      Detailed audit log tracking session start/end timestamps, duration, and specific companies explored per student.
                    </p>
                  </div>
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
                        <th title="Authenticated Google Workspace account email">User Account (@iimidr.ac.in)</th>
                        <th title="Role level (ADMIN for prepcom@iimidr.ac.in, USER for students)">Role</th>
                        <th title="Timestamp when user initiated sign-in">Session Start</th>
                        <th title="Timestamp of latest active background heartbeat ping (every 15s)">Last Active</th>
                        <th title="Total active session duration accumulated during browsing">Time Spent</th>
                        <th title="Count and preview of recruiting firm catalog pages visited by this user">Unique Companies Explored</th>
                        <th title="Current access status (Active Session or BLOCKED)">Status</th>
                        <th title="1-click admin block/unblock controls">Admin Action</th>
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
                            <td>
                              <span className="status-badge" style={{ background: "#eff6ff", color: "#1d4ed8", fontWeight: 700 }}>
                                🏢 {u.companies_visited_count || 0} Companies
                              </span>
                              {u.companies_visited_list && (
                                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                                  {u.companies_visited_list}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={`status-badge ${u.is_blocked ? "status-flagged" : "status-active"}`}>
                                {u.is_blocked ? "BLOCKED" : "Active Session"}
                              </span>
                            </td>
                            <td>
                              {u.email !== "prepcom@iimidr.ac.in" && (
                                u.is_blocked ? (
                                  <button
                                    onClick={() => handleUnblockEmail(u.email)}
                                    style={{ background: "#d1fae5", color: "#047857", border: "1px solid #6ee7b7", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                                  >
                                    Unblock
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleBlockEmail(u.email)}
                                    style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                                  >
                                    Block
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                        ))}
                      {(!adminTelemetry?.users || adminTelemetry.users.length === 0) && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)" }}>
                            Clean telemetry logging active. Pings recorded when users sign in and browse companies.
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
