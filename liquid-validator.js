/**
 * ZenCartify Liquid Syntax Validator
 * 
 * A specialized tool for validating Shopify Liquid syntax
 * Focuses on common syntax errors in Liquid templates
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

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

// Common Liquid syntax errors to check for
const liquidSyntaxChecks = [
  {
    name: 'Unbalanced tags',
    check: (content) => {
      const openTags = (content.match(/\{%/g) || []).length;
      const closeTags = (content.match(/%\}/g) || []).length;
      return openTags === closeTags;
    },
    message: 'Unbalanced Liquid tags {% %}'
  },
  {
    name: 'Unbalanced output tags',
    check: (content) => {
      const openTags = (content.match(/\{\{/g) || []).length;
      const closeTags = (content.match(/\}\}/g) || []).length;
      return openTags === closeTags;
    },
    message: 'Unbalanced Liquid output tags {{ }}'
  },
  {
    name: 'Missing spaces in tags',
    check: (content) => {
      return !(/\{%[^\s]/.test(content) || /[^\s]%\}/.test(content));
    },
    message: 'Missing spaces in Liquid tags (should be {% tag %})'
  },
  {
    name: 'Missing spaces in output tags',
    check: (content) => {
      return !(/\{\{[^\s]/.test(content) || /[^\s]\}\}/.test(content));
    },
    message: 'Missing spaces in Liquid output tags (should be {{ var }})'
  },
  {
    name: 'Apostrophe in single-quoted string',
    check: (content) => {
      const regex = /\{\{[^}]*'[^']*'[^']*'[^}]*\}\}/g;
      return !regex.test(content);
    },
    message: 'Unescaped apostrophe in single-quoted string'
  },
  {
    name: 'Improper apostrophe escaping',
    check: (content) => {
      const regex = /\{\{[^}]*default:\s*'[^']*\\?'[^']*'[^}]*\}\}/g;
      return !regex.test(content);
    },
    message: 'Improper apostrophe escaping in default values'
  },
  {
    name: 'Improper filter usage',
    check: (content) => {
      // Check for proper filter syntax (no spaces around |)
      const badFilterSyntax = /\{\{[^}]*\s+\|\s*[a-z_]+\s*:|\{\{[^}]*\|\s*[a-z_]+\s*:[^'"]\s*\}\}/g;
      return !badFilterSyntax.test(content);
    },
    message: 'Improper filter syntax'
  },
  {
    name: 'Unclosed control flow tags',
    check: (content) => {
      const tags = [
        { open: /\{%\s*if\s+/g, close: /\{%\s*endif\s*%\}/g },
        { open: /\{%\s*unless\s+/g, close: /\{%\s*endunless\s*%\}/g },
        { open: /\{%\s*for\s+/g, close: /\{%\s*endfor\s*%\}/g },
        { open: /\{%\s*case\s+/g, close: /\{%\s*endcase\s*%\}/g },
        { open: /\{%\s*form\s+/g, close: /\{%\s*endform\s*%\}/g },
        { open: /\{%\s*paginate\s+/g, close: /\{%\s*endpaginate\s*%\}/g },
        { open: /\{%\s*capture\s+/g, close: /\{%\s*endcapture\s*%\}/g },
        { open: /\{%\s*tablerow\s+/g, close: /\{%\s*endtablerow\s*%\}/g },
        { open: /\{%\s*raw\s*%\}/g, close: /\{%\s*endraw\s*%\}/g },
        { open: /\{%\s*liquid\s*%\}/g, close: /\{%\s*endliquid\s*%\}/g },
        { open: /\{%\s*schema\s*%\}/g, close: /\{%\s*endschema\s*%\}/g },
        { open: /\{%\s*stylesheet\s*%\}/g, close: /\{%\s*endstylesheet\s*%\}/g },
        { open: /\{%\s*javascript\s*%\}/g, close: /\{%\s*endjavascript\s*%\}/g }
      ];
      
      for (const tag of tags) {
        const openCount = (content.match(tag.open) || []).length;
        const closeCount = (content.match(tag.close) || []).length;
        if (openCount !== closeCount) {
          return false;
        }
      }
      return true;
    },
    message: 'Unclosed control flow tags (if/endif, for/endfor, etc.)'
  },
  {
    name: 'Nested quotes in attributes',
    check: (content) => {
      const doubleInSingle = /\{\{[^}]*'[^']*"[^"]*"[^']*'[^}]*\}\}/g;
      const singleInDouble = /\{\{[^}]*"[^"]*'[^']*'[^"]*"[^}]*\}\}/g;
      return !doubleInSingle.test(content) && !singleInDouble.test(content);
    },
    message: 'Potential quote nesting issues'
  }
];

/**
 * Function to analyze a specific file for liquid syntax issues
 */
