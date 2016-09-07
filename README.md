# aws-lambda

## Initialize
```sh
npm install
```

set `DATABASE_URL` and `SERVICE_ACCOUNT` in deploy.env

configure AWS settings in `.env`


## Testing
```sh
npm test
```

or

```sh
node-lambda run -j event-add.json -f deploy.env
node-lambda run -j event-delete.json -f deploy.env
```

## Packaging

```sh
node-lambda package -f deploy.env -x "event*.json"
```

## Deploying

```sh
node-lambda deploy -f deploy.env -x "event*.json" -P llc -p -o arn:aws:iam::941167095498:role/service-role/process-mp3
```
