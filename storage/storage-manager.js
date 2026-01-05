// Readify Extension - Storage Manager
// Main orchestration for storage operations
// Combines local and Supabase storage with change management

// Main save function - routes to appropriate storage
async function saveChangeToDisk(type, data, isDelete = false, markData = null) {
    const urlDigest = await getURLDigest();
    
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    const supabaseAuth = window.ReadifySupabase?.isAuthenticated() || false;
    
    console.log('Readify saveChangeToDisk:', { 
        type, 
        isDelete, 
        isAuthenticated, 
        supabaseAuth,
        hasReadifyAuth: !!window.ReadifyAuth,
        hasReadifySupabase: !!window.ReadifySupabase,
        currentUser: window.ReadifySupabase?.getCurrentUser()?.email
    });
    
    if (!isAuthenticated) {
        // Not logged in - session only, no persistence
        // The visual changes work but won't survive refresh
        console.log('Readify: Changes are session-only (sign in to save permanently)');
        showSessionOnlyNotice();
        return { sessionOnly: true };
    }
    
    // User is logged in - always use Supabase with server-side limit enforcement
    console.log('Readify: Saving to Supabase...');
    return await saveChangeToSupabase(urlDigest, type, data, isDelete, markData);
}

// Save change to local storage (free users)
// Now supports new mark-based system with segments
async function saveChangeToLocal(urlDigest, type, data, isDelete = false, markData = null) {
    try {
        // Load existing site data
        let siteData = await loadSiteFromLocal(urlDigest);
        const isNewSite = !siteData;
        
        if (!siteData) {
            siteData = {
                info: {
                    url: window.location.href,
                    title: document.title || window.location.hostname,
                    hostname: window.location.hostname,
                    lastModified: Date.now()
                },
                changes: [],
                notes: {},
                sizeBytes: 0
            };
        }
        
        const originalChangeCount = siteData.changes.length;
        
        // Handle different change types
        if (isDelete) {
            if (type === 'note') {
                // Remove note by markId
                delete siteData.notes[data];
            } else if (type === 'clearHighlight') {
                // Remove highlights by highlightId array
                const idsToRemove = Array.isArray(data) ? data : [data];
                siteData.changes = siteData.changes.filter(change => 
                    !idsToRemove.includes(change.highlightId)
                );
            } else if (type === 'clearUnderline') {
                // Remove underlines by highlightId array
                const idsToRemove = Array.isArray(data) ? data : [data];
                siteData.changes = siteData.changes.filter(change => 
                    !idsToRemove.includes(change.highlightId)
                );
            } else {
                // Remove by markId
                siteData.changes = siteData.changes.filter(change => change.markId !== data);
            }
        } else if (type === "note") {
            // Add or update note (markId -> noteText)
            if (markData && markData.markId) {
                siteData.notes[markData.markId] = data;
            } else {
                siteData.notes[data] = data;
            }
        } else if (markData) {
            // New mark-based system - store full mark data
            siteData.changes.push({
                type,
                data, // color for highlights, null for underlines
                markId: markData.markId,
                highlightId: markData.highlightId,
                text: markData.text,
                segments: markData.segments,
                noteText: markData.noteText || null,
                createdAt: Date.now()
            });
        } else {
            // Legacy fallback - should not be reached with new system
            console.warn('saveChangeToLocal called without markData');
        }
        
        // Update last modified
        siteData.info.lastModified = Date.now();
        
        // Calculate estimated size
        const estimatedSize = calculateStorageSize(siteData);
        
        // Check limits for new sites or if adding changes
        if (!isDelete && (isNewSite || siteData.changes.length > originalChangeCount || Object.keys(siteData.notes).length > 0)) {
            const limitCheck = await canAddChange(urlDigest, estimatedSize);
            if (!limitCheck.canAdd) {
                showUpgradePrompt(limitCheck.reason);
                return;
            }
        }
        
        // Save the site data
        const result = await saveSiteToLocal(urlDigest, siteData);
        
        if (result.error) {
            console.error('Failed to save changes:', result.error);
            return;
        }
        
        // Update global stats
        await updateGlobalStatsAfterSave(urlDigest, siteData, isNewSite, originalChangeCount);
        
        // Handle MySites updates
        if (siteData.changes.length === 0 && Object.keys(siteData.notes).length === 0 && originalChangeCount > 0) {
            // All changes removed - delete the site
            await deleteSiteFromLocal(urlDigest);
            await updateGlobalStatsAfterDelete(urlDigest);
            notifyMySitesUpdate('removed', 0);
        } else if (siteData.changes.length > 0 || Object.keys(siteData.notes).length > 0) {
            const totalChanges = siteData.changes.length + Object.keys(siteData.notes).length;
            notifyMySitesUpdate(originalChangeCount === 0 ? 'added' : 'updated', totalChanges);
        }
        
    } catch (e) {
        console.error('Error saving change to local storage:', e);
    }
}

