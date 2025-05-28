/* ZenCartify Theme JavaScript
 * Uses ES6+ modules and patterns
 */

// Main theme namespace
const ZenCartify = {};

/**
 * Utility functions
 */
ZenCartify.utils = {
  // Helper to serialize form data
  serializeForm: (form) => {
    const obj = {};
    const formData = new FormData(form);
    for (const [key, value] of formData.entries()) {
      obj[key] = value;
    }
    return obj;
  },
  
  // Debounce function to limit function calls
  debounce: (callback, wait = 300) => {
    let timeoutId = null;
    return (...args) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        callback.apply(null, args);
      }, wait);
    };
  },
  
  // Format currency amount according to shop settings
  formatMoney: (cents, format) => {
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }
    
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = format || '${{amount}}';

    function defaultTo(value, defaultValue) {
      return value == null || value !== value ? defaultValue : value;
    }

    function formatWithDelimiters(number, precision, thousands, decimal) {
      thousands = defaultTo(thousands, ',');
      decimal = defaultTo(decimal, '.');
      precision = defaultTo(precision, 2);
      
      if (isNaN(number) || number == null) {
        return 0;
      }

      const fixedNumber = (number / 100.0).toFixed(precision);
      const parts = fixedNumber.split('.');
      const dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      const cents = parts[1] ? decimal + parts[1] : '';

      return dollars + cents;
    }

    let value = '';
    const match = formatString.match(placeholderRegex);
    
    if (match) {
      const key = match[1];
      switch (key) {
        case 'amount':
          value = formatWithDelimiters(cents, 2);
          break;
        case 'amount_no_decimals':
          value = formatWithDelimiters(cents, 0);
          break;
        case 'amount_with_comma_separator':
          value = formatWithDelimiters(cents, 2, '.', ',');
          break;
        case 'amount_no_decimals_with_comma_separator':
          value = formatWithDelimiters(cents, 0, '.', ',');
          break;
        default:
          value = formatWithDelimiters(cents, 2);
      }
    }

    return formatString.replace(placeholderRegex, value);
  }
};

/**
 * Cart management
 */
