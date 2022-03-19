"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = __importDefault(require("url"));
const config_1 = __importDefault(require("./config"));
class Documentator {
    constructor(fileName, title, url, port, version = '1.0.0', storageLocation) {
        this.xstore = {};
        this.endpoints = [];
        this.shouldDocument = true;
        this.addEndpoint = (res, options = {}) => {
            if (!this.shouldDocument)
                return;
            const request = {
                method: res.request.method.toLowerCase(),
                path: res.res.req.path,
                headers: res.request.header,
                body: res.request._data || null
            };
            const response = {
                status: res.status,
                body: res.body
            };
            const json = JSON.parse(fs.readFileSync(this.pathToTempFile, 'utf8'));
            json.push({
                request,
                response,
                options
            });
            fs.writeFileSync(this.pathToTempFile, JSON.stringify(json));
        };
        this.transformPath = (path, options) => {
            if (options.pathParameters) {
                const pathArray = path
                    .split('/')
                    .slice(1)
                    .map((segment, index) => {
                    const param = options.pathParameters.find((p) => p.index === index);
                    if (param) {
                        return `{${param.name}}`;
                    }
                    return segment;
                });
                return `/${pathArray.join('/')}`;
            }
            return path.split('?').shift();
        };
        this.fileName = fileName;
        this.fileName = fileName;
        this.storageLocation = storageLocation;
        this.pathToTempFile = path_1.default.join(__dirname, './endpoints.json');
        this.masterTemplate = {
            openapi: '3.0.0',
            info: {
                title,
                version
            },
            servers: [
                {
                    url
                },
                {
                    url: `http://localhost:${port}`
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            },
            security: [
                {
                    bearerAuth: []
                }
            ],
            paths: {}
        };
    }
    switchOff() {
        this.shouldDocument = false;
    }
    store(key, value) {
        this.xstore[key] = value;
    }
    getSchema(variable) {
        if (variable == null)
            return {};
        switch (typeof variable) {
            case 'string':
                return { type: 'string' };
            case 'number':
                return { type: 'number' };
            case 'object':
                if (Array.isArray(variable)) {
                    return {
                        type: 'array',
                        items: this.getSchema(variable[0])
                    };
                }
                // eslint-disable-next-line no-case-declarations
                const schema = {
                    type: 'object',
                    properties: {}
                };
                for (const [key, value] of Object.entries(variable)) {
                    schema.properties[key] = this.getSchema(value);
                }
                return schema;
        }
        return 'no schema';
    }
    getPathParameters(options) {
        const params = options.pathParameters || [];
        return params.map((param) => ({
            in: 'path',
            name: param.name,
            description: param.description || '',
            schema: this.getSchema('string'),
            required: true
        }));
    }
    getQueryParameters(path) {
        const { URLSearchParams } = url_1.default;
        const queryParams = new URLSearchParams(path.split('?')[1]);
        return Array.from(queryParams.entries()).map(([key, value]) => ({
            in: 'query',
            name: key,
            schema: this.getSchema(value)
        }));
    }
    getHeaderParameters(headers) {
        return Object.keys(headers)
            .filter((key) => !['User-Agent', 'Content-Type', 'Authorization'].includes(key))
            .map((header) => ({
            in: 'header',
            name: header,
            schema: this.getSchema(headers[header])
        }));
    }
    getPath(req, res, options) {
        return {
            [req.method]: {
                description: options.description || '',
                tags: options.tags || [],
                parameters: [
                    ...this.getHeaderParameters(req.headers),
                    ...this.getPathParameters(options),
                    ...this.getQueryParameters(req.path)
                ],
                ...(req.body
                    ? {
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: this.getSchema(req.body),
                                    example: req.body
                                }
                            }
                        }
                    }
                    : {}),
                responses: {
                    [res.status]: {
                        description: '',
                        content: {
                            'application/json': {
                                schema: this.getSchema(res.body),
                                example: res.body
                            }
                        }
                    }
                }
            }
        };
    }
    retrieveEndpoints() {
        if (!this.shouldDocument)
            return;
        const data = JSON.parse(fs.readFileSync(this.pathToTempFile, 'utf8'));
        // console.log(data)
        this.endpoints = data;
    }
    renderDocumentation() {
        const template = { ...this.masterTemplate };
        this.retrieveEndpoints();
        for (const endpoint of this.endpoints) {
            const { request, response, options } = endpoint;
            const path = this.transformPath(request.path, options);
            template.paths[path] = {
                ...(template.paths[path] || {}),
                ...this.getPath(request, response, options)
            };
        }
        fs.writeFileSync(path_1.default.join(`${this.storageLocation}/${this.fileName}.json`), JSON.stringify(template, undefined, 2), 'utf8');
        return template;
    }
    static start(defn) {
        if (!Documentator.INITIALIZED) {
            Documentator.INITIALIZED = new Documentator(defn.fileName, defn.title, defn.url, (defn.port = 3000), defn.version, defn.storageLocation);
        }
    }
    static getInstance() {
        if (!Documentator.INITIALIZED)
            Documentator.start(config_1.default);
        return Documentator.INITIALIZED;
    }
    static document() {
        if (Documentator.INITIALIZED)
            Documentator.INITIALIZED.renderDocumentation();
    }
}
exports.default = Documentator;
