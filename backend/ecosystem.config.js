module.exports = {
  apps: [
    {
      name: 'academy-backend',
      script: 'dist/main.js',
      instances: 1,        // Single instance for 1 GB RAM Droplet
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