ZenCartify.Cart = {
  drawer: null,
  overlay: null,
  cartToggle: null,
  cartCloseButton: null,

  init: function() {
    this.drawer = document.querySelector('.cart-drawer');
    this.overlay = document.querySelector('.cart-drawer__overlay');
    this.cartToggle = document.querySelector('.js-cart-toggle');
    this.cartCloseButton = document.querySelector('.js-cart-close');
    
    if (!this.drawer) return;
    
    // Set up event listeners
    this.cartToggle.addEventListener('click', this.toggleDrawer.bind(this));
    this.cartCloseButton.addEventListener('click', this.closeDrawer.bind(this));
    this.overlay.addEventListener('click', this.closeDrawer.bind(this));
    
    // Setup all add to cart buttons
    this.setupAddToCartButtons();
    
    // Listen for Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeDrawer();
    });
  },
  
  toggleDrawer: function(e) {
    if (e) e.preventDefault();
    if (this.drawer.classList.contains('cart-drawer--open')) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  },
  
  openDrawer: function() {
    this.drawer.classList.add('cart-drawer--open');
    this.overlay.classList.add('cart-drawer__overlay--active');
    document.body.style.overflow = 'hidden';
  },
  
  closeDrawer: function() {
    this.drawer.classList.remove('cart-drawer--open');
    this.overlay.classList.remove('cart-drawer__overlay--active');
    document.body.style.overflow = '';
  },
  
  setupAddToCartButtons: function() {
    const addToCartButtons = document.querySelectorAll('.js-add-to-cart');
    
    addToCartButtons.forEach(button => {
      button.addEventListener('click', this.handleAddToCart.bind(this));
    });
  },
  
  handleAddToCart: async function(e) {
    e.preventDefault();
    
    const form = e.target.closest('form');
    if (!form) return;
    
    const addButton = e.currentTarget;
    const originalButtonText = addButton.textContent;
    
    // Show loading state
    addButton.setAttribute('disabled', true);
    addButton.innerHTML = '<svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Adding...';
    
    try {
      // Use Fetch API to send the form data
      const formData = new FormData(form);
      
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const item = await response.json();
      
      // Update the cart contents
      await this.fetchAndUpdateCart();
      
      // Reset button and open drawer
      addButton.innerHTML = '<svg class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> Added';
      
      setTimeout(() => {
        addButton.removeAttribute('disabled');
        addButton.textContent = originalButtonText;
      }, 2000);
      
      this.openDrawer();
      
    } catch (error) {
      console.error('Error:', error);
      // Reset button and show error
      addButton.removeAttribute('disabled');
      addButton.innerHTML = '<svg class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg> Failed';
      
      setTimeout(() => {
        addButton.textContent = originalButtonText;
      }, 2000);
    }
  },
  
  fetchAndUpdateCart: async function() {
    try {
      const response = await fetch('/cart.js');
      if (!response.ok) throw new Error('Network response was not ok');
      
      const cart = await response.json();
      
      // Update cart count
      this.updateCartCount(cart.item_count);
      
      // Update cart contents
      this.updateCartDrawerContents(cart);
      
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  },
  
  updateCartCount: function(count) {
    const cartCountElements = document.querySelectorAll('.js-cart-count');
    
    cartCountElements.forEach(element => {
      element.textContent = count;
      element.classList.toggle('hidden', count === 0);
    });
  },
  
  updateCartDrawerContents: async function(cart) {
    const cartItemsContainer = document.querySelector('.js-cart-items');
    const cartSubtotalElement = document.querySelector('.js-cart-subtotal');
    const emptyCartElement = document.querySelector('.js-empty-cart');
    const filledCartElement = document.querySelector('.js-filled-cart');
    
    if (!cartItemsContainer) return;
    
    // Update subtotal
    if (cartSubtotalElement) {
      cartSubtotalElement.textContent = ZenCartify.utils.formatMoney(cart.total_price, theme.moneyFormat);
    }
    
    // Show/hide empty state
    if (cart.item_count === 0) {
      emptyCartElement.classList.remove('hidden');
      filledCartElement.classList.add('hidden');
      return;
    } else {
      emptyCartElement.classList.add('hidden');
      filledCartElement.classList.remove('hidden');
    }
    
    // Fetch cart HTML
    try {
      const response = await fetch('/?view=cart-drawer');
      if (!response.ok) throw new Error('Network response was not ok');
      
      const html = await response.text();
      
      // Update cart items
      cartItemsContainer.innerHTML = html;
      
      // Reinitialize quantity selectors
      this.initializeQuantitySelectors();
      
    } catch (error) {
      console.error('Error updating cart drawer:', error);
    }
  },
  
  initializeQuantitySelectors: function() {
    const quantitySelectors = document.querySelectorAll('.js-quantity-selector');
    
    quantitySelectors.forEach(selector => {
      const decreaseBtn = selector.querySelector('.js-quantity-decrease');
      const increaseBtn = selector.querySelector('.js-quantity-increase');
      const input = selector.querySelector('.js-quantity-input');
      const itemKey = selector.dataset.itemKey;
      
      if (!input || !itemKey) return;
      
      decreaseBtn.addEventListener('click', () => {
        const newVal = Math.max(1, parseInt(input.value, 10) - 1);
        input.value = newVal;
        this.updateCartItemQuantity(itemKey, newVal);
      });
      
      increaseBtn.addEventListener('click', () => {
        const newVal = parseInt(input.value, 10) + 1;
        input.value = newVal;
        this.updateCartItemQuantity(itemKey, newVal);
      });
      
      input.addEventListener('change', () => {
        const newVal = Math.max(1, parseInt(input.value, 10));
        input.value = newVal;
        this.updateCartItemQuantity(itemKey, newVal);
      });
    });
    
    // Handle remove item buttons
    const removeButtons = document.querySelectorAll('.js-remove-item');
    removeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const itemKey = button.dataset.itemKey;
        if (itemKey) {
          this.updateCartItemQuantity(itemKey, 0);
        }
      });
    });
  },
  
  updateCartItemQuantity: async function(key, quantity) {
    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: key,
          quantity: quantity
        })
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const cart = await response.json();
      
      // Update cart count and contents
      this.updateCartCount(cart.item_count);
      this.updateCartDrawerContents(cart);
      
    } catch (error) {
      console.error('Error updating item quantity:', error);
    }
  }
};

/**
 * Product image gallery
 */
ZenCartify.ProductGallery = {
  init: function() {
    const galleries = document.querySelectorAll('.js-product-gallery');
    
    galleries.forEach(gallery => {
      const mainImage = gallery.querySelector('.js-main-image');
      const thumbnails = gallery.querySelectorAll('.js-thumbnail');
      
      if (!mainImage || thumbnails.length === 0) return;
      
      thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', () => {
          // Update active state
          thumbnails.forEach(t => t.classList.remove('product-gallery__thumbnail--active'));
          thumbnail.classList.add('product-gallery__thumbnail--active');
          
          // Update main image
          const newSrc = thumbnail.dataset.src;
          const newSrcset = thumbnail.dataset.srcset;
          const newAlt = thumbnail.querySelector('img').alt;
          
          mainImage.querySelector('img').src = newSrc;
          if (newSrcset) mainImage.querySelector('img').srcset = newSrcset;
          mainImage.querySelector('img').alt = newAlt;
        });
      });
    });
  }
};

/**
 * Product variant selectors
 */
