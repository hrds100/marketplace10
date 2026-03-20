import { CONTRACT_CONFIG } from "@/config";
import axios from "axios";
import {
  getEthFrom,
  getMonthTimestamps,
  summarizeSalesByAgent,
} from "./helper";

export const fetchPrimarySalesEvents = async (state) => {
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
      const response = await axios.post(CONTRACT_CONFIG.graphUrlMarketplace, {
        query: queryQl,
      });
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
    (event) => event._status === state
  );

  // Return sorted events by propertyId (ascending order)
  return filteredEvents.sort((a, b) => a._propertyId - b._propertyId);
};

export const fetchSecondarySalesEvents = async () => {
  const batchSize = 100;
  let allEvents = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    const queryQl = ` 
      {
        secondarySaleStatuses(first: ${batchSize}, skip: ${skip}, orderDirection: desc,orderBy: blockTimestamp) {
          _seller
          _listingId
          _propertyId
          _status
        }
      }
    `;

    try {
      const response = await axios.post(CONTRACT_CONFIG.graphUrlMarketplace, {
        query: queryQl,
      });
      const eventsBatch = response.data?.data?.secondarySaleStatuses;
      if (!eventsBatch || eventsBatch.length === 0) {
        hasMore = false;
      } else {
        // Normalize and deduplicate the batch before merging
        eventsBatch.forEach((event) => {
          const normalizedEvent = {
            _seller: event._seller.toLowerCase(), // Convert address to lowercase
            _listingId: Number(event._listingId), // Convert listingId to number
            _propertyId: Number(event._propertyId), // Convert propertyId to number
            _status: event._status,
          };

          // Add event only if it's not already in the array
          const existingEvent = allEvents.find(
            (e) => e._listingId === normalizedEvent._listingId
          );
          if (!existingEvent) {
            allEvents.push(normalizedEvent);
          }
        });

        skip += batchSize;

        // Check if the batch size is smaller than requested
        if (eventsBatch.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error("Error fetching SecondarySaleStatus events:", error);
      hasMore = false; // Stop fetching on error
    }
  }

  // Filter ongoing events and sort them by _listingId in descending order
  const ongoingEvents = allEvents
    .filter((event) => parseInt(event._status, 10) === 0)
    .sort((a, b) => b._listingId - a._listingId); // Sort by _listingId descending

  return ongoingEvents;
};

export const fetchProposalStatusEvents = async () => {
  const batchSize = 100;
  let allEvents = [];
  let hasMore = true;
  let skip = 0;

  const currentTimestamp = Math.floor(Date.now() / 1000); // Get current time in Unix timestamp

  while (hasMore) {
    const queryQl = ` 
      {
        proposalStatuses(first: ${batchSize}, skip: ${skip}, orderDirection: desc, orderBy: blockTimestamp) {
          _by
          _proposalId
          _endTime
          blockTimestamp
        }
      }
    `;

    try {
      const response = await axios.post(CONTRACT_CONFIG.graphUrlVoting, {
        query: queryQl,
      });
      const eventsBatch = response.data?.data?.proposalStatuses;
      if (!eventsBatch || eventsBatch.length === 0) {
        hasMore = false;
      } else {
        // Normalize and deduplicate the batch before merging
        eventsBatch.forEach((event) => {
          const normalizedEvent = {
            _by: event._by.toLowerCase(), // Convert address to lowercase
            _proposalId: Number(event._proposalId), // Convert proposalId to number
            _endTime: Number(event._endTime), // Convert endTime to number
            blockTimestamp: Number(event.blockTimestamp), // Add block timestamp
          };

          // Add event only if it's not already in the array
          const existingEvent = allEvents.find(
            (e) => e._proposalId === normalizedEvent._proposalId
          );
          if (!existingEvent) {
            allEvents.push(normalizedEvent);
          }
        });

        skip += batchSize;

        // Check if the batch size is smaller than requested
        if (eventsBatch.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error("Error fetching ProposalStatus events:", error);
      hasMore = false; // Stop fetching on error
    }
  }

  // Now split into past and active proposals
  const pastProposals = [];
  const activeProposals = [];

  allEvents.forEach((event) => {
    // Filter out events where endTime is zero
    if (event._endTime === 0) return;

    if (event._endTime > currentTimestamp) {
      activeProposals.push(event); // Add to active if endTime is greater than current time
    } else {
      pastProposals.push(event); // Add to past if endTime is less than current time
    }
  });

  // Sort both arrays by proposalId in descending order
  activeProposals.sort((a, b) => b._proposalId - a._proposalId);
  pastProposals.sort((a, b) => b._proposalId - a._proposalId);

  // Return both arrays with the timestamp
  return {
    activeProposals: activeProposals.map((event, index) => ({
      ...event,
      id: index + 1,
    })),
    pastProposals: pastProposals.map((event, index) => ({
      ...event,
      id: index + 1,
    })),
  };
};

export const fetchRentStatusEvents = async () => {
  const batchSize = 100;
  let allEvents = []; // Initialize as an empty array
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    // GraphQL query for fetching RentStatus events in batches, now including blockTimestamp
    const queryQl = ` 
      {
        rentStatuses(first: ${batchSize}, skip: ${skip}, orderDirection: desc, orderBy: blockTimestamp) {
          _by
          _propertyId
          _monthRent
          _status
          blockTimestamp
        }
      }
    `;

    try {
      // Execute the query with axios
      const response = await axios.post(CONTRACT_CONFIG.graphUrlRent, {
        query: queryQl,
      });

      const eventsBatch = response.data?.data?.rentStatuses;

      if (!eventsBatch || eventsBatch.length === 0) {
        hasMore = false;
      } else {
        // Append events to the main array
        allEvents = [...allEvents, ...eventsBatch];

        // Update skip for the next batch
        skip += batchSize;

        // Check if the batch size is smaller than requested, end the loop
        if (eventsBatch.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error("Error fetching RentStatus events:", error);
      hasMore = false; // Stop fetching on error
    }
  }
  // Reduce events to retain only the first event (latest) per propertyId
  const latestStatusMap = allEvents.reduce((acc, event) => {
    const propertyId = event._propertyId;

    // Keep only the first event for each propertyId
    if (!acc[propertyId]) {
      acc[propertyId] = { ...event };
    }

    return acc;
  }, {});

  // Convert the map to an array and filter by the desired RentState (Deposited)
  const filteredEvents = Object.values(latestStatusMap).filter(
    (event) => Number(event._status) === 0 // Status 0 is considered "Deposited"
  );

  // Return sorted events by propertyId (ascending order)
  return filteredEvents.sort((a, b) => a._propertyId - b._propertyId);
};

export const getBurnHistory = async () => {
  const batchSize = 100;
  let allEvents = []; // Initialize as an empty array
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    const queryQl = `
      query getBurnHistory {
        transfers(
          first: ${batchSize}, 
          skip: ${skip}, 
          where: { to: "0x0000000000000000000000000000000000000000" },
          orderBy: blockTimestamp,
          orderDirection: desc
        ) {
          id
          value
          blockTimestamp
          from
        }
      }
    `;

    try {
      const response = await axios.post(CONTRACT_CONFIG.graphBurnUrl, {
        query: queryQl,
      });

      const eventsBatch = response.data?.data?.transfers;

      if (!eventsBatch || eventsBatch.length === 0) {
        hasMore = false;
      } else {
        // Append events to the main array
        allEvents = [...allEvents, ...eventsBatch];

        // Update skip for the next batch
        skip += batchSize;

        // Check if the batch size is smaller than requested, end the loop
        if (eventsBatch.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (err) {
      console.error("Error fetching burn history:", err);
      hasMore = false; // Stop fetching on error
    }
  }

  // Format events with mapped structure
  let history = allEvents.map((item) => ({
    id: item.id,
    value: item.value,
    date: new Date(parseInt(item.blockTimestamp) * 1000).toLocaleString(),
    source: item.from,
  }));

  return history;
};

export const fetchReferralAddedEvents = async (address) => {
  const batchSize = 100; // Number of events to fetch in each query
  let allEvents = []; // Store all events
  let hasMore = true; // Control loop
  let skip = 0; // Offset for pagination

  while (hasMore) {
    // GraphQL query for fetching ReferralAdded events in batches filtered by the given address
    const queryQl = `
      {
        referralAddeds(first: ${batchSize}, skip: ${skip}, where: { _referee: "${address}" }) {
          _by
          _referee
        }
      }
    `;

    try {
      // Execute the query using axios
      const response = await axios.post(CONTRACT_CONFIG.graphUrlMarketplace, {
        query: queryQl,
      });

      // Extract events batch
      const eventsBatch = response.data?.data?.referralAddeds;

      if (!eventsBatch || eventsBatch.length === 0) {
        hasMore = false; // No more events to fetch
      } else {
        // Append fetched events to the main array
        allEvents = [...allEvents, ...eventsBatch];

        // Update skip for the next batch
        skip += batchSize;

        // If the batch size is smaller than the requested batch size, stop fetching
        if (eventsBatch.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error("Error fetching ReferralAdded events:", error);
      hasMore = false; // Stop fetching on error
    }
  }

  // Return the total length of events
  return allEvents.length;
};

export const fetchCommissionEvents = async (address) => {
  const batchSize = 100; // Number of events to fetch per query
  let allEvents = []; // Store all events
  let hasMore = true; // Control loop
  let skip = 0; // Offset for pagination

  while (hasMore) {
    // GraphQL query to fetch Commission events filtered by _referee address
    const queryQl = `
      {
        commissions(first: ${batchSize}, skip: ${skip}, where: { _referee: "${address}" }) {
          _referee
          _referral
          _propertyId
          _sharesSold
          _investment
          _commission
          blockTimestamp
        }
      }
    `;

    try {
      // Execute the GraphQL query using axios
      const response = await axios.post(CONTRACT_CONFIG.graphUrlMarketplace, {
        query: queryQl,
      });

      // Extract the batch of events
      const eventsBatch = response.data?.data?.commissions;

      if (!eventsBatch || eventsBatch.length === 0) {
        hasMore = false; // Stop fetching if no more events
      } else {
        // Append the events to the main array
        allEvents = [...allEvents, ...eventsBatch];

        // Update the skip value for pagination
        skip += batchSize;

        // Stop fetching if the batch size is smaller than the requested batch size
        if (eventsBatch.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error("Error fetching Commission events:", error);
      hasMore = false; // Stop fetching on error
    }
  }

  // Format the events to match the desired pattern
  const formattedEvents = allEvents.map((event) => ({
    _referee: event._referee,
    _referral: event._referral,
    _propertyId: parseInt(event._propertyId, 10),
    _sharesSold: parseInt(event._sharesSold, 10),
    _investment: parseFloat(getEthFrom(event._investment)), // Ensure numeric value
    _commission: parseFloat(getEthFrom(event._commission)), // Ensure numeric value
    timestamp: parseInt(event.blockTimestamp, 10), // Ensure numeric value
  }));
  // Return the formatted events
  return formattedEvents;
};

export const fetchRewardAndRentEvents = async (address, stayPrice) => {
  const batchSize = 100; // Number of events to fetch in each batch
  const allEvents = []; // To store all the events

  // Fetch RewardsClaimed
  const fetchFarmRewardsClaimed = async () => {
    let rewardsClaimedEvents = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const queryQl = `
        {
          rewardsClaimeds(first: ${batchSize}, skip: ${skip}, where: {by: "${address}"}) {
            amount
            blockTimestamp
          }
        }
      `;

      try {
        const response = await axios.post(CONTRACT_CONFIG.graphBurnUrl, {
          query: queryQl,
        });

        const events = response.data?.data?.rewardsClaimeds || [];

        rewardsClaimedEvents = [...rewardsClaimedEvents, ...events];
        hasMore = events.length === batchSize;
        skip += batchSize;
      } catch (error) {
        console.error("Error fetching RewardsClaimed events:", error);
        hasMore = false;
      }
    }

    rewardsClaimedEvents.forEach((event) => {
      allEvents.push({
        amount: Number(getEthFrom(event.amount)) * stayPrice,
        timestamp: event.blockTimestamp,
      });
    });
  };

  // Fetch RentWithdrawn
  const fetchRentWithdrawn = async () => {
    let rentWithdrawnEvents = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const queryQl = `
        {
          rentWithdrawns(first: ${batchSize}, skip: ${skip}, where: {_by: "${address}"}) {
            _rent
            blockTimestamp
          }
        }
      `;

      try {
        const response = await axios.post(CONTRACT_CONFIG.graphUrlRent, {
          query: queryQl,
        });

        const events = response.data?.data?.rentWithdrawns || [];

        rentWithdrawnEvents = [...rentWithdrawnEvents, ...events];
        hasMore = events.length === batchSize;
        skip += batchSize;
      } catch (error) {
        console.error("Error fetching RentWithdrawn events:", error);
        hasMore = false;
      }
    }

    rentWithdrawnEvents.forEach((event) => {
      allEvents.push({
        amount: Number(getEthFrom(event._rent)),
        timestamp: event.blockTimestamp,
      });
    });
  };

  // Fetch RewardClaimed
  const fetchBoosterRewardClaimed = async () => {
    let rewardClaimedEvents = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const queryQl = `
        {
          rewardClaimeds(first: ${batchSize}, skip: ${skip}, where: {_by: "${address}"}) {
            _rewardInStay
            blockTimestamp
          }
        }
      `;

      try {
        const response = await axios.post(CONTRACT_CONFIG.graphUrlBooster, {
          query: queryQl,
        });

        const events = response.data?.data?.rewardClaimeds || [];

        rewardClaimedEvents = [...rewardClaimedEvents, ...events];
        hasMore = events.length === batchSize;
        skip += batchSize;
      } catch (error) {
        console.error("Error fetching RewardClaimed events:", error);
        hasMore = false;
      }
    }

    rewardClaimedEvents.forEach((event) => {
      allEvents.push({
        amount: Number(getEthFrom(event._rewardInStay)) * stayPrice,
        timestamp: event.blockTimestamp,
      });
    });
  };

  try {
    await Promise.all([
      fetchFarmRewardsClaimed(),
      fetchRentWithdrawn(),
      fetchBoosterRewardClaimed(),
    ]);

    // Return all events sorted by timestamp (ascending order)
    return allEvents.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("Error fetching reward and rent events:", error);
    return [];
  }
};

export const fetchAgentLeaderboardData = async () => {
  const batchSize = 100; // Number of events to fetch per query
  let allEvents = []; // Store all events
  let hasMore = true; // Control loop
  let skip = 0; // Offset for pagination

  while (hasMore) {
    // GraphQL query for fetching Commission events
    const queryQl = `
      {
        commissions(first: ${batchSize}, skip: ${skip}) {
          _referee
          _sharesSold
          _investment
          _commission
        }
      }
    `;

    try {
      // Execute the GraphQL query using axios
      const response = await axios.post(CONTRACT_CONFIG.graphUrlMarketplace, {
        query: queryQl,
      });

      // Extract the batch of events
      const eventsBatch = response.data?.data?.commissions;

      if (!eventsBatch || eventsBatch.length === 0) {
        hasMore = false; // Stop fetching if no more events
      } else {
        // Append the events to the main array
        allEvents = [...allEvents, ...eventsBatch];

        // Update the skip value for pagination
        skip += batchSize;

        // Stop fetching if the batch size is smaller than the requested batch size
        if (eventsBatch.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error("Error fetching Commission events:", error);
      hasMore = false; // Stop fetching on error
    }
  }

  // Aggregate data by _referee
  const refereeData = allEvents.reduce((acc, event) => {
    const { _referee, _sharesSold, _investment, _commission } = event;

    // Initialize entry if referee is not yet in the accumulator
    if (!acc[_referee]) {
      acc[_referee] = {
        user: _referee,
        share_sold: 0,
        value: 0,
        commission: 0,
      };
    }

    // Add values to the existing referee's entry
    acc[_referee].share_sold += parseInt(_sharesSold, 10);
    acc[_referee].value += parseFloat(getEthFrom(_investment));
    acc[_referee].commission += parseFloat(getEthFrom(_commission));

    return acc;
  }, {});

  // Convert the referee data object to an array
  const leaderboard = Object.values(refereeData);

  // Sort by `commission` in descending order
  leaderboard.sort((a, b) => b.commission - a.commission);

  // Return the leaderboard
  return leaderboard.slice(0, 5);
};

export const fetchEarnersLeaderboard = async (stayPrice) => {
  const batchSize = 100; // Number of events to fetch in each batch
  const allEvents = []; // To store all the events

  // Fetch RewardsClaimed
  const fetchFarmRewardsClaimed = async () => {
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const queryQl = `
        {
          rewardsClaimeds(first: ${batchSize}, skip: ${skip}) {
            by
            amount
          }
        }
      `;

      try {
        const response = await axios.post(CONTRACT_CONFIG.graphBurnUrl, {
          query: queryQl,
        });

        const events = response.data?.data?.rewardsClaimeds || [];
        events.forEach((event) => {
          allEvents.push({
            user: event.by,
            amount: Number(getEthFrom(event.amount)) * stayPrice,
          });
        });
        hasMore = events.length === batchSize;
        skip += batchSize;
      } catch (error) {
        console.error("Error fetching RewardsClaimed events:", error);
        hasMore = false;
      }
    }
  };

  // Fetch RentWithdrawn
  const fetchRentWithdrawn = async () => {
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const queryQl = `
        {
          rentWithdrawns(first: ${batchSize}, skip: ${skip}) {
            _by
            _rent
          }
        }
      `;

      try {
        const response = await axios.post(CONTRACT_CONFIG.graphUrlRent, {
          query: queryQl,
        });

        const events = response.data?.data?.rentWithdrawns || [];
        events.forEach((event) => {
          allEvents.push({
            user: event._by,
            amount: Number(getEthFrom(event._rent)),
          });
        });
        hasMore = events.length === batchSize;
        skip += batchSize;
      } catch (error) {
        console.error("Error fetching RentWithdrawn events:", error);
        hasMore = false;
      }
    }
  };

  // Fetch RewardClaimed
  const fetchBoosterRewardClaimed = async () => {
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const queryQl = `
        {
          rewardClaimeds(first: ${batchSize}, skip: ${skip}) {
            _by
            _rewardInStay
          }
        }
      `;

      try {
        const response = await axios.post(CONTRACT_CONFIG.graphUrlBooster, {
          query: queryQl,
        });

        const events = response.data?.data?.rewardClaimeds || [];
        events.forEach((event) => {
          allEvents.push({
            user: event._by,
            amount: Number(getEthFrom(event._rewardInStay)) * stayPrice,
          });
        });
        hasMore = events.length === batchSize;
        skip += batchSize;
      } catch (error) {
        console.error("Error fetching RewardClaimed events:", error);
        hasMore = false;
      }
    }
  };

  try {
    await Promise.all([
      // fetchFarmRewardsClaimed(),
      fetchRentWithdrawn(),
      fetchBoosterRewardClaimed(),
    ]);

    // Aggregate results by user
    const aggregatedData = {};
    for (const event of allEvents) {
      if (!aggregatedData[event.user]) {
        aggregatedData[event.user] = { user: event.user, earnings: 0 };
      }
      aggregatedData[event.user].earnings += event.amount;
    }

    // Transform aggregated data into an array of { user, earnings }
    const leaderboard = Object.values(aggregatedData);

    // Sort and return the top 5 earners
    leaderboard.sort((a, b) => b.earnings - a.earnings);

    return leaderboard.slice(0, 5);
  } catch (error) {
    console.error("Error aggregating reward and rent events:", error);
    return [];
  }
};

export const fetchPrimarySharesBoughtEvents = async (propertyId) => {
  const batchSize = 100;
  let allEvents = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    // GraphQL query to fetch PrimarySharesBought events for a specific property ID
    const queryQl = `
      {
        primarySharesBoughts(
          first: ${batchSize}, 
          skip: ${skip}, 
          orderBy: blockTimestamp, 
          orderDirection: desc, 
          where: { _propertyId: "${propertyId}" }
        ) {
          _buyer
          _sharesBought
          _amount
          blockTimestamp
          _propertyId
        }
      }
    `;

    try {
      // Execute the query using axios
      const response = await axios.post(CONTRACT_CONFIG.graphUrlMarketplace, {
        query: queryQl,
      });
      const eventsBatch = response.data?.data?.primarySharesBoughts;

      if (!eventsBatch || eventsBatch.length === 0) {
        hasMore = false;
      } else {
        // Append the batch to allEvents
        allEvents = [...allEvents, ...eventsBatch];

        // Update skip for the next batch
        skip += batchSize;

        // Check if the batch size is smaller than requested
        if (eventsBatch.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error("Error fetching PrimarySharesBought events:", error);
      hasMore = false; // Stop fetching on error
    }
  }

  // Format the results as an array of objects with the required fields
  return allEvents.map((event) => ({
    _from: "NFsTay",
    _to: event._buyer,
    _sharesBought: parseInt(event._sharesBought, 10),
    _amount: parseFloat(getEthFrom(event._amount)), // Convert to number for easier handling
    blockTimestamp: parseInt(event.blockTimestamp, 10),
  }));
};

export const fetchSecondarySharesBoughtEvents = async (propertyId) => {
  const batchSize = 100;
  let allEvents = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    // GraphQL query to fetch SecondarySharesBought events for a specific property ID
    const queryQl = `
      {
        secondarySharesBoughts(
          first: ${batchSize}, 
          skip: ${skip}, 
          orderBy: blockTimestamp, 
          orderDirection: desc, 
          where: { _propertyId: "${propertyId}" }
        ) {
          _seller
          _buyer
          _sharesBought
          _amount
          blockTimestamp
          _propertyId
        }
      }
    `;

    try {
      // Execute the query using axios
      const response = await axios.post(CONTRACT_CONFIG.graphUrlMarketplace, {
        query: queryQl,
      });
      const eventsBatch = response.data?.data?.secondarySharesBoughts;

      if (!eventsBatch || eventsBatch.length === 0) {
        hasMore = false;
      } else {
        // Append the batch to allEvents
        allEvents = [...allEvents, ...eventsBatch];

        // Update skip for the next batch
        skip += batchSize;

        // Check if the batch size is smaller than requested
        if (eventsBatch.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error("Error fetching SecondarySharesBought events:", error);
      hasMore = false; // Stop fetching on error
    }
  }

  // Format the results as an array of objects with the required fields
  return allEvents.map((event) => ({
    _from: event._seller,
    _to: event._buyer,
    _sharesBought: parseInt(event._sharesBought, 10),
    _amount: parseFloat(getEthFrom(event._amount)), // Convert to number for easier handling
    blockTimestamp: parseInt(event.blockTimestamp, 10),
  }));
};

export const fetchRentWithdrawnEvents = async (address) => {
  const batchSize = 100;
  let allEvents = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    // GraphQL query for fetching RentWithdrawn events in batches
    const queryQl = ` 
          {
            rentWithdrawns(first: ${batchSize}, skip: ${skip}, orderBy: blockTimestamp, orderDirection: desc,  where: { _by: "${address}" }) {
              _by
              _propertyId
              _rent
              blockTimestamp
            }
          }
        `;

    try {
      // Execute the query with axios
      const response = await axios.post(CONTRACT_CONFIG.graphUrlRent, {
        query: queryQl,
      });

      const eventsBatch = response.data?.data?.rentWithdrawns;

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
      console.error("Error fetching RentWithdrawn events:", error);
      hasMore = false; // Stop fetching on error
    }
  }
  // Map and format the events
  const formattedEvents = allEvents.map((event, index) => {
    return {
      id: index + 1,
      propertyId: Number(event._propertyId),
      date: Number(event.blockTimestamp), // Keep timestamp in seconds
      payout: Number(getEthFrom(event._rent)), // Convert rent from wei to ETH
    };
  });

  // Return events sorted by blockTimestamp (descending order)
  return formattedEvents;
};

export const fetchWhitelistedAgents = async () => {
  const batchSize = 100;
  let allEvents = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const query = `
      {
        agentWhitelistUpdateds(
          first: ${batchSize},
          skip: ${skip},
          orderBy: blockTimestamp,
          orderDirection: desc
        ) {
          _agent
          _isWhitelisted
        }
      }
    `;

    try {
      const response = await axios.post(CONTRACT_CONFIG.graphUrlMarketplace, {
        query,
      });
      const eventsBatch = response.data?.data?.agentWhitelistUpdateds || [];

      allEvents = [...allEvents, ...eventsBatch];
      skip += batchSize;
      hasMore = eventsBatch.length === batchSize;
    } catch (err) {
      console.error("Error fetching agent whitelist events:", err);
      break;
    }
  }

  // ✅ Deduplicate and lowercase the agent address immediately
  const agentMap = new Map();
  for (const event of allEvents) {
    const agent = event._agent.toLowerCase();
    if (!agentMap.has(agent)) {
      agentMap.set(agent, event._isWhitelisted);
    }
  }

  // ✅ No need to lowercase again during return
  return Array.from(agentMap.entries())
    .filter(([, isWhitelisted]) => isWhitelisted)
    .map(([agent]) => agent);
};

export const fetchCommissionEventsForPerformanceFees = async (
  propertyId,
  year,
  month
) => {
  const start = 1754006400; //1 Aug 2025 (when the RWA contract was deployed)
  const { end } = getMonthTimestamps(year, month);
  const whitelistedAgents = await fetchWhitelistedAgents();

  const batchSize = 100;
  let allEvents = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const query = `
      {
        commissions(
          first: ${batchSize},
          skip: ${skip},
          orderBy: blockTimestamp,
          orderDirection: desc,
          where: {
            _propertyId: ${propertyId},
            blockTimestamp_gte: ${start},
            blockTimestamp_lt: ${end}
          }
        ) {
          _referee
          _referral
          _propertyId
          _sharesSold
          _investment
          _commission
        }
      }
    `;

    try {
      const response = await axios.post(CONTRACT_CONFIG.graphUrlMarketplace, {
        query,
      });
      const batch = response.data?.data?.commissions || [];

      allEvents = [...allEvents, ...batch];
      skip += batchSize;
      hasMore = batch.length === batchSize;
    } catch (err) {
      console.error("Error fetching commission events:", err);
      break;
    }
  }

  const filtered = allEvents.filter((event) =>
    whitelistedAgents.includes(event._referee.toLowerCase())
  );

  return summarizeSalesByAgent(filtered);
};

export const fetchPerformanceFeeDistributions = async (year, month) => {
  const { start, end } = getMonthTimestamps(year, month); // Get start and end timestamps
  const batchSize = 100;
  let allEvents = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const query = `
      {
        performanceFeeDistributeds(
          first: ${batchSize},
          skip: ${skip},
          orderBy: blockTimestamp,
          orderDirection: desc,
          where: {
            _monthTimestamp_gte: ${start},
            _monthTimestamp_lte: ${end}
          }
        ) {
          _recipient
          _propertyId
          _amount
          _monthTimestamp
        }
      }
    `;

    try {
      const response = await axios.post(CONTRACT_CONFIG.graphUrlMarketplace, {
        query,
      });
      const eventsBatch = response.data?.data?.performanceFeeDistributeds || [];
      const formattedBatch = eventsBatch.map((event) => ({
        agent: event._recipient.toLowerCase(),
        propertyId: parseInt(event._propertyId, 10),
        amount: parseFloat(getEthFrom(event._amount)),
        monthTimestamp: parseInt(event._monthTimestamp, 10),
      }));

      allEvents = [...allEvents, ...formattedBatch];
      skip += batchSize;
      hasMore = eventsBatch.length === batchSize;
    } catch (error) {
      console.error(
        "❌ Error fetching PerformanceFeeDistributed events:",
        error
      );
      break;
    }
  }

  return allEvents;
};

export const fetchPerformanceFeeDistributionsByAddress = async (
  recipientAddress
) => {
  const batchSize = 100;
  let allEvents = [];
  let skip = 0;
  let hasMore = true;

  // Normalize the address to lowercase for consistent filtering
  const addressLower = recipientAddress.toLowerCase();

  while (hasMore) {
    const query = `
      {
        performanceFeeDistributeds(
          first: ${batchSize},
          skip: ${skip},
          orderBy: blockTimestamp,
          orderDirection: desc,
          where: {
            _recipient: "${addressLower}"
          }
        ) {
          _recipient
          _propertyId
          _amount
          _monthTimestamp
        }
      }
    `;

    try {
      const response = await axios.post(CONTRACT_CONFIG.graphUrlMarketplace, {
        query,
      });

      const eventsBatch = response.data?.data?.performanceFeeDistributeds || [];

      const formattedBatch = eventsBatch.map((event) => ({
        agent: event._recipient.toLowerCase(),
        propertyId: parseInt(event._propertyId, 10),
        amount: parseFloat(getEthFrom(event._amount)),
        monthTimestamp: parseInt(event._monthTimestamp, 10),
      }));

      allEvents = [...allEvents, ...formattedBatch];
      skip += batchSize;
      hasMore = eventsBatch.length === batchSize;
    } catch (error) {
      console.error(
        "❌ Error fetching PerformanceFeeDistributed events for address:",
        error
      );
      break;
    }
  }

  return allEvents;
};
