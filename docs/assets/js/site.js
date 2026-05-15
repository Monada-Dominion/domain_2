(function () {
    const PAGE_SEQUENCE = [
        'initial-theory.html',
        'practice.html',
        'reflective-questions.html',
        'new-theory.html'
    ];

    const SYMBOLS = [
        { key: 'point', label: 'Point', image: '1.jpg', href: 'point.html' },
        { key: 'line', label: 'Line', image: '2.jpg', href: 'line.html' },
        { key: 'triangle', label: 'Triangle', image: '3.jpg', href: 'triangle.html' }
    ];

    const SYMBOL_LOOKUP = SYMBOLS.reduce((lookup, symbol) => {
        lookup[symbol.key] = symbol;
        return lookup;
    }, {});

    let cardCatalogPromise = null;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function markdownToHtml(md) {
        return md
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^---$/gim, '<hr>')
            .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/`([^`]+)`/gim, '<code>$1</code>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/\n\n/gim, '<br><br>')
            .replace(/\n/g, '<br>');
    }

    function parseCatalogLine(line, index) {
        const match = line.match(/^([0-9.]+)\s*-\s*(.+)$/);
        if (!match) {
            return null;
        }

        const code = match[1].trim();
        const images = match[2]
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);

        return {
            file: `meditation_${code.replace(/\./g, '_')}`,
            images,
            page: PAGE_SEQUENCE[index % PAGE_SEQUENCE.length]
        };
    }

    async function loadCardCatalog() {
        if (!cardCatalogPromise) {
            cardCatalogPromise = fetch('assets/images/cards_to_images.md')
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Unable to load cards_to_images.md (${response.status})`);
                    }

                    return response.text();
                })
                .then((text) => text
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map(parseCatalogLine)
                    .filter(Boolean)
                );
        }

        return cardCatalogPromise;
    }

    async function loadCardMeta(file) {
        const response = await fetch(`assets/md/${file}.md`);
        if (!response.ok) {
            throw new Error(`Unable to load ${file}.md (${response.status})`);
        }

        const text = await response.text();
        const lines = text.split(/\r?\n/);

        return {
            title: (lines[0] || file).replace(/^#+\s*/, '').trim() || file,
            description: (lines[1] || '').trim()
        };
    }

    function createCardElement(card, title, description, compact = false) {
        const link = document.createElement('a');
        link.href = card.page;
        link.className = compact ? 'card card--compact' : 'card';

        const imageMarkup = card.images
            .map((image) => `<img src="assets/images/${escapeHtml(image)}" alt="${escapeHtml(title)}">`)
            .join('');

        link.innerHTML = `
            <div class="card-image-container">
                <div class="images-wrapper">
                    ${imageMarkup}
                </div>
            </div>
            <div class="card-text">
                <div class="text-wrapper">
                    <div class="card-title">${escapeHtml(title)}</div>
                    <div class="card-description">${escapeHtml(description)}</div>
                </div>
            </div>
        `;

        return link;
    }

    function renderTopMenu(container, activeKey) {
        if (!container) {
            return;
        }

        const links = [
            { key: 'index', href: 'index.html', label: 'All Cards' },
            { key: 'point', href: 'point.html', label: 'Home (Point)' }
        ];

        container.innerHTML = links.map((link) => {
            const isActive = link.key === activeKey;
            return `<a class="site-nav__link" href="${link.href}"${isActive ? ' aria-current="page"' : ''}>${link.label}</a>`;
        }).join('');
    }

    function renderSymbolButtons(container, activeKey) {
        if (!container) {
            return;
        }

        container.innerHTML = SYMBOLS.map((symbol) => {
            const isActive = symbol.key === activeKey;
            return `
                <a class="symbol-nav__button" href="${symbol.href}"${isActive ? ' aria-current="page"' : ''}>
                    <img src="assets/images/${symbol.image}" alt="${symbol.label}">
                    <span>${symbol.label}</span>
                </a>
            `;
        }).join('');
    }

    async function renderIndexPage(options = {}) {
        const container = document.getElementById(options.containerId || 'card-container');
        const menu = document.getElementById(options.menuId || 'site-nav');

        renderTopMenu(menu, 'index');

        if (!container) {
            return;
        }

        container.innerHTML = '';
        const catalog = await loadCardCatalog();

        for (const card of catalog) {
            try {
                const meta = await loadCardMeta(card.file);
                container.appendChild(createCardElement(card, meta.title, meta.description));
            } catch (error) {
                container.appendChild(createCardElement(card, card.file, ''));
            }
        }
    }

    async function renderMarkdownPage(options = {}) {
        const menu = document.getElementById(options.menuId || 'site-nav');
        renderTopMenu(menu, symbol.key === 'point' ? 'point' : null);

        const params = new URLSearchParams(window.location.search);
        const contentName = params.get('content') || options.defaultContent;
        const header = document.querySelector(options.titleSelector || '.page-title');
        const contentContainer = document.querySelector(options.contentSelector || '.content');

        if (!contentContainer) {
            return;
        }

        try {
            const response = await fetch(`assets/md/${contentName}.md`);
            if (!response.ok) {
                throw new Error(`Unable to load ${contentName}.md (${response.status})`);
            }

            const text = await response.text();
            const lines = text.split(/\r?\n/);
            const title = (lines[0] || contentName).replace(/^#+\s*/, '').trim() || contentName;

            if (header) {
                header.textContent = title;
            }

            contentContainer.innerHTML = markdownToHtml(lines.slice(1).join('\n'));
        } catch (error) {
            if (header) {
                header.textContent = contentName;
            }
            contentContainer.textContent = `Error loading content: ${error.message}`;
        }
    }

    async function renderSymbolPage(symbolKey, options = {}) {
        const symbol = SYMBOL_LOOKUP[symbolKey] || SYMBOLS[0];
        const menu = document.getElementById(options.menuId || 'site-nav');
        const heroImage = document.querySelector(options.heroImageSelector || '.symbol-hero__image');
        const heading = document.querySelector(options.headingSelector || '.symbol-hero__title');
        const navButtons = document.querySelector(options.navButtonsSelector || '.symbol-nav');
        const cardGrid = document.querySelector(options.cardGridSelector || '.symbol-card-grid');
        const details = document.querySelector(options.detailsSelector || '.symbol-cards details');
        const summary = document.querySelector(options.summarySelector || '.symbol-cards summary');

        renderTopMenu(menu, 'point');
        renderSymbolButtons(navButtons, symbol.key);

        if (heading) {
            heading.textContent = symbol.label;
        }

        if (heroImage) {
            heroImage.src = `assets/images/${symbol.image}`;
            heroImage.alt = symbol.label;
        }

        const catalog = await loadCardCatalog();
        const symbolCards = catalog.filter((card) => card.images.includes(symbol.image));

        if (summary) {
            summary.textContent = `Cards for ${symbol.label} (${symbolCards.length})`;
        }

        if (details) {
            details.open = true;
        }

        if (!cardGrid) {
            return;
        }

        cardGrid.innerHTML = '';

        for (const card of symbolCards) {
            try {
                const meta = await loadCardMeta(card.file);
                cardGrid.appendChild(createCardElement(card, meta.title, meta.description, true));
            } catch (error) {
                cardGrid.appendChild(createCardElement(card, card.file, '', true));
            }
        }
    }

    window.Domain2 = {
        markdownToHtml,
        loadCardCatalog,
        loadCardMeta,
        renderIndexPage,
        renderMarkdownPage,
        renderSymbolPage,
        renderTopMenu,
        renderSymbolButtons
    };
})();