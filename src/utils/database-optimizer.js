import { Op } from 'sequelize';
import { performance } from 'perf_hooks';
import BasicMemoryError from '../errors/base-error.js';

/**
 * Advanced database query optimization utility
 */
export class DatabaseOptimizer {
    /**
     * Batch database operations with advanced concurrency control
     * @param {Array} items - Items to process
     * @param {Function} processFn - Function to process each batch
     * @param {Object} [options={}] - Batch processing options
     * @returns {Promise<Array>} Processing results
     */
    static async batchProcess(items, processFn, options = {}) {
        const {
            batchSize = 100,
            concurrency = 5,
            retryAttempts = 3,
            timeout = 30000 // 30 seconds
        } = options;

        const results = [];
        const startTime = performance.now();

        // Validate inputs
        if (!Array.isArray(items)) {
            throw new BasicMemoryError('Invalid input: items must be an array', {
                code: BasicMemoryError.ErrorCodes.INVALID_PARAMS
            });
        }

        // Process items in batches with advanced error handling
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            try {
                const batchResults = await Promise.all(
                    batch.map(async (item) => {
                        let lastError = null;
                        for (let attempt = 0; attempt < retryAttempts; attempt++) {
                            try {
                                const timeoutPromise = new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error('Operation timed out')), timeout)
                                );
                                
                                const processPromise = processFn(item);
                                return await Promise.race([processPromise, timeoutPromise]);
                            } catch (error) {
                                lastError = error;
                                if (attempt === retryAttempts - 1) {
                                    throw lastError;
                                }
                                // Exponential backoff
                                await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
                            }
                        }
                    })
                );

                results.push(...batchResults);
            } catch (batchError) {
                // Log and potentially handle batch processing errors
                console.error(`Batch processing error at index ${i}:`, batchError);
                throw new BasicMemoryError('Batch processing failed', {
                    code: BasicMemoryError.ErrorCodes.INTERNAL_ERROR,
                    metadata: { 
                        batchIndex: i, 
                        originalError: batchError.message 
                    }
                });
            }
        }

        const endTime = performance.now();
        return {
            results,
            metadata: {
                totalProcessed: items.length,
                processingTime: endTime - startTime
            }
        };
    }

    /**
     * Create an efficient search query with advanced filtering and optimization
     * @param {Object} model - Sequelize model
     * @param {Object} searchParams - Search parameters
     * @param {Object} [options={}] - Query options
     * @returns {Promise<Object>} Search results with metadata
     */
    static async efficientSearch(model, searchParams, options = {}) {
        const {
            includeRelations = [],
            maxResults = 1000,
            offset = 0,
            orderBy = 'createdAt',
            orderDirection = 'DESC',
            fuzzySearch = false,
            cacheResults = true
        } = options;

        // Validate inputs
        if (!model || typeof model.findAndCountAll !== 'function') {
            throw new BasicMemoryError('Invalid model provided', {
                code: BasicMemoryError.ErrorCodes.INVALID_PARAMS
            });
        }

        // Prepare where clause with advanced filtering
        const whereClause = Object.entries(searchParams).reduce((acc, [key, value]) => {
            if (value === null || value === undefined) return acc;

            if (fuzzySearch && typeof value === 'string') {
                // Fuzzy search for string fields
                acc[key] = { [Op.iLike]: `%${value}%` };
            } else if (Array.isArray(value)) {
                // Support multiple value matching
                acc[key] = { [Op.in]: value };
            } else {
                acc[key] = value;
            }

            return acc;
        }, {});

        const startTime = performance.now();

        try {
            // Perform efficient search with count
            const { count, rows } = await model.findAndCountAll({
                where: whereClause,
                include: includeRelations,
                limit: maxResults,
                offset,
                order: [[orderBy, orderDirection]],
                // Optional caching
                ...(cacheResults ? { cache: true } : {})
            });

            const endTime = performance.now();

            return {
                results: rows,
                metadata: {
                    totalCount: count,
                    returnedCount: rows.length,
                    processingTime: endTime - startTime,
                    offset,
                    limit: maxResults
                }
            };
        } catch (error) {
            throw new BasicMemoryError('Search query failed', {
                code: BasicMemoryError.ErrorCodes.INTERNAL_ERROR,
                metadata: { 
                    searchParams, 
                    originalError: error.message 
                }
            });
        }
    }

    /**
     * Perform advanced data aggregation
     * @param {Object} model - Sequelize model
     * @param {Object} aggregationParams - Aggregation parameters
     * @returns {Promise<Object>} Aggregation results
     */
    static async aggregate(model, aggregationParams) {
        const {
            groupBy = [],
            aggregations = [],
            filters = {}
        } = aggregationParams;

        try {
            const results = await model.findAll({
                attributes: [
                    ...groupBy,
                    ...aggregations.map(agg => [
                        model.sequelize.fn(agg.type, model.sequelize.col(agg.field)),
                        agg.alias
                    ])
                ],
                where: filters,
                group: groupBy,
                raw: true
            });

            return {
                results,
                metadata: {
                    aggregationParams,
                    resultCount: results.length
                }
            };
        } catch (error) {
            throw new BasicMemoryError('Aggregation query failed', {
                code: BasicMemoryError.ErrorCodes.INTERNAL_ERROR,
                metadata: { 
                    aggregationParams, 
                    originalError: error.message 
                }
            });
        }
    }

    /**
     * Prepare dynamic where clause for complex queries
     * @param {Object} searchParams - Search parameters
     * @returns {Object} Sequelize where clause
     * @private
     */
    static _prepareWhereClause(searchParams) {
        const whereClause = {};

        for (const [key, value] of Object.entries(searchParams)) {
            if (value === null || value === undefined) continue;

            if (typeof value === 'object' && !Array.isArray(value)) {
                // Handle complex conditions
                const conditions = {};
                for (const [op, val] of Object.entries(value)) {
                    switch (op) {
                        case 'gt': conditions[Op.gt] = val; break;
                        case 'lt': conditions[Op.lt] = val; break;
                        case 'gte': conditions[Op.gte] = val; break;
                        case 'lte': conditions[Op.lte] = val; break;
                        case 'like': conditions[Op.like] = `%${val}%`; break;
                        case 'in': conditions[Op.in] = val; break;
                    }
                }
                whereClause[key] = conditions;
            } else if (Array.isArray(value)) {
                // Handle array values
                whereClause[key] = { [Op.in]: value };
            } else {
                // Simple equality
                whereClause[key] = value;
            }
        }

        return whereClause;
    }

    /**
     * Create database indexes for performance
     * @param {Object} model - Sequelize model
     * @param {Array} indexFields - Fields to index
     */
    static createIndexes(model, indexFields) {
        indexFields.forEach(field => {
            model.addIndex({
                fields: [field],
                name: `${model.name}_${field}_index`
            });
        });
    }

    /**
     * Optimize large dataset retrieval
     * @param {Object} model - Sequelize model
     * @param {Object} [options={}] - Retrieval options
     * @returns {Object} Cursor-based pagination result
     */
    static async cursorPagination(model, options = {}) {
        const {
            limit = 100,
            cursor = null,
            orderBy = 'id'
        } = options;

        const query = {
            limit,
            order: [[orderBy, 'ASC']]
        };

        // Add cursor condition if provided
        if (cursor) {
            query.where = {
                [orderBy]: {
                    [Op.gt]: cursor
                }
            };
        }

        const results = await model.findAll(query);

        // Prepare next cursor
        const nextCursor = results.length > 0 
            ? results[results.length - 1][orderBy]
            : null;

        return {
            results,
            nextCursor,
            hasMore: results.length === limit
        };
    }
}

export default DatabaseOptimizer;
