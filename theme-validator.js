/**
 * ZenCartify Theme Validator
 * 
 * A comprehensive Node.js script for validating Shopify themes
 * Checks for common mistakes, best practices, and theme structure
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const exec = promisify(require('child_process').exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Required directories for a Shopify theme
const requiredDirs = [
  'assets',
  'config',
  'layout',
  'sections',
  'snippets',
  'templates',
  'templates/customers',
];

// Required files for a Shopify theme
const requiredFiles = [
  'layout/theme.liquid',
  'templates/index.liquid',
  'templates/product.liquid',
  'templates/collection.liquid',
  'templates/cart.liquid',
  'templates/page.liquid',
  'templates/customers/account.liquid',
  'templates/customers/login.liquid',
  'templates/customers/register.liquid',
  'config/settings_schema.json'
];

// Patterns to check in Liquid files
const liquidPatterns = [
  { 
    pattern: /\{\{\s*[a-zA-Z0-9_\.\-\[\]]+\s*\}\}/g, 
    description: 'Basic output tag',
    expected: true 
  },
  { 
    pattern: /\{\%\s*[a-zA-Z0-9_]+.*?\s*\%\}/g, 
    description: 'Control flow tag',
    expected: true 
  },
  { 
    pattern: /\{\{-|-\}\}|\{\{-|\-\}\}|\{\%-|-\%\}|\{\%-|\-\%\}/g, 
    description: 'Liquid whitespace control', 
    expected: true 
  },
  { 
    pattern: /\{\{\s*'[^']*\\'[^']*'\s*\|\s*[a-zA-Z_]+(\s*:\s*[a-zA-Z0-9_]+)?\s*\}\}/g, 
    description: 'Improperly escaped apostrophes in single-quoted strings', 
    expected: false 
  },
  { 
    pattern: /\{\{\s*"[^"]*\\"[^"]*"\s*\|\s*[a-zA-Z_]+(\s*:\s*[a-zA-Z0-9_]+)?\s*\}\}/g, 
    description: 'Improperly escaped apostrophes in double-quoted strings', 
    expected: false 
  },
  { 
    pattern: /\{\{\s*'[^']*'[^']*'[^|]+\|\s*[a-zA-Z_]+(\s*:\s*[a-zA-Z0-9_]+)?\s*\}\}/g, 
    description: 'Unescaped apostrophes in single-quoted strings causing syntax errors', 
    expected: false
  },
  { 
    pattern: /\{\{[^\s]/g, 
    description: 'Missing space after {{ opening tag', 
    expected: false 
  },
  { 
    pattern: /[^\s]\}\}/g, 
    description: 'Missing space before }} closing tag', 
    expected: false 
  },
  { 
    pattern: /\{\%[^\s]/g, 
    description: 'Missing space after {% opening tag', 
    expected: false 
  },
  { 
    pattern: /[^\s]\%\}/g, 
    description: 'Missing space before %} closing tag', 
    expected: false 
  },
  { 
    pattern: /\{\{\s*product\.title\s*\}\}/g, 
    description: 'Product title reference',
    context: ['templates/product.liquid', 'sections/featured-products.liquid'] 
  },
  { 
    pattern: /\{\{\s*collection\.title\s*\}\}/g, 
    description: 'Collection title reference',
    context: ['templates/collection.liquid'] 
  },
  { 
    pattern: /t:("|\')[a-zA-Z0-9_\.]+("|\')]/g, 
    description: 'Translation keys',
    context: ['all'] 
  },
  { 
    pattern: /[^-]\{\{ content_for_/g, 
    description: 'Content for header/layout', 
    context: ['layout/theme.liquid']
  }
];

// Shopify-specific checks
const shopifySpecificChecks = [
  {
    check: (content) => content.includes('{{ content_for_header }}'),
    description: 'Missing {{ content_for_header }} in theme.liquid',
    files: ['layout/theme.liquid']
  },
  {
    check: (content) => content.includes('{{ content_for_layout }}'),
    description: 'Missing {{ content_for_layout }} in theme.liquid',
    files: ['layout/theme.liquid']
  },
  {
    check: (content) => /\{\%\s*section\s*('|")header('|")\s*\%\}/.test(content),
    description: 'Missing header section in theme.liquid',
    files: ['layout/theme.liquid']
  },
  {
    check: (content) => /\{\%\s*section\s*('|")footer('|")\s*\%\}/.test(content),
    description: 'Missing footer section in theme.liquid',
    files: ['layout/theme.liquid']
  },
  {
    check: (content) => content.includes('variant_price'),
    description: 'Check for proper variant price handling',
    files: ['templates/product.liquid']
  },
  {
    check: (content) => content.includes('form'),
    description: 'Check for form implementations',
    files: ['templates/product.liquid', 'templates/cart.liquid', 'templates/customers/login.liquid']
  }
];

// CSS checks (BEM naming convention check)
const cssChecks = [
  {
    pattern: /[.][a-z0-9]+((-|__)[a-z0-9]+)*(\.[a-z0-9]+((-|__)[a-z0-9]+)*)*/g,
    description: 'BEM naming convention',
    expected: true
  },
  {
    pattern: /!important/g,
    description: 'Avoid !important',
    expected: false
  }
];

