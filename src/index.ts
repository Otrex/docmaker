import * as fs from 'fs'
import xpath from 'path'
import URL from 'url'
import { DocumentorInitObject } from './index.d'
import definition from './config'

export default class Documentator {
  public fileName: string;
  public xstore: Record<string, any> = {};
  private static INITIALIZED: Documentator | undefined;
  public masterTemplate: Record<string, any>;
  private endpoints: Record<string, any>[] = [];
  public storageLocation: string;
  private pathToTempFile: string;
  private shouldDocument = true;

  constructor (
    fileName: string,
    title: string,
    url: string,
    port: number,
    version = '1.0.0',
    storageLocation: string
  ) {
    this.fileName = fileName
    this.fileName = fileName
    this.storageLocation = storageLocation
    this.pathToTempFile = xpath.join(__dirname, './endpoints.json')
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
    }
  }

  switchOff (): void {
    this.shouldDocument = false
  }

  store (key: string, value: any) {
    this.xstore[key] = value
  }

  getSchema (variable: any): any {
    if (variable == null) return {}
    switch (typeof variable) {
      case 'string':
        return { type: 'string' }
      case 'number':
        return { type: 'number' }
      case 'object':
        if (Array.isArray(variable)) {
          return {
            type: 'array',
            items: this.getSchema(variable[0])
          }
        }
        // eslint-disable-next-line no-case-declarations
        const schema: { type: string; properties: Record<string, any> } = {
          type: 'object',
          properties: {}
        }
        for (const [key, value] of Object.entries(variable)) {
          schema.properties[key] = this.getSchema(value)
        }
        return schema
    }
    return 'no schema'
  }

  getPathParameters (options: Record<string, any>) {
    const params = options.pathParameters || []
    return params.map((param: any) => ({
      in: 'path',
      name: param.name,
      description: param.description || '',
      schema: this.getSchema('string'),
      required: true
    }))
  }

  getQueryParameters (path: string) {
    const { URLSearchParams } = URL
    const queryParams = new URLSearchParams(path.split('?')[1])
    return Array.from(queryParams.entries()).map(([key, value]) => ({
      in: 'query',
      name: key,
      schema: this.getSchema(value)
    }))
  }

  getHeaderParameters (headers: Record<string, any>) {
    return Object.keys(headers)
      .filter((key: any) => !['User-Agent', 'Content-Type', 'Authorization'].includes(key))
      .map((header) => ({
        in: 'header',
        name: header,
        schema: this.getSchema(headers[header])
      }))
  }

  getPath (req: any, res: any, options: any) {
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
    }
  }

  addEndpoint = (res: any, options: any = {}) => {
    if (!this.shouldDocument) return
    const request = {
      method: res.request.method.toLowerCase(),
      path: res.res.req.path,
      headers: res.request.header,
      body: res.request._data || null
    }
    const response = {
      status: res.status,
      body: res.body
    }

    const json = JSON.parse(fs.readFileSync(this.pathToTempFile, 'utf8'))
    json.push({
      request,
      response,
      options
    })
    fs.writeFileSync(this.pathToTempFile, JSON.stringify(json))
  };

  transformPath = (path: string, options: any) => {
    if (options.pathParameters) {
      const pathArray = path
        .split('/')
        .slice(1)
        .map((segment, index) => {
          const param = options.pathParameters.find((p: any) => p.index === index)
          if (param) {
            return `{${param.name}}`
          }
          return segment
        })
      return `/${pathArray.join('/')}`
    }
    return path.split('?').shift()
  };

  retrieveEndpoints () {
    if (!this.shouldDocument) return
    const data: Record<string, any>[] = JSON.parse(fs.readFileSync(this.pathToTempFile, 'utf8'))
    // console.log(data)
    this.endpoints = data
  }

  renderDocumentation () {
    const template = { ...this.masterTemplate }
    this.retrieveEndpoints()
    for (const endpoint of this.endpoints) {
      const { request, response, options } = endpoint
      const path = <string> this.transformPath(request.path, options)
      template.paths[path] = {
        ...(template.paths[path] || {}),
        ...this.getPath(request, response, options)
      }
    }

    fs.writeFileSync(
      xpath.join(`${this.storageLocation}/${this.fileName}.json`),
      JSON.stringify(template, undefined, 2),
      'utf8'
    )
    return template
  }

  static start (defn: DocumentorInitObject) {
    if (!Documentator.INITIALIZED) {
      Documentator.INITIALIZED = new Documentator(
        defn.fileName,
        defn.title,
        defn.url,
        (defn.port = 3000),
        defn.version,
        defn.storageLocation
      )
    }
  }

  static getInstance () {
    if (!Documentator.INITIALIZED) Documentator.start(definition!)
    return Documentator.INITIALIZED
  }

  static document () {
    if (Documentator.INITIALIZED) Documentator.INITIALIZED.renderDocumentation()
  }
}
