/**
 * ZenCartify Theme - Product Form
 * Handles the product variant selection and quantity adjustments
 */

class ProductForm {
  constructor() {
    this.form = document.getElementById('AddToCartForm');
    if (!this.form) return;
    
    this.variantIdInput = document.getElementById('ProductVariantId');
    this.variantJson = this.form.dataset.variantJson ? JSON.parse(this.form.dataset.variantJson) : [];
    this.optionButtons = this.form.querySelectorAll('[data-option-position]');
    this.quantityInput = this.form.querySelector('#Quantity');
    this.selectedOptions = {};
    this.currentVariant = null;
    this.addToCartBtn = this.form.querySelector('.js-add-to-cart');

    this.initOptions();
    this.initQuantityButtons();
    this.updateAddToCartState();
    this.setupEventListeners();
  }

  /**
   * Initialize the selected options from the current URL variant or first available variant
   */
  initOptions() {
    // Get initial variant from URL or default to first available
    const urlParams = new URLSearchParams(window.location.search);
    const variantId = urlParams.get('variant');
    
    if (variantId) {
      // If variant ID is in URL, find that variant
      this.currentVariant = this.variantJson.find(variant => variant.id === parseInt(variantId, 10));
    } else {
      // Otherwise use product.selected_or_first_available_variant which is already in the hidden input
      this.currentVariant = this.variantJson.find(variant => 
        variant.id === parseInt(this.variantIdInput.value, 10));
    }

    if (!this.currentVariant && this.variantJson.length) {
      this.currentVariant = this.variantJson[0];
    }

    // If we have a current variant, update the initial selected options
    if (this.currentVariant) {
      this.currentVariant.options.forEach((option, index) => {
        this.selectedOptions[`option${index + 1}`] = option;
      });
      
      // Update UI based on the selected options
      this.updateOptionSelectionUI();
    }
  }

  /**
   * Setup quantity increment/decrement buttons
   */
  initQuantityButtons() {
    if (!this.quantityInput) return;
    
    const decrementBtn = this.form.querySelector('[data-action="decrement"]');
    const incrementBtn = this.form.querySelector('[data-action="increment"]');
    
    if (decrementBtn) {
      decrementBtn.addEventListener('click', () => {
        const newValue = Math.max(1, parseInt(this.quantityInput.value, 10) - 1);
        this.quantityInput.value = newValue;
        this.quantityInput.dispatchEvent(new Event('change'));
      });
    }
    
    if (incrementBtn) {
      incrementBtn.addEventListener('click', () => {
        const newValue = parseInt(this.quantityInput.value, 10) + 1;
        this.quantityInput.value = newValue;
        this.quantityInput.dispatchEvent(new Event('change'));
      });
    }
    
    // Ensure the quantity input is always valid
    if (this.quantityInput) {
      this.quantityInput.addEventListener('change', () => {
        const value = parseInt(this.quantityInput.value, 10);
        if (isNaN(value) || value < 1) {
          this.quantityInput.value = 1;
        }
      });
    }
  }

