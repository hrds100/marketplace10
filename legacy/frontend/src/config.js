//MAINNETBNB

export const firebaseConfig = {
  apiKey: "AIzaSyA2kEEsgQCxv9jvbUOMfGDCm0KvMaJmOvM",
  authDomain: "nfstay-app-7cd7e.firebaseapp.com",
  projectId: "nfstay-app-7cd7e",
  storageBucket: "nfstay-app-7cd7e.firebasestorage.app",
  messagingSenderId: "1091012704473",
  appId: "1:1091012704473:web:3bfc7484c72b3c80ac66c8",
  measurementId: "G-6JZ68WMMTX",
};

export const CONTRACT_CONFIG = {
  graphUrlVoting:
    "https://api.studio.thegraph.com/query/62641/rwa_nfstay_voting_mainnet/v3",
  graphUrlMarketplace:
    "https://api.studio.thegraph.com/query/62641/nfstay-rwa-marketplace/v3",

  graphUrlRent:
    "https://api.studio.thegraph.com/query/62641/nfstay-rwa-mainnet-rent/v3",
  graphUrlBooster:
    "https://api.studio.thegraph.com/query/113079/booster-mainnet/v2",
  graphBurnUrl:
    "https://api.studio.thegraph.com/query/62641/nfstaymainnet/v0.1",

  rwaMarketplace: "0xDD22fDC50062F49a460E5a6bADF96Cbec85ac128",
  buyLp: "0x3e6E0791683F003E963Df5357cfaA0Aaa733786f",
  rwa: "0xA588E7dC42a956cc6c412925dE99240cc329157b",
  rent: "0x5880FABeafDD228f0d8bc70Ebb2bb79971100C89",
  voting: "0x5edd93fE27eD8A0e7242490193c996BaE01EB047",
  booster: "0x9d5D6EeF995d24DEC8289613D6C8F946214B320b",
  ROUTER: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  zeroAddress: "0x0000000000000000000000000000000000000000",
  USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
  STAY: "0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0",
  ROCK: "0x6D635dc4a2A54664B54dF6a63e5ee31D5b29CF6e",
  stayUsdcPair: "0x2397C1722CCb6934BECF579351685A56030EA8F7",
  farm: "0x3b937d513a3C5ebE5168E3fFdb6028AE6cc32115",
  // rpc: "https://blue-icy-fire.bsc.quiknode.pro/14b933c06a477374aa6997c4f29e3ec59a3df4ef/",
  rpc: "https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T",
  supportedChain: 56,
  coinGeckoApiKey: "CG-Dm77JnkKntWqUcF9AoaZskEL",
  TransakContract: "0x4A598B7eC77b1562AD0dF7dc64a162695cE4c78A" 
};

export const ADMIN_WALLET = "0x6eb06e1078cfbdCF9a3387584a8D934D85Ea1436";

export const MANAGER_WALLET = "0x0a1CEfB07A9B81759ac131C14Bb9A57eDd2E244F";
export const TREASURY_WALLET = "0xE1F532A57Fd6a1d3af3Ec8E268249d6B6cEe3df6";
export const BASEURL = "https://app.nfstay.com";
export const BACKEND_BASEURL = "https://be.nfstay.com/api";

//TESTNETSEPOLIA

// export const firebaseConfig = {
//   apiKey: "AIzaSyBZim4AQFkkfRF7nQkaznl3TAjnSOqmiik",
//   authDomain: "nfstay-e2819.firebaseapp.com",
//   projectId: "nfstay-e2819",
//   storageBucket: "nfstay-e2819.firebasestorage.app",
//   messagingSenderId: "146426621948",
//   appId: "1:146426621948:web:fc8742ffc296b030560c79",
//   measurementId: "G-2V1RFK4B4P",
// };

// export const ADMIN_WALLET = "0xF72817AD1e1Ac47A15c9F4A7CCA16E76FE428F6e";
// export const MANAGER_WALLET = "0xBfF4846B0B04bc92389dd1a3327f241E5A0464B7";
// export const TREASURY_WALLET = "0xEC5bB3Bd3f99f766C348871813B620E035A5C7C3";
// export const BASEURL = "https://rwa-nfstay.vercel.app";
// export const BACKEND_BASEURL = "https://nfstay-backend.vercel.app/api";
// export const BASEURL = "localhost:3000"
// export const BACKEND_BASEURL = "http://localhost:5001/api";


