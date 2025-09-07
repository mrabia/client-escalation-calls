import Application from './index';

// Start the application
const app = new Application();
app.start().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});