  /**
   * Add event listeners for option buttons and form submission
   */
  setupEventListeners() {
    // Listen for option selection changes
    this.optionButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const position = parseInt(event.target.dataset.optionPosition, 10);
        const value = event.target.dataset.value;
        
        this.selectedOptions[`option${position}`] = value;
        this.updateVariantSelection();
        this.updateOptionSelectionUI();
        this.updateAddToCartState();
      });
    });
    
    // Handle form submission with AJAX
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.addToCart();
    });
  }

  /**
   * Find the variant that matches the currently selected options
   */
  updateVariantSelection() {
    // Find the variant that matches all selected options
    const matchedVariant = this.variantJson.find(variant => {
      return Object.keys(this.selectedOptions).every((key, index) => {
        return variant.options[index] === this.selectedOptions[key];
      });
    });
    
    // If we found a matching variant, update the current variant
    if (matchedVariant) {
      this.currentVariant = matchedVariant;
      this.variantIdInput.value = this.currentVariant.id;
      
      // Update URL with variant ID without reloading the page
      if (history.replaceState) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('variant', this.currentVariant.id);
        window.history.replaceState({ path: newUrl.toString() }, '', newUrl.toString());
      }
      
      // Update price display
      this.updatePriceUI();
      
      // Dispatch custom event that other scripts can listen for
      const event = new CustomEvent('variant:change', { 
        detail: { variant: this.currentVariant }
      });
      document.dispatchEvent(event);
    }
  }

  /**
   * Update the UI to show which options are currently selected
   */
  updateOptionSelectionUI() {
    // Update option buttons to show which option is selected
    this.optionButtons.forEach(button => {
      const position = parseInt(button.dataset.optionPosition, 10);
      const value = button.dataset.value;
      
      if (this.selectedOptions[`option${position}`] === value) {
        // This button is selected
        if (button.classList.contains('product-info__color-option')) {
          button.classList.add('border-primary');
          button.classList.remove('border-transparent');
          button.setAttribute('aria-current', 'true');
        } else {
          button.classList.add('border-primary', 'bg-primary/10', 'text-primary');
          button.classList.remove('border-gray-300');
          button.setAttribute('aria-current', 'true');
        }
      } else {
        // This button is not selected
        if (button.classList.contains('product-info__color-option')) {
          button.classList.remove('border-primary');
          button.classList.add('border-transparent');
          button.removeAttribute('aria-current');
        } else {
          button.classList.remove('border-primary', 'bg-primary/10', 'text-primary');
          button.classList.add('border-gray-300');
          button.removeAttribute('aria-current');
        }
      }
    });
    
    // Update the displayed selected option text for each option group
    const selectedOptionTexts = this.form.querySelectorAll('.product-info__selected-option');
    if (selectedOptionTexts.length) {
      Object.entries(this.selectedOptions).forEach(([key, value], index) => {
        if (selectedOptionTexts[index]) {
          selectedOptionTexts[index].textContent = value;
        }
      });
    }
  }

  /**
   * Update price UI based on the selected variant
   */
  updatePriceUI() {
    if (!this.currentVariant) return;
    
    const priceElement = document.querySelector('.product-info__price span:first-child');
    const compareAtPriceElement = document.querySelector('.product-info__compare-price');
    const saveBadgeElement = document.querySelector('.product-info__save-badge');
    
    if (priceElement) {
      // Format price using Shopify money format
      const formattedPrice = this.formatMoney(this.currentVariant.price);
      priceElement.textContent = formattedPrice;
      
      // Update price class based on whether there's a sale
      if (this.currentVariant.compare_at_price > this.currentVariant.price) {
        priceElement.classList.add('text-accent');
      } else {
        priceElement.classList.remove('text-accent');
      }
    }
    
    // Update compare at price if it exists
    if (compareAtPriceElement) {
      if (this.currentVariant.compare_at_price > this.currentVariant.price) {
        const formattedCompareAtPrice = this.formatMoney(this.currentVariant.compare_at_price);
        compareAtPriceElement.textContent = formattedCompareAtPrice;
        compareAtPriceElement.style.display = '';
      } else {
        compareAtPriceElement.style.display = 'none';
      }
    }
    
    // Update save badge if it exists
    if (saveBadgeElement) {
      if (this.currentVariant.compare_at_price > this.currentVariant.price) {
        const discountAmount = this.currentVariant.compare_at_price - this.currentVariant.price;
        const discountPercentage = Math.round((discountAmount / this.currentVariant.compare_at_price) * 100);
        saveBadgeElement.textContent = `Save ${discountPercentage}%`;
        saveBadgeElement.style.display = '';
      } else {
        saveBadgeElement.style.display = 'none';
      }
    }
  }

  /**
   * Format money value according to the store's currency format
   */
  formatMoney(cents) {
    // Default Shopify money format if window.theme.moneyFormat is not available
    const moneyFormat = window.theme?.moneyFormat || '{{ amount }}';
    
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }
    
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = moneyFormat;
    
    function formatWithDelimiters(number, precision = 2, thousands = ',', decimal = '.') {
      if (isNaN(number) || number === null) {
        return 0;
      }
      
      number = (number / 100.0).toFixed(precision);
      
      const parts = number.split('.');
      const dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`);
      const centsAmount = parts[1] ? decimal + parts[1] : '';
      
      return dollarsAmount + centsAmount;
    }
    
    switch (formatString.match(placeholderRegex)[1]) {
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
      case 'amount_with_apostrophe_separator':
        value = formatWithDelimiters(cents, 2, "'", '.');
        break;
    }
    
    return formatString.replace(placeholderRegex, value);
  }

  /**
   * Update add to cart button state based on variant availability
   */
  updateAddToCartState() {
    if (!this.addToCartBtn || !this.currentVariant) return;
    
    const isAvailable = this.currentVariant.available;
    
    if (isAvailable) {
      this.addToCartBtn.disabled = false;
      this.addToCartBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      this.addToCartBtn.textContent = 'Add to Cart';
      this.addToCartBtn.setAttribute('aria-label', `Add ${document.querySelector('.product-info__title').textContent} to cart`);
    } else {
      this.addToCartBtn.disabled = true;
      this.addToCartBtn.classList.add('opacity-50', 'cursor-not-allowed');
      this.addToCartBtn.textContent = 'Sold Out';
      this.addToCartBtn.setAttribute('aria-label', `${document.querySelector('.product-info__title').textContent} is sold out`);
    }
  }

  /**
   * Add the product to the cart via AJAX
   */
  addToCart() {
    if (!this.currentVariant || !this.currentVariant.available) return;
    
    const quantity = parseInt(this.quantityInput?.value || 1, 10);
    
    // Show loading state
    this.addToCartBtn.classList.add('loading');
    this.addToCartBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Adding...';
    this.addToCartBtn.disabled = true;
    
    const addToCartData = {
      items: [{
        id: this.currentVariant.id,
        quantity: quantity
      }],
      sections: ['cart-drawer']
    };
    
    // Add to cart via fetch API
    fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(addToCartData)
    })
    .then(response => response.json())
    .then(data => {
      // Success - open cart drawer and update cart count
      this.addToCartBtn.classList.remove('loading');
      this.addToCartBtn.innerHTML = 'Added to Cart';
      this.addToCartBtn.disabled = false;
      
      // Reset button text after 2 seconds
      setTimeout(() => {
        this.addToCartBtn.innerHTML = 'Add to Cart';
      }, 2000);
      
      // Update cart count and open drawer if it exists
      this.updateCartCount();
      this.openCartDrawer(data.sections['cart-drawer']);
    })
    .catch(error => {
      // Error handling
      console.error('Error adding to cart:', error);
      this.addToCartBtn.classList.remove('loading');
      this.addToCartBtn.innerHTML = 'Error';
      this.addToCartBtn.disabled = false;
      
      // Reset button text after 2 seconds
      setTimeout(() => {
        this.addToCartBtn.innerHTML = 'Add to Cart';
        this.addToCartBtn.disabled = false;
      }, 2000);
    });
  }

  /**
   * Update the cart count badge in the header
   */
  updateCartCount() {
    fetch('/cart.js')
      .then(response => response.json())
      .then(cart => {
        const cartCountElements = document.querySelectorAll('.js-cart-count');
        
        cartCountElements.forEach(element => {
          element.textContent = cart.item_count;
          
          if (cart.item_count > 0) {
            element.classList.remove('hidden');
          } else {
            element.classList.add('hidden');
          }
        });
      })
      .catch(error => console.error('Error fetching cart:', error));
  }

  /**
   * Open the cart drawer with updated contents
   */
  openCartDrawer(cartDrawerHTML) {
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (!cartDrawer || !cartOverlay) return;
    
    // Update cart drawer HTML if provided
    if (cartDrawerHTML) {
      // Only update the cart items part to avoid flashing
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cartDrawerHTML;
      
      const newCartItems = tempDiv.querySelector('.js-cart-drawer-items');
      const currentCartItems = document.querySelector('.js-cart-drawer-items');
      
      if (newCartItems && currentCartItems) {
        currentCartItems.innerHTML = newCartItems.innerHTML;
      }
    }
    
    // Open cart drawer
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('active');
    document.body.classList.add('overflow-hidden');
    
    // Set focus to the first focusable element in the drawer for accessibility
    setTimeout(() => {
      const firstFocusable = cartDrawer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);
  }
}

// Initialize the product form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ProductForm();
});