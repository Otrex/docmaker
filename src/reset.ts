import fs from 'fs'
import path from 'path'

const filePath = path.join(__dirname, 'endpoints.json')
try {
  fs.unlinkSync(filePath)
} catch (err) {
  console.log('file does not exists')
}

fs.writeFileSync(filePath, '[]')
console.log('Unlinked...')
