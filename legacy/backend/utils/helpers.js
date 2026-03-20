const { default: axios } = require("axios");
const {
  RPC,
  marketplaceABI,
  marketplaceAddress,
  graphUrlMarketplace,
  stayAddress,
  erc20ABI,
  routerAddress,
  routerABI,
} = require("./constants");
const { ethers } = require("ethers");

const getMarketplaceContract = () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC);

    const wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(
      marketplaceAddress,
      marketplaceABI,
      wallet
    );

    return contract;
  } catch (error) {
    console.error("Error getting Marketplace contract:", error);
    return null;
  }
};
const getStayContract = () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC);

    const wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(stayAddress, erc20ABI, wallet);

    return contract;
  } catch (error) {
    console.error("Error getting Stay contract:", error);
    return null;
  }
};
const getRouterContract = () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC);

    const wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(routerAddress, routerABI, wallet);

    return contract;
  } catch (error) {
    console.error("Error getting Stay contract:", error);
    return null;
  }
};

const fetchPrimarySalesEvents = async () => {
  const batchSize = 100;
  let allEvents = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    // GraphQL query for fetching PrimarySaleStatus events in batches
    const queryQl = ` 
            {
              primarySaleStatuses(first: ${batchSize}, skip: ${skip}, orderDirection: desc,orderBy: blockTimestamp) {
                _propertyId
                _status
              }
            }
          `;

    try {
      // Execute the query with axios
      const response = await axios.post(
        graphUrlMarketplace,
        JSON.stringify({
          query: queryQl,
        }),
        {
          headers: {
            "Content-Type": "application/json", // Ensure the correct content type is set
          },
        }
      );
      const eventsBatch = response.data?.data?.primarySaleStatuses;

      if (!eventsBatch || eventsBatch.length === 0) {
        hasMore = false;
      } else {
        // Append events to the main array
        allEvents = [...allEvents, ...eventsBatch];

        // Update skip for the next batch
        skip += batchSize;

        // Check if the batch size is smaller than requested
        if (eventsBatch.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error("Error fetching PrimarySaleStatus events:", error);
      hasMore = false; // Stop fetching on error
    }
  }

  // Reduce events to retain only the highest status per propertyId
  const latestStatusMap = allEvents.reduce((acc, event) => {
    const propertyId = event._propertyId;
    const status = parseInt(event._status, 10);

    // Keep only the event with the highest status for each propertyId
    if (!acc[propertyId] || status > acc[propertyId]._status) {
      acc[propertyId] = { _propertyId: propertyId, _status: status };
    }

    return acc;
  }, {});

  // Convert the map to an array and filter by the desired state
  const filteredEvents = Object.values(latestStatusMap).filter(
    (event) => event._status === 2 // fetch all ongoing status properties
  );

  // Return the first matching event (or null if no match)
  return filteredEvents.length > 0
    ? filteredEvents.sort((a, b) => a._propertyId - b._propertyId)[0]
    : null;
};

function calculateTotalStayReward(cart_items) {
  let totalReward = 0;

  // Loop through cart items
  cart_items.forEach((item) => {
    if (item.pricing_type === "one_time") {
      let totalAmount = item.initial_price.total / 100; // Convert cents to dollars

      if (totalAmount === 10) {
        totalReward += totalAmount; // Add the full amount if exactly 10
      } else if (totalAmount > 10) {
        totalReward += totalAmount * 0.1; // Add 10% of the amount if greater than 10
      }
    }
  });

  return totalReward;
}

const getEthFrom = (wei) => {
  return ethers.utils.formatEther(wei).toString();
};
const getWeiFrom = (eth) => {
  return ethers.utils.parseEther(eth).toString();
};

function normalizeAddress(input = "") {
  const addr = String(input).trim().replace(/\u200B/g, "").toLowerCase();
  return addr;
}
function isHexAddress(s = "") {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

module.exports = {
  getMarketplaceContract,
  fetchPrimarySalesEvents,
  calculateTotalStayReward,
  getStayContract,
  getRouterContract,
  getEthFrom,
  getWeiFrom,
  isHexAddress,
  normalizeAddress
};
