import { expect } from 'chai';
import { randomString } from '@stablelib/random'
import { CeramicSDK } from '../main';

import { encrypt, decrypt, generatePrivate, getPublic } from "@toruslabs/eccrypto";

const pauseSeconds = (sec: number) => new Promise((res) => setTimeout(res, sec * 1000));

const NODE_URL_3BOXLABS = 'https://ceramic-clay.3boxlabs.com';
const NODE_URL_TESTNET = 'https://gateway-clay.ceramic.network';
const NODE_URL_MAINNET = 'https://gateway.ceramic.network';

describe("Initialize a new Decentralized Identifier.", () => {
    it("Should initialize a DID based on privatekey", async (done) => {

        const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS);
        const myPrvkey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // Length need to be 32
        const res = await sdkClient.initialize(myPrvkey, "pubkeyToUseAsAuthId");
        expect(res).to.equal("did:3:kjzl6cwe1jw1494fmr39v7jqm87qkukqt38cf6fvtk091qcl795u1n4okkj5b7w");
        done();
    }).timeout(10000);
});

describe("Add a new private key as authSecret", () => {
    const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS);

    it("Should retrieve the same DID for two different authSecrents", async (done) => {
        const myPrvkey = "7yaAGVXHhcLFGXL3uQV0Ne85CDFlZjJa"; // Length need to be 32
        const myNewPrvkey = "RIqUaX127GgnirqYVfMKospZRS3wBhgJ"; //  Length need to be 32
        
        const res = await sdkClient.initialize(myPrvkey, "pubkeyToUseAsAuthId");

        const derivedPubkey2= randomString(20);
        await sdkClient.addAuthenticator(myNewPrvkey, derivedPubkey2);

        const resNewPrvKey = await sdkClient.initialize(myNewPrvkey, derivedPubkey2);
        expect(resNewPrvKey).to.equal(res);
        done();
    }).timeout(80000);

    it("Should fail since the key was not added as authSecret", async() => {
        const myPrvkey = "7yaAGVXHhcLFGXL3uQV0Ne85CDFlZjJa"; // Length need to be 32
        const myNewPrvkey = "PIqUaX127GgnirqYVfMKospZRS3wBhgJ"; //  Length need to be 32
        const res = await sdkClient.initialize(myPrvkey, randomString(32));

        // myNewPrvkey was not added inside the list of authenticator so this will fail
        const resNewPrvKey = await sdkClient.initialize(myNewPrvkey, randomString(32));
        expect(resNewPrvKey).not.to.equal(res);
    }).timeout(90000);

});

describe("Remove an authenticator from the the authenticator set", () => {
    const pubkey1 = "pubkeyToUseAsAuthId";
    const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS);

    it("Should remove from the authenticator list", async (done) => {
        const prvkey = randomString(32);
        const idw1 = await sdkClient.initialize(prvkey, pubkey1);
        const chainList = await sdkClient.threeIdProvider.keychain.list();

        expect(chainList[0]).to.equal(pubkey1);

        const prvkey2 = randomString(32);
        const pubkey2 = randomString(32);
        const authSecret = Buffer.from(prvkey2);
        await sdkClient.threeIdProvider.keychain.add(pubkey2, authSecret);
        await pauseSeconds(2);
        await sdkClient.threeIdProvider.keychain.commit();

        const newChainList = await sdkClient.threeIdProvider.keychain.list();

        expect(newChainList[0]).to.equal(pubkey1);
        expect(newChainList[1]).to.equal(pubkey2);

        await sdkClient.removeAuthenticator(pubkey2);
        const listAfterRemoval = await sdkClient.threeIdProvider.keychain.list();

        expect(listAfterRemoval.length).to.equal(1);
        expect(listAfterRemoval[0]).to.equal(pubkey1);

    }).timeout(90000);
});


describe("Create a new tiled document", () => {
    it("Store the encrypted seed inside masterSeed field", async (done) => {
        const pubkey = "pubkeyToUseAsAuthId";
        const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS);
        const myPrvkey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // Length need to be 32
        const res = await sdkClient.initialize(myPrvkey, pubkey);
        const seed = sdkClient.threeIdProvider.keychain._keyring.seed;

        const encryptedData = "Encrypt(myPrvkey, seed)";
        const doc = await sdkClient.createOrGetTileDoc(pubkey, res, encryptedData);

        // Retreive the encrypted and stored private key and compare it with myprvkey

        const retrievedMasterSeed = await sdkClient.getMasterSeed(pubkey);
        expect(retrievedMasterSeed).to.equal(encryptedData);
        

    }).timeout(10000);
});

describe("Encrypt/decrypt", () => {
    it("Encrypt", async (done) => {
        const sdkClient = new CeramicSDK(NODE_URL_3BOXLABS);
        const myPrvkey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // Length need to be 32
        const res = await sdkClient.initialize(myPrvkey, "pubkeyToUseAsAuthId");

        const seed = Buffer.from(sdkClient.threeIdProvider.keychain._keyring.seed);
        var publicKeyA =  getPublic(seed);// size: 65
        const encrypt = await sdkClient.encrypt(publicKeyA, myPrvkey);

        const decrypt = await sdkClient.decrypt(seed, encrypt);
        const str = decrypt.toString();
        expect(myPrvkey).equal(str);
        
        try{
            const master = await sdkClient.getMasterSeed("pubkeyToUseAsAuthId");
            expect(master).to.equal(myPrvkey);
        }catch(e){
            console.log(e);
        }

    }).timeout(10000);
});