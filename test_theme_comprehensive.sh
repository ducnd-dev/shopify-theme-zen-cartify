#!/bin/bash

# ===========================================================
#  ZenCartify Theme - Comprehensive Testing & Validation Tool
# ===========================================================

set -e

# Check if running in Git Bash or WSL on Windows
if [[ "$(uname -r)" == *Microsoft* ]] || [[ "$(uname -r)" == *microsoft* ]] || command -v wslpath &>/dev/null; then
  WINDOWS=true
  echo "Detected Windows environment"
else
  WINDOWS=false
  echo "Detected Unix-like environment"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p logs

# Function to print section header
print_header() {
  echo ""
  echo -e "${BLUE}=====================================================================${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}=====================================================================${NC}"
  echo ""
}

# Function to check if Node.js is installed
check_nodejs() {
  if command -v node &> /dev/null; then
    echo -e "${GREEN}✓ Node.js is installed${NC}"
    node -v
    return 0
  else
    echo -e "${RED}✗ Node.js is not installed. Please install Node.js to use the full testing suite.${NC}"
    return 1
  fi
}

# Function to install dependencies if needed
check_dependencies() {
  echo "Checking dependencies..."
  
  if [ ! -f "package.json" ]; then
    echo "Creating package.json..."
    cat > package.json << EOF
{
  "name": "shopify-theme-zen-cartify-validator",
  "version": "1.0.0",
  "description": "Validation tools for ZenCartify Shopify theme",
  "scripts": {
    "test": "node theme-validator.js",
    "liquid-test": "node liquid-validator.js"
  },
  "dependencies": {}
}
EOF
  fi
  
  # Check for required npm packages
  dependencies=("chalk" "glob" "js-yaml" "css-validator")
  missing_deps=()
  
  if [ -f "package.json" ]; then
    for dep in "${dependencies[@]}"; do
      if ! grep -q "\"$dep\"" package.json; then
        missing_deps+=("$dep")
      fi
    done
  else
    missing_deps=("${dependencies[@]}")
  fi
  
  if [ ${#missing_deps[@]} -gt 0 ]; then
    echo -e "${YELLOW}Installing missing dependencies: ${missing_deps[*]}${NC}"
    npm install --save-dev "${missing_deps[@]}"
  else
    echo -e "${GREEN}✓ All dependencies are installed${NC}"
  fi
}

# 1. Basic structure validation
validate_structure() {
  print_header "Validating Theme Structure"
  
  required_dirs=("assets" "config" "layout" "sections" "snippets" "templates" "templates/customers")
  required_files=("layout/theme.liquid" "templates/index.liquid" "templates/product.liquid")
  
  for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
      echo -e "${GREEN}✓ Required directory exists: $dir${NC}"
    else
      echo -e "${RED}✗ Missing required directory: $dir${NC}"
    fi
  done
  
  for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
      echo -e "${GREEN}✓ Required file exists: $file${NC}"
    else
      echo -e "${RED}✗ Missing required file: $file${NC}"
    fi
  done
}

# 2. Liquid syntax validation
validate_liquid() {
  print_header "Validating Liquid Syntax"
  
  if check_nodejs; then
    echo "Running advanced Liquid validator..."
    node liquid-validator.js | tee logs/liquid-validation-$(date +%Y%m%d%H%M%S).log
  else
    echo "Running basic Liquid validation..."
    bash validate_theme_enhanced.sh | tee logs/liquid-basic-validation-$(date +%Y%m%d%H%M%S).log
  fi
}

# 3. JSON validation
validate_json() {
  print_header "Validating JSON Files"
  
  for file in $(find . -name "*.json"); do
    echo -n "Validating $file: "
    if jq empty "$file" 2>/dev/null; then
      echo -e "${GREEN}Valid${NC}"
    else
      echo -e "${RED}Invalid${NC}"
      # Show detailed error
      jq empty "$file" 2>&1 | head -5
    fi
  done
  
  # Specific check for settings_schema.json
  if [ -f "config/settings_schema.json" ]; then
    echo -e "\nValidating settings_schema.json structure..."
    if [ "$(jq 'if type=="array" then "valid" else "invalid" end' config/settings_schema.json)" == '"valid"' ]; then
      echo -e "${GREEN}✓ settings_schema.json is a valid array${NC}"
    else
      echo -e "${RED}✗ settings_schema.json must be an array${NC}"
    fi
  fi
}

# 4. CSS validation
validate_css() {
  print_header "Validating CSS"
  
  for file in $(find ./assets -name "*.css"); do
    echo "Validating $file..."
    
    # Check for balanced braces
    open_braces=$(grep -o "{" "$file" | wc -l)
    close_braces=$(grep -o "}" "$file" | wc -l)
    
    if [ "$open_braces" -ne "$close_braces" ]; then
      echo -e "${RED}✗ Unbalanced braces in $file: $open_braces opening vs $close_braces closing${NC}"
    else
      echo -e "${GREEN}✓ Balanced braces${NC}"
    fi
    
    # Check for BEM naming convention
    non_bem=$(grep -E "\\.[a-z][a-z0-9]*[A-Z]" "$file" | wc -l)
    if [ "$non_bem" -gt 0 ]; then
      echo -e "${YELLOW}⚠ Possible non-BEM class names found ($non_bem occurrences)${NC}"
      grep -E "\\.[a-z][a-z0-9]*[A-Z]" "$file" | head -3
    else
      echo -e "${GREEN}✓ No obvious naming convention issues${NC}"
    fi
    
    # Check for !important usage
    important_count=$(grep -o "!important" "$file" | wc -l)
    if [ "$important_count" -gt 0 ]; then
      echo -e "${YELLOW}⚠ Found $important_count uses of !important${NC}"
    else
      echo -e "${GREEN}✓ No !important usage${NC}"
    fi
  done
}

# 5. JavaScript validation
validate_js() {
  print_header "Validating JavaScript"
  
  if check_nodejs; then
    for file in $(find ./assets -name "*.js"); do
      echo "Validating $file..."
      node --check "$file" 2>&1 && echo -e "${GREEN}✓ Syntax is valid${NC}" || echo -e "${RED}✗ Syntax errors found${NC}"
      
      # Check for console.log statements
      console_logs=$(grep -o "console\.log" "$file" | wc -l)
      if [ "$console_logs" -gt 0 ]; then
        echo -e "${YELLOW}⚠ Found $console_logs console.log statements${NC}"
      else
        echo -e "${GREEN}✓ No console.log statements${NC}"
      fi
    done
  else
    echo -e "${YELLOW}Skipping advanced JS validation as Node.js is not available${NC}"
  fi
}

# 6. Asset references check
check_assets() {
  print_header "Checking Asset References"
  
  # Build list of all assets
  echo "Building asset inventory..."
  asset_list=()
  for asset in $(find ./assets -type f -not -path "*/\.*"); do
    base_name=$(basename "$asset")
    asset_list+=("$base_name")
  done
  
  echo "Found ${#asset_list[@]} assets"
  
  # Check references in liquid files
  echo "Checking references in liquid files..."
  referenced_assets=()
  
  for file in $(find . -name "*.liquid"); do
    # Find asset_url references
    refs=$(grep -o "['\"][^'\"]*['\"][ ]*|[ ]*asset_url" "$file" | sed -E "s/['\"]([^'\"]*)['\"][ ]*\|[ ]*asset_url/\1/g")
    
    for asset in $refs; do
      if [ -n "$asset" ]; then
        referenced_assets+=("$asset")
        if [[ ! " ${asset_list[*]} " =~ " ${asset} " ]]; then
          echo -e "${RED}✗ Asset '$asset' referenced in $file but not found${NC}"
        fi
      fi
    done
    
    # Find asset_img_url references
    img_refs=$(grep -o "['\"][^'\"]*['\"][ ]*|[ ]*asset_img_url" "$file" | sed -E "s/['\"]([^'\"]*)['\"][ ]*\|[ ]*asset_img_url.*/\1/g")
    
    for asset in $img_refs; do
      if [ -n "$asset" ]; then
        referenced_assets+=("$asset")
        if [[ ! " ${asset_list[*]} " =~ " ${asset} " ]]; then
          echo -e "${RED}✗ Image asset '$asset' referenced in $file but not found${NC}"
        fi
      fi
    done
  done
  
  # Check for unused assets
  echo -e "\nChecking for unused assets..."
  for asset in "${asset_list[@]}"; do
    if [[ ! " ${referenced_assets[*]} " =~ " ${asset} " ]]; then
      echo -e "${YELLOW}⚠ Asset '$asset' is not referenced anywhere${NC}"
    fi
  done
}

# 7. Comprehensive theme validation
full_validation() {
  print_header "Running Comprehensive Theme Validation"
  
  if check_nodejs; then
    echo "Running advanced theme validator..."
    node theme-validator.js | tee logs/theme-validation-$(date +%Y%m%d%H%M%S).log
  else
    echo -e "${YELLOW}Node.js not available. Running basic validation instead.${NC}"
    bash validate_theme_enhanced.sh | tee logs/theme-basic-validation-$(date +%Y%m%d%H%M%S).log
  fi
}

# 8. Accessibility check
check_accessibility() {
  print_header "Checking Accessibility"
  
  echo "Checking for common accessibility issues..."
  
  # Check for alt attributes on images
  for file in $(find . -name "*.liquid"); do
    img_tags=$(grep -o "<img[^>]*>" "$file" | wc -l)
    img_alts=$(grep -o "<img[^>]*alt=['\"][^'\"]*['\"][^>]*>" "$file" | wc -l)
    
    if [ "$img_tags" -ne "$img_alts" ]; then
      echo -e "${RED}✗ Found $(($img_tags - $img_alts)) images without alt attributes in $file${NC}"
      grep -n "<img" "$file" | grep -v "alt=" | head -3
    else
      if [ "$img_tags" -gt 0 ]; then
        echo -e "${GREEN}✓ All $img_tags images in $file have alt attributes${NC}"
      fi
    fi
    
    # Check for empty alt attributes
    empty_alts=$(grep -o "<img[^>]*alt=['\"]['\"][^>]*>" "$file" | wc -l)
    if [ "$empty_alts" -gt 0 ]; then
      echo -e "${YELLOW}⚠ Found $empty_alts images with empty alt attributes in $file${NC}"
    fi
  done
  
  # Check for ARIA attributes in interactive elements
  echo -e "\nChecking ARIA attributes..."
  for file in $(find . -name "*.liquid"); do
    interactive_elements=$(grep -o "<button[^>]*>\|<a[^>]*>" "$file" | wc -l)
    aria_elements=$(grep -o "<button[^>]*aria-[^>]*>\|<a[^>]*aria-[^>]*>" "$file" | wc -l)
    
    if [ "$interactive_elements" -gt "$aria_elements" ]; then
      echo -e "${YELLOW}⚠ Some interactive elements in $file might need ARIA attributes${NC}"
    fi
  done
}

# 9. Performance check
check_performance() {
  print_header "Checking Theme Performance"
  
  echo "Checking for performance optimizations..."
  
  # Check image lazy loading
  echo "Checking image lazy loading..."
  for file in $(find . -name "*.liquid"); do
    img_tags=$(grep -o "<img[^>]*>" "$file" | wc -l)
    lazy_imgs=$(grep -o "<img[^>]*loading=['\"]lazy['\"][^>]*>" "$file" | wc -l)
    
    if [ "$img_tags" -gt 0 ] && [ "$lazy_imgs" -lt "$img_tags" ]; then
      echo -e "${YELLOW}⚠ Found $(($img_tags - $lazy_imgs)) images without lazy loading in $file${NC}"
    fi
  done
  
  # Check if large scripts are deferred
  echo -e "\nChecking script loading attributes..."
  for file in $(find . -name "*.liquid"); do
    script_tags=$(grep -o "<script[^>]*>" "$file" | wc -l)
    deferred_scripts=$(grep -o "<script[^>]*(defer|async)[^>]*>" "$file" | wc -l)
    
    if [ "$script_tags" -gt 0 ] && [ "$deferred_scripts" -lt "$script_tags" ]; then
      echo -e "${YELLOW}⚠ Found $(($script_tags - $deferred_scripts)) scripts without defer/async in $file${NC}"
    fi
  done
}

# Main function to run all tests
run_all_tests() {
  print_header "Running All Tests"
  
  validate_structure
  validate_liquid
  validate_json
  validate_css
  validate_js
  check_assets
  check_accessibility
  check_performance
  full_validation
  
  print_header "Testing Complete"
  echo -e "${GREEN}All validation processes completed. Check the logs directory for detailed results.${NC}"
}

# Display menu for option selection
show_menu() {
  clear
  echo -e "${CYAN}===================================================${NC}"
  echo -e "${CYAN}  ZenCartify Theme - Comprehensive Testing Tool    ${NC}"
  echo -e "${CYAN}===================================================${NC}"
  echo ""
  echo "Choose an option:"
  echo "1) Run all tests"
  echo "2) Validate theme structure"
  echo "3) Validate Liquid syntax"
  echo "4) Validate JSON files"
  echo "5) Validate CSS"
  echo "6) Validate JavaScript"
  echo "7) Check asset references"
  echo "8) Check accessibility"
  echo "9) Check performance"
  echo "10) Run comprehensive theme validation"
  echo "0) Exit"
  echo ""
  read -p "Enter your choice (0-10): " choice
  
  case $choice in
    1) run_all_tests ;;
    2) validate_structure ;;
    3) validate_liquid ;;
    4) validate_json ;;
    5) validate_css ;;
    6) validate_js ;;
    7) check_assets ;;
    8) check_accessibility ;;
    9) check_performance ;;
    10) full_validation ;;
    0) exit 0 ;;
    *) echo -e "${RED}Invalid choice${NC}" && sleep 2 && show_menu ;;
  esac
  
  echo ""
  read -p "Press Enter to return to the menu..." dummy
  show_menu
}

# Setup initial environment
check_dependencies

# Start the menu
show_menu