async function analyzeLiquidFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const relPath = path.relative(process.cwd(), filePath);
    const issues = [];
    
    console.log(`\n${colors.blue}Analyzing ${colors.cyan}${relPath}${colors.blue}...${colors.reset}`);
    
    // Run all checks
    for (const check of liquidSyntaxChecks) {
      const result = check.check(content);
      if (!result) {
        console.log(`  ${colors.red}✗ ${check.message}${colors.reset}`);
        
        // Provide more detailed information for certain issues
        if (check.name === 'Apostrophe in single-quoted string') {
          // Find and show problematic lines
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/\{\{[^}]*'[^']*'[^']*'[^}]*\}\}/.test(line)) {
              console.log(`    ${colors.yellow}Line ${i+1}: ${line.trim()}${colors.reset}`);
            }
          }
        } else if (check.name === 'Improper apostrophe escaping') {
          // Find and show problematic lines
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/default:\s*'[^']*\\?'[^']*'/.test(line)) {
              console.log(`    ${colors.yellow}Line ${i+1}: ${line.trim()}${colors.reset}`);
            }
          }
        }
        
        issues.push({
          check: check.name,
          message: check.message,
          file: relPath
        });
      } else {
        console.log(`  ${colors.green}✓ ${check.name} - OK${colors.reset}`);
      }
    }
    
    // Check for potential issues with default values containing apostrophes
    const defaultValuePattern = /default:\s*'([^']*)'/g;
    let defaultMatch;
    let lineNum = 0;
    const lines = content.split('\n');
    
    lines.forEach((line, i) => {
      if (line.includes("default: '") && line.split("'").length > 3) {
        console.log(`  ${colors.red}✗ Potential apostrophe issue in default value${colors.reset}`);
        console.log(`    ${colors.yellow}Line ${i+1}: ${line.trim()}${colors.reset}`);
        issues.push({
          check: 'Default value apostrophe',
          message: 'Potential apostrophe issue in default value',
          file: relPath,
          line: i+1
        });
      }
    });
    
    return issues;
  } catch (err) {
    console.error(`${colors.red}Error analyzing ${filePath}: ${err.message}${colors.reset}`);
    return [{
      check: 'File read error',
      message: `Error analyzing file: ${err.message}`,
      file: filePath
    }];
  }
}

/**
 * Function to find all Liquid files in a directory and its subdirectories
 */
async function findLiquidFiles(dir) {
  const liquidFiles = [];
  
  async function scanDir(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDir(fullPath);
        }
      } else if (entry.name.endsWith('.liquid')) {
        liquidFiles.push(fullPath);
      }
    }
  }
  
  await scanDir(dir);
  return liquidFiles;
}

/**
 * Main function to validate all liquid files in the theme
 */
async function validateLiquidSyntax(rootDir = '.') {
  console.log(`${colors.cyan}ZenCartify Liquid Syntax Validator${colors.reset}`);
  console.log('========================================\n');
  
  try {
    // Find all liquid files
    const liquidFiles = await findLiquidFiles(rootDir);
    console.log(`${colors.blue}Found ${liquidFiles.length} Liquid files to analyze${colors.reset}`);
    
    // Analyze each file
    let totalIssues = 0;
    const allIssues = [];
    
    for (const file of liquidFiles) {
      const issues = await analyzeLiquidFile(file);
      totalIssues += issues.length;
      allIssues.push(...issues);
    }
    
    // Print summary
    console.log(`\n${colors.blue}Validation Summary:${colors.reset}`);
    if (totalIssues === 0) {
      console.log(`${colors.green}✓ No issues found!${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Found ${totalIssues} issues across ${liquidFiles.length} files${colors.reset}`);
      
      // Group issues by type
      const issuesByType = {};
      for (const issue of allIssues) {
        if (!issuesByType[issue.check]) {
          issuesByType[issue.check] = [];
        }
        issuesByType[issue.check].push(issue);
      }
      
      console.log(`\n${colors.blue}Issues by type:${colors.reset}`);
      for (const [type, issues] of Object.entries(issuesByType)) {
        console.log(`  ${colors.yellow}${type}: ${issues.length} issues${colors.reset}`);
        for (const issue of issues) {
          console.log(`    - ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        }
      }
    }
    
    return totalIssues === 0;
  } catch (err) {
    console.error(`${colors.red}Error running validator: ${err.message}${colors.reset}`);
    return false;
  }
}

// Run the validator if executed directly
if (require.main === module) {
  validateLiquidSyntax(process.cwd())
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Error running validator:', err);
      process.exit(1);
    });
}

module.exports = {
  validateLiquidSyntax,
  analyzeLiquidFile,
  findLiquidFiles
};
