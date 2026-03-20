export const getRandomFutureTime = () => {
    const currentDate = new Date();
  
    // Set the minimum future date to tomorrow
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(currentDate.getDate() + 1);
  
    // Generate random days, hours, minutes, and seconds
    const randomDays = Math.floor(Math.random() * 10); // Random number of days from 0 to 9
    const randomHours = Math.floor(Math.random() * 24); // Random hours from 0 to 23
    const randomMinutes = Math.floor(Math.random() * 60); // Random minutes from 0 to 59
    const randomSeconds = Math.floor(Math.random() * 60); // Random seconds from 0 to 59
  
    // Create a new future date by adding random values to tomorrow
    const randomFutureDate = new Date(tomorrow);
    randomFutureDate.setDate(tomorrow.getDate() + randomDays);
    randomFutureDate.setHours(tomorrow.getHours() + randomHours);
    randomFutureDate.setMinutes(tomorrow.getMinutes() + randomMinutes);
    randomFutureDate.setSeconds(tomorrow.getSeconds() + randomSeconds);
  
    return randomFutureDate;
  };
