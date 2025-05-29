/**
 * ZenCartify Theme - Header Navigation
 * Handles mobile menu and search modal interactivity with accessibility support
 */

document.addEventListener('DOMContentLoaded', function() {
  // Mobile Menu
  initializeMobileMenu();
  
  // Search Modal
  initializeSearchModal();
});

/**
 * Initialize mobile menu with accessibility features
 */
function initializeMobileMenu() {
  const mobileToggle = document.querySelector('.js-menu-toggle');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (!mobileToggle || !mobileMenu) return;
  
  // Replace inline onclick handler with proper event listener
  mobileToggle.addEventListener('click', function() {
    const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
    const newExpandedState = !isExpanded;
    
    // Update button state
    mobileToggle.setAttribute('aria-expanded', newExpandedState);
    
    // Update menu visibility
    if (newExpandedState) {
      mobileMenu.classList.remove('hidden');
      mobileMenu.setAttribute('aria-hidden', 'false');
      
      // Focus first interactive element in menu
      setTimeout(() => {
        const firstFocusable = mobileMenu.querySelector('a, button');
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 100);
    } else {
      mobileMenu.classList.add('hidden');
      mobileMenu.setAttribute('aria-hidden', 'true');
      
      // Return focus to toggle button
      mobileToggle.focus();
    }
  });
  
  // Close menu when pressing escape key
  mobileMenu.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.add('hidden');
      mobileMenu.setAttribute('aria-hidden', 'true');
      mobileToggle.focus();
    }
  });
  
  // Handle click outside to close menu
  document.addEventListener('click', function(event) {
    if (!mobileMenu.classList.contains('hidden') &&
        !mobileMenu.contains(event.target) &&
        !mobileToggle.contains(event.target)) {
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.add('hidden');
      mobileMenu.setAttribute('aria-hidden', 'true');
    }
  });
}

/**
 * Initialize search modal with accessibility features
 */
function initializeSearchModal() {
  const searchModal = document.getElementById('searchModal');
  const searchToggles = document.querySelectorAll('.js-search-toggle');
  const searchCloseBtn = searchModal?.querySelector('.js-search-close');
  const searchInput = searchModal?.querySelector('#searchInput');
  
  if (!searchModal || searchToggles.length === 0) return;
  
  // Replace inline onclick handler with proper event listeners for opening
  searchToggles.forEach(toggle => {
    // Remove any existing inline onclick handler
    toggle.removeAttribute('onclick');
    
    toggle.addEventListener('click', function() {
      openSearchModal();
    });
  });
  
  // Replace inline onclick handler for close button
  if (searchCloseBtn) {
    searchCloseBtn.removeAttribute('onclick');
    searchCloseBtn.addEventListener('click', function() {
      closeSearchModal();
    });
  }
  
  // Close modal when clicking overlay (outside modal content)
  searchModal.addEventListener('click', function(event) {
    if (event.target === searchModal) {
      closeSearchModal();
    }
  });
  
  // Close modal when pressing escape key
  searchModal.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeSearchModal();
    }
  });
  
  function openSearchModal() {
    searchModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // Focus the search input after modal is shown
    setTimeout(() => {
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
    
    // Store the element that had focus before opening modal
    searchModal.dataset.previousFocus = document.activeElement.id || '';
    
    // Trap focus inside modal
    setupFocusTrap(searchModal);
  }
  
  function closeSearchModal() {
    searchModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    
    // Return focus to the element that had focus before modal was opened
    const previousFocusId = searchModal.dataset.previousFocus;
    if (previousFocusId) {
      const previousFocusElement = document.getElementById(previousFocusId);
      if (previousFocusElement) {
        previousFocusElement.focus();
      }
    }
  }
}

/**
 * Set up a focus trap within a modal or dialog element
 */
function setupFocusTrap(containerElement) {
  const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableContent = containerElement.querySelectorAll(focusableElements);
  
  if (focusableContent.length === 0) return;
  
  const firstFocusable = focusableContent[0];
  const lastFocusable = focusableContent[focusableContent.length - 1];
  
  // Handle tab key navigation to keep focus inside the modal
  containerElement.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      // If shift + tab and on first element, go to last element
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // If tab and on last element, wrap to first element
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  });
}
