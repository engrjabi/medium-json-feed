const Feed = require('rss-to-json')

module.exports = async (endpoint = '/', callback) => {
  if (endpoint.charAt(0) !== '/') {
    endpoint = '/' + endpoint
  }

  const url = `https://medium.com${endpoint}`

  const rssToJsonResponse = await new Promise(resolve => Feed.load(url, (err, rss) => resolve(rss), (rawObject) => {
    return {
      ...(rawObject['content:encoded'] && {
        contentEncoded: rawObject['content:encoded'][0]
      })
    }
  }))

  const result = {status: 200, response: rssToJsonResponse}
  callback instanceof Function && callback(result)
}