// Save change to Supabase (all logged-in users - free and premium)
// Uses edge function for server-side limit enforcement
async function saveChangeToSupabase(urlDigest, type, data, isDelete = false, markData = null) {
    try {
        // Load existing site data
        let siteData = await loadFromSupabase(urlDigest);
        const originalChangeCount = siteData?.changes?.length || 0;
        
        if (!siteData) {
            siteData = {
                info: {
                    url: window.location.href,
                    title: document.title || window.location.hostname,
                    hostname: window.location.hostname,
                    lastModified: Date.now()
                },
                changes: [],
                notes: {}
            };
        }
        
        // Handle different change types
        if (isDelete) {
            if (type === 'note') {
                delete siteData.notes[data];
            } else if (type === 'clearHighlight' || type === 'clearUnderline') {
                const idsToRemove = Array.isArray(data) ? data : [data];
                siteData.changes = siteData.changes.filter(change => 
                    !idsToRemove.includes(change.highlightId)
                );
            } else {
                siteData.changes = siteData.changes.filter(change => change.markId !== data);
            }
        } else if (type === "note") {
            if (markData && markData.markId) {
                siteData.notes[markData.markId] = data;
            } else {
                siteData.notes[data] = data;
            }
        } else if (markData) {
            // New mark-based system
            siteData.changes.push({
                type,
                data,
                markId: markData.markId,
                highlightId: markData.highlightId,
                text: markData.text,
                segments: markData.segments,
                noteText: markData.noteText || null,
                createdAt: Date.now()
            });
        }
        
        // Update last modified
        siteData.info.lastModified = Date.now();
        
        // Save to Supabase
        const result = await saveToSupabase(urlDigest, siteData.changes, siteData.info, siteData.notes);
        
        if (result.error) {
            console.error('Failed to save changes to Supabase:', result.error);
            return;
        }
        
        // Handle MySites updates
        if (siteData.changes.length === 0 && Object.keys(siteData.notes).length === 0 && originalChangeCount > 0) {
            await deleteFromSupabase(urlDigest);
            notifyMySitesUpdate('removed', 0);
        } else if (siteData.changes.length > 0 || Object.keys(siteData.notes).length > 0) {
            const totalChanges = siteData.changes.length + Object.keys(siteData.notes).length;
            notifyMySitesUpdate(originalChangeCount === 0 ? 'added' : 'updated', totalChanges);
        }
        
    } catch (e) {
        console.error('Error saving change to Supabase:', e);
    }
}

