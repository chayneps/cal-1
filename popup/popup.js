// popup/popup.js - DarkCal Month View & Top-to-Bottom Hover Schedule Controller with Auto-Sync
import { Storage } from '../lib/storage.js';
import { getMockCalendars, generateMockEvents } from '../lib/mock-data.js';
import { parseICal } from '../lib/ical-parser.js';

class DarkCalApp {
  constructor() {
    this.firstDayOfWeek = 0; // 0 = Sun, 1 = Mon
    this.useDemoData = true;
    this.autoSyncInterval = 15; // in minutes
    this.icalUrl = '';
    this.lastSyncTimestamp = null;

    // Calendar state
    this.today = new Date();
    this.viewYear = this.today.getFullYear();
    this.viewMonth = this.today.getMonth();
    this.calendars = [];
    this.events = [];
    this.calendarName = 'main';
    this.detectedCalendarName = '';
    this.customCalendarName = '';
    this.activeCalendarFilter = 'all';
    this.activeHoverCell = null;
    this.hoverTimeout = null;
    this.todayBlinkTimeout = null;
    this.todayInteractionCleanup = null;
    this.activeTodayCell = null;
    this.activeTodayHeaderCol = null;
    this.isMouseOverPopover = false;
    this.isHoverSuppressed = false;
    this.lastMouseCoords = null;
    this.navMouseOrigin = null;
    this.navDirection = 'forward';
    this.isUserEditingCommand = false;
    this.toastAnimationId = 0;
    this.isToastAnimating = false;

    this.cacheDom();
    this.bindEvents();
  }

  cacheDom() {
    // Header, Spaceship Segments & Badges
    this.connectionBadge = document.getElementById('connectionBadge');
    this.spCalendarBtn = document.getElementById('spCalendarBtn');
    this.spCalendarName = document.getElementById('spCalendarName');
    this.syncBtn = document.getElementById('syncBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.newEventBtn = document.getElementById('newEventBtn');
    this.openWebBtn = document.getElementById('openWebBtn');

    // cal(1) Spaceship Command Line & Month Navigation
    this.calCommandForm = document.getElementById('calCommandForm');
    this.calCommandLine = document.getElementById('calCommandLine');
    this.calCursor = document.getElementById('calCursor');
    this.currentMonthYear = document.getElementById('currentMonthYear');
    this.todayBtn = document.getElementById('todayBtn');
    this.prevMonthBtn = document.getElementById('prevMonthBtn');
    this.nextMonthBtn = document.getElementById('nextMonthBtn');
    this.weekdayHeader = document.getElementById('weekdayHeader');
    this.monthGrid = document.getElementById('monthGrid');
    this.statusToast = document.getElementById('statusToast');
    this.calendarSourceStatus = document.getElementById('calendarSourceStatus');
    this.lastSyncTimeText = document.getElementById('lastSyncTimeText');

    // Day Details Popover
    this.dayDetailPopover = document.getElementById('dayDetailPopover');
    this.popoverDateHeading = document.getElementById('popoverDateHeading');
    this.popoverRelativeBadge = document.getElementById('popoverRelativeBadge');
    this.popoverEventSummary = document.getElementById('popoverEventSummary');
    this.popoverAddEventBtn = document.getElementById('popoverAddEventBtn');
    this.popoverCloseBtn = document.getElementById('popoverCloseBtn');
    this.popoverScheduleList = document.getElementById('popoverScheduleList');

    // Settings Modal
    this.settingsModal = document.getElementById('settingsModal');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.closeModalFooterBtn = document.getElementById('closeModalFooterBtn');
    this.icalUrlInput = document.getElementById('icalUrlInput');
    this.syncIcalBtn = document.getElementById('syncIcalBtn');
    this.icalSyncStatus = document.getElementById('icalSyncStatus');
    this.calendarNameInput = document.getElementById('calendarNameInput');
    this.firstDaySelect = document.getElementById('firstDaySelect');
    this.demoModeToggle = document.getElementById('demoModeToggle');
    this.autoSyncIntervalSelect = document.getElementById('autoSyncIntervalSelect');
    this.themeSelect = document.getElementById('themeSelect');
    this.crtEffectToggle = document.getElementById('crtEffectToggle');
    this.crtOverlay = document.getElementById('crtOverlay');
  }

  bindEvents() {
    // Theme Switcher
    if (this.themeSelect) {
      this.themeSelect.addEventListener('change', async (e) => {
        const theme = e.target.value;
        this.setTheme(theme);
        await Storage.set({ theme });
        this.showToast(`Theme updated: ${theme === 'homebrew' ? 'Homebrew Terminal' : 'Obsidian Dark'}`);
      });
    }

    // CRT Monitor Effects Switcher
    if (this.crtEffectToggle) {
      this.crtEffectToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        this.setCrtEffects(enabled);
        await Storage.set({ crtEffects: enabled });
        this.showToast(enabled ? 'CRT monitor effects enabled' : 'CRT monitor effects disabled');
      });
    }

