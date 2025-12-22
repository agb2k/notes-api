#!/usr/bin/env node

/**
 * Extracts TSOA model schemas from routes.ts and adds them to swagger.json
 * 
 * This is a workaround for TSOA's limitation: it generates $ref references
 * but doesn't populate components.schemas. This script extracts the model
 * definitions from TSOA's generated routes.ts and converts them to OpenAPI format.
 */

const fs = require('fs');
const path = require('path');

const ROUTES_FILE = path.join(__dirname, '..', 'src', 'routes', 'generated', 'routes.ts');
const SWAGGER_FILE = path.join(__dirname, '..', 'src', 'config', 'swagger.json');

// Type mapping from TSOA to OpenAPI
const TYPE_MAP = {
    string: { type: 'string' },
    double: { type: 'number', format: 'double' },
    float: { type: 'number', format: 'float' },
    integer: { type: 'integer' },
    boolean: { type: 'boolean' },
    datetime: { type: 'string', format: 'date-time' },
    date: { type: 'string', format: 'date' },
    any: {}
};

/**
 * Converts a TSOA property to OpenAPI schema
 */
function convertProperty(prop, models) {
    // Arrays
    if (prop.dataType === 'array' && prop.array) {
        return { type: 'array', items: convertProperty(prop.array, models) };
    }

    // References
    if (prop.ref) {
        return { $ref: `#/components/schemas/${prop.ref}` };
    }

    // Unions (nullable, enums)
    if (prop.dataType === 'union' && prop.subSchemas) {
        const enums = [];
        let nullable = false;
        let ref = null;

        for (const sub of prop.subSchemas) {
            if (sub.dataType === 'enum' && sub.enums) {
                enums.push(...sub.enums.filter(e => e !== null));
                if (sub.enums.includes(null)) nullable = true;
            } else if (sub.ref) {
                ref = sub.ref;
            }
        }

        if (ref) {
            return nullable ? { $ref: `#/components/schemas/${ref}`, nullable: true } : { $ref: `#/components/schemas/${ref}` };
        }
        if (enums.length > 0) {
            return nullable ? { type: 'string', enum: enums, nullable: true } : { type: 'string', enum: enums };
        }
    }

    // Nested objects
    if (prop.dataType === 'nestedObjectLiteral' && prop.nestedProperties) {
        return convertObject(prop.nestedProperties, prop.required);
    }

    // Direct type mapping
    if (TYPE_MAP[prop.dataType]) {
        return TYPE_MAP[prop.dataType];
    }

    return {};
}

/**
 * Converts a TSOA object to OpenAPI schema
 */
function convertObject(properties, requiredFields) {
    const schema = { type: 'object', properties: {} };
    const required = [];

    for (const [key, prop] of Object.entries(properties)) {
        schema.properties[key] = convertProperty(prop, null);
        if (prop.required) required.push(key);
    }

    if (required.length > 0) schema.required = required;
    return schema;
}

/**
 * Converts a TSOA model to OpenAPI schema
 */
function convertModel(model, models) {
    // Enum/union types
    if (model.dataType === 'refAlias' && model.type?.dataType === 'union') {
        const enums = [];
        let nullable = false;
        for (const sub of model.type.subSchemas || []) {
            if (sub.dataType === 'enum' && sub.enums) {
                enums.push(...sub.enums.filter(e => e !== null));
                if (sub.enums.includes(null)) nullable = true;
            } else if (sub.ref) {
                return { $ref: `#/components/schemas/${sub.ref}` };
            }
        }
        if (enums.length > 0) {
            return nullable ? { type: 'string', enum: enums, nullable: true } : { type: 'string', enum: enums };
        }
        return { type: 'string' };
    }

    // Objects
    if (model.dataType === 'refObject' || model.dataType === 'object' || model.dataType === 'nestedObjectLiteral') {
        return convertObject(model.properties || model.nestedProperties || {}, model.required);
    }

    // Primitives
    return TYPE_MAP[model.dataType] || {};
}

// Main execution
try {
    // Read and extract models from routes.ts
    const routesContent = fs.readFileSync(ROUTES_FILE, 'utf8');
    const modelsMatch = routesContent.match(/const models:\s*TsoaRoute\.Models\s*=\s*({[\s\S]*?});/);
    
    if (!modelsMatch) {
        console.error('ERROR: Could not find models in routes.ts. Run "tsoa routes" first.');
        process.exit(1);
    }

    const models = eval(`(${modelsMatch[1]})`); // Safe: TSOA-generated code

    // Read swagger.json
    const swagger = JSON.parse(fs.readFileSync(SWAGGER_FILE, 'utf8'));
    if (!swagger.components) swagger.components = {};
    if (!swagger.components.schemas) swagger.components.schemas = {};

    // Convert and add all models
    let count = 0;
    for (const [name, model] of Object.entries(models)) {
        try {
            swagger.components.schemas[name] = convertModel(model, models);
            count++;
        } catch (err) {
            console.warn(`WARNING: Failed to convert ${name}:`, err.message);
        }
    }

    // Write updated swagger.json
    fs.writeFileSync(SWAGGER_FILE, JSON.stringify(swagger, null, '\t'));
    console.log(`Extracted ${count} schemas from TSOA models`);

} catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
}

