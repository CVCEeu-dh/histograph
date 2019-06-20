const { fork } = require('child_process')
const path = require('path')
const fs = require('fs')
const { promisify } = require('util')
const { get } = require('lodash')
const uuidv1 = require('uuid/v1')

const mkdir = promisify(fs.mkdir)
const access = promisify(fs.access)
const readFile = promisify(fs.readFile)
const openFile = promisify(fs.open)

const settings = require('../../../settings')

const ManageModulePath = './scripts/manage'

const LogDir = path.join(get(settings, 'paths.workerLogs', './logs'), 'disambiguation')

async function getLogDir() {
  const exists = await access(LogDir).then(() => true).catch(() => false)
  if (!exists) await mkdir(LogDir)
  return LogDir
}

async function getLogFiles(processId) {
  const logDir = await getLogDir()
  return {
    out: path.join(logDir, `${processId}-out.log`),
    err: path.join(logDir, `${processId}-err.log`),
  }
}

/**
 * Ideally this should be a scalable worker listening on a job
 * queue. But for now we are trying to keep histograph simple.
 * Same as `node scripts/manage.js --task=resource.discoverMany`
 *
 * @returns {string} discovery process GUID
 */
async function startDiscoveryProcess() {
  const processId = uuidv1()
  const logFiles = await getLogFiles(processId)
  const [outFile, errFile] = await Promise.all([logFiles.out, logFiles.err].map(f => openFile(f, 'a')))
  const subprocess = fork(
    ManageModulePath,
    ['--task=resource.discoverMany'],
    {
      detached: true,
      stdio: [
        'ipc',
        outFile,
        errFile
      ]
    }
  )
  subprocess.unref()
  return processId
}

/**
 * Return `stdout` and `stderr` log files content.
 *
 * @param {string} processId discovery process GUID
 * @returns {object} `{ "stdout": "...", "stderr": "..." }`
 */
async function getDiscoveryProcessLogs(processId) {
  const logFiles = await getLogFiles(processId)
  const outLog = await readFile(logFiles.out)
  const errLog = await readFile(logFiles.err)
  return {
    stdout: outLog.toString(),
    stderr: errLog.toString()
  }
}

module.exports = {
  startDiscoveryProcess,
  getDiscoveryProcessLogs
}
