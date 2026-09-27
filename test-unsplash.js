const https = require('https');

const pools = {
  coffee: [
    '1556740767-414a9c4860c1', '1675435644687-562e8042b9db', '1509042239860-f550ce710b93',
    '1447933601403-0c6688de566e', '1674327105074-46dd8319164b', '1541167760496-1628856ab772',
    '1511920170033-f8396924c348', '1556742526-795a8eac090e', '1673545518947-ddf3240090b1',
    '1495474472287-4d71bcdd2085', '1610632380989-680fe40816c6', '1677607237201-64668c2266ab',
    '1553292218-4892c2e7e1ae', '1611162458324-aae1eb4129a4', '1502462041640-b3d7e50d0662'
  ],
  cocktail: [
    '1677000666461-fbefa43c2c7f', '1609951651556-5334e2706168', '1657313666513-70770d329ef4',
    '1514362545857-3bc16c4c7d1b', '1670333183316-ab697ddd9b13', '1551024709-8f23befc6f87',
    '1570598912132-0ba1dc952b7d', '1500217052183-bc01eee1a74e', '1671647122910-3fa8ab4990cb'
  ],
  mocktail: [
    '1536935338788-846bb2268fbb', '1595981267035-7b04d84b48ae', '1670270203164-aa65468a9c67',
    '1615887023516-9b6bcd559e87', '1586338211598-e2d64cf97e28', '1568644396922-5c3bfae12521'
  ],
  smoothie: [
    '1505252585461-04db1eb84625', '1628557044797-f8ea2b1263c9', '1615478503562-b2d5c6439e7c',
    '1589187635677-2fb07845f3c1', '1570598912132-0ba1dc952b7d', '1500217052183-bc01eee1a74e'
  ]
};

async function main() {
  for (const [cat, ids] of Object.entries(pools)) {
    console.log('\nCategory: ' + cat);
    const valid = [];
    for (const id of ids) {
      try {
        const res = await fetch('https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=800&q=80', { method: 'HEAD' });
        if (res.ok || res.status === 200) {
          valid.push(id);
        } else {
          console.log('[INVALID] ' + id + ' - Status: ' + res.status);
        }
      } catch (e) {
        console.log('[ERROR] ' + id + ' - ' + e.message);
      }
    }
    console.log('Valid IDs for ' + cat + ': ', valid);
  }
}

main();
