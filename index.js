const Feed = require('rss-to-json')
const util = require('util')
const fs = require('fs')
const stripchar = require('stripchar').StripChar
const jsonfile = require('jsonfile')

const stat = util.promisify(fs.stat)
const readFile = util.promisify(jsonfile.readFile)
const thresholdBeforeSendingCacheMinutes = 5

module.exports = async (endpoint = '/', callback) => {
  if (endpoint.charAt(0) !== '/') {
    endpoint = '/' + endpoint
  }

  const url = `https://medium.com${endpoint}`
  const fileCacheName = stripchar.RSExceptUnsAlpNum(url)
  const fileCacheLocation = `./${fileCacheName}.cache`

  try {
    const fileCacheExists = await new Promise(resolve => {
      fs.access(fileCacheLocation, fs.F_OK, (err) => {
        if (err) {
          return resolve(false)
        }
        resolve(true)
      })
    })

    if (fileCacheExists) {
      const stats = await stat(fileCacheLocation)
      const lastUpdate = new Date(stats.mtime)
      const currentDate = new Date()
      const diffTime = Math.abs(currentDate.getTime() - lastUpdate.getTime())
      const diffTimeInMinutes = Math.ceil(diffTime / (1000 * 60))

      if (diffTimeInMinutes <= thresholdBeforeSendingCacheMinutes) {
        const cacheResponse = await readFile(fileCacheLocation)
        console.log(`LAST SAME QUERY (${diffTimeInMinutes}m) SO SENDING CACHE`)
        callback instanceof Function && callback({status: 200, response: cacheResponse})
        return
      }
    }

    const rssToJsonResponse = await new Promise(resolve => Feed.load(url, (err, rss) => resolve(rss), (rawObject) => {
      return {
        ...(rawObject['content:encoded'] && {
          contentEncoded: rawObject['content:encoded'][0]
        })
      }
    }))

    jsonfile.writeFile(fileCacheLocation, rssToJsonResponse, err => err ? console.error(err) : console.log('Saved', fileCacheLocation))

    callback instanceof Function && callback({status: 200, response: rssToJsonResponse})
  } catch (err) {
    callback instanceof Function && callback({status: err.statusCode || 500, response: {err}})
  }
}
