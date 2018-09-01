require('dotenv').config()

const micro = require('micro')
const { router, get } = require('microrouter')
const log = require('./lib/log')
const PORT = process.env.PORT || 3000

if (!process.env.NOW_TOKEN) {
  throw new Error(`NOW_TOKEN is required.`)
}

if (!process.env.GIT_REMOTE) {
  throw new Error(`GIT_REMOTE is required.`)
}

if (!process.env.DEPLOYMENT_TYPE) {
  throw new Error(`DEPLOYMENT_TYPE is required.`)
}

const deploy = require('./lib/deploy')({
  token: process.env.NOW_TOKEN,
  remote: process.env.GIT_REMOTE,
  alias: process.env.ALIAS,
  deploymentType: process.env.DEPLOYMENT_TYPE,
  onBegin () {
    log('Clone repo')
  },
  postClone () {
    log('Cloned repo')
  },
  preSync () {
    log('Sync files')
  },
  postSync () {
    log('Sync complete')
  },
  postSyncError () {
    log('Error syncing')
  },
  postDeploy () {
    log('Initializing')
  },
  postDeployError () {
    log('Error deploying')
  },
  postReady (deployment) {
    log('Ready!', `https://${deployment.url}`)
  },
  postAlias (deployment, alias) {
    log('Aliased deployment', deployment.deploymentId, alias)
  }
})

const createServer = module.exports = routes =>
  micro(router(routes))

const server = createServer(
  get('/deploy', deploy)
)

;(async () => {
  if (module.parent) {
    return
  }

  await server.listen(PORT)
  log('Server listening on port', PORT)
})()
