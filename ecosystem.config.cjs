module.exports = {
  apps: [
    {
      name: 'keralawood-billing-api',
      script: './server/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'development',
        PORT: 5031,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5031,
        FRONTEND_URL: 'https://keralawoods-billing.gemshine.tech,http://localhost:5173',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/kerala_wood_billing',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
    },
  ],
};
