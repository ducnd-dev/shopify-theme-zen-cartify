/**
 * ZenCartify Theme - Accessibility Improvements
 * This script adds accessibility enhancements to the theme
 */

(function() {
  // Focus trap for modal dialogs
  function setupFocusTrap(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Trap focus in modal when tabbing
    modal.addEventListener('keydown', function(e) {
      // Only execute if modal is visible
      if (!modal.classList.contains('active')) return;
      
      const isTabPressed = e.key === 'Tab';
      if (!isTabPressed) return;

      if (e.shiftKey) {
        // Shift + Tab - go to last element if on first
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab - go to first element if on last
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    });
  }

  // Add proper aria attributes to dynamic elements
  function enhanceAria() {
    // Add aria-expanded attributes to all toggles
    document.querySelectorAll('.js-toggle').forEach(toggle => {
      if (!toggle.hasAttribute('aria-expanded')) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', toggle.dataset.target || '');
      }

      toggle.addEventListener('click', function() {
        const expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !expanded);
      });
    });

    // Make notification messages more accessible
    document.querySelectorAll('.notification, .alert').forEach(note => {
      if (!note.hasAttribute('role')) {
        note.setAttribute('role', 'alert');
        note.setAttribute('aria-live', 'polite');
      }
    });

    // Skip to content link
    const header = document.querySelector('header');
    if (header && !document.getElementById('skip-to-content')) {
      const skipLink = document.createElement('a');
      skipLink.id = 'skip-to-content';
      skipLink.href = '#main';
      skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:px-4 focus:py-3 focus:bg-white focus:text-black';
      skipLink.textContent = 'Skip to content';
      document.body.insertBefore(skipLink, document.body.firstChild);
    }
  }

  // Add loading states to buttons when forms are submitted
  function setupFormLoadingStates() {
    document.querySelectorAll('form:not([data-no-loading-state])').forEach(form => {
      form.addEventListener('submit', function() {
        const submitButton = this.querySelector('[type="submit"]');
        if (submitButton) {
          const originalText = submitButton.innerHTML;
          submitButton.innerHTML = '<span class="loading-indicator inline-block mr-2"></span> Processing...';
          submitButton.setAttribute('disabled', true);

          // Reset if form doesn't submit within 10 seconds
          setTimeout(() => {
            if (submitButton.disabled) {
              submitButton.innerHTML = originalText;
              submitButton.removeAttribute('disabled');
            }
          }, 10000);
        }
      });
    });
  }

  // Initialize all improvements when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize accessibility improvements
    enhanceAria();
    setupFocusTrap('cartDrawer');
    setupFocusTrap('mobileMenu');
    setupFormLoadingStates();

    // Re-run enhancements when content changes (for dynamic content)
    const observer = new MutationObserver(function() {
      enhanceAria();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
})();
