// Given timestamp (example: 1622505600000 which is June 1, 2021)
const givenTimestamp = 1622505600000;

// Convert the given timestamp to a Date object
const givenDate = new Date(givenTimestamp);

// Get the current date and time
const currentDate = new Date();

// Calculate the difference in milliseconds
const differenceInMilliseconds = currentDate - givenDate;

// Convert the difference to days, hours, minutes, and seconds
const differenceInSeconds = Math.floor(differenceInMilliseconds / 1000);
const differenceInMinutes = Math.floor(differenceInSeconds / 60);
const differenceInHours = Math.floor(differenceInMinutes / 60);
const differenceInDays = Math.floor(differenceInHours / 24);

// Output the difference
console.log(`Difference in milliseconds: ${differenceInMilliseconds}`);
console.log(`Difference in seconds: ${differenceInSeconds}`);
console.log(`Difference in minutes: ${differenceInMinutes}`);
console.log(`Difference in hours: ${differenceInHours}`);
console.log(`Difference in days: ${differenceInDays}`);
