
### docker-compose file (valkey)
```
services:
  valkey:
    image: valkey/valkey
    ports:
      - 6379:6379  // no space b/w 6379 : 6379
```