
#!/usr/bin/env node

/**
 * Pre-Deployment Validation Script
 * Checks if all required configurations are in place
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = [
    'wrangler.toml',
    'package.json',
    'frontend/dashboard.html',
    'frontend/reader.html',
    'functions/_middleware.ts',
    'migrations/0001_init.sql'
];

const REQUIRED_DIRS = [
    'frontend/scripts',
    'frontend/styles',
    'functions/api',
    'migrations'
];

console.log('🔍 Running pre-deployment checks...\n');

let hasErrors = false;

// Check required files
console.log('📄 Checking required files...');
REQUIRED_FILES.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✓ ${file}`);
    } else {
        console.log(`  ✗ Missing: ${file}`);
        hasErrors = true;
    }
});

// Check required directories
console.log('\n📁 Checking required directories...');
REQUIRED_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`  ✓ ${dir}`);
    } else {
        console.log(`  ✗ Missing: ${dir}`);
        hasErrors = true;
    }
});

// Check wrangler.toml for placeholder values
console.log('\n⚙️  Checking wrangler.toml configuration...');
const wranglerContent = fs.readFileSync('wrangler.toml', 'utf8');
if (wranglerContent.includes('REPLACE_WITH_')) {
    console.log('  ⚠️  Warning: wrangler.toml contains placeholder values');
    console.log('     Please update database_id and KV namespace IDs');
    hasErrors = true;
} else {
    console.log('  ✓ Configuration appears complete');
}

// Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['dev', 'deploy'];
requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
        console.log(`  ✓ Script "${script}" defined`);
    } else {
        console.log(`  ✗ Missing script: ${script}`);
        hasErrors = true;
    }
});

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
    console.log('❌ Pre-deployment check FAILED');
    console.log('\nPlease fix the issues above before deploying.');
    console.log('See CLOUDFLARE_SETUP.md for detailed instructions.');
    process.exit(1);
} else {
    console.log('✅ Pre-deployment check PASSED');
    console.log('\nYou can now deploy with: npm run deploy');
    console.log('Or test locally with: npm run dev');
}
