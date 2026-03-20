const fs = require("fs").promises; // Using fs.promises for async/await

function generateCommissionData(numRecords) {
  const data = [];
  const refereeAddress = '0xeF63aF768f7aAFb393EBa6ac0Bf602040e6490d1';
  const months = 12;  // Jan to Dec

  // Generate random Ethereum address (for simplicity, you can adjust it)
  function generateRandomAddress() {
    return '0x' + Math.floor(Math.random() * 1e16).toString(16).padStart(40, '0');
  }

  // Function to generate a random date within the given month
  function generateRandomDate(month) {
    const year = 2024;
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // last date of the month
    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    return randomDate;
  }

  // Function to generate commission data for a specific month
  for (let month = 0; month < months; month++) {
    for (let i = 0; i < numRecords / months; i++) {  // Spread records across months
      const referral = generateRandomAddress();
      const propertyId = (month * numRecords + i) % 10 + 1;  // Cycle property ID from 1 to 10
      const sharesSold = Math.floor(Math.random() * 100) + 1; // Random number of shares sold
      const investment = Math.floor(Math.random() * 10000) + 1000; // Random investment between 1000 and 11000
      const commission = Number((investment * 0.1).toFixed(2)); // 10% of investment

      const randomDate = generateRandomDate(month);
      const timestamp = Math.floor(randomDate.getTime() / 1000); // Convert to UNIX timestamp

      // Add the generated commission event
      data.push({
        _referee: refereeAddress,
        _referral: referral,
        _propertyId: propertyId,
        _sharesSold: sharesSold,
        _investment: investment,
        _commission: commission,
        timestamp: timestamp,
      });

      // Optional: duplicate some timestamps within the same month (if needed)
      if (Math.random() < 0.1) {  // 10% chance of duplicate timestamp in same month
        const duplicate = { ...data[data.length - 1] };
        data.push(duplicate);  // Add duplicate with the same timestamp
      }
    }
  }

  return data;
}

async function main() {
  const numRecords = 1000;  // Total number of records to generate
  const commissionData = generateCommissionData(numRecords);

  // Write the data to a JSON file
  try {
    await fs.writeFile(
      "CommissionData.json",
      JSON.stringify(commissionData, null, 2)
    );
  } catch (error) {
    console.error("Error writing to file", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
