/**
 * Modern Swig Template Engine - ES6+ Wrapper
 * 
 * This is a modern wrapper around the original swig@1.4.2 library
 * that provides ES6+ compatibility while maintaining backward compatibility.
 * 
 * Original: https://github.com/paularmstrong/swig
 */

// Load original swig modules
const utils = require('./utils');
const _tags = require('./tags');
const _filters = require('./filters');
const parser = require('./parser');
const dateformatter = require('./dateformatter');
const loaders = require('./loaders');

/**
 * Swig version number
 */
exports.version = '1.4.2-modern';

/**
 * Default Swig options
 */
const defaultOptions = {
  autoescape: true,
  varControls: ['{{', '}}'],
  tagControls: ['{%', '%}'],
  cmtControls: ['{#', '#}'],
  locals: {},
  cache: 'memory',
  loader: loaders.fs()
};

let defaultInstance;

/**
 * Empty function, used in templates.
 */
function efn() { return ''; }

/**
 * Validate the Swig options object.
 */
function validateOptions(options) {
  if (!options) {
    return;
  }

  ['varControls', 'tagControls', 'cmtControls'].forEach((key) => {
    if (!options.hasOwnProperty(key)) {
      return;
    }
    if (!Array.isArray(options[key]) || options[key].length !== 2) {
      throw new Error(`Option "${key}" must be an array containing 2 different control strings.`);
    }
    if (options[key][0] === options[key][1]) {
      throw new Error(`Option "${key}" open and close controls must not be the same.`);
    }
    options[key].forEach((a, i) => {
      if (a.length < 2) {
        throw new Error(`Option "${key}" ${i ? 'open ' : 'close '}control must be at least 2 characters. Saw "${a}" instead.`);
      }
    });
  });

  if (options.hasOwnProperty('cache')) {
    if (options.cache && options.cache !== 'memory') {
      if (typeof options.cache.get !== 'function' || typeof options.cache.set !== 'function') {
        throw new Error(`Invalid cache option ${JSON.stringify(options.cache)} found. Expected "memory" or { get: function (key) { ... }, set: function (key, value) { ... } }.`);
      }
    }
  }
  if (options.hasOwnProperty('loader')) {
    if (options.loader) {
      if (typeof options.loader.load !== 'function' || typeof options.loader.resolve !== 'function') {
        throw new Error(`Invalid loader option ${JSON.stringify(options.loader)} found. Expected { load: function (pathname, cb) { ... }, resolve: function (to, from) { ... } }.`);
      }
    }
  }
}

/**
 * Set defaults for the base and all new Swig environments.
 */
exports.setDefaults = function(options) {
  validateOptions(options);
  if (!defaultInstance) {
    defaultInstance = new exports.Swig();
  }
  defaultInstance.options = utils.extend(defaultInstance.options, options);
};

/**
 * Set the default TimeZone offset for date formatting
 */
exports.setDefaultTZOffset = function(offset) {
  dateformatter.tzOffset = offset;
};

/**
 * Create a new, separate Swig compile/render environment.
 */
exports.Swig = function(opts) {
  validateOptions(opts);
  this.options = utils.extend({}, defaultOptions, opts || {});
  this.cache = {};
  this.extensions = {};
  const self = this;
  const tags = _tags;
  const filters = _filters;

  /**
   * Get combined locals context.
   */
  function getLocals(options) {
    if (!options || !options.locals) {
      return self.options.locals;
    }
    return utils.extend({}, self.options.locals, options.locals);
  }

  /**
   * Determine whether caching is enabled
   */
  function shouldCache(options) {
    if (options && options.hasOwnProperty('cache')) {
      return !!options.cache;
    }
    return !!self.options.cache;
  }

  /**
   * Get cache key for a template path
   */
  function getCacheKey(path, options) {
    return path + JSON.stringify(options);
  }

  /**
   * Get a template from cache or load it
   */
  function getTemplate(path, options, cb) {
    const cacheKey = getCacheKey(path, options);
    
    if (shouldCache(options) && self.cache[cacheKey]) {
      return cb(null, self.cache[cacheKey]);
    }

    self.options.loader.load(path, (err, source) => {
      if (err) {
        return cb(err);
      }

      try {
        const tpl = parser.parse(source, self.options);
        if (shouldCache(options)) {
          self.cache[cacheKey] = tpl;
        }
        cb(null, tpl);
      } catch (e) {
        cb(e);
      }
    });
  }

  /**
   * Compile a template string into a function.
   */
  this.compile = function(str, options) {
    options = options || {};
    const tpl = parser.parse(str, self.options, options);
    return tpl.compile(getLocals(options));
  };

  /**
   * Render a template string with the given context.
   */
  this.render = function(str, options) {
    options = options || {};
    const tpl = parser.parse(str, self.options, options);
    return tpl.render(getLocals(options));
  };

  /**
   * Render a template file with the given context.
   */
  this.renderFile = function(path, options, cb) {
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }

    getTemplate(path, options, (err, tpl) => {
      if (err) {
        return cb(err);
      }
      try {
        const result = tpl.render(getLocals(options));
        cb(null, result);
      } catch (e) {
        cb(e);
      }
    });
  };

  /**
   * Register a new filter.
   */
  this.addFilter = function(name, fn) {
    filters[name] = fn;
    return this;
  };

  /**
   * Register a new tag.
   */
  this.addTag = function(name, tagDef) {
    tags[name] = tagDef;
    return this;
  };

  /**
   * Register a new extension.
   */
  this.addExtension = function(ext) {
    utils.extend(this.extensions, ext);
    return this;
  };

  // Initialize with defaults
  if (!defaultInstance) {
    defaultInstance = this;
  }
};

/**
 * Create a new Swig instance (alias for Swig constructor)
 */
exports.create = function(opts) {
  return new exports.Swig(opts);
};

/**
 * Render a template string (convenience method)
 */
exports.render = function(str, options) {
  if (!defaultInstance) {
    defaultInstance = new exports.Swig();
  }
  return defaultInstance.render(str, options);
};

/**
 * Render a template file (convenience method)
 */
exports.renderFile = function(path, options, cb) {
  if (!defaultInstance) {
    defaultInstance = new exports.Swig();
  }
  return defaultInstance.renderFile(path, options, cb);
};

/**
 * Compile a template string (convenience method)
 */
exports.compile = function(str, options) {
  if (!defaultInstance) {
    defaultInstance = new exports.Swig();
  }
  return defaultInstance.compile(str, options);
};

// Export loaders
exports.loaders = loaders;

// Export filters
exports.filters = _filters;

// Export tags
exports.tags = _tags;

// Export utils
exports.utils = utils;

// Initialize default instance
if (!defaultInstance) {
  defaultInstance = new exports.Swig();
}

// Backward compatibility: export everything from the default instance
Object.keys(defaultInstance).forEach((key) => {
  if (typeof defaultInstance[key] === 'function' && !exports[key]) {
    exports[key] = defaultInstance[key].bind(defaultInstance);
  }
});

module.exports = exports;
