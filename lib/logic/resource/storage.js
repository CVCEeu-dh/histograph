const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { get } = require('lodash')

const settings = require('../../../settings')

const { txt: txtPath, media: mediaPath } = get(settings, 'paths', {})

const writeFile = promisify(fs.writeFile)

const isBinaryType = mimeType => !mimeType.startsWith('text/')

function contentAsBytes(content, mimeType) {
  return isBinaryType(mimeType)
    ? Buffer.from(content, 'base64')
    : Buffer.from(content, 'utf-8')
}

async function saveContent(fileName, content, mimeType) {
  const encoding = isBinaryType(mimeType) ? 'binary' : 'utf-8'
  const filePrefix = isBinaryType(mimeType) ? mediaPath : txtPath
  const filePath = path.join(filePrefix, fileName)

  return writeFile(filePath, contentAsBytes(content, mimeType), { encoding })
}

module.exports = {
  saveContent
}
