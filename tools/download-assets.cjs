// Refresh local demo images, Bootstrap, and the three typefaces.
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const photos=[
 ['kurta1.jpg','https://www.veersons.com/cdn/shop/products/image_0dbf0d5a-a488-416a-8ce8-5325f50a8067_1024x1024.jpg?v=1624975721','https://www.veersons.com/products/veersons-chikankari-hand-embroidered-red-cotton-lucknowi-chikankari-kurta'],
 ['jeans1.jpg','https://cdn.shopify.com/s/files/1/0578/7385/8748/products/category_stap_rins_3_720x.jpg?v=1642815810','https://www.mottandbow.com/collections/mens-jeans'],
 ['palazzo1.jpg','https://cf-assets-thredup.thredup.com/assets/731106334/xlarge.jpg','https://www.thredup.com/product/women-linen-eileen-fisher-ivory-linen-pants/197062600'],
 ['oxford1.jpg','https://shop.thedecorumbkk.com/cdn/shop/products/cj3_0016_Layer5.jpg?v=1657268961&width=700','https://shop.thedecorumbkk.com/products/crockett-and-jones-hallam-black-calf'],
 ['jumpsuit1.jpg','https://images.express.com/is/image/expressfashion/0094_07902066_0813_f001?cache=on&fmt=jpeg&qlt=85&wid=600','https://www.express.com/clothing/women/satin-v-neck-long-sleeve-belted-wide-leg-jumpsuit-with-pockets/pro/07902066'],
 ['joggers1.jpg','https://m.media-amazon.com/images/I/41PMHM2odgL.jpg','https://hanfseite.de/ratgeber/hanftextilien/bequem-hose-herren/'],
 ['blazer1.jpg','https://img01.ztat.net/article/spp-media-p1/a8829797bd0d47c4aa99f44562ac53c0/16e64cb3e1c3404a969b790889712d21.jpg?filter=packshot&imwidth=762','https://www.zalando.it/soliver-black-label-label-blazer-steingrau-soa21g0bz-c11.html'],
 ['anarkali1.jpg','https://medias.utsavfashion.com/media/catalog/product/cache/1/image/500x/040ec09b1e35df139433887a97daa66f/e/m/embroidered-georgette-anarkali-suit-in-orange-v1-krd1276.jpg','https://www.utsavfashion.com/product/embroidered-georgette-anarkali-suit-in-orange-krd1276-sh25'],
 ['blouse1.jpg','https://img.mytheresa.com/1094/1238/100/jpeg/catalog/product/b2/P00974485.jpg','https://www.mytheresa.com/ch/en/women/zimmermann-silk-wrap-top-blue-p00974485'],
 ['loafers1.jpg','https://www.walklondonshoes.com/cdn/shop/files/preview_images/Angelo-Saddle-Loafer---Tan-Suede---THREE-QUARTER.jpg?v=1708089477&width=700','https://www.walklondonshoes.com/collections/mens-loafers-sale']
];
async function download(url,file){const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(`${response.status}: ${url}`);const bytes=Buffer.from(await response.arrayBuffer());await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);console.log(path.relative(root,file),bytes.length);}
(async()=>{
  const tasks=photos.map(([name,url])=>download(url,path.join(root,'uploads',name)));
  tasks.push(download('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',path.join(root,'assets/bootstrap.min.css')));
  for(const [family,file] of [['Host+Grotesk:wght@300..800','host-grotesk'],['IBM+Plex+Sans:wght@100..700','ibm-plex-sans'],['IBM+Plex+Mono','ibm-plex-mono']])tasks.push((async()=>{
    const response=await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}});
    if(!response.ok)throw new Error(`Font CSS: ${response.status}`);
    const css=await response.text();const urls=[...css.matchAll(/url\((https:[^)]+)\)/g)];
    if(!urls.length)throw new Error('No font URL');await download(urls.at(-1)[1],path.join(root,'assets/fonts',file+'.woff2'));
  })());
  const results=await Promise.allSettled(tasks);results.forEach((result,i)=>{if(result.status==='rejected'){console.error('ASSET FAILED',i,result.reason.message);process.exitCode=1;}});
  await fs.writeFile(path.join(root,'assets/CREDITS.md'),'# Demo asset sources\n\nThese product photos illustrate the seeded wardrobe for this coursework demo; they are not photographs of the user’s clothes. Original image rights remain with their respective owners. Replace them with your own garment photos for your personal wardrobe.\n\n'+photos.map(([file,url,source])=>`- [${file}](${source}) — [image source](${url})`).join('\n')+'\n\nTypography: Host Grotesk, IBM Plex Sans, and IBM Plex Mono via Google Fonts (SIL Open Font License). Bootstrap 5.3.0 (MIT). Interface icons are original SVG paths.\n');
})();