// JS checks
const jsChecks = [
  {
    pattern: /document\.getElementById|document\.querySelector/g,
    description: 'DOM manipulation',
    expected: true
  },
  {
    pattern: /addEventListener/g,
    description: 'Event listeners',
    expected: true
  },
  {
    pattern: /console\.log/g,
    description: 'Console logs should be removed in production',
    expected: false
  },
  {
    pattern: /var /g,
    description: 'Using var instead of let/const',
    expected: false
  }
];

// Performance checkers
const performanceChecks = [
  {
    pattern: /<img[^>]+src=['"][^"']+['"][^>]*>/g,
    antiPattern: /<img[^>]+loading=['"]lazy['"][^>]*>/g,
    description: 'Images without lazy loading',
    files: ['**/*.liquid']
  },
  {
    pattern: /<script>[\s\S]*?<\/script>/g,
    description: 'Inline scripts (consider moving to external files)',
    files: ['**/*.liquid']
  }
];

// Accessibility checks
const accessibilityChecks = [
  {
    pattern: /<img[^>]*>/g,
    antiPattern: /<img[^>]+alt=['"][^"']*['"][^>]*>/g,
    description: 'Images without alt attributes',
    files: ['**/*.liquid']
  },
  {
    pattern: /<a[^>]*>/g,
    antiPattern: /<a[^>]+aria-label=['"][^"']*['"][^>]*>|<a[^>]*>[^<]+<\/a>/g,
    description: 'Links without text or aria-label',
    files: ['**/*.liquid']
  }
];

// Main validator function
async function validateTheme(rootDir = '.') {
  console.log(`${colors.cyan}ZenCartify Theme Validator${colors.reset}`);
  console.log('======================================\n');
  
  let errorCount = 0;
  let warningCount = 0;
  let passCount = 0;

  // Structure validation
  console.log(`${colors.blue}Validating theme structure...${colors.reset}`);
  for (const dir of requiredDirs) {
    const dirPath = path.join(rootDir, dir);
    try {
      await stat(dirPath);
      console.log(`${colors.green}✓ Directory exists: ${dir}${colors.reset}`);
      passCount++;
    } catch (err) {
      console.log(`${colors.red}✗ Missing required directory: ${dir}${colors.reset}`);
      errorCount++;
    }
  }

  for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file);
    try {
      await stat(filePath);
      console.log(`${colors.green}✓ File exists: ${file}${colors.reset}`);
      passCount++;
    } catch (err) {
      console.log(`${colors.red}✗ Missing required file: ${file}${colors.reset}`);
      errorCount++;
    }
  }

  // JSON validation
  console.log(`\n${colors.blue}Validating JSON files...${colors.reset}`);
  const jsonFiles = await findFilesByExtension(rootDir, '.json');
  for (const file of jsonFiles) {
    try {
      const content = await readFile(file, 'utf8');
      JSON.parse(content);
      console.log(`${colors.green}✓ Valid JSON: ${path.relative(rootDir, file)}${colors.reset}`);
      passCount++;
    } catch (err) {
      console.log(`${colors.red}✗ Invalid JSON: ${path.relative(rootDir, file)} - ${err.message}${colors.reset}`);
      errorCount++;
    }
  }
  // Liquid file validation
  console.log(`\n${colors.blue}Validating Liquid files...${colors.reset}`);
  const liquidFiles = await findFilesByExtension(rootDir, '.liquid');
  for (const file of liquidFiles) {
    const relPath = path.relative(rootDir, file);
    const content = await readFile(file, 'utf8');
    
    // Check for balanced liquid tags
    const openTags = (content.match(/\{%/g) || []).length;
    const closeTags = (content.match(/%\}/g) || []).length;
    
    if (openTags !== closeTags) {
      console.log(`${colors.red}✗ Unbalanced liquid tags in ${relPath}: ${openTags} opening vs ${closeTags} closing${colors.reset}`);
      errorCount++;
    } else {
      console.log(`${colors.green}✓ Balanced liquid tags in ${relPath}${colors.reset}`);
      passCount++;
    }
    
    // Perform advanced syntax validation
    const syntaxIssues = await validateLiquidSyntax(file, content);
    if (syntaxIssues.length > 0) {
      for (const issue of syntaxIssues) {
        if (issue.type === 'error') {
          console.log(`${colors.red}✗ ${issue.message} in ${relPath}:${issue.line}${colors.reset}`);
          errorCount++;
        } else if (issue.type === 'warning') {
          console.log(`${colors.yellow}⚠ ${issue.message} in ${relPath}:${issue.line}${colors.reset}`);
          warningCount++;
        } else {
          console.log(`${colors.blue}ℹ ${issue.message} in ${relPath}:${issue.line}${colors.reset}`);
        }
      }
    } else {
      console.log(`${colors.green}✓ No syntax issues found in ${relPath}${colors.reset}`);
      passCount++;
    }
    
    // Check for pattern matches
    for (const check of liquidPatterns) {
      const matches = content.match(check.pattern) || [];
      
      // If this check is context-specific, only run it on relevant files
      if (check.context && !check.context.includes('all') && 
          !check.context.some(ctx => relPath.includes(ctx))) {
        continue;
      }
      
      if (check.expected === false && matches.length > 0) {
        console.log(`${colors.yellow}⚠ Found ${matches.length} instances of ${check.description} in ${relPath}${colors.reset}`);
        warningCount++;
      } else if (check.expected === true && matches.length === 0 && 
                (!check.context || check.context.includes('all') || 
                 check.context.some(ctx => relPath.includes(ctx)))) {
        console.log(`${colors.yellow}⚠ Expected but didn't find ${check.description} in ${relPath}${colors.reset}`);
        warningCount++;
      }
    }
    
    // Shopify-specific checks
    for (const check of shopifySpecificChecks) {
      if (check.files && check.files.some(f => relPath.endsWith(f))) {
        if (!check.check(content)) {
          console.log(`${colors.red}✗ ${check.description} in ${relPath}${colors.reset}`);
          errorCount++;
        } else {
          passCount++;
        }
      }
    }

    // Advanced Liquid syntax validation
    const liquidIssues = await validateLiquidSyntax(file, content);
    for (const issue of liquidIssues) {
      const color = issue.type === 'error' ? colors.red : issue.type === 'warning' ? colors.yellow : colors.reset;
      console.log(`${color}${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}: ${issue.message} (line ${issue.line})${colors.reset}`);
      if (issue.type === 'error') {
        errorCount++;
      } else {
        warningCount++;
      }
    }
  }

  // CSS validation
  console.log(`\n${colors.blue}Validating CSS files...${colors.reset}`);
  const cssFiles = await findFilesByExtension(rootDir, '.css');
  for (const file of cssFiles) {
    const relPath = path.relative(rootDir, file);
    const content = await readFile(file, 'utf8');
    
    // Check for balanced braces
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      console.log(`${colors.red}✗ Unbalanced braces in ${relPath}: ${openBraces} opening vs ${closeBraces} closing${colors.reset}`);
      errorCount++;
    } else {
      console.log(`${colors.green}✓ Balanced braces in ${relPath}${colors.reset}`);
      passCount++;
    }
    
    // Check BEM naming convention and other CSS patterns
    for (const check of cssChecks) {
      const matches = content.match(check.pattern) || [];
      
      if (check.expected === false && matches.length > 0) {
        console.log(`${colors.yellow}⚠ Found ${matches.length} instances of ${check.description} in ${relPath}${colors.reset}`);
        warningCount++;
      } else if (check.expected === true && matches.length === 0) {
        console.log(`${colors.yellow}⚠ Expected but didn't find ${check.description} in ${relPath}${colors.reset}`);
        warningCount++;
      }
    }
  }

  // JavaScript validation
  console.log(`\n${colors.blue}Validating JavaScript files...${colors.reset}`);
  const jsFiles = await findFilesByExtension(rootDir, '.js');
  for (const file of jsFiles) {
    const relPath = path.relative(rootDir, file);
    const content = await readFile(file, 'utf8');
    
    // Check for JS patterns
    for (const check of jsChecks) {
      const matches = content.match(check.pattern) || [];
      
      if (check.expected === false && matches.length > 0) {
        console.log(`${colors.yellow}⚠ Found ${matches.length} instances of ${check.description} in ${relPath}${colors.reset}`);
        warningCount++;
      } else if (check.expected === true && matches.length === 0) {
        console.log(`${colors.yellow}⚠ Expected but didn't find ${check.description} in ${relPath}${colors.reset}`);
        warningCount++;
      }
    }
  }

  // Performance checks
  console.log(`\n${colors.blue}Running performance checks...${colors.reset}`);
  for (const check of performanceChecks) {
    for (const file of liquidFiles) {
      const relPath = path.relative(rootDir, file);
      const content = await readFile(file, 'utf8');
      
      const matches = content.match(check.pattern) || [];
      const antiMatches = check.antiPattern ? (content.match(check.antiPattern) || []).length : 0;
      
      if (matches.length > 0 && matches.length > antiMatches) {
        console.log(`${colors.yellow}⚠ ${check.description} in ${relPath}: ${matches.length - antiMatches} instances${colors.reset}`);
        warningCount++;
      }
    }
  }

  // Accessibility checks
  console.log(`\n${colors.blue}Running accessibility checks...${colors.reset}`);
  for (const check of accessibilityChecks) {
    for (const file of liquidFiles) {
      const relPath = path.relative(rootDir, file);
      const content = await readFile(file, 'utf8');
      
      const matches = content.match(check.pattern) || [];
      const antiMatches = check.antiPattern ? (content.match(check.antiPattern) || []).length : 0;
      
      if (matches.length > 0 && matches.length > antiMatches) {
        console.log(`${colors.yellow}⚠ ${check.description} in ${relPath}: ${matches.length - antiMatches} instances${colors.reset}`);
        warningCount++;
      }
    }
  }

  // Check for assets referenced but not included
  console.log(`\n${colors.blue}Checking asset references...${colors.reset}`);
  const assetFiles = await readdir(path.join(rootDir, 'assets'));
  const assetReferences = new Map();
  
  for (const file of liquidFiles) {
    const content = await readFile(file, 'utf8');
    const relPath = path.relative(rootDir, file);
    
    const assetUrlMatches = content.match(/\{\{\s*['"]([^'"]+)['"]\s*\|\s*asset_url\s*\}\}/g) || [];
    const assetImgUrlMatches = content.match(/\{\{\s*['"]([^'"]+)['"]\s*\|\s*asset_img_url[^}]*\}\}/g) || [];
    
    for (const match of [...assetUrlMatches, ...assetImgUrlMatches]) {
      const assetName = match.match(/['"]([^'"]+)['"]/)[1];
      if (!assetReferences.has(assetName)) {
        assetReferences.set(assetName, []);
      }
      assetReferences.get(assetName).push(relPath);
    }
  }
  
  for (const [asset, references] of assetReferences) {
    if (!assetFiles.includes(asset)) {
      console.log(`${colors.yellow}⚠ Asset '${asset}' is referenced in ${references.join(', ')} but not found in assets folder${colors.reset}`);
      warningCount++;
    } else {
      console.log(`${colors.green}✓ Asset '${asset}' referenced and exists${colors.reset}`);
      passCount++;
    }
  }

  // Summary
  console.log(`\n${colors.blue}Validation Summary:${colors.reset}`);
  console.log(`${colors.green}✓ ${passCount} checks passed${colors.reset}`);
  console.log(`${colors.yellow}⚠ ${warningCount} warnings${colors.reset}`);
  console.log(`${colors.red}✗ ${errorCount} errors${colors.reset}`);
  
  if (errorCount > 0) {
    console.log(`\n${colors.red}Validation failed with ${errorCount} errors${colors.reset}`);
    return false;
  } else if (warningCount > 0) {
    console.log(`\n${colors.yellow}Validation passed with ${warningCount} warnings${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.green}Validation passed successfully!${colors.reset}`);
    return true;
  }
}

