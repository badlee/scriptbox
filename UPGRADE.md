# Scriptbox Modernization Guide

## Overview

This upgrade modernizes the Scriptbox application by:

1. **Cloning and updating outdated dependencies** (modem, kannel, shorty)
2. **Converting code to modern ES6+ JavaScript**
3. **Updating npm dependencies** to recent versions
4. **Maintaining backward compatibility** where possible

## Changes Made

### 1. Local Dependencies (in `/lib` directory)

#### `/lib/modem/`
- **Source**: Updated from `emilsedgh/modem@1.0.3`
- **Changes**:
  - Converted to ES6 class syntax
  - Added proper TypeScript-like documentation
  - Improved error handling
  - Better event management
  - Support for modern Node.js (>=14.0.0)

#### `/lib/kannel/`
- **Source**: Updated from `badlee/kannel.js@0.2.7`
- **Changes**:
  - Converted to ES6 class syntax
  - Improved connection handling
  - Better error management
  - Modern event emitter usage
  - Support for TLS connections

#### `/lib/shorty/`
- **Source**: Updated from `badlee/shorty@0.5.5`
- **Changes**:
  - Converted to ES6 class syntax
  - Improved PDU handling
  - Better connection management
  - Modern buffer handling
  - Support for async/await patterns

### 2. Updated Connectors

All connector files in `/scripts/connectors/` have been updated to:
- Use the new local dependencies
- Support ES6+ syntax
- Better error handling
- Improved logging

### 3. Package.json Updates

- **Node.js version**: Updated from `>=0.8.0` to `>=14.0.0`
- **Dependencies**: Updated to recent stable versions
- **New scripts**: Added `dev`, `lint`, and `format` scripts
- **Removed**: Old dependencies that are now local

## Migration Guide

### For Existing Users

1. **Backup your current installation**
   ```bash
   cp -r /path/to/scriptbox /path/to/scriptbox-backup
   ```

2. **Update Node.js**
   Ensure you have Node.js 14.0.0 or later installed:
   ```bash
   node -v  # Should be >=14.0.0
   ```

3. **Install new dependencies**
   ```bash
   cd /path/to/scriptbox
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Update configuration**
   Check your configuration files for any deprecated options.

### For Developers

1. **Using local dependencies**
   The project now uses local versions of modem, kannel, and shorty. To use them:
   ```javascript
   const modem = require('./lib/modem');
   const kannel = require('./lib/kannel');
   const shorty = require('./lib/shorty');
   ```

2. **Adding new features**
   - Use ES6+ syntax (classes, arrow functions, etc.)
   - Use async/await for asynchronous operations
   - Follow the existing code patterns

3. **Testing**
   ```bash
   npm test
   ```

4. **Development mode**
   ```bash
   npm run dev
   ```

5. **Code formatting**
   ```bash
   npm run format
   ```

6. **Linting**
   ```bash
   npm run lint
   ```

## Breaking Changes

### 1. Node.js Version Requirement
- **Before**: `>=0.8.0`
- **After**: `>=14.0.0`

### 2. Dependency Changes

The following dependencies are now local and not installed from npm:
- `modem` (was `^1.0.3`)
- `kannel` (was `0.0.5`)
- `shorty` (was `0.5.6`)

### 3. API Changes

#### Modem
- `modem.open()` now accepts options as second parameter
- Better error handling with proper callbacks
- Event names are more consistent

#### Kannel
- Configuration is more flexible
- Better connection retry logic
- Improved error messages

#### Shorty
- PDU handling is more robust
- Better buffer management
- Improved event names

## Benefits

1. **Modern JavaScript**: Uses ES6+ features (classes, arrow functions, destructuring, etc.)
2. **Better Performance**: Updated dependencies and optimized code
3. **Improved Security**: Updated dependencies with security fixes
4. **Better Maintainability**: Cleaner code structure and documentation
5. **Future-Proof**: Ready for modern Node.js development

## Compatibility

- **Node.js**: 14.0.0+
- **npm**: 6.0.0+
- **OS**: Linux, macOS, Windows (with WSL for serial port access)

## Troubleshooting

### Common Issues

1. **Serial port permissions**
   ```bash
   sudo usermod -a -G dialout $USER
   sudo chmod a+rw /dev/ttyUSB0
   ```

2. **Node.js version too old**
   ```bash
   nvm install 14
   nvm use 14
   ```

3. **Missing dependencies**
   ```bash
   npm install
   ```

### Debug Mode

Enable debug logging:
```bash
DEBUG=scriptbox:* node index.js
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - See LICENSE file for details.
