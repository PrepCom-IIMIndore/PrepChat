// PrepChat - Frontend JS (Basic & Advanced View Modes)

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const fuzzySearchInput = document.getElementById('fuzzy-search-input');
    const companySelect = document.getElementById('company-select');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const matchBanner = document.getElementById('match-banner');
    
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

    // App State
    let currentViewMode = 'basic'; // 'basic' | 'advanced'
    let currentCompanyData = null;
    let debounceTimer = null;

    // 1. View Switcher Event Handlers
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
        document.getElementById(targetPaneId).classList.remove('hidden');
    }

    advBtnQuestions.addEventListener('click', () => setAdvNavTab('adv-pane-questions', advBtnQuestions));
    advBtnFormat.addEventListener('click', () => setAdvNavTab('adv-pane-format', advBtnFormat));
    advBtnSlides.addEventListener('click', () => setAdvNavTab('adv-pane-slides', advBtnSlides));

    // 2. Load Initial Catalog & Stats
    async function loadCatalog() {
        try {
            const res = await fetch('/api/companies');
            if (!res.ok) throw new Error("Failed to load catalog");
            const data = await res.json();

            if (data.stats) {
                statQuestions.textContent = data.stats.total_questions || 0;
                statCompanies.textContent = data.stats.total_companies || 0;
                statFormats.textContent = data.stats.total_formats || 0;
                statSlides.textContent = data.stats.total_slides || 0;
            }

            if (data.companies && Array.isArray(data.companies)) {
                companySelect.innerHTML = '<option value="">-- Choose a company --</option>';
                data.companies.forEach(company => {
                    const opt = document.createElement('option');
                    opt.value = company;
                    opt.textContent = company;
                    companySelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Error loading catalog:", err);
        }
    }

    // 3. Perform Fuzzy Search
    async function handleFuzzySearch(query) {
        if (!query || !query.trim()) {
            hideMatchBanner();
            return;
        }

        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
            if (!res.ok) throw new Error("Search request failed");
            const searchRes = await res.json();

            if (searchRes.matched_company) {
                const score = searchRes.score || 0;
                showMatchBanner(query, searchRes.matched_company, score);
                loadCompanyDetails(searchRes.matched_company);
            } else {
                hideMatchBanner();
            }
        } catch (err) {
            console.error("Error during fuzzy search:", err);
        }
    }

    // 4. Fetch Company Details
    async function loadCompanyDetails(companyName) {
        if (!companyName) {
            landingDashboard.classList.remove('hidden');
            companyContent.classList.add('hidden');
            currentCompanyData = null;
            return;
        }

        try {
            const res = await fetch(`/api/company?name=${encodeURIComponent(companyName)}`);
            if (!res.ok) throw new Error("Company fetch failed");
            currentCompanyData = await res.json();

            landingDashboard.classList.add('hidden');
            companyContent.classList.remove('hidden');

            displayCompanyName.textContent = currentCompanyData.company;
            displaySectorName.textContent = `Sector: ${currentCompanyData.industry || 'Other'}`;

            renderCurrentView();

        } catch (err) {
            console.error("Error loading company details:", err);
        }
    }

    // 5. Render View Based on State
    function renderCurrentView() {
        if (!currentCompanyData) return;

        if (currentViewMode === 'basic') {
            renderBasicView(currentCompanyData);
        } else {
            renderAdvancedView(currentCompanyData);
        }
    }

    // =========================================================
    // BASIC VIEW RENDERER
    // =========================================================
    function renderBasicView(data) {
        const questions = data.questions || [];
        const slides = (data.company_slides || []).concat(data.industry_slides || []);
        
        // Bento Metrics
        basicStatQuestions.textContent = questions.length;
        
        const yearsSet = new Set(questions.map(q => q.year).filter(Boolean));
        basicStatCycles.textContent = yearsSet.size;
        
        basicStatSlides.textContent = slides.length;
        basicStatStatus.textContent = data.format_text ? "Available" : "N/A";

        // Executive Overview Card
        if (data.format_text && data.format_text.trim()) {
            // Snippet first 400 chars for executive overview
            let snippet = data.format_text.trim();
            if (snippet.length > 500) {
                snippet = snippet.substring(0, 500) + "...";
            }
            basicOverviewText.textContent = snippet;
            basicOverviewSection.classList.remove('hidden');
        } else {
            basicOverviewSection.classList.add('hidden');
        }

        // Top Questions Preview (Top 5)
        if (questions.length > 0) {
            basicQuestionsContainer.innerHTML = '';
            const top5 = questions.slice(0, 5);
            
            top5.forEach(q => {
                const card = document.createElement('div');
                card.className = 'question-card';

                const qType = (q.question_type || 'General').toLowerCase();
                let tagClass = 'tag-unknown';
                if (qType.includes('gd')) tagClass = 'tag-gd';
                else if (qType.includes('domain')) tagClass = 'tag-domain';
                else if (qType.includes('behavioural') || qType.includes('situational')) tagClass = 'tag-behavioural';
                else if (qType.includes('technical')) tagClass = 'tag-technical';
                else if (qType.includes('hr')) tagClass = 'tag-hr';

                card.innerHTML = `
                    <div class="question-meta">
                        <span class="tag-base ${tagClass}">${escapeHtml(q.question_type)}</span>
                        <span class="question-domain">${escapeHtml(q.domain || '')} (${escapeHtml(q.year || '')})</span>
                    </div>
                    <div class="question-text">${escapeHtml(q.question)}</div>
                `;
                basicQuestionsContainer.appendChild(card);
            });
            
            basicQuestionsSection.classList.remove('hidden');
        } else {
            basicQuestionsSection.classList.add('hidden');
        }
    }

    // =========================================================
    // ADVANCED VIEW RENDERER
    // =========================================================
    function renderAdvancedView(data) {
        // Questions
        if (data.questions && data.questions.length > 0) {
            renderQuestions(data.questions);
            advBtnQuestions.style.display = 'inline-flex';
        } else {
            advBtnQuestions.style.display = 'none';
        }

        // Format
        if (data.format_text && data.format_text.trim()) {
            formatContainer.textContent = data.format_text;
            advBtnFormat.style.display = 'inline-flex';
        } else {
            advBtnFormat.style.display = 'none';
        }

        // Decks
        const hasCompanySlides = data.company_slides && data.company_slides.length > 0;
        const hasIndustrySlides = data.industry_slides && data.industry_slides.length > 0;

        if (hasCompanySlides || hasIndustrySlides) {
            renderSlides(data.company_slides || [], data.industry_slides || [], data.industry);
            advBtnSlides.style.display = 'inline-flex';
        } else {
            advBtnSlides.style.display = 'none';
        }

        // Set default active tab in advanced view
        if (data.questions && data.questions.length > 0) {
            setAdvNavTab('adv-pane-questions', advBtnQuestions);
        } else if (data.format_text && data.format_text.trim()) {
            setAdvNavTab('adv-pane-format', advBtnFormat);
        } else if (hasCompanySlides || hasIndustrySlides) {
            setAdvNavTab('adv-pane-slides', advBtnSlides);
        }
    }

    // Helper: Render Questions Grouped by Year
    function renderQuestions(questions) {
        questionsContainer.innerHTML = '';

        const byYear = {};
        questions.forEach(q => {
            const year = q.year || 'Unknown';
            if (!byYear[year]) byYear[year] = [];
            byYear[year].push(q);
        });

        const sortedYears = Object.keys(byYear).sort().reverse();

        sortedYears.forEach(year => {
            const yearQs = byYear[year];

            const groupDiv = document.createElement('div');
            groupDiv.className = 'year-group';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'year-header';
            headerDiv.innerHTML = `<span>🗓️ Recruitment Cycle: ${year} (${yearQs.length} Questions)</span> <span class="accordion-arrow">&#9660;</span>`;

            const listDiv = document.createElement('div');
            listDiv.className = 'year-questions-list';

            headerDiv.addEventListener('click', () => {
                const isHidden = listDiv.classList.toggle('hidden');
                const arrow = headerDiv.querySelector('.accordion-arrow');
                if (arrow) {
                    arrow.innerHTML = isHidden ? '&#9654;' : '&#9660;';
                }
            });

            yearQs.forEach(q => {
                const card = document.createElement('div');
                card.className = 'question-card';

                const qType = (q.question_type || 'General').toLowerCase();
                let tagClass = 'tag-unknown';
                if (qType.includes('gd')) tagClass = 'tag-gd';
                else if (qType.includes('domain')) tagClass = 'tag-domain';
                else if (qType.includes('behavioural') || qType.includes('situational')) tagClass = 'tag-behavioural';
                else if (qType.includes('technical')) tagClass = 'tag-technical';
                else if (qType.includes('hr')) tagClass = 'tag-hr';

                card.innerHTML = `
                    <div class="question-meta">
                        <span class="tag-base ${tagClass}">${escapeHtml(q.question_type)}</span>
                        <span class="question-domain">${escapeHtml(q.domain || '')}</span>
                    </div>
                    <div class="question-text">${escapeHtml(q.question)}</div>
                `;
                listDiv.appendChild(card);
            });

            groupDiv.appendChild(headerDiv);
            groupDiv.appendChild(listDiv);
            questionsContainer.appendChild(groupDiv);
        });
    }

    // Helper: Render Slide Decks
    function renderSlides(companySlides, industrySlides, industryName) {
        companySlidesContainer.innerHTML = '';
        industrySlidesContainer.innerHTML = '';

        if (companySlides.length > 0) {
            tabBtnCompany.style.display = 'inline-block';
            companySlides.sort((a, b) => a.slide_number - b.slide_number).forEach(s => {
                const card = document.createElement('div');
                card.className = 'slide-card';
                card.innerHTML = `
                    <div class="slide-header">Slide ${s.slide_number}: ${escapeHtml(s.slide_title)}</div>
                    <div class="slide-text">${escapeHtml(s.slide_text)}</div>
                `;
                companySlidesContainer.appendChild(card);
            });
        } else {
            tabBtnCompany.style.display = 'none';
        }

        if (industrySlides.length > 0) {
            tabBtnIndustry.style.display = 'inline-block';
            industrySlides.sort((a, b) => a.slide_number - b.slide_number).forEach(s => {
                const card = document.createElement('div');
                card.className = 'slide-card';
                card.innerHTML = `
                    <div class="slide-header">Slide ${s.slide_number}: ${escapeHtml(s.slide_title)}</div>
                    <div class="slide-text">${escapeHtml(s.slide_text)}</div>
                `;
                industrySlidesContainer.appendChild(card);
            });
        } else {
            tabBtnIndustry.style.display = 'none';
        }

        if (companySlides.length > 0) {
            switchDeckTab('company-slides-pane', tabBtnCompany);
        } else if (industrySlides.length > 0) {
            switchDeckTab('industry-slides-pane', tabBtnIndustry);
        }
    }

    function switchDeckTab(paneId, btnElem) {
        document.querySelectorAll('.deck-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));

        btnElem.classList.add('active');
        document.getElementById(paneId).classList.remove('hidden');
    }

    tabBtnCompany.addEventListener('click', () => switchDeckTab('company-slides-pane', tabBtnCompany));
    tabBtnIndustry.addEventListener('click', () => switchDeckTab('industry-slides-pane', tabBtnIndustry));

    // Match Banner
    function showMatchBanner(query, matched, score) {
        matchBanner.classList.remove('hidden', 'success', 'warning');
        if (score >= 55) {
            matchBanner.classList.add('success');
            matchBanner.innerHTML = `Matched query <strong>"${escapeHtml(query)}"</strong> to canonical company <strong>${escapeHtml(matched)}</strong> (Confidence: ${score.toFixed(1)}%)`;
        } else {
            matchBanner.classList.add('warning');
            matchBanner.innerHTML = `Low confidence match for <strong>"${escapeHtml(query)}"</strong>. Displaying best result: <strong>${escapeHtml(matched)}</strong> (Confidence: ${score.toFixed(1)}%)`;
        }
    }

    function hideMatchBanner() {
        matchBanner.classList.add('hidden');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Input Listeners
    fuzzySearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        clearSearchBtn.style.display = val ? 'inline' : 'none';

        companySelect.value = "";
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            handleFuzzySearch(val);
        }, 250);
    });

    clearSearchBtn.addEventListener('click', () => {
        fuzzySearchInput.value = "";
        clearSearchBtn.style.display = 'none';
        hideMatchBanner();
        companySelect.value = "";
        loadCompanyDetails(null);
    });

    companySelect.addEventListener('change', (e) => {
        const val = e.target.value;
        fuzzySearchInput.value = "";
        clearSearchBtn.style.display = 'none';
        hideMatchBanner();
        loadCompanyDetails(val);
    });

    // Init
    loadCatalog();
});
