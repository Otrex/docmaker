import fs from 'fs'
import path from 'path'

const takeSecond = (variable: string) => variable.split('=')[1]

const args = process.argv

const appname = args.find((data) => data.includes('--appname='))

const dir = args.find((data) => data.includes('--dir='))

const version = args.find((data) => data.includes('--v='))

const url = args.find((data) => data.includes('--url='))

const store = dir ? takeSecond(dir) : (process.env.DIR ? process.env.DIR : __dirname)

const data = `import { DocumentorInitObject } from './index.d'

const definition: DocumentorInitObject = {
  fileName: 'api-${version ? takeSecond(version) : '1.0'}',
  title: '${appname ? takeSecond(appname) : 'default'}',
  url: '${url ? takeSecond(url) : 'http://localhost'}',
  port: ${process.env.PORT || '3000'},
  storageLocation: '${store}'
}

export default definition
`
if (!fs.existsSync(`${store}/../documentation`)) {
  fs.mkdirSync(`${store}/../documentation`)
}

fs.writeFileSync(path.join(__dirname, './config.ts'), data)
fs.writeFileSync(path.join(__dirname, './config.js'), data)

console.log('docmaker configured..')
