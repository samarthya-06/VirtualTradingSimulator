import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Get the __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const backendDir = path.resolve(__dirname, '../');

console.log('Environment Variable Verification Tool');
console.log('====================================');
console.log(`Root directory: ${rootDir}`);
console.log(`Backend directory: ${backendDir}`);

// Check all potential .env files
const envFiles = [
  { path: path.join(rootDir, '.env'), name: 'Root .env' },
  { path: path.join(backendDir, '.env'), name: 'Backend .env' },
  { path: path.join(rootDir, 'frontend', '.env'), name: 'Frontend .env' }
];

// Store all env values for comparison
const envValues = {};

// Load each .env file and check critical variables
envFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    console.log(`\nChecking ${file.name} at ${file.path}`);
    const envConfig = dotenv.parse(fs.readFileSync(file.path));
    
    // Check critical variables
    const criticalVars = ['JWT_SECRET', 'MONGO_URI', 'PORT'];
    criticalVars.forEach(varName => {
      const value = envConfig[varName];
      if (!value) {
        console.log(`  - ❌ ${varName}: Missing`);
      } else {
        console.log(`  - ✅ ${varName}: ${varName === 'JWT_SECRET' ? 
          `Present (length: ${value.length}, prefix: ${value.substring(0, 5)}...)` : 
          'Present'}`);
      }
      
      // Store for comparison
      if (!envValues[varName]) {
        envValues[varName] = [];
      }
      envValues[varName].push({ file: file.name, value });
    });
  } else {
    console.log(`\n❌ ${file.name} not found at ${file.path}`);
  }
});

// Check for consistency across files
console.log('\nChecking consistency across files:');
Object.keys(envValues).forEach(varName => {
  const values = envValues[varName];
  if (values.length > 1) {
    const firstValue = values[0].value;
    const isConsistent = values.every(v => v.value === firstValue);
    
    if (isConsistent) {
      console.log(`  - ✅ ${varName}: Consistent across all files`);
    } else {
      console.log(`  - ❌ ${varName}: Inconsistent values detected!`);
      values.forEach(v => {
        if (varName === 'JWT_SECRET') {
          console.log(`      ${v.file}: length=${v.value ? v.value.length : 0}, prefix=${v.value ? v.value.substring(0, 5) : 'undefined'}...`);
        } else {
          console.log(`      ${v.file}: ${v.value ? 'Present' : 'Missing'}`);
        }
      });
    }
  }
});

// Test JWT verification
console.log('\nTesting JWT verification:');

// Load backend .env for JWT testing
const backendEnvPath = path.join(backendDir, '.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
  
  if (process.env.JWT_SECRET) {
    console.log(`Using JWT_SECRET from backend .env (length: ${process.env.JWT_SECRET.length})`);
    
    try {
      // Generate a test token
      const testPayload = { id: 'test-user-id-123456789' };
      const token = jwt.sign(testPayload, process.env.JWT_SECRET, {
        expiresIn: '30d',
        algorithm: 'HS256'
      });
      
      console.log(`Generated test token successfully`);
      
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256']
      });
      
      console.log(`✅ Token verification successful!`);
      console.log(`  User ID: ${decoded.id}`);
      console.log(`  Expires: ${new Date(decoded.exp * 1000).toLocaleString()}`);
    } catch (error) {
      console.log(`❌ JWT Error: ${error.message}`);
    }
  } else {
    console.log('❌ JWT_SECRET not found in backend .env file');
  }
} else {
  console.log('❌ Backend .env file not found');
}

console.log('\nEnvironment verification completed'); 