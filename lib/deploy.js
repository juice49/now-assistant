const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const git = require('simple-git/promise')
const got = require('got')
const shaFile = require('sha1-sum')
const mkdir = require('make-dir')
const del = require('del')
const delay = require('delay')

const ENDPOINT_DEPLOY = 'https://api.zeit.co/v3/now/deployments'
const ENDPOINT_UPLOAD = 'https://api.zeit.co/v2/now/files'
const STATUS_READY = 'READY'

module.exports = ({
  token,
  remote,
  alias,
  deploymentType,
  onBegin = () => {},
  postClone = () => {},
  preSync = () => {},
  postSync = () => {},
  postSyncError = () => {},
  postDeploy = () => {},
  postDeployError = () => {},
  postReady = () => {},
  postAlias = () => {}
}) => async () => {
  const tmp = path.join(os.tmpdir(), `${(new Date()).getTime()}`)

  const clean = () => del(tmp, {
    force: true
  })

  onBegin()

  await mkdir(tmp)
  await git().clone(remote, tmp)

  postClone()

  // Read files from git.
  const res = await git(tmp).raw([ 'ls-files' ])
  let files = res.trim().split(os.EOL)
  let deployRes

  // Get the size and sha of each file.
  files = await Promise.all(files.map(async file => {
    const { size } = await fs.stat(path.join(tmp, file))
    const sha = await shaFile(path.join(tmp, file))

    return {
      file,
      sha,
      size
    }
  }))

  preSync()

  try {
    // Attempt to deploy before uploading any files. This will probably fail due
    // to missing files. In the response, Now will tell us which files are missing.
    const res = await deploy({ files, token, deploymentType })
    deployRes = res.body
  } catch (error) {
    const { error: nowError } = error.response.body

    if (typeof nowError.missing === 'undefined') {
      postDeployError()
      await clean()
      return
    }

    const uploadFiles = files.filter(file =>
      nowError.missing.includes(file.sha))

    try {
      await upload(uploadFiles, {
        sourcePath: tmp,
        token
      })

      postSync()
    } catch (error) {
      postSyncError()
      return
    }

    try {
      const res = await deploy({ files, token, deploymentType })
      deployRes = res.body
    } catch (error) {
      postDeployError()
      await clean()
      return
    }
  }

  postDeploy(deployRes)

  await ready(deployRes.deploymentId)

  postReady(deployRes)

  if (alias) {
    await setAlias(deployRes.deploymentId, process.env.ALIAS, {
      token
    })
  }

  postAlias(deployRes, process.env.ALIAS)

  await clean()

  return deployRes
}

function deploy ({ files, token, deploymentType }) {
  return got.post(ENDPOINT_DEPLOY, {
    json: true,
    headers: {
      Authorization: `Bearer: ${token}`
    },
    body: {
      name: 'test',
      public: true,
      deploymentType,
      files
    }
  })
}

function upload (file, { sourcePath, token }) {
  if (Array.isArray(file)) {
    return Promise.all(file.map(file => upload(file, { sourcePath, token })))
  }

  const filePath = path.join(sourcePath, file.file)

  const uploader = got.stream.post(ENDPOINT_UPLOAD, {
    headers: {
      Authorization: `Bearer: ${token}`,
      'Content-Type': 'application/octet-stream',
      'x-now-digest': file.sha,
      'x-now-size': file.size
    }
  })

  return new Promise((resolve, reject) => {
    uploader.on('response', resolve)

    fs.createReadStream(filePath)
      .pipe(uploader)
  })
}

function setAlias (id, alias, { token }) {
  return got.post(`${ENDPOINT_DEPLOY}/${id}/aliases`, {
    json: true,
    headers: {
      Authorization: `Bearer: ${token}`
    },
    body: {
      alias
    }
  })
}

async function ready (id) {
  for await (status of pollStatus(id, STATUS_READY, 100, 1500)) {
    if (status === STATUS_READY) {
      return true
    }
  }

  return false
}

async function * pollStatus (
  id,
  targetState = STATUS_READY,
  limit = Infinity,
  minInterval = 0
) {
  if (limit === 0) {
    throw new Error('Poll limit reached.')
  }

  try {
    const deploy = await got.get(`${ENDPOINT_DEPLOY}/${id}`, {
      headers: {
        Authorization: `Bearer: ${process.env.NOW_TOKEN}`
      },
      json: true
    })

    yield deploy.body.state

    if (deploy.body.state === targetState) {
      return
    }
  } catch (error) {
    throw new Error(error.response.body)
  }

  await delay(minInterval)
  yield * pollStatus(id, targetState, limit - 1, minInterval)
}
