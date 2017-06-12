const Discord = require('discord.js')
const config = require('./config.js')
const client = new Discord.Client()
var https = require('https')
var http = require('http')
var Twit = require('twit')
var twit = new Twit(config.twitter)

client.on('ready', () => {
  console.log(`Logged in as ${client.user.username}!`)
})

var d = new Date()
var weekday = new Array(7)
weekday[0] = 'Dimanche'
weekday[1] = 'Lundi'
weekday[2] = 'Mardi'
weekday[3] = 'Mercredi'
weekday[4] = 'Jeudi'
weekday[5] = 'Vendredi'
weekday[6] = 'Samedi'
var dayNb = d.getDay()
// var today = weekday[dayNb]

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
        '\t!youtube NOM_VIDEO : Effectuer une recherche sur Youtube (Chaîne, vidéo, live ou playlist).\n\n' +
        '\t!weather NOM_VILLE : Obtenir les informations météorologiques d\'une ville.\n\n' +
        '\t!translate PHRASE : Traduire un mot / une phrase de n\'importe quelle langue en anglais.\n\n' +
		'\t!twitter !tweet TWEET : Permet de tweeter avec le compte Falcon Team.\n\n' +
		'\t!twitter !stream STREAM : Permet de rechercher sur twitter tout les #STREAM.'
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
                    msg.channel.send(
                      'Live : \n' +
                        '\tChaîne : ' + channel + '\n' +
                        '\tTitre : ' + title + '\n' +
                        '\tVues totales : ' + views
                    )
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
                    msg.channel.send(
                      'Video : \n' +
                        '\tChaîne : ' + channel + '\n' +
                        '\tTitre : ' + title + '\n' +
                        '\tDurée : ' + duration + '\n' +
                        '\tVues : ' + views
                    )
                  }
                })
              } else if (kind === 'channel') {
                var channelId = result.id.channelId
                var promiseChannel = callAPI(https, 'www.googleapis.com', '/youtube/v3/channels?id=' + channelId + '&part=snippet,statistics&key=AIzaSyD-IvwfvuUSnIkt9Ahq1uQ0sD73o-rV4rQ')
                promiseChannel.then(function (data) {
                  var nom = data.items[0].snippet.title
                  var videos = data.items[0].statistics.videoCount
                  var subscribers = data.items[0].statistics.subscriberCount
                  msg.channel.send(
                    'Chaîne : \n' +
                      '\tNom : ' + nom + '\n' +
                      '\tNombre de vidéos : ' + videos + '\n' +
                      '\tNombre d\'abonnés : ' + subscribers
                  )
                })
              } else if (kind === 'playlist') {
                var playlistId = result.id.playlistId
                var promisePlaylist = callAPI(https, 'www.googleapis.com', '/youtube/v3/playlists?id=' + playlistId + '&part=snippet,contentDetails&key=AIzaSyD-IvwfvuUSnIkt9Ahq1uQ0sD73o-rV4rQ')
                promisePlaylist.then(function (data) {
                  var title = data.items[0].snippet.title
                  var channel = data.items[0].snippet.channelTitle
                  var videos = data.items[0].contentDetails.itemCount
                  msg.channel.send(
                    'Playlist : \n' +
                      '\tChaîne : ' + channel + '\n' +
                      '\tTitre : ' + title + '\n' +
                      '\tNombre de vidéos : ' + videos
                  )
                })
              }
            }
          }
        })
      } else if (api === 'weather') {
        message = message.replace(/ /gm, '-') // La recherche fonctionne toujours avec un "-" dans un nom de ville, contrairement aux " " dans certains cas.
        promise = callAPI(http, 'api.openweathermap.org', '/data/2.5/weather?q=' + message + '&lang=fr&APPID=46c100d5c1bbf6cbd87bb684098e7d32')
        promise.then(function (data) {
          if (data.message === 'city not found') {
            msg.channel.send('Navré ' + msg.author + ', la ville "' + message + '" est introuvable')
          } else {
            var city = data.name
            var country = data.sys.country
            var temperature = celsius(data.main.temp)
            var weather = data.weather[0].description.toLowerCase()
            msg.channel.send(
              'Bonjour ' + msg.author + ',\n\n' +
                '\tIl fait actuellement ' + temperature + '°C à ' + city + ' (' + country + '). Météo globale : ' + weather + '.'
            )
          }
        })
      } else if (api === 'forecast') {
        message = message.replace(/ /gm, '-') // La recherche fonctionne toujours avec un "-" dans un nom de ville, contrairement aux " " dans certains cas.
        promise = callAPI(http, 'api.openweathermap.org', '/data/2.5/forecast?q=' + message + '&lang=fr&APPID=46c100d5c1bbf6cbd87bb684098e7d32')
        promise.then(function (data) {
          if (data.message === 'city not found') {
            msg.channel.send('Navré ' + msg.author + ', la ville "' + message + '" est introuvable')
          } else {
            var res = ''
            var city = data.city.name
            var country = data.city.country
            var temperature = celsius(data.list[0].main.temp)
            var weather = data.list[0].weather[0].description.toLowerCase()
            var dt = data.list[0].dt_txt
            var firstDay = Number(dt.split('-').pop().split(' ').shift())
            var day = firstDay
            var weekDayNb = dayNb
            res +=
            'Bonjour ' + msg.author + ',\n\n' +
              '\tIl fait actuellement ' + temperature + '°C à ' + city + ' (' + country + '). Météo globale : ' + weather + '.\n\n\n' +
              '\tPrévisions sur les prochains jours :\n\n'
            for (var i = 1; i < data.list.length; i++) {
              /*
              * On parcourt chaque objet de l'objet list, qui correspond à toutes les prévisions sur 5 jours.
              * Chacun de ces objets correspond à une prévision de la météo à une heure précise (toutes les 3 heures, en commencant à 00h00).
              * On teste si la date du i-ème objet correspond à aujourd'hui ou au lendemain de la date de l'objet i-1.
              * Si elle correspond à aujourd'hui, on affiche une prévision pour le matin et l'après-midi s'il est avant 09h du matin, seulement de l'après-midi s'il est entre 09h et 15h et pas de prévision s'il est après 15h (on affiche quand-même le température actuelle en tout début du message).
              * Si elle correspond au lendemain, cela signifie que l'objet i est la prévision de la météo du lendemain à minuit.
              * On récupère alors les informations du matin (à 09h00 <=> objet i+3) et de l'après-midi (à 15h00 <=> objet i+5) (si elles sont disponibles)
              */
              var next = data.list[i]
              var nextDt = next.dt_txt
              var nextDay = nextDt.split('-').pop().split(' ').shift()
              var nextYear = nextDt.split('-')[0]
              var nextMonth = nextDt.split('-')[1]
              var hasMorning = false
              if (Number(nextDay) === firstDay) { // Prévisions de la journée en cours.
                var h = nextDt.split(' ').pop().split(':').shift()
                if (Number(h) > 15) {
                } else {
                  if (Number(h) === 9) {
                    var tempAM = celsius(data.list[i].main.temp)
                    var weatherAM = data.list[i].weather[0].description
                    res +=
                      '\t\tAujourd\'hui : \n' +
                        '\t\t\tMatin : ' + tempAM + '°C, ' + weatherAM + '\n'
                    hasMorning = true
                  } else if (Number(h) === 15) {
                    var tempPM = celsius(data.list[i].main.temp)
                    var weatherPM = data.list[i].weather[0].description
                    if (!hasMorning) {
                      res +=
                        '\t\tAujourd\'hui : \n'
                    }
                    res +=
                      '\t\t\tAprès-midi : ' + tempPM + '°C, ' + weatherPM + '\n'
                  }
                }
              } else if (Number(nextDay) !== day && (Number(nextDay) === 1 || Number(nextDay) === (day + 1))) { // Prévision du jour i+1
                var nextTempAM = celsius(data.list[i + 3].main.temp)
                var nextWeatherAM = data.list[i + 3].weather[0].description
                var nextTempPM = (data.list[i + 5] === undefined) ? undefined : celsius(data.list[i + 5].main.temp)
                var nextWeatherPM = (data.list[i + 5] === undefined) ? undefined : data.list[i + 5].weather[0].description
                day = Number(nextDay)
                weekDayNb = (weekDayNb === 6) ? 0 : weekDayNb + 1
                var nextWeekDay = weekday[weekDayNb]
                res +=
                  '\t\t' + nextWeekDay + ' (' + nextDay + '-' + nextMonth + '-' + nextYear + ') :\n'
                if (nextTempAM !== undefined && nextWeatherAM !== undefined) {
                  res +=
                    '\t\t\tMatin : ' + nextTempAM + '°C, ' + nextWeatherAM + '\n'
                  if (nextTempPM !== undefined && nextWeatherPM !== undefined) {
                    res +=
                      '\t\t\tAprès-midi : ' + nextTempPM + '°C, ' + nextWeatherPM + '\n\n'
                  } else {
                    res +=
                      '\t\t\tAprès-midi : Les données prévisionnelles seront disponibles d\'ici quelques heures !\n\n'
                  }
                } else {
                  res +=
                    '\t\t\tLes données prévisionnelles seront disponibles d\'ici quelques heures !\n'
                }
              }
              if (i === data.list.length - 1) {
                msg.channel.send(res)
              }
            }
          }
        })
      } else if (api === 'translate') {
        // message = a.toString().replace(/ /gm, '%20') -> Déjà fait par Google Translate
        promise = callAPI(https, 'translation.googleapis.com', '/language/translate/v2?q=' + message + '&target=en&key=AIzaSyD-IvwfvuUSnIkt9Ahq1uQ0sD73o-rV4rQ')
        promise.then(function (data) {
          console.log(JSON.stringify(data))
        })
      } else if (api === 'spotify') {
        message = a.toString().replace(/ /gm, '+')
        promise = callAPI(https, 'api.spotify.com', '/v1/search?q=' + message + '&limit=3&type=album,artist,track', {'Authorization': 'Bearer BQDaac7-KtPKjIi-Cz1eXtmN3ydLK0WZNS5p3_taxcdAVCDARP4TLFN9rZqovkQQVws4lWlmzaLldQ91xwVpwSDUXFdfWX__60OS6jwwZMuLxR-jeMy75nA0urpkgmQMc1GkAssc8aAQ'})
        promise.then(function (data) {
          console.log(JSON.stringify(data))
        })
      } else if (api === 'pokemon') {
        message = a.toString().replace(/ /gm, '+')
        promise = callAPI(http, 'pokeapi.co', '/api/v2/pokemon/' + message)
        promise.then(function (data) {
          console.log(JSON.stringify(data))
        })
      } else if (api === 'twitter') {
		  message = message.split(' ')
		  var fonction = message.shift()
		  if (fonction === '!tweet'){
			message = message.join().replace(/,/gm, ' ')
		    var Tweet = message
		    if (Tweet.length > 140){
		   	  msg.channel.send('Navré ' + msg.author + ', votre tweet est trop long. La taille maximal autorisé est de 140 caractères.')
		    } else {
			  var tweet = {
				status: Tweet
			  }
			  twit.post('statuses/update', tweet, tweeted)
			  function tweeted(err, data, response) {
				if (err) {
					msg.channel.send('Tweet non envoyé. Une erreur est survenue.')
				} else {
					msg.channel.send('Tweet envoyé avec succès : ' + Tweet)
				}
			  }
			}
		} else if (fonction === '!stream'){
			twit.stream('statuses/filter', {track: 'FalconIsep'}, function (stream) {
				stream.on('data', function (tweet) {
					msg.channel.send(" On t'a taggué dans ce tweet : " + tweet.text)
				})
				
				stream.on('error', function (error) {
					console.log(error)
				})
			})
		}
		else {
			msg.channel.send('Après "!twitter ", utilisez "!tweet [msg]" pour tweeter ou "!stream" pour rechercher les tweet adressé à @FalconIsep.')
		}
	  } else {
        if (msg.author.id === client.user.id) { // Si on teste le bot dans une conversation privée, le paramètre msg.channel.type est égal à 'dm' : le bot se parle à lui-même
        } else {
          msg.channel.send('Navré ' + msg.author + ', je ne comprends pas votre demande. Veuillez taper "!help" pour afficher la liste des fonctionnalités disponibles.')
        }
      }
    }
  }
  /*
  * Envoie une requête HTTP Node
  *
  * @param {String} type : type de la requête (http ou https)
  * @param {String} host : nom de domaine ou adresse IP du serveur auquel on envoie la requête
  * @param {String} path : chemin de la requête
  * @param {Object} headers : en-tête de la requête
  *
  * @return {Promise} promise : Objet promise contenant les données récupérées
  */
  function callAPI (type, host, path, headers) {
    var data = ''
    var promise = new Promise(function (resolve, reject) {
      const options = {
        method: 'GET',
        host: host,
        path: path,
        headers: headers,
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
  function celsius (t) {
    t = (Math.round((Number(t) - 273.15) * 10) / 10).toString()
    return t
  }
})

client.login(config.token)
