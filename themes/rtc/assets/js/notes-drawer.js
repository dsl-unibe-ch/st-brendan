/**
 * Interactive Notes Drawer for EditionCrafter - v2.7
 * Fixed context matching for notes with short preceding text
 */

(function() {
    'use strict';

    if (window.notesDrawerInitialized) return;
    window.notesDrawerInitialized = true;

    class NotesDrawer {
        constructor() {
            this.drawer = null;
            this.notesData = [];
            this.currentFile = null;
            this.currentPageContent = '';
            this.pageChangeDebounce = null;
            this.activeNoteKey = null; // Track currently active note
            this.init();
        }

        init() {
            console.log('=== Notes Drawer Init v2.7 ===');
            
            this.createDrawer();
            this.attachGlobalListeners();
            this.waitForEditionCrafter();
            
            // Listen for hash changes from EditionCrafter
            window.addEventListener('hashchange', () => {
                // Restore active note reference if it exists
                if (this.activeNoteKey) {
                    this.updateURLWithNote(this.activeNoteKey, false);
                }
            });
            
            // Listen for popstate (back/forward buttons)
            window.addEventListener('popstate', () => {
                this.checkForNoteInURL();
            });
        }

        waitForEditionCrafter() {
            console.log('⏳ Waiting for EditionCrafter to render...');
            
            let attempts = 0;
            const maxAttempts = 100;
            
            const ecCheck = setInterval(() => {
                const ec = document.getElementById('ec');
                
                if (!ec) {
                    if (attempts++ > maxAttempts) {
                        clearInterval(ecCheck);
                        console.error('❌ EditionCrafter #ec element not found');
                    }
                    return;
                }
                
                const teiElements = ec.querySelectorAll('tei-text, tei-body, tei-div, tei-ab, tei-pb, tei-lb');
                const hasContent = teiElements.length > 0;
                const hasText = ec.textContent && ec.textContent.trim().length > 50;
                
                if (hasContent && hasText) {
                    clearInterval(ecCheck);
                    console.log('✓ EditionCrafter ready!');
                    
                    this.observePageChanges();
                    
                    setTimeout(() => {
                        this.loadCurrentPage();
                    }, 300);
                } else if (attempts++ > maxAttempts) {
                    clearInterval(ecCheck);
                    console.warn('⚠️ Timeout waiting for EditionCrafter');
                    this.loadCurrentPage();
                }
            }, 100);
        }

        observePageChanges() {
            const ec = document.getElementById('ec');
            if (!ec) return;
            
            console.log('👀 Observing EditionCrafter for page changes...');
            
            const observer = new MutationObserver((mutations) => {
                const hasSignificantChange = mutations.some(mutation => {
                    if (mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (node.tagName && (
                                    node.tagName.startsWith('TEI-') ||
                                    node.querySelector && node.querySelector('[data-origname="pb"]')
                                )) {
                                    return true;
                                }
                            }
                        }
                    }
                    return false;
                });
                
                if (hasSignificantChange) {
                    console.log('\n🔄 EditionCrafter DOM changed');
                    
                    clearTimeout(this.pageChangeDebounce);
                    this.pageChangeDebounce = setTimeout(() => {
                        this.handlePageChange();
                    }, 300);
                }
            });
            
            observer.observe(ec, {
                childList: true,
                subtree: true
            });
            
            console.log('✓ Observer attached');
        }

        handlePageChange() {
            const ec = document.getElementById('ec');
            if (!ec) return;
            
            const newContent = ec.textContent.substring(0, 200);
            
            if (newContent === this.currentPageContent) {
                return;
            }
            
            console.log('🧹 Page changed, cleaning up...');
            this.currentPageContent = newContent;
            
            const previousMarkers = document.querySelectorAll('.note-marker-enhanced');
            console.log(`   Removing ${previousMarkers.length} previous markers`);
            this.clearEnhancedMarkers();
            
            // Clear active note since we changed pages
            this.activeNoteKey = null;
            
            setTimeout(() => {
                this.loadCurrentPage();
            }, 500);
        }

        clearEnhancedMarkers() {
            document.querySelectorAll('.note-marker-enhanced').forEach(marker => {
                marker.classList.remove('note-marker-enhanced');
                marker.classList.remove('active');
                marker.removeAttribute('data-note-key');
            });
        }

        loadCurrentPage() {
            const file = this.getCurrentFileFromHash();
            console.log('\n📄 Loading page:', file);
            
            const currentMarkers = document.querySelectorAll('.note-marker-enhanced');
            const needsRefetch = file !== this.currentFile || currentMarkers.length === 0;
            
            if (!needsRefetch && this.notesData.length > 0) {
                console.log('   Re-enhancing existing markers...');
                this.waitForMarkersAndEnhance();
                return;
            }
            
            console.log('   Fetching notes data...');
            this.currentFile = file;
            
            this.fetchNotesFromFile(file).then(() => {
                console.log(`✓ Loaded ${this.notesData.length} notes`);
                this.updateDrawer();
                this.waitForMarkersAndEnhance();
            }).catch(err => {
                console.error('❌ Failed to load notes:', err);
            });
        }

        waitForMarkersAndEnhance() {
            let attempts = 0;
            const maxAttempts = 50;
            
            console.log('🔍 Searching for markers...');
            
            const checkInterval = setInterval(() => {
                const markers = this.getUnenhancedMarkers();
                
                if (markers.length > 0) {
                    clearInterval(checkInterval);
                    console.log(`✓ Found ${markers.length} markers`);
                    
                    setTimeout(() => {
                        this.enhanceMarkers();
                        this.hideTooltips();
                        this.checkForNoteInURL();
                    }, 100);
                } else if (attempts++ > maxAttempts) {
                    clearInterval(checkInterval);
                    console.warn('⚠️ No markers found');
                }
            }, 100);
        }

        getUnenhancedMarkers() {
            const allMarkers = document.querySelectorAll('div[style*="display: inline"] span[style*="color: red"]');
            return Array.from(allMarkers).filter(m => !m.classList.contains('note-marker-enhanced'));
        }

        getCurrentFileFromHash() {
            const hash = window.location.hash;
            let match = hash.match(/\/(f\d+)\//);
            if (match) {
                return match[1] + '.html';
            }
            
            const ec = document.getElementById('ec');
            if (ec) {
                const pb = ec.querySelector('tei-pb[facs]');
                if (pb) {
                    const facs = pb.getAttribute('facs');
                    if (facs) {
                        match = facs.match(/#?(f\d+)/);
                        if (match) {
                            return match[1] + '.html';
                        }
                    }
                }
            }
            
            return 'f004.html';
        }

        async fetchNotesFromFile(filename) {
            const url = `/edition/st-brendan/html/text/${filename}`;
            this.notesData = [];
            
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    console.error(`❌ Failed to fetch ${url}: ${response.status}`);
                    return;
                }
                
                const html = await response.text();
                this.parseNotesWithContext(html);
            } catch (err) {
                console.error('❌ Fetch error:', err);
                throw err;
            }
        }

        parseNotesWithContext(html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const container = doc.body;
            
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: (node) => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        if (node.tagName === 'TEI-NOTE' && node.hasAttribute('n')) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_SKIP;
                    }
                }
            );
            
            let precedingText = '';
            const seen = new Map();
            
            let node;
            while (node = walker.nextNode()) {
                if (node.nodeType === Node.TEXT_NODE) {
                    precedingText += node.textContent;
                } else if (node.tagName === 'TEI-NOTE') {
                    const id = node.getAttribute('n');
                    const context = this.normalizeText(precedingText).slice(-50);
                    
                    const occurrenceCount = seen.get(id) || 0;
                    seen.set(id, occurrenceCount + 1);
                    
                    const uniqueKey = occurrenceCount > 0 ? `${id}_dup${occurrenceCount}` : id;
                    
                    const content = this.processNoteContent(node);
                    
                    this.notesData.push({
                        id: id,
                        uniqueKey: uniqueKey,
                        content: content,
                        precedingContext: context,
                        markerElement: null,
                        isDuplicate: occurrenceCount > 0
                    });
                }
            }
            
            this.notesData.sort((a, b) => this.getSortKey(a.id) - this.getSortKey(b.id));
        }

        processNoteContent(noteElement) {
            const clone = noteElement.cloneNode(true);
            
            clone.querySelectorAll('a[href]').forEach(link => {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            });
            
            clone.querySelectorAll('tei-ref[target]').forEach(ref => {
                const target = ref.getAttribute('target');
                const link = document.createElement('a');
                link.href = target;
                link.textContent = ref.textContent;
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
                ref.replaceWith(link);
            });
            
            return clone.innerHTML;
        }

        normalizeText(text) {
            return text
                .replace(/\s+/g, ' ')
                .replace(/[^\w\säöüÄÖÜß]/g, '')
                .trim();
        }

        getSortKey(noteId) {
            const match = noteId.match(/(\d+)(?:-(\d+))?_(\d+)/);
            if (match) {
                const first = parseInt(match[1]) || 0;
                const second = match[2] ? parseInt(match[2]) : first;
                const third = parseInt(match[3]) || 0;
                return first * 1000000 + second * 1000 + third;
            }
            
            const simpleMatch = noteId.match(/(\d+)/);
            if (simpleMatch) {
                return parseInt(simpleMatch[1]) * 1000000;
            }
            
            return 0;
        }

        formatId(noteId) {
            return noteId.replace(/_/g, '.');
        }

        createDrawer() {
            const existing = document.getElementById('notes-drawer');
            if (existing) existing.remove();

            this.drawer = document.createElement('aside');
            this.drawer.id = 'notes-drawer';
            this.drawer.className = 'notes-drawer';
            
            this.drawer.innerHTML = `
                <div class="notes-drawer-header">
                    <button class="notes-drawer-toggle" aria-label="Toggle annotations drawer" data-tooltip="Anmerkungen">
                        <span class="toggle-icon">‹</span>
                        <span class="toggle-icon-collapsed">💬</span>
                    </button>
                    <h3>Anmerkungen (<span id="note-count">0</span>)</h3>
                </div>
                <div class="notes-drawer-content">
                    <p style="padding:20px;text-align:center;color:#666;">Lade...</p>
                </div>
            `;
            
            document.body.appendChild(this.drawer);
            console.log('✓ Drawer created');
        }

        updateDrawer() {
            const countEl = this.drawer.querySelector('#note-count');
            if (countEl) {
                const uniqueNotes = this.notesData.filter(n => !n.isDuplicate).length;
                countEl.textContent = uniqueNotes;
            }
            
            const content = this.drawer.querySelector('.notes-drawer-content');
            content.innerHTML = '';
            
            if (this.notesData.length === 0) {
                content.innerHTML = '<p style="padding:20px;text-align:center;color:#666;">Keine Anmerkungen</p>';
                return;
            }
            
            this.notesData.forEach(note => {
                const item = document.createElement('div');
                item.className = 'note-item';
                item.setAttribute('data-note-key', note.uniqueKey);
                item.setAttribute('data-note-id', note.id);
                
                const displayId = note.isDuplicate 
                    ? `${this.formatId(note.id)} (dup)` 
                    : this.formatId(note.id);
                
                item.innerHTML = `
                    <div class="note-number">${displayId}</div>
                    <div class="note-content">${note.content}</div>
                `;
                content.appendChild(item);
                
                item.querySelectorAll('a[href]').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                });
            });
            
            console.log('✓ Drawer updated');
        }

        updateURLWithNote(noteKey, pushHistory = true) {
            const note = this.notesData.find(n => n.uniqueKey === noteKey);
            if (!note) return;
            
            // Get current URL parts
            const hash = window.location.hash;
            const search = window.location.search;
            
            // Build new search params
            const params = new URLSearchParams(search);
            params.set('note', note.id);
            
            // Construct full URL with EditionCrafter's hash preserved
            const newURL = `${window.location.pathname}?${params.toString()}${hash}`;
            
            if (pushHistory) {
                console.log('📍 Updating URL (push):', newURL);
                window.history.pushState({note: note.id}, '', newURL);
            } else {
                console.log('📍 Updating URL (replace):', newURL);
                window.history.replaceState({note: note.id}, '', newURL);
            }
        }

        checkForNoteInURL() {
            const params = new URLSearchParams(window.location.search);
            const noteId = params.get('note');
            
            if (noteId) {
                console.log('📍 Note parameter detected:', noteId);
                
                const note = this.notesData.find(n => n.id === noteId || n.uniqueKey === noteId);
                if (note && note.markerElement) {
                    setTimeout(() => {
                        this.showNote(note.uniqueKey, note.markerElement, false);
                    }, 300);
                } else {
                    console.log('   Note not found or marker not ready yet');
                }
            } else {
                // No note parameter, clear active state
                this.activeNoteKey = null;
            }
        }

        enhanceMarkers() {
            const markers = this.getUnenhancedMarkers();
            
            console.log('=== 🎨 Enhance Markers ===');
            console.log(`   Markers: ${markers.length}, Notes: ${this.notesData.length}`);
            
            if (markers.length === 0 || this.notesData.length === 0) {
                console.warn('⚠️ Cannot enhance');
                return;
            }
            
            // DEBUG: Show first note details
            if (this.notesData.length > 0) {
                const firstNote = this.notesData[0];
                console.log('📝 First note:', {
                    id: firstNote.id,
                    uniqueKey: firstNote.uniqueKey,
                    contextLength: firstNote.precedingContext.length,
                    context: `"${firstNote.precedingContext}"`,
                    isDuplicate: firstNote.isDuplicate
                });
            }
            
            const markerContexts = markers.map((marker, index) => ({
                element: marker,
                index: index,
                context: this.getMarkerContext(marker)
            }));
            
            // DEBUG: Show first marker details
            if (markerContexts.length > 0) {
                const firstMarker = markerContexts[0];
                console.log('📍 First marker:', {
                    index: firstMarker.index,
                    contextLength: firstMarker.context.length,
                    context: `"${firstMarker.context}"`,
                    elementHTML: firstMarker.element.outerHTML.substring(0, 100)
                });
            }
            
            const matchedNotes = new Set();
            let successCount = 0;
            
            markerContexts.forEach(markerInfo => {
                const match = this.findBestNoteMatch(markerInfo.context, matchedNotes);
                
                if (match) {
                    this.enhanceMarker(markerInfo.element, match.note);
                    matchedNotes.add(match.note.uniqueKey);
                    successCount++;
                    
                    // DEBUG: Show first few matches
                    if (markerInfo.index < 3) {
                        console.log(`   ✓ [${markerInfo.index}] → ${match.note.id} (score: ${match.score.toFixed(2)})`);
                    }
                } else {
                    console.warn(`   ✗ [${markerInfo.index}] no match, contextLength: ${markerInfo.context.length}, context: "${markerInfo.context}"`);
                }
            });
            
            console.log(`✓ Matched: ${successCount}/${markers.length}`);
            console.log(`✓ Notes matched: ${matchedNotes.size}/${this.notesData.length}`);
            
            // DEBUG: Show unmatched notes
            const unmatchedNotes = this.notesData.filter(n => !matchedNotes.has(n.uniqueKey));
            if (unmatchedNotes.length > 0) {
                console.warn('⚠️ Unmatched notes:', unmatchedNotes.map(n => ({
                    id: n.id,
                    contextLength: n.precedingContext.length,
                    context: `"${n.precedingContext}"`
                })));
            }
            
            console.log('=== Done ===\n');
        }

        getMarkerContext(markerElement) {
            let context = '';
            let node = markerElement.parentElement;
            let steps = 0;
            
            while (node && context.length < 100 && steps < 20) {
                let sibling = node.previousSibling;
                
                while (sibling && context.length < 100) {
                    if (sibling.nodeType === Node.TEXT_NODE) {
                        context = sibling.textContent + context;
                    } else if (sibling.textContent) {
                        context = sibling.textContent + context;
                    }
                    sibling = sibling.previousSibling;
                }
                
                node = node.parentElement;
                steps++;
            }
            
            return this.normalizeText(context).slice(-50);
        }

        findBestNoteMatch(markerContext, alreadyMatched) {
            let bestMatch = null;
            let bestScore = 0;
            
            for (const note of this.notesData) {
                if (alreadyMatched.has(note.uniqueKey)) {
                    continue;
                }
                
                const score = this.calculateContextSimilarity(markerContext, note.precedingContext);
                
                // SPECIAL CASE 1: If both contexts are very short (beginning of text)
                if (markerContext.length < 10 && note.precedingContext.length < 10 && bestMatch === null) {
                    bestScore = 0.5;
                    bestMatch = note;
                }
                
                // SPECIAL CASE 2: If marker context ends with note context (exact suffix match)
                // This is very reliable even with low percentage match
                if (markerContext.endsWith(note.precedingContext) && note.precedingContext.length >= 5) {
                    if (score > bestScore) {
                        bestScore = Math.max(score, 0.35); // Boost to meet threshold
                        bestMatch = note;
                    }
                }
                
                if (score > bestScore && score > 0.3) {
                    bestScore = score;
                    bestMatch = note;
                }
            }
            
            return bestMatch ? { note: bestMatch, score: bestScore } : null;
        }

        calculateContextSimilarity(context1, context2) {
            if (!context1 || !context2) return 0;
            if (context1 === context2) return 1.0;
            
            // Check if one context ends with the other (common case)
            if (context1.endsWith(context2)) {
                return context2.length / context1.length;
            }
            if (context2.endsWith(context1)) {
                return context1.length / context2.length;
            }
            
            // Check for overlap at the end of both strings
            const minLength = Math.min(context1.length, context2.length);
            let maxOverlap = 0;
            
            for (let len = minLength; len >= Math.max(5, minLength / 2); len--) {
                const end1 = context1.slice(-len);
                const end2 = context2.slice(-len);
                
                if (end1 === end2) {
                    maxOverlap = len;
                    break;
                }
            }
            
            if (maxOverlap > 0) {
                return maxOverlap / minLength;
            }
            
            return 0;
        }

        enhanceMarker(marker, note) {
            if (marker.classList.contains('note-marker-enhanced')) {
                return;
            }
            
            note.markerElement = marker;
            
            marker.setAttribute('data-note-key', note.uniqueKey);
            marker.setAttribute('data-note-id', note.id);
            marker.setAttribute('title', this.formatId(note.id));
            marker.classList.add('note-marker-enhanced');
            marker.textContent = '·';
            
            marker.style.cssText = `
                color: #792421 !important;
                font-size: 1.5em !important;
                cursor: pointer !important;
                padding: 0 2px !important;
                background: none !important;
                vertical-align: baseline !important;
            `;
        }

        hideTooltips() {
            if (!document.getElementById('hide-ec-tooltips')) {
                const style = document.createElement('style');
                style.id = 'hide-ec-tooltips';
                style.textContent = 'div[role="tooltip"] { display: none !important; }';
                document.head.appendChild(style);
            }
        }

        attachGlobalListeners() {
            const toggleBtn = this.drawer.querySelector('.notes-drawer-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleDrawer();
                });
            }
            
            this.drawer.addEventListener('click', (e) => {
                const noteItem = e.target.closest('.note-item');
                if (noteItem) {
                    e.stopPropagation();
                    this.scrollToMarker(noteItem.getAttribute('data-note-key'));
                }
            });
            
            document.addEventListener('click', (e) => {
                const marker = e.target.closest('.note-marker-enhanced');
                if (marker) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    const noteKey = marker.getAttribute('data-note-key');
                    this.showNote(noteKey, marker, true);
                    
                    return false;
                }
                
                if (this.drawer.classList.contains('open') && !this.drawer.contains(e.target)) {
                    this.drawer.classList.remove('open');
                    this.clearHighlights();
                }
            }, true);
            
            document.addEventListener('mouseover', (e) => {
                const marker = e.target.closest('.note-marker-enhanced');
                if (marker && !marker.classList.contains('active')) {
                    const noteKey = marker.getAttribute('data-note-key');
                    const note = this.notesData.find(n => n.uniqueKey === noteKey);
                    if (note) {
                        marker.textContent = this.formatId(note.id);
                        marker.style.fontSize = '0.75em';
                        marker.style.verticalAlign = 'super';
                    }
                }
            });
            
            document.addEventListener('mouseout', (e) => {
                const marker = e.target.closest('.note-marker-enhanced');
                if (marker && !marker.classList.contains('active')) {
                    marker.textContent = '·';
                    marker.style.fontSize = '1.5em';
                    marker.style.verticalAlign = 'baseline';
                }
            });
        }

        toggleDrawer() {
            this.drawer.classList.toggle('open');
        }

        showNote(noteKey, markerElement, pushHistory = false) {
            this.clearHighlights();
            this.drawer.classList.add('open');
            
            const note = this.notesData.find(n => n.uniqueKey === noteKey);
            if (!note) return;
            
            this.activeNoteKey = noteKey;
            this.updateURLWithNote(noteKey, pushHistory);
            
            if (markerElement) {
                markerElement.classList.add('active');
                markerElement.textContent = this.formatId(note.id);
                markerElement.style.fontSize = '0.75em';
                markerElement.style.verticalAlign = 'super';
            }
            
            const noteItem = this.drawer.querySelector(`.note-item[data-note-key="${noteKey}"]`);
            if (noteItem) {
                noteItem.classList.add('active');
                
                const drawerContent = this.drawer.querySelector('.notes-drawer-content');
                if (drawerContent && markerElement) {
                    const markerRect = markerElement.getBoundingClientRect();
                    const drawerRect = drawerContent.getBoundingClientRect();
                    
                    drawerContent.scrollTo({
                        top: noteItem.offsetTop - (markerRect.top - drawerRect.top),
                        behavior: 'smooth'
                    });
                }
            }
        }

        scrollToMarker(noteKey) {
            this.clearHighlights();
            
            const noteItem = this.drawer.querySelector(`.note-item[data-note-key="${noteKey}"]`);
            if (noteItem) noteItem.classList.add('active');
            
            const note = this.notesData.find(n => n.uniqueKey === noteKey);
            if (note && note.markerElement) {
                this.activeNoteKey = noteKey;
                this.updateURLWithNote(noteKey, true);
                
                note.markerElement.classList.add('active');
                note.markerElement.textContent = this.formatId(note.id);
                note.markerElement.style.fontSize = '0.75em';
                note.markerElement.style.verticalAlign = 'super';
                
                const rect = note.markerElement.getBoundingClientRect();
                window.scrollTo({
                    top: window.pageYOffset + rect.top - (window.innerHeight / 2),
                    behavior: 'smooth'
                });
            }
        }

        clearHighlights() {
            document.querySelectorAll('.note-marker-enhanced.active').forEach(m => {
                m.classList.remove('active');
                m.textContent = '·';
                m.style.fontSize = '1.5em';
                m.style.verticalAlign = 'baseline';
            });
            
            document.querySelectorAll('.note-item.active').forEach(i => {
                i.classList.remove('active');
            });
        }
    }

    new NotesDrawer();
})();
