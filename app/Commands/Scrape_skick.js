'use strict'

/**
 * Scrape from Songkick.com
 * Able to save event + venue into db
 */

const {Command} = require('@adonisjs/ace')
const Jslib = require('../../jslib/jslib_global')
const axios = require("axios")
const cheerio = require("cheerio")
const Database = use('Database')
const file = require('fs')
const norm = require('normalize-url')
const Event = use('App/Models/Event')
const Venue = use('App/Models/Venue')
const Band = use('App/Models/Band')
const BandEvent = use('App/Models/BandEvent')
const Env = use('Env')
const moment = require('moment')

const TARGET_ROOT = 'https://www.songkick.com/metro-areas/'

class Scrape_skick extends Command {
  static get signature(){
    return 'scrape_skick'
  }

  static get description(){
    return 'LNO scraper. Scrape from SDR, bandmix, songkick, etc..' +
      '08/22: scrape songkick'
  }

  async handle(){
    const LIMIT = 1
    // const LIMIT = 150
    console.log(`scrape skick starting`)
    global.conf = require('./conf/songkick.json')
    let node_env = Env.get('NODE_ENV')
    let url = '', num_saved = 0, num_saved_venue = 0, html = {}, ev_save_res, ven_save_res
    for (const metro in conf) {
      if (! conf.hasOwnProperty(metro)) continue
      let metro_conf = conf[metro]
      const tz = metro_conf.timezone
      url = TARGET_ROOT + metro
      console.log(`Scraping url: `, url)
      try {
        await Jslib.sleep(10)
        html = await axios.get(url)
      } catch (e) {
        console.error(`axios error: ${e}`)
        continue
      }
      if (html.status === 404) {
        console.error(`Error html status 404`)
        continue
      }
      const $ = await cheerio.load(html.data)
      file.writeFile('public/ig_skick_metro.html', html.data, (err) => {
      })
      let ev_name, ev_url
      try
      {
        let new_band = await Band.findOrCreate({name:'sunny war'}, {name:'sunny war'})
        console.log(`new band 65: `, new_band)
        $('li.event-listings-element').each(async function (i, ev_list){
          const $ev_list = $(this)
          if (typeof ev_list !== 'object' || ! ev_list.attribs || ! ev_list.attribs.title) return
          let status = $ev_list.find('strong.item-state-tag')
          if (status.text && status.text() === 'Canceled' || status.text() === 'Postponed') return
          let ev_date = moment(ev_list.attribs.title, 'dddd DD MMMM YYYY')//Sunday 23 August 2020
          if (! (ev_date.isValid())) return
          ev_name = $ev_list.find('a.event-link > span > strong')
          if (! ev_name || typeof ev_name !== 'object') return
          ev_name = ev_name.text()
          if (! ev_name || typeof ev_name !== 'string' || ev_name === '') return
          let new_band = await Band.findOrCreate({name:'sunny war'}, {name:'sunny war'})
          console.log(`new band 78: `, new_band)

          const ev = await Event.findOrCreate(
            {name: ev_name, source: 'skick'}
            , {name: ev_name, source: 'skick', scrape_status: 0, scrape_msg: 'skick init'}
          )
          //model initiated

          ev_url = $ev_list.find('a.event-link').attr('href')
          if (! ev_url) {
            console.log(`event without url, skipped`);
            return
          }
          ev.scrape_url = `https://songkick.com` + ev_url
          ev.tz = tz
          ev.start_datetime_utc = ev_date.format('YYYY-MM-DD HH:mm:ss')
          let artist_img = $ev_list.find('img.artist-profile-image')
          if (artist_img) ev.img = artist_img.data('src')
          let ven_link = $ev_list.find('a.venue-link')
          if (ven_link && ven_link.text) {
            let ven_name = ven_link.text()
            if (ven_name) {
              /** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
              const ven = await Venue.findOrCreate({
                name: ven_name, state: conf[metro].state, city: conf[metro].city
              }, {name: ven_name, source: 'skick', state: conf[metro].state, city: conf[metro].city, scrape_status: 0, scrape_msg: 'skick init'})
              ven.scrape_url = `https://songkick.com` + ven_link.attr('href')
              ven_save_res = await ven.save()
              if (ven_save_res) num_saved_venue++
              ev.venue_id = ven.id
              await ev.save() //link event with venue
            }
          }
          ev_save_res = await ev.save()
          if (ev_save_res) num_saved++
          console.log(`num ev saved: ${num_saved} \n`)
        })
      } catch (e){
        console.error(`error`, e)
      }
      console.log(`For metro ${metro}, we scraped ${num_saved} events; ${num_saved_venue} venues.\n`)
    }
    // console.log(`Cleaning up: \n`)
    // await Event.query().where('source','skick').where() .delete()
    console.log(`db closing`)
    Database.close()
    process.exit()
  }
}

module.exports = Scrape_skick
