const { execFileSync } = require('node:child_process')
const { join } = require('node:path')
const upstream = require('./electron-builder.config.cjs')

module.exports = {
  ...upstream,
  appId: 'dev.robbo.orca',
  publish: null,
  async afterPack(context) {
    await upstream.afterPack(context)
    const app = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' })
  },
  mac: {
    ...upstream.mac,
    identity: null,
    notarize: false
  }
}
