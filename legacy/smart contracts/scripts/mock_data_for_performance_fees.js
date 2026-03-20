function generateCommissionData() {
  const refereeAddresses = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  ];

  const referralsMap = {
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": [
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
    ],
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": [
      "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
      "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
      "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f"
    ],
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": [
      "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
      "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
      "0x71bE63f3384f5fb98995898A86B02Fb2426c5788"
    ]
  };

  const result = [];
  const now = new Date();

  for (let m = 0; m < 4; m++) {
    const date = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const timestamp = Math.floor(date.getTime() / 1000); // ⏱ UNIX timestamp in seconds

    for (let i = 0; i < 20; i++) {
      const refereeIndex = i % refereeAddresses.length;
      const referee = refereeAddresses[refereeIndex];
      const referrals = referralsMap[referee];

      const referral = referrals[Math.floor(Math.random() * referrals.length)];

      const sharesSold = Math.floor(Math.random() * 10000) + 1;
      const investment = Math.round(sharesSold * 1.025);
      const commission = Math.round(sharesSold * 0.2);
      const propertyId = Math.floor(Math.random() * 5) + 1;

      result.push({
        timestamp: timestamp,
        _referee: referee,
        _referral: referral,
        _propertyId: propertyId,
        _sharesSold: sharesSold,
        _investment: investment,
        _commission: commission
      });
    }
  }

  return summarizeSalesByRefereeAndProperty(result);  //add the property ID, if you want to filter by a specific property
}


function summarizeSalesByRefereeAndProperty(data, propertyId = 0) {
  const summaryMap = new Map();

  data.forEach((record) => {
    // If propertyId is specified and doesn't match, skip
    if (propertyId !== 0 && record._propertyId !== propertyId) {
      return;
    }

    const key = `${record._referee}-${record._propertyId}`;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        _referee: record._referee,
        _propertyId: record._propertyId,
        totalSharesSold: 0,
        totalInvestment: 0,
        totalCommission: 0,
      });
    }

    const entry = summaryMap.get(key);
    entry.totalSharesSold += record._sharesSold;
    entry.totalInvestment += record._investment;
    entry.totalCommission += record._commission;
  });

  return Array.from(summaryMap.values());
}