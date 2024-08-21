import Queue from 'bull';
import { sendEmail } from './sendEmail.js';

// Define your Redis options, including the retry strategy
const redisOptions = {
  maxRetriesPerRequest: null, // Set to null for unlimited retries
  retryStrategy: (times) => {
    // Exponential backoff with a maximum delay of 2 seconds
    const delay = Math.min(100 * 2 ** times, 2000);
    return delay;
  },
};

// Create a new Bull queue with custom Redis options
const emailQueue = new Queue('emailQueue', {
  redis: redisOptions,
});

// Example email processing job
emailQueue.process(async (job) => {
  const { email, subject, message } = job.data;
  try {
      await sendEmail({ email, subject, message });
        console.log(`sending email to ${email}`)
  } catch (error) {
    console.log(error)
  }
});

export default emailQueue;
