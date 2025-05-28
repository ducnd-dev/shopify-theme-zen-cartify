const { analyzeLiquidFile } = require('./liquid-validator');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a file path to analyze');
  process.exit(1);
}

analyzeLiquidFile(filePath)
  .then(issues => {
    if (issues.length === 0) {
      console.log('✓ No issues found!');
      process.exit(0);
    } else {
      console.log(`✗ Found ${issues.length} issues`);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
