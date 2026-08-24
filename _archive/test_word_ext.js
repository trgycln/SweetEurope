const WordExtractor = require('word-extractor');
const extractor = new WordExtractor();
const extracted = extractor.extract(String.raw`dokuments\FO Ürün Spektleri\88_Kalem_Ilk_Parti_Siparis_Spektleri\1. SUGAR FREE CARAMEL FLAVORED SYRUP.doc`);

extracted.then(function(doc) {
  console.log(doc.getBody().substring(0, 500));
}).catch(console.error);
