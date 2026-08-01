// PrepChat - Dual-Mode JS (Backend API Proxy + GitHub Pages Direct Support)

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Navigation Sections
    const navBtnCatalog = document.getElementById('nav-btn-catalog');
    const navBtnExperiences = document.getElementById('nav-btn-experiences');
    const sectionCatalog = document.getElementById('section-catalog');
    const sectionExperiences = document.getElementById('section-experiences');

    // DOM Elements - Catalog Search & Display
    const fuzzySearchInput = document.getElementById('fuzzy-search-input');
    const companySelect = document.getElementById('company-select');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const matchBanner = document.getElementById('match-banner');
    const serverStatusBadge = document.getElementById('server-status-badge');
    
    const landingDashboard = document.getElementById('landing-dashboard');
    const companyContent = document.getElementById('company-content');
    
    const displayCompanyName = document.getElementById('display-company-name');
    const displaySectorName = document.getElementById('display-sector-name');
    const currentViewPill = document.getElementById('current-view-pill');
    
    // View Switcher Buttons
    const btnViewBasic = document.getElementById('btn-view-basic');
    const btnViewAdvanced = document.getElementById('btn-view-advanced');
    const viewBasicPane = document.getElementById('view-basic');
    const viewAdvancedPane = document.getElementById('view-advanced');

    // Basic View Elements
    const basicStatQuestions = document.getElementById('basic-stat-questions');
    const basicStatCycles = document.getElementById('basic-stat-cycles');
    const basicStatSlides = document.getElementById('basic-stat-slides');
    const basicStatStatus = document.getElementById('basic-stat-status');
    const basicOverviewSection = document.getElementById('basic-overview-section');
    const basicOverviewText = document.getElementById('basic-overview-text');
    const basicQuestionsSection = document.getElementById('basic-questions-section');
    const basicQuestionsContainer = document.getElementById('basic-questions-container');

    // Advanced View Elements & Nav Tabs
    const advBtnQuestions = document.getElementById('adv-btn-questions');
    const advBtnFormat = document.getElementById('adv-btn-format');
    const advBtnSlides = document.getElementById('adv-btn-slides');
    const advPaneQuestions = document.getElementById('adv-pane-questions');
    const advPaneFormat = document.getElementById('adv-pane-format');
    const advPaneSlides = document.getElementById('adv-pane-slides');

    const questionsContainer = document.getElementById('questions-container');
    const formatContainer = document.getElementById('format-container');
    
    const tabBtnCompany = document.getElementById('tab-btn-company');
    const tabBtnIndustry = document.getElementById('tab-btn-industry');
    const companySlidesPane = document.getElementById('company-slides-pane');
    const industrySlidesPane = document.getElementById('industry-slides-pane');
    const companySlidesContainer = document.getElementById('company-slides-container');
    const industrySlidesContainer = document.getElementById('industry-slides-container');

    // Landing Stats
    const statQuestions = document.getElementById('stat-questions');
    const statCompanies = document.getElementById('stat-companies');
    const statFormats = document.getElementById('stat-formats');
    const statSlides = document.getElementById('stat-slides');

    // DOM Elements - Interview Experiences Section
    const expStatTotal = document.getElementById('exp-stat-total');
    const expStatCompanies = document.getElementById('exp-stat-companies');
    const expStatDomains = document.getElementById('exp-stat-domains');
    const expStatAvgRounds = document.getElementById('exp-stat-avg-rounds');
    
    const overallBucketBarsContainer = document.getElementById('overall-bucket-bars');
    const domainTabsNavContainer = document.getElementById('domain-tabs-nav');
    const domainBucketContentContainer = document.getElementById('domain-bucket-content');

    const expFilterCompany = document.getElementById('exp-filter-company');
    const expFilterDomain = document.getElementById('exp-filter-domain');
    const expFilterYear = document.getElementById('exp-filter-year');
    const expFilterProcess = document.getElementById('exp-filter-process');
    const expFilterSearch = document.getElementById('exp-filter-search');
    const expClearSearch = document.getElementById('exp-clear-search');
    const expBtnReset = document.getElementById('exp-btn-reset');

    const expShowingCount = document.getElementById('exp-showing-count');
    const activeFilterTagsContainer = document.getElementById('active-filter-tags');
    const expCardsContainer = document.getElementById('exp-cards-container');
    const expLoadMoreContainer = document.getElementById('exp-load-more-container');
    const expBtnLoadMore = document.getElementById('exp-btn-load-more');

    // DOM Elements - Drill-Down Modal
    const experienceModal = document.getElementById('experience-modal');
    const modalExpClose = document.getElementById('modal-exp-close');
    const modalExpCompany = document.getElementById('modal-exp-company');
    const modalExpDomain = document.getElementById('modal-exp-domain');
    const modalExpYear = document.getElementById('modal-exp-year');
    const modalExpProcess = document.getElementById('modal-exp-process');
    const modalExpConverted = document.getElementById('modal-exp-converted');
    const modalExpTitle = document.getElementById('modal-exp-title');
    const modalCompanySummaryBox = document.getElementById('modal-company-summary-box');

    const modalExpPreProcess = document.getElementById('modal-exp-pre-process');
    const modalExpUg = document.getElementById('modal-exp-ug');
    const modalExpCertifications = document.getElementById('modal-exp-certifications');
    const modalExpGdTopics = document.getElementById('modal-exp-gd-topics');
    const modalExpOutline = document.getElementById('modal-exp-outline');
    const modalExpTechSkills = document.getElementById('modal-exp-tech-skills');
    const modalExpDomainQ = document.getElementById('modal-exp-domain-q');
    const modalExpHrQ = document.getElementById('modal-exp-hr-q');
    const modalExpSituationalQ = document.getElementById('modal-exp-situational-q');
    const modalExpResources = document.getElementById('modal-exp-resources');
    const modalExpLookingFor = document.getElementById('modal-exp-looking-for');
    const modalExpRightWrong = document.getElementById('modal-exp-right-wrong');
    const modalExpDosDonts = document.getElementById('modal-exp-dos-donts');
    const modalExpTips = document.getElementById('modal-exp-tips');

    // App State
    let currentAppSection = 'experiences'; // 'experiences' | 'catalog'
    let currentViewMode = 'basic'; // 'basic' | 'advanced'
    let currentCompanyData = null;
    let debounceTimer = null;
    let expDebounceTimer = null;
    let useStaticFallback = false;

    // Static Data Cache for GitHub Pages & Fast Access
    let staticQuestions = [];
    let staticFormats = {};
    let staticSlides = [];
    let staticIndustries = {};
    let staticCompanies = [];

    // Experience Datasets State
    let experiencesList = [];
    let experienceStatsData = null;
    let filteredExperiences = [];
    let displayedCardCount = 20;
    let isExperiencesLoaded = false;

    // 1. Primary App Section Navigation
    navBtnCatalog.addEventListener('click', () => switchAppSection('catalog'));
    navBtnExperiences.addEventListener('click', () => switchAppSection('experiences'));

    function switchAppSection(section) {
        currentAppSection = section;
        if (section === 'catalog') {
            navBtnCatalog.classList.add('active');
            navBtnExperiences.classList.remove('active');
            sectionCatalog.classList.remove('hidden');
            sectionExperiences.classList.add('hidden');
        } else {
            navBtnExperiences.classList.add('active');
            navBtnCatalog.classList.remove('active');
            sectionExperiences.classList.remove('hidden');
            sectionCatalog.classList.add('hidden');
            if (!isExperiencesLoaded) {
                loadExperiencesData();
            }
        }
    }

    // 2. View Switcher Event Handlers (Catalog Section)
    btnViewBasic.addEventListener('click', () => setViewMode('basic'));
    btnViewAdvanced.addEventListener('click', () => setViewMode('advanced'));

    function setViewMode(mode) {
        currentViewMode = mode;
        if (mode === 'basic') {
            btnViewBasic.classList.add('active');
            btnViewAdvanced.classList.remove('active');
            viewBasicPane.classList.remove('hidden');
            viewAdvancedPane.classList.add('hidden');
            currentViewPill.textContent = 'Showing Basic View';
        } else {
            btnViewAdvanced.classList.add('active');
            btnViewBasic.classList.remove('active');
            viewAdvancedPane.classList.remove('hidden');
            viewBasicPane.classList.add('hidden');
            currentViewPill.textContent = 'Showing Advanced View';
        }

        if (currentCompanyData) {
            renderCurrentView();
        }
    }

    // Advanced Nav Tab Switching
    function setAdvNavTab(targetPaneId, activeBtn) {
        document.querySelectorAll('.adv-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.adv-pane').forEach(pane => pane.classList.add('hidden'));

        activeBtn.classList.add('active');
        const pane = document.getElementById(targetPaneId);
        if (pane) pane.classList.remove('hidden');
    }

    advBtnQuestions.addEventListener('click', () => setAdvNavTab('adv-pane-questions', advBtnQuestions));
    advBtnFormat.addEventListener('click', () => setAdvNavTab('adv-pane-format', advBtnFormat));
    advBtnSlides.addEventListener('click', () => setAdvNavTab('adv-pane-slides', advBtnSlides));

    tabBtnCompany.addEventListener('click', () => {
        tabBtnCompany.classList.add('active');
        tabBtnIndustry.classList.remove('active');
        companySlidesPane.classList.remove('hidden');
        industrySlidesPane.classList.add('hidden');
    });

    tabBtnIndustry.addEventListener('click', () => {
        tabBtnIndustry.classList.add('active');
        tabBtnCompany.classList.remove('active');
        industrySlidesPane.classList.remove('hidden');
        companySlidesPane.classList.add('hidden');
    });

    // 3. Load Catalog & Experiences Data
    async function loadCatalog() {
        try {
            const res = await fetch('/api/companies');
            if (res.ok) {
                const data = await res.json();
                if (serverStatusBadge) serverStatusBadge.textContent = "Backend Secured Proxy";

                if (data.stats) {
                    statQuestions.textContent = data.stats.total_questions || 0;
                    statCompanies.textContent = data.stats.total_companies || 0;
                    statFormats.textContent = data.stats.total_formats || 0;
                    statSlides.textContent = data.stats.total_slides || 0;
                }

                if (data.companies && Array.isArray(data.companies)) {
                    populateCompanySelect(data.companies);
                }
                return;
            }
        } catch (e) {
            console.log("Backend API not reachable. Switching to GitHub Pages static data mode.");
        }

        // Fallback to GitHub Pages Direct Static Mode
        useStaticFallback = true;
        if (serverStatusBadge) serverStatusBadge.textContent = "GitHub Pages Mode";
        await loadStaticDatasets();
    }

    async function loadStaticDatasets() {
        try {
            const [qRes, fRes, sRes, iRes] = await Promise.all([
                fetch('questions_data.json').catch(() => null),
                fetch('interview_formats_data.json').catch(() => null),
                fetch('slides_data.json').catch(() => null),
                fetch('company_industries.json').catch(() => null)
            ]);

            if (qRes && qRes.ok) staticQuestions = await qRes.json();
            if (fRes && fRes.ok) staticFormats = await fRes.json();
            if (sRes && sRes.ok) staticSlides = await sRes.json();
            if (iRes && iRes.ok) staticIndustries = await iRes.json();

            const cSet = new Set();
            staticQuestions.forEach(q => cSet.add(q.company));
            Object.keys(staticFormats).forEach(c => cSet.add(c));
            staticSlides.filter(s => s.deck_type === 'company').forEach(s => cSet.add(s.company));

            staticCompanies = Array.from(cSet).sort();

            statQuestions.textContent = staticQuestions.length;
            statCompanies.textContent = staticCompanies.length;
            statFormats.textContent = Object.keys(staticFormats).length;
            statSlides.textContent = staticSlides.length;

            populateCompanySelect(staticCompanies);
        } catch (err) {
            console.error("Error loading static datasets:", err);
        }
    }

    function populateCompanySelect(companies) {
        companySelect.innerHTML = '<option value="">-- Choose a company --</option>';
        companies.forEach(company => {
            const opt = document.createElement('option');
            opt.value = company;
            opt.textContent = company;
            companySelect.appendChild(opt);
        });
    }

    // 4. Catalog Fuzzy Search Logic
    async function handleFuzzySearch(query) {
        if (!query || !query.trim()) {
            hideMatchBanner();
            return;
        }

        const qClean = query.trim();

        if (!useStaticFallback) {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(qClean)}`);
                if (res.ok) {
                    const searchRes = await res.json();
                    if (searchRes.matched_company) {
                        showMatchBanner(qClean, searchRes.matched_company, searchRes.score || 0);
                        loadCompanyDetails(searchRes.matched_company);
                        return;
                    }
                }
            } catch (err) {
                console.error("API search failed, falling back to static search:", err);
            }
        }

        // Static Client-side Fuzzy Search Fallback
        const matched = performStaticFuzzySearch(qClean);
        if (matched.company) {
            showMatchBanner(qClean, matched.company, matched.score);
            loadCompanyDetails(matched.company);
        } else {
            hideMatchBanner();
        }
    }

    function performStaticFuzzySearch(query) {
        const qLower = query.toLowerCase();
        for (let c of staticCompanies) {
            if (c.toLowerCase() === qLower) return { company: c, score: 100.0 };
        }
        for (let c of staticCompanies) {
            if (c.toLowerCase().includes(qLower) || qLower.includes(c.toLowerCase())) {
                return { company: c, score: 85.0 };
            }
        }
        return { company: staticCompanies[0] || null, score: 50.0 };
    }

    function showMatchBanner(query, company, score) {
        if (!matchBanner) return;
        matchBanner.classList.remove('hidden', 'success', 'warning');
        if (score >= 80) {
            matchBanner.classList.add('success');
            matchBanner.innerHTML = `✅ Exact/High Match: <strong>${company}</strong> (Score: ${Math.round(score)}%)`;
        } else {
            matchBanner.classList.add('warning');
            matchBanner.innerHTML = `🔍 Closest Match for "${query}": <strong>${company}</strong> (Score: ${Math.round(score)}%)`;
        }
    }

    function hideMatchBanner() {
        if (matchBanner) matchBanner.classList.add('hidden');
    }

    // 5. Load Company Details
    async function loadCompanyDetails(companyName) {
        if (!companyName) {
            landingDashboard.classList.remove('hidden');
            companyContent.classList.add('hidden');
            currentCompanyData = null;
            return;
        }

        if (!useStaticFallback) {
            try {
                const res = await fetch(`/api/company?name=${encodeURIComponent(companyName)}`);
                if (res.ok) {
                    currentCompanyData = await res.json();
                    renderCompanyDataUI();
                    return;
                }
            } catch (err) {
                console.error("API fetch company failed, falling back:", err);
            }
        }

        // Static Client-side Company Details Builder
        const cQuestions = staticQuestions.filter(q => q.company === companyName);
        const fText = staticFormats[companyName] || null;
        let ind = staticIndustries[companyName];
        if (!ind && cQuestions.length > 0) ind = cQuestions[0].industry;
        if (!ind) ind = "Other";

        const cSlides = staticSlides.filter(s => s.company === companyName && s.deck_type === 'company');
        const iSlides = ind !== "Other" ? staticSlides.filter(s => s.company.toLowerCase() === ind.toLowerCase() && s.deck_type === 'industry') : [];

        const compExps = experiencesList.filter(e => e.company === companyName);
        const compStats = experienceStatsData && experienceStatsData.company_stats ? experienceStatsData.company_stats[companyName] : null;

        currentCompanyData = {
            company: companyName,
            industry: ind,
            questions: cQuestions,
            format_text: fText,
            company_slides: cSlides,
            industry_slides: iSlides,
            experiences: compExps,
            experience_stats: compStats
        };

        renderCompanyDataUI();
    }

    function renderCompanyDataUI() {
        if (!currentCompanyData) return;

        landingDashboard.classList.add('hidden');
        companyContent.classList.remove('hidden');

        displayCompanyName.textContent = currentCompanyData.company;
        displaySectorName.textContent = `Sector: ${currentCompanyData.industry || 'Other'}`;

        renderCurrentView();
    }

    function renderCurrentView() {
        if (currentViewMode === 'basic') {
            renderBasicView();
        } else {
            renderAdvancedView();
        }
    }

    function renderBasicView() {
        const qCount = currentCompanyData.questions ? currentCompanyData.questions.length : 0;
        const slidesCount = currentCompanyData.company_slides ? currentCompanyData.company_slides.length : 0;
        const hasFormat = !!currentCompanyData.format_text;

        basicStatQuestions.textContent = qCount;
        basicStatCycles.textContent = currentCompanyData.questions ? new Set(currentCompanyData.questions.map(q => q.year)).size : 0;
        basicStatSlides.textContent = slidesCount;
        basicStatStatus.textContent = hasFormat ? "Detailed" : "Standard";

        if (hasFormat) {
            basicOverviewSection.classList.remove('hidden');
            basicOverviewText.innerHTML = renderMarkdownOrTable(currentCompanyData.format_text);
        } else {
            basicOverviewSection.classList.add('hidden');
        }

        if (qCount > 0) {
            basicQuestionsSection.classList.remove('hidden');
            basicQuestionsContainer.innerHTML = '';
            const topQ = currentCompanyData.questions.slice(0, 5);
            topQ.forEach(q => {
                const item = document.createElement('div');
                item.className = 'question-card mb-3';
                item.innerHTML = `
                    <div class="question-meta">
                        <span class="tag-base tag-${getCategoryTagClass(q.question_type)}">${q.question_type}</span>
                        <span class="question-domain">${q.domain} &bull; ${q.year}</span>
                    </div>
                    <div class="question-text">${escapeHtml(q.question)}</div>
                `;
                basicQuestionsContainer.appendChild(item);
            });
        } else {
            basicQuestionsSection.classList.add('hidden');
        }
    }

    function renderAdvancedView() {
        // Questions Tab
        questionsContainer.innerHTML = '';
        if (currentCompanyData.questions && currentCompanyData.questions.length > 0) {
            const byYear = {};
            currentCompanyData.questions.forEach(q => {
                if (!byYear[q.year]) byYear[q.year] = [];
                byYear[q.year].push(q);
            });

            Object.keys(byYear).sort().reverse().forEach(year => {
                const group = document.createElement('div');
                group.className = 'year-group';
                
                const header = document.createElement('div');
                header.className = 'year-header';
                header.innerHTML = `<span>📅 Batch Year: ${year}</span> <span>${byYear[year].length} questions ▼</span>`;
                
                const qList = document.createElement('div');
                qList.className = 'year-questions-list';
                
                byYear[year].forEach(q => {
                    const qCard = document.createElement('div');
                    qCard.className = 'question-card';
                    qCard.innerHTML = `
                        <div class="question-meta">
                            <span class="tag-base tag-${getCategoryTagClass(q.question_type)}">${q.question_type}</span>
                            <span class="question-domain">${q.domain}</span>
                        </div>
                        <div class="question-text">${escapeHtml(q.question)}</div>
                    `;
                    qList.appendChild(qCard);
                });

                header.addEventListener('click', () => qList.classList.toggle('hidden'));
                
                group.appendChild(header);
                group.appendChild(qList);
                questionsContainer.appendChild(group);
            });
        } else {
            questionsContainer.innerHTML = '<div class="format-card">No interview questions recorded for this company yet.</div>';
        }

        // Format Details Tab
        formatContainer.innerHTML = '';
        if (currentCompanyData.format_text) {
            formatContainer.innerHTML = renderMarkdownOrTable(currentCompanyData.format_text);
        } else {
            formatContainer.innerHTML = '<div style="color: var(--text-muted);">No specific interview format document recorded for this company.</div>';
        }

        // Slides Tab
        companySlidesContainer.innerHTML = '';
        if (currentCompanyData.company_slides && currentCompanyData.company_slides.length > 0) {
            currentCompanyData.company_slides.forEach(s => {
                const sCard = document.createElement('div');
                sCard.className = 'slide-card';
                sCard.innerHTML = `
                    <div class="slide-header">Slide ${s.slide_number}: ${escapeHtml(s.slide_title)}</div>
                    <div class="slide-text">${escapeHtml(s.slide_text)}</div>
                `;
                companySlidesContainer.appendChild(sCard);
            });
        } else {
            companySlidesContainer.innerHTML = '<div class="format-card">No company presentation slides available.</div>';
        }

        industrySlidesContainer.innerHTML = '';
        if (currentCompanyData.industry_slides && currentCompanyData.industry_slides.length > 0) {
            currentCompanyData.industry_slides.forEach(s => {
                const sCard = document.createElement('div');
                sCard.className = 'slide-card';
                sCard.innerHTML = `
                    <div class="slide-header">Sector Deck - Slide ${s.slide_number}: ${escapeHtml(s.slide_title)}</div>
                    <div class="slide-text">${escapeHtml(s.slide_text)}</div>
                `;
                industrySlidesContainer.appendChild(sCard);
            });
        } else {
            industrySlidesContainer.innerHTML = '<div class="format-card">No industry sector slides available.</div>';
        }
    }

    function getCategoryTagClass(qType) {
        if (!qType) return 'unknown';
        const t = qType.toLowerCase();
        if (t.includes('gd')) return 'gd';
        if (t.includes('domain')) return 'domain';
        if (t.includes('behavioural') || t.includes('situational')) return 'behavioural';
        if (t.includes('technical')) return 'technical';
        if (t.includes('hr') || t.includes('current')) return 'hr';
        return 'unknown';
    }

    // =======================================================
    // 6. INTERVIEW EXPERIENCES DATABASE CONTROLLER & VIEWS
    // =======================================================
    async function loadExperiencesData() {
        if (isExperiencesLoaded) return;

        try {
            const [expRes, statsRes] = await Promise.all([
                fetch('/api/experiences').catch(() => null),
                fetch('/api/experiences/stats').catch(() => null)
            ]);

            if (expRes && expRes.ok) {
                const data = await expRes.json();
                experiencesList = data.experiences || [];
            }
            if (statsRes && statsRes.ok) {
                experienceStatsData = await statsRes.json();
            }
        } catch (e) {
            console.log("Experiences API not available, loading static JSON...");
        }

        // Static fallback for experiences
        if (!experiencesList || experiencesList.length === 0) {
            try {
                const [expStatic, statsStatic] = await Promise.all([
                    fetch('interview_experiences_data.json').catch(() => null),
                    fetch('interview_experience_stats.json').catch(() => null)
                ]);

                if (expStatic && expStatic.ok) experiencesList = await expStatic.json();
                if (statsStatic && statsStatic.ok) experienceStatsData = await statsStatic.json();
            } catch (err) {
                console.error("Error loading interview experiences static data:", err);
            }
        }

        isExperiencesLoaded = true;

        populateExperienceFilters();
        applyExperienceFilters();
    }

    // Render Landing Visual Summary Charts & Dynamic Domain Distribution
    function renderExperiencesHeroAnalytics(activeList) {
        const list = activeList || filteredExperiences || experiencesList || [];
        const totalExps = list.length;

        // 1. Stat Card 1: Student Experiences / Transcripts
        if (expStatTotal) expStatTotal.textContent = totalExps.toLocaleString();

        // 2. Stat Card 2: Unique Companies Tracked
        const uniqueCos = new Set(list.map(e => e.company)).size;
        if (expStatCompanies) expStatCompanies.textContent = uniqueCos.toLocaleString();

        // 3. Stat Card 3: Functional Domains
        const uniqueDomains = new Set(list.map(e => e.domain)).size;
        if (expStatDomains) expStatDomains.textContent = uniqueDomains.toLocaleString();

        // 4. Stat Card 4: Avg Rounds (Excl HR)
        const roundValues = list.map(e => e.interview_rounds).filter(r => typeof r === 'number' && !isNaN(r));
        const avgRoundsVal = roundValues.length > 0 
            ? round1(roundValues.reduce((a, b) => a + b, 0) / roundValues.length) 
            : 0;
        if (expStatAvgRounds) expStatAvgRounds.textContent = avgRoundsVal > 0 ? avgRoundsVal : '2.4';

        // Filter Tag in Analytics Box Header
        const expAnalyticsFilterTag = document.getElementById('exp-analytics-filter-tag');
        const selectedCo = expFilterCompany ? expFilterCompany.value : '';
        if (expAnalyticsFilterTag) {
            expAnalyticsFilterTag.textContent = selectedCo ? `Company: ${selectedCo}` : (totalExps === experiencesList.length ? 'All Companies' : 'Filtered Selection');
        }

        // 5. Dynamic Question Types Distribution Across Domains Visual (Domain Cross-Tabulation)
        if (!domainTabsNavContainer || !domainBucketContentContainer) return;

        // Group activeList by domain
        const domainGroupMap = {};
        list.forEach(exp => {
            const d = exp.domain || 'Other';
            if (!domainGroupMap[d]) {
                domainGroupMap[d] = {
                    domain: d,
                    total_responses: 0,
                    technical: 0,
                    resume: 0,
                    hr: 0,
                    case: 0,
                    gk: 0,
                    situational: 0
                };
            }
            const item = domainGroupMap[d];
            item.total_responses += 1;

            const bFlags = exp.bucket_flags || {};
            const bList = exp.buckets || [];

            if (bFlags.technical || bList.includes('Technical/Domain')) item.technical += 1;
            if (bFlags.resume || bList.includes('Resume-based')) item.resume += 1;
            if (bFlags.hr || bList.includes('HR/Behavioral')) item.hr += 1;
            if (bFlags.case || bList.includes('Case/Guesstimate')) item.case += 1;
            if (bFlags.gk || bList.includes('Current Affairs/GK')) item.gk += 1;
            if (bFlags.situational || bList.includes('Situational')) item.situational += 1;
        });

        const domainList = Object.values(domainGroupMap).sort((a, b) => b.total_responses - a.total_responses);

        domainTabsNavContainer.innerHTML = '';
        if (domainList.length === 0) {
            domainBucketContentContainer.innerHTML = '<div style="color: var(--text-muted); padding: 1rem; text-align: center;">No domain distribution data available for current selection.</div>';
            return;
        }

        domainList.forEach((dItem, idx) => {
            const pill = document.createElement('button');
            pill.className = `domain-tab-pill ${idx === 0 ? 'active' : ''}`;
            pill.textContent = `${dItem.domain} (${dItem.total_responses})`;
            pill.addEventListener('click', () => {
                document.querySelectorAll('.domain-tab-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                renderDomainBucketDetails(dItem);
            });
            domainTabsNavContainer.appendChild(pill);
        });

        renderDomainBucketDetails(domainList[0]);
    }

    function renderDomainBucketDetails(dItem) {
        if (!domainBucketContentContainer || !dItem) return;

        const total = dItem.total_responses || 1;
        const buckets = [
            { name: "Technical/Domain", count: dItem.technical, pct: round1((dItem.technical / total) * 100), fill: "fill-technical" },
            { name: "Resume-based", count: dItem.resume, pct: round1((dItem.resume / total) * 100), fill: "fill-resume" },
            { name: "HR/Behavioral", count: dItem.hr, pct: round1((dItem.hr / total) * 100), fill: "fill-hr" },
            { name: "Case/Guesstimate", count: dItem.case, pct: round1((dItem.case / total) * 100), fill: "fill-case" },
            { name: "Current Affairs/GK", count: dItem.gk, pct: round1((dItem.gk / total) * 100), fill: "fill-gk" },
            { name: "Situational", count: dItem.situational, pct: round1((dItem.situational / total) * 100), fill: "fill-situational" }
        ];

        domainBucketContentContainer.innerHTML = `
            <div style="font-weight: 800; color: #1d4ed8; margin-bottom: 0.75rem; font-size: 0.95rem;">
                Question Bucket Frequency for Domain: <span style="color: #0f172a;">${escapeHtml(dItem.domain)}</span> (${dItem.total_responses} Responses)
            </div>
            <div class="bucket-bars-grid">
                ${buckets.map(b => `
                    <div class="bucket-bar-item">
                        <div class="bucket-bar-label">${b.name}</div>
                        <div class="bar-track">
                            <div class="bar-fill ${b.fill}" style="width: ${b.pct}%"></div>
                        </div>
                        <div class="bucket-bar-value">${b.pct}% (${b.count})</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function getBucketFillClass(bName) {
        const b = bName.toLowerCase();
        if (b.includes('technical')) return 'fill-technical';
        if (b.includes('resume')) return 'fill-resume';
        if (b.includes('hr')) return 'fill-hr';
        if (b.includes('case')) return 'fill-case';
        if (b.includes('gk') || b.includes('current')) return 'fill-gk';
        if (b.includes('situational')) return 'fill-situational';
        return 'fill-technical';
    }

    // Populate Filter Dropdowns
    function populateExperienceFilters() {
        // Companies
        const companies = Array.from(new Set(experiencesList.map(e => e.company))).sort();
        expFilterCompany.innerHTML = '<option value="">All Companies</option>';
        companies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            expFilterCompany.appendChild(opt);
        });

        // Domains
        const domains = Array.from(new Set(experiencesList.map(e => e.domain))).sort();
        expFilterDomain.innerHTML = '<option value="">All Domains</option>';
        domains.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            expFilterDomain.appendChild(opt);
        });

        // Years
        const years = Array.from(new Set(experiencesList.map(e => e.year))).sort();
        expFilterYear.innerHTML = '<option value="">All Years</option>';
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            expFilterYear.appendChild(opt);
        });

        // Process Types
        const processes = Array.from(new Set(experiencesList.map(e => e.process_type))).sort();
        expFilterProcess.innerHTML = '<option value="">All Process Types</option>';
        processes.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            expFilterProcess.appendChild(opt);
        });
    }

    // Event Listeners for Filters
    expFilterCompany.addEventListener('change', () => applyExperienceFilters());
    expFilterDomain.addEventListener('change', () => applyExperienceFilters());
    expFilterYear.addEventListener('change', () => applyExperienceFilters());
    expFilterProcess.addEventListener('change', () => applyExperienceFilters());

    expFilterSearch.addEventListener('input', () => {
        clearTimeout(expDebounceTimer);
        expDebounceTimer = setTimeout(() => applyExperienceFilters(), 250);
    });

    expClearSearch.addEventListener('click', () => {
        expFilterSearch.value = '';
        applyExperienceFilters();
    });

    expBtnReset.addEventListener('click', () => {
        expFilterCompany.value = '';
        expFilterDomain.value = '';
        expFilterYear.value = '';
        expFilterProcess.value = '';
        expFilterSearch.value = '';
        applyExperienceFilters();
    });

    expBtnLoadMore.addEventListener('click', () => {
        displayedCardCount += 20;
        renderExperienceCards();
    });

    // Apply Filter Logic
    function applyExperienceFilters() {
        const cVal = expFilterCompany.value.toLowerCase();
        const dVal = expFilterDomain.value.toLowerCase();
        const yVal = expFilterYear.value.toLowerCase();
        const pVal = expFilterProcess.value.toLowerCase();
        const sVal = expFilterSearch.value.trim().toLowerCase();

        filteredExperiences = experiencesList.filter(exp => {
            if (cVal && exp.company.toLowerCase() !== cVal) return false;
            if (dVal && exp.domain.toLowerCase() !== dVal) return false;
            if (yVal && exp.year.toLowerCase() !== yVal) return false;
            if (pVal && exp.process_type.toLowerCase() !== pVal) return false;

            if (sVal) {
                const searchable = `${exp.company} ${exp.domain} ${exp.role_offered} ${exp.pre_process_tips} ${exp.gd_topics_tips} ${exp.interview_outline} ${exp.domain_questions} ${exp.hr_gk_questions} ${exp.prep_resources} ${exp.tips} ${exp.tech_skills} ${exp.dos_and_donts}`.toLowerCase();
                if (!searchable.includes(sVal)) return false;
            }
            return true;
        });

        // Always sort by word count descending (entries with most words first)
        filteredExperiences.sort((a, b) => {
            const wA = a.word_count !== undefined ? a.word_count : getExpWordCount(a);
            const wB = b.word_count !== undefined ? b.word_count : getExpWordCount(b);
            return wB - wA;
        });

        displayedCardCount = 20;
        renderActiveFilterTags(cVal, dVal, yVal, pVal, sVal);
        renderExperiencesHeroAnalytics(filteredExperiences);
        renderExperienceCards();
    }

    function getExpWordCount(exp) {
        if (exp.word_count !== undefined) return exp.word_count;
        const text = [
            exp.pre_process_tips, exp.gd_topics_tips, exp.interview_outline,
            exp.domain_questions, exp.situational_questions, exp.hr_gk_questions,
            exp.prep_resources, exp.looking_for, exp.right_wrong, exp.tips,
            exp.tech_skills, exp.dos_and_donts, exp.additional_remarks
        ].filter(Boolean).join(' ');
        return text.trim() ? text.trim().split(/\s+/).length : 0;
    }

    function renderActiveFilterTags(cVal, dVal, yVal, pVal, sVal) {
        activeFilterTagsContainer.innerHTML = '';
        const tags = [];
        if (cVal) tags.push(`Co: ${expFilterCompany.value}`);
        if (dVal) tags.push(`Domain: ${expFilterDomain.value}`);
        if (yVal) tags.push(`Year: ${expFilterYear.value}`);
        if (pVal) tags.push(`Process: ${expFilterProcess.value}`);
        if (sVal) tags.push(`Keyword: "${sVal}"`);

        tags.forEach(t => {
            const pill = document.createElement('span');
            pill.className = 'filter-tag-pill';
            pill.textContent = t;
            activeFilterTagsContainer.appendChild(pill);
        });
    }

    // Render Experience Response Cards Grid
    function renderExperienceCards() {
        expShowingCount.textContent = filteredExperiences.length.toLocaleString();
        expCardsContainer.innerHTML = '';

        if (filteredExperiences.length === 0) {
            expCardsContainer.innerHTML = `
                <div class="format-card search-span-full" style="text-align: center; padding: 3rem;">
                    <h3>No interview experiences match your selected filters.</h3>
                    <p style="color: var(--text-muted); margin-top: 0.5rem;">Try broadening your filter criteria or clicking "Reset Filters".</p>
                </div>
            `;
            expLoadMoreContainer.classList.add('hidden');
            return;
        }

        const visibleItems = filteredExperiences.slice(0, displayedCardCount);

        visibleItems.forEach(exp => {
            const card = document.createElement('div');
            card.className = 'experience-card';

            // Lookup Company At-a-Glance Stats
            const cStats = experienceStatsData && experienceStatsData.company_stats ? experienceStatsData.company_stats[exp.company] : null;
            const avgRounds = cStats ? cStats.avg_rounds : (exp.interview_rounds || 2);
            const gdPct = cStats ? cStats.gd_conducted_pct : (exp.gd_conducted === 'Yes' ? 100 : 0);
            const buddyPct = cStats ? cStats.buddy_round_pct : (exp.buddy_round === 'Yes' ? 100 : 0);
            const topBuckets = cStats && cStats.top_buckets ? cStats.top_buckets : exp.buckets;
            const wordCount = exp.word_count !== undefined ? exp.word_count : getExpWordCount(exp);

            const snippetText = exp.pre_process_tips || exp.interview_outline || exp.tips || exp.domain_questions || "Detailed interview experience record available. Click to read full candidate outline and GD topics.";

            card.innerHTML = `
                <div>
                    <div class="exp-card-header">
                        <div>
                            <div class="exp-card-company">${escapeHtml(exp.company)}</div>
                            <h3>${escapeHtml(exp.role_offered || 'Management Trainee / Role Offered')}</h3>
                        </div>
                        ${exp.converted ? `<span class="badge-converted-tag">Converted</span>` : ''}
                    </div>

                    <div class="meta-badges-row">
                        <span class="badge-domain-tag">💼 ${escapeHtml(exp.domain)}</span>
                        <span class="badge-year-tag">📅 ${escapeHtml(exp.year)}</span>
                        <span class="badge-process-tag">🎯 ${escapeHtml(exp.process_type)}</span>
                    </div>

                    <!-- Company At-a-Glance Badges Bar -->
                    <div class="at-a-glance-bar">
                        <span class="glance-pill pill-words" title="Total Word Count of Response">📝 ${wordCount.toLocaleString()} words</span>
                        <span class="glance-pill pill-rounds" title="Average Interview Rounds">🎯 Avg ${avgRounds} Rounds</span>
                        <span class="glance-pill ${exp.gd_conducted === 'Yes' ? 'pill-gd-yes' : 'pill-gd-no'}">
                            🗣️ GD: ${exp.gd_conducted === 'Yes' ? 'Yes' : 'No'}
                        </span>
                        <span class="glance-pill ${exp.buddy_round === 'Yes' ? 'pill-buddy-yes' : 'pill-buddy-no'}">
                            👥 Buddy: ${exp.buddy_round === 'Yes' ? 'Yes' : 'No'}
                        </span>
                        ${topBuckets.slice(0, 2).map(b => `<span class="bucket-tag-pill">${escapeHtml(b)}</span>`).join('')}
                    </div>

                    <div class="exp-card-snippet">${escapeHtml(snippetText)}</div>
                </div>

                <div class="exp-card-footer">
                    <button class="btn-read-exp" data-id="${exp.id}">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">visibility</span> Read Full Experience
                    </button>
                </div>
            `;

            card.querySelector('.btn-read-exp').addEventListener('click', () => openExperienceModal(exp));
            expCardsContainer.appendChild(card);
        });

        if (displayedCardCount < filteredExperiences.length) {
            expLoadMoreContainer.classList.remove('hidden');
        } else {
            expLoadMoreContainer.classList.add('hidden');
        }
    }

    // 7. Drill-Down Experience Modal Controller
    function openExperienceModal(exp) {
        modalExpCompany.textContent = exp.company;
        modalExpDomain.textContent = exp.domain;
        modalExpYear.textContent = exp.year;
        modalExpProcess.textContent = exp.process_type;
        modalExpTitle.textContent = exp.role_offered || `Interview Experience #${exp.id}`;

        if (exp.converted) {
            modalExpConverted.classList.remove('hidden');
            modalExpConverted.textContent = `Converted: ${exp.converted}`;
        } else {
            modalExpConverted.classList.add('hidden');
        }

        // Render Company At-a-Glance Summary in Modal
        const cStats = experienceStatsData && experienceStatsData.company_stats ? experienceStatsData.company_stats[exp.company] : null;
        if (cStats) {
            modalCompanySummaryBox.classList.remove('hidden');
            modalCompanySummaryBox.innerHTML = `
                <div style="font-weight: 800; font-size: 1.05rem; color: #0f172a; margin-bottom: 0.55rem;">
                    📊 Company Intelligence Summary: <span style="color: #1d4ed8;">${escapeHtml(exp.company)}</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 1.25rem; font-size: 0.9rem; color: #334155; font-weight: 500;">
                    <div>🎯 <strong style="color: #0f172a;">Avg Interview Rounds:</strong> ${cStats.avg_rounds} (Excl. HR)</div>
                    <div>🗣️ <strong style="color: #0f172a;">GD Conducted:</strong> ${cStats.gd_conducted_count}/${cStats.total_experiences} (${cStats.gd_conducted_pct}%)</div>
                    <div>👥 <strong style="color: #0f172a;">Buddy Round:</strong> ${cStats.buddy_round_count}/${cStats.total_experiences} (${cStats.buddy_round_pct}%)</div>
                    <div>🏷️ <strong style="color: #0f172a;">Top Question Types:</strong> ${cStats.top_buckets.join(', ')}</div>
                </div>
            `;
        } else {
            modalCompanySummaryBox.classList.add('hidden');
        }

        // Fill modal section contents
        setModalSectionText(modalExpPreProcess, 'box-pre-process', exp.pre_process_tips);
        setModalSectionText(modalExpUg, 'box-ug', exp.ug_background);
        setModalSectionText(modalExpCertifications, 'box-certifications', exp.certifications);
        setModalSectionText(modalExpGdTopics, 'box-gd-details', exp.gd_topics_tips ? `GD Conducted: ${exp.gd_conducted}\nGD Duration: ${exp.gd_duration || 'N/A'}\n\n${exp.gd_topics_tips}` : null);
        setModalSectionText(modalExpOutline, 'box-interview-outline', exp.interview_outline ? `Interview Rounds: ${exp.interview_rounds || 'N/A'}\nDuration Details: ${exp.no_interviews_duration || 'N/A'}\n\n${exp.interview_outline}` : null);
        setModalSectionText(modalExpTechSkills, 'box-tech-skills', exp.tech_skills);
        setModalSectionText(modalExpDomainQ, 'box-domain-q', exp.domain_questions);
        setModalSectionText(modalExpHrQ, 'box-hr-q', exp.hr_gk_questions);
        setModalSectionText(modalExpSituationalQ, 'box-situational-q', exp.situational_questions);
        setModalSectionText(modalExpResources, 'box-resources', exp.prep_resources);
        setModalSectionText(modalExpLookingFor, 'box-looking-for', exp.looking_for);
        setModalSectionText(modalExpRightWrong, 'box-right-wrong', exp.right_wrong);
        setModalSectionText(modalExpDosDonts, 'box-dos-donts', exp.dos_and_donts);
        setModalSectionText(modalExpTips, 'box-tips', exp.tips || exp.additional_remarks);

        // Reset modal tabs to first active tab
        setModalTab('modal-tab-overview');

        experienceModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function setModalSectionText(element, boxId, text) {
        const box = document.getElementById(boxId);
        if (text && text.trim()) {
            element.innerHTML = renderMarkdownOrTable(text.trim());
            if (box) box.classList.remove('hidden');
        } else {
            element.innerHTML = '';
            if (box) box.classList.add('hidden');
        }
    }

    // Smart Markdown & Pipe-Table Parser Renderer
    function renderMarkdownOrTable(rawText) {
        if (!rawText || !rawText.trim()) return '<div style="color: var(--text-muted);">No details recorded.</div>';

        // Clean unicode bullets and special whitespace
        let cleaned = rawText
            .replace(/[\uF0B7\u2022\u2023\u2043\u204F\u2219]/g, '• ')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"');

        const lines = cleaned.split('\n');
        let htmlResult = '';
        let inTable = false;
        let tableRows = [];

        function flushTable() {
            if (!inTable || tableRows.length === 0) return '';
            
            let tableHtml = '<div class="md-table-wrapper"><table class="md-styled-table">';
            let isFirstHeader = false;
            
            if (tableRows.length > 1 && /^\|?\s*:?-+:?\s*(\||\s*:?-+:?\s*)*\|?$/.test(tableRows[1].join('|'))) {
                isFirstHeader = true;
            }

            tableRows.forEach((rowCells, rIdx) => {
                const rowStr = rowCells.join('').trim();
                if (/^[-:\s|]+$/.test(rowStr)) return; // Skip divider rows like | --- | --- |

                if (rIdx === 0 && isFirstHeader) {
                    tableHtml += '<thead><tr>';
                    rowCells.forEach(cell => {
                        tableHtml += `<th>${formatInlineMarkdown(cell)}</th>`;
                    });
                    tableHtml += '</tr></thead><tbody>';
                } else {
                    if (rIdx === 0 && !isFirstHeader) tableHtml += '<tbody>';
                    tableHtml += '<tr>';
                    rowCells.forEach((cell, cIdx) => {
                        const cellFormatted = formatInlineMarkdown(cell);
                        if (cIdx === 0 && rowCells.length === 2 && !cellFormatted.startsWith('<strong>')) {
                            tableHtml += `<td><strong>${cellFormatted}</strong></td>`;
                        } else {
                            tableHtml += `<td>${cellFormatted}</td>`;
                        }
                    });
                    tableHtml += '</tr>';
                }
            });

            tableHtml += '</tbody></table></div>';
            inTable = false;
            tableRows = [];
            return tableHtml;
        }

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            if (line.includes('|') && (line.startsWith('|') || line.endsWith('|') || line.split('|').length > 2)) {
                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                }
                let cells = line.split('|').map(c => c.trim());
                if (cells.length > 0 && cells[0] === '') cells.shift();
                if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();

                if (cells.length > 0) {
                    tableRows.push(cells);
                }
                continue;
            }

            if (inTable) {
                htmlResult += flushTable();
            }

            if (!line) {
                continue;
            }

            if (line.startsWith('### ')) {
                htmlResult += `<h4 class="md-h4">${formatInlineMarkdown(line.slice(4))}</h4>`;
            } else if (line.startsWith('## ')) {
                htmlResult += `<h3 class="md-h3">${formatInlineMarkdown(line.slice(3))}</h3>`;
            } else if (line.startsWith('# ')) {
                htmlResult += `<h2 class="md-h2">${formatInlineMarkdown(line.slice(2))}</h2>`;
            } else if (line.startsWith('---') || line.startsWith('***')) {
                htmlResult += `<hr class="md-hr"/>`;
            } else if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
                const bulletText = line.replace(/^[•\-\*]\s*/, '');
                htmlResult += `<div class="md-bullet-item"><span class="md-bullet-dot">•</span> <span>${formatInlineMarkdown(bulletText)}</span></div>`;
            } else {
                htmlResult += `<p class="md-para">${formatInlineMarkdown(line)}</p>`;
            }
        }

        if (inTable) {
            htmlResult += flushTable();
        }

        return htmlResult;
    }

    function formatInlineMarkdown(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    // Modal Tabs Switcher
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            setModalTab(target);
        });
    });

    function setModalTab(targetPaneId) {
        document.querySelectorAll('.modal-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === targetPaneId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        document.querySelectorAll('.modal-tab-pane').forEach(pane => {
            if (pane.id === targetPaneId) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        });
    }

    function closeExperienceModal() {
        experienceModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    modalExpClose.addEventListener('click', closeExperienceModal);

    experienceModal.addEventListener('click', (e) => {
        if (e.target === experienceModal) closeExperienceModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !experienceModal.classList.contains('hidden')) {
            closeExperienceModal();
        }
    });

    // Helper Utility Functions
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function round1(val) {
        return Math.round(val * 10) / 10;
    }

    // Search input listeners (Catalog Section)
    fuzzySearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            handleFuzzySearch(val);
        }, 300);
    });

    clearSearchBtn.addEventListener('click', () => {
        fuzzySearchInput.value = '';
        clearSearchBtn.style.display = 'none';
        hideMatchBanner();
        loadCompanyDetails('');
    });

    companySelect.addEventListener('change', (e) => {
        const val = e.target.value;
        fuzzySearchInput.value = '';
        clearSearchBtn.style.display = 'none';
        hideMatchBanner();
        loadCompanyDetails(val);
    });

    // Initial Kickoff
    loadCatalog();
    loadExperiencesData();
});
