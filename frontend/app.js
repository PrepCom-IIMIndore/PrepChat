// PrepChat - Frontend JS

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
    
    const sectionQuestions = document.getElementById('section-questions');
    const questionsContainer = document.getElementById('questions-container');
    
    const sectionFormat = document.getElementById('section-format');
    const formatContainer = document.getElementById('format-container');
    
    const sectionSlides = document.getElementById('section-slides');
    const tabBtnCompany = document.getElementById('tab-btn-company');
    const tabBtnIndustry = document.getElementById('tab-btn-industry');
    const companySlidesPane = document.getElementById('company-slides-pane');
    const industrySlidesPane = document.getElementById('industry-slides-pane');
    const companySlidesContainer = document.getElementById('company-slides-container');
    const industrySlidesContainer = document.getElementById('industry-slides-container');

    const statQuestions = document.getElementById('stat-questions');
    const statCompanies = document.getElementById('stat-companies');
    const statFormats = document.getElementById('stat-formats');
    const statSlides = document.getElementById('stat-slides');

    let debounceTimer = null;

    // 1. Load Initial Stats & Catalog
    async function loadCatalog() {
        try {
            const res = await fetch('/api/companies');
            if (!res.ok) throw new Error("Failed to load catalog");
            const data = await res.json();

            // Populate stats
            if (data.stats) {
                statQuestions.textContent = data.stats.total_questions || 0;
                statCompanies.textContent = data.stats.total_companies || 0;
                statFormats.textContent = data.stats.total_formats || 0;
                statSlides.textContent = data.stats.total_slides || 0;
            }

            // Populate dropdown
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

    // 2. Perform Fuzzy Search
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

    // 3. Load Company Details & Render Fixed Order Sections
    async function loadCompanyDetails(companyName) {
        if (!companyName) {
            landingDashboard.classList.remove('hidden');
            companyContent.classList.add('hidden');
            return;
        }

        try {
            const res = await fetch(`/api/company?name=${encodeURIComponent(companyName)}`);
            if (!res.ok) throw new Error("Company fetch failed");
            const data = await res.json();

            landingDashboard.classList.add('hidden');
            companyContent.classList.remove('hidden');

            displayCompanyName.textContent = data.company;
            displaySectorName.textContent = `Sector: ${data.industry || 'Other'}`;

            // RENDER FIXED ORDER SECTIONS

            // SECTION 1: Previous Year Questions
            if (data.questions && data.questions.length > 0) {
                renderQuestions(data.questions);
                sectionQuestions.classList.remove('hidden');
            } else {
                sectionQuestions.classList.add('hidden');
            }

            // SECTION 2: Interview Format
            if (data.format_text && data.format_text.trim()) {
                formatContainer.textContent = data.format_text;
                sectionFormat.classList.remove('hidden');
            } else {
                sectionFormat.classList.add('hidden');
            }

            // SECTION 3: Company & Industry Decks
            const hasCompanySlides = data.company_slides && data.company_slides.length > 0;
            const hasIndustrySlides = data.industry_slides && data.industry_slides.length > 0;

            if (hasCompanySlides || hasIndustrySlides) {
                renderSlides(data.company_slides || [], data.industry_slides || [], data.industry);
                sectionSlides.classList.remove('hidden');
            } else {
                sectionSlides.classList.add('hidden');
            }

        } catch (err) {
            console.error("Error loading company details:", err);
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

            // Accordion toggle click handler
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

        // Set default active tab
        if (companySlides.length > 0) {
            switchTab('company-slides-pane', tabBtnCompany);
        } else if (industrySlides.length > 0) {
            switchTab('industry-slides-pane', tabBtnIndustry);
        }
    }

    // Tab Switcher
    function switchTab(paneId, btnElem) {
        document.querySelectorAll('.deck-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));

        btnElem.classList.add('active');
        document.getElementById(paneId).classList.remove('hidden');
    }

    tabBtnCompany.addEventListener('click', () => switchTab('company-slides-pane', tabBtnCompany));
    tabBtnIndustry.addEventListener('click', () => switchTab('industry-slides-pane', tabBtnIndustry));

    // Match Banner Display
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

    // Event Listeners
    fuzzySearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        clearSearchBtn.style.display = val ? 'inline' : 'none';

        companySelect.value = ""; // reset dropdown
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
        fuzzySearchInput.value = ""; // reset search box
        clearSearchBtn.style.display = 'none';
        hideMatchBanner();
        loadCompanyDetails(val);
    });

    // Init
    loadCatalog();
});