// Helper function to find all files with a given extension
async function findFilesByExtension(dir, extension) {
  const files = [];
  
  async function traverse(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          await traverse(fullPath);
        }
      } else if (path.extname(entry.name) === extension) {
        files.push(fullPath);
      }
    }
  }
  
  await traverse(dir);
  return files;
}

// Helper function for advanced Liquid syntax validation
async function validateLiquidSyntax(filePath, content) {
  const issues = [];
  
  // Check for balanced tags with proper nesting
  const tagStack = [];
  const tagRegex = /\{%\s*(\w+)(?:\s+.*?)?\s*%\}|\{%\s*end(\w+)\s*%\}/g;
  let match;
  let lineNum = 1;
  let position = 0;
  
  // Calculate line number for a given position
  const getLineNumber = (pos) => {
    return content.substring(0, pos).split('\n').length;
  };

  while ((match = tagRegex.exec(content)) !== null) {
    const [fullTag, openTag, closeTag] = match;
    const tagPosition = match.index;
    lineNum = getLineNumber(tagPosition);
    
    if (openTag && !['comment', 'raw', 'stylesheet', 'javascript', 'schema'].includes(openTag)) {
      // Opening tag
      if (['if', 'unless', 'case', 'for', 'paginate', 'form'].includes(openTag)) {
        tagStack.push({ tag: openTag, line: lineNum });
      }
    } else if (closeTag) {
      // Closing tag
      if (tagStack.length === 0) {
        issues.push({
          type: 'error',
          message: `Unexpected closing tag 'end${closeTag}' with no matching opening tag`,
          line: lineNum
        });
      } else {
        const lastTag = tagStack.pop();
        if (lastTag.tag !== closeTag) {
          issues.push({
            type: 'error',
            message: `Mismatched Liquid tags: '${lastTag.tag}' (line ${lastTag.line}) closed with 'end${closeTag}'`,
            line: lineNum
          });
        }
      }
    }
  }
  
  // Check for unclosed tags
  if (tagStack.length > 0) {
    for (const item of tagStack) {
      issues.push({
        type: 'error',
        message: `Unclosed Liquid tag '${item.tag}' from line ${item.line}`,
        line: item.line
      });
    }
  }

  // Check for problematic string escaping in Liquid tags
  const stringIssuesRegex = /\{\{\s*['"]([^'"]*(?:\'(?!')|\"(?!")))[^'"]*['"]\s*(?:\|[^}]+)?\}\}/g;
  while ((match = stringIssuesRegex.exec(content)) !== null) {
    const [fullMatch, stringContent] = match;
    const lineNum = getLineNumber(match.index);
    issues.push({
      type: 'warning',
      message: `Potential string escaping issue: "${fullMatch}"`,
      line: lineNum
    });
  }

  // Check for translation keys without values
  const translationRegex = /\{\{\s*['"]([^'"]+)['"]\s*\|\s*t\s*(?:\|[^}]*)?\}\}/g;
  while ((match = translationRegex.exec(content)) !== null) {
    const [fullMatch, key] = match;
    const lineNum = getLineNumber(match.index);
    
    // Here we would ideally check against actual locale files
    // For now just flag as potential issue
    issues.push({
      type: 'info',
      message: `Translation key used: '${key}'. Verify it exists in locale files.`,
      line: lineNum
    });
  }

  // Check for apostrophes in default values
  const defaultValueRegex = /\{\{\s*['"]([^'"]+)['"]\s*\|\s*(?:[a-z_]+)\s*\|\s*default:\s*['"]([^'"]*'[^'"]*)['"]\s*\}\}/g;
  while ((match = defaultValueRegex.exec(content)) !== null) {
    const [fullMatch, key, defaultValue] = match;
    const lineNum = getLineNumber(match.index);
    if (defaultValue.includes("'")) {
      issues.push({
        type: 'error',
        message: `Unescaped apostrophe in default value: "${fullMatch}"`,
        line: lineNum
      });
    }
  }

  return issues;
}

// Run the validator if executed directly
if (require.main === module) {
  validateTheme(process.cwd())
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Error running validator:', err);
      process.exit(1);
    });
}

module.exports = {
  validateTheme,
  findFilesByExtension
};
