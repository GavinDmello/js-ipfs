/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const fs = require('fs')
const path = require('path')
const runOnAndOff = require('../utils/on-and-off')
const defaultConfig = require('../../src/core/runtime/config-nodejs')()

describe('config', () => runOnAndOff((thing) => {
  let ipfs
  let configPath
  let originalConfigPath
  let updatedConfig
  let restoreConfig

  before(() => {
    ipfs = thing.ipfs
    configPath = path.join(ipfs.repoPath, 'config')
    originalConfigPath = path.join(__dirname, '../fixtures/go-ipfs-repo/config')
    updatedConfig = () => JSON.parse(fs.readFileSync(configPath, 'utf8'))
    restoreConfig = () => fs.writeFileSync(configPath, fs.readFileSync(originalConfigPath, 'utf8'), 'utf8')
  })

  describe('get/set', function () {
    this.timeout(40 * 1000)

    it('set a config key with a string value', () => {
      return ipfs('config foo bar').then((out) => {
        expect(updatedConfig().foo).to.equal('bar')
      })
    })

    it('set a config key with true', () => {
      return ipfs('config foo true --bool').then((out) => {
        expect(updatedConfig().foo).to.equal(true)
      })
    })

    it('set a config key with false', () => {
      return ipfs('config foo false --bool').then((out) => {
        expect(updatedConfig().foo).to.equal(false)
      })
    })

    it('set a config key with null', () => {
      return ipfs('config foo null --json').then((out) => {
        expect(updatedConfig().foo).to.equal(null)
      })
    })

    it('set a config key with json', () => {
      return ipfs('config foo {"bar":0} --json').then((out) => {
        expect(updatedConfig().foo).to.deep.equal({ bar: 0 })
      })
    })

    it('set a config key with invalid json', () => {
      return ipfs.fail('config foo {"bar:0} --json')
    })

    it('get a config key value', () => {
      return ipfs('config Identity.PeerID').then((out) => {
        expect(out).to.exist()
      })
    })

    it('call config with no arguments', () => {
      return ipfs('config')
        .then(out => expect(out).to.include('Not enough non-option arguments: got 0, need at least 1'))
    })
  })

  describe('show', function () {
    this.timeout(40 * 1000)

    it('returns the full config', () => {
      return ipfs('config show').then((out) => {
        expect(JSON.parse(out)).to.be.eql(updatedConfig())
      })
    })
  })

  describe.skip('replace', () => {
    it('replace config with file', () => {
      const filePath = 'test/fixtures/test-data/otherconfig'
      const expectedConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'))

      return ipfs(`config replace ${filePath}`).then((out) => {
        expect(updatedConfig()).to.be.eql(expectedConfig)
      })
    })

    after(() => {
      restoreConfig()
    })
  })

  describe('profile', function () {
    this.timeout(40 * 1000)

    beforeEach(() => restoreConfig())
    after(() => restoreConfig())

    it('server / local-discovery', async () => {
      await ipfs('config profile apply server')
      const updated = updatedConfig()
      expect(updated.Discovery.MDNS.Enabled).to.equal(false)
      expect(updated.Discovery.webRTCStar.Enabled).to.equal(false)

      await ipfs('config profile apply local-discovery')
      const reversed = updatedConfig()
      expect(reversed.Discovery.MDNS.Enabled).to.equal(true)
      expect(reversed.Discovery.webRTCStar.Enabled).to.equal(true)
    })

    it('test / default-networking', async () => {
      await ipfs('config profile apply test')
      const updated = updatedConfig()
      expect(updated.Addresses.API).to.equal('/ip4/127.0.0.1/tcp/0')
      expect(updated.Addresses.Gateway).to.equal('/ip4/127.0.0.1/tcp/0')
      expect(updated.Addresses.Swarm).to.eql(['/ip4/127.0.0.1/tcp/0'])
      expect(updated.Bootstrap).to.eql([])
      expect(updated.Discovery.MDNS.Enabled).to.equal(false)
      expect(updated.Discovery.webRTCStar.Enabled).to.equal(false)

      await ipfs('config profile apply default-networking')
      const reversed = updatedConfig()
      expect(reversed.Addresses.API).to.equal(defaultConfig.Addresses.API)
      expect(reversed.Addresses.Gateway).to.equal(defaultConfig.Addresses.Gateway)
      expect(reversed.Addresses.Swarm).to.eql(defaultConfig.Addresses.Swarm)
      expect(reversed.Bootstrap).to.eql(defaultConfig.Bootstrap)
      expect(reversed.Discovery.MDNS.Enabled).to.equal(true)
      expect(reversed.Discovery.webRTCStar.Enabled).to.equal(true)
    })

    it('lowpower / default-power', async () => {
      await ipfs('config profile apply lowpower')
      const updated = updatedConfig()
      expect(updated.Swarm.ConnMgr.LowWater).to.equal(20)
      expect(updated.Swarm.ConnMgr.HighWater).to.equal(40)

      await ipfs('config profile apply default-power')
      const reversed = updatedConfig()
      expect(reversed.Swarm.ConnMgr.LowWater).to.equal(defaultConfig.Swarm.ConnMgr.LowWater)
      expect(reversed.Swarm.ConnMgr.HighWater).to.equal(defaultConfig.Swarm.ConnMgr.HighWater)
    })

    it('--dry-run causes no change', async () => {
      await ipfs('config profile apply --dry-run=true server')
      const after = updatedConfig()
      expect(after.Discovery.MDNS.Enabled).to.equal(defaultConfig.Discovery.MDNS.Enabled)

      await ipfs('config profile apply --dry-run=false server')
      const updated = updatedConfig()
      expect(updated.Discovery.MDNS.Enabled).to.equal(false)
    })

    it('Private key does not appear in output', async () => {
      const out = await ipfs('config profile apply server')
      expect(out).not.includes('PrivKey')
    })
  })
}))
