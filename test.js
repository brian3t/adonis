const norm = require('normalize-url')
async function main() {
  let url = "https://media.sandiegoreader.com/img/bands/leadart/elan_photo_t600.jpg?4326734cdb8e39baa3579048ef63ad7b451e7676%27%29="
  url=norm(url,{removeQueryParameters:[/.*/]})
// Print the full HTML
  console.log(`Site HTML: ` + url)
}
main()
