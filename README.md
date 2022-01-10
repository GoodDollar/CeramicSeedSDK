# CeramicSeedSDK
Manage a privatekey or seed by multiple Ids

# Getting Started

Install Ceramic-seed-sdk into your project 

```bash
npm install @gooddollar/ceramic-seed-sdk
```
# Usage 

```js
import { CeramicSDK } from 'ceramic-seed-sdk'
```

- Create a new instance of the sdk: 

```js

const sdk = new CeramicSDK("https://ceramic-clay.3boxlabs.com");

```

- Initialize a DID based on private key and create a new one if none exists:

```js
    const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS);
    const myPrvkey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // Length need to be 32
    const res = await sdkClient.initialize(myPrvkey, "pubkeyToUseAsAuthId");
```

- Add the given private key as another authSecret that can access the DID seed: 

```js
    const res = await sdkClient.addAuthenticator(myNewPrvkey, derivedPubkey2);
```

- Remove the provided authenticator:

```js
    const removed = await sdkClient.removeAuthenticator(pubkey);
```

- Retrieves the unencrypted master seed: 

```js
    const ms = await sdkClient.getMasterSeed();
```
