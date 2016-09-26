# s3-sync

## Initialize
```sh
npm install
```

set `DATABASE_URL` and `SERVICE_ACCOUNT` in deploy.env

## Running
```sh
node-lambda run -j event-sync.json -f deploy.env
```

## Deploying
This function will be triggered on-demand for the time being.
In the future, perhaps this can be triggered on a timer (once a day/week/month?)
