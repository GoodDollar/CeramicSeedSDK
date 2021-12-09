import { expect } from 'chai';
import { randomString } from '@stablelib/random'
import { addAuthenticator, initialize, removeAuthenticator } from '../main';

const pauseSeconds = (sec: number) => new Promise((res) => setTimeout(res, sec * 1000));

describe("Initialize a new Decentralized Identifier.", () => {
    it("Should initialize a DID based on privatekey", async (done) => {
        const myPrvkey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // Length need to be 32
        const res = await initialize(myPrvkey);
        expect(res.did).to.equal("did:3:kjzl6cwe1jw1494fmr39v7jqm87qkukqt38cf6fvtk091qcl795u1n4okkj5b7w");
    }).timeout(50000);
});

describe("Add a new private key as authSecret", () => {
    it("Should retrieve the same DID for two different authSecrents", async (done) => {
        const myPrvkey = "7yaAGVXHhcLFGXL3uQV0Ne85CDFlZjJa"; // Length need to be 32
        const myNewPrvkey = "RIqUaX127GgnirqYVfMKospZRS3wBhgJ"; //  Length need to be 32
        
        const res = await initialize(myPrvkey);
        await addAuthenticator(res.authId, myPrvkey, myNewPrvkey);

        const resNewPrvKey = await initialize(myNewPrvkey);
        expect(resNewPrvKey.did).to.equal(res.did); // gd-3id-ceramic-oWaCf and gd-3id-ceramic-LuAYd
    }).timeout(80000);

    it("Should fail since the key was not added as authSecret", async() => {
        const myPrvkey = "7yaAGVXHhcLFGXL3uQV0Ne85CDFlZjJa"; // Length need to be 32
        const myNewPrvkey = "PIqUaX127GgnirqYVfMKospZRS3wBhgJ"; //  Length need to be 32
        const res = await initialize(myPrvkey);

        // myNewPrvkey was not added inside the list of authenticator so this will fail
        const resNewPrvKey = await initialize(myNewPrvkey);
        expect(resNewPrvKey.did).not.to.equal(res.did);
    }).timeout(90000);

});

describe("Remove an authenticator from the the authenticator set", () => {
    it("Should remove from the authenticator list", async (done) => {
        const prvkey = randomString(32);
        const idw1 = await initialize(prvkey);
        const chainList = await idw1.provider.keychain.list();

        expect(chainList[0]).to.equal(prvkey);

        const prvkey2 = randomString(32);
        const authId = prvkey2; // Since we are using the private key as the authID to make it deterministic
        const authSecret = Buffer.from(prvkey2);
        await idw1.provider.keychain.add(authId, authSecret);
        await pauseSeconds(2);
        await idw1.provider.keychain.commit();

        const newChainList = await idw1.provider.keychain.list();

        expect(newChainList[0]).to.equal(prvkey);
        expect(newChainList[1]).to.equal(prvkey2);

        const resProvider = await removeAuthenticator(prvkey2);
        const listAfterRemoval = await resProvider.keychain.list();

        expect(listAfterRemoval.length).to.equal(1);
        expect(listAfterRemoval[0]).to.equal(prvkey);

    }).timeout(90000);
});

