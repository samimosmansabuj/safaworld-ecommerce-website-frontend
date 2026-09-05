/* ==========================================================
   Safa World — PWA Installation Controller
   Manages beforeinstallprompt & Custom Install UI
   ========================================================== */

(function () {
    'use strict';

    let deferredPrompt = null;
    const DISMISS_KEY = 'safaworld_pwa_dismissed_until';

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        deferredPrompt = e;

        // Check if user previously dismissed in the last 3 days
        const dismissedUntil = localStorage.getItem(DISMISS_KEY);
        if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
            return;
        }

        // Delay showing banner by 2.5s for seamless entrance
        setTimeout(showInstallBanner, 2500);
    });

    function showInstallBanner() {
        const banner = document.getElementById('pwaInstallBanner');
        if (!banner || !deferredPrompt) return;

        banner.style.display = 'block';

        const installBtn = document.getElementById('pwaInstallBtn');
        const dismissBtn = document.getElementById('pwaDismissBtn');

        if (installBtn) {
            installBtn.onclick = async () => {
                banner.style.display = 'none';
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const choice = await deferredPrompt.userChoice;
                    if (choice.outcome === 'accepted') {
                        console.log('User accepted Safa World PWA install');
                    }
                    deferredPrompt = null;
                }
            };
        }

        if (dismissBtn) {
            dismissBtn.onclick = () => {
                banner.style.display = 'none';
                // Don't show again for 3 days
                localStorage.setItem(DISMISS_KEY, (Date.now() + 3 * 24 * 60 * 60 * 1000).toString());
            };
        }
    }

    window.addEventListener('appinstalled', () => {
        console.log('Safa World PWA installed successfully!');
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) banner.style.display = 'none';
        deferredPrompt = null;
    });

    window.showPwaInstallPrompt = function () {
        if (deferredPrompt) {
            deferredPrompt.prompt();
        } else {
            alert('To install Safa World, tap your browser menu and choose "Add to Home screen" or "Install App".');
        }
    };
})();
