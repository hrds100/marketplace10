const fs = require("fs").promises; // Using fs.promises for async/await

function generateAmountData(numRecords) {
  const data = [];
  const months = 12; // Jan to Dec

  // Function to generate a random date within the given month
  function generateRandomDate(month) {
    const year = 2024;
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // last date of the month
    const randomDate = new Date(
      startDate.getTime() +
        Math.random() * (endDate.getTime() - startDate.getTime())
    );
    return randomDate;
  }

  // Generate records with random amounts and timestamps
  for (let month = 0; month < months; month++) {
    for (let i = 0; i < numRecords / months; i++) {
      // Spread records across months
      const amount = Math.floor(Math.random() * 10000) + 1000; // Random amount between 1000 and 11000

      const randomDate = generateRandomDate(month);
      const timestamp = Math.floor(randomDate.getTime() / 1000); // Convert to UNIX timestamp

      // Add the generated record
      data.push({
        amount: amount,
        timestamp: timestamp,
      });

      // Optional: duplicate some timestamps within the same month (if needed)
      if (Math.random() < 0.1) {
        // 10% chance of duplicate timestamp in same month
        const duplicate = { ...data[data.length - 1] };
        data.push(duplicate); // Add duplicate with the same timestamp
      }
    }
  }

  return data;
}

async function main() {
  const numRecords = 1000; // Total number of records to generate
  const amountData = generateAmountData(numRecords);

  // Write the data to a JSON file
  try {
    await fs.writeFile(
      "PortfolioData.json", // Changed filename here
      JSON.stringify(amountData, null, 2)
    );
    console.log("Portfolio data successfully written to PortfolioData.json");
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
