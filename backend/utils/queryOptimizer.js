/**
 * Query Optimizer Utility
 * Collection of helper functions to optimize database queries
 */

/**
 * Apply pagination to a query
 * @param {Object} query - Mongoose query object
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 10)
 * @returns {Object} - Modified query object
 */
export const paginate = (query, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

/**
 * Apply field selection/projection to reduce query payload size
 * @param {Object} query - Mongoose query object
 * @param {string} fields - Space-separated list of fields to include
 * @returns {Object} - Modified query object
 */
export const selectFields = (query, fields) => {
  return query.select(fields);
};

/**
 * Apply lean() to a query to improve performance by returning plain JS objects
 * @param {Object} query - Mongoose query object
 * @returns {Object} - Modified query object with lean applied
 */
export const applyLean = (query) => {
  return query.lean();
};

/**
 * Get optimized pagination result with metadata
 * @param {Object} model - Mongoose model
 * @param {Object} queryOptions - Query options (query, page, limit, fields, sort, populate)
 * @returns {Object} - Pagination result with data and metadata
 */
export const getPaginatedResults = async (model, queryOptions = {}) => {
  const {
    query = {},
    page = 1,
    limit = 10,
    fields = '',
    sort = { createdAt: -1 },
    populate = null,
    lean = true
  } = queryOptions;

  // Build query
  let queryBuilder = model.find(query);
  
  // Apply field selection if provided
  if (fields) {
    queryBuilder = selectFields(queryBuilder, fields);
  }
  
  // Apply sort
  queryBuilder = queryBuilder.sort(sort);
  
  // Apply pagination
  queryBuilder = paginate(queryBuilder, page, limit);
  
  // Apply population if needed
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach(pop => {
        queryBuilder = queryBuilder.populate(pop);
      });
    } else {
      queryBuilder = queryBuilder.populate(populate);
    }
  }
  
  // Apply lean for better performance
  if (lean) {
    queryBuilder = applyLean(queryBuilder);
  }
  
  // Execute query
  const results = await queryBuilder;
  
  // Get total count with separate efficient query (using countDocuments)
  const total = await model.countDocuments(query);
  
  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  // Return paginated results with metadata
  return {
    data: results,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? parseInt(page) + 1 : null,
      prevPage: hasPrev ? parseInt(page) - 1 : null,
    }
  };
};

/**
 * Execute a query with timeout to prevent long-running queries
 * @param {Object} query - Mongoose query object
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise} - Query result or timeout error
 */
export const executeWithTimeout = async (query, timeout = 5000) => {
  const queryPromise = query.exec();
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Query timed out after ${timeout}ms`));
    }, timeout);
  });
  
  return Promise.race([queryPromise, timeoutPromise]);
};

/**
 * Create an aggregation helper with best practices
 * @param {Object} model - Mongoose model
 * @param {Array} pipeline - MongoDB aggregation pipeline
 * @param {Object} options - Additional options
 * @returns {Promise} - Aggregation results
 */
export const optimizedAggregation = async (model, pipeline, options = {}) => {
  const {
    timeout = 10000,
    allowDiskUse = true,
    batchSize = 1000
  } = options;
  
  const aggregation = model.aggregate(pipeline)
    .allowDiskUse(allowDiskUse)
    .option({ maxTimeMS: timeout })
    .option({ batchSize });
  
  return aggregation.exec();
};

/**
 * Bulk operations helper to optimize multiple database operations
 * @param {Object} model - Mongoose model
 * @param {Array} operations - Array of operations
 * @param {Object} options - Additional options
 * @returns {Promise} - Bulk operation result
 */
export const bulkOps = async (model, operations, options = {}) => {
  const { ordered = false } = options;
  
  if (!operations || operations.length === 0) {
    return { acknowledged: true, modifiedCount: 0 };
  }
  
  return model.bulkWrite(operations, { ordered });
};

// Export all functions
export default {
  paginate,
  selectFields,
  applyLean,
  getPaginatedResults,
  executeWithTimeout,
  optimizedAggregation,
  bulkOps
}; 