ZenCartify.ProductVariants = {
  init: function() {
    const variantSelectors = document.querySelectorAll('.js-variant-selector');
    
    variantSelectors.forEach(form => {
      const options = form.querySelectorAll('.js-option-selector');
      const variantJson = form.dataset.variantJson;
      
      if (!variantJson) return;
      
      const variants = JSON.parse(variantJson);
      const priceElement = document.querySelector('.js-product-price');
      const compareAtPriceElement = document.querySelector('.js-product-compare-at-price');
      const addToCartButton = form.querySelector('.js-add-to-cart');
      const variantIdInput = form.querySelector('input[name="id"]');
      
      // Handle option changes
      options.forEach(option => {
        option.addEventListener('change', () => {
          this.updateSelectedVariant(form, variants, priceElement, compareAtPriceElement, addToCartButton, variantIdInput);
        });
      });
      
      // Initialize with current selected options
      this.updateSelectedVariant(form, variants, priceElement, compareAtPriceElement, addToCartButton, variantIdInput);
    });
  },
  
  getSelectedOptions: function(form) {
    const result = [];
    const options = form.querySelectorAll('.js-option-selector');
    
    options.forEach(option => {
      if (option.type === 'radio') {
        const checked = form.querySelector(`input[name="${option.name}"]:checked`);
        if (checked) result.push(checked.value);
      } else {
        result.push(option.value);
      }
    });
    
    return result;
  },
  
  findVariantByOptions: function(variants, selectedOptions) {
    return variants.find(variant => {
      return selectedOptions.every((option, index) => {
        return variant.options[index] === option;
      });
    });
  },
  
  updateSelectedVariant: function(form, variants, priceElement, compareAtPriceElement, addToCartButton, variantIdInput) {
    const selectedOptions = this.getSelectedOptions(form);
    const variant = this.findVariantByOptions(variants, selectedOptions);
    
    if (!variant) {
      // Variant not available
      addToCartButton.setAttribute('disabled', true);
      addToCartButton.textContent = 'Unavailable';
      return;
    }
    
    // Update variant ID
    variantIdInput.value = variant.id;
    
    // Update price
    if (priceElement) {
      priceElement.textContent = ZenCartify.utils.formatMoney(variant.price, theme.moneyFormat);
    }
    
    // Update compare at price
    if (compareAtPriceElement) {
      if (variant.compare_at_price > variant.price) {
        compareAtPriceElement.textContent = ZenCartify.utils.formatMoney(variant.compare_at_price, theme.moneyFormat);
        compareAtPriceElement.classList.remove('hidden');
      } else {
        compareAtPriceElement.classList.add('hidden');
      }
    }
    
    // Update add to cart button
    if (variant.available) {
      addToCartButton.removeAttribute('disabled');
      addToCartButton.textContent = 'Add to Cart';
    } else {
      addToCartButton.setAttribute('disabled', true);
      addToCartButton.textContent = 'Sold Out';
    }
    
    // Update URL
    if (history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({ path: url.toString() }, '', url.toString());
    }
  }
};

/**
 * Mobile navigation
 */
ZenCartify.MobileNav = {
  init: function() {
    const menuToggle = document.querySelector('.js-menu-toggle');
    const mobileMenu = document.querySelector('.js-mobile-menu');
    
    if (!menuToggle || !mobileMenu) return;
    
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('site-header__menu-toggle--open');
      mobileMenu.classList.toggle('mobile-menu--open');
      document.body.classList.toggle('overflow-hidden');
    });
  }
};

/**
 * Accordion functionality
 */
ZenCartify.Accordion = {
  init: function() {
    const accordionHeaders = document.querySelectorAll('.js-accordion-header');
    
    accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        const isOpen = header.classList.contains('accordion__header--open');
        
        // Close all accordions
        document.querySelectorAll('.js-accordion-header').forEach(h => {
          h.classList.remove('accordion__header--open');
          h.nextElementSibling.classList.remove('accordion__content--open');
        });
        
        // Open current accordion if it was closed
        if (!isOpen) {
          header.classList.add('accordion__header--open');
          content.classList.add('accordion__content--open');
        }
      });
    });
  }
};

/**
 * Initialize all modules when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
  // Set up global theme object
  window.theme = window.theme || {};
  window.theme.moneyFormat = window.theme.moneyFormat || '{{ shop.money_format }}';
  
  // Initialize modules
  ZenCartify.Cart.init();
  ZenCartify.ProductGallery.init();
  ZenCartify.ProductVariants.init();
  ZenCartify.MobileNav.init();
  ZenCartify.Accordion.init();
  
  // Initialize AOS for animations if available
  if (typeof AOS !== 'undefined') {
    AOS.init({
      once: true,
      duration: 800,
      offset: 50
    });
  }
});