// export const CONTRACT_CONFIG = {
//   graphUrlVoting:
//     "https://api.studio.thegraph.com/query/107415/votingnfstya/v4",
//   graphUrlMarketplace:
//     "https://api.studio.thegraph.com/query/107415/marketnfstay/v5",
//   graphUrlRent: "https://api.studio.thegraph.com/query/113079/nfsstayrent/v5",
//   graphUrlBooster: "https://api.studio.thegraph.com/query/107415/booster/v4",
//   graphBurnUrl:
//     "https://api.studio.thegraph.com/query/62641/nfstaymainnet/v0.1",
// rwaMarketplace: "0xaA13796bF55017A4C5BD0fB69383953646E366EA",
// buyLp: "0x250F5DB512c8E0D542fBCaAb07B4A4d94cf452A5",
// rwa: "0x729C4836934C8D4c39B47462947C75E97cF8eC64",
// voting: "0x77d89E3af7Fecc67F098B42950b493bCd392e0E6",
// rent: "0xb56296C0fA100dAa4942ab18386f568c398Fc23a",
// booster: "0x7B6BbFdee808821beCa07290C7aD1fEBb6a09B08",
// ROUTER: "0xc532a74256d3db42d0bf7a0400fefdbad7694008",
// WBNB: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
// zeroAddress: "0x0000000000000000000000000000000000000000",
// // USDC: "0x49c2d5e6f839e923b74cbba69e640942149bcf56",  //USDC SEPOLIA
// USDC: "0x0c86a754a29714c4fe9c6f1359fa7099ed174c0b",     // USDC TRANSAK
// STAY: "0x8423cece3ce700d2101822ed4040c5e6a55e0d95",
// ROCK: "0x6d1f3f71d22bcc94c0872cff17ab14abc393c003",
// stayUsdcPair: "0x438d50aa8bc3e2aa1b27c41ad9e436c567b9f909",
// usdcWbnbPair: "0x2edf890b1a240fd2b5d35fd6815129676699cb01",
// farm: "0x327e47f35f7ef48caa17bda72c339e6ffaa3468d",
// rpc: "https://eth-sepolia.g.alchemy.com/v2/-VVP2mqehOvdG-zqsAs8xCZwWrIP63ho",
// supportedChain: 11155111,
// coinGeckoApiKey: "CG-Dm77JnkKntWqUcF9AoaZskEL",
// TransakContract: "0xD84aC4716A082B1F7eCDe9301aA91A7c4B62ECd7"
// }

// Common configuration options
export const approveAmount = "50000";
export const WERT_BASE_VALUE = 0.000001;

export const AUTHOR_IMAGE_URL =
  "https://photos.pinksale.finance/file/pinksale-logo-upload/1739539067063-b07a2340f46792534e7ff452e25a9355.png";
export const IMAGE_URL =
  "https://photos.pinksale.finance/file/pinksale-logo-upload/1739539300993-004ba68eea5b6ca13789d544a62de7d5.png";

export const PARTICLE_OPTIONS = {
  projectId: "4f8aca10-0c7e-4617-bfff-7ccb5269f365",
  clientKey: "cWniBMIDt2lhrhdIERSBWURpannCk30SGNwdPK7D",
  appId: "d80e484f-a690-4f0b-80a8-d1a1d0264b90",
  customStyle: {
    zIndex: 2147483650, // must be greater than 2147483646
    logo: "https://photos.pinksale.finance/file/pinksale-logo-upload/1721288952175-35ed0ed869e731b5d32a13ffb3a36d5a.png",
    projectName: "NFsTay_RWA Auth",
    subtitle: "Login to App to continue",
    modalWidth: 400,
    modalHeight: 650,
    primaryBtnBorderRadius: 18,
    modalBorderRadius: 18,
    cardBorderRadius: 18,
  },
};

export const APP_CONFIG = {
  APP_NAME: "NFsTay_RWA",
  WALLET_CONNECT_PROJECT_ID: "28e91881cee345ca645f8ad85e4db6fe", //WALLET_CONNECT_PROJECT_ID
};
