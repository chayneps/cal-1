// tests/e2e/onboarding.test.js
const test = require('node:test');
const assert = require('node:assert');
const { TestBrowser } = require('../helpers/test-browser.js');

test('E2E Regression: First-Run Onboarding (Settings + Sign-In)', async (t) => {
  // Opt in to onboarding: fresh profile with no stored settings (brand-new user)
  const browser = new TestBrowser({ port: 8896, debugPort: 9256, onboarding: true });
  await browser.start();

  t.after(() => {
    browser.close();
  });

  await t.test('New user lands on Settings with the Sign-In button centered and highlighted', async () => {
    // Allow the double requestAnimationFrame + smooth scroll to settle
    await new Promise(r => setTimeout(r, 700));

    const res = await browser.eval(`
      (() => {
        const modal = document.getElementById('settingsModal');
        const modalBody = modal.querySelector('.modal-body');
        const btn = document.getElementById('googleSignInBtn');
        const status = document.getElementById('googleAuthStatus');

        const bodyRect = modalBody.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        const bodyCenter = bodyRect.top + bodyRect.height / 2;
        const btnCenter = btnRect.top + btnRect.height / 2;
        const canScroll = modalBody.scrollHeight > modalBody.clientHeight;
        const maxScroll = modalBody.scrollHeight - modalBody.clientHeight;

        return {
          modalOpen: !modal.classList.contains('hidden'),
          isOnboarding: window.app.isOnboarding === true,
          hasPulse: btn.classList.contains('onboarding-pulse'),
          btnFocused: document.activeElement === btn,
          btnVisible: btnRect.top >= bodyRect.top && btnRect.bottom <= bodyRect.bottom,
          centerDelta: Math.abs(bodyCenter - btnCenter),
          canScroll,
          scrollTop: modalBody.scrollTop,
          maxScroll,
          welcomeShown: !status.classList.contains('hidden') && status.classList.contains('info'),
          welcomeText: status.textContent
        };
      })()
    `);

    assert.strictEqual(res.modalOpen, true, 'Settings modal should auto-open for a new user');
    assert.strictEqual(res.isOnboarding, true, 'App should be in onboarding mode');
    assert.strictEqual(res.hasPulse, true, 'Sign-In button should pulse to draw attention');
    assert.strictEqual(res.btnFocused, true, 'Sign-In button should be focused (Enter signs in)');
    assert.strictEqual(res.btnVisible, true, 'Sign-In button must be fully visible in the modal body');
    assert.strictEqual(res.welcomeShown, true, 'Welcome hint banner should be shown');
    assert.ok(res.welcomeText.includes('Sign in with Google'), `Welcome text: ${res.welcomeText}`);
    if (res.canScroll && res.scrollTop < res.maxScroll - 1 && res.scrollTop > 0) {
      assert.ok(res.centerDelta < 12, `Sign-In button should be vertically centered (delta ${res.centerDelta}px)`);
    }
  });

  await t.test('Closing Settings completes onboarding and it does not reappear on reopen', async () => {
    const res = await browser.eval(`
      (() => {
        window.app.closeSettings();
        const btn = document.getElementById('googleSignInBtn');
        const status = document.getElementById('googleAuthStatus');
        return {
          isOnboarding: window.app.isOnboarding === true,
          hasPulse: btn.classList.contains('onboarding-pulse'),
          welcomeHidden: status.classList.contains('hidden'),
          storedFlag: localStorage.getItem('darkcal_onboardingDone')
        };
      })()
    `);

    assert.strictEqual(res.isOnboarding, false);
    assert.strictEqual(res.hasPulse, false, 'Pulse highlight should be removed after closing');
    assert.strictEqual(res.welcomeHidden, true, 'Welcome banner should be cleared after closing');
    assert.strictEqual(res.storedFlag, 'true', 'onboardingDone should be persisted');

    await browser.reload();

    const afterReload = await browser.eval(`
      (() => ({
        modalOpen: !document.getElementById('settingsModal').classList.contains('hidden'),
        isOnboarding: window.app.isOnboarding === true
      }))()
    `);

    assert.strictEqual(afterReload.modalOpen, false, 'Settings must NOT auto-open again for returning users');
    assert.strictEqual(afterReload.isOnboarding, false);
  });

  await t.test('Already-connected users never see onboarding', async () => {
    await browser.eval(`
      (() => {
        localStorage.clear();
        localStorage.setItem('darkcal_icalUrl', JSON.stringify('https://calendar.google.com/calendar/ical/x/basic.ics'));
      })()
    `);
    await browser.reload();

    const res = await browser.eval(`
      (() => ({
        modalOpen: !document.getElementById('settingsModal').classList.contains('hidden'),
        storedFlag: localStorage.getItem('darkcal_onboardingDone')
      }))()
    `);

    assert.strictEqual(res.modalOpen, false, 'Configured users should go straight to the calendar');
    assert.strictEqual(res.storedFlag, 'true', 'onboardingDone should be auto-set for configured users');
  });

  await t.test('User can choose Demo Mode from login card without signing in', async () => {
    // Reset to brand-new user state
    await browser.eval(`
      (() => {
        localStorage.clear();
      })()
    `);
    await browser.reload();
    await new Promise(r => setTimeout(r, 600));

    const res = await browser.eval(`
      (() => {
        const disconnectedCard = document.getElementById('googleDisconnectedCard');
        const demoToggle = document.getElementById('demoModeToggle');
        const exploreBtn = document.getElementById('exploreDemoBtn');
        const isToggleInLogin = disconnectedCard.contains(demoToggle);
        const isExploreInLogin = disconnectedCard.contains(exploreBtn);

        // Click explore demo button
        exploreBtn.click();

        const modalOpenAfter = !document.getElementById('settingsModal').classList.contains('hidden');
        const useDemo = window.app.useDemoData;
        const storedFlag = localStorage.getItem('darkcal_onboardingDone');

        return {
          isToggleInLogin,
          isExploreInLogin,
          modalOpenAfter,
          useDemo,
          storedFlag
        };
      })()
    `);

    assert.strictEqual(res.isToggleInLogin, true, 'Demo toggle must be located inside the login card');
    assert.strictEqual(res.isExploreInLogin, true, 'Explore demo button must be inside the login card');
    assert.strictEqual(res.modalOpenAfter, false, 'Clicking explore demo should close the settings modal');
    assert.strictEqual(res.useDemo, true, 'App should have useDemoData active');
    assert.strictEqual(res.storedFlag, 'true', 'Onboarding should be marked complete');
  });
});