    // cal(1) Command Line Execution
    if (this.calCommandForm) {
      this.calCommandForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCalCommandSubmit();
      });
    }

    if (this.calCommandLine) {
      this.calCommandLine.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // IME composition safety check
          if (e.isComposing || e.keyCode === 229) return;
          this.handleCalCommandSubmit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.jumpToToday();
        } else if (e.key === 'ArrowLeft' && !this.isUserEditingCommand) {
          e.preventDefault();
          e.stopPropagation();
          this.navigateMonth(-1);
        } else if (e.key === 'ArrowRight' && !this.isUserEditingCommand) {
          e.preventDefault();
          e.stopPropagation();
          this.navigateMonth(1);
        } else if (e.key === 'ArrowUp' && !this.isUserEditingCommand) {
          e.preventDefault();
          e.stopPropagation();
          this.navigateYear(-1);
        } else if (e.key === 'ArrowDown' && !this.isUserEditingCommand) {
          e.preventDefault();
          e.stopPropagation();
          this.navigateYear(1);
        } else if (e.key === 'Backspace') {
          this.isUserEditingCommand = true;
        }
      });

      this.calCommandLine.addEventListener('input', () => {
        this.isUserEditingCommand = true;
        this.syncCommandInputWidth();
      });

      this.calCommandLine.addEventListener('keyup', () => {
        this.syncCommandInputWidth();
      });

      this.calCommandLine.addEventListener('focus', () => {
        const len = this.calCommandLine.value.length;
        this.calCommandLine.setSelectionRange(len, len);
        this.syncCommandInputWidth();
      });

      this.calCommandLine.addEventListener('click', () => {
        const len = this.calCommandLine.value.length;
        this.calCommandLine.setSelectionRange(len, len);
      });
    }

    const cmdContainer = document.querySelector('.cmd-input-container');
    if (cmdContainer && this.calCommandLine) {
      cmdContainer.addEventListener('click', (e) => {
        if (e.target !== this.calCommandLine) {
          this.calCommandLine.focus();
          const len = this.calCommandLine.value.length;
          this.calCommandLine.setSelectionRange(len, len);
          this.syncCommandInputWidth();
        }
      });
    }

    // Spaceship Prompt: Calendar segment click (cycle demo calendars or show active status)
    if (this.spCalendarBtn) {
      this.spCalendarBtn.addEventListener('click', () => {
        this.cycleOrSelectCalendar();
      });
    }

    // Settings Modal: Custom Calendar Name input
    if (this.calendarNameInput) {
      this.calendarNameInput.addEventListener('input', async (e) => {
        const val = e.target.value.trim();
        this.customCalendarName = val;
        this.calendarName = val || this.detectedCalendarName || (this.useDemoData ? 'demo' : 'main');
        await Storage.set({ customCalendarName: val, calendarName: this.calendarName });
        this.updateCalendarHeader();
      });
    }

    // Month Navigation
    this.prevMonthBtn.addEventListener('click', () => this.navigateMonth(-1));
    this.nextMonthBtn.addEventListener('click', () => this.navigateMonth(1));
    if (this.todayBtn) {
      this.todayBtn.addEventListener('click', () => this.jumpToToday());
    }

    // Sync Button
    this.syncBtn.addEventListener('click', () => this.refreshCalendar(true));

    // Settings Modal
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.closeModalFooterBtn.addEventListener('click', () => this.closeSettings());
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettings();
    });

    // iCal Sync Button in Settings
    this.syncIcalBtn.addEventListener('click', () => this.handleIcalSync());

    this.firstDaySelect.addEventListener('change', async (e) => {
      this.firstDayOfWeek = parseInt(e.target.value, 10);
      await Storage.set({ firstDayOfWeek: this.firstDayOfWeek });
      this.renderWeekdays();
      this.renderMonthGrid();
    });

    this.demoModeToggle.addEventListener('change', async (e) => {
      this.useDemoData = e.target.checked;
      await Storage.set({ useDemoData: this.useDemoData });
      if (this.useDemoData) {
        this.calendarName = this.customCalendarName || (this.activeCalendarFilter !== 'all' ? this.activeCalendarFilter : 'demo');
      } else {
        this.calendarName = this.customCalendarName || this.detectedCalendarName || 'main';
      }
      this.updateCalendarHeader();
      this.loadCalendarData();
    });

    this.autoSyncIntervalSelect.addEventListener('change', async (e) => {
      const interval = parseInt(e.target.value, 10);
      this.autoSyncInterval = interval;
      await Storage.set({ autoSyncInterval: interval });
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'UPDATE_SYNC_INTERVAL', interval });
      }
      this.showToast(interval > 0 ? `Auto-sync set to every ${interval}m` : 'Auto-sync disabled (Manual only)');
    });

    // Popover Close
    this.popoverCloseBtn.addEventListener('click', () => {
      this.hidePopover();
    });

    this.dayDetailPopover.addEventListener('mouseenter', () => {
      this.isMouseOverPopover = true;
      if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
    });

    this.dayDetailPopover.addEventListener('mouseleave', () => {
      this.isMouseOverPopover = false;
      this.hidePopover();
    });

    // Track mouse coordinates & release hover suppression when mouse moves deliberately
    document.addEventListener('mousemove', (e) => {
      this.lastMouseCoords = { x: e.clientX, y: e.clientY };
      if (this.isHoverSuppressed) {
        if (!this.navMouseOrigin) {
          this.isHoverSuppressed = false;
          document.body.classList.remove('keyboard-nav');
        } else {
          const dist = Math.hypot(e.clientX - this.navMouseOrigin.x, e.clientY - this.navMouseOrigin.y);
          if (dist > 6) {
            this.isHoverSuppressed = false;
            this.navMouseOrigin = null;
            document.body.classList.remove('keyboard-nav');
          }
        }
      }
    }, { capture: true, passive: true });

    document.addEventListener('mousedown', () => {
      if (this.isHoverSuppressed) {
        this.isHoverSuppressed = false;
        this.navMouseOrigin = null;
        document.body.classList.remove('keyboard-nav');
      }
    }, { capture: true, passive: true });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // ESC key: Reload and reset to today
      if (e.key === 'Escape') {
        e.preventDefault();
        if (this.settingsModal && !this.settingsModal.classList.contains('hidden')) {
          this.closeSettings();
        }
        this.jumpToToday();
        return;
      }

      // Don't intercept other shortcuts when settings modal is open
      if (this.settingsModal && !this.settingsModal.classList.contains('hidden')) {
        return;
      }

      const activeTag = document.activeElement?.tagName;
      const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      // Arrow keys for month and year navigation when not focused on an input
      if (e.key === 'ArrowLeft') {
        if (!isInputFocused) {
          e.preventDefault();
          this.navigateMonth(-1);
        }
      } else if (e.key === 'ArrowRight') {
        if (!isInputFocused) {
          e.preventDefault();
          this.navigateMonth(1);
        }
      } else if (e.key === 'ArrowUp') {
        if (!isInputFocused) {
          e.preventDefault();
          this.navigateYear(-1);
        }
      } else if (e.key === 'ArrowDown') {
        if (!isInputFocused) {
          e.preventDefault();
          this.navigateYear(1);
        }
      } else if (e.key === 'Backspace') {
        // If not already typing in an input, focus the command line and backspace
        if (document.activeElement !== this.calCommandLine && !isInputFocused) {
          e.preventDefault();
          if (this.calCommandLine) {
            this.focusCommandLine();
            this.isUserEditingCommand = true;
            const val = this.calCommandLine.value;
            if (val.length > 0) {
              this.calCommandLine.value = val.slice(0, -1);
              const len = this.calCommandLine.value.length;
              this.calCommandLine.setSelectionRange(len, len);
              this.syncCommandInputWidth();
            }
          }
        }
      } else if ((e.key === '/' || e.key === ':') && !e.metaKey && !e.ctrlKey) {
        if (this.calCommandLine && document.activeElement !== this.calCommandLine && !isInputFocused) {
          e.preventDefault();
          this.calCommandLine.focus();
          this.calCommandLine.select();
          this.isUserEditingCommand = true;
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // If user starts typing alphanumeric characters while not focused on input, redirect to calCommandLine
        if (!isInputFocused && this.calCommandLine) {
          this.focusCommandLine();
          this.isUserEditingCommand = true;
          const val = this.calCommandLine.value;
          const start = this.calCommandLine.selectionStart ?? val.length;
          const end = this.calCommandLine.selectionEnd ?? val.length;
          this.calCommandLine.value = val.slice(0, start) + e.key + val.slice(end);
          const newPos = start + 1;
          this.calCommandLine.setSelectionRange(newPos, newPos);
          this.syncCommandInputWidth();
          e.preventDefault();
        }
      }
    });

    // Listen for storage changes from background auto-sync worker
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          if (changes.savedIcalEvents) {
            this.events = changes.savedIcalEvents.newValue || [];
            if (changes.lastSyncTimestamp) {
              this.lastSyncTimestamp = changes.lastSyncTimestamp.newValue;
            }
            this.updateStatus(false, this.events.length);
            this.renderMonthGrid();
          }
          if (changes.calendarName && !this.customCalendarName) {
            this.calendarName = changes.calendarName.newValue || 'main';
            this.updateCalendarHeader();
          }
        }
      });
    }
  }

  async init() {
    const stored = await Storage.get([
      'theme',
      'crtEffects',
      'firstDayOfWeek',
      'useDemoData',
      'autoSyncInterval',
      'icalUrl',
      'savedIcalEvents',
      'lastSyncTimestamp',
      'calendarName',
      'customCalendarName',
      'detectedCalendarName',
      'activeCalendarFilter'
    ]);

    this.theme = stored.theme || 'homebrew';
    this.setTheme(this.theme);
    if (this.themeSelect) this.themeSelect.value = this.theme;

    this.crtEffects = stored.crtEffects !== false;
    this.setCrtEffects(this.crtEffects);
    if (this.crtEffectToggle) this.crtEffectToggle.checked = this.crtEffects;

    this.firstDayOfWeek = stored.firstDayOfWeek !== undefined ? stored.firstDayOfWeek : 0;
    this.useDemoData = stored.useDemoData !== false;
    this.autoSyncInterval = stored.autoSyncInterval !== undefined ? stored.autoSyncInterval : 15;
    this.icalUrl = stored.icalUrl || '';
    this.lastSyncTimestamp = stored.lastSyncTimestamp || null;

    this.customCalendarName = stored.customCalendarName || '';
    this.detectedCalendarName = stored.detectedCalendarName || '';
    this.activeCalendarFilter = stored.activeCalendarFilter || 'all';

    if (this.customCalendarName) {
      this.calendarName = this.customCalendarName;
    } else if (stored.calendarName) {
      this.calendarName = stored.calendarName;
    } else if (stored.savedIcalEvents && stored.savedIcalEvents[0]?.calendarName) {
      this.calendarName = stored.savedIcalEvents[0].calendarName;
    } else if (this.useDemoData) {
      this.calendarName = this.activeCalendarFilter !== 'all' ? this.activeCalendarFilter : 'demo';
    } else {
      this.calendarName = 'main';
    }

    this.firstDaySelect.value = String(this.firstDayOfWeek);
    this.autoSyncIntervalSelect.value = String(this.autoSyncInterval);
    this.demoModeToggle.checked = this.useDemoData;
    if (this.icalUrlInput) this.icalUrlInput.value = this.icalUrl;
    if (this.calendarNameInput) {
      this.calendarNameInput.value = this.customCalendarName || (this.calendarName !== 'demo' && this.calendarName !== 'main' ? this.calendarName : '');
    }

    this.renderWeekdays();
    this.updateMonthHeading();
    this.updateCalendarHeader();

    if (stored.savedIcalEvents && stored.savedIcalEvents.length > 0) {
      this.events = stored.savedIcalEvents;
      this.updateStatus(false, this.events.length);
      this.renderMonthGrid();

      // Check if cache is stale (older than sync interval) -> perform silent background auto-sync!
      if (this.icalUrl && !this.useDemoData && this.autoSyncInterval > 0) {
        const staleThreshold = this.autoSyncInterval * 60 * 1000;
        const isStale = !this.lastSyncTimestamp || (Date.now() - this.lastSyncTimestamp > staleThreshold);
        if (isStale) {
          console.log('[DarkCal] Cache is older than auto-sync interval. Refreshing in background...');
          this.handleIcalSync(false); // silent auto-sync
        }
      }
    } else {
      this.loadCalendarData();
    }

    this.focusCommandLine();
    requestAnimationFrame(() => this.focusCommandLine());
  }

  setCrtEffects(enabled) {
    this.crtEffects = enabled;
    if (this.crtOverlay) {
      if (enabled) {
        this.crtOverlay.classList.remove('hidden');
        document.body.classList.add('crt-active');
      } else {
        this.crtOverlay.classList.add('hidden');
        document.body.classList.remove('crt-active');
      }
    }
  }

  setTheme(themeName) {
    this.theme = themeName;
    if (themeName === 'obsidian') {
      document.body.classList.remove('theme-homebrew');
      document.body.classList.add('theme-obsidian');
    } else {
      document.body.classList.remove('theme-obsidian');
      document.body.classList.add('theme-homebrew');
    }
  }

  updateStatus(isDemo, count = 0) {
    if (this.connectionBadge) {
      if (isDemo) {
        this.connectionBadge.textContent = '[DEMO]';
        this.connectionBadge.className = 'badge badge-demo';
      } else {
        this.connectionBadge.textContent = '[ONLINE]';
        this.connectionBadge.className = 'badge badge-live';
      }
    }
    if (this.calendarSourceStatus) {
      this.calendarSourceStatus.textContent = '';
    }
    if (!this.isToastAnimating) {
      if (isDemo) {
        this.lastSyncTimeText.textContent = '';
      } else {
        this.lastSyncTimeText.textContent = this.formatLastSync(this.lastSyncTimestamp);
      }
    }
    this.updateCalendarHeader();
  }

  updateCalendarHeader() {
    if (!this.spCalendarName) return;
    const name = this.calendarName || (this.useDemoData ? 'demo' : 'main');
    this.spCalendarName.textContent = name;
    if (this.spCalendarBtn) {
      const modeDesc = this.useDemoData ? 'click to cycle demo feeds' : 'active calendar';
      this.spCalendarBtn.title = `Calendar: ${name} (${modeDesc})`;
      this.spCalendarBtn.setAttribute('aria-label', `Calendar: ${name}`);
    }
  }

  async cycleOrSelectCalendar() {
    if (this.useDemoData) {
      const demoOptions = ['all', 'work', 'personal', 'deadlines', 'team'];
      const currentIdx = demoOptions.indexOf(this.activeCalendarFilter);
      const nextIdx = (currentIdx + 1) % demoOptions.length;
      const nextFilter = demoOptions[nextIdx];

      this.activeCalendarFilter = nextFilter;
      this.calendarName = nextFilter === 'all' ? 'demo' : nextFilter;
      await Storage.set({ activeCalendarFilter: nextFilter, calendarName: this.calendarName });

      this.updateCalendarHeader();
      this.renderMonthGrid();
      this.showToast(`Switched calendar filter to "${this.calendarName}"`);
    } else {
      this.showToast(`Active calendar: "${this.calendarName}" (${this.events.length} events loaded)`);
    }
  }

  formatLastSync(timestamp) {
    if (!timestamp) return 'SYNC: now';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'SYNC: now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `SYNC: ${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `SYNC: ${diffHours}h ago`;
    return `SYNC: ${new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  }

  loadCalendarData() {
    if (this.icalUrl && !this.useDemoData) {
      this.handleIcalSync(false);
    } else {
      this.loadDemoEvents();
    }
  }

  loadDemoEvents() {
    this.calendars = getMockCalendars();
    this.events = generateMockEvents(this.viewYear, this.viewMonth);
    if (!this.customCalendarName) {
      this.calendarName = this.activeCalendarFilter !== 'all' ? this.activeCalendarFilter : 'demo';
      this.updateCalendarHeader();
    }
    this.updateStatus(true);
    this.renderMonthGrid();
  }

  async refreshCalendar(showToastMsg = false) {
    this.syncBtn.classList.add('syncing');
    if (this.icalUrl) {
      await this.handleIcalSync(showToastMsg);
    } else {
      this.loadDemoEvents();
      if (showToastMsg) this.showToast('Demo calendar refreshed');
    }
    this.syncBtn.classList.remove('syncing');
  }

  // -------------------------------------------------------------
  // iCal Sync
  // -------------------------------------------------------------
  async handleIcalSync(showFeedback = true) {
    const url = this.icalUrlInput.value.trim() || this.icalUrl;
    if (!url) {
      if (showFeedback) this.showToast('Please enter an iCal feed URL in settings');
      return;
    }

    this.syncIcalBtn.textContent = 'Syncing...';
    this.syncIcalBtn.disabled = true;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const icsData = await res.text();
      const parsedEvents = parseICal(icsData, 'Google Calendar', '#4285F4');

      if (parsedEvents.length === 0) {
        throw new Error('No events found in this iCal feed.');
      }

      const now = Date.now();
      const detectedName = parsedEvents.calendarName || 'main';
      this.detectedCalendarName = detectedName;
      const finalName = this.customCalendarName || detectedName;
      this.calendarName = finalName;
      this.events = parsedEvents;
      this.icalUrl = url;
      this.useDemoData = false;
      this.lastSyncTimestamp = now;

      await Storage.set({
        icalUrl: url,
        savedIcalEvents: parsedEvents,
        calendarName: finalName,
        detectedCalendarName: detectedName,
        useDemoData: false,
        lastSyncTimestamp: now
      });

      if (this.calendarNameInput && !this.customCalendarName) {
        this.calendarNameInput.value = finalName;
      }

      this.demoModeToggle.checked = false;
      this.updateStatus(false, parsedEvents.length);
      this.updateCalendarHeader();
      this.renderMonthGrid();

      if (this.icalSyncStatus) {
        this.icalSyncStatus.textContent = `✓ Auto-sync enabled! Synced ${parsedEvents.length} events.`;
        this.icalSyncStatus.className = 'ical-sync-status success';
        this.icalSyncStatus.classList.remove('hidden');
      }

      if (showFeedback) this.showToast(`Synced ${parsedEvents.length} events!`);
    } catch (err) {
      console.error('iCal sync failed:', err);
      if (this.icalSyncStatus) {
        this.icalSyncStatus.textContent = `Sync Error: ${err.message}`;
        this.icalSyncStatus.className = 'ical-sync-status error';
        this.icalSyncStatus.classList.remove('hidden');
      }
      if (showFeedback) this.showToast(`Sync failed: ${err.message}`, 4000);
    } finally {
      this.syncIcalBtn.textContent = 'Sync';
      this.syncIcalBtn.disabled = false;
    }
  }

  // -------------------------------------------------------------
  // Month Grid & Day Cells
  // -------------------------------------------------------------
  getMonthName(monthIndex = this.viewMonth) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[monthIndex];
  }

  updateMonthHeading() {
    const monthStr = this.getMonthName();
    if (this.calCommandLine) {
      this.calCommandLine.value = `cal ${monthStr} ${this.viewYear}`;
      this.isUserEditingCommand = false;
      this.syncCommandInputWidth();
      const len = this.calCommandLine.value.length;
      this.calCommandLine.setSelectionRange(len, len);
    }
    if (this.currentMonthYear) {
      this.currentMonthYear.textContent = `${monthStr} ${this.viewYear}`;
    }
  }

  focusCommandLine() {
    if (!this.calCommandLine) return;
    this.calCommandLine.focus();
    const len = this.calCommandLine.value.length;
    this.calCommandLine.setSelectionRange(len, len);
    this.syncCommandInputWidth();
  }

  syncCommandInputWidth() {
    if (!this.calCommandLine) return;
    const len = Math.max(this.calCommandLine.value.length, 1);
    this.calCommandLine.style.width = `${len}ch`;
  }

  async handleCalCommandSubmit() {
    if (!this.calCommandLine) return;
    const inputVal = this.calCommandLine.value.trim();
    if (!inputVal) {
      this.jumpToToday();
      return;
    }

    const result = this.parseCalCommand(inputVal, this.viewYear, this.viewMonth);
    if (result.error) {
      this.showToast(result.msg || 'Invalid syntax. Try "cal 12 2026"');
      return;
    }

    if (result.isHelp) {
      this.showToast(result.msg);
      this.updateMonthHeading();
      return;
    }

    if (result.isCalendarSwitch) {
      const target = result.calendarName.toLowerCase();
      if (this.useDemoData) {
        const valid = ['all', 'work', 'personal', 'deadlines', 'team'];
        const matched = valid.find(v => v === target || v.startsWith(target));
        if (matched) {
          this.activeCalendarFilter = matched;
          this.calendarName = matched === 'all' ? 'demo' : matched;
          await Storage.set({ activeCalendarFilter: matched, calendarName: this.calendarName });
          this.updateCalendarHeader();
          this.renderMonthGrid();
          this.showToast(`cal ➜ Switched calendar to "${this.calendarName}"`);
        } else {
          this.showToast(`Unknown calendar "${result.calendarName}". Try: @all, @work, @personal, @deadlines, @team`);
        }
      } else {
        this.calendarName = result.calendarName;
        this.customCalendarName = result.calendarName;
        if (this.calendarNameInput) this.calendarNameInput.value = this.calendarName;
        await Storage.set({ customCalendarName: this.calendarName, calendarName: this.calendarName });
        this.updateCalendarHeader();
        this.showToast(`cal ➜ Calendar set to "${this.calendarName}"`);
      }
      this.updateMonthHeading();
      return;
    }

    this.hidePopover();
    this.suppressHoverUntilUserMoves();
    const targetVal = result.year * 12 + result.month;
    const currentVal = this.viewYear * 12 + this.viewMonth;
    this.navDirection = targetVal < currentVal ? 'backward' : 'forward';
    this.viewYear = result.year;
    this.viewMonth = result.month;
    this.updateMonthHeading();

    if (this.useDemoData || !this.icalUrl) {
      this.loadDemoEvents();
    } else {
      this.renderMonthGrid();
    }

    this.showToast(result.msg || `cal(1) ➜ ${this.getMonthName()} ${this.viewYear}`);
  }

  parseCalCommand(cmdStr, currentYear, currentMonth) {
    let text = cmdStr.trim();
    // Strip leading $, ➜, ❯, > if typed or pasted
    text = text.replace(/^[$➜❯>]\s*/, '').trim();

    // If starts with 'cal', strip it
    if (text.toLowerCase().startsWith('cal')) {
      text = text.slice(3).trim();
    }

    const tokens = text.split(/\s+/).filter(Boolean);

    // 'cal' with no args -> today!
    if (tokens.length === 0) {
      const today = new Date();
      return { month: today.getMonth(), year: today.getFullYear(), msg: 'cal ➜ Current month' };
    }

    const first = tokens[0].toLowerCase();
    if (first === 'today') {
      const today = new Date();
      return { month: today.getMonth(), year: today.getFullYear(), msg: 'cal ➜ Jumped to Today' };
    }
    if (first === 'next' || first === '+1') {
      let m = currentMonth + 1;
      let y = currentYear;
      if (m > 11) { m = 0; y += 1; }
      return { month: m, year: y };
    }
    if (first === 'prev' || first === '-1') {
      let m = currentMonth - 1;
      let y = currentYear;
      if (m < 0) { m = 11; y -= 1; }
      return { month: m, year: y };
    }
    if (first === 'help' || first === '--help' || first === '-h' || first === 'man') {
      return { isHelp: true, msg: 'Usage: cal [[month] year] | cal @[calendar] | e.g. "cal 12 2026", "cal @work"' };
    }

    // Calendar switch: cal @[name] or cal -c [name]
    if (first.startsWith('@') && first.length > 1) {
      return { isCalendarSwitch: true, calendarName: first.substring(1) };
    }
    if ((first === '-c' || first === '--cal' || first === '--calendar') && tokens[1]) {
      return { isCalendarSwitch: true, calendarName: tokens[1] };
    }

    // Flag options: -m [month] [year] or -y [year]
    if (first === '-m' && tokens[1]) {
      const m = this.parseMonthToken(tokens[1]);
      const y = tokens[2] ? this.parseYearToken(tokens[2]) : currentYear;
      if (m !== null && y !== null) return { month: m, year: y };
    }
    if (first === '-y' && tokens[1]) {
      const y = this.parseYearToken(tokens[1]);
      if (y !== null) return { month: 0, year: y, msg: `cal ➜ Year ${y} (Jan)` };
    }

    // Standard POSIX cal: cal [month] [year] (e.g. '10 2026' or 'October 2026')
    if (tokens.length >= 2) {
      const m = this.parseMonthToken(tokens[0]);
      const y = this.parseYearToken(tokens[1]);
      if (m !== null && y !== null) {
        return { month: m, year: y };
      }
      // Or reversed: '2026 10' or '2026 oct'
      const yFirst = this.parseYearToken(tokens[0]);
      const mSecond = this.parseMonthToken(tokens[1]);
      if (yFirst !== null && mSecond !== null) {
        return { month: mSecond, year: yFirst };
      }
    }

    // Single token: could be month name/num or 4-digit year
    if (tokens.length === 1) {
      const num = parseInt(tokens[0], 10);
      if (!isNaN(num) && num > 12) {
        const y = this.parseYearToken(tokens[0]);
        if (y !== null) return { month: 0, year: y, msg: `cal ➜ Year ${y} (Jan)` };
      }
      const m = this.parseMonthToken(tokens[0]);
      if (m !== null) {
        return { month: m, year: currentYear };
      }
    }

    return { error: true, msg: `Unknown syntax "${cmdStr}". Try "cal 12 2026"` };
  }

  parseMonthToken(str) {
    if (!str) return null;
    const num = parseInt(str, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      return num - 1; // 0-indexed
    }
    const shortNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const fullNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const lower = str.toLowerCase();
    for (let i = 0; i < 12; i++) {
      if (shortNames[i] === lower || fullNames[i] === lower || fullNames[i].startsWith(lower)) {
        return i;
      }
    }
    return null;
  }

  parseYearToken(str) {
    if (!str) return null;
    let num = parseInt(str, 10);
    if (isNaN(num)) return null;
    if (num >= 0 && num < 100) {
      num += 2000;
    }
    if (num >= 1 && num <= 9999) return num;
    return null;
  }

  renderWeekdays() {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayClasses = ['day-sun', 'day-mon', 'day-tue', 'day-wed', 'day-thu', 'day-fri', 'day-sat'];
    const thaiColorNames = ['Red', 'Yellow', 'Pink', 'Green', 'Orange', 'Blue', 'Purple'];
    const ordered = [];
    for (let i = 0; i < 7; i++) {
      const idx = (this.firstDayOfWeek + i) % 7;
      ordered.push({
        name: names[idx],
        dayClass: dayClasses[idx],
        colorName: thaiColorNames[idx],
        isWeekend: idx === 0 || idx === 6
      });
    }
    this.weekdayHeader.innerHTML = ordered
      .map(d => `
        <div class="weekday-col ${d.dayClass} ${d.isWeekend ? 'weekend' : ''}" title="${d.name} (${d.colorName})">
          <span class="weekday-name">${d.name}</span>
        </div>
      `)
      .join('');
  }

  suppressHoverUntilUserMoves() {
    this.isHoverSuppressed = true;
    this.navMouseOrigin = this.lastMouseCoords ? { ...this.lastMouseCoords } : null;
    document.body.classList.add('keyboard-nav');
  }

  navigateMonth(delta) {
    this.hidePopover();
    this.suppressHoverUntilUserMoves();
    this.navDirection = delta < 0 ? 'backward' : 'forward';
    this.viewMonth += delta;
    if (this.viewMonth < 0) {
      this.viewMonth = 11;
      this.viewYear -= 1;
    } else if (this.viewMonth > 11) {
      this.viewMonth = 0;
      this.viewYear += 1;
    }
    this.updateMonthHeading();
    if (this.useDemoData || !this.icalUrl) {
      this.loadDemoEvents();
    } else {
      this.renderMonthGrid();
    }
    this.showToast(`cal(1) ➜ ${this.getMonthName()} ${this.viewYear}`);
  }

  navigateYear(delta) {
    this.hidePopover();
    this.suppressHoverUntilUserMoves();
    this.navDirection = delta < 0 ? 'backward' : 'forward';
    this.viewYear += delta;
    this.updateMonthHeading();
    if (this.useDemoData || !this.icalUrl) {
      this.loadDemoEvents();
    } else {
      this.renderMonthGrid();
    }
    this.showToast(`cal(1) ➜ ${this.getMonthName()} ${this.viewYear}`);
  }

  jumpToToday() {
    this.hidePopover();
    this.suppressHoverUntilUserMoves();
    const todayVal = this.today.getFullYear() * 12 + this.today.getMonth();
    const currentVal = this.viewYear * 12 + this.viewMonth;
    this.navDirection = todayVal < currentVal ? 'backward' : 'forward';
    this.today = new Date();
    this.viewYear = this.today.getFullYear();
    this.viewMonth = this.today.getMonth();
    this.isUserEditingCommand = false;
    this.updateMonthHeading();
    this.focusCommandLine();
    if (this.useDemoData || !this.icalUrl) {
      this.loadDemoEvents();
    } else {
      this.renderMonthGrid();
      if (this.icalUrl) {
        this.handleIcalSync(false);
      }
    }
    this.showToast(`cal(1) ➜ ${this.getMonthName()} ${this.viewYear}`);
  }

  renderMonthGrid() {
    this.hidePopover();
    this.monthGrid.innerHTML = '';
    if (this.todayBlinkTimeout) {
      clearTimeout(this.todayBlinkTimeout);
      this.todayBlinkTimeout = null;
    }
    this.stopTodayBlinking();

    // Reset any previous is-today / today-blinking classes on weekday headers
    if (this.weekdayHeader) {
      this.weekdayHeader.querySelectorAll('.weekday-col').forEach(col => {
        col.classList.remove('is-today', 'today-blinking');
      });
    }

    const firstDayOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    const lastDayOfMonth = new Date(this.viewYear, this.viewMonth + 1, 0);
    const numDaysInMonth = lastDayOfMonth.getDate();

    let firstDayIndex = firstDayOfMonth.getDay() - this.firstDayOfWeek;
    if (firstDayIndex < 0) firstDayIndex += 7;

    const currentCellsCount = firstDayIndex + numDaysInMonth;
    const totalCells = currentCellsCount > 35 ? 42 : 35;
    const trailingDays = totalCells - currentCellsCount;

    const prevMonthLastDay = new Date(this.viewYear, this.viewMonth, 0).getDate();
    const todayDateStr = this.formatDateKey(this.today);

    const isBackward = this.navDirection === 'backward';
    let pos = 0;
    let todayCell = null;

    // Prev month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(this.viewYear, this.viewMonth - 1, dayNum);
      const dayKey = this.formatDateKey(prevDate);
      const dayEvents = this.getEventsForDate(prevDate);
      const isToday = dayKey === todayDateStr;
      const animIndex = isBackward ? (totalCells - 1 - pos) : pos;
      pos++;
      
      const cell = this.createDayCell({
        date: prevDate,
        dayNum,
        dayKey,
        isOtherMonth: true,
        isToday: false,
        events: dayEvents,
        cellIndex: animIndex,
        isBackward
      });
      if (isToday) todayCell = cell;
      this.monthGrid.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= numDaysInMonth; day++) {
      const curDate = new Date(this.viewYear, this.viewMonth, day);
      const dayKey = this.formatDateKey(curDate);
      const dayEvents = this.getEventsForDate(curDate);
      const isToday = dayKey === todayDateStr;
      const animIndex = isBackward ? (totalCells - 1 - pos) : pos;
      pos++;

      const cell = this.createDayCell({
        date: curDate,
        dayNum: day,
        dayKey,
        isOtherMonth: false,
        isToday: false,
        events: dayEvents,
        cellIndex: animIndex,
        isBackward
      });
      if (isToday) todayCell = cell;
      this.monthGrid.appendChild(cell);
    }

    // Trailing days
    for (let day = 1; day <= trailingDays; day++) {
      const nextDate = new Date(this.viewYear, this.viewMonth + 1, day);
      const dayKey = this.formatDateKey(nextDate);
      const dayEvents = this.getEventsForDate(nextDate);
      const isToday = dayKey === todayDateStr;
      const animIndex = isBackward ? (totalCells - 1 - pos) : pos;
      pos++;

      const cell = this.createDayCell({
        date: nextDate,
        dayNum: day,
        dayKey,
        isOtherMonth: true,
        isToday: false,
        events: dayEvents,
        cellIndex: animIndex,
        isBackward
      });
      if (isToday) todayCell = cell;
      this.monthGrid.appendChild(cell);
    }

    // After all tiles finish scanning in, trigger continuous bright-green blinking on todayCell until user interaction
    if (todayCell) {
      const totalScanDuration = (totalCells - 1) * 28 + 160;
      this.todayBlinkTimeout = setTimeout(() => {
        this.startTodayBlinking(todayCell);
      }, totalScanDuration + 25);
    }
  }

  startTodayBlinking(todayCell) {
    if (!todayCell) return;
    this.activeTodayCell = todayCell;
    todayCell.classList.add('is-today', 'today-blinking');

    // Also blink today's weekday header column (SUN, MON, etc.) in matching rhythm
    const dayClasses = ['day-sun', 'day-mon', 'day-tue', 'day-wed', 'day-thu', 'day-fri', 'day-sat'];
    const todayDayClass = dayClasses[this.today.getDay()];
    const todayHeaderCol = this.weekdayHeader ? this.weekdayHeader.querySelector(`.weekday-col.${todayDayClass}`) : null;
    if (todayHeaderCol) {
      this.activeTodayHeaderCol = todayHeaderCol;
      todayHeaderCol.classList.add('is-today', 'today-blinking');
    }

    const onUserInteraction = (e) => {
      // Ignore phantom mousemoves with no actual displacement
      if (e.type === 'mousemove' && e.movementX === 0 && e.movementY === 0) {
        return;
      }
      this.stopTodayBlinking();
    };

    this.todayInteractionCleanup = () => {
      window.removeEventListener('mousemove', onUserInteraction);
      window.removeEventListener('mousedown', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
      window.removeEventListener('wheel', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
    };

    window.addEventListener('mousemove', onUserInteraction, { passive: true });
    window.addEventListener('mousedown', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });
    window.addEventListener('wheel', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
  }

  stopTodayBlinking() {
    if (this.todayInteractionCleanup) {
      this.todayInteractionCleanup();
      this.todayInteractionCleanup = null;
    }
    if (this.activeTodayCell) {
      this.activeTodayCell.classList.remove('today-blinking');
      this.activeTodayCell.classList.add('is-today');
      this.activeTodayCell = null;
    }
    if (this.activeTodayHeaderCol) {
      this.activeTodayHeaderCol.classList.remove('today-blinking');
      this.activeTodayHeaderCol.classList.add('is-today');
      this.activeTodayHeaderCol = null;
    }
  }

  createDayCell({ date, dayNum, dayKey, isOtherMonth, isToday, events, cellIndex = 0, isBackward = false }) {
    const cell = document.createElement('div');
    const animClass = isBackward ? 'tile-appear-reverse' : 'tile-appear';
    cell.className = `day-cell ${animClass}`;
    cell.style.animationDelay = `${cellIndex * 28}ms`;
    cell.addEventListener('animationend', () => {
      cell.classList.remove('tile-appear', 'tile-appear-reverse');
      cell.style.animationDelay = '';
    }, { once: true });
    const dayClasses = ['day-sun', 'day-mon', 'day-tue', 'day-wed', 'day-thu', 'day-fri', 'day-sat'];
    cell.classList.add(dayClasses[date.getDay()]);
    cell.dataset.date = dayKey;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('tabindex', '0');

    if (isOtherMonth) cell.classList.add('other-month');
    if (isToday) cell.classList.add('is-today');

    const topRow = document.createElement('div');
    topRow.className = 'day-cell-top';

    const numSpan = document.createElement('span');
    numSpan.className = 'day-number';
    numSpan.textContent = dayNum;
    topRow.appendChild(numSpan);

    if (events.length > 0) {
      const countBadge = document.createElement('span');
      countBadge.className = 'day-event-count';
      countBadge.textContent = events.length;
      topRow.appendChild(countBadge);
    }
    cell.appendChild(topRow);

    if (events.length > 0) {
      const preview = document.createElement('div');
      preview.className = 'day-events-preview';

      if (events.length <= 2) {
        events.forEach(evt => {
          const chip = document.createElement('div');
          chip.className = 'event-chip-mini';
          chip.title = evt.summary;
          const evtColor = evt.color || 'var(--accent-cyan)';
          chip.style.borderColor = evtColor;
          chip.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';

          const dot = document.createElement('span');
          dot.className = 'event-chip-dot';
          dot.style.backgroundColor = evtColor;
          dot.style.boxShadow = `0 0 3px ${evtColor}`;
          chip.appendChild(dot);

          const text = document.createElement('span');
          text.className = 'event-chip-text';
          text.textContent = evt.summary;
          text.style.color = evtColor;
          chip.appendChild(text);

          preview.appendChild(chip);
        });
      } else {
        const firstChip = document.createElement('div');
        firstChip.className = 'event-chip-mini';
        firstChip.title = events[0].summary;
        const firstColor = events[0].color || 'var(--accent-cyan)';
        firstChip.style.borderColor = firstColor;
        firstChip.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';

        const dot = document.createElement('span');
        dot.className = 'event-chip-dot';
        dot.style.backgroundColor = firstColor;
        dot.style.boxShadow = `0 0 3px ${firstColor}`;
        firstChip.appendChild(dot);

        const text = document.createElement('span');
        text.className = 'event-chip-text';
        text.textContent = events[0].summary;
        text.style.color = firstColor;
        firstChip.appendChild(text);
        preview.appendChild(firstChip);

        const dotsRow = document.createElement('div');
        dotsRow.className = 'event-dots-row';
        for (let i = 1; i < Math.min(events.length, 5); i++) {
          const d = document.createElement('span');
          d.className = 'event-dot';
          const dotColor = events[i].color || 'var(--accent-cyan)';
          d.style.backgroundColor = dotColor;
          d.style.boxShadow = `0 0 3px ${dotColor}`;
          dotsRow.appendChild(d);
        }
        preview.appendChild(dotsRow);
      }

      cell.appendChild(preview);
    }

    cell.addEventListener('mouseenter', () => {
      if (this.isHoverSuppressed) return;
      if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
      this.hoverTimeout = setTimeout(() => {
        if (this.isHoverSuppressed) return;
        this.showDaySchedulePopover(cell, date, events);
      }, 350);
    });

    cell.addEventListener('mousemove', () => {
      if (this.isHoverSuppressed || this.activeHoverCell === cell || this.hoverTimeout) return;
      this.hoverTimeout = setTimeout(() => {
        if (this.isHoverSuppressed) return;
        this.showDaySchedulePopover(cell, date, events);
      }, 350);
    });

    cell.addEventListener('mouseleave', () => {
      if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
      this.hoverTimeout = setTimeout(() => {
        if (!this.isMouseOverPopover) {
          this.hidePopover();
        }
      }, 220);
    });

    return cell;
  }

  showDaySchedulePopover(cellEl, date, events) {
    if (this.isHoverSuppressed) return;
    if (this.activeHoverCell && this.activeHoverCell !== cellEl) {
      this.activeHoverCell.classList.remove('popover-active');
    }
    this.activeHoverCell = cellEl;
    if (cellEl) {
      cellEl.classList.add('popover-active');
    }

    const formattedHeading = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
    this.popoverDateHeading.textContent = formattedHeading;

    const dayKey = this.formatDateKey(date);
    const todayKey = this.formatDateKey(this.today);
    const tomorrowKey = this.formatDateKey(new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() + 1));
    const yesterdayKey = this.formatDateKey(new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() - 1));

    if (dayKey === todayKey) {
      this.popoverRelativeBadge.textContent = 'Today';
      this.popoverRelativeBadge.classList.remove('hidden');
    } else if (dayKey === tomorrowKey) {
      this.popoverRelativeBadge.textContent = 'Tomorrow';
      this.popoverRelativeBadge.classList.remove('hidden');
    } else if (dayKey === yesterdayKey) {
      this.popoverRelativeBadge.textContent = 'Yesterday';
      this.popoverRelativeBadge.classList.remove('hidden');
    } else {
      this.popoverRelativeBadge.classList.add('hidden');
    }

    const count = events.length;
    this.popoverEventSummary.textContent = count === 0
      ? 'No events scheduled'
      : `${count} ${count === 1 ? 'event' : 'events'} on your schedule`;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateParam = `${year}${month}${day}`;
    this.popoverAddEventBtn.href = `https://calendar.google.com/calendar/r/eventedit?dates=${dateParam}/${dateParam}`;

    this.renderPopoverSchedule(events, date);
    this.dayDetailPopover.classList.remove('hidden');
    this.positionPopover(cellEl);
  }

  renderPopoverSchedule(events, date) {
    this.popoverScheduleList.innerHTML = '';

    if (!events || events.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'schedule-empty';
      emptyDiv.innerHTML = `
        <svg class="empty-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m9 12 2 2 4-4"></path>
        </svg>
        <div class="empty-title">Clear Day Ahead</div>
        <div class="empty-desc">No events scheduled. Great day for deep focus or taking time off!</div>
      `;
      this.popoverScheduleList.appendChild(emptyDiv);
      return;
    }

    const sorted = [...events].sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      const aTime = a.start?.dateTime ? new Date(a.start.dateTime).getTime() : 0;
      const bTime = b.start?.dateTime ? new Date(b.start.dateTime).getTime() : 0;
      return aTime - bTime;
    });

    sorted.forEach(evt => {
      const item = document.createElement('div');
      item.className = 'schedule-item';
      item.style.borderLeftColor = evt.color || 'var(--accent-primary)';

      const topRow = document.createElement('div');
      topRow.className = 'schedule-item-top';

      const timeBadge = document.createElement('span');
      timeBadge.className = 'schedule-time-badge';

      if (evt.isAllDay) {
        timeBadge.textContent = 'All Day';
        timeBadge.style.color = evt.color || 'var(--accent-cyan)';
      } else {
        const { startStr, endStr, durationStr } = this.formatEventTimes(evt);
        timeBadge.textContent = `${startStr} – ${endStr}`;
        if (durationStr) {
          const durationBadge = document.createElement('span');
          durationBadge.className = 'schedule-duration';
          durationBadge.textContent = durationStr;
          topRow.appendChild(durationBadge);
        }
      }
      topRow.prepend(timeBadge);
      item.appendChild(topRow);

      const title = document.createElement('div');
      title.className = 'schedule-title';
      title.textContent = evt.summary;
      item.appendChild(title);

      if (evt.calendarName) {
        const calTag = document.createElement('div');
        calTag.className = 'schedule-calendar-name';
        calTag.textContent = evt.calendarName;
        calTag.style.color = evt.color || 'var(--text-muted)';
        item.appendChild(calTag);
      }

      const details = document.createElement('div');
      details.className = 'schedule-details';

      if (evt.location && !evt.meetLink) {
        const loc = document.createElement('div');
        loc.className = 'schedule-location';
        loc.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>${this.escapeHtml(evt.location)}</span>
        `;
        details.appendChild(loc);
      }

      if (evt.meetLink) {
        const meetBtn = document.createElement('a');
        meetBtn.className = 'schedule-meet-btn';
        meetBtn.href = evt.meetLink;
        meetBtn.target = '_blank';
        meetBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          <span>Join Video Call</span>
        `;
        details.appendChild(meetBtn);
      }

      if (evt.description) {
        const desc = document.createElement('div');
        desc.className = 'schedule-description';
        desc.textContent = evt.description;
        details.appendChild(desc);
      }

      if (details.children.length > 0) {
        item.appendChild(details);
      }

      this.popoverScheduleList.appendChild(item);
    });
  }

  positionPopover(cellEl) {
    const appEl = document.querySelector('.calendar-app');
    if (!appEl || !cellEl) return;

    const appRect = appEl.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();

    const popoverWidth = 295;
    const marginX = 10;
    const topBoundary = 70; // Just below month navigation bar
    const bottomBoundary = appRect.height - 30; // Just above footer

    const relCellLeft = cellRect.left - appRect.left;
    const relCellRight = cellRect.right - appRect.left;
    const relCellTop = cellRect.top - appRect.top;
    const relCellBottom = cellRect.bottom - appRect.top;
    const relCellCenterX = relCellLeft + cellRect.width / 2;
    const relCellCenterY = relCellTop + cellRect.height / 2;

    const appMidX = appRect.width / 2;
    const appMidY = appRect.height / 2;

    // 1. Horizontal opposite side:
    // Cell on left half -> popover on right corner
    // Cell on right half -> popover on left corner
    let targetLeft;
    if (relCellCenterX <= appMidX) {
      targetLeft = appRect.width - popoverWidth - marginX;
    } else {
      targetLeft = marginX;
    }
    const targetRight = targetLeft + popoverWidth;

    // Check if cell and popover share horizontal columns
    const horizontalOverlap = !(relCellRight <= targetLeft || relCellLeft >= targetRight);

    // Measure natural height of rendered popover
    const naturalHeight = this.dayDetailPopover.offsetHeight || 220;

    // 2. Vertical opposite side:
    // Cell in top half -> popover in bottom corner
    // Cell in bottom half -> popover in top corner
    let targetTop;
    let effectiveMaxHeight = 330;

    if (relCellCenterY <= appMidY) {
      // Cell in TOP half -> Popover in BOTTOM corner
      if (horizontalOverlap) {
        // Guarantee popover sits strictly below hovered cell
        const minTopBelowCell = relCellBottom + 4;
        effectiveMaxHeight = Math.max(140, bottomBoundary - minTopBelowCell);
        const computedHeight = Math.min(naturalHeight, effectiveMaxHeight);
        targetTop = Math.max(minTopBelowCell, bottomBoundary - computedHeight);
      } else {
        // Clear horizontal separation (e.g. Oct 5) -> Dock neatly above footer
        const computedHeight = Math.min(naturalHeight, effectiveMaxHeight);
        targetTop = bottomBoundary - computedHeight;
      }
    } else {
      // Cell in BOTTOM half -> Popover in TOP corner
      targetTop = topBoundary;
      if (horizontalOverlap) {
        // Guarantee popover sits strictly above hovered cell
        effectiveMaxHeight = Math.max(140, relCellTop - 4 - topBoundary);
      }
    }

    this.dayDetailPopover.style.width = `${popoverWidth}px`;
    this.dayDetailPopover.style.maxHeight = `${Math.round(effectiveMaxHeight)}px`;
    this.dayDetailPopover.style.left = `${Math.round(targetLeft)}px`;
    this.dayDetailPopover.style.top = `${Math.round(targetTop)}px`;
  }

  hidePopover() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    this.isMouseOverPopover = false;
    this.dayDetailPopover.classList.add('hidden');
    this.dayDetailPopover.style.maxHeight = '';
    if (this.activeHoverCell) {
      this.activeHoverCell.classList.remove('popover-active');
      this.activeHoverCell = null;
    }
  }

  formatDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getEventsForDate(date) {
    const key = this.formatDateKey(date);
    return this.events.filter(evt => {
      // If filtering by specific demo calendar feed
      if (this.useDemoData && this.activeCalendarFilter && this.activeCalendarFilter !== 'all') {
        const target = this.activeCalendarFilter.toLowerCase();
        const calId = (evt.calendarId || '').toLowerCase();
        const calName = (evt.calendarName || '').toLowerCase();
        if (calId !== target && !calName.includes(target)) {
          return false;
        }
      }

      if (evt.isAllDay) {
        const startDay = evt.start?.date;
        const endDay = evt.end?.date || evt.start?.date;
        return key >= startDay && key <= endDay;
      }
      if (evt.start?.dateTime) {
        const evtDate = new Date(evt.start.dateTime);
        return this.formatDateKey(evtDate) === key;
      }
      return false;
    });
  }

  formatEventTimes(evt) {
    const sDate = new Date(evt.start.dateTime);
    const eDate = new Date(evt.end.dateTime);
    const formatOpts = { hour: 'numeric', minute: '2-digit', hour12: true };
    const startStr = sDate.toLocaleTimeString('en-US', formatOpts);
    const endStr = eDate.toLocaleTimeString('en-US', formatOpts);

    const diffMinutes = Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60));
    let durationStr = '';
    if (diffMinutes > 0) {
      if (diffMinutes < 60) {
        durationStr = `${diffMinutes}m`;
      } else {
        const hours = (diffMinutes / 60).toFixed(1).replace('.0', '');
        durationStr = `${hours}h`;
      }
    }
    return { startStr, endStr, durationStr };
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async showToast(msg, duration = 2200) {
    if (!this.lastSyncTimeText) return;

    const animId = ++this.toastAnimationId;
    this.isToastAnimating = true;
    const elem = this.lastSyncTimeText;
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // 1. Remove original line by backspacing one by one character
    while (elem.textContent.length > 0) {
      if (this.toastAnimationId !== animId) return;
      elem.textContent = elem.textContent.slice(0, -1);
      await sleep(10);
    }

    if (this.toastAnimationId !== animId) return;
    elem.classList.add('status-active');

    // 2. Type new message one by one character
    for (let i = 1; i <= msg.length; i++) {
      if (this.toastAnimationId !== animId) return;
      elem.textContent = msg.slice(0, i);
      await sleep(15);
    }

    // 3. Wait a bit
    const pauseStart = Date.now();
    while (Date.now() - pauseStart < duration) {
      if (this.toastAnimationId !== animId) return;
      await sleep(35);
    }

    // 4. Remove by backspacing one by one character
    while (elem.textContent.length > 0) {
      if (this.toastAnimationId !== animId) return;
      elem.textContent = elem.textContent.slice(0, -1);
      await sleep(10);
    }

    if (this.toastAnimationId !== animId) return;
    elem.classList.remove('status-active');

    // 5. Show up SYNC again one by one character
    const targetText = this.getDefaultFooterText();
    for (let i = 1; i <= targetText.length; i++) {
      if (this.toastAnimationId !== animId) return;
      elem.textContent = targetText.slice(0, i);
      await sleep(15);
    }

    if (this.toastAnimationId === animId) {
      elem.textContent = targetText;
      this.isToastAnimating = false;
    }
  }

  getDefaultFooterText() {
    if (this.useDemoData || !this.icalUrl) {
      return '';
    }
    return this.formatLastSync(this.lastSyncTimestamp);
  }

  openSettings() {
    this.hidePopover();
    this.settingsModal.classList.remove('hidden');
  }

  closeSettings() {
    this.settingsModal.classList.add('hidden');
    this.focusCommandLine();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new DarkCalApp();
  window.app = app;
  app.init();
});
