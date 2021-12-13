import { expect } from 'chai';
import { randomString } from '@stablelib/random'
import { CeramicSDK } from '../main';

const pauseSeconds = (sec: number) => new Promise((res) => setTimeout(res, sec * 1000));

const NODE_URL_3BOXLABS = 'https://ceramic-clay.3boxlabs.com';
const NODE_URL_TESTNET = 'https://gateway-clay.ceramic.network';
const NODE_URL_MAINNET = 'https://gateway.ceramic.network';

describe("Initialize a new Decentralized Identifier.", () => {
    it("Should initialize a DID based on privatekey", async (done) => {

        const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS, "pubkeyToUseAsAuthId");
        const myPrvkey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // Length need to be 32
        const res = await sdkClient.initialize(myPrvkey);
        expect(res).to.equal("did:3:kjzl6cwe1jw1494fmr39v7jqm87qkukqt38cf6fvtk091qcl795u1n4okkj5b7w");
        done();
    }).timeout(10000);
});

describe.only("Add a new private key as authSecret", () => {
    const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS, "pubkeyToUseAsAuthId");

    it("Should retrieve the same DID for two different authSecrents", async (done) => {
        const myPrvkey = "7yaAGVXHhcLFGXL3uQV0Ne85CDFlZjJa"; // Length need to be 32
        const myNewPrvkey = "RIqUaX127GgnirqYVfMKospZRS3wBhgJ"; //  Length need to be 32
        
        const res = await sdkClient.initialize(myPrvkey);
        await sdkClient.addAuthenticator(myNewPrvkey, randomString(20));

        const resNewPrvKey = await sdkClient.initialize(myNewPrvkey);
        expect(resNewPrvKey).to.equal(res);
        done();
    }).timeout(80000);

    it("Should fail since the key was not added as authSecret", async() => {
        const myPrvkey = "7yaAGVXHhcLFGXL3uQV0Ne85CDFlZjJa"; // Length need to be 32
        const myNewPrvkey = "PIqUaX127GgnirqYVfMKospZRS3wBhgJ"; //  Length need to be 32
        const res = await sdkClient.initialize(myPrvkey);

        // myNewPrvkey was not added inside the list of authenticator so this will fail
        const resNewPrvKey = await sdkClient.initialize(myNewPrvkey);
        expect(resNewPrvKey).not.to.equal(res);
    }).timeout(90000);

});

describe("Remove an authenticator from the the authenticator set", () => {
    const authId1 = "pubkeyToUseAsAuthId";
    const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS, authId1);

    it("Should remove from the authenticator list", async (done) => {
        const prvkey = randomString(32);
        const idw1 = await sdkClient.initialize(prvkey);
        const chainList = await sdkClient.threeIdProvider.keychain.list();

        expect(chainList[0]).to.equal(authId1);

        const prvkey2 = randomString(32);
        const authId2 = randomString(32);
        const authSecret = Buffer.from(prvkey2);
        await sdkClient.threeIdProvider.keychain.add(authId2, authSecret);
        await pauseSeconds(2);
        await sdkClient.threeIdProvider.keychain.commit();

        const newChainList = await sdkClient.threeIdProvider.keychain.list();

        expect(newChainList[0]).to.equal(authId1);
        expect(newChainList[1]).to.equal(authId2);

        await sdkClient.removeAuthenticator(authId2);
        const listAfterRemoval = await sdkClient.threeIdProvider.keychain.list();

        expect(listAfterRemoval.length).to.equal(1);
        expect(listAfterRemoval[0]).to.equal(authId1);

    }).timeout(90000);
});