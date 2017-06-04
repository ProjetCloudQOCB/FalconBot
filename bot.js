const Discord = require('discord.js')
const config = require('./config.js')
const client = new Discord.Client()
var https = require('https')
var http = require('http')

client.on('ready', () => {
  console.log(`Logged in as ${client.user.username}!`)
})

/*
* Evenement déclenché lors de l'envoi d'un message.
*
* Les appels aux différentes API se font à l'aide de requêtes HTTP(S) par la fonction callAPI (cf. callAPI()).
*
* Pour connaître la liste des commandes disponibles : !help
*/
client.on('message', msg => {
  // Check if the message has been posted in a channel where the bot operates
  // and that the author is not the bot itself
  if (msg.channel.type !== 'dm' && (config.channel !== msg.channel.id || msg.author.id === client.user.id)) {
  } else if (msg.content.charAt(0) === '!') {
    if (msg.content === '!help') {
      msg.channel.send(
        '\nCommandes disponibles :\n\n\n' +
        '\tyoutube:NOM_VIDEO : Effectuer une recherche sur Youtube (Chaîne, vidéo, live ou playlist).\n\n' +
        '\tweather:NOM_VILLE : Obtenir les informations météorologiques d\'une ville.\n\n' +
        '\ttranslate:PHRASE : Traduire un mot / une phrase de n\'importe quelle langue en anglais.'
      )
    } else {
      var request = String(msg.content)
      var a = request.split(' ')
      var api = a.shift().split('!').pop()
      var message = a.slice(0, a.length).toString().replace(/,/gm, ' ')
      var promise
      if (api === 'youtube') {
        message = message.replace(/ /gm, '+')
        var maxResults = 3
        promise = callAPI(https, 'www.googleapis.com', '/youtube/v3/search?part=snippet&q=' + message + '&maxResults=' + maxResults + '&key=AIzaSyD-IvwfvuUSnIkt9Ahq1uQ0sD73o-rV4rQ')
        promise.then(function (data) {
          // console.log(JSON.stringify(data))
          var totalResults = data.pageInfo.totalResults
          if (totalResults === 0) {
            msg.channel.send('Navré ' + msg.author + ', votre recherche Youtube "' + message + '" n\'a donné aucun résultat')
          } else {
            for (var i = 0; i < maxResults; i++) {
              var result = data.items[i]
              var kind = result.id.kind.split('#').pop()
              if (kind === 'video') { // Gère également les lives : un live Youtube possède également le type "video".
                var videoId = result.id.videoId
                var promiseVideo = callAPI(https, 'www.googleapis.com', '/youtube/v3/videos?id=' + videoId + '&part=snippet,contentDetails,statistics&key=AIzaSyD-IvwfvuUSnIkt9Ahq1uQ0sD73o-rV4rQ')
                promiseVideo.then(function (data) {
                  var channel = data.items[0].snippet.channelTitle
                  var title = data.items[0].snippet.title
                  var live = data.items[0].snippet.liveBroadcastContent
                  var views = data.items[0].statistics.viewCount
                  if (live === 'live') {
                    msg.channel.send('Live : \n\tChaîne : ' + channel + '\n\tTitre : ' + title + '\n\tVues totales : ' + views)
                  } else {
                    var d = data.items[0].contentDetails.duration.split('PT').pop()
                    var h
                    var m
                    var duration = ''
                    if (d.split('H').length === 1) {
                      h = null
                    } else {
                      h = d.split('H').shift()
                    }
                    if (d.split('H').pop().split('M').length === 1) {
                      m = '0'
                    } else {
                      m = d.split('H').pop().split('M').shift()
                    }
                    var s = d.split('H').pop().split('M').pop().split('S').shift()
                    h = (h != null && h.length === 1) ? '0' + h : h
                    m = (m !== '0' && m.length === 1) ? '0' + m : m
                    s = (s.length === 1) ? '0' + s : s
                    duration += (h != null) ? h + ':' : ''
                    duration += (m != null) ? m + ':' : ''
                    duration += s
                    msg.channel.send('Video : \n\tChaîne : ' + channel + '\n\tTitre : ' + title + '\n\tDurée : ' + duration + '\n\tVues : ' + views)
                  }
                })
              } else if (kind === 'channel') {
                var channelId = result.id.channelId
                var promiseChannel = callAPI(https, 'www.googleapis.com', '/youtube/v3/channels?id=' + channelId + '&part=snippet,statistics&key=AIzaSyD-IvwfvuUSnIkt9Ahq1uQ0sD73o-rV4rQ')
                promiseChannel.then(function (data) {
                  var nom = data.items[0].snippet.title
                  var videos = data.items[0].statistics.videoCount
                  var subscribers = data.items[0].statistics.subscriberCount
                  msg.channel.send('Chaîne : \n\tNom : ' + nom + '\n\tNombre de vidéos : ' + videos + '\n\tNombre d\'abonnés : ' + subscribers)
                })
              } else if (kind === 'playlist') {
                var playlistId = result.id.playlistId
                var promisePlaylist = callAPI(https, 'www.googleapis.com', '/youtube/v3/playlists?id=' + playlistId + '&part=snippet,contentDetails&key=AIzaSyD-IvwfvuUSnIkt9Ahq1uQ0sD73o-rV4rQ')
                promisePlaylist.then(function (data) {
                  var title = data.items[0].snippet.title
                  var channel = data.items[0].snippet.channelTitle
                  var videos = data.items[0].contentDetails.itemCount
                  msg.channel.send('Playlist : \n\tChaîne : ' + channel + '\n\tTitre : ' + title + '\n\tNombre de vidéos : ' + videos)
                })
              }
            }
          }
        })
      } else if (api === 'weather') {
        message = message.replace(/ /gm, '-') // La recherche fonctionne toujours avec un "-" dans un nom de ville, contrairement aux " " dans certains cas.
        promise = callAPI(http, 'api.openweathermap.org', '/data/2.5/weather?q=' + message + '&APPID=46c100d5c1bbf6cbd87bb684098e7d32')
        promise.then(function (data) {
          if (data.message === 'city not found') {
            msg.channel.send('Navré ' + msg.author + ', la ville "' + message + '" est introuvable')
          } else {
            var city = data.name
            var country = data.sys.country
            var temperature = String((Number(data.main.temp) - 273.15)).substring(0, 4)
            var w
            switch (data.weather[0].main) {
              case 'Thunderstorm':
                w = 'orageux'
                break
              case 'Drizzle':
                w = 'bruineux'
                break
              case 'Rain':
                w = 'pluvieux'
                break
              case 'Snow':
                w = 'neigeux'
                break
              case 'Atmosphere':
              case 'Haze':
              case 'Mist':
                w = 'brumeux'
                break
              case 'Clear':
                w = 'dégagé'
                break
              case 'Clouds':
                w = 'nuageux'
                break
              case 'Extreme':
                w = 'vraiment pas terrible'
                break
            }
            if (w === undefined) {
              w = '"' + data.weather[0].main + '"'
            }
            msg.channel.send('Bonjour ' + msg.author + ',\n\tIl fait actuellement ' + temperature + '°C à ' + city + ' (' + country + ') et le temps est ' + w)
          }
        })
      } else if (api === 'translate') {
        // message = a.toString().replace(/ /gm, '%20') -> Déjà fait par Google Translate
        promise = callAPI(https, 'translation.googleapis.com', '/language/translate/v2?q=' + message + '&target=en&key=AIzaSyD-IvwfvuUSnIkt9Ahq1uQ0sD73o-rV4rQ')
        promise.then(function (data) {
          console.log(JSON.stringify(data))
        })
      } else {
        console.log(msg.author.id + ', ' + client.user.id)
        if (msg.author.id === client.user.id) { // Si on teste le bot dans une conversation privée, le paramètre msg.channel.type est égal à 'dm' : le bot se parle à lui-même
        } else {
          msg.channel.send('Navré ' + msg.author + ', je ne comprends pas votre demande. Veuillez taper "!help" pour afficher la liste des fonctionnalités disponibles.')
        }
      }
    }
  }
  /*
  * Envoie une requête HTTP
  *
  * @param {String} type : type de la requête (http ou https)
  * @param {String} host : nom de domaine ou adresse IP du serveur auquel on envoie la requête
  * @param {String} path : chemin de la requête
  *
  * @return {Promise} promise : Objet promise contenant les données récupérées
  */
  function callAPI (type, host, path) {
    var data = ''
    var promise = new Promise(function (resolve, reject) {
      const options = {
        host: host,
        path: path,
        family: 4
      }
      type.request(options, (res) => {
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve(JSON.parse(data))
        })
      }).on('error', (e) => {
        msg.channel.send('Désolé, une erreur est survenue lors de la récupération des informations de l\'API "' + api + '". Voir console pour plus d\'informations.')
        console.log(`Got error: ${e.message}`)
        reject(new Error('Error'))
      }).end()
    })
    return promise
  }
})

client.login(config.token)
