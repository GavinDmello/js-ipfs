'use strict'
// var dns = require('../../../core/components/dns')

module.exports = {
  command: 'connect <address>',

  describe: 'Open connection to a given address',

  builder: {
    recursive: {
      type: 'boolean',
      default: true,
      alias: 'r',
      desc: 'Resolve until the result is not a DNS link'
    },
    format: {
      type: 'string'
    }
  },

  handler (argv) {
    argv.resolve((async () => {
      if (!argv.isDaemonOn()) {
        throw new Error('This command must be run in online mode. Try running \'ipfs daemon\' first.')
      }

      const ipfs = await argv.getIpfs()
      let path = ''
      
      if (argv.address.indexOf('dnsaddr') > -1) {
        try {
          path = await ipfs.dns(argv.address)
        } catch(e) {
          throw new Error(e)
        }
      } else {
        path = argv.address
      }

      const res = await ipfs.swarm.connect(path)
      argv.print(res.Strings[0])
    })())
  }
}
