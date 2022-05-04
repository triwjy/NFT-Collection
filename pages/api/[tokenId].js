export default function handler(req, res) {
  // get the tokenId from the query params
  const tokenId = req.query.tokenId;
  // extract image from github directly
  const image_url = 
    "https://raw.githubusercontent.com/LearnWeb3DAO/NFT-Collection/main/my-app/public/cryptodevs/";
  // The api is sending back metadata for a Crypto Dev
  // To make our collection compatible with Open sea, we need to follow 
  // openseaa Metadata standards when sending back the response from the api
  res.status(200).json({
    name: "Crypto Dev #" + tokenId,
    descryption: "Crypto Dev is a collection of developers in crypto",
    image: image_url + tokenId + ".svg"
  })
}