// Restore changes from storage
async function restoreChangesFromDisk(i = 0) {
    try {
        // Wait a bit for services to initialize on first attempt
        if (i === 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Check if user is logged in - only logged-in users have persistent storage
        const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
        
        if (!isAuthenticated) {
            // Not logged in - session only mode, nothing to restore
            console.log('Readify: Session-only mode (sign in to restore saved highlights)');
            
            // Run migration for legacy local data one last time to help with transition
            if (i === 0) {
                await autoMigrateIfNeeded();
            }
            return;
        }
        
        const urlDigest = await getURLDigest();
        let siteData = null;
        
        // User is logged in - load from Supabase (works for both free and premium)
        try {
            siteData = await loadFromSupabase(urlDigest);
            if (siteData) {
                console.log('Restored changes from Supabase');
            }
        } catch (e) {
            console.log('Could not load from Supabase:', e.message);
        }

        if (siteData && siteData.changes && siteData.changes.length > 0) {
            for (const changeData of siteData.changes) {
                try {
                    // Check if this is new format (has text) or legacy format (has range)
                    if (changeData.text) {
                        // New mark-based format - use text-anchored restoration
                        restoreHighlight(changeData);
                        
                        // Also restore note from changeData.noteText if present
                        if (changeData.noteText && changeData.markId) {
                            const marks = document.querySelectorAll(`readify-mark[data-mark-id="${changeData.markId}"]`);
                            marks.forEach(mark => {
                                mark.classList.add('readify-with-notes');
                                mark.setAttribute('data-note-text', changeData.noteText);
                                const color = mark.style.backgroundColor;
                                if (color) {
                                    const rgb = hexToRgb(color) || parseRgb(color);
                                    if (rgb) {
                                        mark.style.borderBottomColor = `rgb(${Math.max(0, rgb.r - 51)}, ${Math.max(0, rgb.g - 51)}, ${Math.max(0, rgb.b - 51)})`;
                                    }
                                }
                            });
                        }
                    } else if (changeData.range) {
                        // Legacy format - use DOM path restoration
                        restoreLegacyChange(changeData);
                    }
                } catch (e) {
                    console.warn('Failed to restore change:', e.message, changeData);
                }
            }
        }
        
        // Restore notes from separate notes object (for notes added/edited after initial highlight)
        if (siteData && siteData.notes) {
            for (const [markId, noteText] of Object.entries(siteData.notes)) {
                const marks = document.querySelectorAll(`readify-mark[data-mark-id="${markId}"]`);
                marks.forEach(mark => {
                    mark.classList.add('readify-with-notes');
                    mark.setAttribute('data-note-text', noteText);
                    // Add border indicator for notes
                    const color = mark.style.backgroundColor;
                    if (color) {
                        const rgb = hexToRgb(color) || parseRgb(color);
                        if (rgb) {
                            mark.style.borderBottomColor = `rgb(${Math.max(0, rgb.r - 51)}, ${Math.max(0, rgb.g - 51)}, ${Math.max(0, rgb.b - 51)})`;
                        }
                    }
                });
            }
        }
        
        if (!siteData || (!siteData.changes?.length && !Object.keys(siteData.notes || {}).length)) {
            console.log("No saved data found for this page");
        }
    } catch (e) {
        console.log('restoreChangesFromDisk attempt', i, 'failed:', e.message);
        if (i < 10) {
            setTimeout(() => {
                restoreChangesFromDisk(i + 1);
            }, 1000);
        }
    }
}

// Legacy restoration for old format data
function restoreLegacyChange(changeData) {
    const { type, range, data } = changeData;
    
    try {
        let startContainer = document.body;
        let endContainer = document.body;

        for (let i = 0; i < range.startContainerPath.length; i++) {
            startContainer = startContainer.childNodes[range.startContainerPath[i]];
        }

        for (let i = 0; i < range.endContainerPath.length; i++) {
            endContainer = endContainer.childNodes[range.endContainerPath[i]];
        }

        let selection = window.getSelection();
        let newRange = document.createRange();
        newRange.setStart(startContainer, range.startOffset);
        newRange.setEnd(endContainer, range.endOffset);
        selection.removeAllRanges();
        selection.addRange(newRange);

        switch (type) {
            case "highlight":
                highlightSelectedText(data);
                break;
            case "underline":
                underlineSelectedText();
                break;
        }
        
        selection.removeAllRanges();
    } catch (e) {
        console.warn('Legacy restore failed:', e.message);
    }
}

// Delete all changes for current page
async function deleteChangesFromDisk() {
    const urlDigest = await getURLDigest();
    
    // Check if user is logged in
    const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
    
    if (isAuthenticated) {
        // Delete from Supabase for logged-in users
        await deleteFromSupabase(urlDigest);
        notifyMySitesUpdate('removed', 0);
    }
    // For non-logged-in users, just reload (changes were session-only anyway)
    
    window.location.reload();
}

// Notify sidepanel about site updates
function notifyMySitesUpdate(action, changeCount = 0) {
    // Send message to extension popup/sidepanel to update My Sites
    // Include change count so sidepanel can update cache locally without API call
    chrome.runtime.sendMessage({
        type: 'mySitesUpdate',
        action: action, // 'added', 'updated', 'removed'
        url: window.location.href,
        title: document.title || window.location.hostname,
        hostname: window.location.hostname,
        changeCount: changeCount
    }).catch(() => {
        // Ignore errors if popup/sidepanel is not open
    });
}

// Note management functions - now uses readify-mark elements
function attachNoteEvents() {
    // Attach to new readify-mark elements with notes
    document.querySelectorAll('readify-mark.readify-with-notes').forEach((mark) => {
        const markId = mark.getAttribute('data-mark-id');
        if (markId) {
            mark.addEventListener('click', () => showNoteForMark(markId));
        }
    });
    
    // Legacy support for old anchor-based notes
    document.querySelectorAll("a.note-anchor").forEach((anchor) => {
        attachNoteClickHandler(anchor);
    });
}

function attachNoteClickHandler(anchor, noteText = null) {
    anchor.onclick = function (e) {
        e.preventDefault();
        if (!noteText) {
            getURLDigest().then(async (urlDigest) => {
                const isAuthenticated = window.ReadifyAuth?.isAuthenticated() || false;
                const siteData = isAuthenticated ? await loadFromSupabase(urlDigest) : await loadSiteFromLocal(urlDigest);
                const savedNote = siteData?.notes?.[anchor.textContent] || '';
                showNoteInput(savedNote, anchor);
            });
        } else {
            showNoteInput(noteText, anchor);
        }
    };
}

// Legacy function - kept for backwards compatibility
function createNoteAnchor(noteText) {
    console.warn('createNoteAnchor is deprecated - use highlightSelectedText with noteText instead');
    // Create a highlight with note using new system - noteText is included in markData
    const markData = highlightSelectedText('#fdffb4', noteText);
    if (markData) {
        saveChangeToDisk("highlight", '#fdffb4', false, markData);
    }
}

// Global exports for sidepanel access
if (typeof window !== 'undefined') {
    // Export main functions globally for sidepanel.js
    window.getAllSavedSites = getAllSavedSites;
    window.deleteSiteData = deleteSiteData;
    window.getWebsiteLimitInfo = getWebsiteLimitInfo;
    window.getSiteCount = getSiteCount;
}

