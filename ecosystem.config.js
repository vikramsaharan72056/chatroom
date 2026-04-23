// PM2 process config – used by deploy.yml on EC2
// Cluster mode: -i max spawns one worker per vCPU.
// Redis pub/sub adapter (ChatGateway.afterInit) keeps all
// workers in sync via ElastiCache, so cluster mode is safe.
module.exports = {
  apps: [
    {
      name: 'chatapp-backend',
      script: 'dist/main.js',
      cwd: '/home/ec2-user/app/backend',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '1500M',
      exp_backoff_restart_delay: 100,
      env_production: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/ec2-user/logs/chatapp-err.log',
      out_file: '/home/ec2-user/logs/chatapp-out.log',
      merge_logs: true,
    },
  ],
};
