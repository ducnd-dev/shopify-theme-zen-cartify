// ZenCartify Cart Drawer JavaScript

class CartDrawer {
  constructor() {
    this.drawer = document.getElementById('cartDrawer');
    this.overlay = document.getElementById('cartOverlay');
    this.toggleButtons = document.querySelectorAll('.js-cart-toggle');
    this.closeButtons = document.querySelectorAll('.js-cart-close');
    
    this.isOpen = false;
    this.moneyFormat = window.theme?.moneyFormat || '{{ amount }}';
    
    this.init();
  }
  
  init() {
    if (!this.drawer) return;
    
    // Set up event listeners
    this.toggleButtons.forEach(button => {
      button.addEventListener('click', this.toggle.bind(this));
    });
    
    this.closeButtons.forEach(button => {
      button.addEventListener('click', this.close.bind(this));
    });
    
    if (this.overlay) {
      this.overlay.addEventListener('click', this.close.bind(this));
    }
    
    // Listen for Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
    
    // Set up API for other scripts to use
    window.cartDrawer = {
      open: this.open.bind(this),
      close: this.close.bind(this),
      toggle: this.toggle.bind(this),
      refresh: this.fetchAndUpdateCart.bind(this)
    };
    
    // Setup cart elements
    this.setupCartEvents();
  }
  
  toggle(e) {
    if (e) e.preventDefault();
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  open() {
    if (!this.drawer) return;
    
    this.drawer.classList.remove('translate-x-full');
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }
    document.body.classList.add('overflow-hidden');
    this.isOpen = true;
    
    // Refresh cart contents
    this.fetchAndUpdateCart();
  }
  
  close() {
    if (!this.drawer) return;
    
    this.drawer.classList.add('translate-x-full');
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
    document.body.classList.remove('overflow-hidden');
    this.isOpen = false;
  }
  
  formatMoney(cents) {
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }
    
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const moneyFormat = this.moneyFormat;
    
    function formatWithDelimiters(number, precision, thousands, decimal) {
      thousands = thousands || ',';
      decimal = decimal || '.';
      
      if (isNaN(number) || number === null) {
        return 0;
      }
      
      number = (number / 100.0).toFixed(precision);
      
      const parts = number.split('.');
      const dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      const centsAmount = parts[1] ? (decimal + parts[1]) : '';
      
      return dollarsAmount + centsAmount;
    }
    
    const match = moneyFormat.match(placeholderRegex);
    if (match) {
      const key = match[1];
      switch(key) {
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
    
    return moneyFormat.replace(placeholderRegex, value);
  }
  
  async fetchAndUpdateCart() {
    try {
      const response = await fetch('/cart.js');
      if (!response.ok) throw new Error('Network response was not ok');
      
      const cart = await response.json();
      
      // Update cart count
      this.updateCartCount(cart.item_count);
      
      // Update cart contents
      this.updateCartContents(cart);
      
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }
  
  updateCartCount(count) {
    const cartCountElements = document.querySelectorAll('.js-cart-count');
    
    cartCountElements.forEach(element => {
      element.textContent = count;
      element.classList.toggle('hidden', count === 0);
    });
  }
  
  async updateCartContents(cart) {
    const cartItemsContainer = document.querySelector('.js-cart-items');
    const cartSubtotalElement = document.querySelector('.js-cart-subtotal');
    const emptyCartElement = document.querySelector('.js-empty-cart');
    const filledCartElement = document.querySelector('.js-filled-cart');
    
    if (!cartItemsContainer) return;
    
    // Update subtotal
    if (cartSubtotalElement) {
      cartSubtotalElement.textContent = this.formatMoney(cart.total_price);
    }
    
    // Show/hide empty state
    if (cart.item_count === 0) {
      if (emptyCartElement) emptyCartElement.classList.remove('hidden');
      if (filledCartElement) filledCartElement.classList.add('hidden');
    } else {
      if (emptyCartElement) emptyCartElement.classList.add('hidden');
      if (filledCartElement) filledCartElement.classList.remove('hidden');
      
      // Fetch cart HTML
      try {
        const response = await fetch('/?view=cart-drawer');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const html = await response.text();
        
        // Update cart items
        cartItemsContainer.innerHTML = html;
        
        // Reinitialize buttons
        this.setupCartEvents();
        
      } catch (error) {
        console.error('Error updating cart drawer:', error);
      }
    }
  }
  
  setupCartEvents() {
    // Quantity selectors
    const quantitySelectors = document.querySelectorAll('.js-quantity-selector');
    
    quantitySelectors.forEach(selector => {
      const decreaseBtn = selector.querySelector('.js-quantity-decrease');
      const increaseBtn = selector.querySelector('.js-quantity-increase');
      const input = selector.querySelector('.js-quantity-input');
      const itemKey = selector.dataset.itemKey;
      
      if (!input || !itemKey) return;
      
      if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
          const newVal = Math.max(1, parseInt(input.value, 10) - 1);
          input.value = newVal;
          this.updateItemQuantity(itemKey, newVal);
        });
      }
      
      if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
          const newVal = parseInt(input.value, 10) + 1;
          input.value = newVal;
          this.updateItemQuantity(itemKey, newVal);
        });
      }
    });
    
    // Remove buttons
    const removeButtons = document.querySelectorAll('.js-remove-item');
    
    removeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const itemKey = button.dataset.itemKey;
        if (itemKey) {
          this.updateItemQuantity(itemKey, 0);
        }
      });
    });
  }
  
  async updateItemQuantity(key, quantity) {
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
      this.updateCartContents(cart);
      
    } catch (error) {
      console.error('Error updating item quantity:', error);
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.cartDrawerInstance = new CartDrawer();
});
