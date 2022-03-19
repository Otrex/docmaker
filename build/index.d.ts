import { DocumentorInitObject } from './index.d';
export default class Documentator {
    fileName: string;
    xstore: Record<string, any>;
    private static INITIALIZED;
    masterTemplate: Record<string, any>;
    private endpoints;
    storageLocation: string;
    private pathToTempFile;
    private shouldDocument;
    constructor(fileName: string, title: string, url: string, port: number, version: string | undefined, storageLocation: string);
    switchOff(): void;
    store(key: string, value: any): void;
    getSchema(variable: any): any;
    getPathParameters(options: Record<string, any>): any;
    getQueryParameters(path: string): {
        in: string;
        name: string;
        schema: any;
    }[];
    getHeaderParameters(headers: Record<string, any>): {
        in: string;
        name: string;
        schema: any;
    }[];
    getPath(req: any, res: any, options: any): {
        [x: number]: {
            responses: {
                [x: number]: {
                    description: string;
                    content: {
                        'application/json': {
                            schema: any;
                            example: any;
                        };
                    };
                };
            };
            requestBody?: {
                content: {
                    'application/json': {
                        schema: any;
                        example: any;
                    };
                };
            } | undefined;
            description: any;
            tags: any;
            parameters: any[];
        };
    };
    addEndpoint: (res: any, options?: any) => void;
    transformPath: (path: string, options: any) => string | undefined;
    retrieveEndpoints(): void;
    renderDocumentation(): {
        [x: string]: any;
    };
    static start(defn: DocumentorInitObject): void;
    static getInstance(): Documentator | undefined;
    static document(): void;
}
